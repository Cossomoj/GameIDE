import React from 'react';

interface ABTestAssignment {
  testId: string;
  variant: string;
  allocation: number;
}

interface ABTestEvent {
  userId: string;
  testId: string;
  variant: string;
  eventType: string;
  eventData?: any;
}

interface ABTestConfig {
  testId: string;
  type: string;
  variants: Record<string, any>;
  isActive: boolean;
}

class ABTestingService {
  private userId: string;
  private assignments: Map<string, ABTestAssignment> = new Map();
  private cache: Map<string, any> = new Map();
  private initialized = false;

  constructor() {
    this.userId = this.getUserId();
  }

  private getUserId(): string {
    // Получаем или создаем уникальный ID пользователя
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  // Инициализация A/B тестирования
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Получаем назначения пользователя
      const response = await fetch(`/api/ab-testing/assignment/${this.userId}`);
      const assignments = await response.json();

      assignments.forEach((assignment: ABTestAssignment) => {
        this.assignments.set(assignment.testId, assignment);
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize A/B testing:', error);
    }
  }

  // Получение варианта для конкретного теста
  async getVariant(testType: string): Promise<string | null> {
    await this.initialize();

    // Проверяем кеш
    const cacheKey = `variant_${testType}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch('/api/ab-testing/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, testType })
      });

      const assignment = await response.json();
      if (assignment && assignment.variant) {
        this.cache.set(cacheKey, assignment.variant);
        this.assignments.set(assignment.testId, assignment);
        return assignment.variant;
      }
    } catch (error) {
      console.error('Failed to get variant:', error);
    }

    return null;
  }

  // Отслеживание события
  async trackEvent(
    testId: string, 
    eventType: string, 
    eventData?: any
  ): Promise<void> {
    const assignment = this.assignments.get(testId);
    if (!assignment) return;

    try {
      await fetch('/api/ab-testing/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          testId,
          variant: assignment.variant,
          eventType,
          eventData
        })
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Отслеживание конверсии
  async trackConversion(testType: string, value?: number): Promise<void> {
    const variant = await this.getVariant(testType);
    if (!variant) return;

    // Находим соответствующий тест
    const testId = Array.from(this.assignments.entries())
      .find(([_, assignment]) => assignment.variant === variant)?.[0];

    if (testId) {
      await this.trackEvent(testId, 'conversion', { value });
    }
  }

  // Отслеживание клика
  async trackClick(testType: string, element: string): Promise<void> {
    const variant = await this.getVariant(testType);
    if (!variant) return;

    const testId = Array.from(this.assignments.entries())
      .find(([_, assignment]) => assignment.variant === variant)?.[0];

    if (testId) {
      await this.trackEvent(testId, 'click', { element });
    }
  }

  // Получение конфигурации UI элемента для A/B теста
  async getUIConfig(elementType: string): Promise<any> {
    const variant = await this.getVariant('ui_ux');
    
    const configs = {
      // Конфигурации для кнопки создания игры
      'create-game-button': {
        'control': {
          text: 'Создать игру',
          className: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg',
          icon: '🎮'
        },
        'variant_a': {
          text: '✨ Создать игру с ИИ',
          className: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all',
          icon: '🚀'
        },
        'variant_b': {
          text: 'Начать создание',
          className: 'bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg border-2 border-green-400',
          icon: '⚡'
        }
      },

      // Конфигурации для навигации
      'navigation-style': {
        'control': {
          layout: 'horizontal',
          showIcons: true,
          emphasizeActive: false
        },
        'variant_a': {
          layout: 'horizontal',
          showIcons: true,
          emphasizeActive: true,
          activeStyle: 'bg-gradient-to-r from-blue-500 to-purple-600'
        }
      },

      // Конфигурации для карточек игр
      'game-card-layout': {
        'control': {
          style: 'standard',
          showStats: false,
          animation: 'none'
        },
        'variant_a': {
          style: 'enhanced',
          showStats: true,
          animation: 'hover-lift',
          gradient: true
        }
      }
    };

    return configs[elementType]?.[variant] || configs[elementType]?.['control'] || {};
  }

  // Получение конфигурации алгоритма генерации
  async getGenerationConfig(gameType: string): Promise<any> {
    const variant = await this.getVariant('generation_algorithm');
    
    const configs = {
      'arcade': {
        'control': {
          complexity: 'standard',
          aiModel: 'deepseek-coder',
          enhancedPrompts: false,
          iterativeRefinement: false
        },
        'variant_a': {
          complexity: 'enhanced',
          aiModel: 'gpt-4-turbo',
          enhancedPrompts: true,
          iterativeRefinement: true,
          qualityThreshold: 0.8
        }
      },

      'puzzle': {
        'control': {
          difficultyProgression: 'linear',
          adaptiveDifficulty: false,
          analyticsTracking: 'basic'
        },
        'variant_a': {
          difficultyProgression: 'adaptive',
          adaptiveDifficulty: true,
          analyticsTracking: 'advanced',
          playerPersonalization: true
        }
      }
    };

    return configs[gameType]?.[variant] || configs[gameType]?.['control'] || {};
  }

  // Получение конфигурации качества ассетов
  async getAssetQualityConfig(): Promise<any> {
    const variant = await this.getVariant('asset_quality');
    
    const configs = {
      'control': {
        resolution: 'standard',
        postProcessing: false,
        qualityChecks: 'basic',
        regenerationAttempts: 1
      },
      'variant_a': {
        resolution: 'high',
        postProcessing: true,
        qualityChecks: 'advanced',
        regenerationAttempts: 3,
        aiQualityScoring: true,
        aestheticOptimization: true
      }
    };

    return configs[variant] || configs['control'];
  }

  // Получение всех активных тестов пользователя
  getActiveTests(): ABTestAssignment[] {
    return Array.from(this.assignments.values());
  }

  // Проверка участия в тесте
  isInTest(testType: string): boolean {
    return Array.from(this.assignments.values())
      .some(assignment => assignment.testId.includes(testType));
  }

  // Получение метрик производительности A/B тестов
  async getPerformanceMetrics(): Promise<any> {
    try {
      const response = await fetch('/api/ab-testing/analytics');
      return await response.json();
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }

  // Принудительное назначение варианта (для отладки)
  forceVariant(testType: string, variant: string): void {
    const cacheKey = `variant_${testType}`;
    this.cache.set(cacheKey, variant);
  }

  // Очистка кеша
  clearCache(): void {
    this.cache.clear();
    this.initialized = false;
  }
}

// Экспорт единственного экземпляра
export const abTestingService = new ABTestingService();

// Хук для использования в React компонентах
export const useABTest = (testType: string) => {
  const [variant, setVariant] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const getVariant = async () => {
      setLoading(true);
      try {
        const result = await abTestingService.getVariant(testType);
        setVariant(result);
      } catch (error) {
        console.error('Failed to get A/B test variant:', error);
      } finally {
        setLoading(false);
      }
    };

    getVariant();
  }, [testType]);

  const trackEvent = React.useCallback((eventType: string, eventData?: any) => {
    const testId = Array.from(abTestingService.assignments.entries())
      .find(([_, assignment]) => assignment.variant === variant)?.[0];
    
    if (testId) {
      abTestingService.trackEvent(testId, eventType, eventData);
    }
  }, [variant]);

  return {
    variant,
    loading,
    trackEvent,
    trackConversion: () => abTestingService.trackConversion(testType),
    trackClick: (element: string) => abTestingService.trackClick(testType, element)
  };
};

// Хук для UI конфигурации
export const useABTestUI = (elementType: string) => {
  const [config, setConfig] = React.useState<any>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const getConfig = async () => {
      setLoading(true);
      try {
        const result = await abTestingService.getUIConfig(elementType);
        setConfig(result);
      } catch (error) {
        console.error('Failed to get UI config:', error);
      } finally {
        setLoading(false);
      }
    };

    getConfig();
  }, [elementType]);

  return { config, loading };
};

export default ABTestingService; 