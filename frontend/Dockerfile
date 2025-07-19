# Development Dockerfile for Frontend
FROM node:18-alpine

# Установка curl для health checks
RUN apk add --no-cache curl

# Рабочая директория
WORKDIR /app

# Копирование package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Установка зависимостей
RUN npm install && npm cache clean --force

# Копирование исходного кода
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Создание пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactuser -u 1001 -G nodejs

# Установка прав доступа
RUN chown -R reactuser:nodejs /app

# Переключение на непривилегированного пользователя
USER reactuser

# Порт приложения
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Команда запуска в development режиме
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 