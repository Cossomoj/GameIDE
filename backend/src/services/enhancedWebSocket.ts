import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { LoggerService } from './logger';
import { QueueService } from './queue';
import { InteractiveGenerationService } from './interactiveGeneration';
import { InteractiveGenerationEvents } from '@/types/interactive';
import { WSMessage } from '@/types';
import EventEmitter from 'events';

interface ClientConnection {
  id: string;
  userId?: string;
  lastPing: number;
  lastPong: number;
  connectionTime: number;
  retryCount: number;
  gameSubscriptions: Set<string>;
  status: 'connected' | 'reconnecting' | 'disconnected';
  metadata: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  reconnectingConnections: number;
  avgConnectionTime: number;
  totalReconnects: number;
  failedReconnects: number;
  gameSubscriptions: number;
  activeGames: string[];
  heartbeatFailures: number;
}

interface ReconnectionConfig {
  enabled: boolean;
  maxRetries: number;
  retryInterval: number;
  exponentialBackoff: boolean;
  maxRetryInterval: number;
  gracefulDisconnectTimeout: number;
}

interface HeartbeatConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  maxMissed: number;
  adaptive: boolean;
}

interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
}

export class EnhancedWebSocketService extends EventEmitter {
  private io: SocketIOServer;
  private logger: LoggerService;
  private queueService: QueueService;
  private interactiveService: InteractiveGenerationService;
  
  // Управление соединениями
  private connections = new Map<string, ClientConnection>();
  private gameSubscriptions = new Map<string, Set<string>>(); // gameId -> Set<socketId>
  private userSessions = new Map<string, Set<string>>(); // userId -> Set<socketId>
  
