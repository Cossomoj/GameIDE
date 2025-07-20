import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { LoggerService } from './logger';
import { QueueService } from './queue';
import { InteractiveGenerationService } from './interactiveGeneration';
import { InteractiveGenerationEvents } from '@/types/interactive';
import { WSMessage } from '@/types';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: LoggerService;
  private queueService: QueueService;
  private interactiveService: InteractiveGenerationService;
  private gameSubscriptions = new Map<string, Set<string>>(); // gameId -> Set<socketId>
  private userRooms = new Map<string, string>(); // socketId -> userId

  constructor(io: SocketIOServer) {
    this.io = io;

    this.logger = new LoggerService();
    this.queueService = new QueueService();
    this.interactiveService = new InteractiveGenerationService();

    this.setupEventListeners();
    this.setupSocketHandlers();
  }

  private setupEventListeners(): void {
    // Подписываемся на события очереди
    this.queueService.on('generation:progress', (data) => {
      this.broadcastToGame(data.gameId, 'generation:progress', data);
    });

    this.queueService.on('generation:complete', (data) => {
      this.broadcastToGame(data.gameId, 'generation:complete', data);
    });

    this.queueService.on('generation:error', (data) => {
      this.broadcastToGame(data.gameId, 'generation:error', data);
    });

    // Подписываемся на события интерактивной генерации
    this.setupInteractiveEventListeners();
  }

  private setupInteractiveEventListeners(): void {
    this.interactiveService.on('step:started', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:step:started', data);
    });

    this.interactiveService.on('variants:generating', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:variants:generating', data);
    });

    this.interactiveService.on('variants:generated', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:variants:generated', data);
    });

    this.interactiveService.on('step:completed', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:step:completed', data);
    });

    this.interactiveService.on('generation:paused', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:generation:paused', data);
    });

    this.interactiveService.on('generation:resumed', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:generation:resumed', data);
    });

    this.interactiveService.on('generation:completed', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:generation:completed', data);
    });

    this.interactiveService.on('error', (data) => {
      this.broadcastToGame(data.gameId, 'interactive:error', data);
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info(`🔌 WebSocket подключение: ${socket.id}`);

      // Обработчики событий сокета
      this.handleConnection(socket);
      this.handleGameSubscription(socket);
      this.handleInteractiveEvents(socket);
      this.handleDisconnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    socket.on('auth', (data: { userId?: string }) => {
      if (data.userId) {
        this.userRooms.set(socket.id, data.userId);
        socket.join(`user:${data.userId}`);
        this.logger.info(`👤 Пользователь ${data.userId} авторизован в WebSocket`);
      }
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  private handleGameSubscription(socket: Socket): void {
    socket.on('subscribe:game', (gameId: string) => {
      if (!gameId) return;

      socket.join(`game:${gameId}`);
      
      // Добавляем в подписки
      if (!this.gameSubscriptions.has(gameId)) {
        this.gameSubscriptions.set(gameId, new Set());
      }
      this.gameSubscriptions.get(gameId)!.add(socket.id);

      this.logger.info(`📡 Подписка на игру ${gameId} от сокета ${socket.id}`);

      // Отправляем текущий статус игры
      this.sendGameStatus(socket, gameId);
    });

    socket.on('unsubscribe:game', (gameId: string) => {
      if (!gameId) return;

      socket.leave(`game:${gameId}`);
      
      // Удаляем из подписок
      const subscribers = this.gameSubscriptions.get(gameId);
      if (subscribers) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.gameSubscriptions.delete(gameId);
        }
      }

      this.logger.info(`❌ Отписка от игры ${gameId} сокета ${socket.id}`);
    });
  }

  private handleInteractiveEvents(socket: Socket): void {
    // Подписка на интерактивную генерацию
    socket.on('interactive:subscribe', (gameId: string) => {
      if (!gameId) return;

      socket.join(`interactive:${gameId}`);
      this.logger.info(`🎮 Подписка на интерактивную генерацию ${gameId}`);

      // Отправляем текущее состояние
      const state = this.interactiveService.getGenerationState(gameId);
      if (state) {
        socket.emit('interactive:state', {
          gameId,
          currentStep: state.currentStepIndex,
          totalSteps: state.totalSteps,
          step: state.steps[state.currentStepIndex],
          isActive: state.isActive
        });
      }
    });

    // Генерация дополнительных вариантов
    socket.on('interactive:generate:more', async (data: {
      gameId: string;
      stepId: string;
      count?: number;
      customPrompt?: string;
    }) => {
      try {
        const response = await this.interactiveService.generateStepVariants(
          data.gameId,
          data.stepId,
          data.count || 5
        );

        socket.emit('interactive:variants:generated', {
          gameId: data.gameId,
          stepId: data.stepId,
          variants: response.variants
        });
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          stepId: data.stepId,
          message: error instanceof Error ? error.message : 'Ошибка генерации вариантов',
          code: 'VARIANT_GENERATION_ERROR'
        });
      }
    });

    // Выбор варианта
    socket.on('interactive:select:variant', async (data: {
      gameId: string;
      stepId: string;
      variantId: string;
      customPrompt?: string;
    }) => {
      try {
        await this.interactiveService.selectVariant(
          data.gameId,
          data.stepId,
          data.variantId,
          data.customPrompt
        );

        // Успех будет отправлен через события сервиса
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          stepId: data.stepId,
          message: error instanceof Error ? error.message : 'Ошибка выбора варианта',
          code: 'VARIANT_SELECTION_ERROR'
        });
      }
    });

    // Приостановка генерации
    socket.on('interactive:pause', (data: { gameId: string; reason?: string }) => {
      this.interactiveService.pauseGeneration(data.gameId, data.reason);
    });

    // Возобновление генерации
    socket.on('interactive:resume', (data: { gameId: string }) => {
      this.interactiveService.resumeGeneration(data.gameId);
    });

    // Завершение генерации
    socket.on('interactive:complete', async (data: { gameId: string }) => {
      try {
        await this.interactiveService.completeGeneration(data.gameId);
        // Успех будет отправлен через события сервиса
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          message: error instanceof Error ? error.message : 'Ошибка завершения генерации',
          code: 'COMPLETION_ERROR'
        });
      }
    });

    // Генерация вариантов с кастомным промптом
    socket.on('interactive:generate:custom', async (data: {
      gameId: string;
      stepId: string;
      customPrompt: string;
      count?: number;
    }) => {
      try {
        // Отправляем начало генерации
        socket.emit('interactive:variants:generating', {
          gameId: data.gameId,
          stepId: data.stepId,
          message: `Генерируем варианты с учетом ваших требований: "${data.customPrompt}"`,
          isCustom: true
        });

        const response = await this.interactiveService.generateVariantsWithCustomPrompt(
          data.gameId,
          data.stepId,
          data.customPrompt,
          data.count || 3
        );

        socket.emit('interactive:variants:generated', {
          gameId: data.gameId,
          stepId: data.stepId,
          variants: response.variants,
          isCustomGeneration: true,
          customPrompt: data.customPrompt
        });
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          stepId: data.stepId,
          message: error instanceof Error ? error.message : 'Ошибка генерации кастомных вариантов',
          code: 'CUSTOM_VARIANT_GENERATION_ERROR'
        });
      }
    });

    // Получение детального прогресса
    socket.on('interactive:get:progress', (data: { gameId: string }) => {
      try {
        const progress = this.interactiveService.getGenerationProgress(data.gameId);
        
        if (progress) {
          socket.emit('interactive:progress:update', {
            gameId: data.gameId,
            ...progress
          });
        } else {
          socket.emit('interactive:error', {
            gameId: data.gameId,
            message: 'Генерация не найдена',
            code: 'GENERATION_NOT_FOUND'
          });
        }
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          message: error instanceof Error ? error.message : 'Ошибка получения прогресса',
          code: 'PROGRESS_ERROR'
        });
      }
    });

    // Генерация превью для варианта
    socket.on('interactive:generate:preview', async (data: {
      gameId: string;
      stepId: string;
      variantId: string;
    }) => {
      try {
        socket.emit('interactive:preview:generating', {
          gameId: data.gameId,
          stepId: data.stepId,
          variantId: data.variantId,
          message: 'Создаем превью...'
        });

        const preview = await this.interactiveService.generateVariantPreview(
          data.gameId,
          data.stepId,
          data.variantId
        );

        socket.emit('interactive:preview:generated', {
          gameId: data.gameId,
          stepId: data.stepId,
          variantId: data.variantId,
          preview
        });
      } catch (error) {
        socket.emit('interactive:error', {
          gameId: data.gameId,
          stepId: data.stepId,
          variantId: data.variantId,
          message: error instanceof Error ? error.message : 'Ошибка генерации превью',
          code: 'PREVIEW_GENERATION_ERROR'
        });
      }
    });
  }

  private handleDisconnection(socket: Socket): void {
    socket.on('disconnect', () => {
      this.logger.info(`🔌 WebSocket отключение: ${socket.id}`);

      // Удаляем из всех подписок
      for (const [gameId, subscribers] of this.gameSubscriptions.entries()) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.gameSubscriptions.delete(gameId);
        }
      }

      // Удаляем из пользовательских комнат
      this.userRooms.delete(socket.id);
    });
  }

  private async sendGameStatus(socket: Socket, gameId: string): Promise<void> {
    try {
      // Отправляем статус обычной генерации
      const queueStatus = await this.queueService.getJobStatus(gameId);
      if (queueStatus) {
        socket.emit('game:status', {
          gameId,
          status: queueStatus.status,
          progress: queueStatus.progress,
          logs: queueStatus.logs
        });
      }

      // Отправляем статус интерактивной генерации
      const interactiveState = this.interactiveService.getGenerationState(gameId);
      if (interactiveState) {
        socket.emit('interactive:state', {
          gameId,
          currentStep: interactiveState.currentStepIndex,
          totalSteps: interactiveState.totalSteps,
          step: interactiveState.steps[interactiveState.currentStepIndex],
          isActive: interactiveState.isActive,
          completedSteps: interactiveState.steps.filter(s => s.isCompleted).length
        });
      }
    } catch (error) {
      this.logger.error(`Ошибка получения статуса игры ${gameId}:`, error);
    }
  }

  public broadcastToGame(gameId: string, event: string, data: any): void {
    this.io.to(`game:${gameId}`).emit(event, data);
    this.io.to(`interactive:${gameId}`).emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public getConnectedSockets(): number {
    return this.io.sockets.sockets.size;
  }

  public getGameSubscribers(gameId: string): number {
    return this.gameSubscriptions.get(gameId)?.size || 0;
  }

  public async getSystemStatus(): Promise<{
    connectedSockets: number;
    gameSubscriptions: number;
    interactiveGenerations: number;
  }> {
    const interactiveGenerations = Array.from(this.gameSubscriptions.keys())
      .filter(gameId => this.interactiveService.getGenerationState(gameId))
      .length;

    return {
      connectedSockets: this.getConnectedSockets(),
      gameSubscriptions: this.gameSubscriptions.size,
      interactiveGenerations
    };
  }

  public close(): void {
    this.io.close();
    this.logger.info('🔌 WebSocket сервер закрыт');
  }

  // Методы для отправки сообщений клиентам

  public sendGameProgress(gameId: string, progress: number, step: string, logs?: string[]): void {
    const message: WSMessage = {
      type: 'progress',
      gameId,
      data: {
        progress,
        step,
        logs,
        timestamp: Date.now(),
      },
    };

    this.sendToGameSubscribers(gameId, 'game:progress', message);
  }

  public sendGameLog(gameId: string, level: 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    const wsMessage: WSMessage = {
      type: 'log',
      gameId,
      data: {
        level,
        message,
        metadata,
        timestamp: Date.now(),
      },
    };

    this.sendToGameSubscribers(gameId, 'game:log', wsMessage);
  }

  public sendGamePreview(gameId: string, previewData: any): void {
    const message: WSMessage = {
      type: 'preview',
      gameId,
      data: {
        preview: previewData,
        timestamp: Date.now(),
      },
    };

    this.sendToGameSubscribers(gameId, 'game:preview', message);
  }

  public sendGameError(gameId: string, error: string, step?: string): void {
    const message: WSMessage = {
      type: 'error',
      gameId,
      data: {
        error,
        step,
        timestamp: Date.now(),
      },
    };

    this.sendToGameSubscribers(gameId, 'game:error', message);
  }

  public sendGameCompleted(gameId: string, result: any): void {
    const message: WSMessage = {
      type: 'completed',
      gameId,
      data: {
        result,
        timestamp: Date.now(),
      },
    };

    this.sendToGameSubscribers(gameId, 'game:completed', message);
  }

  private sendToGameSubscribers(gameId: string, event: string, data: any): void {
    const subscriberCount = this.gameSubscriptions.get(gameId)?.size || 0;
    
    if (subscriberCount > 0) {
      this.io.to(`game:${gameId}`).emit(event, data);
      this.logger.debug(`📡 Отправлено ${event} для игры ${gameId} (${subscriberCount} подписчиков)`);
    }
  }

  // Методы для широковещательных сообщений

  public broadcastSystemMessage(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    this.io.emit('system:message', {
      type,
      message,
      timestamp: Date.now(),
    });

    this.logger.info(`📢 Системное сообщение отправлено всем клиентам: ${message}`);
  }

  public broadcastServerStatus(status: 'online' | 'maintenance' | 'overloaded', details?: any): void {
    this.io.emit('server:status', {
      status,
      details,
      timestamp: Date.now(),
    });

    this.logger.info(`📊 Статус сервера изменен: ${status}`);
  }

  // Методы для мониторинга

  public getConnectionStats(): {
    totalConnections: number;
    gameSubscriptions: number;
    activeGames: string[];
  } {
    return {
      totalConnections: this.getConnectedSockets(),
      gameSubscriptions: this.gameSubscriptions.size,
      activeGames: Array.from(this.gameSubscriptions.keys()),
    };
  }

  // Методы для управления подключениями

  public disconnectClient(clientId: string, reason: string = 'Server request'): void {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit('server:disconnect', { reason, timestamp: Date.now() });
      socket.disconnect(true);
      this.logger.info(`🔌 Принудительное отключение клиента ${clientId}: ${reason}`);
    }
  }

  public disconnectAllClients(reason: string = 'Server shutdown'): void {
    this.io.emit('server:shutdown', { reason, timestamp: Date.now() });
    
    setTimeout(() => {
      this.io.disconnectSockets(true);
      this.logger.info(`🔌 Все WebSocket подключения закрыты: ${reason}`);
    }, 5000); // Даем 5 секунд клиентам для обработки сообщения
  }

  // Методы для отправки персональных сообщений

  public sendToClient(clientId: string, event: string, data: any): boolean {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  public sendRateLimitWarning(clientId: string, resetTime: number): void {
    this.sendToClient(clientId, 'rate:limit', {
      message: 'Превышен лимит запросов',
      resetTime,
      timestamp: Date.now(),
    });
  }

  // Интеграция с очередью заданий
  public setupQueueIntegration(queueService: QueueService): void {
    // Подписываемся на события очереди
    queueService.on('generation:progress', (data: { gameId: string; step: string; progress: number; logs?: string[] }) => {
      this.sendGameProgress(data.gameId, data.progress, data.step, data.logs);
    });

    queueService.on('job:completed', (data: { jobId: string; result: any }) => {
      this.sendGameCompleted(data.jobId, data.result);
    });

    queueService.on('job:failed', (data: { jobId: string; error: any }) => {
      this.sendGameError(data.jobId, data.error.message || 'Неизвестная ошибка');
    });

    queueService.on('job:active', (data: { jobId: string; data: any }) => {
      this.sendGameLog(data.jobId, 'info', 'Начата обработка задания');
    });

    queueService.on('queue:error', (error: Error) => {
      this.broadcastSystemMessage(`Ошибка системы очередей: ${error.message}`, 'error');
    });

    this.logger.systemEvent('WebSocket интеграция с очередью настроена');
  }
}

// Функция для инициализации WebSocket сервиса
export function setupWebSocket(io: SocketIOServer): WebSocketService {
  const wsService = new WebSocketService(io);
  return wsService;
} 