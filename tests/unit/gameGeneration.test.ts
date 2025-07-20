import { GameGenerationService } from '../../backend/src/services/gameGeneration';
import { GameConfig } from '../../backend/src/types';

// Моки для AI сервисов
jest.mock('../../backend/src/services/ai/openai', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateGame: jest.fn().mockResolvedValue({
      html: '<html><body><canvas id="game"></canvas></body></html>',
      css: 'body { margin: 0; } canvas { display: block; }',
      js: 'console.log("Game code generated");',
      assets: {
        sounds: { jump: Buffer.from('mock-sound-data') },
        images: { player: 'data:image/png;base64,mock-image-data' }
      }
    }),
    generateGameCode: jest.fn().mockResolvedValue('mock game code'),
    generateSound: jest.fn().mockResolvedValue(Buffer.from('mock-sound')),
    generateImage: jest.fn().mockResolvedValue('data:image/png;base64,mock-image')
  }))
}));

jest.mock('../../backend/src/services/ai/claude', () => ({
  ClaudeService: jest.fn().mockImplementation(() => ({
    generateGame: jest.fn().mockResolvedValue({
      html: '<html><body><div id="game"></div></body></html>',
      css: '.game { width: 800px; height: 600px; }',
      js: 'const game = new Game();'
    }),
    generateGameArchitecture: jest.fn().mockResolvedValue({
      structure: 'game architecture',
      components: ['player', 'enemies', 'level']
    })
  }))
}));

jest.mock('../../backend/src/services/ai/deepseek', () => ({
  DeepSeekService: jest.fn().mockImplementation(() => ({
    generateGame: jest.fn().mockResolvedValue({
      html: '<html><head></head><body><canvas></canvas></body></html>',
      css: 'canvas { border: 1px solid black; }',
      js: 'function startGame() { console.log("Game started"); }'
    }),
    optimizeGameCode: jest.fn().mockResolvedValue('optimized code')
  }))
}));

