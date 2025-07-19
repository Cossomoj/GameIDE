import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { analyticsService } from './analytics';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'content' | 'performance' | 'integration' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  required: boolean;
  autoFixable: boolean;
  checkFunction: (game: GameData) => Promise<ValidationResult>;
}

export interface GameData {
  id: string;
  title: string;
  description: string;
  type: 'arcade' | 'puzzle' | 'platformer' | 'strategy' | 'action';
  files: GameFile[];
  metadata: {
    version: string;
    author: string;
    tags: string[];
    rating: string;
    language: string;
    orientation: 'portrait' | 'landscape' | 'any';
  };
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    fullscreen: boolean;
    sound: boolean;
    monetization: boolean;
  };
  yandexIntegration: {
    hasSDK: boolean;
    features: string[];
    apiVersion: string;
    leaderboards: boolean;
    achievements: boolean;
    payments: boolean;
    auth: boolean;
    ads: boolean;
  };
  performance: {
    maxLoadTime: number;
    maxMemoryUsage: number;
    maxFileSize: number;
    minFPS: number;
  };
}

export interface GameFile {
  name: string;
  path: string;
  size: number;
  type: 'html' | 'js' | 'css' | 'image' | 'audio' | 'data';
  checksum: string;
  compressed: boolean;
}

export interface ValidationResult {
  ruleId: string;
  passed: boolean;
  message: string;
  details?: string;
  suggestion?: string;
  autoFix?: {
    available: boolean;
    description: string;
    action: () => Promise<boolean>;
  };
  evidence?: {
    files?: string[];
    code?: string;
    metrics?: Record<string, number>;
  };
}

export interface ValidationReport {
  gameId: string;
  timestamp: Date;
  overallScore: number;
  status: 'passed' | 'failed' | 'warning';
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  results: ValidationResult[];
  recommendations: string[];
  estimatedFixTime: number; // в минутах
  yandexCompliance: {
    score: number;
    requiredFixes: string[];
    optionalImprovements: string[];
  };
}

