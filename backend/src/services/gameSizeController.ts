import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { EventEmitter } from 'events';
import sharp from 'sharp';
import archiver from 'archiver';
import { LoggerService } from './logger';
import config from '@/config';

interface GameSizeReport {
  totalSize: number;
  totalSizeMB: number;
  files: GameFileInfo[];
  breakdown: {
    html: number;
    javascript: number;
    css: number;
    images: number;
    audio: number;
    other: number;
  };
  compliance: {
    passesYandexLimit: boolean;
    yandexLimitMB: number;
    recommendedSizeMB: number;
    compressionSavings?: number;
  };
  optimization: OptimizationSuggestion[];
}

interface GameFileInfo {
  path: string;
  size: number;
  sizeMB: number;
  type: FileType;
  canOptimize: boolean;
  optimizedSize?: number;
  compressionRatio?: number;
}

interface OptimizationSuggestion {
  type: 'image_compression' | 'code_minification' | 'file_removal' | 'format_conversion' | 'audio_compression';
  description: string;
  estimatedSavings: number;
  priority: 'high' | 'medium' | 'low';
  files: string[];
  autoFixable: boolean;
}

type FileType = 'html' | 'javascript' | 'css' | 'image' | 'audio' | 'other';

interface CompressionOptions {
  images: {
    enabled: boolean;
    quality: number;
    format?: 'webp' | 'jpeg' | 'png';
    maxWidth?: number;
    maxHeight?: number;
  };
  audio: {
    enabled: boolean;
    format: 'ogg' | 'mp3';
    bitrate: number;
  };
  code: {
    enabled: boolean;
    minifyJS: boolean;
    minifyCSS: boolean;
    removeComments: boolean;
  };
}

interface YandexGamesManifest {
  // Основная информация
  name: string;
  version: string;
  description: string;
  author: string;
  
  // Технические параметры
  orientation: 'portrait' | 'landscape' | 'any';
  background_color: string;
  theme_color: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui';
  
  // Размеры и производительность
  size: {
    total: number;
    recommended: number;
    assets: number;
    code: number;
  };
  
  // Ресурсы
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  
  // Игровые возможности
  features: {
    leaderboards: boolean;
    achievements: boolean;
    payments: boolean;
    advertising: boolean;
    social: boolean;
    cloud_saves: boolean;
  };
  
  // Системные требования
  requirements: {
    min_memory: string;
    min_storage: string;
    webgl: boolean;
    audio: boolean;
  };
  
  // Метаданные для публикации
  category: string;
  tags: string[];
  age_rating: string;
  languages: string[];
  
  // Данные сборки
  build: {
    timestamp: string;
    sdk_version: string;
    optimized: boolean;
    compressed: boolean;
  };
}

export class GameSizeController extends EventEmitter {
  private logger: LoggerService;
  private readonly YANDEX_LIMIT_MB = 100; // 100MB лимит Яндекс Игр
  private readonly RECOMMENDED_SIZE_MB = 50; // Рекомендуемый размер
  private readonly IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  private readonly AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a'];
  private readonly CODE_EXTENSIONS = ['.js', '.ts', '.css', '.html'];

  constructor() {
    super();
    this.logger = new LoggerService();
  }

