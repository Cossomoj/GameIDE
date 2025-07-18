import Anthropic from '@anthropic-ai/sdk';
import config from '@/config';
import { LoggerService } from '@/services/logger';
import { AIResponse } from '@/types';
import { AIServiceError, QuotaExceededError } from '@/middleware/errorHandler';

export class ClaudeService {
  private client: Anthropic;
  private logger: LoggerService;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    this.logger = new LoggerService();
    
    if (!config.ai.claude.apiKey) {
      throw new Error('Claude API ключ не настроен');
    }

    this.client = new Anthropic({
      apiKey: config.ai.claude.apiKey,
    });
  }

  public async generateCode(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      this.checkRateLimit();
      
      const messages: Anthropic.MessageParam[] = [];
      
      messages.push({
        role: 'user',
        content: prompt
      });

      this.logger.aiRequest('claude', config.ai.claude.model, prompt.length);

      const response = await this.client.messages.create({
        model: config.ai.claude.model as any,
        messages,
        max_tokens: config.ai.claude.maxTokens,
        system: systemPrompt,
        temperature: config.ai.claude.temperature,
      });

      const duration = Date.now() - startTime;
      
      this.logger.aiResponse(
        'claude', 
        config.ai.claude.model, 
        response.usage?.total_tokens || 0, 
        duration
      );

      // Извлекаем текстовый контент из ответа
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      return {
        content,
        tokensUsed: response.usage?.total_tokens || 0,
        model: config.ai.claude.model,
        finishReason: response.stop_reason || 'unknown'
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.aiError('claude', { error: error.message, duration });
      
      if (error.status === 429) {
        throw new QuotaExceededError('Превышена квота запросов Claude API', 'claude');
      }
      
      if (error.status === 401) {
        throw new AIServiceError('Неверный API ключ Claude', 'claude', error);
      }
      
      throw new AIServiceError(
        `Ошибка Claude API: ${error.message}`,
        'claude',
        error
      );
    }
  }

  public async generateGameDesign(prompt: string): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по геймдизайну и архитектуре ПО, специализирующийся на создании HTML5 игр для платформы Яндекс Игры.

Твоя задача - создать подробный Game Design Document (GDD) на основе пользовательского описания.

Требования к ответу:
1. Ответ должен быть в формате JSON
2. Включи все необходимые секции GDD
3. Учти ограничения платформы Яндекс Игры (размер < 20MB, работа в iframe)
4. Предложи подходящие механики монетизации через Yandex Games SDK
5. Опиши необходимые графические и звуковые ассеты
6. Создай архитектуру проекта с четким разделением на модули

Структура ответа:
{
  "title": "Название игры",
  "genre": "Жанр",
  "description": "Подробное описание концепции",
  "mechanics": ["список", "основных", "механик"],
  "progression": "Система прогрессии игрока",
  "architecture": {
    "engine": "Phaser 3",
    "modules": ["GameManager", "SceneManager", "AssetManager", "UIManager"],
    "patterns": ["State Machine", "Object Pool", "Observer"]
  },
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
  },
  "technical_requirements": {
    "target_size": "< 10MB",
    "performance": "60 FPS на мобильных",
    "compatibility": "iOS Safari, Android Chrome, Desktop"
  }
}

Будь креативен и предложи инновационную игру с продуманной архитектурой.
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async generatePhaserScene(sceneName: string, mechanics: string[], gameDesign: any): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по Phaser 3 и архитектуре игровых движков.

Требования к коду:
1. Используй Phaser 3.70+ с современными ES6+ возможностями
2. Применяй паттерны проектирования (State Machine, Observer, Object Pool)
3. Оптимизируй производительность (requestAnimationFrame, texture atlases)
4. Включи поддержку мобильных устройств с адаптивным UI
5. Используй TypeScript типизацию
6. Интеграция с Yandex Games SDK
7. Модульная архитектура с четким разделением ответственности

Создай полный класс сцены с современной архитектурой и лучшими практиками.
`;

    const prompt = `
Создай сцену "${sceneName}" для Phaser 3 игры со следующими характеристиками:

Механики: ${mechanics.join(', ')}
Дизайн игры: ${JSON.stringify(gameDesign, null, 2)}

Включи:
- Полный TypeScript класс сцены с типизацией
- Загрузку ассетов в preload() с прогресс-баром
- Инициализацию игровых объектов в create() с паттернами
- Игровую логику в update() с оптимизацией
- Обработку input (клавиатура + тач + геймпад)
- Физику с collision detection
- Анимации и эффекты частиц
- Адаптивный UI менеджер
- Интеграцию с Yandex Games SDK
- Систему состояний игры
- Object pooling для часто создаваемых объектов
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async generateAdvancedGameLogic(prompt: string): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по игровой логике и алгоритмам.

Специализируешься на:
1. Искусственный интеллект для NPC (A*, FSM, Behavior Trees)
2. Процедурная генерация контента (перлин-шум, клеточные автоматы)
3. Оптимизация производительности (spatial partitioning, LOD)
4. Балансировка игровых механик
5. Системы прогрессии и экономики

Создавай чистый, эффективный код с подробными комментариями.
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async generateUIComponents(componentType: string, gameStyle: string): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по UI/UX дизайну игр и фронтенд разработке.

Специализируешься на:
1. Адаптивные интерфейсы для всех устройств
2. Анимации и микроинтерракции
3. Доступность (a11y) и юзабилити
4. Современные CSS техники (CSS Grid, Flexbox, Custom Properties)
5. Производительность рендеринга
6. Интеграция с игровыми движками

Создавай компоненты с учетом лучших практик UX.
`;

    const prompt = `
Создай UI компонент "${componentType}" в стиле "${gameStyle}".

Требования:
- Адаптивность для мобильных и десктопа
- Плавные анимации и переходы
- Доступность (ARIA атрибуты)
- Интеграция с Phaser 3
- Современный CSS с custom properties
- Поддержка темной/светлой темы
`;

    return this.generateCode(prompt, systemPrompt);
  }

  public async analyzeAndOptimize(code: string, targetMetrics: any): Promise<AIResponse> {
    const systemPrompt = `
Ты - эксперт по анализу и оптимизации кода.

Твоя задача:
1. Провести глубокий анализ производительности
2. Выявить узкие места и memory leaks
3. Предложить конкретные оптимизации
4. Обеспечить соответствие best practices
5. Улучшить читаемость и поддерживаемость

Предоставь детальный отчет с примерами улучшений.
`;

    const prompt = `
Проанализируй и оптимизируй следующий код:

\`\`\`javascript
${code}
\`\`\`

Целевые метрики: ${JSON.stringify(targetMetrics, null, 2)}

Проведи анализ по критериям:
1. Производительность (время выполнения, использование памяти)
2. Читаемость и поддерживаемость
3. Соответствие принципам SOLID
4. Обработка ошибок
5. Безопасность
6. Совместимость с браузерами

Предоставь оптимизированную версию с объяснениями.
`;

    return this.generateCode(prompt, systemPrompt);
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    // Сброс счетчика каждый час
    if (now - this.lastResetTime > hourInMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Claude API лимиты более щедрые чем у других
    if (this.requestCount > 1000) {
      throw new QuotaExceededError('Достигнут лимит запросов Claude API', 'claude');
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