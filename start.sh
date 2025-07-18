#!/bin/bash

# GameIDE Quick Start Script
# Использование: ./start.sh

set -e

echo "🎮 GameIDE - AI Game Generator для Яндекс Игр"
echo "=============================================="

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен! Установите Docker Desktop и попробуйте снова."
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверяем доступность Docker daemon
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon не запущен! Запустите Docker Desktop и попробуйте снова."
    exit 1
fi

# Создаем .env файл если его нет
if [ ! -f ".env" ]; then
    echo "⚙️  Создаем файл конфигурации..."
    cat > .env << EOF
# AI API Keys (опционально для полной функциональности)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL=postgresql://gameide:gameide_password@postgres:5432/gameide_db
REDIS_URL=redis://redis:6379

# Environment
NODE_ENV=development
LOG_LEVEL=debug

# Paths
GAMES_OUTPUT_PATH=/app/games-output
UPLOADS_PATH=/app/games-output/uploads
TEMPLATES_PATH=/app/games-output/templates

# Frontend
VITE_API_URL=http://localhost:3000
EOF
    echo "✅ Файл .env создан"
    echo ""
    echo "⚠️  ВАЖНО: Для полной функциональности добавьте ваши API ключи в .env:"
    echo "   - DEEPSEEK_API_KEY (https://platform.deepseek.com/)"
    echo "   - OPENAI_API_KEY (https://platform.openai.com/)"
    echo ""
    echo "💡 Проект может работать без API ключей, но AI функции будут недоступны"
    echo ""
fi

# Создаем необходимые директории
echo "📁 Создание директорий..."
mkdir -p logs/frontend logs/backend logs/redis logs/postgres logs/nginx
mkdir -p games-output/generated games-output/uploads games-output/templates
mkdir -p data/temp

echo "🚀 Запускаем GameIDE..."

# Останавливаем старые контейнеры (если есть)
echo "🛑 Остановка старых контейнеров..."
docker compose down 2>/dev/null || true

# Запускаем с пересборкой
echo "🔨 Сборка и запуск сервисов..."
docker compose up --build -d

# Ждем запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 15

# Проверяем статус
echo "📊 Проверка статуса сервисов..."
docker compose ps

# Показываем логи если есть проблемы
echo "📝 Проверка логов..."
for service in postgres redis backend frontend; do
    echo "   Проверка $service..."
    if ! docker compose ps --services --filter "status=running" | grep -q "^${service}$"; then
        echo "   ⚠️  $service не запущен, показываем логи:"
        docker compose logs --tail=10 $service
    else
        echo "   ✅ $service работает"
    fi
done

# Проверяем доступность сервисов
echo "🏥 Проверка доступности..."

# Проверяем frontend
echo "   Проверка frontend (http://localhost:5173)..."
for i in {1..20}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "   ✅ Frontend доступен"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ⚠️  Frontend пока недоступен, но может запуститься позже"
    fi
    sleep 2
done

# Проверяем backend
echo "   Проверка backend (http://localhost:3000)..."
for i in {1..20}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Backend доступен"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ⚠️  Backend пока недоступен, но может запуститься позже"
    fi
    sleep 2
done

echo ""
echo "🎉 GameIDE запущен!"
echo ""
echo "🌐 Сервисы доступны по адресам:"
echo "   • Frontend:   http://localhost:5173"
echo "   • Backend:    http://localhost:3000"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis:      localhost:6379"
echo ""
echo "📋 Полезные команды:"
echo "   • Логи всех сервисов:    docker compose logs -f"
echo "   • Логи конкретного:      docker compose logs -f <service>"
echo "   • Статус:                docker compose ps"
echo "   • Остановка:             docker compose down"
echo "   • Перезапуск:            docker compose restart"
echo "   • Полная пересборка:     docker compose down && docker compose up --build"
echo ""
echo "🔧 При проблемах:"
echo "   • Проверьте логи:        docker compose logs"
echo "   • Перезапустите Docker Desktop"
echo "   • Освободите порты 3000, 5173, 5432, 6379"
echo ""

# Опционально открываем браузер (только на macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🖥️  Открываем браузер через 5 секунд..."
    echo "   Нажмите Ctrl+C чтобы отменить..."
    sleep 5
    open http://localhost:5173 2>/dev/null || echo "   Не удалось открыть браузер автоматически"
fi

echo ""
echo "✨ Готово! Создавайте игры с помощью AI!"
echo "📚 Документация: docs/QUICK_START.md" 