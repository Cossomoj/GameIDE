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
  type: 'character' | 'mechanics' | 'levels' | 'graphics' | 'sounds' | 'ui' | 'story' | 
        'monetization' | 'multiplayer' | 'analytics' | 'localization' | 'accessibility' | 
        'performance' | 'tutorial' | 'achievements' | 'inventory' | 'dialogue' | 
        'cutscenes' | 'effects' | 'ai_behavior' | 'world_building' | 'economy';
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

export interface StoryVariant extends GenerationVariant {
  content: {
    plot: string;
    setting: string;
    characters: string[];
    narrative: string;
    themes: string[];
    tone: string;
  };
}

export interface MonetizationVariant extends GenerationVariant {
  content: {
    strategy: string;
    adPlacements: string[];
    iapItems: { name: string; price: string; type: string }[];
    revenueModel: string;
    targetAudience: string;
    expectedRevenue: string;
  };
}

export interface MultiplayerVariant extends GenerationVariant {
  content: {
    gameMode: string;
    matchmaking: string;
    playerCount: number;
    communication: string[];
    competitiveFeatures: string[];
    socialIntegration: string[];
  };
}

export interface AnalyticsVariant extends GenerationVariant {
  content: {
    trackingEvents: string[];
    kpis: string[];
    segments: string[];
    funnels: string[];
    privacyLevel: string;
    reportingSchedule: string;
  };
}

export interface LocalizationVariant extends GenerationVariant {
  content: {
    targetLanguages: string[];
    contentStrategy: string;
    culturalAdaptations: string[];
    voiceoverPlan: string;
    textExpansion: number;
    localMarkets: string[];
  };
}

export interface AccessibilityVariant extends GenerationVariant {
  content: {
    visualFeatures: string[];
    audioFeatures: string[];
    motorFeatures: string[];
    cognitiveFeatures: string[];
    guidelines: string[];
    certificationTarget: string;
  };
}

export interface PerformanceVariant extends GenerationVariant {
  content: {
    optimizationTargets: string[];
    deviceSupport: string[];
    framerate: number;
    memoryUsage: string;
    loadingStrategy: string;
    qualitySettings: string[];
  };
}

export interface TutorialVariant extends GenerationVariant {
  content: {
    approach: string;
    steps: { title: string; description: string; type: string }[];
    duration: string;
    interactivity: string;
    progressTracking: boolean;
    adaptiveFeatures: string[];
  };
}

export interface AchievementsVariant extends GenerationVariant {
  content: {
    categories: string[];
    achievements: { name: string; description: string; reward: string; difficulty: string }[];
    progressSystem: string;
    notifications: string;
    socialFeatures: string[];
    gamification: string[];
  };
}

export interface InventoryVariant extends GenerationVariant {
  content: {
    systemDesign: string;
    itemCategories: string[];
    capacity: string;
    organization: string;
    interactions: string[];
    visualDesign: string;
  };
}

export interface DialogueVariant extends GenerationVariant {
  content: {
    style: string;
    characters: { name: string; personality: string; voice: string }[];
    conversationFlow: string;
    choices: string[];
    emotionalSystem: string;
    localizationNotes: string[];
  };
}

export interface CutscenesVariant extends GenerationVariant {
  content: {
    style: string;
    scenes: { name: string; description: string; duration: string; purpose: string }[];
    transitions: string[];
    interactivity: string;
    production: string;
    assets: string[];
  };
}

export interface EffectsVariant extends GenerationVariant {
  content: {
    visualEffects: string[];
    particleSystems: string[];
    shaderEffects: string[];
    audioEffects: string[];
    performance: string;
    customization: string[];
  };
}

export interface AIBehaviorVariant extends GenerationVariant {
  content: {
    behaviorTrees: string[];
    stateManagement: string;
    decisionMaking: string;
    learning: string;
    interactions: string[];
    difficulty: string;
  };
}

export interface WorldBuildingVariant extends GenerationVariant {
  content: {
    worldConcept: string;
    environments: string[];
    lore: string;
    geography: string;
    culture: string;
    history: string;
  };
}

