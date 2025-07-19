# GameIDE Development Makefile
# Используйте make help для списка команд

.PHONY: help start stop restart build clean logs status test install deps backup restore

# Цвета для вывода
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Основные переменные
COMPOSE_FILE := docker-compose.yml
COMPOSE_PROD_FILE := docker-compose.prod.yml
PROJECT_NAME := gameide

help: ## Показать справку по командам
	@echo "${GREEN}GameIDE Development Commands:${NC}"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-20s${NC} %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "${GREEN}Примеры использования:${NC}"
	@echo "  make start     # Запустить все сервисы"
	@echo "  make logs      # Посмотреть логи"
	@echo "  make test      # Запустить тесты"
	@echo "  make clean     # Очистить все данные"

start: ## 🚀 Запустить все сервисы (основная команда)
	@echo "${GREEN}Запуск GameIDE...${NC}"
	@if [ ! -f .env ]; then \
		echo "${YELLOW}Создание .env файла из .env.example...${NC}"; \
		cp .env.example .env; \
	fi
	@echo "${GREEN}Сборка и запуск сервисов...${NC}"
	docker-compose -f $(COMPOSE_FILE) up --build -d
	@echo "${GREEN}Ожидание готовности сервисов...${NC}"
	@sleep 10
	@make status
	@echo ""
	@echo "${GREEN}✅ GameIDE запущен!${NC}"
	@echo "${YELLOW}Frontend:${NC} http://localhost:3000"
	@echo "${YELLOW}Backend API:${NC} http://localhost:3001"
	@echo "${YELLOW}Nginx:${NC} http://localhost:80"
	@echo ""
	@echo "${YELLOW}Для просмотра логов:${NC} make logs"
	@echo "${YELLOW}Для остановки:${NC} make stop"

stop: ## 🛑 Остановить все сервисы
	@echo "${RED}Остановка GameIDE...${NC}"
	docker-compose -f $(COMPOSE_FILE) down
	@echo "${GREEN}✅ Все сервисы остановлены${NC}"

restart: ## 🔄 Перезапустить все сервисы
	@echo "${YELLOW}Перезапуск GameIDE...${NC}"
	@make stop
	@make start

build: ## 🔨 Пересобрать все образы
	@echo "${GREEN}Пересборка образов...${NC}"
	docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "${GREEN}✅ Образы пересобраны${NC}"

rebuild: ## 🔨 Пересобрать и запустить
	@make stop
	@make build
	@make start

logs: ## 📋 Показать логи всех сервисов
	docker-compose -f $(COMPOSE_FILE) logs -f --tail=100

logs-backend: ## 📋 Показать только логи backend
	docker-compose -f $(COMPOSE_FILE) logs -f --tail=100 backend

logs-frontend: ## 📋 Показать только логи frontend
	docker-compose -f $(COMPOSE_FILE) logs -f --tail=100 frontend

logs-db: ## 📋 Показать логи баз данных
	docker-compose -f $(COMPOSE_FILE) logs -f --tail=100 postgres redis mongodb

status: ## 📊 Проверить статус сервисов
	@echo "${GREEN}Статус сервисов:${NC}"
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "${GREEN}Health checks:${NC}"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep gameide || echo "Нет запущенных контейнеров"

health: ## 🏥 Проверить здоровье сервисов
	@echo "${GREEN}Проверка здоровья сервисов...${NC}"
	@echo -n "${YELLOW}PostgreSQL:${NC} "
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:5432 > /dev/null && echo "${GREEN}OK${NC}" || echo "${RED}ERROR${NC}"
	@echo -n "${YELLOW}Redis:${NC} "
	@docker exec gameide-redis redis-cli ping > /dev/null 2>&1 && echo "${GREEN}OK${NC}" || echo "${RED}ERROR${NC}"
	@echo -n "${YELLOW}Backend API:${NC} "
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200" && echo "${GREEN}OK${NC}" || echo "${RED}ERROR${NC}"
	@echo -n "${YELLOW}Frontend:${NC} "
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200" && echo "${GREEN}OK${NC}" || echo "${RED}ERROR${NC}"

