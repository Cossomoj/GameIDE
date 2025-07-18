# 🚀 Быстрое руководство по запуску GameIDE

## В двух командах

```bash
# 1. Настройка (один раз)
make setup

# 2. Запуск (каждый раз)
make dev
```

Готово! Откройте http://localhost:5173

## Первый запуск (детально)

### 1. Проверьте системные требования

```bash
# Проверьте Docker
docker --version

# Проверьте Docker Compose
docker-compose --version

# Проверьте Make (опционально, но удобно)
make --version
```

### 2. Настройте API ключи

```bash
# Скопируйте шаблон конфигурации
cp env.example .env

# Отредактируйте .env файл
nano .env
```

**Обязательно укажите:**
- `DEEPSEEK_API_KEY` - для генерации кода игр
- `OPENAI_API_KEY` - для генерации графики

### 3. Запустите проект

```bash
# Первоначальная настройка
make setup

# Запуск в режиме разработки
make dev
```

### 4. Откройте в браузере

- **Приложение**: http://localhost:5173
- **API**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health

## Альтернативные способы запуска

### NPM скрипты
```bash
npm run setup
npm run dev
```

### Docker Compose напрямую
```bash
docker-compose up --build
```

## Проверка работы

```bash
# Статус всех сервисов
make status

# Проверка здоровья
make health

# Логи в реальном времени
make logs
```

## Что делать, если что-то не работает

### Порты заняты
```bash
# Найти процессы на портах
lsof -i :3000 -i :5173 -i :5432 -i :6379

# Остановить все
make stop
```

### Проблемы с Docker
```bash
# Полная очистка
make clean

# Пересборка
docker-compose build --no-cache
```

### Нет API ключей
1. Получите DeepSeek API: https://platform.deepseek.com/
2. Получите OpenAI API: https://platform.openai.com/
3. Добавьте в `.env` файл

## Первое использование

1. Откройте http://localhost:5173
2. Нажмите "Создать игру"
3. Выберите "Интерактивно" для полного контроля
4. Пройдите настройку параметров игры
5. Выбирайте варианты на каждом этапе
6. Получите готовую игру!

## Полезные команды

```bash
make help          # Показать все команды
make logs-backend  # Логи только backend
make logs-frontend # Логи только frontend
make restart       # Перезапуск
make backup        # Создать бэкап
make clean         # Очистка
``` 