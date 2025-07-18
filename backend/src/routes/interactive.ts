import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { InteractiveGenerationService } from '@/services/interactiveGeneration';
import { asyncHandler } from '@/middleware/asyncHandler';
import { validateRequest } from '@/middleware/validation';
import { InteractiveGameRequest } from '@/types/interactive';

const router = Router();
const interactiveService = new InteractiveGenerationService();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Разрешенные типы файлов
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'text/plain',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

/**
 * POST /api/interactive/start
 * Начинает интерактивную генерацию игры
 */
router.post('/start',
  [
    body('title').notEmpty().withMessage('Название игры обязательно'),
    body('description').notEmpty().withMessage('Описание игры обязательно'),
    // Жанр и промпт теперь опциональны - могут браться из конфигурации
    body('genre').optional(),
    body('prompt').optional(),
    body('configuration').optional().isObject().withMessage('Конфигурация должна быть объектом'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, genre, description, prompt, userId, configuration } = req.body;

    // Используем жанр из конфигурации, если он не передан напрямую
    const gameGenre = genre || configuration?.mainGenre || 'platformer';

    const request: InteractiveGameRequest & { configuration?: any } = {
      id: uuidv4(),
      userId,
      prompt: prompt || `Создай игру "${title}": ${description}`,
      title,
      genre: gameGenre,
      description,
      mode: 'interactive',
      createdAt: new Date(),
      configuration
    };

    const state = await interactiveService.startInteractiveGeneration(request);

    res.status(201).json({
      success: true,
      data: {
        gameId: state.gameId,
        currentStep: state.currentStepIndex,
        totalSteps: state.totalSteps,
        step: state.steps[state.currentStepIndex],
        hasConfiguration: !!configuration
      },
      message: configuration 
        ? 'Интерактивная генерация начата с персональной конфигурацией'
        : 'Интерактивная генерация начата'
    });
  })
);

/**
 * GET /api/interactive/:gameId/state
 * Получает текущее состояние интерактивной генерации
 */
router.get('/:gameId/state',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;

    const state = interactiveService.getGenerationState(gameId);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'Интерактивная генерация не найдена'
      });
    }

    res.json({
      success: true,
      data: {
        gameId: state.gameId,
        currentStep: state.currentStepIndex,
        totalSteps: state.totalSteps,
        step: state.steps[state.currentStepIndex],
        isActive: state.isActive,
        completedSteps: state.steps.filter(s => s.isCompleted).length,
        startedAt: state.startedAt,
        lastActivityAt: state.lastActivityAt
      }
    });
  })
);

/**
 * POST /api/interactive/:gameId/step/:stepId/variants
 * Генерирует дополнительные варианты для этапа
 */
router.post('/:gameId/step/:stepId/variants',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры'),
    param('stepId').isUUID().withMessage('Некорректный ID этапа'),
    body('count').optional().isInt({ min: 1, max: 10 }).withMessage('Количество вариантов должно быть от 1 до 10'),
    body('customPrompt').optional().isString().withMessage('Пользовательский промпт должен быть строкой')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId, stepId } = req.params;
    const { count = 5, customPrompt } = req.body;

    const response = await interactiveService.generateStepVariants(gameId, stepId, count);

    res.json({
      success: true,
      data: response,
      message: `Сгенерировано ${response.variants.length} новых вариантов`
    });
  })
);

/**
 * POST /api/interactive/:gameId/step/:stepId/select
 * Выбирает вариант для этапа
 */
router.post('/:gameId/step/:stepId/select',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры'),
    param('stepId').isUUID().withMessage('Некорректный ID этапа'),
    body('variantId').isUUID().withMessage('Некорректный ID варианта'),
    body('customPrompt').optional().isString().withMessage('Пользовательский промпт должен быть строкой')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId, stepId } = req.params;
    const { variantId, customPrompt } = req.body;

    await interactiveService.selectVariant(gameId, stepId, variantId, customPrompt);

    res.json({
      success: true,
      message: 'Вариант выбран успешно'
    });
  })
);

