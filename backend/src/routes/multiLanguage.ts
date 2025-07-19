import { Router, Request, Response } from 'express';
import { multiLanguageGenerationService } from '../services/multiLanguageGeneration';
import { logger } from '../services/logger';
import { analyticsService } from '../services/analytics';

const router = Router();

// GET /api/multi-language/languages - получение поддерживаемых языков
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const languages = multiLanguageGenerationService.getSupportedLanguages();
    
    res.json({
      success: true,
      data: {
        languages,
        count: languages.length
      }
    });
    
    analyticsService.trackEvent('languages_requested', {
      count: languages.length,
      userAgent: req.get('User-Agent')
    });
    
  } catch (error) {
    logger.error('Error getting supported languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/multi-language/languages/:languageId - получение конфигурации языка
router.get('/languages/:languageId', async (req: Request, res: Response) => {
  try {
    const { languageId } = req.params;
    const language = multiLanguageGenerationService.getLanguageConfig(languageId);
    
    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found',
        message: `Language "${languageId}" is not supported`
      });
    }
    
    res.json({
      success: true,
      data: language
    });
    
    analyticsService.trackEvent('language_config_requested', {
      languageId,
      userAgent: req.get('User-Agent')
    });
    
  } catch (error) {
    logger.error('Error getting language config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get language configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/multi-language/generate - генерация кода игры
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      gameConfig,
      targetLanguage,
      outputFormat = 'multi_file',
      optimizations = {
        minify: false,
        obfuscate: false,
        bundleAssets: false,
        generateDocs: true,
        includeTests: false
      },
      customSettings = {}
    } = req.body;

    // Валидация
    if (!gameConfig) {
      return res.status(400).json({
        success: false,
        error: 'Game configuration is required',
        message: 'Please provide gameConfig in the request body'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required',
        message: 'Please specify targetLanguage'
      });
    }

    const language = multiLanguageGenerationService.getLanguageConfig(targetLanguage);
    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
        message: `Language "${targetLanguage}" is not supported`
      });
    }

    // Генерируем код
    const generatedCode = await multiLanguageGenerationService.generateGame({
      gameConfig,
      targetLanguage,
      outputFormat,
      optimizations,
      customSettings
    });

    res.json({
      success: true,
      data: generatedCode,
      message: `Game code generated successfully for ${language.displayName}`
    });

    analyticsService.trackEvent('code_generated', {
      targetLanguage,
      gameId: gameConfig.id,
      outputFormat,
      filesCount: generatedCode.files.length,
      totalSize: generatedCode.metadata.totalSize,
      optimizations,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Game code generated: ${generatedCode.id} for language: ${targetLanguage}`);

  } catch (error) {
    logger.error('Error generating game code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate game code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/multi-language/convert - конвертация кода между языками
router.post('/convert', async (req: Request, res: Response) => {
  try {
    const {
      sourceCode,
      sourceLanguage,
      targetLanguage,
      gameId = 'unknown'
    } = req.body;

    // Валидация
    if (!sourceCode) {
      return res.status(400).json({
        success: false,
        error: 'Source code is required',
        message: 'Please provide sourceCode in the request body'
      });
    }

    if (!sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Source and target languages are required',
        message: 'Please specify both sourceLanguage and targetLanguage'
      });
    }

    const sourceLang = multiLanguageGenerationService.getLanguageConfig(sourceLanguage);
    const targetLang = multiLanguageGenerationService.getLanguageConfig(targetLanguage);

    if (!sourceLang || !targetLang) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
        message: 'One or both languages are not supported'
      });
    }

    // Запускаем конвертацию
    const conversionJob = await multiLanguageGenerationService.convertCode(
      sourceCode,
      sourceLanguage,
      targetLanguage,
      gameId
    );

    res.json({
      success: true,
      data: conversionJob,
      message: 'Code conversion started'
    });

    analyticsService.trackEvent('code_conversion_started', {
      sourceLanguage,
      targetLanguage,
      gameId,
      jobId: conversionJob.id,
      sourceSize: sourceCode.length,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Code conversion started: ${conversionJob.id} from ${sourceLanguage} to ${targetLanguage}`);

  } catch (error) {
    logger.error('Error starting code conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start code conversion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/multi-language/generated/:codeId - получение сгенерированного кода
router.get('/generated/:codeId', async (req: Request, res: Response) => {
  try {
    const { codeId } = req.params;
    const generatedCode = multiLanguageGenerationService.getGeneratedCode(codeId);

    if (!generatedCode) {
      return res.status(404).json({
        success: false,
        error: 'Generated code not found',
        message: `Code with ID "${codeId}" not found`
      });
    }

    res.json({
      success: true,
      data: generatedCode
    });

    analyticsService.trackEvent('generated_code_retrieved', {
      codeId,
      language: generatedCode.language,
      gameId: generatedCode.gameId,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting generated code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generated code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/multi-language/conversion/:jobId - получение статуса конвертации
router.get('/conversion/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const conversionJob = multiLanguageGenerationService.getConversionJob(jobId);

    if (!conversionJob) {
      return res.status(404).json({
        success: false,
        error: 'Conversion job not found',
        message: `Job with ID "${jobId}" not found`
      });
    }

    res.json({
      success: true,
      data: conversionJob
    });

    analyticsService.trackEvent('conversion_status_checked', {
      jobId,
      status: conversionJob.status,
      progress: conversionJob.progress,
      sourceLanguage: conversionJob.sourceLanguage,
      targetLanguage: conversionJob.targetLanguage,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting conversion job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversion job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/multi-language/download/:codeId - скачивание проекта
router.get('/download/:codeId', async (req: Request, res: Response) => {
  try {
    const { codeId } = req.params;
    const { format = 'zip' } = req.query;

    if (format !== 'zip' && format !== 'tar.gz') {
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: 'Format must be "zip" or "tar.gz"'
      });
    }

    const generatedCode = multiLanguageGenerationService.getGeneratedCode(codeId);
    if (!generatedCode) {
      return res.status(404).json({
        success: false,
        error: 'Generated code not found',
        message: `Code with ID "${codeId}" not found`
      });
    }

    const archivePath = await multiLanguageGenerationService.downloadProject(
      codeId,
      format as 'zip' | 'tar.gz'
    );

    // В реальной реализации здесь была бы отправка файла
    res.json({
      success: true,
      data: {
        downloadUrl: `/downloads/${codeId}.${format}`,
        archivePath,
        filename: `${generatedCode.projectStructure.name}.${format}`,
        size: generatedCode.metadata.totalSize
      },
      message: 'Download link generated'
    });

    analyticsService.trackEvent('project_downloaded', {
      codeId,
      format,
      language: generatedCode.language,
      gameId: generatedCode.gameId,
      filesCount: generatedCode.files.length,
      totalSize: generatedCode.metadata.totalSize,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Project download requested: ${codeId} in ${format} format`);

  } catch (error) {
    logger.error('Error downloading project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/multi-language/stats - получение статистики
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = multiLanguageGenerationService.getStats();

    res.json({
      success: true,
      data: stats
    });

    analyticsService.trackEvent('multilang_stats_requested', {
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error getting multi-language stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/multi-language/compare - сравнение языков
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { languageIds } = req.body;

    if (!Array.isArray(languageIds) || languageIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language list',
        message: 'Please provide at least 2 language IDs to compare'
      });
    }

    const languages = languageIds.map(id => {
      const lang = multiLanguageGenerationService.getLanguageConfig(id);
      if (!lang) {
        throw new Error(`Language "${id}" not found`);
      }
      return lang;
    });

    // Создаем сравнительную таблицу
    const comparison = {
      languages: languages.map(lang => ({
        id: lang.id,
        name: lang.displayName,
        version: lang.version,
        typeSafety: lang.features.typeSafety,
        performance: this.getPerformanceRating(lang),
        learningCurve: this.getLearningCurveRating(lang),
        webSupport: lang.features.webSupport,
        mobileSupport: lang.features.mobileSupport,
        desktopSupport: lang.features.desktopSupport,
        gameEngines: lang.features.gameEngines,
        memoryManagement: lang.features.memoryManagement,
        concurrency: lang.features.concurrency
      })),
      recommendations: this.generateRecommendations(languages)
    };

    res.json({
      success: true,
      data: comparison
    });

    analyticsService.trackEvent('languages_compared', {
      languageIds,
      count: languageIds.length,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error comparing languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare languages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Вспомогательные методы для сравнения языков
function getPerformanceRating(language: any): 'high' | 'medium' | 'low' {
  if (language.runtime.type === 'compiled') {
    return language.features.memoryManagement === 'manual' ? 'high' : 'high';
  } else if (language.runtime.type === 'transpiled') {
    return 'medium';
  } else {
    return language.features.typeSafety === 'static' ? 'medium' : 'low';
  }
}

function getLearningCurveRating(language: any): 'easy' | 'medium' | 'hard' {
  if (language.id === 'javascript' || language.id === 'python') {
    return 'easy';
  } else if (language.id === 'typescript' || language.id === 'java' || language.id === 'csharp') {
    return 'medium';
  } else if (language.id === 'rust' || language.id === 'go') {
    return 'hard';
  }
  return 'medium';
}

function generateRecommendations(languages: any[]): Record<string, string> {
  const recommendations: Record<string, string> = {};

  // Рекомендации по использованию
  if (languages.some(lang => lang.features.webSupport)) {
    recommendations.web = 'Для веб-игр рекомендуем JavaScript или TypeScript';
  }

  if (languages.some(lang => lang.features.mobileSupport)) {
    recommendations.mobile = 'Для мобильных игр подходят Java, C# или JavaScript';
  }

  if (languages.some(lang => lang.features.typeSafety === 'static')) {
    recommendations.enterprise = 'Для больших проектов выбирайте языки со статической типизацией';
  }

  if (languages.some(lang => lang.runtime.type === 'compiled')) {
    recommendations.performance = 'Для высокопроизводительных игр используйте компилируемые языки';
  }

  return recommendations;
}

// POST /api/multi-language/templates - получение пользовательских шаблонов
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { languageId, templateType } = req.body;

    if (!languageId || !templateType) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters',
        message: 'languageId and templateType are required'
      });
    }

    const language = multiLanguageGenerationService.getLanguageConfig(languageId);
    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found',
        message: `Language "${languageId}" is not supported`
      });
    }

    // Генерируем шаблон для указанного типа
    const template = generateTemplate(language, templateType);

    res.json({
      success: true,
      data: {
        language: languageId,
        templateType,
        content: template,
        metadata: {
          generated: new Date().toISOString(),
          language: language.displayName,
          version: language.version
        }
      }
    });

    analyticsService.trackEvent('template_generated', {
      languageId,
      templateType,
      userAgent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function generateTemplate(language: any, templateType: string): string {
  switch (templateType) {
    case 'entity':
      return generateEntityTemplate(language);
    case 'scene':
      return generateSceneTemplate(language);
    case 'component':
      return generateComponentTemplate(language);
    case 'utils':
      return generateUtilsTemplate(language);
    default:
      return `// ${templateType} template for ${language.displayName}\n// TODO: Implement ${templateType}`;
  }
}

function generateEntityTemplate(language: any): string {
  switch (language.id) {
    case 'javascript':
      return `class Entity {
  constructor(x = 0, y = 0, width = 32, height = 32) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocity = { x: 0, y: 0 };
    this.active = true;
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    this.x += this.velocity.x * deltaTime;
    this.y += this.velocity.y * deltaTime;
  }
  
  render(ctx) {
    if (!this.active) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }
  
  collidesWith(other) {
    const bounds1 = this.getBounds();
    const bounds2 = other.getBounds();
    
    return bounds1.left < bounds2.right &&
           bounds1.right > bounds2.left &&
           bounds1.top < bounds2.bottom &&
           bounds1.bottom > bounds2.top;
  }
}`;
    case 'python':
      return `class Entity:
    def __init__(self, x=0, y=0, width=32, height=32):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.velocity = {'x': 0, 'y': 0}
        self.active = True
    
    def update(self, delta_time):
        if not self.active:
            return
        
        self.x += self.velocity['x'] * delta_time
        self.y += self.velocity['y'] * delta_time
    
    def render(self, screen):
        if not self.active:
            return
        
        pygame.draw.rect(screen, (255, 255, 255), 
                        (self.x, self.y, self.width, self.height))
    
    def get_bounds(self):
        return {
            'left': self.x,
            'right': self.x + self.width,
            'top': self.y,
            'bottom': self.y + self.height
        }
    
    def collides_with(self, other):
        bounds1 = self.get_bounds()
        bounds2 = other.get_bounds()
        
        return (bounds1['left'] < bounds2['right'] and
                bounds1['right'] > bounds2['left'] and
                bounds1['top'] < bounds2['bottom'] and
                bounds1['bottom'] > bounds2['top'])`;
    default:
      return `// Entity template for ${language.displayName}`;
  }
}

function generateSceneTemplate(language: any): string {
  switch (language.id) {
    case 'javascript':
      return `class Scene {
  constructor(name) {
    this.name = name;
    this.entities = [];
    this.camera = { x: 0, y: 0 };
    this.background = '#2c3e50';
    this.active = true;
  }
  
  addEntity(entity) {
    this.entities.push(entity);
  }
  
  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    this.entities.forEach(entity => entity.update(deltaTime));
    
    // Remove inactive entities
    this.entities = this.entities.filter(entity => entity.active);
  }
  
  render(ctx) {
    if (!this.active) return;
    
    // Clear screen
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Apply camera transform
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    
    // Render entities
    this.entities.forEach(entity => entity.render(ctx));
    
    ctx.restore();
  }
  
  handleInput(inputManager) {
    // Override in subclasses
  }
}`;
    case 'python':
      return `class Scene:
    def __init__(self, name):
        self.name = name
        self.entities = []
        self.camera = {'x': 0, 'y': 0}
        self.background = (44, 62, 80)
        self.active = True
    
    def add_entity(self, entity):
        self.entities.append(entity)
    
    def remove_entity(self, entity):
        if entity in self.entities:
            self.entities.remove(entity)
    
    def update(self, delta_time):
        if not self.active:
            return
        
        for entity in self.entities[:]:
            entity.update(delta_time)
        
        # Remove inactive entities
        self.entities = [entity for entity in self.entities if entity.active]
    
    def render(self, screen):
        if not self.active:
            return
        
        # Clear screen
        screen.fill(self.background)
        
        # Render entities (with camera offset)
        for entity in self.entities:
            # Apply camera transform here if needed
            entity.render(screen)
    
    def handle_input(self, input_manager):
        # Override in subclasses
        pass`;
    default:
      return `// Scene template for ${language.displayName}`;
  }
}

function generateComponentTemplate(language: any): string {
  switch (language.id) {
    case 'javascript':
      return `class Component {
  constructor(entity) {
    this.entity = entity;
    this.active = true;
  }
  
  update(deltaTime) {
    // Override in subclasses
  }
  
  render(ctx) {
    // Override in subclasses
  }
  
  destroy() {
    this.active = false;
    this.entity = null;
  }
}

class HealthComponent extends Component {
  constructor(entity, maxHealth = 100) {
    super(entity);
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }
  
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth === 0) {
      this.entity.active = false;
    }
  }
  
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }
  
  getHealthPercentage() {
    return this.currentHealth / this.maxHealth;
  }
}`;
    case 'python':
      return `class Component:
    def __init__(self, entity):
        self.entity = entity
        self.active = True
    
    def update(self, delta_time):
        # Override in subclasses
        pass
    
    def render(self, screen):
        # Override in subclasses
        pass
    
    def destroy(self):
        self.active = False
        self.entity = None

class HealthComponent(Component):
    def __init__(self, entity, max_health=100):
        super().__init__(entity)
        self.max_health = max_health
        self.current_health = max_health
    
    def take_damage(self, amount):
        self.current_health = max(0, self.current_health - amount)
        if self.current_health == 0:
            self.entity.active = False
    
    def heal(self, amount):
        self.current_health = min(self.max_health, self.current_health + amount)
    
    def get_health_percentage(self):
        return self.current_health / self.max_health`;
    default:
      return `// Component template for ${language.displayName}`;
  }
}

function generateUtilsTemplate(language: any): string {
  switch (language.id) {
    case 'javascript':
      return `// Utility functions for game development

class MathUtils {
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  static lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  static angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  }
  
  static random(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

class ColorUtils {
  static hexToRgb(hex) {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}`;
    case 'python':
      return `# Utility functions for game development
import math
import random

class MathUtils:
    @staticmethod
    def clamp(value, min_val, max_val):
        return max(min_val, min(value, max_val))
    
    @staticmethod
    def lerp(start, end, t):
        return start + (end - start) * t
    
    @staticmethod
    def distance(x1, y1, x2, y2):
        dx = x2 - x1
        dy = y2 - y1
        return math.sqrt(dx * dx + dy * dy)
    
    @staticmethod
    def angle(x1, y1, x2, y2):
        return math.atan2(y2 - y1, x2 - x1)
    
    @staticmethod
    def random_float(min_val, max_val):
        return random.uniform(min_val, max_val)
    
    @staticmethod
    def random_int(min_val, max_val):
        return random.randint(min_val, max_val)

class ColorUtils:
    @staticmethod
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    @staticmethod
    def rgb_to_hex(r, g, b):
        return f"#{r:02x}{g:02x}{b:02x}"`;
    default:
      return `// Utility functions for ${language.displayName}`;
  }
}

export default router; 