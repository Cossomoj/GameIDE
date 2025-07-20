// База данных PostgreSQL - полностью реализованная система управления данными

import { Pool, PoolClient } from 'pg';
import { LoggerService } from '@/services/logger';
import { GameEntity, GenerationStatus } from '@/types';
import { InteractiveGameSession, InteractiveGameStep, StepVariant } from '@/types/interactive';
import config from '@/config';

const logger = new LoggerService();

// PostgreSQL connection pool
let pool: Pool | null = null;

export async function setupDatabase(): Promise<any> {
  try {
    logger.info('🗃️ Инициализация PostgreSQL базы данных...');
    
    pool = new Pool({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      user: config.database.postgres.username,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // 5 секунд таймаут
      statement_timeout: 10000, // 10 секунд на запрос
      query_timeout: 10000, // 10 секунд на запрос
    });

    // Проверяем соединение с таймаутом
    const testConnection = async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        return true;
      } finally {
        client.release();
      }
    };

    // Таймаут для подключения к БД (10 секунд)
    const connectionPromise = Promise.race([
      testConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);

    await connectionPromise;
    logger.info('✅ База данных PostgreSQL подключена успешно');
    
    return {
      status: 'connected',
      type: 'postgresql',
      host: config.database.postgres.host,
      database: config.database.postgres.database
    };
  } catch (error) {
    logger.warn('⚠️ PostgreSQL недоступен, запуск в режиме без базы данных:', error);
    
    // Возвращаем fallback объект для работы без БД
    return {
      status: 'fallback',
      type: 'memory',
      message: 'Работа без постоянного хранения данных'
    };
  }
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    throw new Error('База данных не инициализирована. Вызовите setupDatabase() сначала.');
  }
  return pool;
}

export async function createGame(gameData: Partial<GameEntity>): Promise<GameEntity> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query(`
      INSERT INTO games (title, description, genre, status, progress, config, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, description, genre, status, progress, config, 
                assets, metadata, file_path, size_bytes, user_id,
                created_at, updated_at
    `, [
      gameData.title || 'Untitled Game',
      gameData.description || '',
      gameData.genre || 'arcade',
      gameData.status || GenerationStatus.PENDING,
      gameData.progress || 0,
      JSON.stringify(gameData.config || {}),
      gameData.user_id || null
    ]);

    const row = result.rows[0];
    const game: GameEntity = {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      status: row.status as GenerationStatus,
      progress: row.progress,
      config: row.config || {},
      assets: row.assets || {},
      metadata: row.metadata || {},
      filePath: row.file_path,
      sizeBytes: row.size_bytes,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };

    logger.info(`✅ Игра создана: ${game.id} - ${game.title}`);
    return game;
  } finally {
    client.release();
  }
}

export async function getGameById(id: string): Promise<GameEntity | null> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query(`
      SELECT id, title, description, genre, status, progress, config, 
             assets, metadata, file_path, size_bytes, user_id,
             created_at, updated_at
      FROM games WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      status: row.status as GenerationStatus,
      progress: row.progress,
      config: row.config || {},
      assets: row.assets || {},
      metadata: row.metadata || {},
      filePath: row.file_path,
      sizeBytes: row.size_bytes,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function getAllGames(): Promise<GameEntity[]> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query(`
      SELECT id, title, description, genre, status, progress, config, 
             assets, metadata, file_path, size_bytes, user_id,
             created_at, updated_at
      FROM games 
      ORDER BY created_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      status: row.status as GenerationStatus,
      progress: row.progress,
      config: row.config || {},
      assets: row.assets || {},
      metadata: row.metadata || {},
      filePath: row.file_path,
      sizeBytes: row.size_bytes,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  } finally {
    client.release();
  }
}

