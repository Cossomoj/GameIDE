import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { LoggerService } from './logger';
import { GameMinifier } from './gameMinifier';
import { YandexGamesValidator } from './yandexGamesValidator';

// Требования к структуре Яндекс Игр
interface YandexGameStructure {
  rootFiles: RequiredFile[];
  directories: GameDirectory[];
  assetConstraints: AssetConstraints;
  codeStructure: CodeStructure;
  manifestRequirements: ManifestRequirements;
}

interface RequiredFile {
  name: string;
  required: boolean;
  description: string;
  validationRules: FileValidationRule[];
  template?: string;
}

interface GameDirectory {
  name: string;
  required: boolean;
  allowedFiles: string[];
  maxFiles?: number;
  maxSize?: number; // в байтах
  description: string;
}

interface AssetConstraints {
  images: {
    maxSize: number;
    allowedFormats: string[];
    requiredSizes: IconSize[];
    optimization: ImageOptimization;
  };
  audio: {
    maxSize: number;
    allowedFormats: string[];
    maxDuration: number;
    optimization: AudioOptimization;
  };
  fonts: {
    maxSize: number;
    allowedFormats: string[];
    fallbacks: string[];
  };
}

interface IconSize {
  width: number;
  height: number;
  purpose: 'any' | 'maskable' | 'monochrome';
  required: boolean;
}

interface ImageOptimization {
  compression: boolean;
  format: 'webp' | 'png' | 'jpg';
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

interface AudioOptimization {
  compression: boolean;
  format: 'ogg' | 'mp3' | 'wav';
  bitrate: number;
  normalize: boolean;
}

interface CodeStructure {
  entryPoint: string;
  bundling: BundlingConfig;
  dependencies: DependencyConfig;
  polyfills: PolyfillConfig;
  security: SecurityConfig;
}

interface BundlingConfig {
  enabled: boolean;
  strategy: 'single' | 'split' | 'vendor';
  compression: boolean;
  sourceMap: boolean;
  treeshaking: boolean;
}

interface DependencyConfig {
  allowed: string[];
  forbidden: string[];
  cdn: CDNConfig[];
  inlineThreshold: number; // размер в байтах для инлайнинга
}

interface CDNConfig {
  name: string;
  url: string;
  fallback?: string;
  async: boolean;
}

interface PolyfillConfig {
  required: string[];
  optional: string[];
  detection: boolean;
}

interface SecurityConfig {
  csp: CSPConfig;
  sandbox: SandboxConfig;
  apiRestrictions: string[];
}

interface CSPConfig {
  enabled: boolean;
  directives: { [key: string]: string };
}

interface SandboxConfig {
  enabled: boolean;
  permissions: string[];
}

interface ManifestRequirements {
  version: string;
  requiredFields: string[];
  iconSizes: number[];
  orientation: string[];
  categories: string[];
}

interface FileValidationRule {
  type: 'size' | 'format' | 'content' | 'encoding' | 'syntax';
  constraint: any;
  errorMessage: string;
  severity: 'error' | 'warning';
}

interface StructureValidationResult {
  valid: boolean;
  errors: StructureError[];
  warnings: StructureWarning[];
  suggestions: StructureSuggestion[];
  compliance: ComplianceReport;
}

interface StructureError {
  type: 'missing_file' | 'invalid_structure' | 'size_exceeded' | 'invalid_format';
  file?: string;
  message: string;
  fix?: string;
}

interface StructureWarning {
  type: 'optimization' | 'compatibility' | 'performance';
  file?: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

interface StructureSuggestion {
  type: 'optimization' | 'enhancement' | 'best_practice';
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}

interface ComplianceReport {
  yandexGames: boolean;
  webStandards: boolean;
  performance: boolean;
  accessibility: boolean;
  security: boolean;
  score: number; // 0-100
}

export class YandexOutputStructureService {
  private logger: LoggerService;
  private minifier: GameMinifier;
  private validator: YandexGamesValidator;
  
  // Конфигурация Яндекс Игр
  private yandexStructure: YandexGameStructure;
  
  constructor() {
    this.logger = LoggerService.getInstance();
    this.minifier = new GameMinifier();
    this.validator = new YandexGamesValidator();
    
    this.initializeYandexStructure();
    
    this.logger.info('🏗️ Сервис структуры выходных файлов Яндекс Игр инициализирован');
  }

