export interface GamePromptForm {
  title: string;
  genre: string;
  description: string;
  artStyle?: string;
  targetAudience?: string;
  monetization?: string[];
}

export interface GameDesign {
  title: string;
  genre: string;
  description: string;
  mechanics: string[];
  progression: string;
  assets: AssetRequirement[];
  ui: UIStructure;
  monetization: MonetizationStrategy;
}

export interface AssetRequirement {
  type: 'sprite' | 'background' | 'ui' | 'sound' | 'music';
  name: string;
  description: string;
  style: string;
  dimensions?: { width: number; height: number };
  duration?: number; // для звуков в миллисекундах
}

export interface UIStructure {
  screens: UIScreen[];
  components: UIComponent[];
}

export interface UIScreen {
  name: string;
  components: string[];
  layout: string;
}

export interface UIComponent {
  name: string;
  type: 'button' | 'text' | 'input' | 'panel' | 'menu';
  style: string;
}

export interface MonetizationStrategy {
  types: ('rewarded_ads' | 'interstitial_ads' | 'banner_ads' | 'purchases')[];
  placement: string[];
}

export interface GenerationRequest {
  id: string;
  prompt: GamePromptForm;
  options?: GenerationOptions;
  status: GenerationStatus;
  createdAt: Date;
  updatedAt: Date;
  progress: number;
  currentStep: string;
  logs: LogEntry[];
  estimatedTime?: number;
  error?: string;
}

export interface GenerationOptions {
  quality: 'fast' | 'balanced' | 'high';
  optimization: 'size' | 'performance';
  targetPlatform: 'yandex_games';
}

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  step: string;
  metadata?: any;
}

export interface GeneratedGame {
  id: string;
  title: string;
  description: string;
  size: number;
  filePath: string;
  previewImages: string[];
  createdAt: Date;
  prompt: GamePromptForm;
  gameDesign: GameDesign;
}

export interface FileStructure {
  [path: string]: string | FileStructure;
}

export interface GenerationPipeline {
  steps: GenerationStep[];
}

export interface GenerationStep {
  name: string;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
}

export interface AssetGenerationResult {
  type: string;
  data: Buffer;
  metadata: {
    size: number;
    dimensions?: { width: number; height: number };
    format: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface YandexGameRequirements {
  maxSize: number; // байты
  requiredSDKVersion: string;
  supportedFormats: string[];
  requiredFiles: string[];
}

export interface BuildResult {
  success: boolean;
  outputPath: string;
  size: number;
  warnings: string[];
  errors: string[];
  manifest: GameManifest;
}

export interface GameManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  files: ManifestFile[];
  requirements: {
    yandexSDK: string;
  };
}

export interface ManifestFile {
  path: string;
  size: number;
  type: string;
  hash: string;
}

export interface QueueJob {
  id: string;
  type: 'game_generation';
  data: GenerationRequest;
  priority: number;
  attempts: number;
  progress: number;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

export interface WSMessage {
  type: 'progress' | 'log' | 'preview' | 'error' | 'completed';
  gameId: string;
  data: any;
}

// Конфигурация AI сервисов
export interface AIConfig {
  deepseek: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    baseURL: string;
  };
  openai: {
    apiKey: string;
    imageModel: string;
    imageSize: string;
    maxImages: number;
    baseURL: string;
  };
  claude: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    baseURL: string;
  };
}

// Настройки генерации
export interface GenerationConfig {
  maxConcurrent: number;
  timeout: number;
  retries: number;
  targetSize: number;
  tempPath: string;
  outputPath: string;
}

export interface DatabaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameEntity extends DatabaseEntity {
  title: string;
  description: string;
  prompt: string; // JSON
  gameDesign: string; // JSON
  status: GenerationStatus;
  progress: number;
  filePath?: string;
  size?: number;
  error?: string;
}

// Экспорт интерактивных типов
export * from './interactive';

// Экспорт типов конфигурации игры
export * from './gameConfig';

export interface GamePrompt {
  title: string;
  genre: string;
  description: string;
  artStyle?: string;
  targetAudience?: string;
  monetization?: string[];
} 