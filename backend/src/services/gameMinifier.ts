import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { minify as terserMinify } from 'terser';
import { minify as htmlMinify } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import { LoggerService } from './logger';
import config from '@/config';

interface MinificationOptions {
  javascript: {
    enabled: boolean;
    removeConsole: boolean;
    removeDebugger: boolean;
    mangle: boolean;
    compress: boolean;
    sourceMap: boolean;
  };
  css: {
    enabled: boolean;
    level: 1 | 2;
    removeUnused: boolean;
    compatibility: string;
  };
  html: {
    enabled: boolean;
    removeComments: boolean;
    collapseWhitespace: boolean;
    removeEmptyAttributes: boolean;
    minifyCSS: boolean;
    minifyJS: boolean;
  };
  assets: {
    enabled: boolean;
    imageCompression: boolean;
    audioCompression: boolean;
  };
}

interface MinificationReport {
  originalSize: number;
  minifiedSize: number;
  compressionRatio: number;
  savings: number;
  savingsPercentage: number;
  files: {
    [filePath: string]: FileMinificationResult;
  };
  duration: number;
  warnings: string[];
  errors: string[];
}

interface FileMinificationResult {
  originalSize: number;
  minifiedSize: number;
  compressionRatio: number;
  type: 'javascript' | 'css' | 'html' | 'asset' | 'unchanged';
  warnings: string[];
  errors: string[];
}

interface ArchiveOptions {
  format: 'zip' | 'tar.gz';
  compression: 'store' | 'deflate' | 'gzip';
  level: number; // 0-9
  includeSourceMaps: boolean;
  generateChecksum: boolean;
  optimize: boolean;
  excludePatterns: string[];
}

interface ArchiveReport {
  outputPath: string;
  originalSize: number;
  archiveSize: number;
  compressionRatio: number;
  files: number;
  checksum?: string;
  structure: ArchiveStructure;
  warnings: string[];
}

interface ArchiveStructure {
  root: string;
  directories: string[];
  files: string[];
  assets: {
    images: string[];
    audio: string[];
    fonts: string[];
    other: string[];
  };
}

export class GameMinifier {
  private logger = LoggerService.getInstance();
  private defaultOptions: MinificationOptions = {
    javascript: {
      enabled: true,
      removeConsole: true,
      removeDebugger: true,
      mangle: true,
      compress: true,
      sourceMap: false
    },
    css: {
      enabled: true,
      level: 2,
      removeUnused: false,
      compatibility: 'ie8'
    },
    html: {
      enabled: true,
      removeComments: true,
      collapseWhitespace: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
      minifyJS: true
    },
    assets: {
      enabled: true,
      imageCompression: true,
      audioCompression: true
    }
  };

  /**
   * Полная минификация игры
   */
  async minifyGame(
    sourcePath: string,
    outputPath: string,
    options: Partial<MinificationOptions> = {}
  ): Promise<MinificationReport> {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };
    
    this.logger.info(`🗜️ Начинаю минификацию игры: ${sourcePath} -> ${outputPath}`);

    // Создаем выходную директорию
    await fs.mkdir(outputPath, { recursive: true });

    const report: MinificationReport = {
      originalSize: 0,
      minifiedSize: 0,
      compressionRatio: 0,
      savings: 0,
      savingsPercentage: 0,
      files: {},
      duration: 0,
      warnings: [],
      errors: []
    };

