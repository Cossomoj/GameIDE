// Временная заглушка для базы данных без SQLite3
// TODO: Переключиться на PostgreSQL или исправить SQLite3

import { LoggerService } from '@/services/logger';
import { GameEntity, GenerationStatus } from '@/types';

const logger = new LoggerService();

// Простое in-memory хранилище для тестирования
const mockGames: GameEntity[] = [];
let gameIdCounter = 1;

export async function setupDatabase(): Promise<any> {
  try {
    logger.info('🗃️ База данных: временная заглушка (in-memory)');
    logger.warn('⚠️ SQLite3 отключен, используется mock storage');
    
    return {
      status: 'connected',
      type: 'mock',
      games: mockGames
    };
  } catch (error) {
    logger.error('❌ Ошибка настройки базы данных:', error);
    throw error;
  }
}

export async function createGame(gameData: Partial<GameEntity>): Promise<GameEntity> {
  const game: GameEntity = {
    id: (gameIdCounter++).toString(),
    title: gameData.title || 'Untitled Game',
    description: gameData.description || '',
    genre: gameData.genre || 'arcade',
    status: gameData.status || GenerationStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: gameData.config || {},
    progress: 0,
    ...gameData
  };
  
  mockGames.push(game);
  logger.info(`✅ Игра создана (mock): ${game.id} - ${game.title}`);
  
  return game;
}

export async function getGameById(id: string): Promise<GameEntity | null> {
  const game = mockGames.find(g => g.id === id);
  if (game) {
    logger.info(`📄 Игра найдена (mock): ${id}`);
  } else {
    logger.warn(`❌ Игра не найдена (mock): ${id}`);
  }
  return game || null;
}

export async function getAllGames(): Promise<GameEntity[]> {
  logger.info(`📋 Получение всех игр (mock): ${mockGames.length} игр`);
  return [...mockGames];
}

export async function updateGame(id: string, updates: Partial<GameEntity>): Promise<GameEntity | null> {
  const gameIndex = mockGames.findIndex(g => g.id === id);
  if (gameIndex === -1) {
    logger.warn(`❌ Игра для обновления не найдена (mock): ${id}`);
    return null;
  }
  
  mockGames[gameIndex] = {
    ...mockGames[gameIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  logger.info(`✅ Игра обновлена (mock): ${id}`);
  return mockGames[gameIndex];
}

export async function deleteGame(id: string): Promise<boolean> {
  const gameIndex = mockGames.findIndex(g => g.id === id);
  if (gameIndex === -1) {
    logger.warn(`❌ Игра для удаления не найдена (mock): ${id}`);
    return false;
  }
  
  mockGames.splice(gameIndex, 1);
  logger.info(`🗑️ Игра удалена (mock): ${id}`);
  return true;
}

export async function getGamesByStatus(status: GenerationStatus): Promise<GameEntity[]> {
  const games = mockGames.filter(g => g.status === status);
  logger.info(`🔍 Игры по статусу ${status} (mock): ${games.length} игр`);
  return games;
}

export async function updateGameProgress(id: string, progress: number): Promise<boolean> {
  const game = mockGames.find(g => g.id === id);
  if (!game) {
    logger.warn(`❌ Игра для обновления прогресса не найдена (mock): ${id}`);
    return false;
  }
  
  game.progress = progress;
  game.updatedAt = new Date().toISOString();
  
  logger.info(`📈 Прогресс игры обновлен (mock): ${id} -> ${progress}%`);
  return true;
}

// Экспорт типов и констант
export * from '@/types';

// Заглушка для GameDAO класса
export class GameDAO {
  async createGame(gameData: Omit<GameEntity, 'createdAt' | 'updatedAt'>): Promise<GameEntity> {
    return await createGame(gameData);
  }

  async getGameById(id: string): Promise<GameEntity> {
    const game = await getGameById(id);
    if (!game) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
    return game;
  }

  async updateGame(id: string, updates: Partial<GameEntity>): Promise<GameEntity> {
    const game = await updateGame(id, updates);
    if (!game) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
    return game;
  }

  async getGames(
    limit: number = 50,
    offset: number = 0,
    status?: GenerationStatus
  ): Promise<{ games: GameEntity[]; total: number }> {
    let games = await getAllGames();
    
    if (status) {
      games = games.filter(g => g.status === status);
    }

    const total = games.length;
    const paginatedGames = games.slice(offset, offset + limit);

    return { games: paginatedGames, total };
  }

  async deleteGame(id: string): Promise<void> {
    const success = await deleteGame(id);
    if (!success) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
  }

  async addLog(gameId: string, level: string, message: string, step?: string, metadata?: any): Promise<void> {
    logger.info(`📝 Лог игры ${gameId} [${level}]: ${message}`, { step, metadata });
  }

  async getGameLogs(gameId: string): Promise<any[]> {
    logger.info(`📋 Получение логов игры (mock): ${gameId}`);
    return [
      {
        id: 1,
        game_id: gameId,
        level: 'info',
        message: 'Игра создана (mock)',
        step: 'initialization',
        metadata: null,
        created_at: new Date()
      }
    ];
  }
}

// Заглушка для StatisticsDAO
export class StatisticsDAO {
  async updateDailyStats(): Promise<void> {
    logger.info('📊 Обновление статистики (mock)');
  }

  async getStatistics(days: number = 30): Promise<any[]> {
    logger.info(`📈 Получение статистики за ${days} дней (mock)`);
    return [
      {
        date: new Date().toISOString().split('T')[0],
        total_games: mockGames.length,
        successful_games: mockGames.filter(g => g.status === GenerationStatus.COMPLETED).length,
        failed_games: mockGames.filter(g => g.status === GenerationStatus.FAILED).length,
        total_size: 0
      }
    ];
  }

  async getOverallStats(): Promise<any> {
    logger.info('📊 Получение общей статистики (mock)');
    return {
      total_games: mockGames.length,
      successful_games: mockGames.filter(g => g.status === GenerationStatus.COMPLETED).length,
      failed_games: mockGames.filter(g => g.status === GenerationStatus.FAILED).length,
      processing_games: mockGames.filter(g => g.status === GenerationStatus.PROCESSING).length,
      queued_games: mockGames.filter(g => g.status === GenerationStatus.PENDING).length,
      avg_size: 0,
      total_size: 0
    };
  }
}

// Функция для закрытия соединения (заглушка)
export async function closeDatabase(): Promise<void> {
  logger.info('🔒 База данных закрыта (mock)');
} 