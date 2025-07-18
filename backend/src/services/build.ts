import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { LoggerService } from './logger';
import { BuildResult, GameManifest, ManifestFile, FileStructure, GameDesign } from '@/types';
import config from '@/config';

interface BuildRequest {
  gameId: string;
  structure: FileStructure;
  code: { [filename: string]: string };
  assets: { [path: string]: Buffer };
  gameDesign: GameDesign;
  outputPath: string;
}

export class BuildService {
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  public async build(request: BuildRequest): Promise<BuildResult> {
    const { gameId, structure, code, assets, gameDesign, outputPath } = request;
    const startTime = Date.now();

    try {
      this.logger.info(`🔨 Начата сборка игры ${gameId}`);

      // Создаем выходную директорию
      await this.ensureDirectory(outputPath);

      // Создаем структуру директорий
      await this.createDirectoryStructure(outputPath, structure);

      // Записываем файлы кода
      const codeFiles = await this.writeCodeFiles(outputPath, code);

      // Записываем ассеты
      const assetFiles = await this.writeAssetFiles(outputPath, assets);

      // Объединяем все файлы
      const allFiles = [...codeFiles, ...assetFiles];

      // Создаем манифест
      const manifest = await this.createManifest(gameDesign, allFiles);
      await this.writeFile(path.join(outputPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Оптимизируем файлы если необходимо
      if (config.optimization.codeMinification) {
        await this.optimizeFiles(outputPath);
      }

      // Вычисляем размер сборки
      const buildSize = await this.calculateBuildSize(outputPath);

      const duration = Date.now() - startTime;
      this.logger.info(`✅ Сборка игры ${gameId} завершена за ${duration}ms`, {
        size: this.formatSize(buildSize),
        files: allFiles.length,
      });

      return {
        success: true,
        outputPath,
        size: buildSize,
        warnings: [],
        errors: [],
        manifest,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Ошибка сборки игры ${gameId}:`, error);

      return {
        success: false,
        outputPath,
        size: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка сборки'],
        manifest: {
          name: gameDesign.title,
          version: '1.0.0',
          description: gameDesign.description,
          author: 'AI Game Generator',
          files: [],
          requirements: {
            yandexSDK: config.yandexGames.requiredSDKVersion,
          },
        },
      };
    }
  }

  private async createDirectoryStructure(basePath: string, structure: FileStructure): Promise<void> {
    for (const [key, value] of Object.entries(structure)) {
      const fullPath = path.join(basePath, key);

      if (typeof value === 'object' && value !== null) {
        // Это директория
        await this.ensureDirectory(fullPath);
        await this.createDirectoryStructure(fullPath, value as FileStructure);
      }
      // Файлы будут созданы позже
    }
  }

  private async writeCodeFiles(basePath: string, code: { [filename: string]: string }): Promise<ManifestFile[]> {
    const files: ManifestFile[] = [];

    for (const [filename, content] of Object.entries(code)) {
      const filePath = path.join(basePath, filename);
      
      // Убеждаемся что директория существует
      await this.ensureDirectory(path.dirname(filePath));
      
      // Записываем файл
      await this.writeFile(filePath, content);
      
      // Добавляем в манифест
      const stats = await fs.stat(filePath);
      files.push({
        path: filename,
        size: stats.size,
        type: this.getFileType(filename),
        hash: this.calculateHash(content),
      });

      this.logger.fileOperation('create', filename, stats.size);
    }

    return files;
  }

  private async writeAssetFiles(basePath: string, assets: { [path: string]: Buffer }): Promise<ManifestFile[]> {
    const files: ManifestFile[] = [];

    for (const [assetPath, buffer] of Object.entries(assets)) {
      const filePath = path.join(basePath, assetPath);
      
      // Убеждаемся что директория существует
      await this.ensureDirectory(path.dirname(filePath));
      
      // Записываем файл
      await fs.writeFile(filePath, buffer);
      
      // Добавляем в манифест
      files.push({
        path: assetPath,
        size: buffer.length,
        type: this.getFileType(assetPath),
        hash: this.calculateHash(buffer),
      });

      this.logger.fileOperation('create', assetPath, buffer.length);
    }

    return files;
  }

  private async createManifest(gameDesign: GameDesign, files: ManifestFile[]): Promise<GameManifest> {
    return {
      name: gameDesign.title,
      version: '1.0.0',
      description: gameDesign.description,
      author: 'AI Game Generator',
      files,
      requirements: {
        yandexSDK: config.yandexGames.requiredSDKVersion,
      },
    };
  }

  private async optimizeFiles(buildPath: string): Promise<void> {
    this.logger.info('🚀 Начата оптимизация файлов...');

    try {
      // Оптимизация JavaScript файлов
      await this.optimizeJavaScriptFiles(buildPath);
      
      // Оптимизация CSS файлов
      await this.optimizeCSSFiles(buildPath);
      
      // Оптимизация изображений
      if (config.optimization.assetOptimization) {
        await this.optimizeImageFiles(buildPath);
      }

      this.logger.info('✅ Оптимизация файлов завершена');
    } catch (error) {
      this.logger.warn('⚠️ Ошибка оптимизации файлов:', error);
    }
  }

  private async optimizeJavaScriptFiles(buildPath: string): Promise<void> {
    const jsFiles = await this.findFiles(buildPath, '.js');
    
    for (const jsFile of jsFiles) {
      try {
        const content = await fs.readFile(jsFile, 'utf-8');
        const optimized = this.minifyJavaScript(content);
        await fs.writeFile(jsFile, optimized);
        
        this.logger.debug(`Оптимизирован JS файл: ${path.relative(buildPath, jsFile)}`);
      } catch (error) {
        this.logger.warn(`Ошибка оптимизации ${jsFile}:`, error);
      }
    }
  }

  private async optimizeCSSFiles(buildPath: string): Promise<void> {
    const cssFiles = await this.findFiles(buildPath, '.css');
    
    for (const cssFile of cssFiles) {
      try {
        const content = await fs.readFile(cssFile, 'utf-8');
        const optimized = this.minifyCSS(content);
        await fs.writeFile(cssFile, optimized);
        
        this.logger.debug(`Оптимизирован CSS файл: ${path.relative(buildPath, cssFile)}`);
      } catch (error) {
        this.logger.warn(`Ошибка оптимизации ${cssFile}:`, error);
      }
    }
  }

  private async optimizeImageFiles(buildPath: string): Promise<void> {
    // Здесь можно добавить оптимизацию изображений с помощью sharp
    // Пока просто логируем
    const imageFiles = await this.findFiles(buildPath, ['.png', '.jpg', '.jpeg']);
    this.logger.debug(`Найдено ${imageFiles.length} изображений для потенциальной оптимизации`);
  }

  private minifyJavaScript(code: string): string {
    // Простая минификация JavaScript
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем многострочные комментарии
      .replace(/\/\/.*$/gm, '')          // Удаляем однострочные комментарии
      .replace(/\s+/g, ' ')              // Заменяем множественные пробелы на один
      .replace(/;\s*}/g, '}')            // Убираем лишние точки с запятой
      .replace(/\s*{\s*/g, '{')          // Убираем пробелы вокруг скобок
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';')
      .trim();
  }

  private minifyCSS(css: string): string {
    // Простая минификация CSS
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем комментарии
      .replace(/\s+/g, ' ')              // Заменяем множественные пробелы
      .replace(/\s*{\s*/g, '{')          // Убираем пробелы вокруг скобок
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')          // Убираем пробелы вокруг двоеточий
      .replace(/\s*;\s*/g, ';')          // Убираем пробелы вокруг точек с запятой
      .replace(/;\s*}/g, '}')            // Убираем последнюю точку с запятой
      .trim();
  }

  private async calculateBuildSize(buildPath: string): Promise<number> {
    let totalSize = 0;
    
    const items = await fs.readdir(buildPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(buildPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await this.calculateBuildSize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  private async findFiles(dir: string, extensions: string | string[]): Promise<string[]> {
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    const files: string[] = [];
    
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...await this.findFiles(itemPath, exts));
      } else if (exts.some(ext => item.name.toLowerCase().endsWith(ext))) {
        files.push(itemPath);
      }
    }
    
    return files;
  }

  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const typeMap: { [key: string]: string } = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
    };
    
    return typeMap[ext] || 'application/octet-stream';
  }

  private calculateHash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Игнорируем ошибку если директория уже существует
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      this.logger.error(`Ошибка записи файла ${filePath}:`, error);
      throw error;
    }
  }

  private formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Методы для проверки качества сборки
  public async validateBuild(buildPath: string): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Проверяем наличие обязательных файлов
      const requiredFiles = ['index.html', 'manifest.json'];
      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(buildPath, file));
        } catch {
          issues.push(`Отсутствует обязательный файл: ${file}`);
        }
      }

      // Проверяем размер сборки
      const size = await this.calculateBuildSize(buildPath);
      if (size > config.yandexGames.maxSize) {
        issues.push(`Размер сборки (${this.formatSize(size)}) превышает лимит (${this.formatSize(config.yandexGames.maxSize)})`);
      }

      // Проверяем валидность JSON файлов
      const jsonFiles = await this.findFiles(buildPath, '.json');
      for (const jsonFile of jsonFiles) {
        try {
          const content = await fs.readFile(jsonFile, 'utf-8');
          JSON.parse(content);
        } catch {
          issues.push(`Невалидный JSON файл: ${path.relative(buildPath, jsonFile)}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
      };

    } catch (error) {
      issues.push(`Ошибка валидации сборки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      return {
        isValid: false,
        issues,
      };
    }
  }
} 