import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import config from '@/config';
import { LoggerService } from './logger';
import { OpenAIService } from './ai/openai';
import { AssetGenerationResult, GameDesign, AssetRequirement } from '@/types';

export interface AssetOptimizationSettings {
  images: {
    format: 'auto' | 'png' | 'webp' | 'jpg';
    quality: number; // 0-100
    maxWidth: number;
    maxHeight: number;
    progressive: boolean;
    removeMetadata: boolean;
  };
  audio: {
    format: 'auto' | 'wav' | 'mp3' | 'ogg';
    bitrate: number; // kbps
    sampleRate: number;
    channels: 'mono' | 'stereo';
    normalize: boolean;
    removeMetadata: boolean;
  };
  general: {
    enableCompression: boolean;
    maxFileSize: number; // MB
    targetGameSize: number; // MB (для Yandex Games)
  };
}

export interface AssetGenerationRequest {
  gameId: string;
  gameDesign: GameDesign;
  assets: AssetRequirement[];
  optimizationSettings?: AssetOptimizationSettings;
}

export interface AssetBundle {
  sprites: { [name: string]: Buffer };
  backgrounds: { [name: string]: Buffer };
  ui: { [name: string]: Buffer };
  sounds: { [name: string]: Buffer };
  music: { [name: string]: Buffer };
  metadata: {
    totalSize: number;
    assetCount: number;
    optimizationApplied: boolean;
    compressionRatio: number;
  };
}

