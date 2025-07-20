import express from 'express';
import path from 'path';
import { YandexGamesValidator, ValidationResult } from '../services/gameValidation';
import { LoggerService } from '../services/logger';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const validator = new YandexGamesValidator();
const logger = new LoggerService();

/**
 * POST /api/validation/full
 * Полная валидация игры
 */
router.post('/full', 
  rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 запросов за 15 минут
  validateRequest({
    body: {
      gameId: { type: 'string', required: true },
      gamePath: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { gameId, gamePath } = req.body;
      
      logger.info(`🔍 Запуск полной валидации игры: ${gameId}`);
      const startTime = Date.now();

      // Проверяем существование пути к игре
      const resolvedPath = path.resolve(gamePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(400).json({
          success: false,
          error: 'Небезопасный путь к игре'
        });
      }

      // Выполняем валидацию
      const result: ValidationResult = await validator.validateGame(resolvedPath);
      
      // Генерируем отчет
      const report = validator.generateValidationReport(result);
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Валидация завершена за ${duration}ms. Результат: ${result.isValid ? 'PASSED' : 'FAILED'}`);

      res.json({
        success: true,
        data: {
          gameId,
          validation: result,
          report,
          timestamp: new Date().toISOString(),
          duration
        }
      });

    } catch (error) {
      logger.error('Ошибка полной валидации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка валидации игры',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * POST /api/validation/quick
 * Быстрая проверка основных требований
 */
router.post('/quick',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 30 }), // 30 запросов за 5 минут
  validateRequest({
    body: {
      gameId: { type: 'string', required: true },
      gamePath: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { gameId, gamePath } = req.body;
      
      logger.info(`⚡ Быстрая проверка игры: ${gameId}`);
      const startTime = Date.now();

      const resolvedPath = path.resolve(gamePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(400).json({
          success: false,
          error: 'Небезопасный путь к игре'
        });
      }

      const isValid = await validator.quickValidation(resolvedPath);
      const duration = Date.now() - startTime;

      logger.info(`⚡ Быстрая проверка завершена за ${duration}ms. Результат: ${isValid ? 'PASSED' : 'FAILED'}`);

      res.json({
        success: true,
        data: {
          gameId,
          isValid,
          timestamp: new Date().toISOString(),
          duration
        }
      });

    } catch (error) {
      logger.error('Ошибка быстрой проверки:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка быстрой проверки',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * POST /api/validation/structure
 * Проверка только структуры файлов
 */
router.post('/structure',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 50 }),
  validateRequest({
    body: {
      gameId: { type: 'string', required: true },
      gamePath: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { gameId, gamePath } = req.body;
      
      const resolvedPath = path.resolve(gamePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(400).json({
          success: false,
          error: 'Небезопасный путь к игре'
        });
      }

      // Проверяем только структуру
      const result = await validator.validateGame(resolvedPath);
      
      res.json({
        success: true,
        data: {
          gameId,
          structure: result.structure,
          size: result.size,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Ошибка проверки структуры:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки структуры',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * POST /api/validation/sdk
 * Проверка только интеграции Yandex SDK
 */
router.post('/sdk',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 50 }),
  validateRequest({
    body: {
      gameId: { type: 'string', required: true },
      gamePath: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { gameId, gamePath } = req.body;
      
      const resolvedPath = path.resolve(gamePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(400).json({
          success: false,
          error: 'Небезопасный путь к игре'
        });
      }

      const result = await validator.validateGame(resolvedPath);
      
      res.json({
        success: true,
        data: {
          gameId,
          sdk: result.sdk,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Ошибка проверки SDK:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки SDK',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * POST /api/validation/performance
 * Проверка производительности
 */
router.post('/performance',
  rateLimitMiddleware({ windowMs: 10 * 60 * 1000, max: 20 }),
  validateRequest({
    body: {
      gameId: { type: 'string', required: true },
      gamePath: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { gameId, gamePath } = req.body;
      
      const resolvedPath = path.resolve(gamePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(400).json({
          success: false,
          error: 'Небезопасный путь к игре'
        });
      }

      const result = await validator.validateGame(resolvedPath);
      
      res.json({
        success: true,
        data: {
          gameId,
          performance: result.performance,
          size: result.size,
          warnings: result.warnings.filter(w => w.category === 'performance'),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Ошибка проверки производительности:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки производительности',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * GET /api/validation/requirements
 * Получение списка требований для Yandex Games
 */
router.get('/requirements', (req, res) => {
  const requirements = {
    critical: [
      {
        id: 'index_html',
        name: 'Обязательный index.html',
        description: 'Файл index.html должен находиться в корне игры',
        category: 'structure'
      },
      {
        id: 'size_limit',
        name: 'Лимит размера',
        description: 'Размер игры не должен превышать 100MB',
        category: 'size'
      },
      {
        id: 'sdk_v2',
        name: 'Yandex Games SDK v2',
        description: 'Должен быть подключен официальный SDK версии 2.0+',
        category: 'sdk'
      },
      {
        id: 'sdk_init',
        name: 'Правильная инициализация',
        description: 'SDK должен быть правильно инициализирован с YaGames.init()',
        category: 'sdk'
      },
      {
        id: 'language_detection',
        name: 'Определение языка',
        description: 'Игра должна использовать ysdk.environment.i18n.lang',
        category: 'sdk'
      },
      {
        id: 'lifecycle_handling',
        name: 'Жизненный цикл',
        description: 'Правильная обработка событий жизненного цикла игры',
        category: 'sdk'
      }
    ],
    recommended: [
      {
        id: 'interstitial_ads',
        name: 'Полноэкранная реклама',
        description: 'Интеграция с interstitial рекламой (обязательный формат)',
        category: 'ads'
      },
      {
        id: 'rewarded_ads',
        name: 'Реклама с вознаграждением',
        description: 'Интеграция с rewarded video рекламой',
        category: 'ads'
      },
      {
        id: 'sticky_banner',
        name: 'Sticky баннер',
        description: 'Показ sticky баннера для максимальной доходности',
        category: 'ads'
      },
      {
        id: 'leaderboards',
        name: 'Лидерборды',
        description: 'Интеграция с ysdk.getLeaderboards()',
        category: 'social'
      },
      {
        id: 'achievements',
        name: 'Достижения',
        description: 'Использование специального API достижений',
        category: 'social'
      },
      {
        id: 'mobile_support',
        name: 'Мобильная поддержка',
        description: 'Адаптация интерфейса для мобильных устройств',
        category: 'accessibility'
      },
      {
        id: 'multi_language',
        name: 'Множественные языки',
        description: 'Поддержка русского, английского и турецкого языков',
        category: 'localization'
      }
    ],
    performance: [
      {
        id: 'asset_optimization',
        name: 'Оптимизация ассетов',
        description: 'Сжатие изображений и аудио файлов',
        category: 'performance'
      },
      {
        id: 'code_minification',
        name: 'Минификация кода',
        description: 'Минификация JavaScript и CSS файлов',
        category: 'performance'
      },
      {
        id: 'loading_optimization',
        name: 'Оптимизация загрузки',
        description: 'Прогрессивная загрузка и показ прогресса',
        category: 'performance'
      }
    ],
    security: [
      {
        id: 'csp_headers',
        name: 'Content Security Policy',
        description: 'Правильные CSP заголовки для безопасности',
        category: 'security'
      },
      {
        id: 'safe_file_types',
        name: 'Безопасные типы файлов',
        description: 'Использование только разрешенных типов файлов',
        category: 'security'
      },
      {
        id: 'https_usage',
        name: 'HTTPS соединения',
        description: 'Использование только защищенных соединений',
        category: 'security'
      }
    ]
  };

  res.json({
    success: true,
    data: requirements
  });
});

/**
 * GET /api/validation/limits
 * Получение лимитов и ограничений
 */
router.get('/limits', (req, res) => {
  const limits = {
    size: {
      max: '100MB',
      recommended: '50MB',
      description: 'Максимальный размер игры для быстрой загрузки'
    },
    files: {
      maxCount: 1000,
      allowedTypes: [
        '.html', '.js', '.css', '.json',
        '.png', '.jpg', '.jpeg', '.webp', '.svg',
        '.wav', '.mp3', '.ogg', '.m4a',
        '.woff', '.woff2', '.ttf', '.otf'
      ],
      forbiddenNames: [
        'node_modules', '.git', '.env', 'config.json',
        'server.js', 'package.json', 'webpack.config.js'
      ]
    },
    performance: {
      maxLoadTime: '10s',
      targetFPS: '30+',
      maxMemory: '256MB'
    },
    ads: {
      interstitialLimit: 3,
      interstitialCooldown: '3min',
      rewardedCooldown: '30s'
    },
    structure: {
      requiredFiles: ['index.html'],
      recommendedStructure: {
        '/': 'Корневая директория с index.html',
        '/assets/': 'Ассеты игры (изображения, звуки)',
        '/js/': 'JavaScript файлы',
        '/css/': 'CSS стили'
      }
    }
  };

  res.json({
    success: true,
    data: limits
  });
});

/**
 * POST /api/validation/batch
 * Валидация нескольких игр одновременно
 */
router.post('/batch',
  rateLimitMiddleware({ windowMs: 30 * 60 * 1000, max: 5 }), // 5 запросов за 30 минут
  validateRequest({
    body: {
      games: { 
        type: 'array', 
        required: true,
        items: {
          gameId: { type: 'string', required: true },
          gamePath: { type: 'string', required: true }
        }
      }
    }
  }),
  async (req, res) => {
    try {
      const { games } = req.body;
      
      if (games.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Максимум 10 игр за один запрос'
        });
      }

      logger.info(`🔍 Начало batch валидации ${games.length} игр`);
      const startTime = Date.now();

      const results = [];
      for (const { gameId, gamePath } of games) {
        try {
          const resolvedPath = path.resolve(gamePath);
          if (!resolvedPath.startsWith(process.cwd())) {
            results.push({
              gameId,
              success: false,
              error: 'Небезопасный путь к игре'
            });
            continue;
          }

          const result = await validator.validateGame(resolvedPath);
          results.push({
            gameId,
            success: true,
            validation: result,
            summary: {
              isValid: result.isValid,
              errorsCount: result.errors.length,
              warningsCount: result.warnings.length,
              size: result.size
            }
          });

        } catch (error) {
          results.push({
            gameId,
            success: false,
            error: error instanceof Error ? error.message : 'Ошибка валидации'
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Batch валидация завершена за ${duration}ms`);

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: games.length,
            passed: results.filter(r => r.success && r.validation?.isValid).length,
            failed: results.filter(r => !r.success || !r.validation?.isValid).length
          },
          timestamp: new Date().toISOString(),
          duration
        }
      });

    } catch (error) {
      logger.error('Ошибка batch валидации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка batch валидации',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);

/**
 * GET /api/validation/health
 * Проверка работоспособности сервиса валидации
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Game Validation Service',
      status: 'healthy',
      version: '1.0.0',
      features: [
        'full-validation',
        'quick-validation', 
        'structure-check',
        'sdk-validation',
        'performance-check',
        'batch-validation'
      ],
      limits: {
        maxGameSize: '100MB',
        maxBatchSize: 10,
        supportedFileTypes: ['.html', '.js', '.css', '.png', '.jpg', '.wav', '.mp3']
      },
      timestamp: new Date().toISOString()
    }
  });
});

export default router; 