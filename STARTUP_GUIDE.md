# 🎮 GameIDE - Запуск одной командой

## 🚀 Суперпростой запуск

```bash
./start.sh
```

**Это всё!** Скрипт сам проверит зависимости, настроит проект и запустит все сервисы.

## 📋 Альтернативные способы

### Через Make
```bash
make setup    # Первая настройка
make dev      # Запуск
```

### Через NPM
```bash
npm run setup
npm run dev
```

### Через Docker Compose
```bash
docker-compose up --build
```

## ⚙️ Быстрая настройка

1. **Установите зависимости:**
   - Docker Desktop
   - Git

2. **Клонируйте и запустите:**
   ```bash
   git clone <your-repo>
   cd GameIDE
   ./start.sh
   ```

3. **Добавьте API ключи** (когда скрипт попросит):
   - DeepSeek API: https://platform.deepseek.com/
   - OpenAI API: https://platform.openai.com/

## 🌐 После запуска

- **Приложение**: http://localhost:5173
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 🔧 Управление

```bash
# Статус
make status
docker-compose ps

# Логи
make logs
docker-compose logs -f

# Остановка
make stop
docker-compose down

# Перезапуск
make restart
```

## 📁 Структура проекта

```
GameIDE/
├── 🚀 start.sh          # Запуск одной командой
├── 🛠️  Makefile         # Make команды  
├── 📦 package.json      # NPM скрипты
├── 🐳 docker-compose.yml# Docker конфигурация
├── ⚙️  env.example      # Пример настроек
├── 📚 docs/             # Документация
├── 📁 games-output/     # Сгенерированные игры
├── 📋 logs/             # Логи всех сервисов
├── 🔧 scripts/          # Утилиты (backup/restore)
└── 🧪 tests/            # Тесты
```

## 🆘 Если что-то не работает

```bash
# Полная очистка и перезапуск
make clean
./start.sh

# Проверка портов
lsof -i :3000 -i :5173

# Логи для диагностики
make logs
```

---

**🎮 Одна команда - и вы создаете игры с помощью AI!** ✨ 