export interface EconomyVariant extends GenerationVariant {
  content: {
    currencySystem: string;
    resources: string[];
    trading: string;
    pricing: string;
    balance: string;
    playerProgression: string;
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
  story: {
    narrativeStyle: 'linear' | 'branching' | 'open_world';
    dialogueSystem: boolean;
    cinematics: boolean;
  };
  monetization: {
    model: 'free' | 'premium' | 'freemium' | 'subscription';
    adPlacement: ('banner' | 'interstitial' | 'rewarded' | 'native')[];
    iapStrategy: 'cosmetic' | 'gameplay' | 'convenience' | 'hybrid';
  };
  multiplayer: {
    mode: 'local' | 'online' | 'hybrid';
    maxPlayers: number;
    competitiveFeatures: boolean;
    socialFeatures: ('chat' | 'friends' | 'guilds' | 'leaderboards')[];
  };
  analytics: {
    trackingLevel: 'basic' | 'detailed' | 'comprehensive';
    gdprCompliant: boolean;
    customEvents: string[];
  };
  localization: {
    languages: string[];
    contentTypes: ('text' | 'audio' | 'images')[];
    rtlSupport: boolean;
  };
  accessibility: {
    visualAids: ('colorblind' | 'high_contrast' | 'text_scaling')[];
    audioAids: ('subtitles' | 'audio_descriptions' | 'sound_visualization')[];
    motorAids: ('button_remapping' | 'hold_to_toggle' | 'simplified_controls')[];
  };
  performance: {
    targetFPS: 30 | 60 | 120;
    deviceTiers: ('low' | 'medium' | 'high')[];
    optimizationLevel: 'basic' | 'moderate' | 'aggressive';
  };
  tutorial: {
    style: 'interactive' | 'video' | 'text' | 'guided';
    complexity: 'minimal' | 'comprehensive' | 'adaptive';
    skippable: boolean;
  };
  achievements: {
    types: ('progress' | 'skill' | 'exploration' | 'social' | 'collection')[];
    notifications: boolean;
    rewards: ('xp' | 'items' | 'cosmetics' | 'currency')[];
  };
  inventory: {
    systemType: 'grid' | 'list' | 'category';
    itemTypes: ('consumable' | 'equipment' | 'resource' | 'quest')[];
    sorting: boolean;
  };
  dialogue: {
    systemType: 'linear' | 'choice_based' | 'keyword';
    voiceActing: boolean;
    emotionSystem: boolean;
  };
  cutscenes: {
    style: 'in_engine' | 'pre_rendered' | 'motion_graphics';
    interactivity: 'none' | 'minimal' | 'full';
    skippable: boolean;
  };
  effects: {
    particleSystem: boolean;
    shaderEffects: ('bloom' | 'blur' | 'distortion' | 'lighting')[];
    screenEffects: ('shake' | 'flash' | 'slow_motion' | 'zoom')[];
  };
  ai_behavior: {
    complexity: 'simple' | 'moderate' | 'advanced';
    behaviorTypes: ('patrol' | 'chase' | 'flee' | 'collaborative')[];
    learningSystem: boolean;
  };
  world_building: {
    scope: 'single_scene' | 'multiple_areas' | 'open_world';
    interactiveElements: ('doors' | 'switches' | 'collectibles' | 'secrets')[];
    dynamicEvents: boolean;
  };
  economy: {
    currencyTypes: ('single' | 'dual' | 'multiple')[];
    inflation: 'none' | 'controlled' | 'dynamic';
    tradingSystem: boolean;
  };
}

export type StepType = keyof StepOptions;

export interface InteractiveGameStep {
  stepId: string;
  name: string;
  description: string;
  type: 'concept' | 'character' | 'level' | 'graphics' | 'audio' | 'final';
  variants: StepVariant[];
  selectedVariant?: string;
  aiPrompt?: string;
  order: number;
}

export interface StepVariant {
  id: string;
  title: string;
  description: string;
  details?: any;
  aiGenerated: boolean;
  generatedAt: Date;
  prompt?: string;
  metadata?: {
    complexity?: 'simple' | 'medium' | 'complex';
    tags?: string[];
    estimatedTime?: number;
  };
}

export interface InteractiveGameSession {
  gameId: string;
  userId: string;
  title: string;
  description: string;
  genre: string;
  currentStep: number;
  totalSteps: number;
  steps: InteractiveGameStep[];
  isActive: boolean;
  isPaused: boolean;
  completedSteps: number;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  finalGameData?: {
    gamePath: string;
    downloadUrl: string;
    assets: string[];
  };
  configuration: {
    quality: 'fast' | 'balanced' | 'high';
    aiProvider: string;
    enabledFeatures: string[];
  };
}

export interface GenerateVariantsRequest {
  stepType: InteractiveGameStep['type'];
  count: number;
  basePrompt: string;
  gameContext: {
    title: string;
    description: string;
    genre: string;
    previousChoices: Array<{
      stepId: string;
      choice: string;
    }>;
  };
  customPrompt?: string;
}

export interface GenerateVariantsResponse {
  variants: StepVariant[];
  generationTime: number;
  tokensUsed: number;
} 