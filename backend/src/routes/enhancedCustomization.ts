import { Router, Request, Response } from 'express';
import { LoggerService } from '../services/logger';
import EnhancedCustomizationService from '../services/enhancedCustomization';

const router = Router();
const logger = new LoggerService();
const customizationService = new EnhancedCustomizationService();

/**
 * GET /api/customization/profiles/:userId
 * Получить доступные профили кастомизации для пользователя
 */
router.get('/profiles/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const profiles = customizationService.getAvailableProfiles(userId);
    
    res.json({
      success: true,
      profiles,
      count: profiles.length
    });
    
  } catch (error) {
    logger.error('Ошибка получения профилей кастомизации:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить профили кастомизации'
    });
  }
});

/**
 * GET /api/customization/profiles/:userId/recommended
 * Получить рекомендуемые профили на основе предпочтений пользователя
 */
router.get('/profiles/:userId/recommended', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userPreferences = req.query.preferences ? JSON.parse(req.query.preferences as string) : {};
    
    const recommendedProfiles = customizationService.getRecommendedProfiles(userId, userPreferences);
    
    res.json({
      success: true,
      profiles: recommendedProfiles,
      count: recommendedProfiles.length
    });
    
  } catch (error) {
    logger.error('Ошибка получения рекомендуемых профилей:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить рекомендуемые профили'
    });
  }
});

/**
 * POST /api/customization/profiles
 * Создать новый профиль кастомизации
 */
router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { userId, name, description, parameters } = req.body;
    
    if (!userId || !name || !parameters) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля: userId, name, parameters'
      });
    }
    
    const profile = await customizationService.createCustomizationProfile(
      userId,
      name,
      description || '',
      parameters
    );
    
    res.status(201).json({
      success: true,
      profile,
      message: 'Профиль кастомизации создан успешно'
    });
    
  } catch (error) {
    logger.error('Ошибка создания профиля кастомизации:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось создать профиль кастомизации'
    });
  }
});

/**
 * POST /api/customization/apply/:profileId
 * Применить профиль кастомизации к запросу генерации игры
 */
router.post('/apply/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { gameGenerationRequest } = req.body;
    
    if (!gameGenerationRequest) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствует запрос генерации игры'
      });
    }
    
    const customizedRequest = await customizationService.applyCustomizationProfile(
      gameGenerationRequest,
      profileId
    );
    
    res.json({
      success: true,
      customizedRequest,
      message: 'Профиль кастомизации применен успешно'
    });
    
  } catch (error) {
    logger.error('Ошибка применения профиля кастомизации:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Не удалось применить профиль кастомизации'
    });
  }
});

/**
 * GET /api/customization/parameters/templates
 * Получить шаблоны параметров кастомизации
 */
router.get('/parameters/templates', async (req: Request, res: Response) => {
  try {
    const templates = {
      complexity: ['simple', 'medium', 'complex', 'expert'],
      targetAudience: ['children', 'casual', 'core', 'hardcore'],
      sessionLength: ['quick', 'medium', 'long', 'endless'],
      colorScheme: ['vibrant', 'muted', 'monochrome', 'custom'],
      artStyle: ['pixel', 'cartoon', 'realistic', 'abstract', 'minimalist'],
      animationLevel: ['none', 'basic', 'rich', 'cinematic'],
      difficultyProgression: ['linear', 'exponential', 'adaptive', 'custom'],
      replayability: ['low', 'medium', 'high', 'infinite'],
      socialFeatures: ['none', 'leaderboards', 'multiplayer', 'full']
    };
    
    res.json({
      success: true,
      templates,
      descriptions: {
        complexity: {
          simple: 'Простая игра с базовой механикой',
          medium: 'Сбалансированная игра средней сложности',
          complex: 'Сложная игра с продвинутыми механиками',
          expert: 'Экспертная игра для опытных игроков'
        },
        targetAudience: {
          children: 'Игра для детей с безопасным контентом',
          casual: 'Казуальная игра для широкой аудитории',
          core: 'Игра для заядлых геймеров',
          hardcore: 'Игра для хардкорных игроков'
        },
        artStyle: {
          pixel: 'Пиксельная графика в ретро стиле',
          cartoon: 'Мультяшный стиль с яркими цветами',
          realistic: 'Реалистичная графика',
          abstract: 'Абстрактный художественный стиль',
          minimalist: 'Минималистичный дизайн'
        }
      }
    });
    
  } catch (error) {
    logger.error('Ошибка получения шаблонов параметров:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить шаблоны параметров'
    });
  }
});

export default router; 