import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '@/services/logger';

const logger = new LoggerService();

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AIServiceError extends Error {
  statusCode = 502;
  isOperational = true;

  constructor(message: string, public service: string, public details?: any) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class GenerationError extends Error {
  statusCode = 500;
  isOperational = true;

  constructor(message: string, public step: string, public details?: any) {
    super(message);
    this.name = 'GenerationError';
  }
}

export class QuotaExceededError extends Error {
  statusCode = 429;
  isOperational = true;

  constructor(message: string, public service: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { statusCode = 500, message, stack } = error;

  // Логируем ошибку
  const errorInfo = {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    },
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', errorInfo);
  } else {
    logger.warn('Client Error:', errorInfo);
  }

  // Отправляем ответ клиенту
  const response: any = {
    error: true,
    message: statusCode >= 500 ? 'Внутренняя ошибка сервера' : message,
    timestamp: new Date().toISOString(),
    path: req.url,
  };

  // В режиме разработки включаем дополнительную информацию
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      name: error.name,
      stack,
      ...(error as any).details,
    };
  }

  // Специальная обработка для разных типов ошибок
  if (error instanceof ValidationError) {
    response.validation = error.details;
  } else if (error instanceof AIServiceError) {
    response.service = error.service;
    response.details = error.details;
  } else if (error instanceof GenerationError) {
    response.step = error.step;
    response.details = error.details;
  } else if (error instanceof QuotaExceededError) {
    response.service = error.service;
    response.retryAfter = 3600; // 1 час
  }

  res.status(statusCode).json(response);
};

// Middleware для обработки 404
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: true,
    message: 'Эндпоинт не найден',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// Wrapper для асинхронных обработчиков
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 