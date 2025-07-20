import { LoggerService } from './logger';
import { GameDAO } from '../database';

const logger = new LoggerService();

// Интерфейсы для расширенной кастомизации
interface GameCustomizationProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  parameters: CustomizationParameters;
  styleSettings: StyleSettings;
  mechanicsSettings: MechanicsSettings;
  uiSettings: UISettings;
  audioSettings: AudioSettings;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

interface CustomizationParameters {
  // Основные параметры
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  targetAudience: 'children' | 'casual' | 'core' | 'hardcore';
  sessionLength: 'quick' | 'medium' | 'long' | 'endless';
  
  // Визуальные параметры
  colorScheme: 'vibrant' | 'muted' | 'monochrome' | 'custom';
  artStyle: 'pixel' | 'cartoon' | 'realistic' | 'abstract' | 'minimalist';
  animationLevel: 'none' | 'basic' | 'rich' | 'cinematic';
  
  // Геймплейные параметры
  difficultyProgression: 'linear' | 'exponential' | 'adaptive' | 'custom';
  replayability: 'low' | 'medium' | 'high' | 'infinite';
  socialFeatures: 'none' | 'leaderboards' | 'multiplayer' | 'full';
}

interface StyleSettings {
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
    fontWeight: 'light' | 'normal' | 'bold';
  };
  layout: {
    spacing: 'compact' | 'normal' | 'spacious';
    borderRadius: 'sharp' | 'rounded' | 'circular';
    shadows: 'none' | 'subtle' | 'prominent';
  };
}

