# 🎮 GameIDE - AI Platform for Game Development

**Полная AI-платформа для создания игр с автоматической установкой всех зависимостей**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

---

## ⚡ Быстрый старт (НОВОЕ: с автоустановкой Docker!)

**Запустите полную AI-платформу одной командой - даже если у вас нет Docker!**

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/GameIDE.git
cd GameIDE

# 🚀 Запускаем автоматический скрипт (установит Docker если нужно)
./start.sh
```

**Что произойдет автоматически:**
- ✅ Проверка наличия Docker и Docker Compose
- ✅ **АВТОМАТИЧЕСКАЯ УСТАНОВКА Docker/Docker Compose если отсутствуют**
- ✅ Создание всех конфигурационных файлов
- ✅ Запуск всех сервисов (Backend, Frontend, БД)
- ✅ Проверка работоспособности системы

**⏱️ Результат через 2-3 минуты:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx**: http://localhost:80

---

## 🔧 Варианты установки

### 1️⃣ Полная автоустановка (рекомендуется)
```bash
# Установит ВСЕ включая Docker и запустит систему
make auto-install
```

### 2️⃣ Только установка зависимостей
```bash
# Установит только Docker и Docker Compose
make install-deps
```

### 3️⃣ Если Docker уже есть
```bash
# Быстрый запуск без проверки зависимостей
make setup
```

### 4️⃣ Традиционный Docker Compose
```bash
docker-compose up --build -d
```

---

## 🌟 Поддерживаемые системы

### Автоустановка Docker работает на:

#### 🍎 **macOS**
- Автоматическая установка через Homebrew
- Поддержка Intel и Apple Silicon (M1/M2)
- Автоматический запуск Docker Desktop

#### 🐧 **Linux**  
- Ubuntu 18.04+, Debian 9+
- CentOS 7+, RHEL 7+, Fedora 30+
- Arch Linux, openSUSE
- Автоматическая настройка прав пользователя

#### 🪟 **Windows**
- WSL2 с инструкциями по установке
- Docker Desktop integration

---

## 📋 Что включено

### 🎯 **Основные сервисы**
- **Backend API** (Node.js + Express + TypeScript)
- **Frontend** (React + TypeScript + Vite)  
- **WebSocket** server для real-time функций
- **Nginx** reverse proxy

### 🗄️ **Базы данных**
- **PostgreSQL** - основные данные
- **Redis** - кеш и очереди
- **MongoDB** - аналитика и логи

### 🤖 **AI Интеграции**
- OpenAI GPT (GPT-4, GPT-3.5)
- DeepSeek Coder
- Claude 3 (Anthropic)
- Yandex Games SDK

### 🎨 **Функциональность**
- Генерация игр по описанию
- Множественные шаблоны игр
- Интерактивное создание игр
- Система достижений
- Лидерборды и турниры
- Социальные функции
- Аналитика и мониторинг
- Monetization система

---

## 🛠️ Управление системой

### Основные команды:
```bash
make help          # Показать все команды
make start         # Запустить систему
make stop          # Остановить систему
make restart       # Перезапустить
make status        # Статус сервисов
make health        # Проверка здоровья
make logs          # Просмотр логов
make backup        # Создать backup
make clean         # Очистить данные
```

### Разработка:
```bash
make install       # Установка npm зависимостей
make test          # Запуск тестов
make lint          # Проверка кода
make format        # Форматирование кода
```

### Мониторинг:
```bash
make shell-backend   # Shell в backend контейнере
make shell-frontend  # Shell в frontend контейнере
make shell-db        # PostgreSQL CLI
make shell-redis     # Redis CLI
```

---

## 🚨 Быстрое решение проблем

### "Docker не найден"
```bash
# Автоматическая установка Docker
make install-deps
```

### "Docker Compose не найден"  
```bash
# Автоматическая установка Docker Compose
make install-deps
```

### "Permission denied" на Linux
```bash
# Настройка прав пользователя
sudo usermod -aG docker $USER
newgrp docker
```

### "Порты заняты"
```bash
# Проверка занятых портов
sudo lsof -i :3000
sudo lsof -i :3001

