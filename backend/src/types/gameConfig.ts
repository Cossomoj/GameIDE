// Основные жанры и типы игр
export type MainGenre = 
  | 'action' | 'strategy' | 'rpg' | 'simulation' | 'sports' 
  | 'racing' | 'fighting' | 'shooter' | 'platformer' | 'puzzle' 
  | 'arcade' | 'adventure' | 'horror' | 'survival';

export type SubGenre = 
  | 'metroidvania' | 'roguelike' | 'tower_defense' | 'idle' | 'clicker' 
  | 'runner' | 'battle_royale' | 'moba' | 'card' | 'turn_based';

export type GameMode = 
  | 'single_player' | 'cooperative' | 'pvp' | 'mmo';

export type ProgressionType = 
  | 'linear' | 'open_world' | 'levels' | 'endless';

// Визуальный стиль
export type GraphicStyle = 
  | 'pixel_art_8bit' | 'pixel_art_16bit' | 'pixel_art_32bit' | 'vector' 
  | '3d_realistic' | '3d_low_poly' | '2_5d' | 'isometric' | 'cel_shading' 
  | 'cartoon' | 'minimalist' | 'photorealistic' | 'stylized' | 'neon' 
  | 'retro' | 'noir';

export type ColorPalette = 
  | 'bright' | 'dark' | 'monochrome' | 'pastel' | 'contrast' | 'neon';

export type ArtDirection = 
  | 'fantasy' | 'cyberpunk' | 'steampunk' | 'realism' | 'surrealism' 
  | 'abstract' | 'anime' | 'manga';

export type GraphicQuality = 
  | 'hd' | 'full_hd' | '4k' | 'retro';

// Камера и перспектива
export type CameraView = 
  | 'side_view' | 'top_down' | 'isometric' | 'first_person' | 'third_person' 
  | '2_5d' | 'fixed' | 'free';

export type ScrollType = 
  | 'horizontal' | 'vertical' | 'multidirectional' | 'static_screen';

export type CameraBehavior = 
  | 'following' | 'dynamic' | 'cinematic' | 'manual_control';

// Управление
export type InputDevice = 
  | 'keyboard' | 'mouse' | 'touchscreen' | 'gamepad' | 'gestures' | 'accelerometer';

export type ControlScheme = 
  | 'wasd' | 'arrows' | 'point_and_click' | 'drag_and_drop' | 'swipes' 
  | 'taps' | 'multitouch' | 'virtual_joystick';

export type ControlComplexity = 
  | 'simple' | 'medium' | 'complex';

// Игровые механики
export type CoreMechanic = 
  | 'jumping' | 'shooting' | 'building' | 'resource_gathering' | 'crafting' 
  | 'exploration' | 'puzzle_solving' | 'stealth';

export type CombatSystem = 
  | 'melee' | 'ranged' | 'magic' | 'combo' | 'block_parry' | 'dodge' 
  | 'special_moves' | 'fatality';

export type MovementSystem = 
  | 'running' | 'jumping' | 'double_jump' | 'dash' | 'flying' | 'swimming' 
  | 'climbing' | 'parkour' | 'teleportation';

export type PhysicsType = 
  | 'realistic' | 'arcade' | 'ragdoll' | 'destructible' | 'gravity';

export type TimeSystem = 
  | 'real_time' | 'turn_based' | 'pause' | 'bullet_time' | 'rewind';

// Прогрессия и развитие
export interface CharacterProgression {
  levelSystem: boolean;
  skillTree: 'linear' | 'branching' | 'none';
  equipment: {
    weapons: boolean;
    armor: boolean;
    accessories: boolean;
    cosmetic: boolean;
  };
  currency: {
    ingame: boolean;
    premium: boolean;
    multiple: boolean;
  };
  collection: {
    items: boolean;
    characters: boolean;
    cards: boolean;
    achievements: boolean;
  };
}

// Контент и структура
export interface ContentStructure {
  levels: number;
  duration: 'short' | 'medium' | 'long';
  replayability: 'high' | 'medium' | 'low';
  proceduralGeneration: {
    levels: boolean;
    enemies: boolean;
    loot: boolean;
  };
  story: {
    hasStory: boolean;
    type: 'linear' | 'branching' | 'multiple_endings';
  };
  dialogues: boolean;
}

// Сложность и баланс
export interface DifficultyBalance {
  difficultyLevels: ('easy' | 'normal' | 'hard' | 'nightmare' | 'custom')[];
  difficultyCurve: 'smooth' | 'steep' | 'adaptive';
  deathSystem: 'permanent' | 'checkpoints' | 'respawn' | 'lives';
  playerHelp: {
    hints: boolean;
    tutorial: boolean;
    autoAim: boolean;
    assists: boolean;
  };
}

// Социальные функции
export interface SocialFeatures {
  multiplayer: 'local' | 'online' | 'async' | 'none';
  leaderboards: {
    global: boolean;
    friends: boolean;
    weekly: boolean;
  };
  achievements: boolean;
  sharing: {
    screenshots: boolean;
    videos: boolean;
    results: boolean;
  };
  guilds: boolean;
  chat: {
    text: boolean;
    voice: boolean;
    emotes: boolean;
  };
}