  /**
   * Инициализация требований структуры Яндекс Игр
   */
  private initializeYandexStructure(): void {
    this.yandexStructure = {
      rootFiles: [
        {
          name: 'index.html',
          required: true,
          description: 'Главный HTML файл игры',
          validationRules: [
            {
              type: 'content',
              constraint: { containsYandexSDK: true },
              errorMessage: 'index.html должен содержать подключение Yandex Games SDK',
              severity: 'error'
            },
            {
              type: 'content',
              constraint: { hasViewport: true },
              errorMessage: 'Отсутствует viewport meta tag',
              severity: 'warning'
            }
          ],
          template: this.getIndexHTMLTemplate()
        },
        {
          name: 'manifest.json',
          required: true,
          description: 'Манифест игры для Яндекс Игр',
          validationRules: [
            {
              type: 'syntax',
              constraint: { validJSON: true },
              errorMessage: 'manifest.json должен содержать валидный JSON',
              severity: 'error'
            },
            {
              type: 'content',
              constraint: { hasRequiredFields: ['name', 'version', 'icons', 'start_url'] },
              errorMessage: 'Отсутствуют обязательные поля в манифесте',
              severity: 'error'
            }
          ]
        },
        {
          name: 'icon-192.png',
          required: true,
          description: 'Иконка игры 192x192',
          validationRules: [
            {
              type: 'format',
              constraint: { format: 'png', width: 192, height: 192 },
              errorMessage: 'Иконка должна быть PNG 192x192',
              severity: 'error'
            }
          ]
        },
        {
          name: 'icon-512.png',
          required: true,
          description: 'Иконка игры 512x512',
          validationRules: [
            {
              type: 'format',
              constraint: { format: 'png', width: 512, height: 512 },
              errorMessage: 'Иконка должна быть PNG 512x512',
              severity: 'error'
            }
          ]
        }
      ],
      directories: [
        {
          name: 'assets',
          required: false,
          allowedFiles: ['*.png', '*.jpg', '*.webp', '*.svg', '*.mp3', '*.ogg', '*.wav'],
          maxFiles: 100,
          maxSize: 50 * 1024 * 1024, // 50MB
          description: 'Ассеты игры (изображения, звуки)'
        },
        {
          name: 'js',
          required: false,
          allowedFiles: ['*.js', '*.mjs'],
          maxFiles: 20,
          maxSize: 10 * 1024 * 1024, // 10MB
          description: 'JavaScript файлы'
        },
        {
          name: 'css',
          required: false,
          allowedFiles: ['*.css'],
          maxFiles: 10,
          maxSize: 2 * 1024 * 1024, // 2MB
          description: 'CSS стили'
        },
        {
          name: 'fonts',
          required: false,
          allowedFiles: ['*.woff', '*.woff2', '*.ttf'],
          maxFiles: 5,
          maxSize: 5 * 1024 * 1024, // 5MB
          description: 'Шрифты'
        }
      ],
      assetConstraints: {
        images: {
          maxSize: 5 * 1024 * 1024, // 5MB на изображение
          allowedFormats: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
          requiredSizes: [
            { width: 192, height: 192, purpose: 'any', required: true },
            { width: 512, height: 512, purpose: 'any', required: true },
            { width: 144, height: 144, purpose: 'any', required: false }
          ],
          optimization: {
            compression: true,
            format: 'webp',
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85
          }
        },
        audio: {
          maxSize: 10 * 1024 * 1024, // 10MB на аудио файл
          allowedFormats: ['.mp3', '.ogg', '.wav', '.m4a'],
          maxDuration: 180, // 3 минуты
          optimization: {
            compression: true,
            format: 'ogg',
            bitrate: 128,
            normalize: true
          }
        },
        fonts: {
          maxSize: 2 * 1024 * 1024, // 2MB на шрифт
          allowedFormats: ['.woff', '.woff2', '.ttf'],
          fallbacks: ['Arial', 'sans-serif', 'serif', 'monospace']
        }
      },
      codeStructure: {
        entryPoint: 'index.html',
        bundling: {
          enabled: true,
          strategy: 'single',
          compression: true,
          sourceMap: false,
          treeshaking: true
        },
        dependencies: {
          allowed: ['yandex-games-sdk'],
          forbidden: ['node_modules', 'package.json', 'webpack.config.js'],
          cdn: [
            {
              name: 'yandex-games-sdk',
              url: 'https://yandex.ru/games/sdk/v2',
              async: false
            }
          ],
          inlineThreshold: 50 * 1024 // 50KB
        },
        polyfills: {
          required: ['Promise', 'fetch'],
          optional: ['IntersectionObserver', 'ResizeObserver'],
          detection: true
        },
        security: {
          csp: {
            enabled: true,
            directives: {
              'default-src': "'self'",
              'script-src': "'self' 'unsafe-inline' https://yandex.ru",
              'style-src': "'self' 'unsafe-inline'",
              'img-src': "'self' data: https:",
              'connect-src': "'self' https://yandex.ru"
            }
          },
          sandbox: {
            enabled: false,
            permissions: []
          },
          apiRestrictions: ['localStorage', 'sessionStorage', 'indexedDB']
        }
      },
      manifestRequirements: {
        version: '2.0',
        requiredFields: [
          'name', 'version', 'description', 'start_url', 'display',
          'orientation', 'background_color', 'theme_color', 'icons'
        ],
        iconSizes: [144, 192, 256, 512],
        orientation: ['portrait', 'landscape', 'any'],
        categories: ['games']
      }
    };
  }