    try {
      const files = await this.getAllFiles(sourcePath);
      
      // Обрабатываем каждый файл
      for (const file of files) {
        const relativePath = file.replace(sourcePath, '');
        const outputFilePath = join(outputPath, relativePath);
        
        // Создаем директорию для файла
        await fs.mkdir(dirname(outputFilePath), { recursive: true });
        
        const fileResult = await this.processFile(file, outputFilePath, finalOptions);
        report.files[relativePath] = fileResult;
        
        report.originalSize += fileResult.originalSize;
        report.minifiedSize += fileResult.minifiedSize;
        
        // Собираем предупреждения и ошибки
        report.warnings.push(...fileResult.warnings);
        report.errors.push(...fileResult.errors);
      }

      // Вычисляем статистику
      report.savings = report.originalSize - report.minifiedSize;
      report.compressionRatio = report.originalSize > 0 ? report.minifiedSize / report.originalSize : 1;
      report.savingsPercentage = report.originalSize > 0 ? (report.savings / report.originalSize) * 100 : 0;
      report.duration = Date.now() - startTime;

      this.logger.info(`✅ Минификация завершена. Экономия: ${(report.savingsPercentage).toFixed(1)}% (${this.formatBytes(report.savings)})`);

    } catch (error) {
      this.logger.error('❌ Ошибка минификации:', error);
      report.errors.push(`Общая ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
  }

  /**
   * Обработка отдельного файла
   */
  private async processFile(
    inputPath: string,
    outputPath: string,
    options: MinificationOptions
  ): Promise<FileMinificationResult> {
    const result: FileMinificationResult = {
      originalSize: 0,
      minifiedSize: 0,
      compressionRatio: 1,
      type: 'unchanged',
      warnings: [],
      errors: []
    };

    try {
      const stat = await fs.stat(inputPath);
      result.originalSize = stat.size;

      const ext = extname(inputPath).toLowerCase();
      const content = await fs.readFile(inputPath, 'utf-8');

      let processedContent = content;
      let wasProcessed = false;

      // JavaScript минификация
      if (['.js', '.mjs'].includes(ext) && options.javascript.enabled) {
        try {
          const minifyResult = await terserMinify(content, {
            compress: options.javascript.compress ? {
              drop_console: options.javascript.removeConsole,
              drop_debugger: options.javascript.removeDebugger,
              dead_code: true,
              unused: true
            } : false,
            mangle: options.javascript.mangle,
            sourceMap: options.javascript.sourceMap,
            format: {
              comments: false
            }
          });

          if (minifyResult.code) {
            processedContent = minifyResult.code;
            result.type = 'javascript';
            wasProcessed = true;

            if (minifyResult.warnings) {
              result.warnings.push(...minifyResult.warnings);
            }
          }
        } catch (error) {
          result.errors.push(`JS минификация: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.warnings.push('Используется оригинальный JS файл');
        }
      }

