import { useEffect, useRef, useState } from 'react';
import wsService from '@/services/websocket';
import { ProgressData, LogData, ErrorData, CompletedData } from '@/types';

// Hook для отслеживания статуса WebSocket соединения
export const useWebSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(wsService.isConnected());
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsService.isConnected());
    };

    // Проверяем соединение каждые 5 секунд
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  // Функция для ping
  const ping = async () => {
    try {
      const pingLatency = await wsService.ping();
      setLatency(pingLatency);
      return pingLatency;
    } catch (error) {
      console.error('Ping failed:', error);
      setLatency(null);
      return null;
    }
  };

  // Переподключение
  const reconnect = () => {
    wsService.reconnect();
  };

  return {
    isConnected,
    latency,
    ping,
    reconnect,
    socketId: wsService.getSocketId(),
  };
};

// Hook для отслеживания генерации игры
export const useGameGeneration = (gameId: string | null) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [error, setError] = useState<ErrorData | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const gameIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameId || gameId === gameIdRef.current) return;

    // Сбрасываем состояние для новой игры
    setProgress(null);
    setLogs([]);
    setError(null);
    setIsCompleted(false);
    setPreview(null);

    gameIdRef.current = gameId;

    // Подписываемся на события
    wsService.subscribeToGame(gameId, {
      onProgress: (data: ProgressData) => {
        setProgress(data);
        
        // Добавляем логи из progress если есть
        if (data.logs && data.logs.length > 0) {
          const progressLogs: LogData[] = data.logs.map(log => ({
            level: 'info' as const,
            message: log,
            timestamp: data.timestamp,
          }));
          setLogs(prev => [...prev, ...progressLogs]);
        }
      },

      onLog: (data: LogData) => {
        setLogs(prev => [...prev, data]);
      },

      onError: (data: ErrorData) => {
        setError(data);
        
        // Добавляем ошибку в логи
        setLogs(prev => [...prev, {
          level: 'error',
          message: data.error,
          timestamp: data.timestamp,
        }]);
      },

      onCompleted: (data: CompletedData) => {
        setIsCompleted(true);
        setProgress(prev => prev ? { ...prev, progress: 100 } : null);
        
        // Добавляем сообщение о завершении
        setLogs(prev => [...prev, {
          level: 'info',
          message: 'Генерация игры завершена!',
          timestamp: data.timestamp,
        }]);
      },

      onPreview: (data: any) => {
        setPreview(data);
      },
    });

    return () => {
      if (gameIdRef.current) {
        wsService.unsubscribeFromGame(gameIdRef.current);
      }
    };
  }, [gameId]);

  // Очистка состояния
  const clearState = () => {
    setProgress(null);
    setLogs([]);
    setError(null);
    setIsCompleted(false);
    setPreview(null);
  };

  return {
    progress,
    logs,
    error,
    isCompleted,
    preview,
    clearState,
  };
};

// Hook для системных сообщений
export const useSystemMessages = () => {
  const [messages, setMessages] = useState<Array<{
    type: string;
    message: string;
    timestamp: number;
  }>>([]);

  useEffect(() => {
    wsService.subscribeToSystemMessages((message) => {
      setMessages(prev => [...prev, message].slice(-100)); // Храним последние 100 сообщений
    });
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    clearMessages,
  };
};

// Hook для статуса сервера
export const useServerStatus = () => {
  const [status, setStatus] = useState<{
    status: string;
    details?: any;
    timestamp: number;
  } | null>(null);

  const [isServerDown, setIsServerDown] = useState(false);

  useEffect(() => {
    wsService.subscribeToServerStatus((statusData) => {
      setStatus(statusData);
      setIsServerDown(statusData.status === 'down' || statusData.status === 'maintenance');
    });

    wsService.onServerDisconnect((reason) => {
      setIsServerDown(true);
      setStatus({
        status: 'disconnected',
        details: { reason },
        timestamp: Date.now(),
      });
    });

    wsService.onServerShutdown((reason) => {
      setIsServerDown(true);
      setStatus({
        status: 'shutdown',
        details: { reason },
        timestamp: Date.now(),
      });
    });
  }, []);

  return {
    status,
    isServerDown,
  };
};

// Hook для отслеживания rate limits
export const useRateLimit = () => {
  const [rateLimitWarning, setRateLimitWarning] = useState<{
    message: string;
    resetTime: number;
  } | null>(null);

  useEffect(() => {
    wsService.onRateLimit((data) => {
      setRateLimitWarning(data);
      
      // Автоматически убираем предупреждение через 10 секунд
      setTimeout(() => {
        setRateLimitWarning(null);
      }, 10000);
    });
  }, []);

  const clearRateLimitWarning = () => {
    setRateLimitWarning(null);
  };

  return {
    rateLimitWarning,
    clearRateLimitWarning,
  };
};

// Главный hook для WebSocket (alias для обратной совместимости)
export const useWebSocket = () => {
  const connection = useWebSocketConnection();
  
  return {
    ...connection,
    socket: wsService.getSocket(), // Добавляем socket из сервиса
  };
}; 