/**
 * POST /api/interactive/:gameId/step/:stepId/upload
 * Загружает пользовательский файл для этапа
 */
router.post('/:gameId/step/:stepId/upload',
  upload.single('file'),
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры'),
    param('stepId').isUUID().withMessage('Некорректный ID этапа')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId, stepId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не предоставлен'
      });
    }

    const variant = await interactiveService.uploadCustomAsset(gameId, stepId, {
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    res.status(201).json({
      success: true,
      data: variant,
      message: 'Файл загружен успешно'
    });
  })
);

/**
 * POST /api/interactive/:gameId/pause
 * Приостанавливает интерактивную генерацию
 */
router.post('/:gameId/pause',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры'),
    body('reason').optional().isString().withMessage('Причина должна быть строкой')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { reason } = req.body;

    interactiveService.pauseGeneration(gameId, reason);

    res.json({
      success: true,
      message: 'Генерация приостановлена'
    });
  })
);

/**
 * POST /api/interactive/:gameId/resume
 * Возобновляет интерактивную генерацию
 */
router.post('/:gameId/resume',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;

    interactiveService.resumeGeneration(gameId);

    res.json({
      success: true,
      message: 'Генерация возобновлена'
    });
  })
);

/**
 * POST /api/interactive/:gameId/complete
 * Завершает интерактивную генерацию и создает финальную игру
 */
router.post('/:gameId/complete',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;

    const finalGamePath = await interactiveService.completeGeneration(gameId);

    res.json({
      success: true,
      data: {
        gameId,
        finalGamePath,
        downloadUrl: `/api/games/${gameId}/download`
      },
      message: 'Игра создана успешно!'
    });
  })
);

/**
 * GET /api/interactive/:gameId/step/:stepId/guidelines
 * Получает руководство по этапу (форматы файлов, примеры промптов и т.д.)
 */
router.get('/:gameId/step/:stepId/guidelines',
  [
    param('gameId').isUUID().withMessage('Некорректный ID игры'),
    param('stepId').isUUID().withMessage('Некорректный ID этапа')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId, stepId } = req.params;

    const state = interactiveService.getGenerationState(gameId);
    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'Интерактивная генерация не найдена'
      });
    }

    const step = state.steps.find(s => s.stepId === stepId);
    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Этап не найден'
      });
    }

    // Создаем руководство на основе типа этапа
    const guidelines = getStepGuidelines(step.type);

    res.json({
      success: true,
      data: {
        stepType: step.type,
        stepName: step.name,
        description: step.description,
        guidelines
      }
    });
  })
);

/**
 * Получает руководство для конкретного типа этапа
 */
