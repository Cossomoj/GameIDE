# Makefile для GameIDE
# Использование: make [команда]

# Цвета для вывода
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Переменные
DOCKER_COMPOSE = docker-compose
PROJECT_NAME = game-ide
TIMESTAMP = $(shell date +%Y%m%d-%H%M%S)

.PHONY: help install dev start stop restart build test clean logs status health setup

# Помощь (по умолчанию)
help:
	@echo "${BLUE}🎮 GameIDE - AI Game Generator${NC}"
	@echo "${YELLOW}Доступные команды:${NC}"
	@echo ""
	@echo "${GREEN}📦 Установка и настройка:${NC}"
	@echo "  make install     - Установить все зависимости"
	@echo "  make setup       - Первоначальная настройка проекта"
	@echo ""
	@echo "${GREEN}🚀 Запуск и управление:${NC}"
	@echo "  make dev         - Запустить в режиме разработки"
	@echo "  make start       - Запустить в фоновом режиме"
	@echo "  make stop        - Остановить все сервисы"
	@echo "  make restart     - Перезапустить все сервисы"
	@echo ""
	@echo "${GREEN}🔨 Сборка и тестирование:${NC}"
	@echo "  make build       - Собрать все компоненты"
	@echo "  make test        - Запустить все тесты"
	@echo "  make lint        - Проверить код"
	@echo ""
	@echo "${GREEN}📊 Мониторинг:${NC}"
	@echo "  make logs        - Показать логи всех сервисов"
	@echo "  make status      - Показать статус контейнеров"
	@echo "  make health      - Проверить работоспособность"
	@echo ""
	@echo "${GREEN}🧹 Очистка:${NC}"
	@echo "  make clean       - Очистить временные файлы"
	@echo "  make clean-all   - Полная очистка (включая node_modules)"
	@echo ""

# Установка зависимостей
install:
	@echo "${BLUE}📦 Установка зависимостей...${NC}"
	npm run install:all
	@echo "${GREEN}✅ Зависимости установлены${NC}"

# Первоначальная настройка
setup:
	@echo "${BLUE}🛠️  Настройка проекта...${NC}"
	npm run setup
	@mkdir -p logs/setup
	@echo "$(TIMESTAMP) - Проект настроен" >> logs/setup/setup.log
	@echo "${GREEN}✅ Проект готов к работе!${NC}"
	@echo "${YELLOW}Запустите: make dev${NC}"

# Запуск в режиме разработки
dev:
	@echo "${BLUE}🚀 Запуск в режиме разработки...${NC}"
	@mkdir -p logs/system
	$(DOCKER_COMPOSE) up --build

# Запуск в фоновом режиме
start:
	@echo "${BLUE}🚀 Запуск сервисов...${NC}"
	$(DOCKER_COMPOSE) up -d --build
	@echo "${GREEN}✅ Сервисы запущены в фоновом режиме${NC}"
	@echo "${YELLOW}Веб-интерфейс: http://localhost:5173${NC}"
	@echo "${YELLOW}API: http://localhost:3000${NC}"

# Остановка сервисов
stop:
	@echo "${RED}🛑 Остановка сервисов...${NC}"
	$(DOCKER_COMPOSE) down
	@echo "${GREEN}✅ Сервисы остановлены${NC}"

# Перезапуск
restart: stop start

# Сборка
build:
	@echo "${BLUE}🔨 Сборка проекта...${NC}"
	npm run build
	@echo "${GREEN}✅ Сборка завершена${NC}"

# Тестирование
test:
	@echo "${BLUE}🧪 Запуск тестов...${NC}"
	npm run test
	@echo "${GREEN}✅ Тесты завершены${NC}"

# Линтинг
lint:
	@echo "${BLUE}🔍 Проверка кода...${NC}"
	npm run lint
	@echo "${GREEN}✅ Проверка завершена${NC}"

# Исправление линтинга
lint-fix:
	@echo "${BLUE}🔧 Исправление кода...${NC}"
	npm run lint:fix
	@echo "${GREEN}✅ Исправления применены${NC}"