      // CSS минификация
      else if (ext === '.css' && options.css.enabled) {
        try {
          const cleanCSS = new CleanCSS({
            level: options.css.level,
            compatibility: options.css.compatibility,
            returnPromise: false
          });

          const minifyResult = cleanCSS.minify(content);

          if (minifyResult.styles) {
            processedContent = minifyResult.styles;
            result.type = 'css';
            wasProcessed = true;

            if (minifyResult.warnings.length > 0) {
              result.warnings.push(...minifyResult.warnings);
            }

            if (minifyResult.errors.length > 0) {
              result.errors.push(...minifyResult.errors);
            }
          }
        } catch (error) {
          result.errors.push(`CSS минификация: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.warnings.push('Используется оригинальный CSS файл');
        }
      }

      // HTML минификация
      else if (['.html', '.htm'].includes(ext) && options.html.enabled) {
        try {
          processedContent = await htmlMinify(content, {
            removeComments: options.html.removeComments,
            collapseWhitespace: options.html.collapseWhitespace,
            removeEmptyAttributes: options.html.removeEmptyAttributes,
            minifyCSS: options.html.minifyCSS,
            minifyJS: options.html.minifyJS,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true
          });

          result.type = 'html';
          wasProcessed = true;
        } catch (error) {
          result.errors.push(`HTML минификация: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.warnings.push('Используется оригинальный HTML файл');
        }
      }

      // Для остальных файлов просто копируем
      if (!wasProcessed) {
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext) ||
            ['.mp3', '.ogg', '.wav', '.m4a', '.flac'].includes(ext) ||
            ['.woff', '.woff2', '.ttf', '.otf'].includes(ext) ||
            ['.json', '.txt', '.md'].includes(ext)) {
          // Копируем бинарные файлы или файлы без минификации
          await fs.copyFile(inputPath, outputPath);
          result.minifiedSize = result.originalSize;
          result.type = 'unchanged';
          return result;
        }
      }

      // Записываем обработанный контент
      await fs.writeFile(outputPath, processedContent);
      
      const minifiedStat = await fs.stat(outputPath);
      result.minifiedSize = minifiedStat.size;
      result.compressionRatio = result.originalSize > 0 ? result.minifiedSize / result.originalSize : 1;

    } catch (error) {
      result.errors.push(`Обработка файла: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // В случае ошибки копируем оригинальный файл
      try {
        await fs.copyFile(inputPath, outputPath);
        result.minifiedSize = result.originalSize;
      } catch (copyError) {
        result.errors.push(`Копирование файла: ${copyError instanceof Error ? copyError.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Создание архива игры
   */
  async createGameArchive(
    gamePath: string,
    outputPath: string,
    options: Partial<ArchiveOptions> = {}
  ): Promise<ArchiveReport> {
    const defaultArchiveOptions: ArchiveOptions = {
      format: 'zip',
      compression: 'deflate',
      level: 6,
      includeSourceMaps: false,
      generateChecksum: true,
      optimize: true,
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        '**/.DS_Store',
        '**/thumbs.db',
        '**/*.log',
        '**/*.tmp'
      ]
    };

    const finalOptions = { ...defaultArchiveOptions, ...options };
    
    this.logger.info(`📦 Создаю архив игры: ${gamePath} -> ${outputPath}`);

    const report: ArchiveReport = {
      outputPath,
      originalSize: 0,
      archiveSize: 0,
      compressionRatio: 0,
      files: 0,
      structure: {
        root: basename(gamePath),
        directories: [],
        files: [],
        assets: {
          images: [],
          audio: [],
          fonts: [],
          other: []
        }
      },
      warnings: []
    };

    return new Promise((resolve, reject) => {
      try {
        // Создаем архиватор
        const archive = archiver(finalOptions.format === 'zip' ? 'zip' : 'tar', {
          zlib: { level: finalOptions.level },
          gzip: finalOptions.format === 'tar.gz'
        });

        const output = createWriteStream(outputPath);

        // Обработчики событий
        output.on('close', async () => {
          try {
            const archiveStat = await fs.stat(outputPath);
            report.archiveSize = archiveStat.size;
            report.compressionRatio = report.originalSize > 0 ? report.archiveSize / report.originalSize : 1;

            // Генерируем контрольную сумму если требуется
            if (finalOptions.generateChecksum) {
              report.checksum = await this.generateChecksum(outputPath);
            }

            this.logger.info(`✅ Архив создан: ${this.formatBytes(report.archiveSize)} (компрессия: ${(report.compressionRatio * 100).toFixed(1)}%)`);
            resolve(report);
          } catch (error) {
            reject(error);
          }
        });

        output.on('error', (error) => {
          this.logger.error('❌ Ошибка создания архива:', error);
          reject(error);
        });

        archive.on('warning', (warning) => {
          this.logger.warn('⚠️ Предупреждение архивации:', warning);
          report.warnings.push(warning.message || warning.toString());
        });

        archive.on('error', (error) => {
          this.logger.error('❌ Ошибка архивации:', error);
          reject(error);
        });

        // Подключаем поток
        archive.pipe(output);

        // Добавляем файлы в архив
        this.addFilesToArchive(archive, gamePath, finalOptions, report)
          .then(() => {
            archive.finalize();
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Добавление файлов в архив
   */
  private async addFilesToArchive(
    archive: archiver.Archiver,
    sourcePath: string,
    options: ArchiveOptions,
    report: ArchiveReport
  ): Promise<void> {
    const files = await this.getAllFiles(sourcePath);
    
    for (const file of files) {
      const relativePath = file.replace(sourcePath + '/', '');
      
      // Проверяем исключения
      const shouldExclude = options.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(relativePath);
      });

      if (shouldExclude) {
        continue;
      }

      // Проверяем source maps
      if (!options.includeSourceMaps && file.endsWith('.map')) {
        continue;
      }

      try {
        const stat = await fs.stat(file);
        report.originalSize += stat.size;
        report.files++;

        // Добавляем в структуру архива
        const ext = extname(file).toLowerCase();
        
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
          report.structure.assets.images.push(relativePath);
        } else if (['.mp3', '.ogg', '.wav', '.m4a', '.flac'].includes(ext)) {
          report.structure.assets.audio.push(relativePath);
        } else if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
          report.structure.assets.fonts.push(relativePath);
        } else {
          if (['.js', '.css', '.html', '.json'].includes(ext)) {
            report.structure.files.push(relativePath);
          } else {
            report.structure.assets.other.push(relativePath);
          }
        }

        // Добавляем файл в архив
        archive.file(file, { name: relativePath });

      } catch (error) {
        report.warnings.push(`Не удалось добавить файл ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Собираем директории
    const directories = new Set<string>();
    report.structure.files.forEach(f => {
      const dir = dirname(f);
      if (dir !== '.' && dir !== '/') {
        directories.add(dir);
      }
    });
    report.structure.directories = Array.from(directories);
  }

  /**
   * Создание production-ready архива с оптимизацией
   */
  async createProductionArchive(
    sourcePath: string,
    outputPath: string,
    options: {
      minify?: boolean;
      optimize?: boolean;
      includeManifest?: boolean;
      targetPlatform?: 'yandex' | 'web' | 'mobile';
    } = {}
  ): Promise<{ minificationReport?: MinificationReport; archiveReport: ArchiveReport }> {
    const { 
      minify = true, 
      optimize = true, 
      includeManifest = true,
      targetPlatform = 'yandex'
    } = options;

    let minificationReport: MinificationReport | undefined;

    // Временная директория для обработки
    const tempDir = join(dirname(outputPath), `temp_${Date.now()}`);
    
    try {
      // Этап 1: Минификация (если требуется)
      if (minify) {
        this.logger.info('🗜️ Этап 1: Минификация файлов...');
        
        const minifyOptions: MinificationOptions = {
          javascript: {
            enabled: true,
            removeConsole: targetPlatform === 'yandex',
            removeDebugger: true,
            mangle: true,
            compress: true,
            sourceMap: false
          },
          css: {
            enabled: true,
            level: 2,
            removeUnused: optimize,
            compatibility: 'ie8'
          },
          html: {
            enabled: true,
            removeComments: true,
            collapseWhitespace: true,
            removeEmptyAttributes: true,
            minifyCSS: true,
            minifyJS: true
          },
          assets: {
            enabled: optimize,
            imageCompression: optimize,
            audioCompression: optimize
          }
        };

        minificationReport = await this.minifyGame(sourcePath, tempDir, minifyOptions);
      } else {
        // Просто копируем файлы
        await this.copyDirectory(sourcePath, tempDir);
      }

      // Этап 2: Добавление манифеста (если требуется)
      if (includeManifest && targetPlatform === 'yandex') {
        this.logger.info('📋 Этап 2: Генерация манифеста для Яндекс Игр...');
        await this.generateYandexManifest(tempDir);
      }

      // Этап 3: Создание архива
      this.logger.info('📦 Этап 3: Создание production архива...');
      
      const archiveOptions: ArchiveOptions = {
        format: 'zip',
        compression: 'deflate',
        level: 9, // Максимальное сжатие для production
        includeSourceMaps: false,
        generateChecksum: true,
        optimize: true,
        excludePatterns: [
          'node_modules/**',
          '.git/**',
          '**/.DS_Store',
          '**/thumbs.db',
          '**/*.log',
          '**/*.tmp',
          '**/*.map' // Исключаем source maps в production
        ]
      };

      const archiveReport = await this.createGameArchive(tempDir, outputPath, archiveOptions);

      return { minificationReport, archiveReport };

    } finally {
      // Очищаем временную директорию
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn('⚠️ Не удалось очистить временную директорию:', cleanupError);
      }
    }
  }

  /**
   * Генерация простого манифеста для архива
   */
  private async generateYandexManifest(gamePath: string): Promise<void> {
    const manifest = {
      name: "Generated Game",
      version: "1.0.0",
      description: "Game generated by AI Game IDE",
      orientation: "landscape",
      background_color: "#000000",
      theme_color: "#4285f4",
      build_timestamp: new Date().toISOString(),
      optimized: true
    };

    const manifestPath = join(gamePath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Копирование директории
   */
  private async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(source, entry.name);
      const destPath = join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
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
   * Генерация контрольной суммы файла
   */
  private async generateChecksum(filePath: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Форматирование размера в читаемом виде
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Получение статистики минификации
   */
  getMinificationStats(report: MinificationReport): {
    totalFiles: number;
    processedFiles: number;
    skippedFiles: number;
    errorFiles: number;
    avgCompressionRatio: number;
    bestCompression: { file: string; ratio: number };
    worstCompression: { file: string; ratio: number };
  } {
    const files = Object.entries(report.files);
    const processedFiles = files.filter(([_, result]) => result.type !== 'unchanged');
    const errorFiles = files.filter(([_, result]) => result.errors.length > 0);
    
    let totalRatio = 0;
    let bestRatio = 1;
    let worstRatio = 0;
    let bestFile = '';
    let worstFile = '';

    for (const [filePath, result] of processedFiles) {
      totalRatio += result.compressionRatio;
      
      if (result.compressionRatio < bestRatio) {
        bestRatio = result.compressionRatio;
        bestFile = filePath;
      }
      
      if (result.compressionRatio > worstRatio) {
        worstRatio = result.compressionRatio;
        worstFile = filePath;
      }
    }

    return {
      totalFiles: files.length,
      processedFiles: processedFiles.length,
      skippedFiles: files.length - processedFiles.length,
      errorFiles: errorFiles.length,
      avgCompressionRatio: processedFiles.length > 0 ? totalRatio / processedFiles.length : 1,
      bestCompression: { file: bestFile, ratio: bestRatio },
      worstCompression: { file: worstFile, ratio: worstRatio }
    };
  }
}

// Singleton экземпляр
export const gameMinifier = new GameMinifier();
export default gameMinifier; 