  // Мониторинг и статистика
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    reconnectingConnections: 0,
    avgConnectionTime: 0,
    totalReconnects: 0,
    failedReconnects: 0,
    gameSubscriptions: 0,
    activeGames: [],
    heartbeatFailures: 0
  };
  
  // Конфигурация
  private reconnectionConfig: ReconnectionConfig = {
    enabled: true,
    maxRetries: 5,
    retryInterval: 1000,
    exponentialBackoff: true,
    maxRetryInterval: 30000,
    gracefulDisconnectTimeout: 5000
  };
  
  private heartbeatConfig: HeartbeatConfig = {
    enabled: true,
    interval: 30000, // 30 секунд
    timeout: 5000,   // 5 секунд на ответ
    maxMissed: 3,    // Максимум пропущенных heartbeat
    adaptive: true   // Адаптивная частота на основе нагрузки
  };
  
  private rateLimitConfig: RateLimitConfig = {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000, // 1 минута
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  };
  
  // Внутренние таймеры и интервалы
  private heartbeatInterval?: NodeJS.Timeout;
  private statsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  // Rate limiting
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.logger = LoggerService.getInstance();
    this.queueService = new QueueService();
    this.interactiveService = new InteractiveGenerationService();

    this.initializeService();
  }

  /**
   * Инициализация сервиса
   */
  private initializeService(): void {
    this.setupSocketIOConfig();
    this.setupEventListeners();
    this.setupSocketHandlers();
    this.startHeartbeat();
    this.startStatsCollection();
    this.startCleanupTasks();
    
    this.logger.info('🚀 Enhanced WebSocket сервис инициализирован');
  }

  /**
   * Настройка конфигурации Socket.IO
   */
  private setupSocketIOConfig(): void {
    this.io.engine.on('connection_error', (err) => {
      this.logger.error('❌ Ошибка подключения Socket.IO:', err);
      this.emit('connection_error', err);
    });

    // Настройка CORS и других параметров безопасности
    this.io.use((socket, next) => {
      // Валидация и аутентификация
      const token = socket.handshake.auth?.token;
      const origin = socket.handshake.headers.origin;
      
      // Простая проверка origin (в production заменить на реальную логику)
      if (origin && !this.isAllowedOrigin(origin)) {
        return next(new Error('Origin not allowed'));
      }
      
      // Rate limiting на уровне подключения
      if (this.rateLimitConfig.enabled && !this.checkConnectionRateLimit(socket)) {
        return next(new Error('Connection rate limit exceeded'));
      }
      
      next();
    });
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    // События очереди
    this.queueService.on('generation:progress', (data) => {
      this.broadcastToGame(data.gameId, 'generation:progress', data);
    });

    this.queueService.on('generation:complete', (data) => {
      this.broadcastToGame(data.gameId, 'generation:complete', data);
    });

    this.queueService.on('generation:error', (data) => {
      this.broadcastToGame(data.gameId, 'generation:error', data);
    });

    // События интерактивной генерации
    this.setupInteractiveEventListeners();
    
    // Системные события
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Настройка обработчиков интерактивных событий
   */
  private setupInteractiveEventListeners(): void {
    const events = [
      'step:started', 'variants:generating', 'variants:generated',
      'step:completed', 'generation:paused', 'generation:resumed',
      'generation:completed', 'error'
    ];

    events.forEach(eventType => {
      this.interactiveService.on(eventType, (data) => {
        this.broadcastToGame(data.gameId, `interactive:${eventType}`, data);
      });
    });
  }

  /**
   * Настройка обработчиков сокетов
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleNewConnection(socket);
      this.setupSocketEventHandlers(socket);
    });
  }

  /**
   * Обработка нового подключения
   */
  private handleNewConnection(socket: Socket): void {
    const connection: ClientConnection = {
      id: socket.id,
      lastPing: Date.now(),
      lastPong: Date.now(),
      connectionTime: Date.now(),
      retryCount: 0,
      gameSubscriptions: new Set(),
      status: 'connected',
      metadata: {
        userAgent: socket.handshake.headers['user-agent'],
        ip: socket.handshake.address,
        platform: socket.handshake.query.platform as string
      }
    };

    this.connections.set(socket.id, connection);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.logger.info(`🔌 Новое WebSocket подключение: ${socket.id} [${connection.metadata.ip}]`);
    this.emit('client_connected', { socketId: socket.id, connection });

    // Отправляем настройки переподключения клиенту
    socket.emit('connection:config', {
      heartbeatInterval: this.heartbeatConfig.interval,
      reconnection: this.reconnectionConfig,
      serverId: process.env.SERVER_ID || 'ws-server-1'
    });
  }

  /**
   * Настройка обработчиков событий сокета
   */
  private setupSocketEventHandlers(socket: Socket): void {
    // Аутентификация
    socket.on('auth', (data: { userId?: string; token?: string }) => {
      this.handleAuthentication(socket, data);
    });

    // Подписки на игры
    socket.on('game:subscribe', (data: { gameId: string }) => {
      this.handleGameSubscription(socket, data.gameId);
    });

    socket.on('game:unsubscribe', (data: { gameId: string }) => {
      this.handleGameUnsubscription(socket, data.gameId);
    });

    // Интерактивные события
    socket.on('interactive:start', (data) => {
      if (this.checkRateLimit(socket.id)) {
        this.handleInteractiveStart(socket, data);
      }
    });

    socket.on('interactive:choice', (data) => {
      if (this.checkRateLimit(socket.id)) {
        this.handleInteractiveChoice(socket, data);
      }
    });

    socket.on('interactive:pause', (data) => {
      this.handleInteractivePause(socket, data);
    });

    socket.on('interactive:resume', (data) => {
      this.handleInteractiveResume(socket, data);
    });

    // Heartbeat
    socket.on('pong', () => {
      this.handlePong(socket);
    });

    socket.on('ping', () => {
      this.handlePing(socket);
    });

    // Переподключение
    socket.on('reconnect_attempt', (data: { retryCount: number; lastConnectTime: number }) => {
      this.handleReconnectAttempt(socket, data);
    });

    // Отключение
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    socket.on('disconnecting', (reason) => {
      this.handleDisconnecting(socket, reason);
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      this.handleSocketError(socket, error);
    });

    // Мониторинг качества соединения
    socket.on('connection:quality', (data: { latency: number; lossRate: number }) => {
      this.handleConnectionQuality(socket, data);
    });
  }

  /**
   * Обработка аутентификации
   */
  private handleAuthentication(socket: Socket, data: { userId?: string; token?: string }): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    if (data.userId) {
      connection.userId = data.userId;
      
      // Добавляем в пользовательские сессии
      if (!this.userSessions.has(data.userId)) {
        this.userSessions.set(data.userId, new Set());
      }
      this.userSessions.get(data.userId)!.add(socket.id);
      
      socket.join(`user:${data.userId}`);
      
      this.logger.info(`👤 Пользователь ${data.userId} авторизован в WebSocket [${socket.id}]`);
      
      socket.emit('auth:success', {
        userId: data.userId,
        socketId: socket.id,
        serverTime: Date.now()
      });
      
      this.emit('user_authenticated', { socketId: socket.id, userId: data.userId });
    } else {
      socket.emit('auth:error', { message: 'Требуется userId' });
    }
  }

  /**
   * Обработка подписки на игру
   */
  private handleGameSubscription(socket: Socket, gameId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.gameSubscriptions.add(gameId);
    
    if (!this.gameSubscriptions.has(gameId)) {
      this.gameSubscriptions.set(gameId, new Set());
    }
    this.gameSubscriptions.get(gameId)!.add(socket.id);
    
    socket.join(`game:${gameId}`);
    
    this.logger.info(`🎮 Клиент ${socket.id} подписался на игру ${gameId}`);
    
    socket.emit('game:subscribed', { gameId, subscriberCount: this.gameSubscriptions.get(gameId)!.size });
    this.emit('game_subscription', { socketId: socket.id, gameId });
    
    this.updateStats();
  }

  /**
   * Обработка отписки от игры
   */
  private handleGameUnsubscription(socket: Socket, gameId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.gameSubscriptions.delete(gameId);
    this.gameSubscriptions.get(gameId)?.delete(socket.id);
    
    socket.leave(`game:${gameId}`);
    
    // Удаляем пустые подписки
    if (this.gameSubscriptions.get(gameId)?.size === 0) {
      this.gameSubscriptions.delete(gameId);
    }
    
    this.logger.info(`🎮 Клиент ${socket.id} отписался от игры ${gameId}`);
    
    socket.emit('game:unsubscribed', { gameId });
    this.emit('game_unsubscription', { socketId: socket.id, gameId });
    
    this.updateStats();
  }

  /**
   * Обработка интерактивных событий
   */
  private async handleInteractiveStart(socket: Socket, data: any): Promise<void> {
    try {
      const result = await this.interactiveService.startGeneration(data);
      socket.emit('interactive:started', result);
      this.emit('interactive_generation_started', { socketId: socket.id, data: result });
    } catch (error) {
      socket.emit('interactive:error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'START_FAILED'
      });
    }
  }

  private async handleInteractiveChoice(socket: Socket, data: any): Promise<void> {
    try {
      const result = await this.interactiveService.processChoice(data);
      socket.emit('interactive:choice:processed', result);
    } catch (error) {
      socket.emit('interactive:error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CHOICE_FAILED'
      });
    }
  }

  private async handleInteractivePause(socket: Socket, data: any): Promise<void> {
    try {
      await this.interactiveService.pauseGeneration(data.gameId);
      socket.emit('interactive:paused', { gameId: data.gameId });
    } catch (error) {
      socket.emit('interactive:error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PAUSE_FAILED'
      });
    }
  }

  private async handleInteractiveResume(socket: Socket, data: any): Promise<void> {
    try {
      await this.interactiveService.resumeGeneration(data.gameId);
      socket.emit('interactive:resumed', { gameId: data.gameId });
    } catch (error) {
      socket.emit('interactive:error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RESUME_FAILED'
      });
    }
  }

  /**
   * Обработка heartbeat
   */
  private handlePing(socket: Socket): void {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.lastPing = Date.now();
      socket.emit('pong', { timestamp: Date.now() });
    }
  }

  private handlePong(socket: Socket): void {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.lastPong = Date.now();
      const latency = connection.lastPong - connection.lastPing;
      
      socket.emit('heartbeat:info', {
        latency,
        status: 'healthy',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Обработка переподключения
   */
  private handleReconnectAttempt(socket: Socket, data: { retryCount: number; lastConnectTime: number }): void {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.retryCount = data.retryCount;
      connection.status = 'reconnecting';
      this.stats.totalReconnects++;
      
      this.logger.info(`🔄 Попытка переподключения ${data.retryCount} для клиента ${socket.id}`);
      
      socket.emit('reconnect:acknowledged', {
        retryCount: data.retryCount,
        maxRetries: this.reconnectionConfig.maxRetries,
        nextRetryDelay: this.calculateRetryDelay(data.retryCount)
      });
      
      this.emit('client_reconnecting', { socketId: socket.id, retryCount: data.retryCount });
    }
  }

  /**
   * Обработка отключения
   */
  private handleDisconnecting(socket: Socket, reason: string): void {
    this.logger.info(`🔌 Клиент ${socket.id} отключается: ${reason}`);
    
    // Уведомляем о предстоящем отключении
    socket.emit('disconnecting', { reason, timestamp: Date.now() });
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    // Обновляем статистику
    this.stats.activeConnections--;
    if (connection.status === 'reconnecting') {
      this.stats.reconnectingConnections--;
    }

    // Очищаем подписки на игры
    for (const gameId of connection.gameSubscriptions) {
      this.gameSubscriptions.get(gameId)?.delete(socket.id);
      if (this.gameSubscriptions.get(gameId)?.size === 0) {
        this.gameSubscriptions.delete(gameId);
      }
    }

    // Очищаем пользовательские сессии
    if (connection.userId) {
      this.userSessions.get(connection.userId)?.delete(socket.id);
      if (this.userSessions.get(connection.userId)?.size === 0) {
        this.userSessions.delete(connection.userId);
      }
    }

    // Удаляем соединение
    this.connections.delete(socket.id);

    this.logger.info(`🔌 Клиент ${socket.id} отключен: ${reason} (время соединения: ${Date.now() - connection.connectionTime}ms)`);
    
    this.emit('client_disconnected', { 
      socketId: socket.id, 
      reason, 
      userId: connection.userId,
      connectionTime: Date.now() - connection.connectionTime
    });
    
    this.updateStats();
  }

  /**
   * Обработка ошибок сокета
   */
  private handleSocketError(socket: Socket, error: Error): void {
    this.logger.error(`❌ Ошибка WebSocket [${socket.id}]:`, error);
    
    socket.emit('error:info', {
      message: 'Произошла ошибка соединения',
      code: 'SOCKET_ERROR',
      timestamp: Date.now()
    });
    
    this.emit('socket_error', { socketId: socket.id, error });
  }

  /**
   * Обработка информации о качестве соединения
   */
  private handleConnectionQuality(socket: Socket, data: { latency: number; lossRate: number }): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    // Адаптивная настройка heartbeat на основе качества соединения
    if (this.heartbeatConfig.adaptive) {
      const adjustedInterval = this.calculateAdaptiveHeartbeat(data.latency, data.lossRate);
      socket.emit('heartbeat:config', { interval: adjustedInterval });
    }

    this.emit('connection_quality_update', { socketId: socket.id, quality: data });
  }

  /**
   * Запуск heartbeat
   */
  private startHeartbeat(): void {
    if (!this.heartbeatConfig.enabled) return;

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, this.heartbeatConfig.interval);

    this.logger.info(`💓 Heartbeat запущен с интервалом ${this.heartbeatConfig.interval}ms`);
  }

  /**
   * Выполнение проверки heartbeat
   */
  private performHeartbeatCheck(): void {
    const now = Date.now();
    const timeoutThreshold = now - this.heartbeatConfig.timeout;
    const missedThreshold = now - (this.heartbeatConfig.interval * this.heartbeatConfig.maxMissed);

    for (const [socketId, connection] of this.connections) {
      // Проверяем пропущенные heartbeat
      if (connection.lastPong < missedThreshold) {
        this.stats.heartbeatFailures++;
        this.logger.warn(`💔 Heartbeat failure для клиента ${socketId} (последний pong: ${new Date(connection.lastPong)})`);
        
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('heartbeat:warning', {
            message: 'Слабое соединение обнаружено',
            lastPong: connection.lastPong,
            threshold: missedThreshold
          });
          
          // Принудительное отключение после превышения лимита
          if (connection.lastPong < now - (this.heartbeatConfig.interval * (this.heartbeatConfig.maxMissed + 2))) {
            socket.disconnect(true);
          }
        }
      } 
      // Отправляем ping если пришло время
      else if (connection.lastPing < timeoutThreshold) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          connection.lastPing = now;
          socket.emit('ping', { timestamp: now });
        }
      }
    }
  }

  /**
   * Проверка rate limit
   */
  private checkRateLimit(socketId: string): boolean {
    if (!this.rateLimitConfig.enabled) return true;

    const now = Date.now();
    const windowKey = `${socketId}:${Math.floor(now / this.rateLimitConfig.windowMs)}`;
    
    let rateData = this.rateLimitStore.get(windowKey);
    if (!rateData) {
      rateData = { count: 0, resetTime: now + this.rateLimitConfig.windowMs };
      this.rateLimitStore.set(windowKey, rateData);
    }

    rateData.count++;

    if (rateData.count > this.rateLimitConfig.maxRequests) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('rate:limit', {
          message: 'Превышен лимит запросов',
          resetTime: rateData.resetTime,
          limit: this.rateLimitConfig.maxRequests,
          window: this.rateLimitConfig.windowMs
        });
      }
      return false;
    }

    return true;
  }

  /**
   * Проверка rate limit для подключений
   */
  private checkConnectionRateLimit(socket: Socket): boolean {
    // Простая проверка по IP
    const ip = socket.handshake.address;
    const now = Date.now();
    const windowKey = `connection:${ip}:${Math.floor(now / 60000)}`; // 1 минута
    
    let rateData = this.rateLimitStore.get(windowKey);
    if (!rateData) {
      rateData = { count: 0, resetTime: now + 60000 };
      this.rateLimitStore.set(windowKey, rateData);
    }

    rateData.count++;
    
    // Лимит 10 подключений в минуту с одного IP
    return rateData.count <= 10;
  }

  /**
   * Проверка разрешенного origin
   */
  private isAllowedOrigin(origin: string): boolean {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourgame.com',
      'https://yandex.ru'
    ];
    
    return allowedOrigins.includes(origin) || origin.includes('localhost');
  }

  /**
   * Вычисление задержки повторного подключения
   */
  private calculateRetryDelay(retryCount: number): number {
    if (!this.reconnectionConfig.exponentialBackoff) {
      return this.reconnectionConfig.retryInterval;
    }

    const delay = this.reconnectionConfig.retryInterval * Math.pow(2, retryCount - 1);
    return Math.min(delay, this.reconnectionConfig.maxRetryInterval);
  }

  /**
   * Вычисление адаптивного интервала heartbeat
   */
  private calculateAdaptiveHeartbeat(latency: number, lossRate: number): number {
    const baseInterval = this.heartbeatConfig.interval;
    
    // Увеличиваем интервал при высокой задержке или потерях
    let multiplier = 1;
    if (latency > 1000) multiplier += 0.5; // +50% при задержке > 1s
    if (lossRate > 0.05) multiplier += 0.3; // +30% при потерях > 5%
    
    return Math.min(baseInterval * multiplier, 60000); // Максимум 1 минута
  }

  /**
   * Запуск сбора статистики
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      this.updateStats();
      this.emitStatsUpdate();
    }, 30000); // Каждые 30 секунд
  }

  /**
   * Обновление статистики
   */
  private updateStats(): void {
    this.stats.activeConnections = this.connections.size;
    this.stats.reconnectingConnections = Array.from(this.connections.values())
      .filter(conn => conn.status === 'reconnecting').length;
    this.stats.gameSubscriptions = this.gameSubscriptions.size;
    this.stats.activeGames = Array.from(this.gameSubscriptions.keys());
    
    // Вычисляем среднее время соединения
    const now = Date.now();
    const connectionTimes = Array.from(this.connections.values())
      .map(conn => now - conn.connectionTime);
    this.stats.avgConnectionTime = connectionTimes.length > 0 
      ? connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length 
      : 0;
  }

  /**
   * Отправка обновления статистики
   */
  private emitStatsUpdate(): void {
    this.emit('stats_update', this.stats);
  }

  /**
   * Запуск задач очистки
   */
  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimitStore();
      this.cleanupStaleConnections();
    }, 300000); // Каждые 5 минут
  }

  /**
   * Очистка устаревших данных rate limit
   */
  private cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, data] of this.rateLimitStore) {
      if (data.resetTime < now) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Очистка устаревших соединений
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 минут
    
    for (const [socketId, connection] of this.connections) {
      if (connection.lastPong < now - staleThreshold) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        } else {
          this.connections.delete(socketId);
        }
      }
    }
  }

  /**
   * Широковещательная отправка в игру
   */
  public broadcastToGame(gameId: string, event: string, data: any): void {
    const subscriberCount = this.gameSubscriptions.get(gameId)?.size || 0;
    
    if (subscriberCount > 0) {
      this.io.to(`game:${gameId}`).emit(event, {
        ...data,
        timestamp: Date.now(),
        serverId: process.env.SERVER_ID || 'ws-server-1'
      });
      
      this.logger.debug(`📡 Отправлено ${event} для игры ${gameId} (${subscriberCount} подписчиков)`);
    }
  }

  /**
   * Отправка сообщения пользователю
   */
  public sendToUser(userId: string, event: string, data: any): number {
    const userSockets = this.userSessions.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return 0;
    }

    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });

    return userSockets.size;
  }

  /**
   * Системные сообщения
   */
  public broadcastSystemMessage(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    this.io.emit('system:message', {
      type,
      message,
      timestamp: Date.now(),
      serverId: process.env.SERVER_ID || 'ws-server-1'
    });

    this.logger.info(`📢 Системное сообщение отправлено всем клиентам: ${message}`);
  }

  /**
   * Получение статистики
   */
  public getStats(): ConnectionStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Получение информации о соединении
   */
  public getConnection(socketId: string): ClientConnection | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Получение всех соединений пользователя
   */
  public getUserConnections(userId: string): ClientConnection[] {
    const socketIds = this.userSessions.get(userId) || new Set();
    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter(Boolean) as ClientConnection[];
  }

  /**
   * Принудительное отключение клиента
   */
  public disconnectClient(socketId: string, reason: string = 'Server request'): boolean {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('server:disconnect', { reason, timestamp: Date.now() });
      socket.disconnect(true);
      return true;
    }
    return false;
  }

  /**
   * Изящное завершение работы
   */
  public async gracefulShutdown(): Promise<void> {
    this.logger.info('🔄 Начинаю изящное завершение WebSocket сервиса...');

    // Останавливаем таймеры
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Уведомляем всех клиентов
    this.io.emit('server:shutdown', {
      message: 'Сервер завершает работу',
      gracefulTimeout: this.reconnectionConfig.gracefulDisconnectTimeout,
      timestamp: Date.now()
    });

    // Ждем некоторое время для обработки клиентами
    await new Promise(resolve => setTimeout(resolve, this.reconnectionConfig.gracefulDisconnectTimeout));

    // Закрываем все соединения
    this.io.disconnectSockets(true);
    
    this.logger.info('✅ WebSocket сервис завершен');
  }

  /**
   * Обновление конфигурации
   */
  public updateConfig(config: {
    reconnection?: Partial<ReconnectionConfig>;
    heartbeat?: Partial<HeartbeatConfig>;
    rateLimit?: Partial<RateLimitConfig>;
  }): void {
    if (config.reconnection) {
      this.reconnectionConfig = { ...this.reconnectionConfig, ...config.reconnection };
    }
    
    if (config.heartbeat) {
      this.heartbeatConfig = { ...this.heartbeatConfig, ...config.heartbeat };
      
      // Перезапускаем heartbeat если изменился интервал
      if (config.heartbeat.interval && this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.startHeartbeat();
      }
    }
    
    if (config.rateLimit) {
      this.rateLimitConfig = { ...this.rateLimitConfig, ...config.rateLimit };
    }

    this.logger.info('⚙️ Конфигурация WebSocket сервиса обновлена');
  }

  /**
   * Экспорт метрик для мониторинга
   */
  public getMetrics(): Record<string, number> {
    return {
      total_connections: this.stats.totalConnections,
      active_connections: this.stats.activeConnections,
      reconnecting_connections: this.stats.reconnectingConnections,
      total_reconnects: this.stats.totalReconnects,
      failed_reconnects: this.stats.failedReconnects,
      heartbeat_failures: this.stats.heartbeatFailures,
      game_subscriptions: this.stats.gameSubscriptions,
      avg_connection_time: this.stats.avgConnectionTime,
      rate_limit_store_size: this.rateLimitStore.size
    };
  }
}

// Функция для создания и настройки enhanced WebSocket сервиса
export function setupEnhancedWebSocket(io: SocketIOServer): EnhancedWebSocketService {
  const wsService = new EnhancedWebSocketService(io);
  
  // Настройка мониторинга
  wsService.on('stats_update', (stats) => {
    // Можно отправлять метрики в систему мониторинга
    // console.log('WebSocket Stats:', stats);
  });
  
  return wsService;
} 