  /**
   * Приведение структуры игры к требованиям Яндекс Игр
   */
  async normalizeGameStructure(
    inputPath: string,
    outputPath: string,
    options: {
      optimize?: boolean;
      validate?: boolean;
      generateMissing?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<StructureValidationResult> {
    const {
      optimize = true,
      validate = true,
      generateMissing = true,
      strictMode = false
    } = options;

    this.logger.info(`🏗️ Нормализация структуры игры: ${inputPath} -> ${outputPath}`);

    try {
      // Создаем выходную директорию
      await fs.mkdir(outputPath, { recursive: true });

      // Анализируем входную структуру
      const inputAnalysis = await this.analyzeInputStructure(inputPath);
      
      // Создаем план миграции
      const migrationPlan = await this.createMigrationPlan(inputAnalysis, strictMode);
      
      // Выполняем миграцию файлов
      await this.executeMigration(inputPath, outputPath, migrationPlan);
      
      // Генерируем недостающие файлы
      if (generateMissing) {
        await this.generateMissingFiles(outputPath, inputAnalysis);
      }
      
      // Оптимизируем структуру
      if (optimize) {
        await this.optimizeStructure(outputPath);
      }
      
      // Валидируем результат
      let validationResult: StructureValidationResult;
      if (validate) {
        validationResult = await this.validateStructure(outputPath);
      } else {
        validationResult = {
          valid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          compliance: {
            yandexGames: true,
            webStandards: true,
            performance: true,
            accessibility: true,
            security: true,
            score: 100
          }
        };
      }

      this.logger.info(`✅ Нормализация завершена. Соответствие: ${validationResult.compliance.score}%`);
      
      return validationResult;

    } catch (error) {
      this.logger.error('❌ Ошибка нормализации структуры:', error);
      throw error;
    }
  }

  /**
   * Анализ входной структуры
   */
  private async analyzeInputStructure(inputPath: string): Promise<any> {
    const analysis = {
      files: new Map<string, any>(),
      directories: new Set<string>(),
      totalSize: 0,
      fileTypes: new Map<string, number>(),
      hasIndex: false,
      hasManifest: false,
      hasIcons: false,
      sdkIntegration: false
    };

    const files = await this.getAllFiles(inputPath);
    
    for (const file of files) {
      const relativePath = file.replace(inputPath + '/', '');
      const stat = await fs.stat(file);
      const ext = extname(file);
      
      analysis.files.set(relativePath, {
        path: file,
        size: stat.size,
        extension: ext,
        isDirectory: stat.isDirectory()
      });
      
      analysis.totalSize += stat.size;
      analysis.fileTypes.set(ext, (analysis.fileTypes.get(ext) || 0) + 1);
      
      // Проверяем ключевые файлы
      if (basename(file) === 'index.html') {
        analysis.hasIndex = true;
        
        // Проверяем SDK интеграцию
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('yandex') || content.includes('YaGames')) {
          analysis.sdkIntegration = true;
        }
      }
      
      if (basename(file) === 'manifest.json') {
        analysis.hasManifest = true;
      }
      
      if (file.includes('icon') && ['.png', '.jpg', '.jpeg'].includes(ext)) {
        analysis.hasIcons = true;
      }
      
      // Собираем директории
      const dir = dirname(relativePath);
      if (dir !== '.' && dir !== '/') {
        analysis.directories.add(dir);
      }
    }

    return analysis;
  }

  /**
   * Создание плана миграции
   */
  private async createMigrationPlan(analysis: any, strictMode: boolean): Promise<any> {
    const plan = {
      filesToCopy: new Map<string, string>(),
      filesToTransform: new Map<string, any>(),
      filesToGenerate: new Set<string>(),
      directoriesToCreate: new Set<string>(),
      optimizations: new Map<string, any>()
    };

    // Анализируем каждый файл
    for (const [relativePath, fileInfo] of analysis.files) {
      const targetPath = this.getTargetPath(relativePath, strictMode);
      
      if (this.needsTransformation(fileInfo)) {
        plan.filesToTransform.set(relativePath, {
          target: targetPath,
          transformations: this.getRequiredTransformations(fileInfo)
        });
      } else {
        plan.filesToCopy.set(relativePath, targetPath);
      }
      
      // Определяем необходимые директории
      const targetDir = dirname(targetPath);
      if (targetDir !== '.' && targetDir !== '/') {
        plan.directoriesToCreate.add(targetDir);
      }
    }

    // Определяем файлы для генерации
    for (const requiredFile of this.yandexStructure.rootFiles) {
      if (requiredFile.required && !analysis.files.has(requiredFile.name)) {
        plan.filesToGenerate.add(requiredFile.name);
      }
    }

    return plan;
  }

  /**
   * Выполнение миграции
   */
  private async executeMigration(
    inputPath: string,
    outputPath: string,
    plan: any
  ): Promise<void> {
    // Создаем директории
    for (const dir of plan.directoriesToCreate) {
      await fs.mkdir(join(outputPath, dir), { recursive: true });
    }

    // Копируем файлы
    for (const [source, target] of plan.filesToCopy) {
      const sourcePath = join(inputPath, source);
      const targetPath = join(outputPath, target);
      await fs.copyFile(sourcePath, targetPath);
    }

    // Трансформируем файлы
    for (const [source, config] of plan.filesToTransform) {
      const sourcePath = join(inputPath, source);
      const targetPath = join(outputPath, config.target);
      await this.transformFile(sourcePath, targetPath, config.transformations);
    }
  }

  /**
   * Генерация недостающих файлов
   */
  private async generateMissingFiles(outputPath: string, analysis: any): Promise<void> {
    // Генерируем index.html если нужно
    if (!analysis.hasIndex) {
      await this.generateIndexHTML(outputPath, analysis);
    }

    // Генерируем manifest.json если нужно
    if (!analysis.hasManifest) {
      await this.generateManifest(outputPath, analysis);
    }

    // Генерируем иконки если нужно
    if (!analysis.hasIcons) {
      await this.generateIcons(outputPath);
    }

    // Генерируем service worker
    await this.generateServiceWorker(outputPath);
  }

  /**
   * Оптимизация структуры
   */
  private async optimizeStructure(outputPath: string): Promise<void> {
    // Минификация CSS и JS
    await this.minifier.minifyGame(outputPath, outputPath, {
      javascript: { enabled: true, removeConsole: true, compress: true, mangle: true, sourceMap: false, removeDebugger: true },
      css: { enabled: true, level: 2, removeUnused: true, compatibility: 'ie8' },
      html: { enabled: true, removeComments: true, collapseWhitespace: true, removeEmptyAttributes: true, minifyCSS: true, minifyJS: true },
      assets: { enabled: true, imageCompression: true, audioCompression: true }
    });

    // Оптимизация изображений
    await this.optimizeImages(outputPath);

    // Оптимизация аудио
    await this.optimizeAudio(outputPath);
  }

  /**
   * Валидация структуры
   */
  private async validateStructure(outputPath: string): Promise<StructureValidationResult> {
    const result: StructureValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      compliance: {
        yandexGames: true,
        webStandards: true,
        performance: true,
        accessibility: true,
        security: true,
        score: 100
      }
    };

    try {
      // Валидация через Yandex Games Validator
      const yandexValidation = await this.validator.validateGame(outputPath);
      
      if (!yandexValidation.isValid) {
        result.valid = false;
        result.compliance.yandexGames = false;
        
        for (const error of yandexValidation.errors) {
          result.errors.push({
            type: 'invalid_format',
            message: error.message,
            fix: error.fixable ? 'Автоматическое исправление доступно' : undefined
          });
        }
      }

      // Проверка обязательных файлов
      await this.validateRequiredFiles(outputPath, result);
      
      // Проверка размеров
      await this.validateSizes(outputPath, result);
      
      // Проверка производительности
      await this.validatePerformance(outputPath, result);
      
      // Вычисляем итоговый счет
      result.compliance.score = this.calculateComplianceScore(result.compliance);

    } catch (error) {
      this.logger.error('❌ Ошибка валидации структуры:', error);
      result.valid = false;
      result.errors.push({
        type: 'invalid_structure',
        message: `Ошибка валидации: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return result;
  }

  // Вспомогательные методы

  private async validateRequiredFiles(outputPath: string, result: StructureValidationResult): Promise<void> {
    for (const requiredFile of this.yandexStructure.rootFiles) {
      if (requiredFile.required) {
        const filePath = join(outputPath, requiredFile.name);
        
        try {
          await fs.access(filePath);
          
          // Валидация содержимого
          for (const rule of requiredFile.validationRules) {
            const valid = await this.validateFileRule(filePath, rule);
            if (!valid) {
              if (rule.severity === 'error') {
                result.errors.push({
                  type: 'invalid_format',
                  file: requiredFile.name,
                  message: rule.errorMessage
                });
                result.valid = false;
              } else {
                result.warnings.push({
                  type: 'compatibility',
                  file: requiredFile.name,
                  message: rule.errorMessage,
                  impact: 'medium'
                });
              }
            }
          }
          
        } catch {
          result.errors.push({
            type: 'missing_file',
            file: requiredFile.name,
            message: `Отсутствует обязательный файл: ${requiredFile.name}`,
            fix: requiredFile.template ? 'Можно сгенерировать автоматически' : undefined
          });
          result.valid = false;
        }
      }
    }
  }

  private async validateSizes(outputPath: string, result: StructureValidationResult): Promise<void> {
    const files = await this.getAllFiles(outputPath);
    let totalSize = 0;
    
    for (const file of files) {
      const stat = await fs.stat(file);
      totalSize += stat.size;
      
      const ext = extname(file);
      
      // Проверяем размеры изображений
      if (this.yandexStructure.assetConstraints.images.allowedFormats.includes(ext)) {
        if (stat.size > this.yandexStructure.assetConstraints.images.maxSize) {
          result.warnings.push({
            type: 'optimization',
            file: file.replace(outputPath + '/', ''),
            message: `Изображение превышает рекомендуемый размер (${this.formatBytes(stat.size)})`,
            impact: 'medium'
          });
        }
      }
      
      // Проверяем размеры аудио
      if (this.yandexStructure.assetConstraints.audio.allowedFormats.includes(ext)) {
        if (stat.size > this.yandexStructure.assetConstraints.audio.maxSize) {
          result.warnings.push({
            type: 'optimization',
            file: file.replace(outputPath + '/', ''),
            message: `Аудио файл превышает рекомендуемый размер (${this.formatBytes(stat.size)})`,
            impact: 'medium'
          });
        }
      }
    }

    // Проверяем общий размер игры
    const maxGameSize = 100 * 1024 * 1024; // 100MB
    if (totalSize > maxGameSize) {
      result.errors.push({
        type: 'size_exceeded',
        message: `Общий размер игры превышает лимит Яндекс Игр (${this.formatBytes(totalSize)} > 100MB)`,
        fix: 'Требуется оптимизация ассетов'
      });
      result.valid = false;
      result.compliance.yandexGames = false;
    }
  }

  private async validatePerformance(outputPath: string, result: StructureValidationResult): Promise<void> {
    // Проверяем количество HTTP запросов
    const indexPath = join(outputPath, 'index.html');
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const externalResources = this.countExternalResources(content);
      
      if (externalResources > 10) {
        result.warnings.push({
          type: 'performance',
          file: 'index.html',
          message: `Слишком много внешних ресурсов (${externalResources}). Рекомендуется объединение`,
          impact: 'high'
        });
        result.compliance.performance = false;
      }
      
    } catch {
      // Файл не найден, ошибка уже зафиксирована в validateRequiredFiles
    }
  }

  private calculateComplianceScore(compliance: ComplianceReport): number {
    const factors = [
      compliance.yandexGames ? 30 : 0,
      compliance.webStandards ? 20 : 0,
      compliance.performance ? 20 : 0,
      compliance.accessibility ? 15 : 0,
      compliance.security ? 15 : 0
    ];
    
    return factors.reduce((sum, score) => sum + score, 0);
  }

  // Генераторы файлов

  private async generateIndexHTML(outputPath: string, analysis: any): Promise<void> {
    const template = this.getIndexHTMLTemplate();
    const indexPath = join(outputPath, 'index.html');
    await fs.writeFile(indexPath, template);
    
    this.logger.info('📄 Сгенерирован index.html');
  }

  private async generateManifest(outputPath: string, analysis: any): Promise<void> {
    const manifest = {
      name: "Generated Game",
      short_name: "Game",
      version: "1.0.0",
      description: "Game generated by AI Game IDE",
      start_url: "./index.html",
      display: "fullscreen",
      orientation: "landscape",
      background_color: "#000000",
      theme_color: "#4285f4",
      categories: ["games"],
      icons: [
        {
          src: "./icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "./icon-512.png", 
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        }
      ],
      lang: "ru",
      scope: "./",
      serviceworker: {
        src: "./sw.js",
        scope: "./",
        update_via_cache: "none"
      }
    };

    const manifestPath = join(outputPath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    this.logger.info('📋 Сгенерирован manifest.json');
  }

  private async generateIcons(outputPath: string): Promise<void> {
    // Генерируем простые SVG иконки
    const iconSizes = [144, 192, 256, 512];
    
    for (const size of iconSizes) {
      const svgIcon = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#4285f4"/>
          <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="#fff"/>
          <text x="${size/2}" y="${size/2 + size/12}" text-anchor="middle" fill="#4285f4" font-family="Arial" font-size="${size/8}" font-weight="bold">GAME</text>
        </svg>
      `;
      
      const iconPath = join(outputPath, `icon-${size}.svg`);
      await fs.writeFile(iconPath, svgIcon);
    }
    
    this.logger.info('🎨 Сгенерированы иконки игры');
  }

  private async generateServiceWorker(outputPath: string): Promise<void> {
    const sw = `
// Service Worker для Яндекс Игр
const CACHE_NAME = 'game-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`;

    const swPath = join(outputPath, 'sw.js');
    await fs.writeFile(swPath, sw);
    
    this.logger.info('⚙️ Сгенерирован Service Worker');
  }

  private getIndexHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#4285f4">
  <title>Game</title>
  <link rel="manifest" href="./manifest.json">
  <link rel="icon" type="image/png" href="./icon-192.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .game-container {
      width: 100%;
      height: 100vh;
      max-width: 800px;
      max-height: 600px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
    
    .game-title {
      font-size: 3em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
    
    .game-subtitle {
      font-size: 1.2em;
      margin-bottom: 30px;
      opacity: 0.8;
    }
    
    .start-button {
      padding: 15px 30px;
      font-size: 1.2em;
      background: linear-gradient(45deg, #ff6b6b, #ee5a52);
      border: none;
      border-radius: 25px;
      color: white;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    
    .start-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }
    
    .loading {
      display: none;
      margin-top: 20px;
    }
    
    .spinner {
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
      .game-container {
        margin: 10px;
        border-radius: 0;
      }
      
      .game-title {
        font-size: 2em;
      }
      
      .start-button {
        padding: 12px 25px;
        font-size: 1em;
      }
    }
  </style>
</head>
<body>
  <div class="game-container">
    <h1 class="game-title">🎮 Game</h1>
    <p class="game-subtitle">Добро пожаловать в игру!</p>
    <button class="start-button" onclick="startGame()">Начать игру</button>
    
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p>Загрузка игры...</p>
    </div>
  </div>

  <!-- Yandex Games SDK -->
  <script src="https://yandex.ru/games/sdk/v2"></script>
  
  <script>
    let ysdk = null;
    let player = null;
    
    // Инициализация Yandex Games SDK
    YaGames.init().then(_ysdk => {
      ysdk = _ysdk;
      console.log('Yandex SDK инициализирован');
      
      // Получаем информацию об игроке
      return ysdk.getPlayer();
    }).then(_player => {
      player = _player;
      console.log('Игрок авторизован:', player.getName());
    }).catch(err => {
      console.warn('Ошибка инициализации Yandex SDK:', err);
      // Игра должна работать и без SDK
    });
    
    function startGame() {
      const button = document.querySelector('.start-button');
      const loading = document.getElementById('loading');
      
      button.style.display = 'none';
      loading.style.display = 'block';
      
      // Симуляция загрузки игры
      setTimeout(() => {
        initGame();
      }, 2000);
    }
    
    function initGame() {
      // Здесь инициализируется основная логика игры
      console.log('Игра инициализирована');
      
      // Показываем рекламу при старте (если SDK доступен)
      if (ysdk) {
        ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: function(wasShown) {
              console.log('Реклама закрыта');
              startGameLoop();
            },
            onError: function(error) {
              console.log('Ошибка показа рекламы:', error);
              startGameLoop();
            }
          }
        });
      } else {
        startGameLoop();
      }
    }
    
    function startGameLoop() {
      // Основной игровой цикл
      console.log('Игровой цикл запущен');
      
      // Скрываем экран загрузки
      document.querySelector('.game-container').innerHTML = \`
        <div style="text-align: center; color: white;">
          <h2>🎮 Игра запущена!</h2>
          <p>Игровая логика будет добавлена здесь</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 1em; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Перезапустить
          </button>
        </div>
      \`;
    }
    
    // Регистрируем Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(function(registration) {
          console.log('Service Worker зарегистрирован:', registration);
        })
        .catch(function(error) {
          console.log('Ошибка регистрации Service Worker:', error);
        });
    }
    
    // Обработка ошибок
    window.addEventListener('error', function(e) {
      console.error('Ошибка приложения:', e.error);
    });
    
    // Предотвращаем масштабирование на мобильных устройствах
    document.addEventListener('touchmove', function(e) {
      if (e.scale !== 1) {
        e.preventDefault();
      }
    }, { passive: false });
  </script>
</body>
</html>`;
  }

  // Вспомогательные методы

  private getTargetPath(relativePath: string, strictMode: boolean): string {
    if (!strictMode) return relativePath;
    
    // В строгом режиме организуем файлы по типам
    const ext = extname(relativePath);
    
    if (['.js', '.mjs'].includes(ext)) {
      return join('js', basename(relativePath));
    }
    
    if (ext === '.css') {
      return join('css', basename(relativePath));
    }
    
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
      return join('assets', 'images', basename(relativePath));
    }
    
    if (['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
      return join('assets', 'audio', basename(relativePath));
    }
    
    if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
      return join('assets', 'fonts', basename(relativePath));
    }
    
    return relativePath;
  }

