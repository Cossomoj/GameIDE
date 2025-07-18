import { io, Socket } from 'socket.io-client';
import { WSMessage, ProgressData, LogData, ErrorData, CompletedData } from '@/types';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.socket = io(WS_URL, {
        path: '/ws',
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Ошибка подключения к WebSocket:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket подключен');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 WebSocket отключен:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Ошибка подключения WebSocket:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Превышено максимальное количество попыток переподключения');
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 WebSocket переподключен (попытка ${attemptNumber})`);
    });

    this.socket.on('connected', (data: any) => {
      console.log('✅ WebSocket готов к работе:', data);
    });
  }

  // Подписка на обновления игры
  public subscribeToGame(
    gameId: string,
    callbacks: {
      onProgress?: (data: ProgressData) => void;
      onLog?: (data: LogData) => void;
      onError?: (data: ErrorData) => void;
      onCompleted?: (data: CompletedData) => void;
      onPreview?: (data: any) => void;
    }
  ): void {
    if (!this.socket) {
      console.warn('WebSocket не подключен');
      return;
    }

    // Подписываемся на игру
    this.socket.emit('subscribe:game', gameId);

    // Настраиваем обработчики событий
    if (callbacks.onProgress) {
      this.socket.on('game:progress', (message: WSMessage) => {
        if (message.gameId === gameId) {
          callbacks.onProgress!(message.data);
        }
      });
    }

    if (callbacks.onLog) {
      this.socket.on('game:log', (message: WSMessage) => {
        if (message.gameId === gameId) {
          callbacks.onLog!(message.data);
        }
      });
    }

    if (callbacks.onError) {
      this.socket.on('game:error', (message: WSMessage) => {
        if (message.gameId === gameId) {
          callbacks.onError!(message.data);
        }
      });
    }

    if (callbacks.onCompleted) {
      this.socket.on('game:completed', (message: WSMessage) => {
        if (message.gameId === gameId) {
          callbacks.onCompleted!(message.data);
        }
      });
    }

    if (callbacks.onPreview) {
      this.socket.on('game:preview', (message: WSMessage) => {
        if (message.gameId === gameId) {
          callbacks.onPreview!(message.data);
        }
      });
    }

    console.log(`📡 Подписка на обновления игры ${gameId}`);
  }

  // Отписка от обновлений игры
  public unsubscribeFromGame(gameId: string): void {
    if (!this.socket) return;

    this.socket.emit('unsubscribe:game', gameId);
    
    // Удаляем обработчики событий для этой игры
    this.socket.off('game:progress');
    this.socket.off('game:log');
    this.socket.off('game:error');
    this.socket.off('game:completed');
    this.socket.off('game:preview');

    console.log(`📡 Отписка от обновлений игры ${gameId}`);
  }

  // Подписка на системные сообщения
  public subscribeToSystemMessages(
    onMessage: (message: { type: string; message: string; timestamp: number }) => void
  ): void {
    if (!this.socket) return;

    this.socket.on('system:message', onMessage);
  }

  // Подписка на статус сервера
  public subscribeToServerStatus(
    onStatusChange: (status: { status: string; details?: any; timestamp: number }) => void
  ): void {
    if (!this.socket) return;

    this.socket.on('server:status', onStatusChange);
  }

  // Ping для проверки соединения
  public ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket не подключен'));
        return;
      }

      const startTime = Date.now();
      
      this.socket.emit('ping');
      
      this.socket.once('pong', (data: { timestamp: number }) => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });

      // Таймаут для ping
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }

  // Проверка состояния подключения
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Получение ID подключения
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Принудительное переподключение
  public reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Закрытие соединения
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Обработка событий отключения сервера
  public onServerDisconnect(callback: (reason: string) => void): void {
    if (!this.socket) return;

    this.socket.on('server:disconnect', (data: { reason: string }) => {
      callback(data.reason);
    });
  }

  // Обработка событий отключения сервера
  public onServerShutdown(callback: (reason: string) => void): void {
    if (!this.socket) return;

    this.socket.on('server:shutdown', (data: { reason: string }) => {
      callback(data.reason);
    });
  }

  // Обработка предупреждений о лимитах
  public onRateLimit(callback: (data: { message: string; resetTime: number }) => void): void {
    if (!this.socket) return;

    this.socket.on('rate:limit', callback);
  }
}

// Создаем singleton экземпляр
const wsService = new WebSocketService();

export default wsService; 