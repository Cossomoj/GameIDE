import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { GameDAO } from '@/database';
import { QueueService } from '@/services/queue';
import { LoggerService } from '@/services/logger';
import { GamePromptForm, GenerationRequest } from '@/types';
import config from '@/config';

const router = Router();
const gameDAO = new GameDAO();
const queueService = new QueueService();
const logger = new LoggerService();

// POST /api/games - Создание новой игры
router.post(
  '/',
  [
    body('title')
      .notEmpty()
      .withMessage('Название игры обязательно')
      .isLength({ min: 3, max: 100 })
      .withMessage('Название должно быть от 3 до 100 символов'),
    
    body('genre')
      .notEmpty()
      .withMessage('Жанр игры обязателен')
      .isIn(['platformer', 'arcade', 'puzzle', 'rpg', 'strategy', 'shooter', 'racing', 'adventure'])
      .withMessage('Неподдерживаемый жанр игры'),
    
    body('description')
      .notEmpty()
      .withMessage('Описание игры обязательно')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Описание должно быть от 10 до 1000 символов'),
    
    body('artStyle')
      .optional()
      .isIn(['pixel art', 'cartoon', 'realistic', 'minimalist', 'fantasy'])
      .withMessage('Неподдерживаемый стиль графики'),
    
    body('targetAudience')
      .optional()
      .isIn(['children', 'teens', 'adults', 'family'])
      .withMessage('Неподдерживаемая целевая аудитория'),
    
    body('monetization')
      .optional()
      .isArray()
      .withMessage('Монетизация должна быть массивом'),
    
    body('options.quality')
      .optional()
      .isIn(['fast', 'balanced', 'high'])
      .withMessage('Неподдерживаемое качество генерации'),
    
    body('options.optimization')
      .optional()
      .isIn(['size', 'performance'])
      .withMessage('Неподдерживаемый тип оптимизации'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = uuidv4();
    const prompt: GamePromptForm = req.body;
    const options = req.body.options || {};

    // Создаем запрос на генерацию
    const generationRequest: GenerationRequest = {
      id: gameId,
      prompt,
      options: {
        quality: options.quality || 'balanced',
        optimization: options.optimization || 'size',
        targetPlatform: 'yandex_games',
      },
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      currentStep: 'Ожидание обработки',
      logs: [],
    };

    // Сохраняем в базу данных
    await gameDAO.createGame({
      id: gameId,
      title: prompt.title,
      description: prompt.description,
      prompt: JSON.stringify(prompt),
      gameDesign: null,
      status: 'queued',
      progress: 0,
    });

    // Добавляем в очередь
    await queueService.addGameGenerationJob(generationRequest);

    logger.info(`🎮 Создана новая игра: ${gameId} - "${prompt.title}"`);

    res.status(201).json({
      success: true,
      game: {
        id: gameId,
        title: prompt.title,
        description: prompt.description,
        status: 'queued',
        progress: 0,
        createdAt: generationRequest.createdAt,
      },
      message: 'Игра добавлена в очередь генерации',
    });
  })
);