  /**
   * Анализ размера игры и создание отчета
   */
  async analyzeGameSize(gamePath: string): Promise<GameSizeReport> {
    try {
      this.logger.info(`📏 Анализ размера игры: ${gamePath}`);
      
      const files = await this.getAllFiles(gamePath);
      const fileInfos: GameFileInfo[] = [];
      let totalSize = 0;

      for (const filePath of files) {
        const stat = await fs.stat(filePath);
        const relativePath = filePath.replace(gamePath, '').replace(/^\//, '');
        const fileType = this.getFileType(filePath);
        
        const fileInfo: GameFileInfo = {
          path: relativePath,
          size: stat.size,
          sizeMB: stat.size / (1024 * 1024),
          type: fileType,
          canOptimize: this.canOptimizeFile(filePath, fileType)
        };

        fileInfos.push(fileInfo);
        totalSize += stat.size;
      }

      const totalSizeMB = totalSize / (1024 * 1024);
      const breakdown = this.calculateBreakdown(fileInfos);
      const compliance = this.checkCompliance(totalSizeMB);
      const optimization = await this.generateOptimizationSuggestions(fileInfos, gamePath);

      const report: GameSizeReport = {
        totalSize,
        totalSizeMB,
        files: fileInfos,
        breakdown,
        compliance,
        optimization
      };

      this.logger.info(`📊 Анализ завершен: ${totalSizeMB.toFixed(2)}MB`, {
        passesLimit: compliance.passesYandexLimit,
        optimizationsFound: optimization.length
      });

      this.emit('analysis-complete', report);
      return report;

    } catch (error) {
      this.logger.error('❌ Ошибка анализа размера игры:', error);
      throw error;
    }
  }

  /**
   * Оптимизация игры для соответствия лимитам Яндекс Игр
   */
  async optimizeForYandexGames(
    gamePath: string, 
    outputPath: string, 
    options: CompressionOptions
  ): Promise<GameSizeReport> {
    try {
      this.logger.info(`⚡ Оптимизация игры для Яндекс Игр: ${gamePath}`);
      
      // Создаем выходную директорию
      await fs.mkdir(outputPath, { recursive: true });
      
      const originalReport = await this.analyzeGameSize(gamePath);
      let totalSavings = 0;

      // Копируем и оптимизируем файлы
      for (const fileInfo of originalReport.files) {
        const sourcePath = join(gamePath, fileInfo.path);
        const destPath = join(outputPath, fileInfo.path);
        
        // Создаем директорию если нужно
        await fs.mkdir(join(destPath, '..'), { recursive: true });
        
        let optimized = false;
        let originalSize = fileInfo.size;
        
        try {
          if (fileInfo.type === 'image' && options.images.enabled && fileInfo.canOptimize) {
            await this.optimizeImage(sourcePath, destPath, options.images);
            optimized = true;
          } else if (fileInfo.type === 'audio' && options.audio.enabled && fileInfo.canOptimize) {
            await this.optimizeAudio(sourcePath, destPath, options.audio);
            optimized = true;
          } else if ((fileInfo.type === 'javascript' || fileInfo.type === 'css') && 
                     options.code.enabled && fileInfo.canOptimize) {
            await this.optimizeCode(sourcePath, destPath, fileInfo.type, options.code);
            optimized = true;
          } else {
            // Просто копируем файл
            await fs.copyFile(sourcePath, destPath);
          }
          
          // Проверяем сэкономленное место
          if (optimized) {
            const newStat = await fs.stat(destPath);
            const savings = originalSize - newStat.size;
            totalSavings += savings;
            
            this.logger.debug(`💾 Оптимизирован ${fileInfo.path}: ${this.formatSize(savings)} сэкономлено`);
          }
          
        } catch (error) {
          this.logger.warn(`⚠️ Не удалось оптимизировать ${fileInfo.path}:`, error);
          // Копируем оригинальный файл
          await fs.copyFile(sourcePath, destPath);
        }
      }

      // Создаем манифест
      await this.generateYandexManifest(outputPath, originalReport);
      
      // Анализируем оптимизированную версию
      const optimizedReport = await this.analyzeGameSize(outputPath);
      optimizedReport.compliance.compressionSavings = totalSavings;

      this.logger.info(`✅ Оптимизация завершена`, {
        originalSize: this.formatSize(originalReport.totalSize),
        optimizedSize: this.formatSize(optimizedReport.totalSize),
        savings: this.formatSize(totalSavings),
        compressionRatio: ((totalSavings / originalReport.totalSize) * 100).toFixed(1) + '%'
      });

      this.emit('optimization-complete', {
        original: originalReport,
        optimized: optimizedReport,
        savings: totalSavings
      });

      return optimizedReport;

    } catch (error) {
      this.logger.error('❌ Ошибка оптимизации игры:', error);
      throw error;
    }
  }

  /**
   * Создание архива игры для загрузки в Яндекс Игры
   */
  async createYandexGameArchive(gamePath: string, outputPath: string): Promise<string> {
    try {
      this.logger.info(`📦 Создание архива для Яндекс Игр: ${outputPath}`);
      
      // Проверяем размер перед архивированием
      const report = await this.analyzeGameSize(gamePath);
      
      if (!report.compliance.passesYandexLimit) {
        throw new Error(`Игра превышает лимит Яндекс Игр: ${report.totalSizeMB.toFixed(2)}MB > ${this.YANDEX_LIMIT_MB}MB`);
      }

      return new Promise((resolve, reject) => {
        const archive = archiver('zip', {
          zlib: { level: 9 } // Максимальное сжатие
        });

        const output = require('fs').createWriteStream(outputPath);
        
        output.on('close', () => {
          const archiveSize = archive.pointer();
          const archiveSizeMB = archiveSize / (1024 * 1024);
          
          this.logger.info(`✅ Архив создан: ${this.formatSize(archiveSize)}`, {
            files: archive.pointer(),
            compression: ((report.totalSize - archiveSize) / report.totalSize * 100).toFixed(1) + '%'
          });
          
          if (archiveSizeMB > this.YANDEX_LIMIT_MB) {
            reject(new Error(`Архив превышает лимит: ${archiveSizeMB.toFixed(2)}MB > ${this.YANDEX_LIMIT_MB}MB`));
          } else {
            resolve(outputPath);
          }
        });

        archive.on('error', reject);
        archive.pipe(output);

        // Добавляем все файлы в архив
        archive.directory(gamePath, false);
        
        // Финализируем архив
        archive.finalize();
      });

    } catch (error) {
      this.logger.error('❌ Ошибка создания архива:', error);
      throw error;
    }
  }

  /**
   * Генерация манифеста для Яндекс Игр
   */
  private async generateYandexManifest(
    gamePath: string, 
    sizeReport: GameSizeReport
  ): Promise<void> {
    try {
      const manifest: YandexGamesManifest = {
        name: "Generated Game",
        version: "1.0.0",
        description: "Game generated by AI Game IDE",
        author: "AI Game Generator",
        
        orientation: "landscape",
        background_color: "#000000",
        theme_color: "#4285f4",
        display: "fullscreen",
        
        size: {
          total: sizeReport.totalSize,
          recommended: this.RECOMMENDED_SIZE_MB * 1024 * 1024,
          assets: sizeReport.breakdown.images + sizeReport.breakdown.audio,
          code: sizeReport.breakdown.javascript + sizeReport.breakdown.css + sizeReport.breakdown.html
        },
        
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],
        
        features: {
          leaderboards: true,
          achievements: true,
          payments: false,
          advertising: true,
          social: true,
          cloud_saves: true
        },
        
        requirements: {
          min_memory: "512MB",
          min_storage: "50MB",
          webgl: true,
          audio: true
        },
        
        category: "casual",
        tags: ["html5", "browser", "mobile"],
        age_rating: "12+",
        languages: ["ru", "en"],
        
        build: {
          timestamp: new Date().toISOString(),
          sdk_version: "2.0+",
          optimized: true,
          compressed: true
        }
      };

      const manifestPath = join(gamePath, 'manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      
      this.logger.info(`📋 Манифест создан: ${manifestPath}`);

    } catch (error) {
      this.logger.error('❌ Ошибка создания манифеста:', error);
      throw error;
    }
  }

  // =================== PRIVATE METHODS ===================

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(dirPath);
    return files;
  }

