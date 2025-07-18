import OpenAI from 'openai';
import config from '@/config';
import { LoggerService } from '@/services/logger';
import { AssetGenerationResult } from '@/types';
import { AIServiceError, QuotaExceededError } from '@/middleware/errorHandler';
import sharp from 'sharp';

export class OpenAIService {
  private client: OpenAI;
  private logger: LoggerService;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    this.logger = new LoggerService();

    if (!config.ai.openai.apiKey) {
      throw new Error('OpenAI API ключ не настроен');
    }

    this.client = new OpenAI({
      apiKey: config.ai.openai.apiKey,
    });
  }

  public async generateImage(
    prompt: string, 
    style: string = 'pixel art',
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
  ): Promise<AssetGenerationResult> {
    const startTime = Date.now();

    try {
      this.checkRateLimit();

      const enhancedPrompt = this.enhanceImagePrompt(prompt, style);
      
      this.logger.aiRequest('openai', 'dall-e-3', enhancedPrompt.length);

      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'b64_json',
      });

      const duration = Date.now() - startTime;
      this.logger.aiResponse('openai', 'dall-e-3', 1, duration);

      if (!response.data[0]?.b64_json) {
        throw new Error('Не получены данные изображения от OpenAI');
      }

      const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
      
      // Оптимизируем изображение
      const optimizedBuffer = await this.optimizeImage(imageBuffer);
      
      return {
        type: 'image',
        data: optimizedBuffer,
        metadata: {
          size: optimizedBuffer.length,
          dimensions: this.parseDimensions(size),
          format: 'png',
        },
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.aiError('openai', { error: error.message, duration });

      if (error.status === 429) {
        throw new QuotaExceededError('Превышена квота запросов OpenAI API', 'openai');
      }

      if (error.status === 401) {
        throw new AIServiceError('Неверный API ключ OpenAI', 'openai', error);
      }

      throw new AIServiceError(
        `Ошибка OpenAI API: ${error.message}`,
        'openai',
        error
      );
    }
  }

  public async generateSprite(
    description: string,
    style: string = 'pixel art',
    dimensions: { width: number; height: number } = { width: 64, height: 64 }
  ): Promise<AssetGenerationResult> {
    const prompt = `
    ${description}
    
    Требования к спрайту:
    - Размер: ${dimensions.width}x${dimensions.height} пикселей
    - Стиль: ${style}
    - Прозрачный фон
    - Четкие контуры
    - Яркие цвета
    - Подходит для игры
    `;

    const result = await this.generateImage(prompt, style, '1024x1024');
    
    // Изменяем размер до требуемых dimensions
    const resizedBuffer = await sharp(result.data)
      .resize(dimensions.width, dimensions.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    return {
      ...result,
      data: resizedBuffer,
      metadata: {
        ...result.metadata,
        size: resizedBuffer.length,
        dimensions,
      },
    };
  }

  public async generateBackground(
    description: string,
    style: string = 'cartoon',
    size: '1792x1024' | '1024x1792' = '1792x1024'
  ): Promise<AssetGenerationResult> {
    const prompt = `
    ${description}
    
    Требования к фону:
    - Горизонтальная ориентация для игры
    - Стиль: ${style}
    - Высокое качество
    - Подходящие цвета для игрового интерфейса
    - Без персонажей
    - Атмосферный и детализированный
    `;

    return this.generateImage(prompt, style, size);
  }

  public async generateUIElement(
    elementType: string,
    style: string = 'modern',
    description?: string
  ): Promise<AssetGenerationResult> {
    const prompt = `
    UI элемент: ${elementType}
    ${description ? `Описание: ${description}` : ''}
    
    Требования:
    - Стиль: ${style}
    - Четкие границы
    - Подходит для игрового интерфейса
    - Яркие, контрастные цвета
    - Прозрачный фон
    - Векторный стиль
    `;

    return this.generateImage(prompt, style, '1024x1024');
  }

  public async generateSpriteSheet(
    sprites: Array<{ name: string; description: string }>,
    style: string = 'pixel art',
    tileSize: { width: number; height: number } = { width: 64, height: 64 }
  ): Promise<AssetGenerationResult> {
    const descriptions = sprites.map(s => `${s.name}: ${s.description}`).join('\n');
    
    const prompt = `
    Спрайт-лист с несколькими элементами:
    ${descriptions}
    
    Требования:
    - Стиль: ${style}
    - Каждый спрайт ${tileSize.width}x${tileSize.height} пикселей
    - Аккуратная сетка
    - Прозрачный фон
    - Одинаковый стиль для всех элементов
    - Четкие границы между спрайтами
    `;

    return this.generateImage(prompt, style, '1024x1024');
  }

  // Заглушка для генерации звука (OpenAI пока не поддерживает аудио генерацию)
  public async generateSound(
    description: string,
    duration: number = 1000,
    type: 'sfx' | 'music' = 'sfx'
  ): Promise<AssetGenerationResult> {
    // В будущем можно интегрировать с другими AI сервисами для звука
    // Пока возвращаем заглушку
    
    this.logger.warn(`Генерация звука "${description}" пока не поддерживается`);
    
    // Создаем простой синтетический звук
    const dummyAudioBuffer = this.generateDummyAudio(duration);
    
    return {
      type: 'audio',
      data: dummyAudioBuffer,
      metadata: {
        size: dummyAudioBuffer.length,
        format: 'wav',
      },
    };
  }

  private enhanceImagePrompt(prompt: string, style: string): string {
    const styleEnhancements = {
      'pixel art': 'pixel art style, 8-bit, retro gaming, sharp pixels, limited color palette',
      'cartoon': 'cartoon style, bright colors, smooth lines, playful, family-friendly',
      'realistic': 'realistic style, detailed, high quality, professional',
      'minimalist': 'minimalist style, clean lines, simple shapes, modern',
      'fantasy': 'fantasy style, magical, mystical, vibrant colors, detailed',
    };

    const enhancement = styleEnhancements[style as keyof typeof styleEnhancements] || style;
    
    return `${prompt}. ${enhancement}. High quality, game asset, transparent background where appropriate.`;
  }

  private async optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .png({
          quality: Math.round(config.optimization.imageCompression * 100),
          compressionLevel: 9,
        })
        .toBuffer();
    } catch (error) {
      this.logger.warn('Ошибка оптимизации изображения:', error);
      return imageBuffer;
    }
  }

  private parseDimensions(size: string): { width: number; height: number } {
    const [width, height] = size.split('x').map(Number);
    return { width, height };
  }

  private generateDummyAudio(duration: number): Buffer {
    // Создаем простой WAV файл с тишиной
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = Buffer.alloc(44 + samples * 2);
    
    // WAV заголовок
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples * 2, 40);
    
    // Данные (тишина)
    buffer.fill(0, 44);
    
    return buffer;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (now - this.lastResetTime > hourInMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Лимит изображений OpenAI (примерно 50 в час для базового плана)
    if (this.requestCount > 50) {
      throw new QuotaExceededError('Достигнут лимит запросов OpenAI API', 'openai');
    }
    
    this.requestCount++;
  }

  public getUsageStats(): { requests: number, resetTime: Date } {
    return {
      requests: this.requestCount,
      resetTime: new Date(this.lastResetTime + 60 * 60 * 1000)
    };
  }
} 