install: ## 📦 Установить зависимости
	@echo "${GREEN}Установка зависимостей...${NC}"
	@if [ -d "backend" ]; then \
		echo "${YELLOW}Установка backend зависимостей...${NC}"; \
		cd backend && npm install; \
	fi
	@if [ -d "frontend" ]; then \
		echo "${YELLOW}Установка frontend зависимостей...${NC}"; \
		cd frontend && npm install; \
	fi
	@echo "${GREEN}✅ Зависимости установлены${NC}"

deps: install ## Алиас для install

test: ## 🧪 Запустить тесты
	@echo "${GREEN}Запуск тестов...${NC}"
	@if [ -d "backend" ]; then \
		echo "${YELLOW}Backend тесты:${NC}"; \
		cd backend && npm test; \
	fi
	@if [ -d "frontend" ]; then \
		echo "${YELLOW}Frontend тесты:${NC}"; \
		cd frontend && npm test -- --watchAll=false; \
	fi

test-backend: ## 🧪 Запустить только backend тесты
	@if [ -d "backend" ]; then \
		echo "${GREEN}Запуск backend тестов...${NC}"; \
		cd backend && npm test; \
	fi

test-frontend: ## 🧪 Запустить только frontend тесты
	@if [ -d "frontend" ]; then \
		echo "${GREEN}Запуск frontend тестов...${NC}"; \
		cd frontend && npm test -- --watchAll=false; \
	fi

lint: ## 🔍 Проверить код линтером
	@echo "${GREEN}Проверка кода...${NC}"
	@if [ -d "backend" ]; then \
		echo "${YELLOW}Backend lint:${NC}"; \
		cd backend && npm run lint; \
	fi
	@if [ -d "frontend" ]; then \
		echo "${YELLOW}Frontend lint:${NC}"; \
		cd frontend && npm run lint; \
	fi

format: ## ✨ Форматировать код
	@echo "${GREEN}Форматирование кода...${NC}"
	@if [ -d "backend" ]; then \
		echo "${YELLOW}Backend format:${NC}"; \
		cd backend && npm run format; \
	fi
	@if [ -d "frontend" ]; then \
		echo "${YELLOW}Frontend format:${NC}"; \
		cd frontend && npm run format; \
	fi

clean: ## 🧹 Очистить все данные и контейнеры
	@echo "${RED}Очистка всех данных...${NC}"
	@read -p "Вы уверены? Это удалит ВСЕ данные! (y/N): " confirm && [ "$$confirm" = "y" ]
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f
	docker volume prune -f
	@echo "${GREEN}✅ Очистка завершена${NC}"

clean-soft: ## 🧹 Мягкая очистка (без удаления данных)
	@echo "${YELLOW}Мягкая очистка...${NC}"
	docker-compose -f $(COMPOSE_FILE) down --remove-orphans
	docker system prune -f
	@echo "${GREEN}✅ Мягкая очистка завершена${NC}"

backup: ## 💾 Создать резервную копию данных
	@echo "${GREEN}Создание резервной копии...${NC}"
	@mkdir -p backups
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	echo "${YELLOW}Backup PostgreSQL...${NC}"; \
	docker exec gameide-postgres pg_dump -U gameide_user gameide_dev > backups/postgres_$$timestamp.sql; \
	echo "${YELLOW}Backup Redis...${NC}"; \
	docker exec gameide-redis redis-cli SAVE; \
	docker cp gameide-redis:/data/dump.rdb backups/redis_$$timestamp.rdb; \
	echo "${YELLOW}Backup MongoDB...${NC}"; \
	docker exec gameide-mongodb mongodump --db gameide_analytics --archive > backups/mongodb_$$timestamp.archive; \
	echo "${GREEN}✅ Резервная копия создана в backups/$$timestamp${NC}"

