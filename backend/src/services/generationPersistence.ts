import { Pool, PoolClient } from 'pg';
import { LoggerService } from './logger';
import { EventEmitter } from 'events';
import config from '@/config';

// Интерфейсы для состояния генерации
export interface GenerationState {
  id: string;
  userId: string;
  gameType: string;
  status: GenerationStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  config: GameGenerationConfig;
  context: GenerationContext;
  results?: GenerationResults;
  error?: string;
  metadata: GenerationMetadata;
}

export interface GameGenerationConfig {
  theme: string;
  genre: string;
  complexity: 'simple' | 'medium' | 'complex';
  features: string[];
  platform: 'web' | 'mobile' | 'yandex';
  language: string;
  aiModel: string;
  customPrompts?: string[];
  optimizations?: OptimizationConfig;
}

export interface GenerationContext {
  sessionId: string;
  steps: GenerationStep[];
  currentStepIndex: number;
  choices: { [stepId: string]: any };
  aiResponses: { [stepId: string]: any };
  cache: { [key: string]: any };
  retryCount: number;
  warnings: string[];
}

export interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  dependencies: string[];
  retryCount: number;
  metadata?: any;
}

export interface GenerationResults {
  gameId: string;
  files: GeneratedFile[];
  assets: GeneratedAsset[];
  size: number;
  optimizations: OptimizationResult[];
  validationResults: ValidationResult[];
  buildLogs: string[];
  deploymentInfo?: DeploymentInfo;
}

export interface GeneratedFile {
  path: string;
  content?: string;
  contentHash: string;
  size: number;
  type: 'html' | 'css' | 'js' | 'json' | 'asset';
  generated: boolean;
  optimized: boolean;
  compressed: boolean;
}

export interface GeneratedAsset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'font' | 'video';
  originalSize: number;
  optimizedSize: number;
  format: string;
  path: string;
  url?: string;
  metadata: any;
}

export interface OptimizationConfig {
  minifyCode: boolean;
  compressAssets: boolean;
  optimizeImages: boolean;
  removeUnusedCode: boolean;
  bundleFiles: boolean;
  generateSourceMaps: boolean;
}

export interface OptimizationResult {
  type: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  timeTaken: number;
  applied: boolean;
  error?: string;
}

export interface ValidationResult {
  validator: string;
  passed: boolean;
  score?: number;
  issues: ValidationIssue[];
  suggestions: string[];
  timeTaken: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  file?: string;
  line?: number;
  fixable: boolean;
}

export interface DeploymentInfo {
  platform: string;
  url?: string;
  version: string;
  deployedAt: Date;
  status: 'deployed' | 'failed' | 'pending';
  metadata: any;
}

export interface GenerationMetadata {
  version: string;
  engine: string;
  serverInfo: {
    nodeId: string;
    region: string;
    version: string;
  };
  performance: {
    totalTime?: number;
    aiTime: number;
    buildTime: number;
    optimizationTime: number;
    validationTime: number;
  };
  costs: {
    aiTokens: number;
    aiCost: number;
    storageSize: number;
    storageCost: number;
    totalCost: number;
  };
  analytics: {
    userChoices: number;
    rerollsUsed: number;
    optimizationsApplied: number;
    errorsEncountered: number;
  };
}

export type GenerationStatus = 
  | 'initializing'
  | 'in_progress' 
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'archived';

export class GenerationPersistenceService extends EventEmitter {
  private logger: LoggerService;
  private pool: Pool;
  private isInitialized = false;

  // Кэш активных генераций
  private activeGenerations = new Map<string, GenerationState>();
  
  // Очередь изменений для батчевого сохранения
  private changeQueue = new Map<string, GenerationState>();
  private saveTimer?: NodeJS.Timeout;
  
  // Статистика
  private stats = {
    totalGenerations: 0,
    activeGenerations: 0,
    completedGenerations: 0,
    failedGenerations: 0,
    cachedQueries: 0,
    dbQueries: 0,
    saveOperations: 0,
    loadOperations: 0
  };