// GET /api/games - Получение списка игр
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Лимит должен быть от 1 до 100'),
    
    query('status')
      .optional()
      .isIn(['queued', 'processing', 'completed', 'failed', 'cancelled'])
      .withMessage('Неподдерживаемый статус'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as any;
    const offset = (page - 1) * limit;

    const { games, total } = await gameDAO.getGames(limit, offset, status);

    res.json({
      success: true,
      games: games.map(game => ({
        id: game.id,
        title: game.title,
        description: game.description,
        status: game.status,
        progress: game.progress,
        size: game.size,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        error: game.error,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /api/games/:id - Получение конкретной игры
router.get(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Неверный формат ID игры'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;
    
    try {
      const game = await gameDAO.getGameById(gameId);
      const logs = await gameDAO.getGameLogs(gameId);

      res.json({
        success: true,
        game: {
          id: game.id,
          title: game.title,
          description: game.description,
          prompt: JSON.parse(game.prompt),
          gameDesign: game.gameDesign ? JSON.parse(game.gameDesign) : null,
          status: game.status,
          progress: game.progress,
          size: game.size,
          filePath: game.filePath,
          error: game.error,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
          logs: logs.slice(-50), // Последние 50 логов
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Игра не найдена',
      });
    }
  })
);

// GET /api/games/:id/status - Получение статуса генерации
router.get(
  '/:id/status',
  [
    param('id')
      .isUUID()
      .withMessage('Неверный формат ID игры'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;
    
    try {
      const game = await gameDAO.getGameById(gameId);
      const queueStatus = await queueService.getJobStatus(gameId);

      res.json({
        success: true,
        status: {
          id: gameId,
          status: game.status,
          progress: game.progress,
          currentStep: queueStatus?.logs?.slice(-1)[0] || 'Ожидание обработки',
          estimatedTime: queueStatus ? Math.max(0, Date.now() - queueStatus.createdAt.getTime()) : null,
          logs: queueStatus?.logs || [],
          error: game.error,
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Игра не найдена',
      });
    }
  })
);

// GET /api/games/:id/download - Скачивание готовой игры
router.get(
  '/:id/download',
  [
    param('id')
      .isUUID()
      .withMessage('Неверный формат ID игры'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;
    
    try {
      const game = await gameDAO.getGameById(gameId);
      
      if (game.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Игра еще не готова для скачивания',
        });
      }
      
      if (!game.filePath) {
        return res.status(404).json({
          success: false,
          error: 'Файл игры не найден',
        });
      }

      // Проверяем существование файла
      try {
        await fs.access(game.filePath);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'Файл игры не найден на сервере',
        });
      }

      // Отправляем файл
      const fileName = `${game.title.replace(/[^a-zA-Z0-9а-яё\s]/gi, '')}_${gameId.slice(0, 8)}.zip`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/zip');
      
      res.download(game.filePath, fileName);
      
      logger.info(`📥 Скачивание игры: ${gameId} - "${game.title}"`);
      
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Игра не найдена',
      });
    }
  })
);

// DELETE /api/games/:id - Удаление игры
router.delete(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Неверный формат ID игры'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;
    
    try {
      const game = await gameDAO.getGameById(gameId);
      
      // Отменяем задание в очереди если оно еще выполняется
      if (game.status === 'queued' || game.status === 'processing') {
        await queueService.cancelJob(gameId);
      }
      
      // Удаляем файл игры если он существует
      if (game.filePath) {
        try {
          await fs.unlink(game.filePath);
        } catch (error) {
          logger.warn(`Не удалось удалить файл игры ${game.filePath}:`, error);
        }
      }
      
      // Удаляем из базы данных
      await gameDAO.deleteGame(gameId);
      
      logger.info(`🗑️ Удалена игра: ${gameId} - "${game.title}"`);
      
      res.json({
        success: true,
        message: 'Игра успешно удалена',
      });
      
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Игра не найдена',
      });
    }
  })
);

// POST /api/games/:id/cancel - Отмена генерации игры
router.post(
  '/:id/cancel',
  [
    param('id')
      .isUUID()
      .withMessage('Неверный формат ID игры'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;
    
    try {
      const game = await gameDAO.getGameById(gameId);
      
      if (game.status !== 'queued' && game.status !== 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Игру можно отменить только если она в очереди или обрабатывается',
        });
      }
      
      // Отменяем в очереди
      const cancelled = await queueService.cancelJob(gameId);
      
      if (cancelled) {
        // Обновляем статус в базе данных
        await gameDAO.updateGame(gameId, {
          status: 'cancelled',
          error: 'Генерация отменена пользователем',
        });
        
        logger.info(`❌ Отменена генерация игры: ${gameId} - "${game.title}"`);
        
        res.json({
          success: true,
          message: 'Генерация игры отменена',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Не удалось отменить генерацию игры',
        });
      }
      
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Игра не найдена',
      });
    }
  })
);

export default router; 