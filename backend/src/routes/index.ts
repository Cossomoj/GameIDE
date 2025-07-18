import { Application } from 'express';
import gamesRouter from './games';
import statsRouter from './stats';
import queueRouter from './queue';
import config from '@/config';
import { EnvWriter } from '@/utils/envWriter';

export function setupRoutes(app: Application): void {
  // Создаем экземпляр для записи в .env файл
  const envWriter = new EnvWriter();
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected', // TODO: реальная проверка БД
        redis: 'connected'     // TODO: реальная проверка Redis
      }
    });
  });

  // AI Services status endpoint
  app.get('/api/ai/status', async (req, res) => {
    try {
      const aiStatus = {
        deepseek: {
          configured: !!config.ai.deepseek.apiKey,
          status: config.ai.deepseek.apiKey ? 'configured' : 'not_configured',
          model: config.ai.deepseek.model,
          available: false
        },
        openai: {
          configured: !!config.ai.openai.apiKey,
          status: config.ai.openai.apiKey ? 'configured' : 'not_configured',
          model: config.ai.openai.imageModel,
          available: false
        },
        claude: {
          configured: !!config.ai.claude.apiKey,
          status: config.ai.claude.apiKey ? 'configured' : 'not_configured',
          model: config.ai.claude.model,
          available: false
        }
      };

      // Проверяем доступность DeepSeek API
      if (config.ai.deepseek.apiKey) {
        try {
          const response = await fetch(`${config.ai.deepseek.baseURL}/models`, {
            headers: {
              'Authorization': `Bearer ${config.ai.deepseek.apiKey}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            aiStatus.deepseek.status = 'online';
            aiStatus.deepseek.available = true;
          } else {
            aiStatus.deepseek.status = 'error';
          }
        } catch (error) {
          aiStatus.deepseek.status = 'offline';
        }
      }

      // Проверяем доступность OpenAI API
      if (config.ai.openai.apiKey) {
        try {
          const response = await fetch(`${config.ai.openai.baseURL}/models`, {
            headers: {
              'Authorization': `Bearer ${config.ai.openai.apiKey}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            aiStatus.openai.status = 'online';
            aiStatus.openai.available = true;
          } else {
            aiStatus.openai.status = 'error';
          }
        } catch (error) {
          aiStatus.openai.status = 'offline';
        }
      }

      // Проверяем доступность Claude API
      if (config.ai.claude.apiKey) {
        try {
          const response = await fetch(`${config.ai.claude.baseURL}/v1/models`, {
            headers: {
              'x-api-key': config.ai.claude.apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            aiStatus.claude.status = 'online';
            aiStatus.claude.available = true;
          } else {
            aiStatus.claude.status = 'error';
          }
        } catch (error) {
          aiStatus.claude.status = 'offline';
        }
      }

      res.json({
        timestamp: new Date().toISOString(),
        services: aiStatus
      });
    } catch (error) {
      console.error('Ошибка проверки статуса AI сервисов:', error);
      res.status(500).json({
        error: 'Ошибка проверки статуса AI сервисов',
        timestamp: new Date().toISOString()
             });
     }
   });

  // AI Settings endpoint для сохранения настроек
  app.post('/api/ai/settings', async (req, res) => {
    try {
      const { provider, apiKey, model } = req.body;

      if (!provider || !apiKey || !model) {
        return res.status(400).json({
          error: 'Отсутствуют обязательные поля: provider, apiKey, model'
        });
      }

      if (provider !== 'deepseek' && provider !== 'openai' && provider !== 'claude') {
        return res.status(400).json({
          error: 'Неподдерживаемый провайдер AI. Используйте: deepseek, openai или claude'
        });
      }

      // Валидация моделей
      const validModels = {
        deepseek: [
          'deepseek-coder',
          'deepseek-chat',
          'deepseek-reasoner'
        ],
        openai: [
          'dall-e-3',
          'dall-e-2', 
          'gpt-4',
          'gpt-4-turbo',
          'gpt-4o',
          'gpt-3.5-turbo',
          'text-davinci-003'
        ],
        claude: [
          'claude-opus-4-20250514',
          'claude-sonnet-4-20250514', 
          'claude-haiku-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ]
      };

      if (!validModels[provider].includes(model)) {
        return res.status(400).json({
          error: `Неподдерживаемая модель "${model}" для ${provider}`,
          validModels: validModels[provider],
          suggestion: `Используйте одну из поддерживаемых моделей: ${validModels[provider].join(', ')}`
        });
      }

      // Сохраняем в переменные окружения процесса И в файл .env
      if (provider === 'deepseek') {
        // Обновляем переменные окружения
        process.env.DEEPSEEK_API_KEY = apiKey;
        process.env.DEEPSEEK_MODEL = model;
        
        // Сохраняем в файл .env
        await envWriter.updateEnvVariables({
          'DEEPSEEK_API_KEY': apiKey,
          'DEEPSEEK_MODEL': model
        });
        
        // Обновляем конфигурацию
        config.ai.deepseek.apiKey = apiKey;
        config.ai.deepseek.model = model;
        
        console.log(`🔐 DeepSeek API ключ обновлен (модель: ${model})`);
      } else if (provider === 'openai') {
        // Обновляем переменные окружения
        process.env.OPENAI_API_KEY = apiKey;
        process.env.OPENAI_IMAGE_MODEL = model;
        
        // Сохраняем в файл .env
        await envWriter.updateEnvVariables({
          'OPENAI_API_KEY': apiKey,
          'OPENAI_IMAGE_MODEL': model
        });
        
        // Обновляем конфигурацию
        config.ai.openai.apiKey = apiKey;
        config.ai.openai.imageModel = model;
        
        console.log(`🔐 OpenAI API ключ обновлен (модель: ${model})`);
      } else if (provider === 'claude') {
        // Обновляем переменные окружения
        process.env.CLAUDE_API_KEY = apiKey;
        process.env.CLAUDE_MODEL = model;
        
        // Сохраняем в файл .env
        await envWriter.updateEnvVariables({
          'CLAUDE_API_KEY': apiKey,
          'CLAUDE_MODEL': model
        });
        
        // Обновляем конфигурацию
        config.ai.claude.apiKey = apiKey;
        config.ai.claude.model = model;
        
        console.log(`🔐 Claude API ключ обновлен (модель: ${model})`);
      }

      res.json({
        success: true,
        message: `Настройки ${provider} успешно сохранены`,
        provider,
        model,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Ошибка сохранения настроек AI:', error);
      res.status(500).json({
        error: 'Ошибка сохранения настроек AI',
        timestamp: new Date().toISOString()
      });
    }
     });

  // AI Settings GET endpoint для получения текущих настроек
  app.get('/api/ai/settings', async (req, res) => {
    try {
      const settings = {
        deepseek: {
          apiKey: config.ai.deepseek.apiKey || '',
          model: config.ai.deepseek.model || 'deepseek-coder',
          configured: !!config.ai.deepseek.apiKey
        },
        openai: {
          apiKey: config.ai.openai.apiKey || '',
          model: config.ai.openai.imageModel || 'dall-e-3',
          configured: !!config.ai.openai.apiKey
        },
        claude: {
          apiKey: config.ai.claude.apiKey || '',
          model: config.ai.claude.model || 'claude-sonnet-4-20250514',
          configured: !!config.ai.claude.apiKey
        }
      };

      res.json({
        timestamp: new Date().toISOString(),
        settings
      });
    } catch (error) {
      console.error('Ошибка получения настроек AI:', error);
      res.status(500).json({
        error: 'Ошибка получения настроек AI',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API роуты
  app.use('/api/games', gamesRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/queue', queueRouter);
} 