  private getFileType(filePath: string): FileType {
    const ext = extname(filePath).toLowerCase();
    
    if (ext === '.html') return 'html';
    if (['.js', '.ts'].includes(ext)) return 'javascript';
    if (ext === '.css') return 'css';
    if (this.IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (this.AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    
    return 'other';
  }

  private canOptimizeFile(filePath: string, fileType: FileType): boolean {
    const ext = extname(filePath).toLowerCase();
    
    switch (fileType) {
      case 'image':
        return ['.png', '.jpg', '.jpeg'].includes(ext); // SVG и GIF не оптимизируем
      case 'audio':
        return ['.wav', '.mp3'].includes(ext);
      case 'javascript':
      case 'css':
        return true;
      default:
        return false;
    }
  }

  private calculateBreakdown(files: GameFileInfo[]) {
    const breakdown = {
      html: 0,
      javascript: 0,
      css: 0,
      images: 0,
      audio: 0,
      other: 0
    };

    for (const file of files) {
      switch (file.type) {
        case 'html':
          breakdown.html += file.size;
          break;
        case 'javascript':
          breakdown.javascript += file.size;
          break;
        case 'css':
          breakdown.css += file.size;
          break;
        case 'image':
          breakdown.images += file.size;
          break;
        case 'audio':
          breakdown.audio += file.size;
          break;
        default:
          breakdown.other += file.size;
          break;
      }
    }

    return breakdown;
  }

  private checkCompliance(totalSizeMB: number) {
    return {
      passesYandexLimit: totalSizeMB <= this.YANDEX_LIMIT_MB,
      yandexLimitMB: this.YANDEX_LIMIT_MB,
      recommendedSizeMB: this.RECOMMENDED_SIZE_MB
    };
  }

  private async generateOptimizationSuggestions(
    files: GameFileInfo[], 
    gamePath: string
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Анализ изображений
    const imageFiles = files.filter(f => f.type === 'image' && f.canOptimize);
    if (imageFiles.length > 0) {
      const totalImageSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
      const estimatedSavings = totalImageSize * 0.3; // Примерно 30% экономии

      suggestions.push({
        type: 'image_compression',
        description: `Сжатие ${imageFiles.length} изображений может сэкономить ~${this.formatSize(estimatedSavings)}`,
        estimatedSavings,
        priority: estimatedSavings > 1024 * 1024 ? 'high' : 'medium', // > 1MB
        files: imageFiles.map(f => f.path),
        autoFixable: true
      });
    }

    // Анализ кода
    const codeFiles = files.filter(f => f.type === 'javascript' || f.type === 'css');
    if (codeFiles.length > 0) {
      const totalCodeSize = codeFiles.reduce((sum, f) => sum + f.size, 0);
      const estimatedSavings = totalCodeSize * 0.2; // Примерно 20% экономии

      suggestions.push({
        type: 'code_minification',
        description: `Минификация ${codeFiles.length} файлов кода может сэкономить ~${this.formatSize(estimatedSavings)}`,
        estimatedSavings,
        priority: estimatedSavings > 512 * 1024 ? 'high' : 'medium', // > 512KB
        files: codeFiles.map(f => f.path),
        autoFixable: true
      });
    }

    // Анализ аудио
    const audioFiles = files.filter(f => f.type === 'audio' && f.canOptimize);
    if (audioFiles.length > 0) {
      const totalAudioSize = audioFiles.reduce((sum, f) => sum + f.size, 0);
      const estimatedSavings = totalAudioSize * 0.4; // Примерно 40% экономии

      suggestions.push({
        type: 'audio_compression',
        description: `Конвертация ${audioFiles.length} аудиофайлов в OGG может сэкономить ~${this.formatSize(estimatedSavings)}`,
        estimatedSavings,
        priority: estimatedSavings > 2 * 1024 * 1024 ? 'high' : 'medium', // > 2MB
        files: audioFiles.map(f => f.path),
        autoFixable: true
      });
    }

    // Поиск больших файлов
    const largeFiles = files.filter(f => f.sizeMB > 5); // > 5MB
    if (largeFiles.length > 0) {
      suggestions.push({
        type: 'file_removal',
        description: `Найдены ${largeFiles.length} больших файлов, возможно их можно удалить или заменить`,
        estimatedSavings: largeFiles.reduce((sum, f) => sum + f.size, 0),
        priority: 'high',
        files: largeFiles.map(f => f.path),
        autoFixable: false
      });
    }

    // Сортируем по приоритету и размеру экономии
    suggestions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      
      if (priorityDiff === 0) {
        return b.estimatedSavings - a.estimatedSavings;
      }
      
      return priorityDiff;
    });

    return suggestions;
  }

