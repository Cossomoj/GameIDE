#!/bin/bash

# GameIDE Quick Start Script
# Запускает всю систему одной командой с автоустановкой зависимостей

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎮 GameIDE Quick Start${NC}"
echo "=========================="

# Функция установки Docker Compose
install_docker_compose() {
    echo -e "${YELLOW}Установка Docker Compose...${NC}"
    
    # Определяем операционную систему
    OS="$(uname -s)"
    ARCH="$(uname -m)"
    
    case $OS in
        Darwin*)
            echo -e "${YELLOW}Обнаружена macOS. Устанавливаем через Homebrew...${NC}"
            if command -v brew &> /dev/null; then
                brew install docker-compose
            else
                echo -e "${RED}Homebrew не найден. Установите Docker Desktop: https://docs.docker.com/desktop/mac/install/${NC}"
                exit 1
            fi
            ;;
        Linux*)
            echo -e "${YELLOW}Обнаружена Linux. Устанавливаем Docker Compose...${NC}"
            
            # Проверяем архитектуру
            case $ARCH in
                x86_64)
                    COMPOSE_ARCH="x86_64"
                    ;;
                aarch64|arm64)
                    COMPOSE_ARCH="aarch64"
                    ;;
                *)
                    echo -e "${RED}Неподдерживаемая архитектура: $ARCH${NC}"
                    exit 1
                    ;;
            esac
            
            # Получаем последнюю версию Docker Compose
            echo -e "${YELLOW}Получаем информацию о последней версии...${NC}"
            COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
            
            if [ -z "$COMPOSE_VERSION" ]; then
                echo -e "${YELLOW}Не удалось получить версию автоматически, используем v2.20.0${NC}"
                COMPOSE_VERSION="v2.20.0"
            fi
            
            # Скачиваем и устанавливаем
            echo -e "${YELLOW}Скачиваем Docker Compose $COMPOSE_VERSION...${NC}"
            curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-linux-$COMPOSE_ARCH" -o /tmp/docker-compose
            
            # Проверяем успешность скачивания
            if [ $? -ne 0 ]; then
                echo -e "${RED}Ошибка при скачивании Docker Compose${NC}"
                exit 1
            fi
            
            # Устанавливаем с правами
            echo -e "${YELLOW}Устанавливаем Docker Compose...${NC}"
            sudo mv /tmp/docker-compose /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            
            # Создаем символическую ссылку для совместимости
            if [ ! -L /usr/bin/docker-compose ]; then
                sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose 2>/dev/null || true
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)
            echo -e "${YELLOW}Обнаружена Windows. Рекомендуется установить Docker Desktop${NC}"
            echo -e "${BLUE}Скачайте Docker Desktop: https://docs.docker.com/desktop/windows/install/${NC}"
            echo -e "${BLUE}Docker Desktop включает Docker Compose${NC}"
            exit 1
            ;;
        *)
            echo -e "${RED}Неподдерживаемая операционная система: $OS${NC}"
            exit 1
            ;;
    esac
    
    # Проверяем установку
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✅ Docker Compose успешно установлен: $(docker-compose --version)${NC}"
    else
        echo -e "${RED}❌ Ошибка установки Docker Compose${NC}"
        exit 1
    fi
}

# Функция автоматической установки Docker
install_docker() {
    echo -e "${YELLOW}Автоматическая установка Docker...${NC}"
    
    OS="$(uname -s)"
    case $OS in
        Darwin*)
            echo -e "${YELLOW}macOS: Установка через Homebrew...${NC}"
            if command -v brew &> /dev/null; then
                echo -e "${YELLOW}Устанавливаем Docker Desktop...${NC}"
                brew install --cask docker
                echo -e "${BLUE}Откройте Docker Desktop и следуйте инструкциям${NC}"
            else
                echo -e "${RED}Homebrew не найден${NC}"
                echo -e "${BLUE}Установите Docker Desktop вручную: https://docs.docker.com/desktop/mac/install/${NC}"
                exit 1
            fi
            ;;
        Linux*)
            echo -e "${YELLOW}Linux: Установка через официальный скрипт...${NC}"
            
            # Определяем дистрибутив
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                DISTRO=$ID
            else
                echo -e "${RED}Не удалось определить дистрибутив Linux${NC}"
                exit 1
            fi
            
            case $DISTRO in
                ubuntu|debian)
                    echo -e "${YELLOW}Устанавливаем Docker для Ubuntu/Debian...${NC}"
                    curl -fsSL https://get.docker.com -o get-docker.sh
                    sudo sh get-docker.sh
                    rm get-docker.sh
                    ;;
                centos|rhel|fedora)
                    echo -e "${YELLOW}Устанавливаем Docker для CentOS/RHEL/Fedora...${NC}"
                    curl -fsSL https://get.docker.com -o get-docker.sh
                    sudo sh get-docker.sh
                    rm get-docker.sh
                    ;;
                arch)
                    echo -e "${YELLOW}Устанавливаем Docker для Arch Linux...${NC}"
                    sudo pacman -S --noconfirm docker docker-compose
                    ;;
                *)
                    echo -e "${YELLOW}Универсальная установка Docker...${NC}"
                    curl -fsSL https://get.docker.com -o get-docker.sh
                    sudo sh get-docker.sh
                    rm get-docker.sh
                    ;;
            esac
            
            # Добавляем пользователя в группу docker
            echo -e "${YELLOW}Добавляем пользователя в группу docker...${NC}"
            sudo usermod -aG docker $USER
            
            # Запускаем Docker
            echo -e "${YELLOW}Запускаем Docker service...${NC}"
            sudo systemctl enable docker
            sudo systemctl start docker
            ;;
        *)
            echo -e "${RED}Автоустановка не поддерживается для $OS${NC}"
            echo -e "${BLUE}Установите Docker вручную: https://docs.docker.com/get-docker/${NC}"
            exit 1
            ;;
    esac
}