function getStepGuidelines(stepType: string) {
  const guidelines: any = {
    fileUpload: {
      acceptedFormats: [],
      maxSizeBytes: 10 * 1024 * 1024,
      description: '',
      examples: []
    },
    customPrompt: {
      placeholder: '',
      examples: [],
      tips: []
    }
  };

  switch (stepType) {
    case 'character':
      guidelines.fileUpload = {
        acceptedFormats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        maxSizeBytes: 5 * 1024 * 1024,
        dimensions: {
          min: { width: 32, height: 32 },
          max: { width: 512, height: 512 },
          recommended: { width: 64, height: 64 }
        },
        description: 'Загрузите изображение персонажа. Рекомендуется использовать прозрачный фон (PNG).',
        examples: ['Спрайт героя 64x64px', 'Аватар персонажа', 'Концепт-арт']
      };
      guidelines.customPrompt = {
        placeholder: 'Опишите вашего персонажа: внешность, способности, стиль...',
        examples: [
          'Робот-ниндзя в синей броне с энергетическими мечами',
          'Милая девочка-маг с розовыми волосами и магической палочкой',
          'Космический пилот в скафандре с реактивным ранцем'
        ],
        tips: [
          'Опишите внешность и цветовую схему',
          'Укажите особые способности или снаряжение',
          'Добавьте детали стиля (реалистичный, мультяшный, пиксельный)'
        ]
      };
      break;

    case 'mechanics':
      guidelines.customPrompt = {
        placeholder: 'Опишите игровые механики: управление, цели, особенности...',
        examples: [
          'Прыжки по платформам с двойным прыжком и стенными прыжками',
          'Головоломки с перемещением блоков и активацией переключателей',
          'Стрельба во врагов с разными типами оружия и апгрейдами'
        ],
        tips: [
          'Опишите основной игровой цикл',
          'Укажите способы взаимодействия игрока',
          'Добавьте уникальные особенности геймплея'
        ]
      };
      break;

    case 'levels':
      guidelines.fileUpload = {
        acceptedFormats: ['image/png', 'image/jpeg', 'text/plain', 'application/json'],
        maxSizeBytes: 2 * 1024 * 1024,
        description: 'Загрузите схему уровня, концепт-арт или JSON описание.',
        examples: ['Схема уровня', 'Концепт-арт локации', 'JSON с описанием уровня']
      };
      guidelines.customPrompt = {
        placeholder: 'Опишите дизайн уровня: тема, препятствия, враги...',
        examples: [
          'Лесной уровень с движущимися платформами и шипами',
          'Космическая станция с гравитационными ловушками',
          'Подземелье с лабиринтами и секретными проходами'
        ],
        tips: [
          'Опишите тему и атмосферу уровня',
          'Укажите типы препятствий и врагов',
          'Добавьте интересные элементы геймплея'
        ]
      };
      break;

    case 'graphics':
      guidelines.fileUpload = {
        acceptedFormats: ['image/png', 'image/jpeg', 'image/gif'],
        maxSizeBytes: 5 * 1024 * 1024,
        description: 'Загрузите референсы визуального стиля или готовые ассеты.',
        examples: ['Цветовая палитра', 'Стилевые референсы', 'Готовые спрайты']
      };
      guidelines.customPrompt = {
        placeholder: 'Опишите визуальный стиль: цвета, настроение, техника...',
        examples: [
          'Пиксель-арт в стиле 16-бит с яркими неоновыми цветами',
          'Мультяшный стиль с мягкими пастельными тонами',
          'Минималистичная графика в черно-белых тонах'
        ],
        tips: [
          'Опишите желаемый художественный стиль',
          'Укажите цветовую палитру',
          'Добавьте примеры вдохновения'
        ]
      };
      break;

    case 'sounds':
      guidelines.fileUpload = {
        acceptedFormats: ['audio/wav', 'audio/mp3', 'audio/ogg'],
        maxSizeBytes: 10 * 1024 * 1024,
        description: 'Загрузите звуковые файлы или музыку для игры.',
        examples: ['Фоновая музыка', 'Звуковые эффекты', 'Джинглы']
      };
      guidelines.customPrompt = {
        placeholder: 'Опишите звуковой дизайн: стиль музыки, атмосфера...',
        examples: [
          'Электронная музыка в стиле чиптюн с быстрым темпом',
          'Оркестровая музыка с эпическим настроением',
          'Эмбиентные звуки с мистической атмосферой'
        ],
        tips: [
          'Опишите желаемый музыкальный стиль',
          'Укажите настроение и темп',
          'Добавьте информацию о звуковых эффектах'
        ]
      };
      break;

    case 'ui':
      guidelines.fileUpload = {
        acceptedFormats: ['image/png', 'image/jpeg'],
        maxSizeBytes: 3 * 1024 * 1024,
        description: 'Загрузите макеты интерфейса или UI элементы.',
        examples: ['Макет главного меню', 'UI элементы', 'Иконки']
      };
      guidelines.customPrompt = {
        placeholder: 'Опишите дизайн интерфейса: стиль, расположение элементов...',
        examples: [
          'Минималистичный интерфейс с плоскими кнопками',
          'Ретро-стиль с пиксельными шрифтами',
          'Футуристический дизайн с неоновой подсветкой'
        ],
        tips: [
          'Опишите стиль интерфейса',
          'Укажите желаемое расположение элементов',
          'Добавьте цветовую схему'
        ]
      };
      break;
  }

  return guidelines;
}

export default router; 