  private async optimizeImage(
    sourcePath: string, 
    destPath: string, 
    options: CompressionOptions['images']
  ): Promise<void> {
    try {
      let sharpInstance = sharp(sourcePath);

      // Изменяем размер если указано
      if (options.maxWidth || options.maxHeight) {
        sharpInstance = sharpInstance.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Выбираем формат и качество
      switch (options.format) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: options.quality });
          destPath = destPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          break;
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            compressionLevel: Math.floor(options.quality / 10),
            quality: options.quality 
          });
          break;
        default:
          // Определяем формат автоматически
          const ext = extname(sourcePath).toLowerCase();
          if (['.jpg', '.jpeg'].includes(ext)) {
            sharpInstance = sharpInstance.jpeg({ quality: options.quality });
          } else if (ext === '.png') {
            sharpInstance = sharpInstance.png({ 
              compressionLevel: Math.floor(options.quality / 10),
              quality: options.quality 
            });
          }
          break;
      }

      await sharpInstance.toFile(destPath);

    } catch (error) {
      this.logger.warn(`⚠️ Ошибка оптимизации изображения ${sourcePath}:`, error);
      // Копируем оригинал
      await fs.copyFile(sourcePath, destPath);
    }
  }

  private async optimizeAudio(
    sourcePath: string, 
    destPath: string, 
    options: CompressionOptions['audio']
  ): Promise<void> {
    try {
      // Простая конвертация формата (требует ffmpeg)
      const { spawn } = require('child_process');
      
      if (options.format === 'ogg') {
        destPath = destPath.replace(/\.(wav|mp3|m4a)$/i, '.ogg');
      }

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', sourcePath,
          '-c:a', options.format === 'ogg' ? 'libvorbis' : 'libmp3lame',
          '-b:a', `${options.bitrate}k`,
          '-y', // Перезаписывать выходной файл
          destPath
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg завершился с кодом ${code}`));
          }
        });

        ffmpeg.on('error', reject);
      });

    } catch (error) {
      this.logger.warn(`⚠️ Ошибка оптимизации аудио ${sourcePath}:`, error);
      // Копируем оригинал
      await fs.copyFile(sourcePath, destPath);
    }
  }

  private async optimizeCode(
    sourcePath: string, 
    destPath: string, 
    fileType: 'javascript' | 'css',
    options: CompressionOptions['code']
  ): Promise<void> {
    try {
      let content = await fs.readFile(sourcePath, 'utf-8');

      if (options.removeComments) {
        if (fileType === 'javascript') {
          // Удаляем комментарии JS
          content = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Многострочные комментарии
            .replace(/\/\/.*$/gm, ''); // Однострочные комментарии
        } else if (fileType === 'css') {
          // Удаляем комментарии CSS
          content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        }
      }

      if (options.minifyJS && fileType === 'javascript') {
        // Простая минификация JS
        content = content
          .replace(/\s+/g, ' ') // Убираем лишние пробелы
          .replace(/;\s*}/g, '}') // Убираем точки с запятой перед }
          .replace(/\s*{\s*/g, '{') // Убираем пробелы вокруг {
          .replace(/\s*}\s*/g, '}') // Убираем пробелы вокруг }
          .trim();
      }

      if (options.minifyCSS && fileType === 'css') {
        // Простая минификация CSS
        content = content
          .replace(/\s+/g, ' ') // Убираем лишние пробелы
          .replace(/\s*{\s*/g, '{')
          .replace(/\s*}\s*/g, '}')
          .replace(/\s*;\s*/g, ';')
          .replace(/\s*:\s*/g, ':')
          .trim();
      }

      await fs.writeFile(destPath, content);

    } catch (error) {
      this.logger.warn(`⚠️ Ошибка минификации ${sourcePath}:`, error);
      // Копируем оригинал
      await fs.copyFile(sourcePath, destPath);
    }
  }

  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  // =================== PUBLIC API ===================

  /**
   * Быстрая проверка соответствия лимитам Яндекс Игр
   */
  async checkYandexCompliance(gamePath: string): Promise<{
    compliant: boolean;
    sizeMB: number;
    limitMB: number;
    issues: string[];
  }> {
    try {
      const report = await this.analyzeGameSize(gamePath);
      const issues: string[] = [];

      if (!report.compliance.passesYandexLimit) {
        issues.push(`Размер игры превышает лимит: ${report.totalSizeMB.toFixed(2)}MB > ${this.YANDEX_LIMIT_MB}MB`);
      }

      if (report.optimization.length > 0) {
        const highPriorityOptimizations = report.optimization.filter(o => o.priority === 'high');
        if (highPriorityOptimizations.length > 0) {
          issues.push(`Найдено ${highPriorityOptimizations.length} критичных оптимизаций`);
        }
      }

      return {
        compliant: report.compliance.passesYandexLimit && issues.length === 0,
        sizeMB: report.totalSizeMB,
        limitMB: this.YANDEX_LIMIT_MB,
        issues
      };

    } catch (error) {
      this.logger.error('❌ Ошибка проверки соответствия:', error);
      throw error;
    }
  }

  /**
   * Получение рекомендуемых параметров оптимизации
   */
  getRecommendedOptimizationOptions(targetSizeMB: number = this.RECOMMENDED_SIZE_MB): CompressionOptions {
    return {
      images: {
        enabled: true,
        quality: targetSizeMB < 30 ? 70 : 80, // Более агрессивное сжатие для малых целей
        format: 'webp',
        maxWidth: targetSizeMB < 30 ? 1024 : 1920,
        maxHeight: targetSizeMB < 30 ? 768 : 1080
      },
      audio: {
        enabled: true,
        format: 'ogg',
        bitrate: targetSizeMB < 30 ? 96 : 128
      },
      code: {
        enabled: true,
        minifyJS: true,
        minifyCSS: true,
        removeComments: true
      }
    };
  }

  /**
   * Получение статистики по типам файлов
   */
  async getFileTypeStatistics(gamePath: string): Promise<{
    [key in FileType]: {
      count: number;
      totalSize: number;
      averageSize: number;
      largestFile: string;
    }
  }> {
    const report = await this.analyzeGameSize(gamePath);
    const stats = {} as any;

    const fileTypes: FileType[] = ['html', 'javascript', 'css', 'image', 'audio', 'other'];

    for (const type of fileTypes) {
      const filesOfType = report.files.filter(f => f.type === type);
      
      if (filesOfType.length > 0) {
        const totalSize = filesOfType.reduce((sum, f) => sum + f.size, 0);
        const largestFile = filesOfType.reduce((largest, current) => 
          current.size > largest.size ? current : largest
        );

        stats[type] = {
          count: filesOfType.length,
          totalSize,
          averageSize: totalSize / filesOfType.length,
          largestFile: largestFile.path
        };
      } else {
        stats[type] = {
          count: 0,
          totalSize: 0,
          averageSize: 0,
          largestFile: ''
        };
      }
    }

    return stats;
  }
}

// Singleton экземпляр
export const gameSizeController = new GameSizeController();
export default gameSizeController; 