interface MechanicsSettings {
  movement: {
    type: 'discrete' | 'continuous' | 'physics-based';
    speed: 'slow' | 'normal' | 'fast' | 'variable';
    controls: 'simple' | 'standard' | 'complex';
  };
  progression: {
    type: 'level-based' | 'score-based' | 'time-based' | 'exploration-based';
    rewards: 'immediate' | 'delayed' | 'milestone' | 'achievement';
    unlocks: 'linear' | 'branching' | 'free-choice';
  };
  interactions: {
    feedbackType: 'visual' | 'audio' | 'haptic' | 'combined';
    responseTime: 'instant' | 'delayed' | 'realistic';
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

interface UISettings {
  hud: {
    visibility: 'minimal' | 'standard' | 'full' | 'customizable';
    position: 'top' | 'bottom' | 'sides' | 'floating';
    style: 'flat' | 'layered' | 'transparent';
  };
  menus: {
    style: 'simple' | 'detailed' | 'contextual' | 'immersive';
    navigation: 'tabs' | 'sidebar' | 'popup' | 'integrated';
    animations: 'none' | 'subtle' | 'elaborate';
  };
  accessibility: {
    colorBlindSupport: boolean;
    fontSize: 'adjustable' | 'fixed';
    contrast: 'normal' | 'high';
    screenReader: boolean;
  };
}

interface AudioSettings {
  music: {
    style: 'ambient' | 'melodic' | 'rhythmic' | 'adaptive' | 'none';
    volume: 'quiet' | 'moderate' | 'loud';
    variety: 'single' | 'multiple' | 'procedural';
  };
  effects: {
    quantity: 'minimal' | 'standard' | 'rich';
    type: 'realistic' | 'stylized' | 'retro' | 'futuristic';
    spatialAudio: boolean;
  };
  voice: {
    narration: 'none' | 'text-only' | 'voice-over';
    language: 'ru' | 'en' | 'multi';
    characterVoices: boolean;
  };
}

export class EnhancedCustomizationService {
  private gameDAO: GameDAO;
  private customizationProfiles: Map<string, GameCustomizationProfile> = new Map();

  constructor() {
    this.gameDAO = new GameDAO();
    this.initializeDefaultProfiles();
  }

  /**
   * Инициализирует набор готовых профилей кастомизации
   */
  private initializeDefaultProfiles(): void {
    const defaultProfiles: Partial<GameCustomizationProfile>[] = [
      {
        name: 'Казуальная игра',
        description: 'Простая и доступная игра для широкой аудитории',
        parameters: {
          complexity: 'simple',
          targetAudience: 'casual',
          sessionLength: 'quick',
          colorScheme: 'vibrant',
          artStyle: 'cartoon',
          animationLevel: 'basic',
          difficultyProgression: 'linear',
          replayability: 'medium',
          socialFeatures: 'leaderboards'
        }
      },
      {
        name: 'Хардкорная игра',
        description: 'Сложная игра для опытных геймеров',
        parameters: {
          complexity: 'expert',
          targetAudience: 'hardcore',
          sessionLength: 'long',
          colorScheme: 'muted',
          artStyle: 'realistic',
          animationLevel: 'cinematic',
          difficultyProgression: 'exponential',
          replayability: 'infinite',
          socialFeatures: 'full'
        }
      },
      {
        name: 'Детская игра',
        description: 'Яркая и безопасная игра для детей',
        parameters: {
          complexity: 'simple',
          targetAudience: 'children',
          sessionLength: 'quick',
          colorScheme: 'vibrant',
          artStyle: 'cartoon',
          animationLevel: 'rich',
          difficultyProgression: 'adaptive',
          replayability: 'high',
          socialFeatures: 'none'
        }
      },
      {
        name: 'Минималистичная игра',
        description: 'Элегантная игра с простым дизайном',
        parameters: {
          complexity: 'medium',
          targetAudience: 'core',
          sessionLength: 'medium',
          colorScheme: 'monochrome',
          artStyle: 'minimalist',
          animationLevel: 'basic',
          difficultyProgression: 'linear',
          replayability: 'medium',
          socialFeatures: 'leaderboards'
        }
      }
    ];

    defaultProfiles.forEach((profile, index) => {
      const fullProfile: GameCustomizationProfile = {
        id: `default-${index}`,
        userId: 'system',
        name: profile.name!,
        description: profile.description!,
        parameters: profile.parameters!,
        styleSettings: this.generateStyleSettings(profile.parameters!),
        mechanicsSettings: this.generateMechanicsSettings(profile.parameters!),
        uiSettings: this.generateUISettings(profile.parameters!),
        audioSettings: this.generateAudioSettings(profile.parameters!),
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 0
      };

      this.customizationProfiles.set(fullProfile.id, fullProfile);
    });

    logger.info(`🎨 Инициализировано ${defaultProfiles.length} профилей кастомизации`);
  }

  /**
   * Создает новый профиль кастомизации
   */
  async createCustomizationProfile(
    userId: string,
    name: string,
    description: string,
    parameters: CustomizationParameters
  ): Promise<GameCustomizationProfile> {
    const profile: GameCustomizationProfile = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      name,
      description,
      parameters,
      styleSettings: this.generateStyleSettings(parameters),
      mechanicsSettings: this.generateMechanicsSettings(parameters),
      uiSettings: this.generateUISettings(parameters),
      audioSettings: this.generateAudioSettings(parameters),
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1
    };

    this.customizationProfiles.set(profile.id, profile);
    
    logger.info(`🎨 Создан новый профиль кастомизации: ${name} (${profile.id})`);
    return profile;
  }

  /**
   * Применяет профиль кастомизации к запросу генерации игры
   */
  async applyCustomizationProfile(
    gameGenerationRequest: any,
    profileId: string
  ): Promise<any> {
    const profile = this.customizationProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Профиль кастомизации не найден: ${profileId}`);
    }

    // Увеличиваем счетчик использования
    profile.useCount++;
    profile.lastUsed = new Date();

    // Применяем кастомизацию к запросу
    const customizedRequest = {
      ...gameGenerationRequest,
      customization: {
        profileId: profile.id,
        profileName: profile.name,
        parameters: profile.parameters,
        styleSettings: profile.styleSettings,
        mechanicsSettings: profile.mechanicsSettings,
        uiSettings: profile.uiSettings,
        audioSettings: profile.audioSettings
      },
      // Модифицируем базовые параметры
      prompt: {
        ...gameGenerationRequest.prompt,
        complexity: profile.parameters.complexity,
        targetAudience: profile.parameters.targetAudience,
        visualStyle: this.generateVisualStyleDescription(profile),
        mechanicsDescription: this.generateMechanicsDescription(profile),
        customizationPrompt: this.generateCustomizationPrompt(profile)
      }
    };

    logger.info(`🎨 Применен профиль кастомизации: ${profile.name}`);
    return customizedRequest;
  }

  /**
   * Получает доступные профили кастомизации для пользователя
   */
  getAvailableProfiles(userId: string): GameCustomizationProfile[] {
    const userProfiles = Array.from(this.customizationProfiles.values())
      .filter(profile => profile.userId === userId || profile.userId === 'system')
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

    return userProfiles;
  }

  /**
   * Получает рекомендуемые профили на основе предпочтений пользователя
   */
  getRecommendedProfiles(
    userId: string,
    userPreferences: any
  ): GameCustomizationProfile[] {
    const allProfiles = Array.from(this.customizationProfiles.values());
    
    // Рассчитываем совместимость каждого профиля с предпочтениями
    const scoredProfiles = allProfiles.map(profile => ({
      profile,
      score: this.calculateCompatibilityScore(profile, userPreferences)
    }));

    // Сортируем по счету совместимости
    return scoredProfiles
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.profile);
  }

  /**
   * Генерирует настройки стиля на основе параметров
   */
  private generateStyleSettings(parameters: CustomizationParameters): StyleSettings {
    const colorSchemes = {
      vibrant: { primary: '#FF6B6B', secondary: '#4ECDC4', accent: '#45B7D1', background: '#F8F9FA', text: '#2C3E50' },
      muted: { primary: '#95A5A6', secondary: '#BDC3C7', accent: '#E74C3C', background: '#ECF0F1', text: '#34495E' },
      monochrome: { primary: '#2C3E50', secondary: '#95A5A6', accent: '#E74C3C', background: '#FFFFFF', text: '#2C3E50' },
      custom: { primary: '#3498DB', secondary: '#9B59B6', accent: '#F39C12', background: '#FFFFFF', text: '#2C3E50' }
    };

    const typographySettings = {
      pixel: { fontFamily: 'monospace', fontSize: 'medium', fontWeight: 'normal' },
      cartoon: { fontFamily: 'sans-serif', fontSize: 'large', fontWeight: 'bold' },
      realistic: { fontFamily: 'serif', fontSize: 'medium', fontWeight: 'normal' },
      abstract: { fontFamily: 'fantasy', fontSize: 'medium', fontWeight: 'light' },
      minimalist: { fontFamily: 'sans-serif', fontSize: 'small', fontWeight: 'light' }
    };

    return {
      theme: colorSchemes[parameters.colorScheme],
      typography: typographySettings[parameters.artStyle],
      layout: {
        spacing: parameters.complexity === 'simple' ? 'spacious' : 'normal',
        borderRadius: parameters.artStyle === 'minimalist' ? 'sharp' : 'rounded',
        shadows: parameters.artStyle === 'realistic' ? 'prominent' : 'subtle'
      }
    };
  }

  /**
   * Генерирует настройки механик на основе параметров
   */
  private generateMechanicsSettings(parameters: CustomizationParameters): MechanicsSettings {
    const movementTypes = {
      simple: { type: 'discrete', speed: 'normal', controls: 'simple' },
      medium: { type: 'continuous', speed: 'normal', controls: 'standard' },
      complex: { type: 'physics-based', speed: 'variable', controls: 'complex' },
      expert: { type: 'physics-based', speed: 'fast', controls: 'complex' }
    };

    const progressionTypes = {
      children: { type: 'level-based', rewards: 'immediate', unlocks: 'linear' },
      casual: { type: 'score-based', rewards: 'milestone', unlocks: 'linear' },
      core: { type: 'level-based', rewards: 'achievement', unlocks: 'branching' },
      hardcore: { type: 'exploration-based', rewards: 'delayed', unlocks: 'free-choice' }
    };

    return {
      movement: movementTypes[parameters.complexity],
      progression: progressionTypes[parameters.targetAudience],
      interactions: {
        feedbackType: parameters.animationLevel === 'rich' ? 'combined' : 'visual',
        responseTime: parameters.complexity === 'expert' ? 'realistic' : 'instant',
        complexity: parameters.complexity === 'simple' ? 'simple' : 'moderate'
      }
    };
  }

  /**
   * Генерирует настройки UI на основе параметров
   */
  private generateUISettings(parameters: CustomizationParameters): UISettings {
    return {
      hud: {
        visibility: parameters.complexity === 'simple' ? 'minimal' : 'standard',
        position: parameters.targetAudience === 'children' ? 'bottom' : 'top',
        style: parameters.artStyle === 'minimalist' ? 'flat' : 'layered'
      },
      menus: {
        style: parameters.complexity === 'expert' ? 'detailed' : 'simple',
        navigation: parameters.socialFeatures === 'full' ? 'tabs' : 'popup',
        animations: parameters.animationLevel === 'none' ? 'none' : 'subtle'
      },
      accessibility: {
        colorBlindSupport: true,
        fontSize: 'adjustable',
        contrast: parameters.targetAudience === 'children' ? 'high' : 'normal',
        screenReader: parameters.targetAudience === 'children'
      }
    };
  }

  /**
   * Генерирует настройки аудио на основе параметров
   */
  private generateAudioSettings(parameters: CustomizationParameters): AudioSettings {
    const musicStyles = {
      children: { style: 'melodic', volume: 'moderate', variety: 'multiple' },
      casual: { style: 'ambient', volume: 'quiet', variety: 'single' },
      core: { style: 'adaptive', volume: 'moderate', variety: 'multiple' },
      hardcore: { style: 'rhythmic', volume: 'loud', variety: 'procedural' }
    };

    return {
      music: musicStyles[parameters.targetAudience],
      effects: {
        quantity: parameters.complexity === 'simple' ? 'minimal' : 'standard',
        type: parameters.artStyle === 'pixel' ? 'retro' : 'stylized',
        spatialAudio: parameters.complexity === 'expert'
      },
      voice: {
        narration: parameters.targetAudience === 'children' ? 'voice-over' : 'text-only',
        language: 'ru',
        characterVoices: parameters.complexity !== 'simple'
      }
    };
  }

  /**
   * Генерирует описание визуального стиля для промпта
   */
  private generateVisualStyleDescription(profile: GameCustomizationProfile): string {
    const { parameters, styleSettings } = profile;
    
    let description = `Визуальный стиль: ${parameters.artStyle}`;
    description += `, цветовая схема: ${parameters.colorScheme}`;
    description += `, уровень анимации: ${parameters.animationLevel}`;
    description += `. Основные цвета: ${styleSettings.theme.primary}, ${styleSettings.theme.secondary}`;
    
    return description;
  }

  /**
   * Генерирует описание механик для промпта
   */
  private generateMechanicsDescription(profile: GameCustomizationProfile): string {
    const { mechanicsSettings } = profile;
    
    let description = `Механики движения: ${mechanicsSettings.movement.type}`;
    description += `, система прогрессии: ${mechanicsSettings.progression.type}`;
    description += `, тип взаимодействий: ${mechanicsSettings.interactions.feedbackType}`;
    
    return description;
  }

  /**
   * Генерирует специальный промпт для кастомизации
   */
  private generateCustomizationPrompt(profile: GameCustomizationProfile): string {
    const { parameters } = profile;
    
    let prompt = `КАСТОМИЗАЦИЯ ИГРЫ:
- Сложность: ${parameters.complexity}
- Целевая аудитория: ${parameters.targetAudience}
- Длительность сессии: ${parameters.sessionLength}
- Художественный стиль: ${parameters.artStyle}
- Прогрессия сложности: ${parameters.difficultyProgression}
- Социальные функции: ${parameters.socialFeatures}

Примени эти параметры при генерации кода игры, учтя все специфические требования.`;
    
    return prompt;
  }

  /**
   * Рассчитывает совместимость профиля с предпочтениями пользователя
   */
  private calculateCompatibilityScore(
    profile: GameCustomizationProfile,
    userPreferences: any
  ): number {
    let score = 0;

    // Совпадение по сложности
    if (profile.parameters.complexity === userPreferences.preferredComplexity) {
      score += 30;
    }

    // Совпадение по любимым жанрам
    if (userPreferences.favoriteGenres?.includes(profile.parameters.targetAudience)) {
      score += 25;
    }

    // Совпадение по стилю
    if (userPreferences.preferredStyles?.includes(profile.parameters.artStyle)) {
      score += 20;
    }

    // Популярность профиля
    score += Math.min(profile.useCount * 2, 15);

    // Недавнее использование
    const daysSinceLastUse = (Date.now() - profile.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(10 - daysSinceLastUse, 0);

    return Math.min(score, 100);
  }
}

export default EnhancedCustomizationService; 