# Остановка всех сервисов
make stop
```

---

## 🎯 Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Services   │
│   React + TS    │◄──►│   Node.js + TS  │◄──►│   GPT/Claude/   │
│   Port: 3000    │    │   Port: 3001    │    │   DeepSeek      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   PostgreSQL    │    │   Redis Cache   │
│   Port: 80      │    │   Port: 5432    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   MongoDB       │    │   Monitoring    │
                       │   Port: 27017   │    │   Prometheus    │
                       └─────────────────┘    └─────────────────┘
```

---

## 🔑 Настройка API ключей

После запуска добавьте API ключи для полной функциональности:

```bash
# Откройте .env файл
nano .env

# Добавьте ваши ключи:
OPENAI_API_KEY=sk-your_openai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here  
CLAUDE_API_KEY=your_claude_key_here

# Перезапустите сервисы
make restart
```

**Где получить ключи:**
- [OpenAI API](https://platform.openai.com/api-keys)
- [DeepSeek](https://platform.deepseek.com/)
- [Claude](https://console.anthropic.com/)

---

## 📚 Документация

- **[🚀 Quick Start Guide](./QUICK_START.md)** - Подробное руководство по запуску
- **[🔧 Installation Guide](./INSTALL.md)** - Инструкции по установке
- **[🏭 Production Deployment](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Production развертывание
- **[📖 API Documentation](./docs/api/)** - API референс
- **[👥 User Guide](./docs/user/)** - Руководство пользователя

---

## 🎮 Возможности

### 🤖 AI-генерация игр
- Создание игр по текстовому описанию
- Поддержка множества жанров (аркады, платформеры, пазлы)
- Автоматическая генерация кода на JavaScript/TypeScript

### 🎨 Шаблоны и конструкторы
- Готовые шаблоны игр
- Визуальный конструктор
- Библиотека компонентов и ассетов
- Система наследования шаблонов

### 📊 Аналитика
- Real-time метрики
- Предиктивная аналитика
- A/B тестирование
- Пользовательские дашборды

### 🏆 Социальные функции
- Система достижений
- Лидерборды и турниры
- Друзья и приглашения
- Социальная лента

### 💰 Монетизация
- Встроенная система платежей
- Subscription планы
- In-app purchases
- Аналитика доходов

---

## 🚀 Production

### Docker Compose:
```bash
# Настройка production окружения
cp .env.prod.example .env.prod
# Отредактируйте .env.prod

# Запуск production версии
make prod-start
```

### Kubernetes:
```bash
kubectl apply -f k8s/
```

### CI/CD Pipeline:
- GitHub Actions для автоматического деплоя
- Тестирование и security scanning
- Multi-stage deployment (staging → production)

---

## 🤝 Участие в разработке

```bash
# Форк репозитория
git clone https://github.com/your-username/GameIDE.git
cd GameIDE

# Установка для разработки
make setup

# Запуск тестов
make test

# Отправка изменений
git checkout -b feature/your-feature
git commit -am "Add your feature"
git push origin feature/your-feature
```

---

## 📞 Поддержка

- **GitHub Issues**: [Issues](https://github.com/yourusername/GameIDE/issues)
- **Discussions**: [Discussions](https://github.com/yourusername/GameIDE/discussions)
- **Email**: support@gameide.com

---

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

---

## 🌟 Основные преимущества

- ✅ **Автоустановка всех зависимостей** - работает из коробки
- ✅ **Одна команда запуска** - `./start.sh` и готово
- ✅ **Поддержка всех ОС** - macOS, Linux, Windows
- ✅ **Production ready** - с мониторингом и CI/CD
- ✅ **Масштабируемая архитектура** - микросервисы и Kubernetes
- ✅ **Полная документация** - для разработчиков и пользователей

---

**🎉 Начните создавать игры с AI прямо сейчас!**

```bash
./start.sh
```

*GameIDE - делаем создание игр доступным каждому!* 🚀
