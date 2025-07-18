import fs from 'fs/promises';
import path from 'path';
import config from '@/config';
import { LoggerService } from './logger';
import { ValidationResult, ValidationError, ValidationWarning } from '@/types';

export class YandexValidator {
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  public async validateGame(gamePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.logger.info(`🔍 Начата валидация игры: ${gamePath}`);

      // 1. Проверка размера
      await this.validateSize(gamePath, errors, warnings);

      // 2. Проверка обязательных файлов
      await this.validateRequiredFiles(gamePath, errors, warnings);

      // 3. Проверка HTML файла
      await this.validateHTML(gamePath, errors, warnings);

      // 4. Проверка JavaScript кода
      await this.validateJavaScript(gamePath, errors, warnings);

      // 5. Проверка ассетов
      await this.validateAssets(gamePath, errors, warnings);

      // 6. Проверка интеграции Yandex SDK
      await this.validateYandexSDK(gamePath, errors, warnings);

      // 7. Проверка безопасности
      await this.validateSecurity(gamePath, errors, warnings);

      const isValid = errors.length === 0;

      this.logger.info(`✅ Валидация завершена: ${isValid ? 'УСПЕШНО' : 'С ОШИБКАМИ'}`, {
        errors: errors.length,
        warnings: warnings.length,
      });

      return {
        isValid,
        errors,
        warnings,
      };

    } catch (error) {
      this.logger.error('Ошибка валидации:', error);
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `Критическая ошибка валидации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        severity: 'error',
      });

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  private async validateSize(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const totalSize = await this.calculateDirectorySize(gamePath);
      
      if (totalSize > config.yandexGames.maxSize) {
        errors.push({
          code: 'SIZE_EXCEEDED',
          message: `Размер игры (${this.formatSize(totalSize)}) превышает максимально допустимый (${this.formatSize(config.yandexGames.maxSize)})`,
          severity: 'error',
        });
      } else if (totalSize > config.yandexGames.targetSize) {
        warnings.push({
          code: 'SIZE_WARNING',
          message: `Размер игры (${this.formatSize(totalSize)}) больше рекомендуемого (${this.formatSize(config.yandexGames.targetSize)})`,
          suggestion: 'Рассмотрите возможность оптимизации ассетов',
        });
      }

      this.logger.info(`📏 Размер игры: ${this.formatSize(totalSize)}`);
    } catch (error) {
      errors.push({
        code: 'SIZE_CHECK_FAILED',
        message: 'Не удалось проверить размер игры',
        severity: 'error',
      });
    }
  }

  private async validateRequiredFiles(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    for (const requiredFile of config.yandexGames.requiredFiles) {
      const filePath = path.join(gamePath, requiredFile);
      
      try {
        await fs.access(filePath);
        this.logger.debug(`✅ Найден обязательный файл: ${requiredFile}`);
      } catch {
        errors.push({
          code: 'MISSING_REQUIRED_FILE',
          message: `Отсутствует обязательный файл: ${requiredFile}`,
          severity: 'error',
          file: requiredFile,
        });
      }
    }
  }

  private async validateHTML(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const htmlPath = path.join(gamePath, 'index.html');
    
    try {
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      
      // Проверка кодировки UTF-8
      if (!htmlContent.includes('charset="UTF-8"') && !htmlContent.includes("charset='UTF-8'")) {
        warnings.push({
          code: 'MISSING_UTF8',
          message: 'Не указана кодировка UTF-8',
          suggestion: 'Добавьте <meta charset="UTF-8"> в <head>',
        });
      }

      // Проверка viewport для мобильных устройств
      if (!htmlContent.includes('viewport')) {
        warnings.push({
          code: 'MISSING_VIEWPORT',
          message: 'Отсутствует meta viewport для мобильных устройств',
          suggestion: 'Добавьте <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        });
      }

      // Проверка подключения Yandex SDK
      if (!htmlContent.includes('yandex.ru/games/sdk')) {
        errors.push({
          code: 'MISSING_YANDEX_SDK',
          message: 'Не подключен Yandex Games SDK',
          severity: 'error',
          file: 'index.html',
        });
      }

      // Проверка на внешние ресурсы без HTTPS
      const httpResources = htmlContent.match(/src=["']http:\/\/[^"']+["']/g);
      if (httpResources) {
        errors.push({
          code: 'HTTP_RESOURCES',
          message: 'Обнаружены ресурсы, загружаемые по HTTP (требуется HTTPS)',
          severity: 'error',
          file: 'index.html',
        });
      }

      this.logger.debug('✅ HTML файл прошел базовую валидацию');
      
    } catch (error) {
      errors.push({
        code: 'HTML_READ_ERROR',
        message: 'Не удалось прочитать HTML файл',
        severity: 'error',
        file: 'index.html',
      });
    }
  }

  private async validateJavaScript(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const jsFiles = await this.findJavaScriptFiles(gamePath);
      
      for (const jsFile of jsFiles) {
        const content = await fs.readFile(jsFile, 'utf-8');
        
        // Проверка на eval() (небезопасно)
        if (content.includes('eval(')) {
          warnings.push({
            code: 'UNSAFE_EVAL',
            message: 'Использование eval() может быть небезопасно',
            suggestion: 'Избегайте использования eval()',
          });
        }

        // Проверка на console.log (может замедлить производительность)
        const consoleMatches = content.match(/console\.(log|warn|error)/g);
        if (consoleMatches && consoleMatches.length > 10) {
          warnings.push({
            code: 'EXCESSIVE_LOGGING',
            message: 'Обнаружено много вызовов console.*',
            suggestion: 'Удалите отладочные console.* вызовы в продакшене',
          });
        }

        // Проверка на базовые ошибки синтаксиса
        try {
          new Function(content);
        } catch (syntaxError) {
          errors.push({
            code: 'SYNTAX_ERROR',
            message: `Синтаксическая ошибка в ${path.relative(gamePath, jsFile)}`,
            severity: 'error',
            file: path.relative(gamePath, jsFile),
          });
        }
      }

      this.logger.debug(`✅ Проверено ${jsFiles.length} JavaScript файлов`);
      
    } catch (error) {
      warnings.push({
        code: 'JS_VALIDATION_ERROR',
        message: 'Не удалось полностью проверить JavaScript файлы',
      });
    }
  }

  private async validateAssets(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const assetsPath = path.join(gamePath, 'assets');
      
      try {
        await fs.access(assetsPath);
      } catch {
        warnings.push({
          code: 'NO_ASSETS_FOLDER',
          message: 'Папка assets не найдена',
          suggestion: 'Создайте папку assets для организации ресурсов',
        });
        return;
      }

      const assetFiles = await this.findAssetFiles(assetsPath);
      let totalAssetsSize = 0;

      for (const assetFile of assetFiles) {
        const stats = await fs.stat(assetFile);
        totalAssetsSize += stats.size;

        const ext = path.extname(assetFile).toLowerCase();
        
        // Проверка поддерживаемых форматов
        if (!config.yandexGames.supportedFormats.some(format => ext.includes(format))) {
          warnings.push({
            code: 'UNSUPPORTED_FORMAT',
            message: `Файл ${path.relative(gamePath, assetFile)} имеет неподдерживаемый формат`,
            suggestion: `Используйте форматы: ${config.yandexGames.supportedFormats.join(', ')}`,
          });
        }

        // Проверка размера отдельных файлов
        if (stats.size > 5 * 1024 * 1024) { // 5MB
          warnings.push({
            code: 'LARGE_ASSET',
            message: `Файл ${path.relative(gamePath, assetFile)} слишком большой (${this.formatSize(stats.size)})`,
            suggestion: 'Оптимизируйте крупные ассеты',
          });
        }
      }

      this.logger.debug(`✅ Проверено ${assetFiles.length} файлов ассетов, общий размер: ${this.formatSize(totalAssetsSize)}`);
      
    } catch (error) {
      warnings.push({
        code: 'ASSETS_VALIDATION_ERROR',
        message: 'Не удалось полностью проверить ассеты',
      });
    }
  }

  private async validateYandexSDK(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const jsFiles = await this.findJavaScriptFiles(gamePath);
      let sdkFound = false;
      
      for (const jsFile of jsFiles) {
        const content = await fs.readFile(jsFile, 'utf-8');
        
        if (content.includes('YaGames') || content.includes('ysdk')) {
          sdkFound = true;
          
          // Проверка инициализации SDK
          if (!content.includes('YaGames.init()')) {
            warnings.push({
              code: 'SDK_NOT_INITIALIZED',
              message: 'Yandex Games SDK не инициализирован',
              suggestion: 'Добавьте await YaGames.init() в начале игры',
            });
          }

          break;
        }
      }

      if (!sdkFound) {
        errors.push({
          code: 'SDK_NOT_USED',
          message: 'Yandex Games SDK не используется в коде',
          severity: 'error',
        });
      }

      this.logger.debug(`✅ Проверка Yandex SDK: ${sdkFound ? 'найден' : 'не найден'}`);
      
    } catch (error) {
      warnings.push({
        code: 'SDK_VALIDATION_ERROR',
        message: 'Не удалось проверить интеграцию Yandex SDK',
      });
    }
  }

  private async validateSecurity(
    gamePath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const jsFiles = await this.findJavaScriptFiles(gamePath);
      
      for (const jsFile of jsFiles) {
        const content = await fs.readFile(jsFile, 'utf-8');
        
        // Проверка на потенциально опасные функции
        const dangerousPatterns = [
          { pattern: /document\.write\s*\(/g, code: 'DOCUMENT_WRITE', message: 'Использование document.write может быть небезопасно' },
          { pattern: /innerHTML\s*=\s*[^"'][^;]+/g, code: 'UNSAFE_INNERHTML', message: 'Небезопасное использование innerHTML' },
          { pattern: /window\.open\s*\(/g, code: 'WINDOW_OPEN', message: 'Использование window.open может быть заблокировано' },
        ];

        for (const { pattern, code, message } of dangerousPatterns) {
          if (pattern.test(content)) {
            warnings.push({
              code,
              message,
              suggestion: 'Используйте более безопасные альтернативы',
            });
          }
        }
      }

      this.logger.debug('✅ Проверка безопасности завершена');
      
    } catch (error) {
      warnings.push({
        code: 'SECURITY_VALIDATION_ERROR',
        message: 'Не удалось полностью проверить безопасность',
      });
    }
  }

  // Вспомогательные методы

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await this.calculateDirectorySize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  private async findJavaScriptFiles(dirPath: string): Promise<string[]> {
    const jsFiles: string[] = [];
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        jsFiles.push(...await this.findJavaScriptFiles(itemPath));
      } else if (path.extname(item.name).toLowerCase() === '.js') {
        jsFiles.push(itemPath);
      }
    }
    
    return jsFiles;
  }

  private async findAssetFiles(dirPath: string): Promise<string[]> {
    const assetFiles: string[] = [];
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.ogg', '.mp3', '.wav'];
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        assetFiles.push(...await this.findAssetFiles(itemPath));
      } else if (assetExtensions.includes(path.extname(item.name).toLowerCase())) {
        assetFiles.push(itemPath);
      }
    }
    
    return assetFiles;
  }

  private formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
} 