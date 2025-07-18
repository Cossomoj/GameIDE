import Bull, { Queue, Job } from 'bull';
import { EventEmitter } from 'events';
import config from '@/config';
import { LoggerService } from './logger';
import { GenerationRequest, QueueJob } from '@/types';
import { GameGenerationPipeline } from './gameGeneration';

export class QueueService extends EventEmitter {
  private gameGenerationQueue: Queue;
  private logger: LoggerService;
  private pipeline: GameGenerationPipeline;

  constructor() {
    super();
    this.logger = new LoggerService();
    this.pipeline = new GameGenerationPipeline();
    
    // Инициализация очереди генерации игр
    this.gameGenerationQueue = new Bull('game-generation', {
      redis: config.redis.url,
      defaultJobOptions: {
        removeOnComplete: 10, // Хранить только 10 выполненных заданий
        removeOnFail: 20,     // Хранить 20 неудачных заданий
        attempts: config.generation.retries,
        backoff: {
          type: 'exponential',
          delay: 30000, // 30 секунд
        },
      },
    });

    this.setupEventListeners();
    this.setupJobProcessors();
  }

  public async initialize(): Promise<void> {
    try {
      // Очищаем старые задания при запуске
      await this.gameGenerationQueue.clean(24 * 60 * 60 * 1000, 'completed');
      await this.gameGenerationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
      
      this.logger.systemEvent('Queue service initialized', {
        waiting: await this.gameGenerationQueue.getWaiting(),
        active: await this.gameGenerationQueue.getActive(),
        completed: await this.gameGenerationQueue.getCompleted(),
        failed: await this.gameGenerationQueue.getFailed(),
      });
    } catch (error) {
      this.logger.error('Ошибка инициализации сервиса очередей:', error);
      throw error;
    }
  }

  public async addGameGenerationJob(request: GenerationRequest): Promise<Job<GenerationRequest>> {
    try {
      const job = await this.gameGenerationQueue.add('generate-game', request, {
        priority: this.calculatePriority(request),
        delay: 0,
        jobId: request.id,
      });

      this.logger.info(`📋 Добавлено задание генерации игры ${request.id}`, {
        gameId: request.id,
        priority: job.opts.priority,
        position: await job.getWaiting(),
      });

      return job;
    } catch (error) {
      this.logger.error(`Ошибка добавления задания ${request.id}:`, error);
      throw error;
    }
  }

  public async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.gameGenerationQueue.getJob(jobId);
      
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress();
      const logs = job.logs;

      return {
        id: job.id,
        state,
        progress,
        logs: logs || [],
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
        data: job.data,
      };
    } catch (error) {
      this.logger.error(`Ошибка получения статуса задания ${jobId}:`, error);
      throw error;
    }
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.gameGenerationQueue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      await job.remove();
      
      this.logger.info(`❌ Задание ${jobId} отменено`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка отмены задания ${jobId}:`, error);
      return false;
    }
  }

  public async getQueueStats(): Promise<any> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.gameGenerationQueue.getWaiting(),
        this.gameGenerationQueue.getActive(),
        this.gameGenerationQueue.getCompleted(),
        this.gameGenerationQueue.getFailed(),
        this.gameGenerationQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики очереди:', error);
      throw error;
    }
  }

  public async pauseQueue(): Promise<void> {
    await this.gameGenerationQueue.pause();
    this.logger.systemEvent('Queue paused');
  }

  public async resumeQueue(): Promise<void> {
    await this.gameGenerationQueue.resume();
    this.logger.systemEvent('Queue resumed');
  }

  public async close(): Promise<void> {
    try {
      await this.gameGenerationQueue.close();
      this.logger.systemEvent('Queue service closed');
    } catch (error) {
      this.logger.error('Ошибка закрытия сервиса очередей:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // События заданий
    this.gameGenerationQueue.on('global:completed', (jobId: string, result: any) => {
      this.logger.info(`✅ Задание ${jobId} выполнено успешно`);
      this.emit('job:completed', { jobId, result });
    });

    this.gameGenerationQueue.on('global:failed', (jobId: string, error: any) => {
      this.logger.error(`❌ Задание ${jobId} завершилось с ошибкой:`, error);
      this.emit('job:failed', { jobId, error });
    });

    this.gameGenerationQueue.on('global:progress', (jobId: string, progress: any) => {
      this.logger.debug(`🔄 Прогресс задания ${jobId}: ${progress}%`);
      this.emit('job:progress', { jobId, progress });
    });

    this.gameGenerationQueue.on('global:stalled', (jobId: string) => {
      this.logger.warn(`⏸️ Задание ${jobId} приостановлено`);
      this.emit('job:stalled', { jobId });
    });

    // События очереди
    this.gameGenerationQueue.on('error', (error: Error) => {
      this.logger.error('Ошибка очереди:', error);
      this.emit('queue:error', error);
    });

    this.gameGenerationQueue.on('waiting', (jobId: string) => {
      this.logger.debug(`⏳ Задание ${jobId} ожидает выполнения`);
      this.emit('job:waiting', { jobId });
    });

    this.gameGenerationQueue.on('active', (job: Job, jobPromise: Promise<any>) => {
      this.logger.info(`🚀 Задание ${job.id} начато`);
      this.emit('job:active', { jobId: job.id, data: job.data });
    });
  }

  private setupJobProcessors(): void {
    // Обработчик заданий генерации игр
    this.gameGenerationQueue.process('generate-game', config.generation.maxConcurrent, async (job: Job<GenerationRequest>) => {
      const { data } = job;
      
      this.logger.generationStart(data.id, data.prompt);

      try {
        // Обновление прогресса
        const updateProgress = (step: string, progress: number, logs?: string[]) => {
          job.progress(progress);
          job.log(`${step}: ${progress}%`);
          
          if (logs) {
            logs.forEach(log => job.log(log));
          }

          this.logger.generationStep(data.id, step, progress);
          this.emit('generation:progress', {
            gameId: data.id,
            step,
            progress,
            logs,
          });
        };

        // Запуск пайплайна генерации
        const result = await this.pipeline.execute(data, updateProgress);
        
        this.logger.generationComplete(data.id, Date.now() - job.timestamp, result.size || 0);
        
        return result;
      } catch (error) {
        this.logger.generationError(data.id, 'pipeline', error);
        throw error;
      }
    });
  }

  private calculatePriority(request: GenerationRequest): number {
    // Приоритет от 1 (высший) до 100 (низший)
    let priority = 50; // Базовый приоритет

    // Увеличиваем приоритет для быстрых генераций
    if (request.options?.quality === 'fast') {
      priority -= 20;
    } else if (request.options?.quality === 'high') {
      priority += 10;
    }

    // Уменьшаем приоритет для больших проектов
    if (request.prompt.description.length > 500) {
      priority += 5;
    }

    return Math.max(1, Math.min(100, priority));
  }
} 