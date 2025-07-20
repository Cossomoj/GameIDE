import { Application } from 'express';
import gamesRouter from './games';
import statsRouter from './stats';
import queueRouter from './queue';
import localizationRouter from './localization';
import monetizationRouter from './monetization';
import achievementsRouter from './achievements';
import leaderboardsRouter from './leaderboards';
import analyticsRouter from './analytics';
import performanceRouter from './performance';
import socialRouter from './social';
import cloudSaveRouter from './cloudSave';
import config from '@/config';
import { EnvWriter } from '@/utils/envWriter';
import { Router } from 'express';
import gameRoutes from './games';
import interactiveRoutes from './interactive';
import queueRoutes from './queue';
import analyticsRoutes from './analytics';
import leaderboardsRoutes from './leaderboards';
import achievementsRoutes from './achievements';
import socialRoutes from './social';
import localizationRoutes from './localization';
import monetizationRoutes from './monetization';
import performanceRoutes from './performance';
import cloudSaveRoutes from './cloudSave';
import tournamentsRoutes from './tournaments';
import testingRoutes from './testing';
import multiLanguageRoutes from './multiLanguage';
import advancedAnalyticsRoutes from './advancedAnalytics';
import gameStoreRoutes from './gameStore';
import securityRoutes from './security';
import pluginRoutes from './plugins';
import advancedTemplatesRoutes from './advancedTemplates';
import assetsRoutes from './assets';
import gameSizeRoutes from './gameSize';
import advancedLocalizationRoutes from './advancedLocalization';
import gameValidationRoutes from './gameValidation';
import enhancedAssetsRoutes from './enhancedAssets';
import abTestingRoutes from './abTesting';
import enhancedLocalizationRoutes from './enhancedLocalization';
import cohortAnalyticsRoutes from './cohortAnalytics';
import assetRegenerationRoutes from './assetRegeneration';
import qualityMonitoringRoutes from './qualityMonitoring';
import regressionTestingRoutes from './regressionTesting';
import visualGameEditorRoutes from './visualGameEditor';
import enhancedCustomizationRoutes from './enhancedCustomization';
import healthMonitoringRoutes from './healthMonitoring';
import deviceTestingRoutes from './deviceTesting';
import { LoggerService } from '@/services/logger';

const logger = new LoggerService();
const router = Router();
const envWriter = new EnvWriter();

