import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Загружаем переменные из .env файла в корне
dotenv.config({ path: '/app/.env' });

console.log('🐛 Debug server starting...');

const app = express();
const PORT = 3001;

// Основные middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://frontend:3000'
  ],
  credentials: true
}));
app.use(express.json());

console.log('🐛 Middleware configured');

// Простейшие endpoints
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    debug: true
  });
});

app.get('/api/health', (req, res) => {
  console.log('🏥 API Health check requested');
  res.json({
    status: 'ok',
    debug: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ai/status', (req, res) => {
  console.log('🤖 AI status requested');
  res.json({
    success: true,
    debug: true,
    services: {
      deepseek: { available: !!process.env.DEEPSEEK_API_KEY },
      openai: { available: !!process.env.OPENAI_API_KEY },
      claude: { available: !!process.env.CLAUDE_API_KEY }
    }
  });
});

// Основные игровые endpoints
app.get('/api/games', (req, res) => {
  console.log('🎮 Games list requested');
  res.json({
    success: true,
    debug: true,
    games: [
      {
        id: 'demo-game-1',
        title: 'Demo Platformer',
        genre: 'platformer',
        status: 'completed',
        createdAt: new Date().toISOString()
      }
    ],
    total: 1
  });
});

app.post('/api/games', (req, res) => {
  console.log('🎮 Game creation requested:', req.body);
  const gameId = 'game-' + Date.now();
  res.json({
    success: true,
    debug: true,
    id: gameId,
    status: 'queued',
    message: 'Игра добавлена в очередь генерации'
  });
});

// Queue endpoints
app.get('/api/queue/status', (req, res) => {
  console.log('📋 Queue status requested');
  res.json({
    success: true,
    debug: true,
    waiting: 0,
    active: 0,
    completed: 1,
    failed: 0
  });
});

// Stats endpoints
app.get('/api/stats', (req, res) => {
  console.log('📊 Stats requested');
  res.json({
    success: true,
    debug: true,
    stats: {
      totalGames: 1,
      totalUsers: 1,
      systemUptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
});

// WebSocket test endpoint
app.get('/api/websocket/test', (req, res) => {
  console.log('🔌 WebSocket test requested');
  const connectedClients = io.engine.clientsCount;
  res.json({
    success: true,
    debug: true,
    websocket: {
      status: 'running',
      connectedClients,
      path: '/ws'
    }
  });
});

// AI Config endpoints
app.get('/api/ai/config', (req, res) => {
  console.log('⚙️ AI config requested');
  res.json({
    success: true,
    debug: true,
    config: {
      deepseek: {
        configured: !!process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-coder'
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        model: 'dall-e-3'
      },
      claude: {
        configured: !!process.env.CLAUDE_API_KEY,
        model: 'claude-3-5-sonnet'
      }
    }
  });
});

console.log('🐛 Routes configured');

// Создание HTTP сервера и WebSocket
const server = createServer(app);
const io = new SocketIOServer(server, {
  path: '/ws',
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Простейшая WebSocket логика
io.on('connection', (socket) => {
  console.log('🔌 WebSocket подключение:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket отключение:', socket.id);
  });
  
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

console.log('🔌 WebSocket configured');

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Debug server запущен на http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🤖 AI status: http://0.0.0.0:${PORT}/api/ai/status`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Debug server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Debug server stopped');
    process.exit(0);
  });
}); 