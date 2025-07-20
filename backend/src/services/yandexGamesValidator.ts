import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { LoggerService } from './logger';
import { gameSizeController } from './gameSizeController';

interface YandexValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
  score: number; // 0-100
  details: {
    manifest: ManifestValidation;
    size: SizeValidation;
    structure: StructureValidation;
    sdk: SDKValidation;
    assets: AssetsValidation;
    compatibility: CompatibilityValidation;
  };
}

interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  file?: string;
  line?: number;
  fixable: boolean;
  autoFix?: () => Promise<void>;
}

interface ValidationWarning {
  code: string;
  message: string;
  impact: 'performance' | 'ux' | 'compatibility';
  suggestion: string;
}

interface ValidationRecommendation {
  type: 'optimization' | 'feature' | 'compliance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  benefit: string;
  implementation: string;
}

interface ManifestValidation {
  exists: boolean;
  valid: boolean;
  fields: {
    [key: string]: boolean;
  };
  issues: string[];
}

interface SizeValidation {
  totalSize: number;
  withinLimit: boolean;
  breakdown: { [key: string]: number };
  compressionOpportunities: string[];
}

interface StructureValidation {
  hasIndexHtml: boolean;
  hasIcons: boolean;
  hasManifest: boolean;
  missingFiles: string[];
  unnecessaryFiles: string[];
  structure: 'valid' | 'fixable' | 'invalid';
}

interface SDKValidation {
  sdkPresent: boolean;
  version: string;
  correctIntegration: boolean;
  missingFeatures: string[];
  deprecatedUsage: string[];
}

interface AssetsValidation {
  imagesOptimized: boolean;
  audioOptimized: boolean;
  fontsOptimized: boolean;
  largeAssets: string[];
  formatIssues: string[];
}

interface CompatibilityValidation {
  mobileCompatible: boolean;
  touchControls: boolean;
  responsiveDesign: boolean;
  performanceOptimized: boolean;
  browserSupport: { [browser: string]: boolean };
}

export class YandexGamesValidator {
  private logger = LoggerService.getInstance();
  
  // Константы Яндекс Игр
  private readonly YANDEX_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB
  private readonly REQUIRED_ICONS = ['16x16', '32x32', '128x128', '256x256'];
  private readonly SUPPORTED_FORMATS = {
    images: ['.png', '.jpg', '.jpeg', '.webp'],
    audio: ['.mp3', '.ogg', '.wav', '.m4a'],
    video: ['.mp4', '.webm'],
    fonts: ['.woff', '.woff2', '.ttf']
  };

  /**
   * Полная валидация игры для Яндекс Игр
   */
  async validateGame(gamePath: string): Promise<YandexValidationReport> {
    this.logger.info(`🔍 Начинаю валидацию игры для Яндекс Игр: ${gamePath}`);

    const report: YandexValidationReport = {
      isValid: false,
      errors: [],
      warnings: [],
      recommendations: [],
      score: 0,
      details: {
        manifest: await this.validateManifest(gamePath),
        size: await this.validateSize(gamePath),
        structure: await this.validateStructure(gamePath),
        sdk: await this.validateSDK(gamePath),
        assets: await this.validateAssets(gamePath),
        compatibility: await this.validateCompatibility(gamePath)
      }
    };

    // Агрегируем результаты
    this.aggregateResults(report);
    
    // Генерируем рекомендации
    await this.generateRecommendations(report, gamePath);

    this.logger.info(`✅ Валидация завершена. Итоговый счет: ${report.score}/100`);
    return report;
  }

