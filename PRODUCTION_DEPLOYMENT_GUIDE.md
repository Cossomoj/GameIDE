# GameIDE Production Deployment Guide

## 🚀 Обзор

Данное руководство описывает полное развертывание GameIDE в production окружении с использованием Docker, Kubernetes, мониторинга и CI/CD.

## 📋 Содержание

- [Предварительные требования](#предварительные-требования)
- [Архитектура системы](#архитектура-системы)
- [Развертывание с Docker Compose](#развертывание-с-docker-compose)
- [Развертывание в Kubernetes](#развертывание-в-kubernetes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Мониторинг и логирование](#мониторинг-и-логирование)
- [Безопасность](#безопасность)
- [Масштабирование](#масштабирование)
- [Резервное копирование](#резервное-копирование)
- [Устранение неполадок](#устранение-неполадок)

## 🔧 Предварительные требования

### Системные требования

**Минимальные требования:**
- CPU: 4 ядра
- RAM: 8 GB
- Диск: 50 GB SSD
- Сеть: 100 Mbps

**Рекомендуемые требования:**
- CPU: 8 ядер
- RAM: 16 GB
- Диск: 200 GB NVMe SSD
- Сеть: 1 Gbps

### Программное обеспечение

- Docker 24.0+
- Docker Compose 2.20+
- Kubernetes 1.28+ (для k8s деплоя)
- kubectl
- Node.js 18+ (для разработки)
- Git

### Сетевые требования

- Порты 80, 443 (HTTP/HTTPS)
- Порт 22 (SSH)
- Доступ к Docker Registry
- Доступ к внешним API (OpenAI, DeepSeek, Claude)

## 🏗️ Архитектура системы

### Компоненты

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│     Nginx       │────│   Frontend      │
│   (Cloudflare)  │    │   (Reverse      │    │   (React)       │
└─────────────────┘    │    Proxy)       │    └─────────────────┘
                       └─────────────────┘
                               │
                       ┌─────────────────┐
                       │   Backend API   │
                       │   (Node.js)     │
                       └─────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────────────┐ ┌──────────┐ ┌─────────────┐
        │  PostgreSQL   │ │  Redis   │ │  MongoDB    │
        │  (Main DB)    │ │ (Cache)  │ │ (Analytics) │
        └───────────────┘ └──────────┘ └─────────────┘
```

### Мониторинг стек

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │────│    Grafana      │    │   Alertmanager  │
│   (Metrics)     │    │  (Dashboard)    │    │  (Alerts)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Node Exporter │    │    cAdvisor     │    │   Blackbox      │
│   (Host)        │    │  (Containers)   │    │   (Endpoints)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🐳 Развертывание с Docker Compose

### 1. Подготовка окружения

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/GameIDE.git
cd GameIDE

# Создаем production конфигурацию
cp .env.prod.example .env.prod
```

### 2. Настройка переменных окружения

Отредактируйте `.env.prod`:

```bash
# Основные настройки
DOMAIN_NAME=your-domain.com
API_URL=https://your-domain.com
WS_URL=wss://your-domain.com

# База данных
POSTGRES_DB=gameide_prod
POSTGRES_USER=gameide_user
POSTGRES_PASSWORD=your_secure_password

# JWT секрет (сгенерируйте сложный ключ)
JWT_SECRET=your_super_secure_jwt_secret

# API ключи
OPENAI_API_KEY=sk-your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
CLAUDE_API_KEY=your_claude_key

# Мониторинг
SENTRY_DSN=https://your_sentry_dsn
GRAFANA_ADMIN_PASSWORD=your_grafana_password
```

### 3. Настройка SSL сертификатов

```bash
# Создаем директорию для SSL
mkdir -p nginx/ssl

# Копируем сертификаты
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Или используем Let's Encrypt
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

### 4. Запуск системы

```bash
# Даем права на выполнение
chmod +x scripts/deploy.sh

# Запускаем полное развертывание
./scripts/deploy.sh deploy

# Или поэтапно:
./scripts/deploy.sh backup    # Создать резервную копию
./scripts/deploy.sh deploy    # Развернуть
./scripts/deploy.sh status    # Проверить статус
```

### 5. Проверка развертывания

```bash
# Проверяем статус сервисов
docker-compose -f docker-compose.prod.yml ps

# Проверяем логи
docker-compose -f docker-compose.prod.yml logs -f

# Проверяем API
curl https://your-domain.com/api/health

# Проверяем frontend
curl https://your-domain.com/
```

## ☸️ Развертывание в Kubernetes

### 1. Подготовка кластера

```bash
# Создаем namespace
kubectl apply -f k8s/namespace.yaml

# Создаем секреты
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_DB=gameide_prod \
  --from-literal=POSTGRES_USER=gameide_user \
  --from-literal=POSTGRES_PASSWORD=your_password \
  -n gameide-prod

kubectl create secret generic backend-secret \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=OPENAI_API_KEY=your_openai_key \
  --from-literal=DEEPSEEK_API_KEY=your_deepseek_key \
  -n gameide-prod
```

### 2. Развертывание компонентов

```bash
# Развертываем PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Ждем готовности PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n gameide-prod --timeout=300s

# Развертываем Redis
kubectl apply -f k8s/redis.yaml

# Развертываем MongoDB
kubectl apply -f k8s/mongodb.yaml

# Развертываем Backend
kubectl apply -f k8s/backend.yaml

# Развертываем Frontend
kubectl apply -f k8s/frontend.yaml

# Развертываем Ingress
kubectl apply -f k8s/ingress.yaml
```

### 3. Мониторинг развертывания

```bash
# Проверяем статус подов
kubectl get pods -n gameide-prod -w

# Проверяем сервисы
kubectl get services -n gameide-prod

# Проверяем ingress
kubectl get ingress -n gameide-prod

# Проверяем логи
kubectl logs -f deployment/backend -n gameide-prod
```

## 🔄 CI/CD Pipeline

### 1. Настройка GitHub Actions

В вашем репозитории настройте следующие секреты:

```
PROD_KUBECONFIG          # Base64 encoded kubeconfig
STAGING_KUBECONFIG       # Base64 encoded kubeconfig
PROD_API_URL            # https://your-domain.com
PROD_WS_URL             # wss://your-domain.com
SNYK_TOKEN              # Snyk security scanning
SLACK_WEBHOOK_URL       # Slack notifications
GRAFANA_API_KEY         # Grafana API key
```

### 2. Структура pipeline

Pipeline включает следующие этапы:

1. **Test** - Юнит тесты, интеграционные тесты
2. **Security** - Сканирование безопасности
3. **Build** - Сборка Docker образов
4. **Deploy Staging** - Развертывание в staging
5. **E2E Tests** - End-to-end тестирование
6. **Deploy Production** - Развертывание в production
7. **Notify** - Уведомления
8. **Cleanup** - Очистка ресурсов

### 3. Запуск развертывания

```bash
# Автоматический деплой при push в main
git push origin main

# Ручной деплой через GitHub Actions
# Workflow Dispatch -> Deploy to Production

# Деплой с тегом (release)
git tag v1.0.0
git push origin v1.0.0
```

## 📊 Мониторинг и логирование

### Grafana Dashboards

Доступные дашборды:

- **Application Overview** - Общий обзор приложения
- **API Performance** - Производительность API
- **Database Monitoring** - Мониторинг баз данных
- **Infrastructure** - Мониторинг инфраструктуры
- **Business Metrics** - Бизнес метрики

URL: `https://monitoring.your-domain.com`
Логин: `admin`
Пароль: `значение из GRAFANA_ADMIN_PASSWORD`

### Prometheus Metrics

Основные метрики:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Game generation rate
rate(gameide_games_generated_total[5m])

# Database connections
gameide_db_connections_active / gameide_db_connections_max
```

### Alerting Rules

Настроены алерты для:

- Высокая нагрузка CPU (>80%)
- Высокое использование памяти (>85%)
- Высокий error rate (>5%)
- Медленные запросы (p99 > 5s)
- Недоступность сервисов
- Заполнение диска (>90%)

### Логирование

Логи собираются через ELK Stack:

- **Elasticsearch** - Хранение логов
- **Logstash** - Обработка логов
- **Kibana** - Визуализация логов

URL: `https://logs.your-domain.com`

## 🔒 Безопасность

### Сетевая безопасность

- Все соединения используют HTTPS/TLS
- Network Policies ограничивают трафик между подами
- Firewall правила ограничивают входящие соединения
- DDoS защита через Cloudflare

### Безопасность приложения

- JWT токены с коротким временем жизни
- Rate limiting для API
- Валидация всех входных данных
- SQL injection защита
- XSS защита через Content Security Policy
- CSRF защита

### Безопасность контейнеров

- Non-root пользователи в контейнерах
- Read-only файловые системы где возможно
- Минимальные базовые образы (Alpine)
- Регулярное сканирование уязвимостей

### Секреты и конфигурация

- Все секреты хранятся в Kubernetes Secrets
- Переменные окружения не содержат чувствительные данные
- Используется внешний Secret Manager (по желанию)

## ⚡ Масштабирование

### Горизонтальное масштабирование

Backend автоматически масштабируется на основе:

- CPU утилизации (target: 70%)
- Memory утилизации (target: 80%)
- Количества запросов

```yaml
# HPA конфигурация
minReplicas: 3
maxReplicas: 10
```

### Вертикальное масштабирование

Для увеличения ресурсов подов:

```bash
# Увеличиваем CPU/Memory лимиты
kubectl patch deployment backend -n gameide-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"cpu":"1000m","memory":"2Gi"}}}]}}}}'
```

### Масштабирование базы данных

- **PostgreSQL** - Настройте read replicas
- **Redis** - Используйте Redis Cluster
- **MongoDB** - Настройте sharding

### CDN и кеширование

- Используйте Cloudflare для статических ресурсов
- Настройте Redis для кеширования API ответов
- Используйте nginx для кеширования на edge

## 💾 Резервное копирование

### Автоматическое резервное копирование

Система автоматически создает резервные копии:

- **PostgreSQL** - ежедневно в 2:00 AM
- **MongoDB** - ежедневно в 3:00 AM
- **Redis** - ежедневно в 4:00 AM
- **Файлы** - еженедельно в воскресенье

### Ручное резервное копирование

```bash
# Создать резервную копию всех данных
./scripts/deploy.sh backup

# Создать резервную копию только PostgreSQL
kubectl exec -n gameide-prod statefulset/postgres -- pg_dump -U gameide_user gameide_prod > backup-$(date +%Y%m%d).sql

# Создать резервную копию MongoDB
kubectl exec -n gameide-prod statefulset/mongodb -- mongodump --db gameide_prod --archive > mongodb-backup-$(date +%Y%m%d).archive
```

### Восстановление из резервной копии

```bash
# Полное восстановление системы
./scripts/deploy.sh rollback

# Восстановление PostgreSQL
kubectl exec -i -n gameide-prod statefulset/postgres -- psql -U gameide_user -d gameide_prod < backup.sql

# Восстановление MongoDB
kubectl exec -i -n gameide-prod statefulset/mongodb -- mongorestore --db gameide_prod --archive < mongodb-backup.archive
```

## 🔧 Устранение неполадок

### Общие проблемы

#### Сервис не запускается

```bash
# Проверяем статус
kubectl get pods -n gameide-prod

# Проверяем события
kubectl get events -n gameide-prod --sort-by='.lastTimestamp'

# Проверяем логи
kubectl logs -f deployment/backend -n gameide-prod
```

#### Высокое использование памяти

```bash
# Проверяем использование ресурсов
kubectl top pods -n gameide-prod

# Увеличиваем лимиты памяти
kubectl patch deployment backend -n gameide-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

#### Проблемы с базой данных

```bash
# Проверяем подключение к PostgreSQL
kubectl exec -it -n gameide-prod statefulset/postgres -- psql -U gameide_user -d gameide_prod -c "SELECT 1;"

# Проверяем Redis
kubectl exec -it -n gameide-prod statefulset/redis -- redis-cli ping

# Проверяем MongoDB
kubectl exec -it -n gameide-prod statefulset/mongodb -- mongosh --eval "db.adminCommand('ping')"
```

### Мониторинг и алерты

#### Prometheus недоступен

```bash
# Перезапускаем Prometheus
kubectl rollout restart deployment/prometheus -n gameide-prod

# Проверяем конфигурацию
kubectl exec -it -n gameide-prod deployment/prometheus -- /bin/promtool check config /etc/prometheus/prometheus.yml
```

#### Grafana не показывает данные

```bash
# Проверяем подключение к Prometheus
kubectl port-forward -n gameide-prod service/grafana 3000:3000

# Открываем http://localhost:3000
# Data Sources -> Prometheus -> Test
```

### Производительность

#### Медленные запросы API

```bash
# Проверяем метрики производительности
kubectl port-forward -n gameide-prod service/prometheus 9090:9090

# Открываем http://localhost:9090
# Запрос: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

#### Высокая нагрузка на базу данных

```bash
# Проверяем активные соединения PostgreSQL
kubectl exec -it -n gameide-prod statefulset/postgres -- psql -U gameide_user -d gameide_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Проверяем медленные запросы
kubectl exec -it -n gameide-prod statefulset/postgres -- psql -U gameide_user -d gameide_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## 📞 Поддержка

### Контакты

- **Email**: support@gameide.com
- **Slack**: #gameide-support
- **Discord**: GameIDE Community

### Полезные ссылки

- [Документация API](https://docs.gameide.com/api)
- [Руководство пользователя](https://docs.gameide.com/user-guide)
- [FAQ](https://docs.gameide.com/faq)
- [GitHub Issues](https://github.com/yourusername/GameIDE/issues)

---

**Успешного развертывания! 🚀**

*Данное руководство регулярно обновляется. Последняя версия всегда доступна в репозитории.* 