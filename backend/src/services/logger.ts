import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Создаем директорию для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
          
          if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
          }
          
          return log;
        })
      ),
      transports: [
        // Консольный вывод
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // Файл для всех логов
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Файл только для ошибок
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
          tailable: true
        })
      ],
      
      // Обработка необработанных исключений
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'exceptions.log')
        })
      ],
      
      // Обработка необработанных отклонений промисов
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'rejections.log')
        })
      ]
    });

    // В продакшене не выводим в консоль
    if (process.env.NODE_ENV === 'production') {
      this.logger.remove(this.logger.transports[0]);
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Специальные методы для логирования процесса генерации
  generationStart(gameId: string, prompt: any): void {
    this.info(`🎮 Начата генерация игры ${gameId}`, { gameId, prompt });
  }

  generationStep(gameId: string, step: string, progress: number): void {
    this.info(`🔄 Генерация ${gameId}: ${step} (${progress}%)`, { gameId, step, progress });
  }

  generationComplete(gameId: string, duration: number, size: number): void {
    this.info(`🎉 Генерация ${gameId} завершена`, { 
      gameId, 
      duration: `${duration}ms`, 
      size: `${(size / 1024 / 1024).toFixed(2)}MB` 
    });
  }

  generationError(gameId: string, step: string, error: any): void {
    this.error(`💥 Ошибка генерации ${gameId} на этапе ${step}`, { gameId, step, error });
  }

  // Логирование AI запросов
  aiRequest(service: string, model: string, tokens: number): void {
    this.info(`🤖 AI запрос: ${service}/${model}`, { service, model, tokens });
  }

  aiResponse(service: string, model: string, tokens: number, duration: number): void {
    this.info(`✨ AI ответ: ${service}/${model}`, { service, model, tokens, duration: `${duration}ms` });
  }

  aiError(service: string, error: any): void {
    this.error(`🚫 Ошибка AI сервиса: ${service}`, { service, error });
  }

  // Логирование операций с файлами
  fileOperation(operation: string, path: string, size?: number): void {
    this.info(`📁 ${operation}: ${path}`, { operation, path, size });
  }

  // Метрики производительности
  performance(operation: string, duration: number, metadata?: any): void {
    this.info(`⚡ ${operation} выполнено за ${duration}ms`, { operation, duration, ...metadata });
  }

  // Безопасность
  securityEvent(event: string, ip: string, details?: any): void {
    this.warn(`🔒 Событие безопасности: ${event}`, { event, ip, ...details });
  }

  // Системные события
  systemEvent(event: string, details?: any): void {
    this.info(`🖥️ Системное событие: ${event}`, { event, ...details });
  }
} 