describe('GameGenerationService', () => {
  let gameGenerationService: GameGenerationService;

  beforeEach(() => {
    gameGenerationService = new GameGenerationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateGame', () => {
    const mockGameConfig: GameConfig = {
      title: 'Test Game',
      description: 'A test game',
      genre: 'platformer',
      difficulty: 'medium',
      aiProvider: 'openai',
      prompt: 'Create a simple platformer game',
      userId: 'test-user-123'
    };

    it('should generate a complete game successfully', async () => {
      const result = await gameGenerationService.generateGame(mockGameConfig);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('metadata');

      expect(result.config).toEqual(mockGameConfig);
      expect(result.files).toHaveProperty('html');
      expect(result.files).toHaveProperty('css');
      expect(result.files).toHaveProperty('js');
    });

    it('should use correct AI provider', async () => {
      const openaiConfig = { ...mockGameConfig, aiProvider: 'openai' as const };
      const claudeConfig = { ...mockGameConfig, aiProvider: 'claude' as const };
      const deepseekConfig = { ...mockGameConfig, aiProvider: 'deepseek' as const };

      await gameGenerationService.generateGame(openaiConfig);
      await gameGenerationService.generateGame(claudeConfig);
      await gameGenerationService.generateGame(deepseekConfig);

      // Проверяем, что сервисы были вызваны
      expect(jest.requireMock('../../backend/src/services/ai/openai').OpenAIService).toHaveBeenCalled();
      expect(jest.requireMock('../../backend/src/services/ai/claude').ClaudeService).toHaveBeenCalled();
      expect(jest.requireMock('../../backend/src/services/ai/deepseek').DeepSeekService).toHaveBeenCalled();
    });

    it('should handle generation errors gracefully', async () => {
      // Мокаем ошибку в OpenAI сервисе
      const mockOpenAI = jest.requireMock('../../backend/src/services/ai/openai').OpenAIService;
      mockOpenAI.mockImplementationOnce(() => ({
        generateGame: jest.fn().mockRejectedValue(new Error('API Error'))
      }));

      await expect(gameGenerationService.generateGame(mockGameConfig)).rejects.toThrow();
    });

    it('should include assets when generated', async () => {
      const result = await gameGenerationService.generateGame(mockGameConfig);

      if (result.assets) {
        expect(result.assets).toBeDefined();
        expect(typeof result.assets).toBe('object');
      }
    });

    it('should set correct metadata', async () => {
      const result = await gameGenerationService.generateGame(mockGameConfig);

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('createdAt');
      expect(result.metadata).toHaveProperty('generator');
      expect(result.metadata).toHaveProperty('version');

      expect(result.metadata.createdAt).toBeInstanceOf(Date);
      expect(result.metadata.generator).toBe('GameIDE');
    });
  });

  describe('optimizeGame', () => {
    const mockGameData = {
      id: 'test-game-123',
      config: {
        title: 'Test Game',
        description: 'A test game',
        genre: 'platformer' as const,
        difficulty: 'medium' as const,
        aiProvider: 'deepseek' as const,
        prompt: 'Create a game',
        userId: 'test-user'
      },
      files: {
        html: '<html><body></body></html>',
        css: 'body { margin: 0; }',
        js: 'console.log("test");'
      },
      metadata: {
        createdAt: new Date(),
        generator: 'GameIDE',
        version: '1.0.0'
      }
    };

    it('should optimize game code', async () => {
      const result = await gameGenerationService.optimizeGame(mockGameData);

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.metadata).toHaveProperty('optimizedAt');
    });

    it('should preserve original game structure', async () => {
      const result = await gameGenerationService.optimizeGame(mockGameData);

      expect(result.id).toBe(mockGameData.id);
      expect(result.config).toEqual(mockGameData.config);
      expect(result.files).toHaveProperty('html');
      expect(result.files).toHaveProperty('css');
      expect(result.files).toHaveProperty('js');
    });
  });

  describe('validateGameData', () => {
    it('should validate correct game data', () => {
      const validGameData = {
        id: 'test-123',
        config: {
          title: 'Valid Game',
          description: 'Valid description',
          genre: 'platformer' as const,
          difficulty: 'easy' as const,
          aiProvider: 'openai' as const,
          prompt: 'Create a game',
          userId: 'user-123'
        },
        files: {
          html: '<html></html>',
          css: 'body {}',
          js: 'console.log("test");'
        },
        metadata: {
          createdAt: new Date(),
          generator: 'GameIDE',
          version: '1.0.0'
        }
      };

      expect(() => {
        gameGenerationService.validateGameData(validGameData);
      }).not.toThrow();
    });

    it('should reject invalid game data', () => {
      const invalidGameData = {
        id: '', // Пустой ID
        config: {
          title: '', // Пустой заголовок
          description: 'Description',
          genre: 'invalid' as any,
          difficulty: 'easy' as const,
          aiProvider: 'openai' as const,
          prompt: 'Create a game',
          userId: 'user-123'
        },
        files: {
          html: '', // Пустой HTML
          css: 'body {}',
          js: ''
        },
        metadata: {
          createdAt: new Date(),
          generator: 'GameIDE',
          version: '1.0.0'
        }
      };

      expect(() => {
        gameGenerationService.validateGameData(invalidGameData);
      }).toThrow();
    });

    it('should validate required fields', () => {
      const incompleteGameData = {
        id: 'test-123',
        config: {
          title: 'Test Game'
          // Отсутствуют обязательные поля
        }
      } as any;

      expect(() => {
        gameGenerationService.validateGameData(incompleteGameData);
      }).toThrow();
    });
  });

  describe('getAIProvider', () => {
    it('should return correct AI service instance', () => {
      const openaiProvider = gameGenerationService.getAIProvider('openai');
      const claudeProvider = gameGenerationService.getAIProvider('claude');
      const deepseekProvider = gameGenerationService.getAIProvider('deepseek');

      expect(openaiProvider).toBeDefined();
      expect(claudeProvider).toBeDefined();
      expect(deepseekProvider).toBeDefined();
    });

    it('should handle invalid provider gracefully', () => {
      expect(() => {
        gameGenerationService.getAIProvider('invalid' as any);
      }).toThrow();
    });
  });

  describe('generateGameId', () => {
    it('should generate unique IDs', () => {
      const id1 = gameGenerationService.generateGameId();
      const id2 = gameGenerationService.generateGameId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate IDs with correct format', () => {
      const id = gameGenerationService.generateGameId();

      // ID должен содержать буквы и цифры
      expect(id).toMatch(/^[a-z0-9-]+$/);
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe('error handling', () => {
    it('should handle AI service failures gracefully', async () => {
      const failingConfig: GameConfig = {
        title: 'Failing Game',
        description: 'This should fail',
        genre: 'platformer',
        difficulty: 'hard',
        aiProvider: 'openai',
        prompt: 'Create a game that fails',
        userId: 'test-user'
      };

      // Мокаем неудачу всех AI сервисов
      const mockOpenAI = jest.requireMock('../../backend/src/services/ai/openai').OpenAIService;
      mockOpenAI.mockImplementationOnce(() => ({
        generateGame: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      await expect(gameGenerationService.generateGame(failingConfig)).rejects.toThrow('Service unavailable');
    });

    it('should provide fallback for partial generation failures', async () => {
      const config: GameConfig = {
        title: 'Partial Fail Game',
        description: 'Some parts fail',
        genre: 'arcade',
        difficulty: 'medium',
        aiProvider: 'openai',
        prompt: 'Create a game with partial failures',
        userId: 'test-user'
      };

      // Мокаем частичную неудачу (HTML генерируется, но не CSS)
      const mockOpenAI = jest.requireMock('../../backend/src/services/ai/openai').OpenAIService;
      mockOpenAI.mockImplementationOnce(() => ({
        generateGame: jest.fn().mockResolvedValue({
          html: '<html><body></body></html>',
          css: null, // CSS не сгенерирован
          js: 'console.log("partial");'
        })
      }));

      const result = await gameGenerationService.generateGame(config);

      expect(result).toBeDefined();
      expect(result.files.html).toBeDefined();
      expect(result.files.js).toBeDefined();
    });
  });
}); 