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

  // Полноценная генерация звуков с использованием синтетических алгоритмов
  public async generateSound(
    description: string,
    duration: number = 1000,
    type: 'sfx' | 'music' = 'sfx'
  ): Promise<AssetGenerationResult> {
    this.logger.info(`🎵 Генерация звука: "${description}" (${type}, ${duration}ms)`);
    
    try {
      // Анализируем описание для определения типа звука
      const soundType = this.analyzeSoundDescription(description, type);
      
      // Генерируем звук в зависимости от типа
      let audioBuffer: Buffer;
      
      switch (soundType) {
        case 'jump':
          audioBuffer = this.generateJumpSound(duration);
          break;
        case 'coin':
          audioBuffer = this.generateCoinSound(duration);
          break;
        case 'explosion':
          audioBuffer = this.generateExplosionSound(duration);
          break;
        case 'laser':
          audioBuffer = this.generateLaserSound(duration);
          break;
        case 'powerup':
          audioBuffer = this.generatePowerUpSound(duration);
          break;
        case 'hit':
          audioBuffer = this.generateHitSound(duration);
          break;
        case 'menu':
          audioBuffer = this.generateMenuSound(duration);
          break;
        case 'background':
          audioBuffer = this.generateBackgroundMusic(duration);
          break;
        case 'victory':
          audioBuffer = this.generateVictorySound(duration);
          break;
        case 'defeat':
          audioBuffer = this.generateDefeatSound(duration);
          break;
        default:
          audioBuffer = this.generateGenericSound(duration, soundType);
      }
      
      this.logger.info(`✅ Звук сгенерирован: ${audioBuffer.length} bytes`);
      
      return {
        type: 'audio',
        data: audioBuffer,
        metadata: {
          size: audioBuffer.length,
          format: 'wav',
          duration,
          soundType,
          description
        },
      };
    } catch (error) {
      this.logger.error('Ошибка генерации звука', { error, description, type, duration });
      
      // В случае ошибки возвращаем простой синтетический звук
      const fallbackBuffer = this.generateGenericSound(duration, 'beep');
      return {
        type: 'audio',
        data: fallbackBuffer,
        metadata: {
          size: fallbackBuffer.length,
          format: 'wav',
          duration,
          soundType: 'fallback'
        },
      };
    }
  }

  private analyzeSoundDescription(description: string, type: 'sfx' | 'music'): string {
    const desc = description.toLowerCase();
    
    // Звуки прыжка
    if (desc.includes('jump') || desc.includes('прыжок') || desc.includes('hop')) {
      return 'jump';
    }
    
    // Звуки монет/очков
    if (desc.includes('coin') || desc.includes('монета') || desc.includes('collect') || desc.includes('pickup')) {
      return 'coin';
    }
    
    // Взрывы
    if (desc.includes('explosion') || desc.includes('взрыв') || desc.includes('boom') || desc.includes('blast')) {
      return 'explosion';
    }
    
    // Лазеры/выстрелы
    if (desc.includes('laser') || desc.includes('лазер') || desc.includes('shoot') || desc.includes('выстрел')) {
      return 'laser';
    }
    
    // Усиления
    if (desc.includes('powerup') || desc.includes('power') || desc.includes('усиление') || desc.includes('бонус')) {
      return 'powerup';
    }
    
    // Удары
    if (desc.includes('hit') || desc.includes('удар') || desc.includes('damage') || desc.includes('урон')) {
      return 'hit';
    }
    
    // Меню
    if (desc.includes('menu') || desc.includes('меню') || desc.includes('click') || desc.includes('button')) {
      return 'menu';
    }
    
    // Победа
    if (desc.includes('victory') || desc.includes('победа') || desc.includes('win') || desc.includes('success')) {
      return 'victory';
    }
    
    // Поражение
    if (desc.includes('defeat') || desc.includes('поражение') || desc.includes('lose') || desc.includes('death')) {
      return 'defeat';
    }
    
    // Фоновая музыка
    if (type === 'music' || desc.includes('background') || desc.includes('фон') || desc.includes('theme')) {
      return 'background';
    }
    
    return 'generic';
  }

  private generateJumpSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук прыжка: быстрое повышение частоты
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const frequency = 200 + progress * 400; // 200Hz -> 600Hz
      const amplitude = Math.exp(-progress * 5) * 0.3; // Затухание
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateCoinSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук монеты: две быстрые ноты
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const frequency = progress < 0.3 ? 800 : 1200; // Две ноты
      const amplitude = Math.exp(-progress * 3) * 0.4;
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateExplosionSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук взрыва: белый шум с низкими частотами
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const amplitude = Math.exp(-progress * 2) * 0.6;
      
      // Комбинируем низкую частоту и шум
      const lowFreq = Math.sin(2 * Math.PI * 60 * i / sampleRate) * 0.7;
      const noise = (Math.random() - 0.5) * 0.5;
      const sample = (lowFreq + noise) * amplitude;
      
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateLaserSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук лазера: высокая частота с модуляцией
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const baseFreq = 1500;
      const modulation = Math.sin(2 * Math.PI * 20 * i / sampleRate) * 200;
      const frequency = baseFreq + modulation;
      const amplitude = Math.exp(-progress * 4) * 0.4;
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generatePowerUpSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук усиления: восходящие аккорды
    const frequencies = [261, 329, 392, 523]; // C, E, G, C (до мажор)
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      let sample = 0;
      
      // Играем аккорд с задержкой для каждой ноты
      frequencies.forEach((freq, index) => {
        const noteStart = index * 0.2;
        if (progress >= noteStart) {
          const noteProgress = (progress - noteStart) / (1 - noteStart);
          const amplitude = Math.exp(-noteProgress * 2) * 0.15;
          sample += Math.sin(2 * Math.PI * freq * i / sampleRate) * amplitude;
        }
      });
      
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateHitSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук удара: резкий низкочастотный импульс
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const amplitude = Math.exp(-progress * 8) * 0.7;
      
      // Комбинируем низкую частоту и небольшой шум
      const lowFreq = Math.sin(2 * Math.PI * 120 * i / sampleRate);
      const click = i < samples * 0.1 ? (Math.random() - 0.5) * 0.3 : 0;
      const sample = (lowFreq + click) * amplitude;
      
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateMenuSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук меню: короткий чистый тон
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const frequency = 800;
      const amplitude = progress < 0.1 ? progress * 10 * 0.3 : 
                      progress > 0.8 ? (1 - progress) * 5 * 0.3 : 0.3;
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateBackgroundMusic(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Фоновая музыка: простая мелодия
    const melody = [261, 294, 329, 349, 392, 440, 493, 523]; // C major scale
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const noteIndex = Math.floor(progress * melody.length);
      const frequency = melody[noteIndex] || melody[0];
      
      // Мягкая амплитуда для фона
      const amplitude = 0.1 * (1 + Math.sin(2 * Math.PI * 0.5 * i / sampleRate) * 0.1);
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateVictorySound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук победы: торжественная последовательность
    const victoryMelody = [523, 659, 784, 1047]; // C, E, G, C (octave)
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      let sample = 0;
      
      victoryMelody.forEach((freq, index) => {
        const noteStart = index * 0.25;
        const noteEnd = (index + 1) * 0.25;
        
        if (progress >= noteStart && progress < noteEnd) {
          const noteProgress = (progress - noteStart) / 0.25;
          const amplitude = Math.sin(Math.PI * noteProgress) * 0.2;
          sample += Math.sin(2 * Math.PI * freq * i / sampleRate) * amplitude;
        }
      });
      
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateDefeatSound(duration: number): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Звук поражения: нисходящая последовательность
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const frequency = 400 - progress * 200; // 400Hz -> 200Hz
      const amplitude = 0.3;
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private generateGenericSound(duration: number, type: string): Buffer {
    const sampleRate = 44100;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const buffer = this.createWAVHeader(samples);
    
    // Универсальный звук: простой сигнал
    const frequency = 440; // Ля первой октавы
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      const amplitude = Math.sin(Math.PI * progress) * 0.3; // Плавное нарастание и затухание
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const intSample = Math.round(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
  }

  private createWAVHeader(samples: number): Buffer {
    const buffer = Buffer.alloc(44 + samples * 2);
    const sampleRate = 44100;
    
    // WAV заголовок
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34); // 16-bit
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples * 2, 40);
    
    return buffer;
  }

  private generateDummyAudio(duration: number): Buffer {
    // Заменяем на генерацию простого звука вместо тишины
    return this.generateGenericSound(duration, 'beep');
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