export async function updateGame(id: string, updates: Partial<GameEntity>): Promise<GameEntity | null> {
  const client = await (await getPool()).connect();
  
  try {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setParts.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setParts.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      setParts.push(`progress = $${paramIndex++}`);
      values.push(updates.progress);
    }
    if (updates.config !== undefined) {
      setParts.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.assets !== undefined) {
      setParts.push(`assets = $${paramIndex++}`);
      values.push(JSON.stringify(updates.assets));
    }
    if (updates.metadata !== undefined) {
      setParts.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.filePath !== undefined) {
      setParts.push(`file_path = $${paramIndex++}`);
      values.push(updates.filePath);
    }
    if (updates.sizeBytes !== undefined) {
      setParts.push(`size_bytes = $${paramIndex++}`);
      values.push(updates.sizeBytes);
    }

    if (setParts.length === 0) {
      return await getGameById(id);
    }

    values.push(id);
    const result = await client.query(`
      UPDATE games 
      SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, title, description, genre, status, progress, config, 
                assets, metadata, file_path, size_bytes, user_id,
                created_at, updated_at
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      status: row.status as GenerationStatus,
      progress: row.progress,
      config: row.config || {},
      assets: row.assets || {},
      metadata: row.metadata || {},
      filePath: row.file_path,
      sizeBytes: row.size_bytes,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function deleteGame(id: string): Promise<boolean> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query('DELETE FROM games WHERE id = $1', [id]);
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

export async function getGamesByStatus(status: GenerationStatus): Promise<GameEntity[]> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query(`
      SELECT id, title, description, genre, status, progress, config, 
             assets, metadata, file_path, size_bytes, user_id,
             created_at, updated_at
      FROM games WHERE status = $1
    `, [status]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      status: row.status as GenerationStatus,
      progress: row.progress,
      config: row.config || {},
      assets: row.assets || {},
      metadata: row.metadata || {},
      filePath: row.file_path,
      sizeBytes: row.size_bytes,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  } finally {
    client.release();
  }
}

export async function updateGameProgress(id: string, progress: number): Promise<boolean> {
  const client = await (await getPool()).connect();
  
  try {
    const result = await client.query(`
      UPDATE games 
      SET progress = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING progress
    `, [progress, id]);

    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

// Экспорт типов и констант
export * from '@/types';

// Полноценные DAO классы
export class GameDAO {
  async createGame(gameData: Omit<GameEntity, 'createdAt' | 'updatedAt'>): Promise<GameEntity> {
    return await createGame(gameData);
  }

  async getGameById(id: string): Promise<GameEntity> {
    const game = await getGameById(id);
    if (!game) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
    return game;
  }

  async updateGame(id: string, updates: Partial<GameEntity>): Promise<GameEntity> {
    const game = await updateGame(id, updates);
    if (!game) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
    return game;
  }

  async getGames(
    limit: number = 50,
    offset: number = 0,
    status?: GenerationStatus
  ): Promise<{ games: GameEntity[]; total: number }> {
    const client = await (await getPool()).connect();
    
    try {
      let query = `
        SELECT id, title, description, genre, status, progress, config, 
               assets, metadata, file_path, size_bytes, user_id,
               created_at, updated_at
        FROM games
      `;
      let countQuery = 'SELECT COUNT(*) FROM games';
      const values: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` WHERE status = $${paramIndex}`;
        countQuery += ` WHERE status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const [gamesResult, countResult] = await Promise.all([
        client.query(query, values),
        client.query(countQuery, status ? [status] : [])
      ]);

      const games = gamesResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        genre: row.genre,
        status: row.status as GenerationStatus,
        progress: row.progress,
        config: row.config || {},
        assets: row.assets || {},
        metadata: row.metadata || {},
        filePath: row.file_path,
        sizeBytes: row.size_bytes,
        userId: row.user_id,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));

      return { 
        games, 
        total: parseInt(countResult.rows[0].count) 
      };
    } finally {
      client.release();
    }
  }

  async deleteGame(id: string): Promise<void> {
    const success = await deleteGame(id);
    if (!success) {
      throw new Error(`Игра с ID ${id} не найдена`);
    }
  }

  async addLog(gameId: string, level: string, message: string, step?: string, metadata?: any): Promise<void> {
    const client = await (await getPool()).connect();
    
    try {
      await client.query(`
        INSERT INTO game_logs (game_id, level, message, step, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [gameId, level, message, step, JSON.stringify(metadata)]);
      
      logger.info(`📝 Лог игры ${gameId} [${level}]: ${message}`, { step, metadata });
    } finally {
      client.release();
    }
  }

  async getGameLogs(gameId: string): Promise<any[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT id, game_id, level, message, step, metadata, created_at
        FROM game_logs 
        WHERE game_id = $1 
        ORDER BY created_at ASC
      `, [gameId]);

      return result.rows.map(row => ({
        id: row.id,
        game_id: row.game_id,
        level: row.level,
        message: row.message,
        step: row.step,
        metadata: row.metadata,
        created_at: row.created_at
      }));
    } finally {
      client.release();
    }
  }
}