restore: ## 📥 Восстановить из резервной копии
	@echo "${RED}Восстановление из резервной копии...${NC}"
	@echo "Доступные backup файлы:"
	@ls -la backups/ 2>/dev/null || echo "Нет backup файлов"
	@read -p "Введите timestamp для восстановления (YYYYMMDD_HHMMSS): " timestamp; \
	if [ -f "backups/postgres_$$timestamp.sql" ]; then \
		echo "${YELLOW}Восстановление PostgreSQL...${NC}"; \
		docker exec -i gameide-postgres psql -U gameide_user -d gameide_dev < backups/postgres_$$timestamp.sql; \
	fi; \
	if [ -f "backups/redis_$$timestamp.rdb" ]; then \
		echo "${YELLOW}Восстановление Redis...${NC}"; \
		docker cp backups/redis_$$timestamp.rdb gameide-redis:/data/dump.rdb; \
		docker restart gameide-redis; \
	fi; \
	if [ -f "backups/mongodb_$$timestamp.archive" ]; then \
		echo "${YELLOW}Восстановление MongoDB...${NC}"; \
		docker exec -i gameide-mongodb mongorestore --db gameide_analytics --archive < backups/mongodb_$$timestamp.archive; \
	fi; \
	echo "${GREEN}✅ Восстановление завершено${NC}"

shell-backend: ## 🐚 Открыть shell в backend контейнере
	docker exec -it gameide-backend /bin/sh

shell-frontend: ## 🐚 Открыть shell в frontend контейнере
	docker exec -it gameide-frontend /bin/sh

shell-db: ## 🐚 Открыть PostgreSQL shell
	docker exec -it gameide-postgres psql -U gameide_user -d gameide_dev

shell-redis: ## 🐚 Открыть Redis CLI
	docker exec -it gameide-redis redis-cli

shell-mongo: ## 🐚 Открыть MongoDB shell
	docker exec -it gameide-mongodb mongosh gameide_analytics

# Production команды
prod-start: ## 🚀 Запустить production версию
	@echo "${GREEN}Запуск production версии...${NC}"
	@if [ ! -f .env.prod ]; then \
		echo "${RED}Файл .env.prod не найден! Скопируйте .env.prod.example${NC}"; \
		exit 1; \
	fi
	chmod +x scripts/deploy.sh
	./scripts/deploy.sh deploy

prod-stop: ## 🛑 Остановить production версию
	docker-compose -f $(COMPOSE_PROD_FILE) down

prod-logs: ## 📋 Логи production версии
	docker-compose -f $(COMPOSE_PROD_FILE) logs -f

# Мониторинг
monitor: ## 📊 Открыть мониторинг (Grafana)
	@echo "${GREEN}Мониторинг доступен по адресам:${NC}"
	@echo "${YELLOW}Grafana:${NC} http://localhost:3000"
	@echo "${YELLOW}Prometheus:${NC} http://localhost:9090"
	@echo "${YELLOW}Application:${NC} http://localhost"

# Развертывание
deploy: ## 🚀 Полное развертывание
	@echo "${GREEN}Полное развертывание GameIDE...${NC}"
	@make install
	@make start
	@echo "${GREEN}✅ Развертывание завершено!${NC}"

# Информация о системе
info: ## ℹ️  Информация о системе
	@echo "${GREEN}GameIDE System Information:${NC}"
	@echo "${YELLOW}Docker Version:${NC}"
	@docker --version
	@echo "${YELLOW}Docker Compose Version:${NC}"
	@docker-compose --version
	@echo "${YELLOW}Доступное место на диске:${NC}"
	@df -h . | tail -1
	@echo "${YELLOW}Использование памяти:${NC}"
	@free -h 2>/dev/null || echo "N/A (not Linux)"
	@echo "${YELLOW}Запущенные GameIDE контейнеры:${NC}"
	@docker ps --filter "name=gameide" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Быстрые команды
up: start ## Алиас для start
down: stop ## Алиас для stop
ps: status ## Алиас для status

# Проверка окружения
check: ## ✅ Проверить окружение перед запуском
	@echo "${GREEN}Проверка окружения...${NC}"
	@command -v docker >/dev/null 2>&1 || { echo "${RED}Docker не установлен!${NC}"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "${RED}Docker Compose не установлен!${NC}"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "${RED}Docker не запущен!${NC}"; exit 1; }
	@echo "${GREEN}✅ Окружение готово к работе${NC}"

