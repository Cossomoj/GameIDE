// Настройка переменных окружения для тестов
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'gameide_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-key';

// Настройка тайм-аутов
jest.setTimeout(10000);

// Глобальные моки для внешних API
global.mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mock response' } }]
      })
    }
  }
};

global.mockClaude = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ text: 'Mock response' }]
    })
  }
};

// Подавляем логи во время тестов
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}; 