// DAO для интерактивных сессий
export class InteractiveSessionDAO {
  async createSession(sessionData: Omit<InteractiveGameSession, 'steps'>): Promise<InteractiveGameSession> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        INSERT INTO interactive_sessions (
          game_id, user_id, title, description, genre, current_step, total_steps,
          completed_steps, is_active, is_paused, configuration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        sessionData.gameId,
        sessionData.userId,
        sessionData.title,
        sessionData.description,
        sessionData.genre,
        sessionData.currentStep,
        sessionData.totalSteps,
        sessionData.completedSteps,
        sessionData.isActive,
        sessionData.isPaused,
        JSON.stringify(sessionData.configuration)
      ]);

      const row = result.rows[0];
      const session = this.mapRowToSession(row);
      
      // Создаем шаги
      session.steps = await this.createSteps(session.gameId, sessionData.steps || []);

      logger.info(`✅ Интерактивная сессия создана: ${session.gameId}`);
      return session;
    } finally {
      client.release();
    }
  }

  async getSessionByGameId(gameId: string): Promise<InteractiveGameSession | null> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM interactive_sessions WHERE game_id = $1
      `, [gameId]);

      if (result.rows.length === 0) {
        return null;
      }

      const session = this.mapRowToSession(result.rows[0]);
      session.steps = await this.getStepsBySessionId(session.gameId);

      return session;
    } finally {
      client.release();
    }
  }

  async updateSession(gameId: string, updates: Partial<InteractiveGameSession>): Promise<InteractiveGameSession | null> {
    const client = await (await getPool()).connect();
    
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.currentStep !== undefined) {
        setParts.push(`current_step = $${paramIndex++}`);
        values.push(updates.currentStep);
      }
      if (updates.completedSteps !== undefined) {
        setParts.push(`completed_steps = $${paramIndex++}`);
        values.push(updates.completedSteps);
      }
      if (updates.isActive !== undefined) {
        setParts.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      if (updates.isPaused !== undefined) {
        setParts.push(`is_paused = $${paramIndex++}`);
        values.push(updates.isPaused);
      }
      if (updates.finalGameData !== undefined) {
        setParts.push(`final_game_data = $${paramIndex++}`);
        values.push(JSON.stringify(updates.finalGameData));
      }
      if (updates.error !== undefined) {
        setParts.push(`error_message = $${paramIndex++}`);
        values.push(updates.error);
      }
      if (updates.completedAt !== undefined) {
        setParts.push(`completed_at = $${paramIndex++}`);
        values.push(updates.completedAt);
      }

      // Обновляем last_activity_at всегда
      setParts.push(`last_activity_at = CURRENT_TIMESTAMP`);

      if (setParts.length === 1) { // Только last_activity_at
        setParts.push(`updated_at = CURRENT_TIMESTAMP`);
      }

      values.push(gameId);
      const result = await client.query(`
        UPDATE interactive_sessions 
        SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE game_id = $${paramIndex}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return null;
      }

      const session = this.mapRowToSession(result.rows[0]);
      session.steps = await this.getStepsBySessionId(session.gameId);

      return session;
    } finally {
      client.release();
    }
  }

  async getActiveSessions(): Promise<InteractiveGameSession[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM interactive_sessions 
        WHERE is_active = true 
        ORDER BY last_activity_at DESC
      `);

      const sessions = await Promise.all(
        result.rows.map(async row => {
          const session = this.mapRowToSession(row);
          session.steps = await this.getStepsBySessionId(session.gameId);
          return session;
        })
      );

      return sessions;
    } finally {
      client.release();
    }
  }

  async deleteSession(gameId: string): Promise<boolean> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(
        'DELETE FROM interactive_sessions WHERE game_id = $1',
        [gameId]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  private async createSteps(sessionId: string, steps: InteractiveGameStep[]): Promise<InteractiveGameStep[]> {
    const client = await (await getPool()).connect();
    
    try {
      const createdSteps: InteractiveGameStep[] = [];

      for (const step of steps) {
        const stepResult = await client.query(`
          INSERT INTO interactive_steps (
            session_id, step_id, name, description, type, order_number, selected_variant
          ) VALUES (
            (SELECT id FROM interactive_sessions WHERE game_id = $1), 
            $2, $3, $4, $5, $6, $7
          ) RETURNING *
        `, [
          sessionId, step.stepId, step.name, step.description, 
          step.type, step.order, step.selectedVariant
        ]);

        const createdStep = this.mapRowToStep(stepResult.rows[0]);
        
        // Создаем варианты для шага
        if (step.variants && step.variants.length > 0) {
          createdStep.variants = await this.createVariants(stepResult.rows[0].id, step.variants);
        } else {
          createdStep.variants = [];
        }

        createdSteps.push(createdStep);
      }

      return createdSteps;
    } finally {
      client.release();
    }
  }

  private async getStepsBySessionId(sessionId: string): Promise<InteractiveGameStep[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT s.* FROM interactive_steps s
        JOIN interactive_sessions sess ON s.session_id = sess.id
        WHERE sess.game_id = $1
        ORDER BY s.order_number
      `, [sessionId]);

      const steps = await Promise.all(
        result.rows.map(async row => {
          const step = this.mapRowToStep(row);
          step.variants = await this.getVariantsByStepId(row.id);
          return step;
        })
      );

      return steps;
    } finally {
      client.release();
    }
  }

  private async createVariants(stepId: string, variants: StepVariant[]): Promise<StepVariant[]> {
    const client = await (await getPool()).connect();
    
    try {
      const createdVariants: StepVariant[] = [];

      for (const variant of variants) {
        const result = await client.query(`
          INSERT INTO interactive_variants (
            step_id, variant_id, title, description, details, ai_generated, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          stepId, variant.id, variant.title, variant.description,
          JSON.stringify(variant.details), variant.aiGenerated, JSON.stringify(variant.metadata)
        ]);

        createdVariants.push(this.mapRowToVariant(result.rows[0]));
      }

      return createdVariants;
    } finally {
      client.release();
    }
  }

  private async getVariantsByStepId(stepId: string): Promise<StepVariant[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM interactive_variants WHERE step_id = $1
      `, [stepId]);

      return result.rows.map(row => this.mapRowToVariant(row));
    } finally {
      client.release();
    }
  }

  async updateStepVariant(gameId: string, stepId: string, variantId: string): Promise<boolean> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        UPDATE interactive_steps 
        SET selected_variant = $3, updated_at = CURRENT_TIMESTAMP
        FROM interactive_sessions sess
        WHERE interactive_steps.session_id = sess.id 
          AND sess.game_id = $1 
          AND interactive_steps.step_id = $2
      `, [gameId, stepId, variantId]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async addVariantsToStep(gameId: string, stepId: string, variants: StepVariant[]): Promise<boolean> {
    const client = await (await getPool()).connect();
    
    try {
      // Получаем ID шага
      const stepResult = await client.query(`
        SELECT s.id FROM interactive_steps s
        JOIN interactive_sessions sess ON s.session_id = sess.id
        WHERE sess.game_id = $1 AND s.step_id = $2
      `, [gameId, stepId]);

      if (stepResult.rows.length === 0) {
        return false;
      }

      const dbStepId = stepResult.rows[0].id;
      await this.createVariants(dbStepId, variants);

      return true;
    } finally {
      client.release();
    }
  }

  private mapRowToSession(row: any): InteractiveGameSession {
    return {
      gameId: row.game_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      completedSteps: row.completed_steps,
      isActive: row.is_active,
      isPaused: row.is_paused,
      configuration: row.configuration || {},
      finalGameData: row.final_game_data,
      error: row.error_message,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      completedAt: row.completed_at,
      steps: [] // Будут загружены отдельно
    };
  }

  private mapRowToStep(row: any): InteractiveGameStep {
    return {
      stepId: row.step_id,
      name: row.name,
      description: row.description,
      type: row.type,
      order: row.order_number,
      selectedVariant: row.selected_variant,
      variants: [] // Будут загружены отдельно
    };
  }

  private mapRowToVariant(row: any): StepVariant {
    return {
      id: row.variant_id,
      title: row.title,
      description: row.description,
      details: row.details || {},
      aiGenerated: row.ai_generated,
      metadata: row.metadata || {},
      generatedAt: row.generated_at
    };
  }

  /**
   * Получает статистику по всем сессиям для анализа пользовательских предпочтений
   */
  async getAllSessionsStatistics(): Promise<any[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT 
          s.game_id,
          s.user_id,
          s.title,
          s.description,
          s.genre,
          s.completed_at,
          s.created_at,
          s.total_steps,
          s.completed_steps,
          COALESCE(
            json_agg(
              json_build_object(
                'stepId', st.step_id,
                'stepType', st.type,
                'selectedVariant', st.selected_variant,
                'timeSpent', EXTRACT(EPOCH FROM (st.completed_at - st.started_at))
              )
            ) FILTER (WHERE st.step_id IS NOT NULL), 
            '[]'::json
          ) as steps,
          COALESCE(
            json_agg(
              json_build_object(
                'variantId', v.variant_id,
                'title', v.title,
                'complexity', v.metadata->>'complexity'
              )
            ) FILTER (WHERE v.variant_id IS NOT NULL),
            '[]'::json
          ) as variants
        FROM interactive_sessions s
        LEFT JOIN interactive_steps st ON s.game_id = st.session_id
        LEFT JOIN interactive_variants v ON st.selected_variant = v.variant_id
        WHERE s.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY s.game_id, s.user_id, s.title, s.description, s.genre, 
                 s.completed_at, s.created_at, s.total_steps, s.completed_steps
        ORDER BY s.created_at DESC
      `);
      
      return result.rows.map(row => ({
        gameId: row.game_id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        genre: row.genre,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        totalSteps: row.total_steps,
        completedSteps: row.completed_steps,
        steps: row.steps || [],
        variants: row.variants || []
      }));
    } finally {
      client.release();
    }
  }
}

