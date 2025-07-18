export interface InteractiveGameRequest {
  id: string;
  userId?: string;
  prompt: string;
  title: string;
  genre: string;
  description: string;
  mode: 'interactive'; // Отличаем от обычной автогенерации
  createdAt: Date;
}

export interface GenerationVariant {
  id: string;
  type: 'ai_generated' | 'user_uploaded' | 'user_prompt';
  content: any; // Зависит от типа - может быть текст, изображение, код и т.д.
  preview?: string; // URL для превью или base64
  metadata?: {
    prompt?: string;
    style?: string;
    filename?: string;
    size?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface InteractiveStep {
  stepId: string;
  name: string;
  description: string;
  type: 'character' | 'mechanics' | 'levels' | 'graphics' | 'sounds' | 'ui' | 'story';
  variants: GenerationVariant[];
  selectedVariant?: string; // ID выбранного варианта
  customPrompt?: string; // Пользовательский промпт для данного этапа
  isCompleted: boolean;
  isSkippable: boolean;
}

export interface CharacterVariant extends GenerationVariant {
  content: {
    name: string;
    description: string;
    appearance: string;
    abilities: string[];
    primaryColor: string;
    style: string;
    spriteUrl?: string;
  };
}

export interface MechanicsVariant extends GenerationVariant {
  content: {
    coreLoop: string;
    controls: string[];
    objectives: string[];
    progression: string;
    difficulty: string;
    specialFeatures: string[];
  };
}

export interface LevelVariant extends GenerationVariant {
  content: {
    layout: string;
    theme: string;
    obstacles: string[];
    collectibles: string[];
    enemies: string[];
    backgroundElements: string[];
    size: { width: number; height: number };
  };
}

export interface GraphicsVariant extends GenerationVariant {
  content: {
    artStyle: string;
    colorPalette: string[];
    theme: string;
    mood: string;
    examples: string[]; // URLs к примерам
  };
}

export interface SoundVariant extends GenerationVariant {
  content: {
    style: string;
    mood: string;
    instruments: string[];
    tempo: string;
    audioUrl?: string;
    duration?: number;
  };
}

export interface UIVariant extends GenerationVariant {
  content: {
    style: string;
    layout: string;
    colorScheme: string;
    components: string[];
    mockupUrl?: string;
  };
}

export interface InteractiveGenerationState {
  gameId: string;
  userId?: string;
  currentStepIndex: number;
  totalSteps: number;
  steps: InteractiveStep[];
  startedAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  finalChoices: Record<string, string>; // stepId -> selectedVariantId
  generatedGame?: string; // Путь к финальной игре
  gameConfiguration?: any; // Конфигурация игры из GameConfiguration
}

export interface StepGenerationRequest {
  gameId: string;
  stepId: string;
  type: 'generate_more' | 'custom_prompt' | 'upload_file';
  customPrompt?: string;
  contextFromPreviousSteps?: any;
}

export interface FileUploadSpec {
  acceptedFormats: string[];
  maxSizeBytes: number;
  dimensions?: {
    min: { width: number; height: number };
    max: { width: number; height: number };
    recommended: { width: number; height: number };
  };
  description: string;
  examples: string[];
}

export interface StepGuide {
  stepType: string;
  title: string;
  description: string;
  aiGenerationPrompt: string;
  fileUploadSpec?: FileUploadSpec;
  customPromptGuide?: {
    placeholder: string;
    examples: string[];
    tips: string[];
  };
}

// Конфигурация интерактивных этапов для разных жанров
export interface InteractiveStepConfig {
  genre: string;
  steps: StepGuide[];
}

// Ответы от AI для генерации вариантов
export interface VariantGenerationResponse {
  stepId: string;
  variants: GenerationVariant[];
  generatedAt: Date;
  totalCount: number;
  hasMore: boolean; // Можно ли сгенерировать еще
}

// WebSocket события для интерактивной генерации
export interface InteractiveGenerationEvents {
  'step:started': {
    gameId: string;
    stepIndex: number;
    step: InteractiveStep;
  };
  'variants:generated': {
    gameId: string;
    stepId: string;
    variants: GenerationVariant[];
  };
  'variants:generating': {
    gameId: string;
    stepId: string;
    progress: number;
    message: string;
  };
  'step:completed': {
    gameId: string;
    stepId: string;
    selectedVariant: GenerationVariant;
  };
  'generation:paused': {
    gameId: string;
    reason: string;
  };
  'generation:resumed': {
    gameId: string;
    fromStep: number;
  };
  'generation:completed': {
    gameId: string;
    finalGame: {
      path: string;
      downloadUrl: string;
      size: number;
    };
  };
  'error': {
    gameId: string;
    stepId?: string;
    message: string;
    code: string;
  };
}

// Опции для каждого типа этапа
export interface StepOptions {
  character: {
    generateSprites: boolean;
    includeAnimations: boolean;
    styleVariations: string[];
  };
  mechanics: {
    complexityLevel: 'simple' | 'medium' | 'complex';
    includeMultiplayer: boolean;
    monetizationOptions: string[];
  };
  levels: {
    numberOfLevels: number;
    difficulty: 'linear' | 'adaptive' | 'custom';
    procedural: boolean;
  };
  graphics: {
    assetTypes: ('sprites' | 'backgrounds' | 'ui' | 'effects')[];
    resolution: 'low' | 'medium' | 'high';
    animationStyle: string;
  };
  sounds: {
    includeMusic: boolean;
    includeSFX: boolean;
    quality: 'basic' | 'enhanced' | 'premium';
  };
  ui: {
    complexity: 'minimal' | 'standard' | 'rich';
    mobileOptimized: boolean;
    accessibility: boolean;
  };
}

export type StepType = keyof StepOptions; 