# Установка зависимостей системы
install-deps: ## 🔧 Установить Docker и Docker Compose автоматически
	@echo "${GREEN}Установка системных зависимостей...${NC}"
	@OS="$$(uname -s)"; \
	case $$OS in \
		Darwin*) \
			echo "${YELLOW}macOS обнаружена${NC}"; \
			if command -v brew >/dev/null 2>&1; then \
				echo "${YELLOW}Установка через Homebrew...${NC}"; \
				if ! command -v docker >/dev/null 2>&1; then \
					echo "${YELLOW}Устанавливаем Docker...${NC}"; \
					brew install --cask docker; \
				fi; \
				if ! command -v docker-compose >/dev/null 2>&1; then \
					echo "${YELLOW}Устанавливаем Docker Compose...${NC}"; \
					brew install docker-compose; \
				fi; \
			else \
				echo "${RED}Homebrew не установлен. Установите сначала Homebrew:${NC}"; \
				echo "/bin/bash -c \"$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""; \
				exit 1; \
			fi; \
			;; \
		Linux*) \
			echo "${YELLOW}Linux обнаружена${NC}"; \
			if ! command -v docker >/dev/null 2>&1; then \
				echo "${YELLOW}Устанавливаем Docker...${NC}"; \
				curl -fsSL https://get.docker.com -o get-docker.sh; \
				sudo sh get-docker.sh; \
				rm get-docker.sh; \
				sudo usermod -aG docker $$USER; \
				sudo systemctl enable docker; \
				sudo systemctl start docker; \
			fi; \
			if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then \
				echo "${YELLOW}Устанавливаем Docker Compose...${NC}"; \
				COMPOSE_VERSION=$$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4); \
				ARCH=$$(uname -m); \
				case $$ARCH in \
					x86_64) COMPOSE_ARCH="x86_64" ;; \
					aarch64|arm64) COMPOSE_ARCH="aarch64" ;; \
					*) echo "${RED}Неподдерживаемая архитектура: $$ARCH${NC}"; exit 1 ;; \
				esac; \
				curl -L "https://github.com/docker/compose/releases/download/$$COMPOSE_VERSION/docker-compose-linux-$$COMPOSE_ARCH" -o /tmp/docker-compose; \
				sudo mv /tmp/docker-compose /usr/local/bin/docker-compose; \
				sudo chmod +x /usr/local/bin/docker-compose; \
			fi; \
			;; \
		*) \
			echo "${RED}Автоустановка не поддерживается для $$OS${NC}"; \
			echo "${BLUE}Установите Docker вручную: https://docs.docker.com/get-docker/${NC}"; \
			exit 1; \
			;; \
	esac
	@echo "${GREEN}✅ Зависимости установлены${NC}"
	@echo "${YELLOW}⚠️  На Linux может потребоваться перелогиниться или выполнить: newgrp docker${NC}"

# Автоматическая установка и запуск
setup: ## 🎯 Автоматическая установка и запуск (все в одном)
	@echo "${GREEN}🎯 GameIDE Auto Setup${NC}"
	@make check || make install-deps
	@make install
	@make start
	@echo ""
	@echo "${GREEN}🎉 GameIDE успешно установлен и запущен!${NC}"
	@echo ""
	@echo "${YELLOW}Полезные команды:${NC}"
	@echo "  make logs      - Просмотр логов"
	@echo "  make status    - Статус сервисов"  
	@echo "  make health    - Проверка здоровья"
	@echo "  make stop      - Остановка"
	@echo "  make help      - Полная справка"

# Полная автоустановка с нуля (включая системные зависимости)
auto-install: ## 🚀 Полная автоустановка с нуля (включая Docker)
	@echo "${GREEN}🚀 GameIDE Full Auto Install${NC}"
	@echo "${YELLOW}Эта команда установит все зависимости автоматически${NC}"
	@read -p "Продолжить? (y/N): " confirm && [ "$$confirm" = "y" ]
	@make install-deps
	@make setup
	@echo ""
	@echo "${GREEN}🎉 Полная установка GameIDE завершена!${NC}"
	@echo "${YELLOW}Система готова к использованию на:${NC}"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"

# По умолчанию показываем справку
default: help 