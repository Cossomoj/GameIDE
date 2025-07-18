import axios, { AxiosResponse } from 'axios';
import {
  Game,
  CreateGameRequest,
  ApiResponse,
  PaginatedResponse,
  Statistics,
  HistoryStatistics,
  GenreStatistics,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

// Games API
export const gamesApi = {
  // Создание новой игры
  create: async (gameData: CreateGameRequest): Promise<Game> => {
    const response = await api.post<ApiResponse<{ game: Game }>>('/games', gameData);
    return response.data.data!.game;
  },

  // Получение списка игр
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Game>> => {
    const response = await api.get<PaginatedResponse<Game>>('/games', { params });
    return response.data;
  },

  // Получение конкретной игры
  getById: async (id: string): Promise<Game> => {
    const response = await api.get<ApiResponse<{ game: Game }>>(`/games/${id}`);
    return response.data.data!.game;
  },

  // Получение статуса генерации
  getStatus: async (id: string): Promise<any> => {
    const response = await api.get<ApiResponse<{ status: any }>>(`/games/${id}/status`);
    return response.data.data!.status;
  },

  // Скачивание игры
  download: async (id: string): Promise<Blob> => {
    const response = await api.get(`/games/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Удаление игры
  delete: async (id: string): Promise<void> => {
    await api.delete(`/games/${id}`);
  },

  // Отмена генерации
  cancel: async (id: string): Promise<void> => {
    await api.post(`/games/${id}/cancel`);
  },
};

// Statistics API
export const statsApi = {
  // Общая статистика
  getOverall: async (): Promise<Statistics> => {
    const response = await api.get<ApiResponse<{ stats: Statistics }>>('/stats');
    return response.data.data!.stats;
  },

  // Статистика за период
  getHistory: async (days: number = 30): Promise<HistoryStatistics[]> => {
    const response = await api.get<ApiResponse<{ statistics: HistoryStatistics[] }>>(
      `/stats/history?days=${days}`
    );
    return response.data.data!.statistics;
  },

  // Статистика по жанрам
  getGenres: async (): Promise<GenreStatistics[]> => {
    const response = await api.get<ApiResponse<{ genres: GenreStatistics[] }>>('/stats/genres');
    return response.data.data!.genres;
  },

  // Статистика производительности
  getPerformance: async (): Promise<any> => {
    const response = await api.get<ApiResponse<{ performance: any }>>('/stats/performance');
    return response.data.data!.performance;
  },
};

// Queue API
export const queueApi = {
  // Статистика очереди
  getStats: async (): Promise<any> => {
    const response = await api.get<ApiResponse<{ queue: any }>>('/queue/stats');
    return response.data.data!.queue;
  },

  // Приостановка очереди
  pause: async (): Promise<void> => {
    await api.post('/queue/pause');
  },

  // Возобновление очереди
  resume: async (): Promise<void> => {
    await api.post('/queue/resume');
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api; 