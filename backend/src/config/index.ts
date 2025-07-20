import dotenv from 'dotenv';
import { AIConfig, GenerationConfig } from '@/types';

// Загружаем переменные окружения
dotenv.config();

export const config = {
  // Серверные настройки
  server: {
    port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // База данных
  database: {
    path: process.env.DATABASE_PATH || './data/games.db',
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'aigames',
      password: process.env.POSTGRES_PASSWORD || 'aigames_password',
      database: process.env.POSTGRES_DB || 'aigames',
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // AI конфигурация
  ai: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-coder',
      maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
      baseURL: 'https://api.deepseek.com/v1',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
      maxImages: parseInt(process.env.OPENAI_MAX_IMAGES || '10', 10),
      baseURL: 'https://api.openai.com/v1',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
      baseURL: 'https://api.anthropic.com',
    },
  } as AIConfig,

  // Настройки генерации
  generation: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '3', 10),
    timeout: parseInt(process.env.GENERATION_TIMEOUT || '300000', 10), // 5 минут
    retries: parseInt(process.env.GENERATION_RETRIES || '2', 10),
    targetSize: parseInt(process.env.TARGET_GAME_SIZE || '10485760', 10), // 10MB
    tempPath: process.env.TEMP_PATH || './temp',
    outputPath: process.env.GAMES_PATH || './generated-games',
  } as GenerationConfig,

  // Безопасность
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000', 10), // 1 час
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
    jwtSecret: process.env.JWT_SECRET || 'ai-game-generator-secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // Хранилище
  storage: {
    maxStorageDays: parseInt(process.env.MAX_STORAGE_DAYS || '30', 10),
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '86400000', 10), // 24 часа
  },

  // Yandex Games требования
  yandexGames: {
    maxSize: 20 * 1024 * 1024, // 20MB
    targetSize: 10 * 1024 * 1024, // 10MB
    requiredSDKVersion: '2.0.0',
    supportedFormats: ['png', 'jpg', 'webp', 'ogg', 'mp3', 'wav'],
    requiredFiles: ['index.html', 'manifest.json'],
  },

  // Настройки сжатия и оптимизации
  optimization: {
    imageCompression: parseFloat(process.env.IMAGE_COMPRESSION || '0.8'),
    codeMinification: process.env.CODE_MINIFICATION === 'true',
    assetOptimization: process.env.ASSET_OPTIMIZATION === 'true',
  },

  // WebSocket
  websocket: {
    path: '/ws',
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  },
};

// Валидация обязательных переменных
export function validateConfig(): void {
  const required = [
    'DEEPSEEK_API_KEY',
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Отсутствуют переменные окружения: ${missing.join(', ')}`);
    console.log('💡 Вы можете настроить их через веб-интерфейс в разделе AI Settings');
  } else {
    console.log('✅ Все AI сервисы настроены');
  }
}

export default config; 