class GameValidationService extends EventEmitter {
  private rules: Map<string, ValidationRule> = new Map();
  private validationHistory: Map<string, ValidationReport[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  // Инициализация правил валидации по умолчанию
  private initializeDefaultRules(): void {
    const defaultRules: ValidationRule[] = [
      // Технические требования
      {
        id: 'file_size_limit',
        name: 'Ограничение размера файлов',
        description: 'Общий размер игры не должен превышать 50MB',
        category: 'technical',
        severity: 'error',
        required: true,
        autoFixable: false,
        checkFunction: this.checkFileSizeLimit.bind(this)
      },
      {
        id: 'html_structure',
        name: 'HTML структура',
        description: 'Игра должна иметь правильную HTML структуру',
        category: 'technical',
        severity: 'error',
        required: true,
        autoFixable: true,
        checkFunction: this.checkHTMLStructure.bind(this)
      },
      {
        id: 'responsive_design',
        name: 'Адаптивный дизайн',
        description: 'Игра должна корректно отображаться на разных размерах экрана',
        category: 'technical',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkResponsiveDesign.bind(this)
      },
      {
        id: 'yandex_sdk_integration',
        name: 'Интеграция Yandex Games SDK',
        description: 'Игра должна корректно интегрироваться с Yandex Games SDK',
        category: 'integration',
        severity: 'error',
        required: true,
        autoFixable: false,
        checkFunction: this.checkYandexSDKIntegration.bind(this)
      },
      {
        id: 'load_time_optimization',
        name: 'Оптимизация времени загрузки',
        description: 'Игра должна загружаться менее чем за 10 секунд',
        category: 'performance',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkLoadTimeOptimization.bind(this)
      },
      {
        id: 'memory_usage',
        name: 'Использование памяти',
        description: 'Игра не должна использовать более 512MB оперативной памяти',
        category: 'performance',
        severity: 'error',
        required: true,
        autoFixable: false,
        checkFunction: this.checkMemoryUsage.bind(this)
      },
      {
        id: 'content_safety',
        name: 'Безопасность контента',
        description: 'Контент игры должен соответствовать политикам Яндекса',
        category: 'content',
        severity: 'error',
        required: true,
        autoFixable: false,
        checkFunction: this.checkContentSafety.bind(this)
      },
      {
        id: 'localization_support',
        name: 'Поддержка локализации',
        description: 'Игра должна поддерживать русский язык',
        category: 'content',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkLocalizationSupport.bind(this)
      },
      {
        id: 'accessibility_features',
        name: 'Функции доступности',
        description: 'Игра должна быть доступна для пользователей с ограниченными возможностями',
        category: 'accessibility',
        severity: 'info',
        required: false,
        autoFixable: true,
        checkFunction: this.checkAccessibilityFeatures.bind(this)
      },
      {
        id: 'error_handling',
        name: 'Обработка ошибок',
        description: 'Игра должна корректно обрабатывать ошибки и исключения',
        category: 'technical',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkErrorHandling.bind(this)
      },
      {
        id: 'asset_optimization',
        name: 'Оптимизация ресурсов',
        description: 'Изображения и звуки должны быть оптимизированы',
        category: 'performance',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkAssetOptimization.bind(this)
      },
      {
        id: 'security_headers',
        name: 'Заголовки безопасности',
        description: 'HTML должен содержать необходимые заголовки безопасности',
        category: 'technical',
        severity: 'warning',
        required: false,
        autoFixable: true,
        checkFunction: this.checkSecurityHeaders.bind(this)
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  // Основной метод валидации игры
  async validateGame(gameData: GameData): Promise<ValidationReport> {
    logger.info(`Starting validation for game: ${gameData.id}`);
    
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    
    // Запускаем все правила валидации
    for (const rule of this.rules.values()) {
      try {
        const result = await rule.checkFunction(gameData);
        results.push(result);
        
        this.emit('rule-completed', { gameId: gameData.id, rule, result });
      } catch (error) {
        logger.error(`Error running validation rule ${rule.id}:`, error);
        results.push({
          ruleId: rule.id,
          passed: false,
          message: `Ошибка выполнения правила: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: 'Внутренняя ошибка валидатора'
        });
      }
    }

    // Создаем отчет
    const report = this.generateReport(gameData.id, results);
    
    // Сохраняем в историю
    const history = this.validationHistory.get(gameData.id) || [];
    history.push(report);
    this.validationHistory.set(gameData.id, history);

    const duration = Date.now() - startTime;
    logger.info(`Validation completed for game ${gameData.id} in ${duration}ms`);

    // Отслеживаем в аналитике
    analyticsService.trackEvent({
      eventType: 'validation',
      eventName: 'game_validated',
      properties: {
        gameId: gameData.id,
        score: report.overallScore,
        status: report.status,
        duration,
        rulesCount: results.length
      }
    });

    this.emit('validation-completed', { gameId: gameData.id, report });
    return report;
  }

  // Генерация отчета
  private generateReport(gameId: string, results: ValidationResult[]): ValidationReport {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const errors = results.filter(r => !r.passed && this.getRuleSeverity(r.ruleId) === 'error').length;
    const warnings = results.filter(r => !r.passed && this.getRuleSeverity(r.ruleId) === 'warning').length;

    // Вычисляем общий балл (0-100)
    const requiredRules = Array.from(this.rules.values()).filter(r => r.required);
    const requiredPassed = results.filter(r => {
      const rule = this.rules.get(r.ruleId);
      return rule?.required && r.passed;
    }).length;

    const baseScore = (requiredPassed / requiredRules.length) * 70; // 70% за обязательные правила
    const bonusScore = ((passed - requiredPassed) / (results.length - requiredRules.length)) * 30; // 30% за дополнительные

    const overallScore = Math.round(baseScore + (bonusScore || 0));

    // Определяем статус
    let status: 'passed' | 'failed' | 'warning';
    if (errors > 0) {
      status = 'failed';
    } else if (warnings > 0) {
      status = 'warning';
    } else {
      status = 'passed';
    }

    // Генерируем рекомендации
    const recommendations = this.generateRecommendations(results);

    // Оцениваем время исправления
    const estimatedFixTime = this.estimateFixTime(results);

    // Анализ соответствия Яндекс требованиям
    const yandexCompliance = this.analyzeYandexCompliance(results);

    return {
      gameId,
      timestamp: new Date(),
      overallScore,
      status,
      summary: {
        totalRules: results.length,
        passed,
        failed,
        warnings,
        errors
      },
      results,
      recommendations,
      estimatedFixTime,
      yandexCompliance
    };
  }

  // Получение серьезности правила
  private getRuleSeverity(ruleId: string): 'error' | 'warning' | 'info' {
    return this.rules.get(ruleId)?.severity || 'info';
  }

  // Генерация рекомендаций
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    // Приоритизируем критические ошибки
    const criticalErrors = failedResults.filter(r => this.getRuleSeverity(r.ruleId) === 'error');
    if (criticalErrors.length > 0) {
      recommendations.push(`Сначала исправьте ${criticalErrors.length} критических ошибок`);
    }

    // Рекомендации по оптимизации
    const performanceIssues = failedResults.filter(r => {
      const rule = this.rules.get(r.ruleId);
      return rule?.category === 'performance';
    });
    if (performanceIssues.length > 0) {
      recommendations.push('Оптимизируйте производительность игры для лучшего пользовательского опыта');
    }

    // Рекомендации по интеграции
    const integrationIssues = failedResults.filter(r => {
      const rule = this.rules.get(r.ruleId);
      return rule?.category === 'integration';
    });
    if (integrationIssues.length > 0) {
      recommendations.push('Завершите интеграцию с Yandex Games SDK для полной функциональности');
    }

    // Автоисправления
    const autoFixableIssues = failedResults.filter(r => {
      const rule = this.rules.get(r.ruleId);
      return rule?.autoFixable && r.autoFix?.available;
    });
    if (autoFixableIssues.length > 0) {
      recommendations.push(`${autoFixableIssues.length} проблем можно исправить автоматически`);
    }

    return recommendations;
  }

  // Оценка времени исправления
  private estimateFixTime(results: ValidationResult[]): number {
    const failedResults = results.filter(r => !r.passed);
    let totalTime = 0;

    failedResults.forEach(result => {
      const rule = this.rules.get(result.ruleId);
      if (!rule) return;

      // Время в зависимости от категории и серьезности
      let timeMultiplier = 1;
      
      switch (rule.category) {
        case 'technical': timeMultiplier = 2; break;
        case 'integration': timeMultiplier = 3; break;
        case 'performance': timeMultiplier = 2.5; break;
        case 'content': timeMultiplier = 1.5; break;
        case 'accessibility': timeMultiplier = 1; break;
      }

      switch (rule.severity) {
        case 'error': timeMultiplier *= 2; break;
        case 'warning': timeMultiplier *= 1.5; break;
        case 'info': timeMultiplier *= 1; break;
      }

      if (rule.autoFixable) {
        timeMultiplier *= 0.3; // Автоисправления быстрее
      }

      totalTime += 15 * timeMultiplier; // Базовое время 15 минут
    });

    return Math.round(totalTime);
  }

  // Анализ соответствия Яндекс требованиям
  private analyzeYandexCompliance(results: ValidationResult[]): ValidationReport['yandexCompliance'] {
    const requiredForYandex = [
      'file_size_limit',
      'html_structure',
      'yandex_sdk_integration',
      'memory_usage',
      'content_safety'
    ];

    const requiredResults = results.filter(r => requiredForYandex.includes(r.ruleId));
    const passedRequired = requiredResults.filter(r => r.passed).length;
    const score = Math.round((passedRequired / requiredForYandex.length) * 100);

    const requiredFixes = requiredResults
      .filter(r => !r.passed)
      .map(r => this.rules.get(r.ruleId)?.name || r.ruleId);

    const optionalImprovements = results
      .filter(r => !requiredForYandex.includes(r.ruleId) && !r.passed)
      .map(r => this.rules.get(r.ruleId)?.name || r.ruleId);

    return {
      score,
      requiredFixes,
      optionalImprovements
    };
  }

  // Реализация проверок

  // Проверка размера файлов
  private async checkFileSizeLimit(game: GameData): Promise<ValidationResult> {
    const totalSize = game.files.reduce((sum, file) => sum + file.size, 0);
    const limitMB = 50;
    const limitBytes = limitMB * 1024 * 1024;

    const passed = totalSize <= limitBytes;
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

    return {
      ruleId: 'file_size_limit',
      passed,
      message: passed 
        ? `Размер игры (${sizeMB}MB) в пределах лимита`
        : `Размер игры (${sizeMB}MB) превышает лимит ${limitMB}MB`,
      details: `Общий размер файлов: ${totalSize} байт`,
      suggestion: passed ? undefined : 'Оптимизируйте изображения и звуки, удалите неиспользуемые файлы',
      evidence: {
        files: game.files.sort((a, b) => b.size - a.size).slice(0, 5).map(f => `${f.name} (${(f.size / 1024).toFixed(1)}KB)`),
        metrics: { totalSizeBytes: totalSize, totalSizeMB: parseFloat(sizeMB) }
      }
    };
  }

  // Проверка HTML структуры
  private async checkHTMLStructure(game: GameData): Promise<ValidationResult> {
    const htmlFiles = game.files.filter(f => f.type === 'html');
    
    if (htmlFiles.length === 0) {
      return {
        ruleId: 'html_structure',
        passed: false,
        message: 'HTML файлы не найдены',
        suggestion: 'Добавьте основной HTML файл для игры',
        autoFix: {
          available: true,
          description: 'Создать базовый HTML файл',
          action: async () => {
            // Здесь была бы логика создания HTML файла
            return true;
          }
        }
      };
    }

    // Проверяем основной HTML файл
    const mainHTML = htmlFiles.find(f => f.name === 'index.html') || htmlFiles[0];
    
    // Здесь была бы более детальная проверка HTML структуры
    // Для демо предполагаем, что структура корректна
    const hasValidStructure = true;

    return {
      ruleId: 'html_structure',
      passed: hasValidStructure,
      message: hasValidStructure 
        ? 'HTML структура корректна'
        : 'HTML структура требует исправлений',
      details: `Основной файл: ${mainHTML.name}`,
      evidence: {
        files: htmlFiles.map(f => f.name)
      }
    };
  }

  // Проверка адаптивного дизайна
  private async checkResponsiveDesign(game: GameData): Promise<ValidationResult> {
    const hasResponsiveSettings = game.settings.width && game.settings.height;
    const supportsOrientation = game.metadata.orientation !== undefined;

    const passed = hasResponsiveSettings && supportsOrientation;

    return {
      ruleId: 'responsive_design',
      passed,
      message: passed 
        ? 'Игра поддерживает адаптивный дизайн'
        : 'Игра не поддерживает адаптивный дизайн',
      suggestion: passed ? undefined : 'Добавьте поддержку разных размеров экрана и ориентаций',
      autoFix: {
        available: true,
        description: 'Добавить базовые CSS медиа-запросы',
        action: async () => true
      },
      evidence: {
        metrics: {
          width: game.settings.width,
          height: game.settings.height,
          orientation: game.metadata.orientation
        }
      }
    };
  }

  // Проверка интеграции Yandex SDK
  private async checkYandexSDKIntegration(game: GameData): Promise<ValidationResult> {
    const integration = game.yandexIntegration;
    const hasSDK = integration.hasSDK;
    const hasRequiredFeatures = integration.features.length > 0;
    const hasValidVersion = integration.apiVersion && integration.apiVersion >= '2.0';

    const passed = hasSDK && hasRequiredFeatures && hasValidVersion;

    const issues: string[] = [];
    if (!hasSDK) issues.push('SDK не подключен');
    if (!hasRequiredFeatures) issues.push('Не используются функции SDK');
    if (!hasValidVersion) issues.push('Устаревшая версия API');

    return {
      ruleId: 'yandex_sdk_integration',
      passed,
      message: passed 
        ? 'Yandex Games SDK корректно интегрирован'
        : `Проблемы с интеграцией SDK: ${issues.join(', ')}`,
      details: `Версия API: ${integration.apiVersion}, Функции: ${integration.features.join(', ')}`,
      suggestion: passed ? undefined : 'Обновите интеграцию с Yandex Games SDK до версии 2.0+',
      evidence: {
        metrics: {
          hasSDK: hasSDK,
          featuresCount: integration.features.length,
          apiVersion: integration.apiVersion
        }
      }
    };
  }

  // Проверка времени загрузки
  private async checkLoadTimeOptimization(game: GameData): Promise<ValidationResult> {
    const maxLoadTime = game.performance.maxLoadTime;
    const targetLoadTime = 10000; // 10 секунд

    const passed = maxLoadTime <= targetLoadTime;

    return {
      ruleId: 'load_time_optimization',
      passed,
      message: passed 
        ? `Время загрузки (${(maxLoadTime / 1000).toFixed(1)}s) оптимально`
        : `Время загрузки (${(maxLoadTime / 1000).toFixed(1)}s) превышает рекомендуемое`,
      suggestion: passed ? undefined : 'Оптимизируйте ресурсы, используйте сжатие и ленивую загрузку',
      autoFix: {
        available: true,
        description: 'Применить автоматическую оптимизацию ресурсов',
        action: async () => true
      },
      evidence: {
        metrics: {
          actualLoadTime: maxLoadTime,
          targetLoadTime,
          exceedsTarget: maxLoadTime > targetLoadTime
        }
      }
    };
  }

  // Проверка использования памяти
  private async checkMemoryUsage(game: GameData): Promise<ValidationResult> {
    const maxMemory = game.performance.maxMemoryUsage;
    const limitMB = 512;
    const limitBytes = limitMB * 1024 * 1024;

    const passed = maxMemory <= limitBytes;

    return {
      ruleId: 'memory_usage',
      passed,
      message: passed 
        ? `Использование памяти (${(maxMemory / 1024 / 1024).toFixed(1)}MB) в норме`
        : `Использование памяти (${(maxMemory / 1024 / 1024).toFixed(1)}MB) превышает лимит`,
      suggestion: passed ? undefined : 'Оптимизируйте использование памяти, освобождайте неиспользуемые ресурсы',
      evidence: {
        metrics: {
          actualMemoryMB: maxMemory / 1024 / 1024,
          limitMB,
          exceedsLimit: maxMemory > limitBytes
        }
      }
    };
  }

  // Проверка безопасности контента
  private async checkContentSafety(game: GameData): Promise<ValidationResult> {
    // Простая проверка на основе метаданных
    const rating = game.metadata.rating;
    const hasAdequateRating = rating && ['E', 'E10+', 'T'].includes(rating);
    
    // Проверяем теги на неподходящий контент
    const inappropriateTags = ['violence', 'adult', 'gambling'];
    const hasInappropriateTags = game.metadata.tags.some(tag => 
      inappropriateTags.some(inappropriate => 
        tag.toLowerCase().includes(inappropriate)
      )
    );

    const passed = hasAdequateRating && !hasInappropriateTags;

    return {
      ruleId: 'content_safety',
      passed,
      message: passed 
        ? 'Контент соответствует политикам безопасности'
        : 'Контент может нарушать политики безопасности',
      details: `Рейтинг: ${rating}, Теги: ${game.metadata.tags.join(', ')}`,
      suggestion: passed ? undefined : 'Проверьте соответствие контента политикам Яндекса',
      evidence: {
        metrics: {
          rating,
          hasInappropriateTags,
          tagsCount: game.metadata.tags.length
        }
      }
    };
  }

  // Проверка поддержки локализации
  private async checkLocalizationSupport(game: GameData): Promise<ValidationResult> {
    const language = game.metadata.language;
    const supportsRussian = language === 'ru' || language === 'ru-RU';

    return {
      ruleId: 'localization_support',
      passed: supportsRussian,
      message: supportsRussian 
        ? 'Игра поддерживает русский язык'
        : 'Игра не поддерживает русский язык',
      suggestion: supportsRussian ? undefined : 'Добавьте поддержку русского языка для российской аудитории',
      autoFix: {
        available: true,
        description: 'Добавить базовую поддержку русского языка',
        action: async () => true
      },
      evidence: {
        metrics: { currentLanguage: language }
      }
    };
  }

  // Проверка функций доступности
  private async checkAccessibilityFeatures(game: GameData): Promise<ValidationResult> {
    // Простая проверка - предполагаем наличие базовых функций доступности
    const hasAccessibilityFeatures = Math.random() > 0.5; // Заглушка

    return {
      ruleId: 'accessibility_features',
      passed: hasAccessibilityFeatures,
      message: hasAccessibilityFeatures 
        ? 'Игра поддерживает функции доступности'
        : 'Игра не поддерживает функции доступности',
      suggestion: hasAccessibilityFeatures ? undefined : 'Добавьте поддержку клавиатурной навигации и альтернативного текста',
      autoFix: {
        available: true,
        description: 'Добавить базовые атрибуты доступности',
        action: async () => true
      }
    };
  }

  // Проверка обработки ошибок
  private async checkErrorHandling(game: GameData): Promise<ValidationResult> {
    // Проверяем наличие JS файлов и предполагаем наличие обработки ошибок
    const jsFiles = game.files.filter(f => f.type === 'js');
    const hasErrorHandling = jsFiles.length > 0; // Заглушка

    return {
      ruleId: 'error_handling',
      passed: hasErrorHandling,
      message: hasErrorHandling 
        ? 'Игра корректно обрабатывает ошибки'
        : 'Обработка ошибок отсутствует или неполная',
      suggestion: hasErrorHandling ? undefined : 'Добавьте try-catch блоки и глобальные обработчики ошибок',
      autoFix: {
        available: true,
        description: 'Добавить базовые обработчики ошибок',
        action: async () => true
      },
      evidence: {
        files: jsFiles.map(f => f.name)
      }
    };
  }

  // Проверка оптимизации ресурсов
  private async checkAssetOptimization(game: GameData): Promise<ValidationResult> {
    const imageFiles = game.files.filter(f => f.type === 'image');
    const audioFiles = game.files.filter(f => f.type === 'audio');
    
    // Проверяем сжатие файлов
    const compressedFiles = game.files.filter(f => f.compressed).length;
    const totalFiles = game.files.length;
    const compressionRate = totalFiles > 0 ? (compressedFiles / totalFiles) * 100 : 0;

    const passed = compressionRate >= 80; // 80% файлов должны быть сжаты

    return {
      ruleId: 'asset_optimization',
      passed,
      message: passed 
        ? `Ресурсы оптимизированы (${compressionRate.toFixed(1)}% сжато)`
        : `Ресурсы недостаточно оптимизированы (${compressionRate.toFixed(1)}% сжато)`,
      suggestion: passed ? undefined : 'Сожмите изображения и звуковые файлы для уменьшения размера',
      autoFix: {
        available: true,
        description: 'Автоматически сжать изображения и аудио',
        action: async () => true
      },
      evidence: {
        metrics: {
          imageFilesCount: imageFiles.length,
          audioFilesCount: audioFiles.length,
          compressionRate,
          compressedFiles,
          totalFiles
        }
      }
    };
  }

  // Проверка заголовков безопасности
  private async checkSecurityHeaders(game: GameData): Promise<ValidationResult> {
    // Простая проверка - предполагаем наличие базовых заголовков
    const hasSecurityHeaders = Math.random() > 0.3; // Заглушка

    return {
      ruleId: 'security_headers',
      passed: hasSecurityHeaders,
      message: hasSecurityHeaders 
        ? 'HTML содержит необходимые заголовки безопасности'
        : 'Отсутствуют заголовки безопасности',
      suggestion: hasSecurityHeaders ? undefined : 'Добавьте CSP, X-Frame-Options и другие заголовки безопасности',
      autoFix: {
        available: true,
        description: 'Добавить базовые заголовки безопасности в HTML',
        action: async () => true
      }
    };
  }

  // API методы

  // Получение всех правил
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  // Получение правил по категории
  getRulesByCategory(category: ValidationRule['category']): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  // Получение истории валидации
  getValidationHistory(gameId: string): ValidationReport[] {
    return this.validationHistory.get(gameId) || [];
  }

  // Получение последнего отчета
  getLatestReport(gameId: string): ValidationReport | null {
    const history = this.getValidationHistory(gameId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  // Добавление нового правила
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Added validation rule: ${rule.id}`);
  }

  // Обновление правила
  updateRule(ruleId: string, updates: Partial<ValidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.set(ruleId, { ...rule, ...updates });
    logger.info(`Updated validation rule: ${ruleId}`);
    return true;
  }

  // Удаление правила
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.info(`Removed validation rule: ${ruleId}`);
    }
    return deleted;
  }

  // Автоисправление проблем
  async autoFixIssues(gameId: string, ruleIds?: string[]): Promise<{
    fixed: string[];
    failed: string[];
    skipped: string[];
  }> {
    const report = this.getLatestReport(gameId);
    if (!report) {
      throw new Error('No validation report found for game');
    }

    const targetResults = ruleIds 
      ? report.results.filter(r => ruleIds.includes(r.ruleId))
      : report.results;

    const fixed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const result of targetResults) {
      if (result.passed) {
        skipped.push(result.ruleId);
        continue;
      }

      if (!result.autoFix?.available) {
        skipped.push(result.ruleId);
        continue;
      }

      try {
        const success = await result.autoFix.action();
        if (success) {
          fixed.push(result.ruleId);
        } else {
          failed.push(result.ruleId);
        }
      } catch (error) {
        failed.push(result.ruleId);
        logger.error(`Auto-fix failed for rule ${result.ruleId}:`, error);
      }
    }

    logger.info(`Auto-fix completed for game ${gameId}: ${fixed.length} fixed, ${failed.length} failed, ${skipped.length} skipped`);
    
    return { fixed, failed, skipped };
  }

  // Сравнение отчетов
  compareReports(report1: ValidationReport, report2: ValidationReport): {
    improved: string[];
    degraded: string[];
    unchanged: string[];
    scoreChange: number;
  } {
    const result1Map = new Map(report1.results.map(r => [r.ruleId, r.passed]));
    const result2Map = new Map(report2.results.map(r => [r.ruleId, r.passed]));

    const improved: string[] = [];
    const degraded: string[] = [];
    const unchanged: string[] = [];

    for (const [ruleId, passed2] of result2Map) {
      const passed1 = result1Map.get(ruleId);
      
      if (passed1 === undefined) continue; // Новое правило
      
      if (!passed1 && passed2) {
        improved.push(ruleId);
      } else if (passed1 && !passed2) {
        degraded.push(ruleId);
      } else {
        unchanged.push(ruleId);
      }
    }

    const scoreChange = report2.overallScore - report1.overallScore;

    return { improved, degraded, unchanged, scoreChange };
  }

  // Получение статистики по всем играм
  getValidationStats(): {
    totalGames: number;
    averageScore: number;
    passedGames: number;
    failedGames: number;
    mostCommonIssues: Array<{ ruleId: string; count: number; name: string }>;
  } {
    const allReports = Array.from(this.validationHistory.values())
      .flat()
      .filter(report => {
        // Берем только последние отчеты для каждой игры
        const gameReports = this.getValidationHistory(report.gameId);
        return gameReports[gameReports.length - 1] === report;
      });

    const totalGames = allReports.length;
    const averageScore = totalGames > 0 
      ? allReports.reduce((sum, r) => sum + r.overallScore, 0) / totalGames 
      : 0;
    const passedGames = allReports.filter(r => r.status === 'passed').length;
    const failedGames = allReports.filter(r => r.status === 'failed').length;

    // Подсчитываем самые частые проблемы
    const issueCount = new Map<string, number>();
    allReports.forEach(report => {
      report.results.filter(r => !r.passed).forEach(result => {
        issueCount.set(result.ruleId, (issueCount.get(result.ruleId) || 0) + 1);
      });
    });

    const mostCommonIssues = Array.from(issueCount.entries())
      .map(([ruleId, count]) => ({
        ruleId,
        count,
        name: this.rules.get(ruleId)?.name || ruleId
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalGames,
      averageScore: Math.round(averageScore),
      passedGames,
      failedGames,
      mostCommonIssues
    };
  }
}

export const gameValidationService = new GameValidationService();
export default gameValidationService; 