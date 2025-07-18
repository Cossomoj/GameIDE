import axios, { AxiosInstance } from 'axios';
import config from '@/config';
import { LoggerService } from '@/services/logger';
import { AIResponse } from '@/types';
import { AIServiceError, QuotaExceededError } from '@/middleware/errorHandler';

export class DeepSeekService {
  private client: AxiosInstance;
  private logger: LoggerService;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    this.logger = new LoggerService();
    
    if (!config.ai.deepseek.apiKey) {
      throw new Error('DeepSeek API ключ не настроен');
    }

    this.client = axios.create({
      baseURL: config.ai.deepseek.baseURL,
      headers: {
        'Authorization': `Bearer ${config.ai.deepseek.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 секунд
    });

    this.setupInterceptors();
  }

  public async generateCode(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      this.checkRateLimit();
      
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      this.logger.aiRequest('deepseek', config.ai.deepseek.model, prompt.length);

      const response = await this.client.post('/chat/completions', {
        model: config.ai.deepseek.model,
        messages,
        max_tokens: config.ai.deepseek.maxTokens,
        temperature: config.ai.deepseek.temperature,
        stream: false,
      });

      const { data } = response;
      const duration = Date.now() - startTime;
      
      this.logger.aiResponse(
        'deepseek', 
        config.ai.deepseek.model, 
        data.usage?.total_tokens || 0, 
        duration
      );

      return {
        content: data.choices[0]?.message?.content || '',
        tokensUsed: data.usage?.total_tokens || 0,
        model: config.ai.deepseek.model,
        finishReason: data.choices[0]?.finish_reason || 'unknown'
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.aiError('deepseek', { error: error.message, duration });
      
      if (error.response?.status === 429) {
        throw new QuotaExceededError('Превышена квота запросов DeepSeek API', 'deepseek');
      }
      
      if (error.response?.status === 401) {
        throw new AIServiceError('Неверный API ключ DeepSeek', 'deepseek', error.response.data);
      }
      
      throw new AIServiceError(
        `Ошибка DeepSeek API: ${error.message}`,
        'deepseek',
        error.response?.data
      );
    }
  }

  public async generateGameDesign(prompt: string): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по геймдизайну, специализирующийся на создании HTML5 игр для платформы Яндекс Игры.

Твоя задача - создать подробный Game Design Document (GDD) на основе пользовательского описания.

Требования к ответу:
1. Ответ должен быть в формате JSON
2. Включи все необходимые секции GDD
3. Учти ограничения платформы Яндекс Игры (размер < 20MB, работа в iframe)
4. Предложи подходящие механики монетизации через Yandex Games SDK
5. Опиши необходимые графические и звуковые ассеты

Структура ответа:
{
  "title": "Название игры",
  "genre": "Жанр",
  "description": "Подробное описание",
  "mechanics": ["список", "основных", "механик"],
  "progression": "Система прогрессии",
  "assets": [
    {
      "type": "sprite|background|ui|sound|music",
      "name": "название",
      "description": "описание",
      "style": "стиль",
      "dimensions": {"width": 64, "height": 64},
      "duration": 2000
    }
  ],
  "ui": {
    "screens": [
      {
        "name": "MainMenu",
        "components": ["PlayButton", "LeaderboardButton", "SettingsButton"],
        "layout": "vertical"
      }
    ],
    "components": [
      {
        "name": "PlayButton",
        "type": "button",
        "style": "large primary"
      }
    ]
  },
  "monetization": {
    "types": ["rewarded_ads", "interstitial_ads"],
    "placement": ["level_complete", "game_over"]
  }
}

Будь креативен и предложи интересную игру, которая будет привлекательна для пользователей Яндекс Игр.
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async generatePhaserScene(sceneName: string, mechanics: string[], gameDesign: any): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по Phaser 3, создающий качественный код игровых сцен.

Требования:
1. Используй Phaser 3.70+
2. Код должен быть оптимизирован для производительности
3. Включи поддержку мобильных устройств (touch controls)
4. Используй object pooling для часто создаваемых объектов
5. Добавь интеграцию с Yandex Games SDK где необходимо
6. Код должен быть читаемым и хорошо структурированным

Создай полный класс сцены Phaser 3 с методами preload, create, update.
`;

    const prompt = `
Создай сцену "${sceneName}" для Phaser 3 игры со следующими характеристиками:

Механики: ${mechanics.join(', ')}
Дизайн игры: ${JSON.stringify(gameDesign, null, 2)}

Включи:
- Полный код класса сцены
- Загрузку ассетов в preload()
- Инициализацию игровых объектов в create()
- Игровую логику в update()
- Обработку input (клавиатура + тач)
- Систему физики если необходима
- Анимации и эффекты
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async generateYandexIntegration(features: string[]): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по интеграции с Yandex Games SDK.

Создай код интеграции с учетом:
1. Yandex Games SDK 2.0+
2. Обработка лидербордов
3. Показ рекламы (rewarded, interstitial, banner)
4. Сохранение данных игрока
5. Обработка ошибок и fallback'ов
6. Адаптация под iframe окружение

Код должен быть готов к использованию и включать все необходимые проверки.
`;

    const prompt = `
Создай модуль интеграции с Yandex Games SDK со следующими функциями:
${features.join(', ')}

Включи:
- Инициализацию SDK
- Методы для работы с каждой функцией
- Обработку ошибок
- TypeScript типы
- Документацию к методам
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async optimizeCode(code: string, targetSize: number): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по оптимизации JavaScript кода для веб-игр.

Задача: оптимизировать код для достижения целевого размера ${targetSize} байт при сохранении функциональности.

Применяй:
1. Минификацию переменных
2. Удаление неиспользуемого кода
3. Оптимизацию алгоритмов
4. Сжатие строк и данных
5. Объединение похожих функций
6. Использование более компактных конструкций

Сохраняй читаемость и функциональность кода.
`;

    const prompt = `
Оптимизируй следующий код:

\`\`\`javascript
${code}
\`\`\`

Цель: уменьшить размер до ~${targetSize} байт с сохранением всей функциональности.
`;

    return this.generateCode(prompt, systemPrompt);
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Логируем детали ошибки
        this.logger.error('DeepSeek API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        
        return Promise.reject(error);
      }
    );
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    // Сброс счетчика каждый час
    if (now - this.lastResetTime > hourInMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Проверка лимита (предполагаем 1000 запросов в час)
    if (this.requestCount > 1000) {
      throw new QuotaExceededError('Достигнут лимит запросов DeepSeek API', 'deepseek');
    }
  }

  public getUsageStats(): { requests: number, resetTime: Date } {
    return {
      requests: this.requestCount,
      resetTime: new Date(this.lastResetTime + 60 * 60 * 1000)
    };
  }
} 