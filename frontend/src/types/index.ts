// Game Types
export interface GamePrompt {
  title: string;
  genre: string;
  description: string;
  artStyle?: string;
  targetAudience?: string;
  monetization?: string[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  prompt?: GamePrompt;
  gameDesign?: any;
  logs?: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  step?: string;
  metadata?: any;
}

export interface GenerationOptions {
  quality: 'fast' | 'balanced' | 'high';
  optimization: 'size' | 'performance';
}

export interface CreateGameRequest {
  title: string;
  genre: string;
  description: string;
  artStyle?: string;
  targetAudience?: string;
  monetization?: string[];
  options?: GenerationOptions;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  games: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Statistics Types
export interface Statistics {
  games: {
    total: number;
    successful: number;
    failed: number;
    processing: number;
    queued: number;
    successRate: number;
  };
  size: {
    total: number;
    average: number;
    formatted: {
      total: string;
      average: string;
    };
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
  ai: {
    deepseek: {
      requests: number;
      resetTime: Date;
    };
    openai: {
      requests: number;
      resetTime: Date;
    };
  };
  system: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      formatted: {
        used: string;
        total: string;
      };
    };
  };
}

export interface HistoryStatistics {
  date: string;
  totalGames: number;
  successfulGames: number;
  failedGames: number;
  totalSize: number;
  formattedSize: string;
  successRate: number;
}

export interface GenreStatistics {
  genre: string;
  count: number;
  percentage: number;
}

// WebSocket Types
export interface WSMessage {
  type: 'progress' | 'log' | 'preview' | 'error' | 'completed';
  gameId: string;
  data: any;
}

export interface ProgressData {
  progress: number;
  step: string;
  logs?: string[];
  timestamp: number;
}

export interface LogData {
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
  timestamp: number;
}

export interface ErrorData {
  error: string;
  step?: string;
  timestamp: number;
}

export interface CompletedData {
  result: any;
  timestamp: number;
}

// Form Types
export interface GameFormData {
  title: string;
  genre: string;
  description: string;
  artStyle: string;
  targetAudience: string;
  monetization: string[];
  quality: 'fast' | 'balanced' | 'high';
  optimization: 'size' | 'performance';
}

// Constants
export const GENRES = [
  { value: 'platformer', label: 'Платформер' },
  { value: 'arcade', label: 'Аркада' },
  { value: 'puzzle', label: 'Головоломка' },
  { value: 'rpg', label: 'RPG' },
  { value: 'strategy', label: 'Стратегия' },
  { value: 'shooter', label: 'Шутер' },
  { value: 'racing', label: 'Гонки' },
  { value: 'adventure', label: 'Приключения' },
] as const;

export const ART_STYLES = [
  { value: 'pixel art', label: 'Пиксельная графика' },
  { value: 'cartoon', label: 'Мультяшный' },
  { value: 'realistic', label: 'Реалистичный' },
  { value: 'minimalist', label: 'Минималистичный' },
  { value: 'fantasy', label: 'Фэнтези' },
] as const;

export const TARGET_AUDIENCES = [
  { value: 'children', label: 'Дети' },
  { value: 'teens', label: 'Подростки' },
  { value: 'adults', label: 'Взрослые' },
  { value: 'family', label: 'Семейная' },
] as const;

export const MONETIZATION_TYPES = [
  { value: 'rewarded_ads', label: 'Награды за рекламу' },
  { value: 'interstitial_ads', label: 'Межстраничная реклама' },
  { value: 'banner_ads', label: 'Баннерная реклама' },
  { value: 'purchases', label: 'Внутриигровые покупки' },
] as const;

export const QUALITY_LEVELS = [
  { value: 'fast', label: 'Быстро (~3 мин)', description: 'Простая игра, базовые механики' },
  { value: 'balanced', label: 'Сбалансированно (~10 мин)', description: 'Хорошее качество и время' },
  { value: 'high', label: 'Высокое качество (~30 мин)', description: 'Детализированная игра' },
] as const;

export const OPTIMIZATION_TYPES = [
  { value: 'size', label: 'Размер файла', description: 'Оптимизация для минимального размера' },
  { value: 'performance', label: 'Производительность', description: 'Оптимизация для скорости работы' },
] as const; 