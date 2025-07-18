import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '@/services/logger';

const logger = new LoggerService();

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Логируем начало запроса
  logger.info(`📥 ${method} ${url}`, {
    ip,
    userAgent,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
  });

  // Перехватываем завершение ответа
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const { statusCode } = res;

    // Определяем уровень логирования по статус коду
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    let emoji = '✅';

    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn';
      emoji = '⚠️';
    } else if (statusCode >= 500) {
      logLevel = 'error';
      emoji = '❌';
    }

    // Логируем завершение запроса
    logger[logLevel](`📤 ${emoji} ${method} ${url} ${statusCode}`, {
      ip,
      userAgent,
      duration: `${duration}ms`,
      statusCode,
      contentLength: res.get('Content-Length'),
      responseSize: Buffer.byteLength(body || '', 'utf8'),
    });

    return originalSend.call(this, body);
  };

  next();
}; 