export class AssetGenerationService extends EventEmitter {
  private logger: LoggerService;
  private openaiService: OpenAIService;
  private activeGenerations: Map<string, AssetGenerationRequest> = new Map();
  private generationProgress: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new LoggerService();
    this.openaiService = new OpenAIService();
  }

  /**
   * Генерирует полный набор ассетов для игры
   */
  public async generateAssetBundle(
    request: AssetGenerationRequest,
    onProgress?: (progress: number, step: string, details?: any) => void
  ): Promise<AssetBundle> {
    const { gameId, gameDesign, assets, optimizationSettings } = request;
    
    this.activeGenerations.set(gameId, request);
    this.generationProgress.set(gameId, 0);

    this.logger.info(`🎨 Начинаем генерацию ассетов для игры ${gameId}`);
    this.emit('generation:started', { gameId, totalAssets: assets.length });

    try {
      const bundle: AssetBundle = {
        sprites: {},
        backgrounds: {},
        ui: {},
        sounds: {},
        music: {},
        metadata: {
          totalSize: 0,
          assetCount: 0,
          optimizationApplied: false,
          compressionRatio: 1
        }
      };

      let totalSteps = assets.length;
      let currentStep = 0;

      // Группируем ассеты по типам для более эффективной генерации
      const assetGroups = this.groupAssetsByType(assets);

      // Генерируем спрайты
      if (assetGroups.sprites.length > 0) {
        onProgress?.(this.calculateProgress(currentStep, totalSteps), 'Генерация спрайтов', { count: assetGroups.sprites.length });
        
        for (const spriteAsset of assetGroups.sprites) {
          const result = await this.generateSprite(spriteAsset, gameDesign);
          bundle.sprites[spriteAsset.name] = result.data;
          currentStep++;
          
          this.emit('asset:generated', { 
            gameId, 
            assetName: spriteAsset.name, 
            type: 'sprite',
            size: result.data.length 
          });
          
          onProgress?.(this.calculateProgress(currentStep, totalSteps), `Спрайт: ${spriteAsset.name}`);
        }
      }

      // Генерируем фоны
      if (assetGroups.backgrounds.length > 0) {
        onProgress?.(this.calculateProgress(currentStep, totalSteps), 'Генерация фонов', { count: assetGroups.backgrounds.length });
        
        for (const bgAsset of assetGroups.backgrounds) {
          const result = await this.generateBackground(bgAsset, gameDesign);
          bundle.backgrounds[bgAsset.name] = result.data;
          currentStep++;
          
          this.emit('asset:generated', { 
            gameId, 
            assetName: bgAsset.name, 
            type: 'background',
            size: result.data.length 
          });
          
          onProgress?.(this.calculateProgress(currentStep, totalSteps), `Фон: ${bgAsset.name}`);
        }
      }

      // Генерируем UI элементы
      if (assetGroups.ui.length > 0) {
        onProgress?.(this.calculateProgress(currentStep, totalSteps), 'Генерация UI элементов', { count: assetGroups.ui.length });
        
        for (const uiAsset of assetGroups.ui) {
          const result = await this.generateUIElement(uiAsset, gameDesign);
          bundle.ui[uiAsset.name] = result.data;
          currentStep++;
          
          this.emit('asset:generated', { 
            gameId, 
            assetName: uiAsset.name, 
            type: 'ui',
            size: result.data.length 
          });
          
          onProgress?.(this.calculateProgress(currentStep, totalSteps), `UI: ${uiAsset.name}`);
        }
      }

      // Генерируем звуки
      if (assetGroups.sounds.length > 0) {
        onProgress?.(this.calculateProgress(currentStep, totalSteps), 'Генерация звуковых эффектов', { count: assetGroups.sounds.length });
        
        for (const soundAsset of assetGroups.sounds) {
          const result = await this.generateSoundEffect(soundAsset, gameDesign);
          bundle.sounds[soundAsset.name] = result.data;
          currentStep++;
          
          this.emit('asset:generated', { 
            gameId, 
            assetName: soundAsset.name, 
            type: 'sound',
            size: result.data.length 
          });
          
          onProgress?.(this.calculateProgress(currentStep, totalSteps), `Звук: ${soundAsset.name}`);
        }
      }

      // Генерируем музыку
      if (assetGroups.music.length > 0) {
        onProgress?.(this.calculateProgress(currentStep, totalSteps), 'Генерация музыки', { count: assetGroups.music.length });
        
        for (const musicAsset of assetGroups.music) {
          const result = await this.generateMusic(musicAsset, gameDesign);
          bundle.music[musicAsset.name] = result.data;
          currentStep++;
          
          this.emit('asset:generated', { 
            gameId, 
            assetName: musicAsset.name, 
            type: 'music',
            size: result.data.length 
          });
          
          onProgress?.(this.calculateProgress(currentStep, totalSteps), `Музыка: ${musicAsset.name}`);
        }
      }

      // Подсчитываем изначальный размер
      const originalSize = this.calculateBundleSize(bundle);

      // Применяем оптимизацию если настроена
      if (optimizationSettings?.general.enableCompression) {
        onProgress?.(90, 'Оптимизация ассетов');
        const optimizedBundle = await this.optimizeAssetBundle(bundle, optimizationSettings);
        const optimizedSize = this.calculateBundleSize(optimizedBundle);
        
        optimizedBundle.metadata = {
          totalSize: optimizedSize,
          assetCount: currentStep,
          optimizationApplied: true,
          compressionRatio: originalSize / optimizedSize
        };

        this.logger.info(`✅ Ассеты оптимизированы: ${this.formatSize(originalSize)} → ${this.formatSize(optimizedSize)}`);
        
        onProgress?.(100, 'Генерация завершена');
        this.emit('generation:completed', { gameId, bundle: optimizedBundle });
        
        return optimizedBundle;
      } else {
        bundle.metadata = {
          totalSize: originalSize,
          assetCount: currentStep,
          optimizationApplied: false,
          compressionRatio: 1
        };

        onProgress?.(100, 'Генерация завершена');
        this.emit('generation:completed', { gameId, bundle });
        
        return bundle;
      }

    } catch (error) {
      this.logger.error(`Ошибка генерации ассетов для ${gameId}:`, error);
      this.emit('generation:error', { gameId, error });
      throw error;
    } finally {
      this.activeGenerations.delete(gameId);
      this.generationProgress.delete(gameId);
    }
  }

  /**
   * Генерирует спрайт на основе требований
   */
  private async generateSprite(asset: AssetRequirement, gameDesign: GameDesign): Promise<AssetGenerationResult> {
    const prompt = this.createSpritePrompt(asset, gameDesign);
    
    return await this.openaiService.generateSprite(
      prompt,
      gameDesign.artStyle || 'pixel art',
      asset.dimensions || { width: 64, height: 64 }
    );
  }

  /**
   * Генерирует фон на основе требований
   */
  private async generateBackground(asset: AssetRequirement, gameDesign: GameDesign): Promise<AssetGenerationResult> {
    const prompt = this.createBackgroundPrompt(asset, gameDesign);
    
    return await this.openaiService.generateBackground(
      prompt,
      gameDesign.artStyle || 'cartoon'
    );
  }

  /**
   * Генерирует UI элемент
   */
  private async generateUIElement(asset: AssetRequirement, gameDesign: GameDesign): Promise<AssetGenerationResult> {
    const prompt = this.createUIPrompt(asset, gameDesign);
    
    return await this.openaiService.generateUIElement(
      asset.name,
      gameDesign.artStyle || 'modern',
      prompt
    );
  }

  /**
   * Генерирует звуковой эффект
   */
  private async generateSoundEffect(asset: AssetRequirement, gameDesign: GameDesign): Promise<AssetGenerationResult> {
    const prompt = this.createSoundPrompt(asset, gameDesign);
    const duration = asset.duration || 1000;
    
    return await this.openaiService.generateSound(prompt, duration, 'sfx');
  }

  /**
   * Генерирует музыку
   */
  private async generateMusic(asset: AssetRequirement, gameDesign: GameDesign): Promise<AssetGenerationResult> {
    const prompt = this.createMusicPrompt(asset, gameDesign);
    const duration = asset.duration || 30000; // 30 секунд по умолчанию для музыки
    
    return await this.openaiService.generateSound(prompt, duration, 'music');
  }

  /**
   * Оптимизирует набор ассетов
   */
  private async optimizeAssetBundle(bundle: AssetBundle, settings: AssetOptimizationSettings): Promise<AssetBundle> {
    const optimizedBundle: AssetBundle = {
      sprites: {},
      backgrounds: {},
      ui: {},
      sounds: {},
      music: {},
      metadata: bundle.metadata
    };

    // Оптимизируем изображения
    for (const [name, buffer] of Object.entries(bundle.sprites)) {
      optimizedBundle.sprites[name] = await this.optimizeImage(buffer, settings.images);
    }

    for (const [name, buffer] of Object.entries(bundle.backgrounds)) {
      optimizedBundle.backgrounds[name] = await this.optimizeImage(buffer, settings.images);
    }

    for (const [name, buffer] of Object.entries(bundle.ui)) {
      optimizedBundle.ui[name] = await this.optimizeImage(buffer, settings.images);
    }

    // Оптимизируем аудио
    for (const [name, buffer] of Object.entries(bundle.sounds)) {
      optimizedBundle.sounds[name] = await this.optimizeAudio(buffer, settings.audio);
    }

    for (const [name, buffer] of Object.entries(bundle.music)) {
      optimizedBundle.music[name] = await this.optimizeAudio(buffer, settings.audio);
    }

    return optimizedBundle;
  }

  /**
   * Оптимизирует изображение
   */
  private async optimizeImage(buffer: Buffer, settings: AssetOptimizationSettings['images']): Promise<Buffer> {
    try {
      let processor = sharp(buffer);

      // Изменяем размер если превышает максимальные значения
      const { width, height } = await processor.metadata();
      if (width && height && (width > settings.maxWidth || height > settings.maxHeight)) {
        processor = processor.resize(settings.maxWidth, settings.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Удаляем метаданные если нужно
      if (settings.removeMetadata) {
        processor = processor.withMetadata({});
      }

      // Выбираем формат и качество
      switch (settings.format) {
        case 'webp':
          return await processor.webp({ quality: settings.quality }).toBuffer();
        case 'jpg':
          return await processor.jpeg({ 
            quality: settings.quality, 
            progressive: settings.progressive 
          }).toBuffer();
        case 'png':
          return await processor.png({ 
            quality: settings.quality,
            progressive: settings.progressive
          }).toBuffer();
        case 'auto':
        default:
          // Выбираем формат автоматически
          return await processor.webp({ quality: settings.quality }).toBuffer();
      }
    } catch (error) {
      this.logger.warn('Ошибка оптимизации изображения:', error);
      return buffer;
    }
  }

  /**
   * Оптимизирует аудио (заглушка - для полной реализации нужны дополнительные библиотеки)
   */
  private async optimizeAudio(buffer: Buffer, settings: AssetOptimizationSettings['audio']): Promise<Buffer> {
    // TODO: Реализовать оптимизацию аудио с помощью ffmpeg или подобных библиотек
    // Пока возвращаем исходный буфер
    return buffer;
  }

  /**
   * Проверяет соответствие размера требованиям Yandex Games
   */
  public validateGameSize(bundle: AssetBundle): {
    valid: boolean;
    currentSize: number;
    maxSize: number;
    warnings: string[];
    suggestions: string[];
  } {
    const currentSize = bundle.metadata.totalSize;
    const maxSize = config.yandexGames.maxSize;
    const targetSize = config.yandexGames.targetSize;
    
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (currentSize > maxSize) {
      warnings.push(`Размер игры превышает лимит Yandex Games: ${this.formatSize(currentSize)} > ${this.formatSize(maxSize)}`);
      suggestions.push('Включите агрессивную оптимизацию изображений');
      suggestions.push('Уменьшите количество или размер ассетов');
      suggestions.push('Используйте формат WebP для изображений');
    } else if (currentSize > targetSize) {
      warnings.push(`Размер игры превышает рекомендуемый: ${this.formatSize(currentSize)} > ${this.formatSize(targetSize)}`);
      suggestions.push('Рассмотрите возможность дополнительной оптимизации');
    }

    return {
      valid: currentSize <= maxSize,
      currentSize,
      maxSize,
      warnings,
      suggestions
    };
  }

  /**
   * Сохраняет набор ассетов в файловую систему
   */
  public async saveAssetBundle(gameId: string, bundle: AssetBundle, outputDir: string): Promise<string[]> {
    const savedFiles: string[] = [];
    
    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Создаем структуру папок
      const dirs = {
        sprites: path.join(outputDir, 'assets', 'sprites'),
        backgrounds: path.join(outputDir, 'assets', 'backgrounds'),
        ui: path.join(outputDir, 'assets', 'ui'),
        sounds: path.join(outputDir, 'assets', 'sounds'),
        music: path.join(outputDir, 'assets', 'music')
      };

      for (const dir of Object.values(dirs)) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Сохраняем спрайты
      for (const [name, buffer] of Object.entries(bundle.sprites)) {
        const filePath = path.join(dirs.sprites, `${name}.png`);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(filePath);
      }

      // Сохраняем фоны
      for (const [name, buffer] of Object.entries(bundle.backgrounds)) {
        const filePath = path.join(dirs.backgrounds, `${name}.png`);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(filePath);
      }

      // Сохраняем UI элементы
      for (const [name, buffer] of Object.entries(bundle.ui)) {
        const filePath = path.join(dirs.ui, `${name}.png`);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(filePath);
      }

      // Сохраняем звуки
      for (const [name, buffer] of Object.entries(bundle.sounds)) {
        const filePath = path.join(dirs.sounds, `${name}.wav`);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(filePath);
      }

      // Сохраняем музыку
      for (const [name, buffer] of Object.entries(bundle.music)) {
        const filePath = path.join(dirs.music, `${name}.wav`);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(filePath);
      }

      // Сохраняем манифест ассетов
      const manifest = {
        gameId,
        metadata: bundle.metadata,
        assets: {
          sprites: Object.keys(bundle.sprites),
          backgrounds: Object.keys(bundle.backgrounds),
          ui: Object.keys(bundle.ui),
          sounds: Object.keys(bundle.sounds),
          music: Object.keys(bundle.music)
        },
        generatedAt: new Date().toISOString()
      };

      const manifestPath = path.join(outputDir, 'asset-manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      savedFiles.push(manifestPath);

      this.logger.info(`💾 Сохранено ${savedFiles.length} файлов ассетов для игры ${gameId}`);
      
      return savedFiles;
    } catch (error) {
      this.logger.error(`Ошибка сохранения ассетов для ${gameId}:`, error);
      throw error;
    }
  }

  // Вспомогательные методы

  private groupAssetsByType(assets: AssetRequirement[]): {
    sprites: AssetRequirement[];
    backgrounds: AssetRequirement[];
    ui: AssetRequirement[];
    sounds: AssetRequirement[];
    music: AssetRequirement[];
  } {
    return {
      sprites: assets.filter(a => a.type === 'sprite'),
      backgrounds: assets.filter(a => a.type === 'background'),
      ui: assets.filter(a => a.type === 'ui'),
      sounds: assets.filter(a => a.type === 'sound'),
      music: assets.filter(a => a.type === 'music')
    };
  }

  private calculateProgress(current: number, total: number): number {
    return Math.round((current / total) * 100);
  }

  private calculateBundleSize(bundle: AssetBundle): number {
    let size = 0;
    
    Object.values(bundle.sprites).forEach(buffer => size += buffer.length);
    Object.values(bundle.backgrounds).forEach(buffer => size += buffer.length);
    Object.values(bundle.ui).forEach(buffer => size += buffer.length);
    Object.values(bundle.sounds).forEach(buffer => size += buffer.length);
    Object.values(bundle.music).forEach(buffer => size += buffer.length);
    
    return size;
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private createSpritePrompt(asset: AssetRequirement, gameDesign: GameDesign): string {
    return `
    ${asset.description}
    
    Игра: ${gameDesign.title}
    Жанр: ${gameDesign.genre}
    Тема: ${gameDesign.theme}
    Стиль: ${gameDesign.artStyle}
    
    Требования к спрайту:
    - Размер: ${asset.dimensions?.width || 64}x${asset.dimensions?.height || 64} пикселей
    - Стиль: ${gameDesign.artStyle}
    - Прозрачный фон
    - Четкие контуры
    - Подходит для ${gameDesign.genre} игры
    - Яркие, хорошо различимые цвета
    `.trim();
  }

  private createBackgroundPrompt(asset: AssetRequirement, gameDesign: GameDesign): string {
    return `
    ${asset.description}
    
    Игра: ${gameDesign.title}
    Жанр: ${gameDesign.genre}
    Тема: ${gameDesign.theme}
    Стиль: ${gameDesign.artStyle}
    
    Требования к фону:
    - Горизонтальная ориентация для игры
    - Стиль: ${gameDesign.artStyle}
    - Атмосферный и детализированный
    - Подходящие цвета для ${gameDesign.genre} игры
    - Без персонажей или объектов переднего плана
    - Создает нужное настроение
    `.trim();
  }

  private createUIPrompt(asset: AssetRequirement, gameDesign: GameDesign): string {
    return `
    UI элемент для игры: ${asset.description}
    
    Игра: ${gameDesign.title}
    Жанр: ${gameDesign.genre}
    Стиль: ${gameDesign.artStyle}
    
    Требования:
    - Четкие границы и высокий контраст
    - Подходит для игрового интерфейса
    - Стиль соответствует общему дизайну игры
    - Хорошо читается на разных размерах экрана
    - Современный и привлекательный дизайн
    `.trim();
  }

  private createSoundPrompt(asset: AssetRequirement, gameDesign: GameDesign): string {
    return `
    Звуковой эффект для игры: ${asset.description}
    
    Игра: ${gameDesign.title}
    Жанр: ${gameDesign.genre}
    Тема: ${gameDesign.theme}
    
    Требования:
    - Подходит для ${gameDesign.genre} игры
    - Четкий и различимый звук
    - Не раздражающий при повторении
    - Соответствует тематике игры
    `.trim();
  }

  private createMusicPrompt(asset: AssetRequirement, gameDesign: GameDesign): string {
    return `
    Фоновая музыка для игры: ${asset.description}
    
    Игра: ${gameDesign.title}
    Жанр: ${gameDesign.genre}
    Тема: ${gameDesign.theme}
    
    Требования:
    - Зацикливаемая композиция
    - Создает нужную атмосферу для ${gameDesign.genre}
    - Не отвлекает от геймплея
    - Соответствует тематике: ${gameDesign.theme}
    - Подходящий темп и настроение
    `.trim();
  }

  /**
   * Получает статистику активных генераций
   */
  public getActiveGenerations(): { gameId: string; progress: number }[] {
    const result: { gameId: string; progress: number }[] = [];
    
    for (const [gameId, progress] of this.generationProgress.entries()) {
      result.push({ gameId, progress });
    }
    
    return result;
  }

  /**
   * Отменяет генерацию ассетов
   */
  public cancelGeneration(gameId: string): boolean {
    if (this.activeGenerations.has(gameId)) {
      this.activeGenerations.delete(gameId);
      this.generationProgress.delete(gameId);
      this.emit('generation:cancelled', { gameId });
      this.logger.info(`❌ Генерация ассетов для ${gameId} отменена`);
      return true;
    }
    return false;
  }
} 