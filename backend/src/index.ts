import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import config, { validateConfig } from '@/config';
import { setupDatabase } from '@/database';
import { setupRoutes } from '@/routes';
import { setupWebSocket } from '@/services/websocket';
import { QueueService } from '@/services/queue';
import { LoggerService } from '@/services/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';

class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  private logger: LoggerService;
  private queueService: QueueService;

  constructor() {
    this.app = express();
    this.logger = new LoggerService();
    this.queueService = new QueueService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Безопасность
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: config.server.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Сжатие
    this.app.use(compression());

    // Rate Limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        error: 'Слишком много запросов, попробуйте позже',
        retryAfter: Math.ceil(config.security.rateLimitWindow / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    // Применяем rate limiting только к определенным API endpoints
    this.app.use('/api/games', limiter);
    this.app.use('/api/stats', limiter);
    this.app.use('/api/queue', limiter);

    // Парсинг JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Логирование запросов
    this.app.use(requestLogger);

    // Статические файлы
    this.app.use('/generated', express.static(config.generation.outputPath));
    this.app.use('/assets', express.static('./assets'));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.env,
      });
    });

    // API роуты
    setupRoutes(this.app);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Эндпоинт не найден',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Валидация конфигурации
      validateConfig();

      // Инициализация базы данных
      await setupDatabase();

      // Создание HTTP сервера
      this.server = createServer(this.app);

      // Инициализация WebSocket
      this.io = new SocketIOServer(this.server, {
        path: config.websocket.path,
        cors: config.websocket.cors,
      });

      setupWebSocket(this.io);

      // Инициализация сервиса очередей
      await this.queueService.initialize();

      // Запуск сервера
      this.server.listen(config.server.port, config.server.host, () => {
        this.logger.info(`🚀 Сервер запущен на http://${config.server.host}:${config.server.port}`);
        this.logger.info(`📊 WebSocket доступен по пути ${config.websocket.path}`);
        this.logger.info(`🔒 Rate limit: ${config.security.rateLimitMax} запросов в час`);
        this.logger.info(`📁 Сгенерированные игры: ${config.generation.outputPath}`);
        
        if (config.server.env === 'development') {
          this.logger.info(`🔧 Режим разработки активен`);
        }
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('❌ Ошибка запуска сервера:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`📥 Получен сигнал ${signal}, завершение работы...`);

        try {
          // Закрытие WebSocket соединений
          this.io.close();

          // Остановка очередей
          await this.queueService.close();

          // Закрытие HTTP сервера
          this.server.close(() => {
            this.logger.info('✅ Сервер успешно остановлен');
            process.exit(0);
          });

          // Принудительное завершение через 30 секунд
          setTimeout(() => {
            this.logger.error('⚠️ Принудительное завершение работы');
            process.exit(1);
          }, 30000);

        } catch (error) {
          this.logger.error('❌ Ошибка при завершении работы:', error);
          process.exit(1);
        }
      });
    });

    // Обработка необработанных исключений
    process.on('uncaughtException', (error) => {
      this.logger.error('💥 Необработанное исключение:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('💥 Необработанное отклонение промиса:', { reason, promise });
      process.exit(1);
    });
  }
}

// Запуск приложения
const app = new App();
app.start().catch((error) => {
  console.error('❌ Критическая ошибка запуска:', error);
  process.exit(1);
});

export default app; 