  constructor() {
    super();
    this.logger = LoggerService.getInstance();
    
    // Инициализация пула подключений к БД
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20, // Максимум подключений
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeDatabase();
    this.startPeriodicSave();
    this.setupEventHandlers();
  }

  /**
   * Инициализация базы данных
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.createTables();
      await this.createIndexes();
      await this.runMigrations();
      
      this.isInitialized = true;
      this.logger.info('📁 База данных генераций инициализирована');
      
      // Загружаем активные генерации в кэш
      await this.loadActiveGenerationsToCache();
      
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации базы данных генераций:', error);
      throw error;
    }
  }

  /**
   * Создание таблиц
   */
  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Основная таблица генераций
      await client.query(`
        CREATE TABLE IF NOT EXISTS generations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          game_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          progress INTEGER DEFAULT 0,
          current_step VARCHAR(255),
          total_steps INTEGER DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          config JSONB NOT NULL,
          context JSONB NOT NULL DEFAULT '{}',
          results JSONB,
          error_message TEXT,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Таблица шагов генерации
      await client.query(`
        CREATE TABLE IF NOT EXISTS generation_steps (
          id VARCHAR(255) PRIMARY KEY,
          generation_id VARCHAR(255) NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
          step_index INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          duration INTEGER,
          input_data JSONB,
          output_data JSONB,
          error_message TEXT,
          dependencies TEXT[],
          retry_count INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Таблица файлов
      await client.query(`
        CREATE TABLE IF NOT EXISTS generated_files (
          id SERIAL PRIMARY KEY,
          generation_id VARCHAR(255) NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
          file_path VARCHAR(500) NOT NULL,
          content_hash VARCHAR(64),
          file_size BIGINT DEFAULT 0,
          file_type VARCHAR(50),
          is_generated BOOLEAN DEFAULT true,
          is_optimized BOOLEAN DEFAULT false,
          is_compressed BOOLEAN DEFAULT false,
          content_preview TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Таблица ассетов
      await client.query(`
        CREATE TABLE IF NOT EXISTS generated_assets (
          id VARCHAR(255) PRIMARY KEY,
          generation_id VARCHAR(255) NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
          asset_name VARCHAR(255) NOT NULL,
          asset_type VARCHAR(50) NOT NULL,
          original_size BIGINT DEFAULT 0,
          optimized_size BIGINT DEFAULT 0,
          format VARCHAR(50),
          file_path VARCHAR(500),
          asset_url TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Таблица состояния для отслеживания изменений
      await client.query(`
        CREATE TABLE IF NOT EXISTS generation_changelog (
          id SERIAL PRIMARY KEY,
          generation_id VARCHAR(255) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          event_data JSONB,
          user_id VARCHAR(255),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          session_id VARCHAR(255)
        );
      `);

      this.logger.info('✅ Таблицы базы данных созданы');

    } finally {
      client.release();
    }
  }

  /**
   * Создание индексов
   */
  private async createIndexes(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);',
        'CREATE INDEX IF NOT EXISTS idx_generations_started_at ON generations(started_at);',
        'CREATE INDEX IF NOT EXISTS idx_generations_game_type ON generations(game_type);',
        'CREATE INDEX IF NOT EXISTS idx_generation_steps_generation_id ON generation_steps(generation_id);',
        'CREATE INDEX IF NOT EXISTS idx_generation_steps_status ON generation_steps(status);',
        'CREATE INDEX IF NOT EXISTS idx_generated_files_generation_id ON generated_files(generation_id);',
        'CREATE INDEX IF NOT EXISTS idx_generated_assets_generation_id ON generated_assets(generation_id);',
        'CREATE INDEX IF NOT EXISTS idx_changelog_generation_id ON generation_changelog(generation_id);',
        'CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON generation_changelog(timestamp);'
      ];

      for (const indexQuery of indexes) {
        await client.query(indexQuery);
      }

      this.logger.info('✅ Индексы базы данных созданы');

    } finally {
      client.release();
    }
  }

  /**
   * Выполнение миграций
   */
  private async runMigrations(): Promise<void> {
    // Здесь можно добавить логику миграций при изменении схемы
    this.logger.info('✅ Миграции выполнены');
  }

  /**
   * Загрузка активных генераций в кэш
   */
  private async loadActiveGenerationsToCache(): Promise<void> {
    try {
      const activeStates = await this.getGenerationsByStatus(['in_progress', 'paused', 'initializing']);
      
      for (const state of activeStates) {
        this.activeGenerations.set(state.id, state);
      }
      
      this.stats.activeGenerations = activeStates.length;
      this.logger.info(`📁 Загружено ${activeStates.length} активных генераций в кэш`);
      
    } catch (error) {
      this.logger.error('❌ Ошибка загрузки активных генераций:', error);
    }
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
    
    // Периодическая очистка
    setInterval(() => this.cleanupOldRecords(), 3600000); // Каждый час
  }

  /**
   * Запуск периодического сохранения
   */
  private startPeriodicSave(): void {
    // Сохраняем изменения каждые 5 секунд
    this.saveTimer = setInterval(() => {
      this.flushChangeQueue();
    }, 5000);
  }

  /**
   * Создание новой генерации
   */
  async createGeneration(
    userId: string,
    gameType: string,
    config: GameGenerationConfig,
    sessionId: string
  ): Promise<GenerationState> {
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const generation: GenerationState = {
      id: generationId,
      userId,
      gameType,
      status: 'initializing',
      progress: 0,
      currentStep: 'initialization',
      totalSteps: this.calculateTotalSteps(config),
      startedAt: new Date(),
      updatedAt: new Date(),
      config,
      context: {
        sessionId,
        steps: this.createGenerationSteps(config),
        currentStepIndex: 0,
        choices: {},
        aiResponses: {},
        cache: {},
        retryCount: 0,
        warnings: []
      },
      metadata: {
        version: '1.0.0',
        engine: 'enhanced-ai-generator',
        serverInfo: {
          nodeId: process.env.NODE_ID || 'node-1',
          region: process.env.REGION || 'us-east-1',
          version: process.env.VERSION || '1.0.0'
        },
        performance: {
          aiTime: 0,
          buildTime: 0,
          optimizationTime: 0,
          validationTime: 0
        },
        costs: {
          aiTokens: 0,
          aiCost: 0,
          storageSize: 0,
          storageCost: 0,
          totalCost: 0
        },
        analytics: {
          userChoices: 0,
          rerollsUsed: 0,
          optimizationsApplied: 0,
          errorsEncountered: 0
        }
      }
    };

    // Сохраняем в базу данных
    await this.saveGenerationToDb(generation);
    
    // Добавляем в кэш
    this.activeGenerations.set(generationId, generation);
    this.stats.totalGenerations++;
    this.stats.activeGenerations++;

    // Логируем событие
    await this.logGenerationEvent(generationId, 'generation_created', { userId, gameType, config }, sessionId);

    this.logger.info(`🎮 Создана новая генерация: ${generationId} для пользователя ${userId}`);
    this.emit('generation_created', generation);

    return generation;
  }

  /**
   * Обновление состояния генерации
   */
  async updateGeneration(
    generationId: string,
    updates: Partial<GenerationState>,
    sessionId?: string
  ): Promise<GenerationState | null> {
    let generation = this.activeGenerations.get(generationId);
    
    if (!generation) {
      // Попробуем загрузить из БД
      generation = await this.loadGenerationFromDb(generationId);
      if (!generation) {
        this.logger.warn(`⚠️ Генерация ${generationId} не найдена`);
        return null;
      }
    }

    // Применяем обновления
    const updatedGeneration: GenerationState = {
      ...generation,
      ...updates,
      updatedAt: new Date()
    };

    // Обновляем кэш
    this.activeGenerations.set(generationId, updatedGeneration);
    
    // Добавляем в очередь сохранения
    this.changeQueue.set(generationId, updatedGeneration);

    // Логируем изменения
    await this.logGenerationEvent(generationId, 'generation_updated', updates, sessionId);

    this.emit('generation_updated', updatedGeneration, updates);
    
    return updatedGeneration;
  }

  /**
   * Обновление прогресса генерации
   */
  async updateProgress(
    generationId: string,
    progress: number,
    currentStep: string,
    stepData?: any
  ): Promise<void> {
    const generation = this.activeGenerations.get(generationId);
    if (!generation) return;

    generation.progress = progress;
    generation.currentStep = currentStep;
    generation.updatedAt = new Date();

    // Обновляем информацию о текущем шаге
    if (stepData && generation.context.steps) {
      const stepIndex = generation.context.steps.findIndex(s => s.name === currentStep);
      if (stepIndex !== -1) {
        generation.context.steps[stepIndex] = {
          ...generation.context.steps[stepIndex],
          ...stepData,
          progress
        };
        generation.context.currentStepIndex = stepIndex;
      }
    }

    this.changeQueue.set(generationId, generation);
    this.emit('generation_progress', { generationId, progress, currentStep });
  }

  /**
   * Завершение генерации
   */
  async completeGeneration(
    generationId: string,
    results: GenerationResults,
    sessionId?: string
  ): Promise<GenerationState | null> {
    const generation = await this.updateGeneration(generationId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      results
    }, sessionId);

    if (generation) {
      this.stats.activeGenerations--;
      this.stats.completedGenerations++;
      
      // Сохраняем файлы и ассеты
      await this.saveGenerationFiles(generationId, results.files);
      await this.saveGenerationAssets(generationId, results.assets);
      
      this.logger.info(`✅ Генерация ${generationId} завершена успешно`);
      this.emit('generation_completed', generation);
    }

    return generation;
  }

  /**
   * Обработка ошибки генерации
   */
  async failGeneration(
    generationId: string,
    error: string,
    sessionId?: string
  ): Promise<GenerationState | null> {
    const generation = await this.updateGeneration(generationId, {
      status: 'failed',
      error,
      completedAt: new Date()
    }, sessionId);

    if (generation) {
      this.stats.activeGenerations--;
      this.stats.failedGenerations++;
      generation.metadata.analytics.errorsEncountered++;
      
      this.logger.error(`❌ Генерация ${generationId} завершена с ошибкой: ${error}`);
      this.emit('generation_failed', generation, error);
    }

    return generation;
  }

  /**
   * Получение состояния генерации
   */
  async getGeneration(generationId: string): Promise<GenerationState | null> {
    this.stats.loadOperations++;
    
    // Сначала проверяем кэш
    let generation = this.activeGenerations.get(generationId);
    if (generation) {
      this.stats.cachedQueries++;
      return generation;
    }

    // Загружаем из БД
    this.stats.dbQueries++;
    generation = await this.loadGenerationFromDb(generationId);
    
    if (generation && generation.status !== 'completed' && generation.status !== 'failed') {
      this.activeGenerations.set(generationId, generation);
    }

    return generation;
  }

  /**
   * Получение генераций пользователя
   */
  async getUserGenerations(
    userId: string,
    options: {
      status?: GenerationStatus[];
      limit?: number;
      offset?: number;
      orderBy?: 'started_at' | 'updated_at' | 'progress';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ generations: GenerationState[]; total: number }> {
    const {
      status,
      limit = 20,
      offset = 0,
      orderBy = 'started_at',
      orderDirection = 'DESC'
    } = options;

    const client = await this.pool.connect();
    
    try {
      let query = 'SELECT * FROM generations WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status && status.length > 0) {
        query += ` AND status = ANY($${paramIndex})`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY ${orderBy} ${orderDirection}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await client.query(query, params);
      
      // Получаем общее количество
      let countQuery = 'SELECT COUNT(*) FROM generations WHERE user_id = $1';
      const countParams = [userId];
      
      if (status && status.length > 0) {
        countQuery += ' AND status = ANY($2)';
        countParams.push(status);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const generations = result.rows.map(row => this.mapRowToGenerationState(row));

      return { generations, total };

    } finally {
      client.release();
    }
  }

  /**
   * Приостановка генерации
   */
  async pauseGeneration(generationId: string, sessionId?: string): Promise<GenerationState | null> {
    return await this.updateGeneration(generationId, {
      status: 'paused'
    }, sessionId);
  }

  /**
   * Возобновление генерации
   */
  async resumeGeneration(generationId: string, sessionId?: string): Promise<GenerationState | null> {
    return await this.updateGeneration(generationId, {
      status: 'in_progress'
    }, sessionId);
  }

  /**
   * Отмена генерации
   */
  async cancelGeneration(generationId: string, sessionId?: string): Promise<GenerationState | null> {
    const generation = await this.updateGeneration(generationId, {
      status: 'cancelled',
      completedAt: new Date()
    }, sessionId);

    if (generation) {
      this.stats.activeGenerations--;
      this.activeGenerations.delete(generationId);
      
      this.logger.info(`🛑 Генерация ${generationId} отменена`);
      this.emit('generation_cancelled', generation);
    }

    return generation;
  }

  /**
   * Архивирование старых генераций
   */
  async archiveOldGenerations(olderThanDays: number = 30): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await client.query(`
        UPDATE generations 
        SET status = 'archived', updated_at = NOW()
        WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < $1
        RETURNING id
      `, [cutoffDate]);

      const archivedCount = result.rows.length;
      
      if (archivedCount > 0) {
        this.logger.info(`📦 Архивировано ${archivedCount} старых генераций`);
      }

      return archivedCount;

    } finally {
      client.release();
    }
  }

  /**
   * Очистка старых записей
   */
  private async cleanupOldRecords(): Promise<void> {
    try {
      // Архивируем старые генерации
      await this.archiveOldGenerations(30);
      
      // Удаляем старые логи (старше 90 дней)
      const client = await this.pool.connect();
      
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);

        await client.query(`
          DELETE FROM generation_changelog 
          WHERE timestamp < $1
        `, [cutoffDate]);

      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('❌ Ошибка очистки старых записей:', error);
    }
  }

  /**
   * Получение статистики
   */
  getStats(): typeof this.stats & { cacheSize: number; queueSize: number } {
    return {
      ...this.stats,
      cacheSize: this.activeGenerations.size,
      queueSize: this.changeQueue.size
    };
  }

  /**
   * Сброс очереди изменений в БД
   */
  private async flushChangeQueue(): Promise<void> {
    if (this.changeQueue.size === 0) return;

    const generations = Array.from(this.changeQueue.values());
    this.changeQueue.clear();

    try {
      for (const generation of generations) {
        await this.saveGenerationToDb(generation);
        this.stats.saveOperations++;
      }
      
      if (generations.length > 0) {
        this.logger.debug(`💾 Сохранено ${generations.length} изменений в БД`);
      }

    } catch (error) {
      this.logger.error('❌ Ошибка сохранения очереди изменений:', error);
      
      // Возвращаем данные в очередь
      for (const generation of generations) {
        this.changeQueue.set(generation.id, generation);
      }
    }
  }

  /**
   * Сохранение генерации в БД
   */
  private async saveGenerationToDb(generation: GenerationState): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO generations (
          id, user_id, game_type, status, progress, current_step, total_steps,
          started_at, updated_at, completed_at, config, context, results, 
          error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          current_step = EXCLUDED.current_step,
          total_steps = EXCLUDED.total_steps,
          updated_at = EXCLUDED.updated_at,
          completed_at = EXCLUDED.completed_at,
          context = EXCLUDED.context,
          results = EXCLUDED.results,
          error_message = EXCLUDED.error_message,
          metadata = EXCLUDED.metadata
      `, [
        generation.id,
        generation.userId,
        generation.gameType,
        generation.status,
        generation.progress,
        generation.currentStep,
        generation.totalSteps,
        generation.startedAt,
        generation.updatedAt,
        generation.completedAt,
        JSON.stringify(generation.config),
        JSON.stringify(generation.context),
        generation.results ? JSON.stringify(generation.results) : null,
        generation.error,
        JSON.stringify(generation.metadata)
      ]);

      // Сохраняем шаги
      if (generation.context.steps) {
        await this.saveGenerationSteps(generation.id, generation.context.steps);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Загрузка генерации из БД
   */
  private async loadGenerationFromDb(generationId: string): Promise<GenerationState | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM generations WHERE id = $1',
        [generationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const generation = this.mapRowToGenerationState(result.rows[0]);
      
      // Загружаем шаги
      const stepsResult = await client.query(
        'SELECT * FROM generation_steps WHERE generation_id = $1 ORDER BY step_index',
        [generationId]
      );
      
      if (stepsResult.rows.length > 0) {
        generation.context.steps = stepsResult.rows.map(row => this.mapRowToGenerationStep(row));
      }

      return generation;

    } finally {
      client.release();
    }
  }

  /**
   * Получение генераций по статусу
   */
  private async getGenerationsByStatus(statuses: GenerationStatus[]): Promise<GenerationState[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM generations WHERE status = ANY($1)',
        [statuses]
      );

      return result.rows.map(row => this.mapRowToGenerationState(row));

    } finally {
      client.release();
    }
  }

  /**
   * Сохранение шагов генерации
   */
  private async saveGenerationSteps(generationId: string, steps: GenerationStep[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        await client.query(`
          INSERT INTO generation_steps (
            id, generation_id, step_index, name, description, status, progress,
            started_at, completed_at, duration, input_data, output_data,
            error_message, dependencies, retry_count, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            started_at = EXCLUDED.started_at,
            completed_at = EXCLUDED.completed_at,
            duration = EXCLUDED.duration,
            output_data = EXCLUDED.output_data,
            error_message = EXCLUDED.error_message,
            retry_count = EXCLUDED.retry_count,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `, [
          step.id,
          generationId,
          i,
          step.name,
          step.description,
          step.status,
          step.progress,
          step.startedAt,
          step.completedAt,
          step.duration,
          step.input ? JSON.stringify(step.input) : null,
          step.output ? JSON.stringify(step.output) : null,
          step.error,
          step.dependencies,
          step.retryCount,
          step.metadata ? JSON.stringify(step.metadata) : null
        ]);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Сохранение файлов генерации
   */
  private async saveGenerationFiles(generationId: string, files: GeneratedFile[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      for (const file of files) {
        await client.query(`
          INSERT INTO generated_files (
            generation_id, file_path, content_hash, file_size, file_type,
            is_generated, is_optimized, is_compressed, content_preview
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (generation_id, file_path) DO UPDATE SET
            content_hash = EXCLUDED.content_hash,
            file_size = EXCLUDED.file_size,
            is_optimized = EXCLUDED.is_optimized,
            is_compressed = EXCLUDED.is_compressed
        `, [
          generationId,
          file.path,
          file.contentHash,
          file.size,
          file.type,
          file.generated,
          file.optimized,
          file.compressed,
          file.content ? file.content.substring(0, 1000) : null
        ]);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Сохранение ассетов генерации
   */
  private async saveGenerationAssets(generationId: string, assets: GeneratedAsset[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      for (const asset of assets) {
        await client.query(`
          INSERT INTO generated_assets (
            id, generation_id, asset_name, asset_type, original_size,
            optimized_size, format, file_path, asset_url, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            optimized_size = EXCLUDED.optimized_size,
            file_path = EXCLUDED.file_path,
            asset_url = EXCLUDED.asset_url,
            metadata = EXCLUDED.metadata
        `, [
          asset.id,
          generationId,
          asset.name,
          asset.type,
          asset.originalSize,
          asset.optimizedSize,
          asset.format,
          asset.path,
          asset.url,
          JSON.stringify(asset.metadata)
        ]);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Логирование событий генерации
   */
  private async logGenerationEvent(
    generationId: string,
    eventType: string,
    eventData: any,
    sessionId?: string
  ): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query(`
          INSERT INTO generation_changelog (
            generation_id, event_type, event_data, user_id, session_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          generationId,
          eventType,
          JSON.stringify(eventData),
          eventData.userId || null,
          sessionId
        ]);

      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('❌ Ошибка логирования события:', error);
    }
  }

  /**
   * Маппинг строки БД в состояние генерации
   */
  private mapRowToGenerationState(row: any): GenerationState {
    return {
      id: row.id,
      userId: row.user_id,
      gameType: row.game_type,
      status: row.status,
      progress: row.progress,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      config: row.config,
      context: row.context,
      results: row.results,
      error: row.error_message,
      metadata: row.metadata
    };
  }

  /**
   * Маппинг строки БД в шаг генерации
   */
  private mapRowToGenerationStep(row: any): GenerationStep {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      progress: row.progress,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      input: row.input_data,
      output: row.output_data,
      error: row.error_message,
      dependencies: row.dependencies || [],
      retryCount: row.retry_count,
      metadata: row.metadata
    };
  }

  /**
   * Вычисление общего количества шагов
   */
  private calculateTotalSteps(config: GameGenerationConfig): number {
    let steps = 5; // Базовые шаги: инициализация, генерация, компиляция, валидация, финализация
    
    if (config.optimizations?.minifyCode) steps++;
    if (config.optimizations?.compressAssets) steps++;
    if (config.optimizations?.optimizeImages) steps++;
    if (config.features.includes('multiplayer')) steps += 2;
    if (config.features.includes('ai_npcs')) steps += 3;
    
    return steps;
  }

  /**
   * Создание шагов генерации
   */
  private createGenerationSteps(config: GameGenerationConfig): GenerationStep[] {
    const steps: GenerationStep[] = [
      {
        id: 'init',
        name: 'initialization',
        description: 'Инициализация генерации',
        status: 'pending',
        progress: 0,
        dependencies: [],
        retryCount: 0
      },
      {
        id: 'generate',
        name: 'generation',
        description: 'Генерация игрового кода',
        status: 'pending',
        progress: 0,
        dependencies: ['init'],
        retryCount: 0
      },
      {
        id: 'build',
        name: 'build',
        description: 'Сборка игры',
        status: 'pending',
        progress: 0,
        dependencies: ['generate'],
        retryCount: 0
      },
      {
        id: 'validate',
        name: 'validation',
        description: 'Валидация результата',
        status: 'pending',
        progress: 0,
        dependencies: ['build'],
        retryCount: 0
      },
      {
        id: 'finalize',
        name: 'finalization',
        description: 'Финализация',
        status: 'pending',
        progress: 0,
        dependencies: ['validate'],
        retryCount: 0
      }
    ];

    // Добавляем дополнительные шаги на основе конфигурации
    if (config.optimizations?.minifyCode) {
      steps.splice(-1, 0, {
        id: 'minify',
        name: 'minification',
        description: 'Минификация кода',
        status: 'pending',
        progress: 0,
        dependencies: ['build'],
        retryCount: 0
      });
    }

    return steps;
  }

  /**
   * Изящное завершение работы
   */
  private async gracefulShutdown(): Promise<void> {
    this.logger.info('🔄 Начинаю изящное завершение сервиса персистентности...');

    // Останавливаем таймер сохранения
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    // Сохраняем все изменения
    await this.flushChangeQueue();

    // Закрываем пул подключений
    await this.pool.end();

    this.logger.info('✅ Сервис персистентности завершен');
  }
}

// Singleton экземпляр
export const generationPersistence = new GenerationPersistenceService();
export default generationPersistence; 