# Проверка зависимостей
echo -e "${YELLOW}Проверка зависимостей...${NC}"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен${NC}"
    read -p "Установить Docker автоматически? (y/N): " install_docker_confirm
    
    if [[ $install_docker_confirm =~ ^[Yy]$ ]]; then
        install_docker
        echo -e "${BLUE}⚠️  Возможно потребуется перелогиниться для применения прав docker группы${NC}"
        echo -e "${BLUE}Или выполните: newgrp docker${NC}"
    else
        echo -e "${BLUE}Установка Docker:${NC}"
        OS="$(uname -s)"
        case $OS in
            Darwin*)
                echo -e "macOS: brew install --cask docker"
                echo -e "Или скачайте: https://docs.docker.com/desktop/mac/install/"
                ;;
            Linux*)
                echo -e "Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
                echo -e "CentOS/RHEL: sudo yum install docker-ce"
                echo -e "Arch: sudo pacman -S docker"
                ;;
            *)
                echo -e "Скачайте Docker: https://docs.docker.com/get-docker/"
                ;;
        esac
        exit 1
    fi
else
    echo -e "${GREEN}✅ Docker найден: $(docker --version)${NC}"
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker Compose не найден${NC}"
    read -p "Установить Docker Compose автоматически? (Y/n): " install_compose
    
    if [[ ! $install_compose =~ ^[Nn]$ ]]; then
        install_docker_compose
    else
        echo -e "${RED}❌ Docker Compose необходим для работы${NC}"
        echo -e "${BLUE}Установите вручную: https://docs.docker.com/compose/install/${NC}"
        exit 1
    fi
else
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✅ Docker Compose найден: $(docker-compose --version)${NC}"
    else
        echo -e "${GREEN}✅ Docker Compose найден: $(docker compose version)${NC}"
    fi
fi