  /**
   * Валидация манифеста
   */
  private async validateManifest(gamePath: string): Promise<ManifestValidation> {
    const manifestPath = join(gamePath, 'manifest.json');
    const validation: ManifestValidation = {
      exists: false,
      valid: false,
      fields: {},
      issues: []
    };

    try {
      await fs.access(manifestPath);
      validation.exists = true;

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Проверяем обязательные поля
      const requiredFields = [
        'name', 'version', 'description', 'author',
        'orientation', 'background_color', 'theme_color',
        'icons', 'size', 'features', 'requirements'
      ];

      let validFieldsCount = 0;
      for (const field of requiredFields) {
        validation.fields[field] = !!manifest[field];
        if (validation.fields[field]) {
          validFieldsCount++;
        } else {
          validation.issues.push(`Отсутствует обязательное поле: ${field}`);
        }
      }

      // Проверяем специфичные для Яндекса требования
      if (manifest.size && manifest.size.total > this.YANDEX_SIZE_LIMIT) {
        validation.issues.push(`Превышен лимит размера: ${manifest.size.total} > ${this.YANDEX_SIZE_LIMIT}`);
      }

      if (manifest.features) {
        const requiredFeatures = ['leaderboards', 'achievements', 'advertising'];
        for (const feature of requiredFeatures) {
          if (manifest.features[feature] === undefined) {
            validation.issues.push(`Не указан статус функции: ${feature}`);
          }
        }
      }

      validation.valid = validation.issues.length === 0 && validFieldsCount === requiredFields.length;

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        validation.issues.push('Файл manifest.json не найден');
      } else {
        validation.issues.push(`Ошибка парсинга manifest.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return validation;
  }

  /**
   * Валидация размера
   */
  private async validateSize(gamePath: string): Promise<SizeValidation> {
    const sizeReport = await gameSizeController.analyzeGameSize(gamePath);
    
    return {
      totalSize: sizeReport.totalSize,
      withinLimit: sizeReport.compliance.passesYandexLimit,
      breakdown: sizeReport.breakdown,
      compressionOpportunities: sizeReport.optimization
        .filter(opt => opt.estimatedSavings > 1024 * 1024) // > 1MB
        .map(opt => opt.description)
    };
  }

  /**
   * Валидация файловой структуры
   */
  private async validateStructure(gamePath: string): Promise<StructureValidation> {
    const validation: StructureValidation = {
      hasIndexHtml: false,
      hasIcons: false,
      hasManifest: false,
      missingFiles: [],
      unnecessaryFiles: [],
      structure: 'invalid'
    };

    try {
      const files = await this.getAllFiles(gamePath);
      
      // Проверяем обязательные файлы
      validation.hasIndexHtml = files.some(f => basename(f).toLowerCase() === 'index.html');
      validation.hasManifest = files.some(f => basename(f) === 'manifest.json');
      validation.hasIcons = files.some(f => f.includes('icon') && this.SUPPORTED_FORMATS.images.includes(extname(f)));

      if (!validation.hasIndexHtml) validation.missingFiles.push('index.html');
      if (!validation.hasManifest) validation.missingFiles.push('manifest.json');
      if (!validation.hasIcons) validation.missingFiles.push('иконки игры');

      // Проверяем ненужные файлы
      const unnecessaryPatterns = [
        /\.log$/i, /\.tmp$/i, /\.bak$/i, /node_modules/i,
        /\.git/i, /\.DS_Store$/i, /thumbs\.db$/i
      ];

      validation.unnecessaryFiles = files.filter(file => 
        unnecessaryPatterns.some(pattern => pattern.test(file))
      );

      // Определяем общий статус структуры
      if (validation.missingFiles.length === 0) {
        validation.structure = validation.unnecessaryFiles.length > 0 ? 'fixable' : 'valid';
      } else {
        validation.structure = 'invalid';
      }

    } catch (error) {
      this.logger.error('Ошибка валидации структуры:', error);
    }

    return validation;
  }

  /**
   * Валидация интеграции SDK
   */
  private async validateSDK(gamePath: string): Promise<SDKValidation> {
    const validation: SDKValidation = {
      sdkPresent: false,
      version: 'unknown',
      correctIntegration: false,
      missingFeatures: [],
      deprecatedUsage: []
    };

    try {
      const files = await this.getAllFiles(gamePath);
      const jsFiles = files.filter(f => extname(f) === '.js');
      const htmlFiles = files.filter(f => extname(f) === '.html');

      let sdkFound = false;
      let hasModernIntegration = false;

      // Проверяем все файлы на наличие SDK
      for (const file of [...jsFiles, ...htmlFiles]) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          // Проверяем наличие Yandex Games SDK
          if (content.includes('YaGames') || content.includes('ysdk')) {
            sdkFound = true;
            validation.sdkPresent = true;

            // Проверяем версию SDK
            if (content.includes('sdk.js') || content.includes('2.0')) {
              validation.version = '2.0+';
              hasModernIntegration = true;
            } else if (content.includes('1.') || content.includes('legacy')) {
              validation.version = '1.x';
              validation.deprecatedUsage.push('Используется устаревшая версия SDK');
            }

            // Проверяем корректную инициализацию
            if (content.includes('YaGames.init()') || content.includes('ysdk.init')) {
              validation.correctIntegration = true;
            }

            // Проверяем использование основных функций
            const features = [
              { name: 'player', patterns: ['getPlayer', 'player.getData'] },
              { name: 'leaderboards', patterns: ['getLeaderboards', 'setLeaderboardScore'] },
              { name: 'advertising', patterns: ['showFullscreenAdv', 'showRewardedVideo'] },
              { name: 'achievements', patterns: ['getAchievements', 'setAchievementProgress'] }
            ];

            for (const feature of features) {
              const hasFeature = feature.patterns.some(pattern => content.includes(pattern));
              if (!hasFeature) {
                validation.missingFeatures.push(feature.name);
              }
            }

            // Проверяем устаревшие методы
            const deprecatedMethods = ['getStorage', 'setStorage', 'getServerTime'];
            for (const method of deprecatedMethods) {
              if (content.includes(method)) {
                validation.deprecatedUsage.push(`Устаревший метод: ${method}`);
              }
            }
          }
        } catch (error) {
          // Файл не читается или другая ошибка
          continue;
        }
      }

      if (!sdkFound) {
        validation.missingFeatures.push('SDK не подключен');
      }

    } catch (error) {
      this.logger.error('Ошибка валидации SDK:', error);
    }

    return validation;
  }

  /**
   * Валидация ассетов
   */
  private async validateAssets(gamePath: string): Promise<AssetsValidation> {
    const validation: AssetsValidation = {
      imagesOptimized: true,
      audioOptimized: true,
      fontsOptimized: true,
      largeAssets: [],
      formatIssues: []
    };

    try {
      const files = await this.getAllFiles(gamePath);
      const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB

      for (const file of files) {
        const stat = await fs.stat(file);
        const ext = extname(file).toLowerCase();

        // Проверяем размер файлов
        if (stat.size > LARGE_FILE_THRESHOLD) {
          validation.largeAssets.push(file);
        }

        // Проверяем форматы изображений
        if (['.bmp', '.tiff', '.psd'].includes(ext)) {
          validation.formatIssues.push(`Неоптимальный формат изображения: ${file}`);
          validation.imagesOptimized = false;
        }

        // Проверяем форматы аудио
        if (['.wav', '.aiff', '.flac'].includes(ext)) {
          validation.formatIssues.push(`Неоптимальный формат аудио: ${file}`);
          validation.audioOptimized = false;
        }

        // Проверяем шрифты
        if (['.otf', '.eot'].includes(ext)) {
          validation.formatIssues.push(`Неоптимальный формат шрифта: ${file}`);
          validation.fontsOptimized = false;
        }
      }

    } catch (error) {
      this.logger.error('Ошибка валидации ассетов:', error);
    }

    return validation;
  }

  /**
   * Валидация совместимости
   */
  private async validateCompatibility(gamePath: string): Promise<CompatibilityValidation> {
    const validation: CompatibilityValidation = {
      mobileCompatible: false,
      touchControls: false,
      responsiveDesign: false,
      performanceOptimized: false,
      browserSupport: {
        chrome: false,
        firefox: false,
        safari: false,
        edge: false
      }
    };

    try {
      const files = await this.getAllFiles(gamePath);
      const cssFiles = files.filter(f => extname(f) === '.css');
      const jsFiles = files.filter(f => extname(f) === '.js');
      const htmlFiles = files.filter(f => extname(f) === '.html');

      let hasViewportMeta = false;
      let hasTouchEvents = false;
      let hasMediaQueries = false;

      // Проверяем HTML файлы
      for (const file of htmlFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('viewport') && content.includes('width=device-width')) {
          hasViewportMeta = true;
        }
      }

      // Проверяем CSS файлы на адаптивность
      for (const file of cssFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('@media') || content.includes('vw') || content.includes('vh')) {
          hasMediaQueries = true;
        }
      }

      // Проверяем JavaScript на тач-события
      for (const file of jsFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('touchstart') || content.includes('touchend') || 
            content.includes('touchmove') || content.includes('pointer')) {
          hasTouchEvents = true;
        }

        // Проверяем оптимизацию производительности
        if (content.includes('requestAnimationFrame') || 
            content.includes('debounce') || 
            content.includes('throttle')) {
          validation.performanceOptimized = true;
        }
      }

      validation.mobileCompatible = hasViewportMeta && hasMediaQueries;
      validation.touchControls = hasTouchEvents;
      validation.responsiveDesign = hasMediaQueries;

      // Примерная проверка поддержки браузеров (упрощенная)
      validation.browserSupport = {
        chrome: true, // Современные игры обычно поддерживают Chrome
        firefox: true,
        safari: validation.mobileCompatible,
        edge: true
      };

    } catch (error) {
      this.logger.error('Ошибка валидации совместимости:', error);
    }

    return validation;
  }

  /**
   * Агрегация результатов валидации
   */
  private aggregateResults(report: YandexValidationReport): void {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Критичные ошибки
    if (!report.details.manifest.exists) {
      errors.push({
        code: 'MANIFEST_MISSING',
        message: 'Отсутствует файл manifest.json',
        severity: 'critical',
        fixable: true
      });
    }

    if (!report.details.size.withinLimit) {
      errors.push({
        code: 'SIZE_EXCEEDED',
        message: `Размер игры превышает лимит Яндекс Игр (${this.YANDEX_SIZE_LIMIT / 1024 / 1024}MB)`,
        severity: 'critical',
        fixable: true
      });
    }

    if (!report.details.structure.hasIndexHtml) {
      errors.push({
        code: 'INDEX_MISSING',
        message: 'Отсутствует файл index.html',
        severity: 'critical',
        fixable: false
      });
    }

    if (!report.details.sdk.sdkPresent) {
      errors.push({
        code: 'SDK_MISSING',
        message: 'Yandex Games SDK не подключен',
        severity: 'high',
        fixable: true
      });
    }

    // Предупреждения
    if (report.details.sdk.deprecatedUsage.length > 0) {
      warnings.push({
        code: 'SDK_DEPRECATED',
        message: 'Используются устаревшие методы SDK',
        impact: 'compatibility',
        suggestion: 'Обновите код для использования современного API'
      });
    }

    if (!report.details.compatibility.mobileCompatible) {
      warnings.push({
        code: 'MOBILE_INCOMPATIBLE',
        message: 'Игра не оптимизирована для мобильных устройств',
        impact: 'ux',
        suggestion: 'Добавьте viewport meta tag и адаптивную верстку'
      });
    }

    if (report.details.assets.largeAssets.length > 0) {
      warnings.push({
        code: 'LARGE_ASSETS',
        message: `Найдено ${report.details.assets.largeAssets.length} больших файлов`,
        impact: 'performance',
        suggestion: 'Оптимизируйте или сожмите большие ассеты'
      });
    }

    report.errors = errors;
    report.warnings = warnings;

    // Вычисляем итоговый счет
    let score = 100;
    
    // Снимаем баллы за ошибки
    for (const error of errors) {
      switch (error.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
      }
    }

    // Снимаем баллы за предупреждения
    score -= warnings.length * 5;

    report.score = Math.max(0, score);
    report.isValid = errors.filter(e => e.severity === 'critical').length === 0;
  }

  /**
   * Генерация рекомендаций
   */
  private async generateRecommendations(
    report: YandexValidationReport, 
    gamePath: string
  ): Promise<void> {
    const recommendations: ValidationRecommendation[] = [];

    // Рекомендации по оптимизации
    if (report.details.size.compressionOpportunities.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Сжатие ассетов для уменьшения размера',
        benefit: 'Ускорение загрузки и соответствие лимитам платформы',
        implementation: 'Используйте встроенные инструменты оптимизации или сторонние сервисы'
      });
    }

    // Рекомендации по функциональности
    if (report.details.sdk.missingFeatures.includes('leaderboards')) {
      recommendations.push({
        type: 'feature',
        priority: 'medium',
        description: 'Добавление таблиц лидеров',
        benefit: 'Повышение вовлеченности игроков и реиграбельности',
        implementation: 'Интегрируйте Yandex Games Leaderboards API'
      });
    }

    if (report.details.sdk.missingFeatures.includes('achievements')) {
      recommendations.push({
        type: 'feature',
        priority: 'medium',
        description: 'Система достижений',
        benefit: 'Дополнительная мотивация для игроков',
        implementation: 'Используйте Yandex Games Achievements API'
      });
    }

    // Рекомендации по соответствию требованиям
    if (!report.details.compatibility.mobileCompatible) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        description: 'Адаптация под мобильные устройства',
        benefit: 'Доступность игры на всех платформах Яндекс Игр',
        implementation: 'Добавьте адаптивную верстку и тач-контролы'
      });
    }

    if (report.details.sdk.version === '1.x') {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        description: 'Обновление до Yandex Games SDK 2.0+',
        benefit: 'Доступ к новым функциям и лучшая производительность',
        implementation: 'Обновите подключение SDK и API вызовы'
      });
    }

    report.recommendations = recommendations;
  }

  /**
   * Автоматическое исправление проблем
   */
  async autoFix(
    gamePath: string, 
    issues: string[]
  ): Promise<{ fixed: string[]; failed: string[] }> {
    const fixed: string[] = [];
    const failed: string[] = [];

    for (const issue of issues) {
      try {
        switch (issue) {
          case 'MANIFEST_MISSING':
            await this.createDefaultManifest(gamePath);
            fixed.push(issue);
            break;

          case 'SIZE_EXCEEDED':
            await gameSizeController.optimizeGame(gamePath, join(gamePath, 'optimized'));
            fixed.push(issue);
            break;

          case 'SDK_MISSING':
            await this.addYandexSDK(gamePath);
            fixed.push(issue);
            break;

          default:
            failed.push(issue);
        }
      } catch (error) {
        this.logger.error(`Не удалось исправить проблему ${issue}:`, error);
        failed.push(issue);
      }
    }

    return { fixed, failed };
  }

  /**
   * Создание дефолтного манифеста
   */
  private async createDefaultManifest(gamePath: string): Promise<void> {
    const sizeReport = await gameSizeController.analyzeGameSize(gamePath);
    await gameSizeController['generateYandexManifest'](gamePath, sizeReport);
  }

  /**
   * Добавление Yandex SDK
   */
  private async addYandexSDK(gamePath: string): Promise<void> {
    const indexPath = join(gamePath, 'index.html');
    
    try {
      let content = await fs.readFile(indexPath, 'utf-8');
      
      // Добавляем SDK скрипт если его нет
      if (!content.includes('yandex') && !content.includes('YaGames')) {
        const sdkScript = `
  <script src="https://yandex.ru/games/sdk/v2"></script>
  <script>
    YaGames.init().then(ysdk => {
      console.log('Yandex SDK initialized');
      window.ysdk = ysdk;
    });
  </script>`;

        content = content.replace('</head>', `${sdkScript}\n</head>`);
        await fs.writeFile(indexPath, content);
      }
    } catch (error) {
      throw new Error(`Не удалось добавить SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Получение всех файлов в директории
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const scan = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };
    
    await scan(dir);
    return files;
  }

  /**
   * Генерация отчета в формате HTML
   */
  async generateHTMLReport(
    report: YandexValidationReport, 
    outputPath: string
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Отчет валидации Яндекс Игр</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; margin: 10px 0; }
    .score.good { color: #4CAF50; }
    .score.warning { color: #FF9800; }
    .score.bad { color: #F44336; }
    .section { margin: 20px 0; padding: 20px; border-radius: 8px; background: #f9f9f9; }
    .error { background: #ffebee; border-left: 4px solid #f44336; }
    .warning { background: #fff3e0; border-left: 4px solid #ff9800; }
    .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
    .recommendation { background: #e3f2fd; border-left: 4px solid #2196f3; }
    ul { margin: 10px 0; padding-left: 20px; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
    .detail-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
    .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
    .status-indicator.success { background: #4caf50; }
    .status-indicator.error { background: #f44336; }
    .status-indicator.warning { background: #ff9800; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 Отчет валидации Яндекс Игр</h1>
      <div class="score ${report.score >= 80 ? 'good' : report.score >= 60 ? 'warning' : 'bad'}">${report.score}/100</div>
      <p>${report.isValid ? '✅ Игра соответствует требованиям' : '❌ Найдены критичные проблемы'}</p>
    </div>

    ${report.errors.length > 0 ? `
    <div class="section error">
      <h2>🚨 Ошибки (${report.errors.length})</h2>
      <ul>
        ${report.errors.map(e => `<li><strong>${e.code}:</strong> ${e.message}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.warnings.length > 0 ? `
    <div class="section warning">
      <h2>⚠️ Предупреждения (${report.warnings.length})</h2>
      <ul>
        ${report.warnings.map(w => `<li><strong>${w.code}:</strong> ${w.message}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="detail-grid">
      <div class="detail-card">
        <h3>📋 Манифест</h3>
        <p><span class="status-indicator ${report.details.manifest.valid ? 'success' : 'error'}"></span>
        ${report.details.manifest.valid ? 'Корректен' : 'Требует исправления'}</p>
        ${report.details.manifest.issues.length > 0 ? `<ul>${report.details.manifest.issues.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
      </div>

      <div class="detail-card">
        <h3>📏 Размер</h3>
        <p><span class="status-indicator ${report.details.size.withinLimit ? 'success' : 'error'}"></span>
        ${(report.details.size.totalSize / 1024 / 1024).toFixed(2)} MB / 100 MB</p>
        ${report.details.size.compressionOpportunities.length > 0 ? `<p>Возможности сжатия: ${report.details.size.compressionOpportunities.length}</p>` : ''}
      </div>

      <div class="detail-card">
        <h3>🏗️ Структура</h3>
        <p><span class="status-indicator ${report.details.structure.structure === 'valid' ? 'success' : 'warning'}"></span>
        ${report.details.structure.structure === 'valid' ? 'Корректная' : 'Требует внимания'}</p>
        <p>Index.html: ${report.details.structure.hasIndexHtml ? '✅' : '❌'}</p>
        <p>Манифест: ${report.details.structure.hasManifest ? '✅' : '❌'}</p>
        <p>Иконки: ${report.details.structure.hasIcons ? '✅' : '❌'}</p>
      </div>

      <div class="detail-card">
        <h3>🔧 SDK</h3>
        <p><span class="status-indicator ${report.details.sdk.sdkPresent ? 'success' : 'error'}"></span>
        ${report.details.sdk.sdkPresent ? `Версия ${report.details.sdk.version}` : 'Не подключен'}</p>
        ${report.details.sdk.missingFeatures.length > 0 ? `<p>Отсутствуют: ${report.details.sdk.missingFeatures.join(', ')}</p>` : ''}
      </div>

      <div class="detail-card">
        <h3>🖼️ Ассеты</h3>
        <p>Изображения: ${report.details.assets.imagesOptimized ? '✅' : '⚠️'}</p>
        <p>Аудио: ${report.details.assets.audioOptimized ? '✅' : '⚠️'}</p>
        <p>Шрифты: ${report.details.assets.fontsOptimized ? '✅' : '⚠️'}</p>
        ${report.details.assets.largeAssets.length > 0 ? `<p>Больших файлов: ${report.details.assets.largeAssets.length}</p>` : ''}
      </div>

      <div class="detail-card">
        <h3>📱 Совместимость</h3>
        <p>Мобильные: ${report.details.compatibility.mobileCompatible ? '✅' : '❌'}</p>
        <p>Тач-контролы: ${report.details.compatibility.touchControls ? '✅' : '❌'}</p>
        <p>Адаптивность: ${report.details.compatibility.responsiveDesign ? '✅' : '❌'}</p>
        <p>Оптимизация: ${report.details.compatibility.performanceOptimized ? '✅' : '❌'}</p>
      </div>
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="section recommendation">
      <h2>💡 Рекомендации</h2>
      ${report.recommendations.map(r => `
        <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
          <h4>${r.description}</h4>
          <p><strong>Преимущества:</strong> ${r.benefit}</p>
          <p><strong>Реализация:</strong> ${r.implementation}</p>
          <span style="background: ${r.priority === 'high' ? '#f44336' : r.priority === 'medium' ? '#ff9800' : '#4caf50'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
            ${r.priority === 'high' ? 'Высокий приоритет' : r.priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
          </span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
    this.logger.info(`📄 HTML отчет создан: ${outputPath}`);
  }
}

// Singleton экземпляр
export const yandexGamesValidator = new YandexGamesValidator();
export default yandexGamesValidator; 