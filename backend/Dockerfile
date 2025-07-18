# Используем Node.js 20 как базовый образ
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости для компиляции нативных модулей
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    vips-dev

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для режима разработки)
RUN npm install

# Копируем исходный код
COPY . .

# Пропускаем компиляцию для режима разработки
# RUN npm run build

# Создаем пользователя без root привилегий
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Создаем необходимые директории и устанавливаем права
RUN mkdir -p /app/generated-games /app/data /app/temp /app/logs
RUN chown -R nextjs:nodejs /app

# Переключаемся на пользователя без root
USER nextjs

# Открываем порт
EXPOSE 3000

# Устанавливаем переменные окружения
ENV NODE_ENV=development
ENV DATABASE_PATH=/app/data/games.db

# Команда запуска
CMD ["npm", "run", "dev"] 