# Проверка запуска Docker
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker не запущен${NC}"
    echo -e "${YELLOW}Попытка запуска Docker...${NC}"
    
    OS="$(uname -s)"
    case $OS in
        Darwin*)
            echo -e "${BLUE}Запускаем Docker Desktop...${NC}"
            open -a Docker || {
                echo -e "${RED}Не удалось запустить Docker Desktop${NC}"
                echo -e "${BLUE}Запустите Docker Desktop вручную и повторите${NC}"
                exit 1
            }
            # Ждем запуска Docker
            echo -e "${YELLOW}Ожидание запуска Docker (это может занять минуту)...${NC}"
            for i in {1..60}; do
                if docker info >/dev/null 2>&1; then
                    echo -e "\n${GREEN}✅ Docker запущен${NC}"
                    break
                fi
                sleep 2
                echo -n "."
                if [ $i -eq 60 ]; then
                    echo -e "\n${RED}❌ Docker не запустился за отведенное время${NC}"
                    exit 1
                fi
            done
            ;;
        Linux*)
            echo -e "${BLUE}Запускаем Docker daemon...${NC}"
            sudo systemctl start docker || {
                echo -e "${RED}Не удалось запустить Docker${NC}"
                echo -e "${BLUE}Попробуйте: sudo systemctl start docker${NC}"
                exit 1
            }
            # Проверяем, что пользователь в группе docker
            if ! groups $USER | grep -q docker; then
                echo -e "${YELLOW}⚠️  Пользователь не в группе docker${NC}"
                echo -e "${BLUE}Выполните: newgrp docker${NC}"
                echo -e "${BLUE}Или перелогиньтесь${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Запустите Docker вручную${NC}"
            exit 1
            ;;
    esac
    
    # Финальная проверка
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker все еще не запущен${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Все зависимости готовы${NC}"

# Создание .env файла если не существует
if [ ! -f .env ]; then
    echo -e "${YELLOW}Создание .env файла...${NC}"
    cat > .env << EOL
# GameIDE Development Environment
NODE_ENV=development
PORT=3001

# Database
POSTGRES_DB=gameide_dev
POSTGRES_USER=gameide_user
POSTGRES_PASSWORD=gameide_password

# MongoDB
MONGO_DB_NAME=gameide_analytics
MONGO_ROOT_USER=root
MONGO_ROOT_PASSWORD=mongopassword

# JWT
JWT_SECRET=dev_jwt_secret_key_change_in_production_very_long_secret
JWT_EXPIRES_IN=7d

# API Keys (optional)
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
CLAUDE_API_KEY=
YANDEX_SDK_APP_ID=

# Development settings
LOG_LEVEL=debug
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=http://localhost:3000

# Frontend
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENVIRONMENT=development
EOL
    echo -e "${GREEN}✅ .env файл создан${NC}"
fi

# Создание необходимых директорий
echo -e "${YELLOW}Создание директорий...${NC}"
mkdir -p games-output logs/backend logs/frontend logs/postgres logs/redis temp backups

# Остановка существующих контейнеров
echo -e "${YELLOW}Остановка существующих контейнеров...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose down > /dev/null 2>&1 || true
else
    docker compose down > /dev/null 2>&1 || true
fi

# Сборка и запуск
echo -e "${YELLOW}Сборка и запуск сервисов...${NC}"
echo "Это может занять несколько минут при первом запуске..."

# Используем доступную команду docker-compose или docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

if $COMPOSE_CMD up --build -d; then
    echo -e "${GREEN}✅ Сервисы запущены${NC}"
else
    echo -e "${RED}❌ Ошибка при запуске сервисов${NC}"
    echo "Проверьте логи: $COMPOSE_CMD logs"
    exit 1
fi

# Ожидание готовности сервисов
echo -e "${YELLOW}Ожидание готовности сервисов...${NC}"
sleep 30

# Проверка статуса
echo -e "${YELLOW}Проверка статуса сервисов...${NC}"
$COMPOSE_CMD ps

# Проверка здоровья
echo -e "${YELLOW}Проверка работоспособности...${NC}"

# PostgreSQL
if docker exec gameide-postgres pg_isready -U gameide_user -d gameide_dev > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: готов${NC}"
else
    echo -e "${RED}❌ PostgreSQL: не отвечает${NC}"
fi

# Redis
if docker exec gameide-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: готов${NC}"
else
    echo -e "${RED}❌ Redis: не отвечает${NC}"
fi

# Backend API
sleep 10
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: готов${NC}"
else
    echo -e "${YELLOW}⏳ Backend API: запускается...${NC}"
fi

# Frontend
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend: готов${NC}"
else
    echo -e "${YELLOW}⏳ Frontend: запускается...${NC}"
fi

echo ""
echo -e "${GREEN}🎉 GameIDE успешно запущен!${NC}"
echo ""
echo -e "${BLUE}📱 Доступные сервисы:${NC}"
echo -e "  Frontend:    ${YELLOW}http://localhost:3000${NC}"
echo -e "  Backend API: ${YELLOW}http://localhost:3001${NC}"
echo -e "  Nginx:       ${YELLOW}http://localhost:80${NC}"
echo ""
echo -e "${BLUE}🛠️  Полезные команды:${NC}"
echo -e "  Логи:        ${YELLOW}$COMPOSE_CMD logs -f${NC}"
echo -e "  Статус:      ${YELLOW}$COMPOSE_CMD ps${NC}"
echo -e "  Остановка:   ${YELLOW}$COMPOSE_CMD down${NC}"
echo -e "  Перезапуск:  ${YELLOW}$COMPOSE_CMD restart${NC}"
echo ""
echo -e "${BLUE}📖 Для полного управления используйте:${NC}"
echo -e "  ${YELLOW}make help${NC} - список всех команд"
echo -e "  ${YELLOW}make start${NC} - запуск системы"
echo -e "  ${YELLOW}make stop${NC} - остановка системы"
echo -e "  ${YELLOW}make logs${NC} - просмотр логов"
echo ""
echo -e "${GREEN}Приятной разработки! 🚀${NC}" 