// Статистика DAO
export class StatisticsDAO {
  async updateDailyStats(): Promise<void> {
    const client = await (await getPool()).connect();
    
    try {
      await client.query(`
        INSERT INTO daily_statistics (
          date, total_games, successful_games, failed_games, total_size,
          interactive_sessions, completed_interactive_sessions
        )
        SELECT 
          CURRENT_DATE,
          COUNT(*),
          COUNT(*) FILTER (WHERE status = 'completed'),
          COUNT(*) FILTER (WHERE status = 'failed'),
          COALESCE(SUM(size_bytes), 0),
          (SELECT COUNT(*) FROM interactive_sessions WHERE DATE(created_at) = CURRENT_DATE),
          (SELECT COUNT(*) FROM interactive_sessions WHERE DATE(completed_at) = CURRENT_DATE)
        FROM games 
        WHERE DATE(created_at) = CURRENT_DATE
        ON CONFLICT (date) DO UPDATE SET
          total_games = EXCLUDED.total_games,
          successful_games = EXCLUDED.successful_games,
          failed_games = EXCLUDED.failed_games,
          total_size = EXCLUDED.total_size,
          interactive_sessions = EXCLUDED.interactive_sessions,
          completed_interactive_sessions = EXCLUDED.completed_interactive_sessions
      `);
      
      logger.info('📊 Ежедневная статистика обновлена');
    } finally {
      client.release();
    }
  }

  async getStatistics(days: number = 30): Promise<any[]> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT date, total_games, successful_games, failed_games, total_size,
               interactive_sessions, completed_interactive_sessions
        FROM daily_statistics 
        WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY date DESC
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getOverallStats(): Promise<any> {
    const client = await (await getPool()).connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_games,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_games,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_games,
          COUNT(*) FILTER (WHERE status = 'processing') as processing_games,
          COUNT(*) FILTER (WHERE status = 'pending') as queued_games,
          COALESCE(AVG(size_bytes), 0) as avg_size,
          COALESCE(SUM(size_bytes), 0) as total_size,
          (SELECT COUNT(*) FROM interactive_sessions) as total_interactive_sessions,
          (SELECT COUNT(*) FROM interactive_sessions WHERE is_active = true) as active_interactive_sessions,
          (SELECT COUNT(*) FROM interactive_sessions WHERE completed_at IS NOT NULL) as completed_interactive_sessions
        FROM games
      `);

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Функция для закрытия соединения
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('🔒 Соединение с базой данных закрыто');
  }
} 