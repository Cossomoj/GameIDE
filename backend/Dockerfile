# Development Dockerfile for Backend
FROM node:18-alpine

# Установка curl для health checks
RUN apk add --no-cache curl

# Создание пользователя app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Рабочая директория
WORKDIR /app

# Копирование package files
COPY package*.json ./
COPY tsconfig.json ./

# Установка зависимостей (включая dev зависимости для ts-node)
RUN npm install && npm cache clean --force

# Установка ts-node глобально
RUN npm install -g ts-node nodemon

# Копирование исходного кода
COPY src/ ./src/
COPY templates/ ./templates/

# Создание необходимых директорий
RUN mkdir -p \
    games-output \
    logs \
    temp \
    uploads

# Установка прав доступа
RUN chown -R nodeuser:nodejs /app

# Переключение на непривилегированного пользователя
USER nodeuser

# Порт приложения
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Временно запускаем простой сервер для тестирования
CMD ["ts-node", "src/simple-server.ts"] 