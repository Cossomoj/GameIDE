# 🎮 GameIDE - AI Game Generator для Яндекс Игр

Локальный веб-сервис для автоматической генерации HTML5 игр из текстовых описаний с использованием искусственного интеллекта. Полностью совместим с платформой Яндекс.Игры.

## 🚀 Быстрый старт (одна команда!)

```bash
# Клонируем репозиторий
git clone <your-repo-url>
cd GameIDE

# Настраиваем проект одной командой
make setup

# Запускаем сервис
make dev
```

**Готово!** 🎉 Откройте http://localhost:5173 в браузере.

## 📋 Альтернативные команды запуска

### С помощью Make (рекомендуется)
```bash
make dev          # Запуск в режиме разработки
make start        # Запуск в фоновом режиме
make stop         # Остановка всех сервисов
make restart      # Перезапуск
make help         # Показать все доступные команды
```

### С помощью NPM
```bash
npm run setup     # Первоначальная настройка
npm run dev       # Запуск в режиме разработки
npm run start     # Запуск в фоновом режиме
npm run stop      # Остановка сервисов
```

### С помощью Docker Compose
```bash
docker-compose up --build    # Запуск с пересборкой
docker-compose up -d         # Запуск в фоновом режиме
docker-compose down          # Остановка
```

## ⚙️ Предварительная настройка

### 1. Системные требования

- **Docker** 20.0+ и **Docker Compose** 2.0+
- **Node.js** 20+ (для разработки)
- **Make** (для удобных команд)
- **Git**

### 2. API ключи (обязательно!)

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp env.example .env
```

Получите API ключи:
- **DeepSeek API**: https://platform.deepseek.com/
- **OpenAI API**: https://platform.openai.com/

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## 🏗️ Архитектура проекта

```
GameIDE/
├── 📁 backend/          # Node.js API (TypeScript)
├── 📁 frontend/         # React приложение (TypeScript + Vite)
├── 📁 games-output/     # Сгенерированные игры
│   ├── generated/       # Готовые игры
│   ├── uploads/         # Загруженные файлы
│   └── templates/       # Шаблоны игр
├── 📁 logs/            # Логи всех сервисов
│   ├── backend/        # Логи API
│   ├── frontend/       # Логи фронтенда
│   ├── postgres/       # Логи БД
│   └── redis/          # Логи очередей
├── 📁 docs/            # Документация
├── 📁 tests/           # Тесты
├── 📁 scripts/         # Утилиты
└── 📁 backups/         # Резервные копии
```

## 🎯 Основные возможности

### ✨ Генерация игр
- **Автоматическая генерация** из текстового описания
- **Интерактивная генерация** с пошаговым выбором вариантов
- **Детальная конфигурация** всех аспектов игры
- **8 жанров игр**: платформер, аркада, головоломка, экшен, RPG, стратегия, шутер, симулятор

### 🎨 Настройка игры
- **Визуальный стиль**: 13 графических стилей от пиксель-арта до 3D
- **Игровые механики**: прыжки, стрельба, физика, боевая система
- **Камера и управление**: различные виды камеры и схемы управления
- **Прогрессия**: система уровней, экипировка, валюта
- **Социальные функции**: мультиплеер, достижения, лидерборды

### 🔧 Интерактивная генерация
1. **Персонаж** - выбор героя и его способностей
2. **Механики** - основные правила и геймплей
3. **Уровни** - дизайн и структура уровней
4. **Графика** - визуальный стиль и эффекты
5. **Звуки** - музыка и звуковые эффекты
6. **UI** - интерфейс и элементы управления

## 📊 Мониторинг и управление

### 📈 Статус сервисов
```bash
make status       # Показать статус всех контейнеров
make health       # Проверить работоспособность
make monitor      # Мониторинг ресурсов
```

### 📋 Логи
```bash
make logs         # Все логи
make logs-backend # Только backend
make logs-frontend# Только frontend
make logs-db      # База данных
make logs-redis   # Redis
```

### 💾 Резервное копирование
```bash
make backup       # Создать бэкап
make restore      # Восстановить из бэкапа
```

### 🧹 Очистка
```bash
make clean        # Очистить временные файлы
make clean-all    # Полная очистка (включая node_modules)
```

## 🌐 Веб-интерфейс

После запуска доступны:

- **Основное приложение**: http://localhost:5173
- **API документация**: http://localhost:3000/api/docs
- **Статус API**: http://localhost:3000/api/health

## 🔧 Команды разработки

### 🛠️ Установка и сборка
```bash
make install      # Установить зависимости
make build        # Собрать проект
make lint         # Проверить код
make lint-fix     # Исправить код
make test         # Запустить тесты
```

### 🐳 Docker команды
```bash
make shell-backend    # Подключиться к backend контейнеру
make shell-frontend   # Подключиться к frontend контейнеру
make shell-db         # Подключиться к PostgreSQL
```

### 🗄️ База данных
```bash
make db-reset     # Сброс базы данных
make redis-reset  # Сброс Redis
```

## 📚 Техническая документация

### 🏗️ Стек технологий

**Backend:**
- Node.js 20+ с TypeScript
- Express.js для API
- PostgreSQL для данных
- Redis для очередей
- WebSocket для real-time
- Bull для фоновых задач

**Frontend:**
- React 18 с TypeScript
- Vite для сборки
- Ant Design для UI
- TailwindCSS для стилей
- React Query для состояния

**AI интеграция:**
- DeepSeek API для генерации кода
- OpenAI DALL-E 3 для графики
- Custom промпты для каждого жанра

**Игровой движок:**
- Phaser 3.70+ для игр
- Yandex Games SDK
- Поддержка всех современных браузеров

### 🔐 Безопасность

- Rate limiting для API
- CORS настройки
- Валидация всех входных данных
- Безопасная загрузка файлов
- JWT аутентификация (опционально)

### 📊 Мониторинг

- Structured логирование (Winston)
- Health checks для всех сервисов
- Metrics экспорт (Prometheus совместимые)
- Error tracking (Sentry поддержка)

## 🚨 Решение проблем

### Порты заняты
```bash
# Проверить занятые порты
lsof -i :3000 -i :5173 -i :5432 -i :6379

# Остановить все Docker контейнеры
docker stop $(docker ps -q)
```

### Ошибки Docker
```bash
# Полная очистка Docker
make clean
docker system prune -a --volumes

# Пересборка образов
docker-compose build --no-cache
```

### Ошибки базы данных
```bash
# Сброс базы данных
make db-reset

# Проверка подключения
make shell-db
```

### Недостаточно места на диске
```bash
# Очистка логов
make clean-logs

# Очистка старых игр
make clean-games

# Полная очистка
make clean-all
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

- 📧 **Email**: support@gameide.com
- 💬 **Issues**: [GitHub Issues](https://github.com/your-org/gameide/issues)
- 📖 **Документация**: [docs/](./docs/)
- 🎮 **Примеры игр**: [games-output/templates/](./games-output/templates/)

---

**🎮 Создавайте игры мечты с помощью ИИ!** ✨