export function setupRoutes(app: Application): void {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // AI status endpoint (для фронтенда)
  app.get('/api/ai/status', async (req, res) => {
    try {
      const aiStatus = {
        deepseek: { 
          available: !!config.ai.deepseek.apiKey, 
          model: config.ai.deepseek.model || 'deepseek-coder'
        },
        openai: { 
          available: !!config.ai.openai.apiKey, 
          model: config.ai.openai.imageModel || 'dall-e-3'
        },
        claude: { 
          available: !!config.ai.claude.apiKey, 
          model: config.ai.claude.model || 'claude-3-5-sonnet-20241022'
        }
      };

      res.json({
        success: true,
        status: 'operational',
        ai: aiStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Ошибка проверки статуса AI сервисов', { error });
      res.status(500).json({ 
        success: false,
        status: 'error', 
        error: error.message 
      });
    }
  });

  // API status with enhanced checks  
  app.get('/api/status', async (req, res) => {
    try {
      const aiStatus = {
        deepseek: { available: false, model: config.ai.deepseek.model },
        openai: { available: false, model: config.ai.openai.imageModel },
        claude: { available: false, model: config.ai.claude.model }
      };

      // Check AI services availability
      if (config.ai.deepseek.apiKey) {
        aiStatus.deepseek.available = true;
      }

      if (config.ai.openai.apiKey) {
        aiStatus.openai.available = true;
      }

      if (config.ai.claude.apiKey) {
        aiStatus.claude.available = true;
      }

      res.json({
        status: 'operational',
        ai: aiStatus,
        database: 'connected', // TODO: реальная проверка БД
        redis: 'connected'     // TODO: реальная проверка Redis
      });
    } catch (error) {
      logger.error('Ошибка проверки статуса AI сервисов', { error });
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // Enhanced AI configuration endpoints with validation
  app.post('/api/ai/configure', async (req, res) => {
    try {
      const { provider, apiKey, model } = req.body;

      if (!provider || !apiKey) {
        return res.status(400).json({
          error: 'Провайдер и API ключ обязательны',
          required: ['provider', 'apiKey'],
          optional: ['model']
        });
      }

      const supportedProviders = ['deepseek', 'openai', 'claude'];
      if (!supportedProviders.includes(provider)) {
        return res.status(400).json({
          error: `Неподдерживаемый провайдер: ${provider}`,
          supported: supportedProviders,
          suggestion: 'Используйте один из поддерживаемых провайдеров'
        });
      }

      // Enhanced model validation with more complete lists
      const validModels = {
        deepseek: [
          'deepseek-coder',
          'deepseek-chat',
          'deepseek-reasoner',
          'deepseek-v2.5'
        ],
        openai: [
          'dall-e-3',
          'dall-e-2',
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
        
        logger.info(`🔐 DeepSeek API ключ обновлен (модель: ${model})`);
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
        
        logger.info(`🔐 OpenAI API ключ обновлен (модель: ${model})`);
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
        
        logger.info(`🔐 Claude API ключ обновлен (модель: ${model})`);
      }

      res.json({
        success: true,
        message: `${provider} настроен успешно`,
        model,
        provider
      });
    } catch (error) {
      logger.error('Ошибка сохранения настроек AI', { error });
      res.status(500).json({
        error: 'Не удалось сохранить настройки',
        details: error.message
      });
    }
  });

  // Get current AI configuration
  app.get('/api/ai/config', async (req, res) => {
    try {
      const aiConfig = {
        deepseek: {
          configured: !!config.ai.deepseek.apiKey,
          model: config.ai.deepseek.model,
          keyMask: config.ai.deepseek.apiKey ? 
            config.ai.deepseek.apiKey.substring(0, 8) + '...' : null
        },
        openai: {
          configured: !!config.ai.openai.apiKey,
          model: config.ai.openai.imageModel,
          keyMask: config.ai.openai.apiKey ? 
            config.ai.openai.apiKey.substring(0, 8) + '...' : null
        },
        claude: {
          configured: !!config.ai.claude.apiKey,
          model: config.ai.claude.model,
          keyMask: config.ai.claude.apiKey ? 
            config.ai.claude.apiKey.substring(0, 8) + '...' : null
        }
      };

      res.json({
        success: true,
        config: aiConfig,
        recommendations: {
          deepseek: 'Рекомендуется для генерации кода игр',
          openai: 'Рекомендуется для генерации графики',
          claude: 'Альтернатива для генерации кода'
        }
      });
    } catch (error) {
      logger.error('Ошибка получения настроек AI', { error });
      res.status(500).json({
        error: 'Не удалось получить настройки AI',
        details: error.message
      });
    }
  });

  // Enhanced model validation endpoint
  app.post('/api/ai/validate-model', async (req, res) => {
    try {
      const { provider, model } = req.body;

      const validModels = {
        deepseek: [
          'deepseek-coder',
          'deepseek-chat',
          'deepseek-reasoner',
          'deepseek-v2.5'
        ],
        openai: [
          'dall-e-3',
          'dall-e-2',
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

      const isValid = validModels[provider]?.includes(model);

      res.json({
        valid: isValid,
        model,
        provider,
        availableModels: validModels[provider] || [],
        suggestion: isValid ? null : `Попробуйте одну из: ${(validModels[provider] || []).join(', ')}`
      });
    } catch (error) {
      logger.error('Ошибка валидации модели', { error });
      res.status(500).json({
        error: 'Ошибка валидации модели',
        details: error.message
      });
    }
  });

  // Load available AI models
  app.get('/api/ai/models', async (req, res) => {
    try {
      logger.info('📥 Загрузка списков моделей AI...');

      const models = {
        deepseek: [
          { id: 'deepseek-coder', name: 'DeepSeek Coder', type: 'code' },
          { id: 'deepseek-chat', name: 'DeepSeek Chat', type: 'chat' },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', type: 'reasoning' },
          { id: 'deepseek-v2.5', name: 'DeepSeek V2.5', type: 'general' }
        ],
        openai: [
          { id: 'dall-e-3', name: 'DALL-E 3', type: 'image' },
          { id: 'dall-e-2', name: 'DALL-E 2', type: 'image' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', type: 'code' },
          { id: 'gpt-4o', name: 'GPT-4o', type: 'multimodal' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', type: 'chat' }
        ],
        claude: [
          { id: 'claude-opus-4-20250514', name: 'Claude 3 Opus', type: 'advanced' },
          { id: 'claude-sonnet-4-20250514', name: 'Claude 3 Sonnet', type: 'balanced' },
          { id: 'claude-haiku-4-20250514', name: 'Claude 3 Haiku', type: 'fast' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', type: 'latest' }
        ]
      };

      res.json({
        success: true,
        models,
        lastUpdated: new Date().toISOString(),
        count: {
          deepseek: models.deepseek.length,
          openai: models.openai.length,
          claude: models.claude.length
        }
      });
    } catch (error) {
      logger.error('Ошибка загрузки моделей', { error });
      res.status(500).json({
        error: 'Не удалось загрузить список моделей',
        details: error.message
      });
    }
  });

  // Роуты подключены ниже через app.use

  // API роуты
  app.use('/api/games', gamesRouter);
  app.use('/api/interactive', interactiveRoutes);
  app.use('/api/stats', statsRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/localization', localizationRouter);
  app.use('/api/monetization', monetizationRouter);
  app.use('/api/achievements', achievementsRouter);
  app.use('/api/leaderboards', leaderboardsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/performance', performanceRouter);
  app.use('/api/social', socialRouter);
  app.use('/api/cloud-save', cloudSaveRouter);
  app.use('/api/tournaments', tournamentsRoutes);
  app.use('/api/testing', testingRoutes);
  app.use('/api/multi-language', multiLanguageRoutes);
  app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
  app.use('/api/game-store', gameStoreRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/enhanced-assets', enhancedAssetsRoutes);
  app.use('/api/ab-testing', abTestingRoutes);
  app.use('/api/enhanced-localization', enhancedLocalizationRoutes);
  app.use('/api/cohort-analytics', cohortAnalyticsRoutes);
  app.use('/api/asset-regeneration', assetRegenerationRoutes);
  app.use('/api/quality-monitoring', qualityMonitoringRoutes);
  app.use('/api/regression-testing', regressionTestingRoutes);
  app.use('/api/visual-editor', visualGameEditorRoutes);
  app.use('/api/customization', enhancedCustomizationRoutes);
  app.use('/api/game-size', gameSizeRoutes);
  app.use('/api/advanced-localization', advancedLocalizationRoutes);
  app.use('/api/validation', gameValidationRoutes);
  app.use('/api/health-monitoring', healthMonitoringRoutes);
  app.use('/api/device-testing', deviceTestingRoutes);
}

export default router; 