  private needsTransformation(fileInfo: any): boolean {
    const ext = fileInfo.extension;
    return ext === '.html' || ext === '.js' || ext === '.css';
  }

  private getRequiredTransformations(fileInfo: any): any[] {
    const transformations = [];
    
    switch (fileInfo.extension) {
      case '.html':
        transformations.push('add_yandex_sdk', 'add_viewport', 'optimize_meta');
        break;
      case '.js':
        transformations.push('minify', 'add_polyfills');
        break;
      case '.css':
        transformations.push('minify', 'autoprefix');
        break;
    }
    
    return transformations;
  }

  private async transformFile(sourcePath: string, targetPath: string, transformations: string[]): Promise<void> {
    let content = await fs.readFile(sourcePath, 'utf-8');
    
    for (const transformation of transformations) {
      content = await this.applyTransformation(content, transformation);
    }
    
    await fs.writeFile(targetPath, content);
  }

  private async applyTransformation(content: string, transformation: string): Promise<string> {
    switch (transformation) {
      case 'add_yandex_sdk':
        if (!content.includes('yandex') && !content.includes('YaGames')) {
          content = content.replace(
            '</head>',
            '  <script src="https://yandex.ru/games/sdk/v2"></script>\n</head>'
          );
        }
        break;
        
      case 'add_viewport':
        if (!content.includes('viewport')) {
          content = content.replace(
            '<head>',
            '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">'
          );
        }
        break;
        
      case 'optimize_meta':
        if (!content.includes('theme-color')) {
          content = content.replace(
            '</head>',
            '  <meta name="theme-color" content="#4285f4">\n</head>'
          );
        }
        break;
    }
    
    return content;
  }

