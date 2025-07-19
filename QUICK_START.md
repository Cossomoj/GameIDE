# 🚀 GameIDE Quick Start

**Запустите полную AI-платформу для создания игр одной командой!**

## ⚡ Мгновенный запуск (TL;DR)

```bash
# Вариант 1: Автоматический скрипт
./start.sh

# Вариант 2: Make команда  
make setup

# Вариант 3: Docker Compose
docker-compose up --build -d
```

**🎯 Результат:** Через 2-3 минуты у вас будет работающая платформа на:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx**: http://localhost:80

---

## 📋 Требования

- **Docker** 20.0+ 
- **Docker Compose** 2.0+
- **8GB RAM** (рекомендуется)
- **5GB** свободного места

### Проверка системы

```bash
docker --version
docker-compose --version
docker info
```

---

## 🎮 Варианты запуска

### 1️⃣ Автоматический скрипт (рекомендуется)

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/GameIDE.git
cd GameIDE

# Запускаем автоматический скрипт
./start.sh
```

**Что делает скрипт:**
- ✅ Проверяет зависимости
- ✅ Создает `.env` файл с дефолтными настройками
- ✅ Создает необходимые директории
- ✅ Собирает и запускает все сервисы
- ✅ Проверяет работоспособность
- ✅ Выводит информацию о доступных сервисах

### 2️⃣ Make команды

```bash
# Полная автоматическая установка
make setup

# Или поэтапно:
make check    # Проверить окружение
make install  # Установить зависимости  
make start    # Запустить сервисы
```

**Полезные Make команды:**
```bash
make help     # Показать все команды
make status   # Статус сервисов
make logs     # Просмотр логов
make health   # Проверка здоровья
make stop     # Остановка
make restart  # Перезапуск
make clean    # Очистка данных
```

### 3️⃣ Docker Compose напрямую

```bash
# Создать .env файл (скопировать .env.example)
cp .env.example .env

# Запустить все сервисы
docker-compose up --build -d

# Проверить статус
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

---

## 🔧 Что запускается

При запуске автоматически поднимаются:

### Основные сервисы:
- **🎯 Backend API** (Node.js + Express + TypeScript) - порт 3001
- **🌐 Frontend** (React + TypeScript + Vite) - порт 3000  
- **🔄 Nginx** (Reverse Proxy) - порт 80

### Базы данных:
- **🐘 PostgreSQL** - основная БД (порт 5432)
- **📱 Redis** - кеш и очереди (порт 6379)
- **🍃 MongoDB** - аналитика (порт 27017)

### Volumes для данных:
- `postgres_data` - данные PostgreSQL
- `redis_data` - данные Redis  
- `mongodb_data` - данные MongoDB
- `node_modules` - зависимости Node.js

---

## 🌟 Первые шаги

После запуска:

1. **Откройте браузер**: http://localhost:3000
2. **Начните создавать игру**: 
   - Нажмите "Создать игру"
   - Выберите шаблон
   - Настройте параметры
   - Нажмите "Генерировать"

3. **Изучите API**: http://localhost:3001/api/health

---

## 🔑 Настройка API ключей (опционально)

Для полной функциональности добавьте API ключи в `.env`:

```bash
# Откройте .env файл
nano .env

# Добавьте ваши ключи:
OPENAI_API_KEY=sk-your_openai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here  
CLAUDE_API_KEY=your_claude_key_here
```

**Где получить ключи:**
- [OpenAI API](https://platform.openai.com/api-keys)
- [DeepSeek](https://platform.deepseek.com/)
- [Claude](https://console.anthropic.com/)

После добавления ключей:
```bash
make restart  # Перезапустить сервисы
```

---

## 📊 Мониторинг

### Проверка статуса:
```bash
make status
# или
docker-compose ps
```

### Проверка здоровья сервисов:
```bash
make health
```

### Просмотр логов:
```bash
make logs           # Все логи
make logs-backend   # Только backend
make logs-frontend  # Только frontend
make logs-db        # Только базы данных
```

---

## 🛠️ Управление

### Остановка:
```bash
make stop
# или
docker-compose down
```

### Перезапуск:
```bash
make restart
# или  
docker-compose restart
```

### Полная очистка:
```bash
make clean-soft  # Мягкая очистка (без удаления данных)
make clean       # Полная очистка (УДАЛЯЕТ ВСЕ ДАННЫЕ!)
```

---

## 🔄 Разработка

### Hot Reload включен по умолчанию:
- **Backend**: Nodemon перезапускает при изменении `.ts` файлов
- **Frontend**: Vite обновляет при изменении компонентов

### Доступ к контейнерам:
```bash
make shell-backend   # Shell в backend контейнере
make shell-frontend  # Shell в frontend контейнере
make shell-db        # PostgreSQL CLI
make shell-redis     # Redis CLI
make shell-mongo     # MongoDB CLI
```

### Тестирование:
```bash
make test           # Запустить все тесты
make test-backend   # Backend тесты
make test-frontend  # Frontend тесты
make lint           # Проверка кода
make format         # Форматирование кода
```

---

## 💾 Резервное копирование

### Создание backup:
```bash
make backup
```

### Восстановление:
```bash
make restore
# Введите timestamp когда попросит
```

---

## 🐛 Устранение проблем

### Проблема: Порты заняты
```bash
# Найти процессы на портах
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432

# Остановить другие сервисы или изменить порты в docker-compose.yml
```

### Проблема: Недостаточно памяти
```bash
# Увеличить memory limit для Docker Desktop
# или освободить память:
docker system prune -f
```

### Проблема: Сервис не запускается
```bash
# Проверить логи конкретного сервиса
docker-compose logs backend
docker-compose logs postgres

# Перезапустить конкретный сервис
docker-compose restart backend
```

### Проблема: База данных не подключается
```bash
# Проверить статус PostgreSQL
docker exec gameide-postgres pg_isready -U gameide_user

# Пересоздать базу данных
docker-compose down
docker volume rm gameide_postgres_data
docker-compose up -d postgres
```

---

## 🌐 Production развертывание

Для production используйте:

```bash
# Подготовить production конфигурацию
cp .env.prod.example .env.prod
# Отредактировать .env.prod с реальными значениями

# Запустить production версию
make prod-start

# Или использовать deploy скрипт
./scripts/deploy.sh deploy
```

---

## 📞 Поддержка

### Документация:
- **API Docs**: http://localhost:3001/api-docs (после запуска)
- **Full Documentation**: [docs/](./docs/)
- **Production Guide**: [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

### Помощь:
- **GitHub Issues**: [Issues](https://github.com/yourusername/GameIDE/issues)
- **Discussions**: [Discussions](https://github.com/yourusername/GameIDE/discussions)

### Быстрые команды помощи:
```bash
make help     # Все доступные команды
make info     # Информация о системе
make check    # Проверка окружения
```

---

## 🎉 Готово!

Теперь у вас есть полностью функциональная AI-платформа для создания игр!

**Приятной разработки!** 🚀

---

*Последнее обновление: $(date)* 