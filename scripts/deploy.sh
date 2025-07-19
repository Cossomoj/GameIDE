#!/bin/bash

# GameIDE Production Deployment Script
# Версия: 1.0.0
# Автор: GameIDE Team

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/deploy.log"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env.prod"

# Функции для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Функция для проверки зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    local deps=("docker" "docker-compose" "curl" "jq")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep не установлен"
            exit 1
        fi
    done
    
    # Проверка Docker
    if ! docker info &> /dev/null; then
        error "Docker не запущен или недоступен"
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Функция для проверки конфигурации
check_configuration() {
    log "Проверка конфигурации..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Файл окружения .env.prod не найден"
        exit 1
    fi
    
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        error "Файл docker-compose.prod.yml не найден"
        exit 1
    fi
    
    # Загружаем переменные окружения
    source "$ENV_FILE"
    
    # Проверяем обязательные переменные
    local required_vars=(
        "POSTGRES_DB"
        "POSTGRES_USER" 
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "DOMAIN_NAME"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Переменная окружения $var не установлена"
            exit 1
        fi
    done
    
    success "Конфигурация корректна"
}

# Функция для создания резервной копии
create_backup() {
    log "Создание резервной копии..."
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Бэкап базы данных (если контейнер запущен)
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Создание резервной копии PostgreSQL..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
            pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_path/postgres_backup.sql"
    fi
    
    # Бэкап Redis (если контейнер запущен)
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps redis | grep -q "Up"; then
        log "Создание резервной копии Redis..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis \
            redis-cli BGSAVE
        sleep 5
        docker cp "$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q redis):/data/dump.rdb" \
            "$backup_path/redis_backup.rdb"
    fi
    
    # Бэкап MongoDB (если контейнер запущен)
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps mongodb | grep -q "Up"; then
        log "Создание резервной копии MongoDB..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T mongodb \
            mongodump --db "$MONGO_DB_NAME" --archive > "$backup_path/mongodb_backup.archive"
    fi
    
    # Бэкап volumes
    log "Создание резервной копии volumes..."
    docker run --rm -v "gameide_postgres_data:/data" -v "$backup_path:/backup" \
        alpine tar czf /backup/postgres_volume.tar.gz -C /data .
    
    docker run --rm -v "gameide_mongodb_data:/data" -v "$backup_path:/backup" \
        alpine tar czf /backup/mongodb_volume.tar.gz -C /data .
    
    # Бэкап конфигурационных файлов
    cp "$ENV_FILE" "$backup_path/"
    cp "$DOCKER_COMPOSE_FILE" "$backup_path/"
    
    echo "$backup_path" > "$BACKUP_DIR/latest_backup.txt"
    
    success "Резервная копия создана: $backup_path"
}

# Функция для предварительных проверок
pre_deployment_checks() {
    log "Выполнение предварительных проверок..."
    
    # Проверка свободного места на диске
    local free_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB в KB
    
    if [[ $free_space -lt $required_space ]]; then
        error "Недостаточно свободного места на диске (требуется минимум 2GB)"
        exit 1
    fi
    
    # Проверка портов
    local ports=(80 443 5432 6379 27017 9090 3000)
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            warn "Порт $port уже используется"
        fi
    done
    
    # Проверка образов Docker
    log "Проверка доступности образов Docker..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" config --quiet
    
    success "Предварительные проверки пройдены"
}

# Функция для сборки образов
build_images() {
    log "Сборка Docker образов..."
    
    # Загружаем переменные окружения для сборки
    source "$ENV_FILE"
    
    # Сборка с кешированием
    docker-compose -f "$DOCKER_COMPOSE_FILE" build \
        --build-arg REACT_APP_API_URL="$API_URL" \
        --build-arg REACT_APP_WS_URL="$WS_URL" \
        --parallel
    
    success "Образы собраны успешно"
}

# Функция для развертывания
deploy() {
    log "Начало развертывания..."
    
    # Остановка старых контейнеров
    log "Остановка существующих контейнеров..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Очистка неиспользуемых ресурсов
    log "Очистка неиспользуемых Docker ресурсов..."
    docker system prune -f --volumes
    
    # Запуск новых контейнеров
    log "Запуск новых контейнеров..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Контейнеры запущены"
}

# Функция для проверки здоровья сервисов
health_check() {
    log "Проверка здоровья сервисов..."
    
    local max_attempts=30
    local attempt=0
    
    # Ждем пока сервисы запустятся
    sleep 10
    
    while [[ $attempt -lt $max_attempts ]]; do
        local healthy_services=0
        local total_services=0
        
        # Проверяем каждый сервис
        for service in backend-1 backend-2 postgres redis mongodb nginx; do
            total_services=$((total_services + 1))
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
                healthy_services=$((healthy_services + 1))
            fi
        done
        
        log "Здоровых сервисов: $healthy_services/$total_services"
        
        if [[ $healthy_services -eq $total_services ]]; then
            success "Все сервисы работают корректно"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 10
    done
    
    error "Не все сервисы запустились корректно"
    return 1
}

# Функция для проверки API
api_check() {
    log "Проверка API..."
    
    local api_url="${API_URL:-http://localhost}/api/health"
    local max_attempts=10
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$api_url" > /dev/null; then
            success "API отвечает корректно"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 5
    done
    
    error "API недоступен"
    return 1
}

# Функция для отката
rollback() {
    log "Выполнение отката..."
    
    if [[ ! -f "$BACKUP_DIR/latest_backup.txt" ]]; then
        error "Файл последней резервной копии не найден"
        exit 1
    fi
    
    local backup_path=$(cat "$BACKUP_DIR/latest_backup.txt")
    
    if [[ ! -d "$backup_path" ]]; then
        error "Директория резервной копии не найдена: $backup_path"
        exit 1
    fi
    
    # Остановка контейнеров
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Восстановление volumes
    docker run --rm -v "gameide_postgres_data:/data" -v "$backup_path:/backup" \
        alpine sh -c "cd /data && tar xzf /backup/postgres_volume.tar.gz"
    
    docker run --rm -v "gameide_mongodb_data:/data" -v "$backup_path:/backup" \
        alpine sh -c "cd /data && tar xzf /backup/mongodb_volume.tar.gz"
    
    # Запуск контейнеров
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Откат выполнен успешно"
}

# Функция для мониторинга
monitor() {
    log "Настройка мониторинга..."
    
    # Ждем запуска Prometheus
    sleep 30
    
    # Проверяем доступность Prometheus
    if curl -f -s "http://localhost:9090/-/healthy" > /dev/null; then
        success "Prometheus запущен и работает"
    else
        warn "Prometheus недоступен"
    fi
    
    # Проверяем доступность Grafana
    if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
        success "Grafana запущен и работает"
    else
        warn "Grafana недоступен"
    fi
    
    log "Мониторинг настроен"
}

# Функция для показа статуса
show_status() {
    log "Статус сервисов:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    log "Использование ресурсов:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Функция для очистки логов
cleanup_logs() {
    log "Очистка старых логов..."
    
    # Удаляем логи старше 30 дней
    find "$PROJECT_ROOT/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Ротация логов Docker
    docker system prune -f --filter "until=720h"
    
    success "Логи очищены"
}

# Основная функция
main() {
    local action="${1:-deploy}"
    
    case "$action" in
        "deploy")
            log "=== Начало развертывания GameIDE Production ==="
            check_dependencies
            check_configuration
            create_backup
            pre_deployment_checks
            build_images
            deploy
            health_check
            api_check
            monitor
            show_status
            success "=== Развертывание завершено успешно ==="
            ;;
        "rollback")
            log "=== Начало отката ==="
            check_dependencies
            rollback
            health_check
            success "=== Откат завершен успешно ==="
            ;;
        "status")
            show_status
            ;;
        "backup")
            check_dependencies
            check_configuration
            create_backup
            ;;
        "logs")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "restart")
            log "=== Перезапуск сервисов ==="
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart
            health_check
            success "=== Перезапуск завершен ==="
            ;;
        "stop")
            log "=== Остановка сервисов ==="
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            success "=== Сервисы остановлены ==="
            ;;
        "help")
            echo "Использование: $0 [команда]"
            echo ""
            echo "Команды:"
            echo "  deploy    - Полное развертывание (по умолчанию)"
            echo "  rollback  - Откат к последней резервной копии"
            echo "  status    - Показать статус сервисов"
            echo "  backup    - Создать резервную копию"
            echo "  logs      - Показать логи"
            echo "  cleanup   - Очистить старые логи"
            echo "  restart   - Перезапустить сервисы"
            echo "  stop      - Остановить сервисы"
            echo "  help      - Показать эту справку"
            ;;
        *)
            error "Неизвестная команда: $action"
            echo "Используйте '$0 help' для списка доступных команд"
            exit 1
            ;;
    esac
}

# Обработка сигналов прерывания
trap 'error "Развертывание прервано пользователем"; exit 130' INT TERM

# Создаем директории для логов и бэкапов
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Запуск основной функции
main "$@" 