  private async validateFileRule(filePath: string, rule: FileValidationRule): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'content':
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (rule.constraint.containsYandexSDK) {
            return content.includes('yandex') || content.includes('YaGames');
          }
          
          if (rule.constraint.hasViewport) {
            return content.includes('viewport');
          }
          
          if (rule.constraint.hasRequiredFields) {
            const parsed = JSON.parse(content);
            return rule.constraint.hasRequiredFields.every((field: string) => !!parsed[field]);
          }
          
          break;
          
        case 'syntax':
          if (rule.constraint.validJSON) {
            const content = await fs.readFile(filePath, 'utf-8');
            JSON.parse(content); // Throws if invalid
            return true;
          }
          break;
          
        case 'size':
          const stat = await fs.stat(filePath);
          return stat.size <= rule.constraint.maxSize;
          
        case 'format':
          // Проверка формата файла
          return true; // Упрощенная проверка
      }
      
      return true;
      
    } catch {
      return false;
    }
  }

  private countExternalResources(html: string): number {
    const linkRegex = /<link[^>]+href=['"]https?:\/\/[^'"]+/g;
    const scriptRegex = /<script[^>]+src=['"]https?:\/\/[^'"]+/g;
    const imgRegex = /<img[^>]+src=['"]https?:\/\/[^'"]+/g;
    
    const links = html.match(linkRegex) || [];
    const scripts = html.match(scriptRegex) || [];
    const images = html.match(imgRegex) || [];
    
    return links.length + scripts.length + images.length;
  }

  private async optimizeImages(outputPath: string): Promise<void> {
    // Простая оптимизация изображений (заглушка)
    this.logger.info('🖼️ Оптимизация изображений пропущена (требует sharp)');
  }

  private async optimizeAudio(outputPath: string): Promise<void> {
    // Простая оптимизация аудио (заглушка)
    this.logger.info('🔊 Оптимизация аудио пропущена (требует ffmpeg)');
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Директория не существует
    }
    
    return files;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Получение рекомендаций по оптимизации
   */
  async getOptimizationRecommendations(gamePath: string): Promise<StructureSuggestion[]> {
    const suggestions: StructureSuggestion[] = [];
    
    try {
      const analysis = await this.analyzeInputStructure(gamePath);
      
      // Рекомендации по размеру
      if (analysis.totalSize > 50 * 1024 * 1024) { // > 50MB
        suggestions.push({
          type: 'optimization',
          description: 'Сжатие ассетов для уменьшения размера игры',
          benefit: 'Быстрая загрузка, соответствие лимитам платформы',
          effort: 'low'
        });
      }
      
      // Рекомендации по структуре
      if (!analysis.hasManifest) {
        suggestions.push({
          type: 'enhancement',
          description: 'Добавление Web App Manifest для лучшей интеграции',
          benefit: 'Установка как PWA, лучший пользовательский опыт',
          effort: 'low'
        });
      }
      
      // Рекомендации по производительности
      if (analysis.fileTypes.get('.js')! > 10) {
        suggestions.push({
          type: 'optimization',
          description: 'Объединение JavaScript файлов для снижения количества запросов',
          benefit: 'Улучшение времени загрузки',
          effort: 'medium'
        });
      }
      
    } catch (error) {
      this.logger.error('❌ Ошибка генерации рекомендаций:', error);
    }
    
    return suggestions;
  }
}

// Singleton экземпляр
export const yandexOutputStructure = new YandexOutputStructureService();
export default yandexOutputStructure; 