# 🚀 Установка GameIDE

**Полная автоматическая установка GameIDE с автоустановкой зависимостей**

## ⚡ Мгновенная установка (один скрипт)

### Для новых пользователей (установит всё автоматически):

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/GameIDE.git
cd GameIDE

# Запускаем автоматический скрипт (установит Docker если нет)
./start.sh
```

**Что произойдет:**
- ✅ Проверка наличия Docker и Docker Compose
- ✅ **Автоматическая установка Docker/Docker Compose если отсутствуют**
- ✅ Создание конфигурационных файлов
- ✅ Запуск всех сервисов
- ✅ Проверка работоспособности

---

## 🛠️ Варианты установки

### 1️⃣ Полная автоустановка (Make команда)

```bash
# Установит ВСЕ зависимости и запустит систему
make auto-install
```

### 2️⃣ Поэтапная установка

```bash
# Шаг 1: Установка системных зависимостей (Docker/Docker Compose)
make install-deps

# Шаг 2: Установка и запуск GameIDE
make setup
```

### 3️⃣ Если Docker уже установлен

```bash
make setup     # Быстрая установка и запуск
```

---

## 🔧 Автоустановка зависимостей

GameIDE автоматически устанавливает:

### macOS:
- **Docker Desktop** через Homebrew
- **Docker Compose** через Homebrew
- Автоматически запускает Docker Desktop

### Linux:
- **Docker CE** через официальный скрипт
- **Docker Compose** последней версии с GitHub
- Настраивает права пользователя
- Запускает Docker daemon

### Windows:
- Инструкции по установке Docker Desktop
- Поддержка WSL2

---

## 📋 Системные требования

### Минимальные:
- **ОС**: macOS 10.15+, Ubuntu 18.04+, CentOS 7+, Windows 10+
- **RAM**: 4GB (рекомендуется 8GB)
- **Место**: 5GB свободного места
- **Интернет**: для скачивания образов Docker

### Автоматически устанавливается:
- Docker 20.0+
- Docker Compose 2.0+
- curl (для health checks)

---

## 🔍 Проверка установки

### Быстрая проверка:
```bash
make check     # Проверить все зависимости
make status    # Статус запущенных сервисов
make health    # Здоровье всех компонентов
```

### Детальная диагностика:
```bash
make info      # Информация о системе
docker --version
docker-compose --version
docker info
```

---

## 🚨 Устранение проблем

### Проблема: "Docker не найден"
```bash
# Автоматическая установка
make install-deps

# Или вручную на macOS:
brew install --cask docker

# Или вручную на Linux:
curl -fsSL https://get.docker.com | sh
```

### Проблема: "Docker Compose не найден"
```bash
# Автоматическая установка
make install-deps

# Или проверьте встроенную команду:
docker compose version
```

### Проблема: "Permission denied" на Linux
```bash
# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Применить изменения
newgrp docker

# Или перелогиниться
```

### Проблема: "Docker не запущен"
```bash
# macOS:
open -a Docker

# Linux:
sudo systemctl start docker
sudo systemctl enable docker
```

### Проблема: "Порты заняты"
```bash
# Найти процессы на портах
sudo lsof -i :3000
sudo lsof -i :3001

# Остановить другие сервисы
make stop
docker-compose down
```

---

## 🔄 Процесс автоустановки

### Что делает `./start.sh`:

1. **Проверка системы**
   - Определяет ОС (macOS/Linux/Windows)
   - Проверяет архитектуру (x86_64/ARM64)

2. **Установка Docker** (если отсутствует)
   - macOS: `brew install --cask docker`
   - Linux: `curl -fsSL https://get.docker.com | sh`
   - Настройка прав и групп

3. **Установка Docker Compose** (если отсутствует)
   - Скачивание последней версии с GitHub
   - Установка в `/usr/local/bin/`
   - Создание символических ссылок

4. **Запуск Docker**
   - macOS: Автоматическое открытие Docker Desktop
   - Linux: `systemctl start docker`
   - Ожидание готовности daemon

5. **Настройка GameIDE**
   - Создание `.env` файла
   - Создание директорий
   - Запуск всех сервисов
   - Проверка работоспособности

---

## 🎯 После установки

### Доступные сервисы:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Documentation**: http://localhost:3001/api-docs
- **Nginx**: http://localhost:80

### Управление:
```bash
make start     # Запуск
make stop      # Остановка
make restart   # Перезапуск
make logs      # Логи
make backup    # Резервная копия
make help      # Все команды
```

---

## 🌐 Установка на сервер

### Production установка:
```bash
# Копируем на сервер
git clone https://github.com/yourusername/GameIDE.git
cd GameIDE

# Настраиваем production окружение
cp .env.prod.example .env.prod
# Редактируем .env.prod

# Запускаем production версию
make prod-start
```

### Kubernetes установка:
```bash
# Применяем манифесты
kubectl apply -f k8s/
```

---

## 📞 Поддержка

### Если автоустановка не работает:

1. **Проверьте интернет соединение**
2. **Убедитесь в правах администратора** (sudo на Linux)
3. **Проверьте место на диске** (минимум 5GB)
4. **Отключите антивирус** временно

### Получить помощь:
- **GitHub Issues**: [Issues](https://github.com/yourusername/GameIDE/issues)
- **Документация**: [docs/](./docs/)
- **Логи установки**: `make logs`

### Ручная установка:
Если автоустановка не работает, следуйте [ручной инструкции](./docs/MANUAL_INSTALL.md)

---

## ✅ Проверочный список

После установки убедитесь:

- [ ] `docker --version` возвращает версию 20.0+
- [ ] `docker-compose --version` работает
- [ ] `docker info` не выдает ошибок
- [ ] `make status` показывает запущенные сервисы
- [ ] http://localhost:3000 открывается
- [ ] http://localhost:3001/health возвращает OK

**Если все пункты ✅ - установка прошла успешно! 🎉**

---

*Последнее обновление: $(date)* 