# Логи
logs:
	@echo "${BLUE}📋 Логи всех сервисов:${NC}"
	$(DOCKER_COMPOSE) logs -f

# Логи конкретного сервиса
logs-backend:
	@echo "${BLUE}📋 Логи backend:${NC}"
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend:
	@echo "${BLUE}📋 Логи frontend:${NC}"
	$(DOCKER_COMPOSE) logs -f frontend

logs-db:
	@echo "${BLUE}📋 Логи PostgreSQL:${NC}"
	$(DOCKER_COMPOSE) logs -f postgres

logs-redis:
	@echo "${BLUE}📋 Логи Redis:${NC}"
	$(DOCKER_COMPOSE) logs -f redis

# Статус
status:
	@echo "${BLUE}📊 Статус контейнеров:${NC}"
	$(DOCKER_COMPOSE) ps

# Проверка работоспособности
health:
	@echo "${BLUE}🏥 Проверка работоспособности...${NC}"
	@curl -f http://localhost:3000/api/health > /dev/null 2>&1 && echo "${GREEN}✅ Backend работает${NC}" || echo "${RED}❌ Backend недоступен${NC}"
	@curl -f http://localhost:5173/ > /dev/null 2>&1 && echo "${GREEN}✅ Frontend работает${NC}" || echo "${RED}❌ Frontend недоступен${NC}"

# Очистка
clean:
	@echo "${BLUE}🧹 Очистка временных файлов...${NC}"
	npm run clean
	@echo "${GREEN}✅ Очистка завершена${NC}"

# Полная очистка
clean-all:
	@echo "${RED}🧹 Полная очистка проекта...${NC}"
	@read -p "Вы уверены? Это удалит все node_modules [y/N]: " confirm && [ "$$confirm" = "y" ]
	npm run clean:all
	@echo "${GREEN}✅ Полная очистка завершена${NC}"

# Сброс базы данных
db-reset:
	@echo "${YELLOW}🗄️  Сброс базы данных...${NC}"
	npm run db:reset
	@echo "${GREEN}✅ База данных сброшена${NC}"

# Сброс Redis
redis-reset:
	@echo "${YELLOW}🗄️  Сброс Redis...${NC}"
	npm run redis:reset
	@echo "${GREEN}✅ Redis сброшен${NC}"

# Бэкап
backup:
	@echo "${BLUE}💾 Создание бэкапа...${NC}"
	@mkdir -p backups
	npm run backup
	@echo "${GREEN}✅ Бэкап создан${NC}"

# Восстановление
restore:
	@echo "${BLUE}📁 Восстановление из бэкапа...${NC}"
	npm run restore
	@echo "${GREEN}✅ Восстановление завершено${NC}"

# Обновление проекта из git
update:
	@echo "${BLUE}🔄 Обновление проекта...${NC}"
	git pull origin main
	make install
	make build
	make restart
	@echo "${GREEN}✅ Проект обновлен${NC}"

# Информация о проекте
info:
	@echo "${BLUE}ℹ️  Информация о проекте:${NC}"
	@echo "Название: $(PROJECT_NAME)"
	@echo "Версия: $(shell node -p "require('./package.json').version")"
	@echo "Node.js: $(shell node --version)"
	@echo "NPM: $(shell npm --version)"
	@echo "Docker: $(shell docker --version | cut -d' ' -f3 | cut -d',' -f1)"
	@echo "Docker Compose: $(shell docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)"

# Подключение к контейнеру
shell-backend:
	@echo "${BLUE}💻 Подключение к backend контейнеру...${NC}"
	$(DOCKER_COMPOSE) exec backend /bin/bash

shell-frontend:
	@echo "${BLUE}💻 Подключение к frontend контейнеру...${NC}"
	$(DOCKER_COMPOSE) exec frontend /bin/bash

shell-db:
	@echo "${BLUE}💻 Подключение к PostgreSQL...${NC}"
	$(DOCKER_COMPOSE) exec postgres psql -U gameide -d gameide_db

# Мониторинг ресурсов
monitor:
	@echo "${BLUE}📈 Мониторинг ресурсов...${NC}"
	$(DOCKER_COMPOSE) stats 