// Технические параметры
export interface TechnicalSpecs {
  platform: 'browser' | 'ios' | 'android' | 'crossplatform';
  gameSize: string; // В МБ
  internetRequirement: 'always' | 'download_only' | 'offline';
  orientation: 'portrait' | 'landscape' | 'both';
  frameRate: '30fps' | '60fps' | '120fps' | 'variable';
  loadingType: 'full' | 'streaming' | 'partial';
}

// Монетизация
export interface MonetizationModel {
  model: 'free' | 'paid' | 'freemium' | 'subscription';
  inAppPurchases: {
    cosmetic: boolean;
    boosters: boolean;
    content: boolean;
    payToWin: boolean;
  };
  advertising: {
    banners: boolean;
    video: boolean;
    rewarded: boolean;
    interstitial: boolean;
  };
  energy: boolean;
  battlePass: boolean;
}

// Аудио
export interface AudioSettings {
  music: {
    type: 'original' | 'licensed';
    genre: string;
  };
  soundEffects: 'realistic' | 'arcade' | 'minimalist';
  voiceOver: 'full' | 'partial' | 'text_only';
  languages: string[];
  separateControls: boolean;
}

// Дополнительные параметры
export interface AdditionalParams {
  ageRating: '0+' | '6+' | '12+' | '16+' | '18+';
  interfaceLanguages: string[];
  subtitles: boolean;
  accessibility: boolean;
  modSupport: boolean;
}

// Специфичные для жанров параметры
export interface GenreSpecificParams {
  platformer?: {
    jumpTypes: string[];
    movementMechanics: string[];
    enemyTypes: string[];
  };
  shooter?: {
    weaponTypes: string[];
    shootingModes: string[];
    coverSystem: boolean;
  };
  strategy?: {
    strategyType: 'rts' | 'tbs';
    resources: string[];
    unitTypes: string[];
  };
  rpg?: {
    classes: string[];
    inventory: boolean;
    questSystem: boolean;
  };
  racing?: {
    vehicleTypes: string[];
    physics: 'realistic' | 'arcade';
    trackTypes: string[];
  };
  fighting?: {
    comboSystem: boolean;
    characters: number;
    arenas: number;
  };
}

// Основная конфигурация игры
export interface GameConfiguration {
  // Основные параметры
  title: string;
  description: string;
  
  // Жанр и тип
  mainGenre: MainGenre;
  subGenre?: SubGenre;
  gameMode: GameMode;
  progressionType: ProgressionType;
  
  // Визуальный стиль
  visualStyle: {
    graphicStyle: GraphicStyle;
    colorPalette: ColorPalette;
    artDirection: ArtDirection;
    quality: GraphicQuality;
  };
  
  // Камера и перспектива
  camera: {
    view: CameraView;
    scrollType: ScrollType;
    behavior: CameraBehavior;
  };
  
  // Управление
  controls: {
    devices: InputDevice[];
    scheme: ControlScheme;
    complexity: ControlComplexity;
    customizable: boolean;
  };
  
  // Игровые механики
  mechanics: {
    core: CoreMechanic[];
    combat?: CombatSystem[];
    movement: MovementSystem[];
    physics: PhysicsType;
    time: TimeSystem;
  };
  
  // Прогрессия
  progression: CharacterProgression;
  
  // Контент
  content: ContentStructure;
  
  // Сложность
  difficulty: DifficultyBalance;
  
  // Социальные функции
  social: SocialFeatures;
  
  // Технические параметры
  technical: TechnicalSpecs;
  
  // Монетизация
  monetization: MonetizationModel;
  
  // Аудио
  audio: AudioSettings;
  
  // Дополнительно
  additional: AdditionalParams;
  
  // Специфичные для жанра
  genreSpecific?: GenreSpecificParams;
}

// Опции для выбора (для UI)
export interface GameConfigOptions {
  mainGenres: Array<{ value: MainGenre; label: string; description: string }>;
  subGenres: Array<{ value: SubGenre; label: string; parentGenres: MainGenre[] }>;
  gameModes: Array<{ value: GameMode; label: string; description: string }>;
  progressionTypes: Array<{ value: ProgressionType; label: string; description: string }>;
  
  graphicStyles: Array<{ value: GraphicStyle; label: string; preview?: string }>;
  colorPalettes: Array<{ value: ColorPalette; label: string; colors: string[] }>;
  artDirections: Array<{ value: ArtDirection; label: string; description: string }>;
  
  cameraViews: Array<{ value: CameraView; label: string; suitableFor: MainGenre[] }>;
  scrollTypes: Array<{ value: ScrollType; label: string }>;
  
  inputDevices: Array<{ value: InputDevice; label: string; platform: string[] }>;
  controlSchemes: Array<{ value: ControlScheme; label: string; devices: InputDevice[] }>;
  
  coreMechanics: Array<{ value: CoreMechanic; label: string; genres: MainGenre[] }>;
  combatSystems: Array<{ value: CombatSystem; label: string }>;
  movementSystems: Array<{ value: MovementSystem; label: string }>;
  
  // ... и так далее для всех остальных типов
}

// Валидация конфигурации
export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Пресеты конфигураций
export interface GameConfigPreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  config: Partial<GameConfiguration>;
  popularity: number;
}

// Экспорт всех основных типов
export {
  GameConfiguration as default,
  type MainGenre,
  type SubGenre,
  type GameMode,
  type ProgressionType,
  type GraphicStyle,
  type ColorPalette,
  type ArtDirection
}; 