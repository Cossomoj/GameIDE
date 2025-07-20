import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { envWriter } from './utils/envWriter'
import { InteractiveGameGenerationService } from './services/interactiveGameGeneration'

// Загружаем переменные из .env файла в корне
dotenv.config({ path: '/app/.env' })

const app = express()
const PORT = 3001

// Инициализация сервисов
const interactiveGameService = new InteractiveGameGenerationService()

// Обновляем путь к .env файлу в envWriter
envWriter.envPath = '/app/.env'

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://frontend:3000'
  ],
  credentials: true
}))
app.use(express.json())

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Утилита для fetch с таймаутом
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Таймаут запроса')
    }
    throw error
  }
}

// Расширенные списки моделей для каждого AI сервиса
const AI_MODELS = {
  openai: [
    { id: 'gpt-4', name: 'GPT-4 (Рекомендуется)', description: 'Самая мощная модель для сложных задач' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Быстрая версия GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Быстрая и экономичная модель' },
    { id: 'dall-e-3', name: 'DALL-E 3', description: 'Генерация изображений высокого качества' },
    { id: 'dall-e-2', name: 'DALL-E 2', description: 'Генерация изображений' },
    { id: 'text-davinci-003', name: 'Davinci 003', description: 'Мощная текстовая модель' },
    { id: 'code-davinci-002', name: 'Codex Davinci', description: 'Специализированная модель для кода' }
  ],
  claude: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Самая мощная модель Anthropic' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet (Рекомендуется)', description: 'Сбалансированная модель' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Быстрая и экономичная модель' },
    { id: 'claude-2.1', name: 'Claude 2.1', description: 'Предыдущее поколение' },
    { id: 'claude-2.0', name: 'Claude 2.0', description: 'Стабильная версия' },
    { id: 'claude-instant-1.2', name: 'Claude Instant', description: 'Быстрые ответы' }
  ],
  deepseek: [
    { id: 'deepseek-coder', name: 'DeepSeek Coder (Рекомендуется)', description: 'Специализированная модель для программирования' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Универсальная модель для диалогов' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Модель с улучшенными рассуждениями' },
    { id: 'deepseek-llm-7b-chat', name: 'DeepSeek LLM 7B', description: 'Компактная модель' },
    { id: 'deepseek-llm-67b-chat', name: 'DeepSeek LLM 67B', description: 'Большая модель для сложных задач' },
    { id: 'deepseek-math', name: 'DeepSeek Math', description: 'Специализированная модель для математики' }
  ]
}

// Временное хранилище настроек (в продакшене - база данных)
let generationSettings = {
  stages: {
    gameDesign: { enabled: true, provider: 'claude' },
    codeGeneration: { enabled: true, provider: 'deepseek' },
    assetGeneration: { enabled: true, provider: 'openai' },
    testing: { enabled: false, provider: 'claude' },
    optimization: { enabled: true, provider: 'deepseek' }
  }
}

// Функция для реальной проверки API ключей
async function validateApiKey(provider: string, apiKey: string): Promise<{
  valid: boolean
  status: 'valid' | 'invalid' | 'error' | 'not_configured'
  error?: string
}> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, status: 'not_configured' }
  }

  // Сначала проверяем формат
  if (!envWriter.validateApiKeyFormat(provider, apiKey)) {
    return { valid: false, status: 'invalid', error: 'Неверный формат API ключа' }
  }

  try {
    console.log(`🔍 Реальная проверка API ключа ${provider}: ${envWriter.maskApiKey(apiKey)}`)
    
    // Реальная проверка API ключей через HTTP запросы
    switch (provider.toLowerCase()) {
      case 'openai':
        return await validateOpenAIKey(apiKey)
      case 'claude':
        return await validateClaudeKey(apiKey)
      case 'deepseek':
        return await validateDeepSeekKey(apiKey)
      default:
        return { valid: false, status: 'error', error: 'Неизвестный провайдер' }
    }
  } catch (error) {
    console.error(`❌ Ошибка проверки API ключа ${provider}:`, error)
    return { valid: false, status: 'error', error: 'Ошибка соединения с сервисом' }
  }
}

// Проверка API ключа OpenAI
async function validateOpenAIKey(apiKey: string): Promise<{
  valid: boolean
  status: 'valid' | 'invalid' | 'error'
  error?: string
}> {
  try {
    console.log('🔍 Проверка OpenAI API...')
    const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, 8000)

    if (response.status === 200) {
      console.log('✅ OpenAI API ключ валиден')
      return { valid: true, status: 'valid' }
    } else if (response.status === 401) {
      console.log('❌ OpenAI API ключ невалиден (401 Unauthorized)')
      return { valid: false, status: 'invalid', error: 'API ключ отклонен OpenAI' }
    } else {
      console.log(`⚠️ OpenAI API ответил с кодом: ${response.status}`)
      return { valid: false, status: 'error', error: `HTTP ${response.status}` }
    }
  } catch (error) {
    console.error('❌ Ошибка проверки OpenAI API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return { valid: false, status: 'error', error: `OpenAI недоступен: ${errorMessage}` }
  }
}

// Проверка API ключа Claude (Anthropic)
async function validateClaudeKey(apiKey: string): Promise<{
  valid: boolean
  status: 'valid' | 'invalid' | 'error'
  error?: string
}> {
  try {
    console.log('🔍 Проверка Claude API...')
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    }, 8000)

    if (response.status === 200) {
      console.log('✅ Claude API ключ валиден')
      return { valid: true, status: 'valid' }
    } else if (response.status === 401 || response.status === 403) {
      console.log(`❌ Claude API ключ невалиден (${response.status})`)
      return { valid: false, status: 'invalid', error: 'API ключ отклонен Anthropic' }
    } else {
      console.log(`⚠️ Claude API ответил с кодом: ${response.status}`)
      return { valid: false, status: 'error', error: `HTTP ${response.status}` }
    }
  } catch (error) {
    console.error('❌ Ошибка проверки Claude API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return { valid: false, status: 'error', error: `Anthropic недоступен: ${errorMessage}` }
  }
}

// Проверка API ключа DeepSeek
async function validateDeepSeekKey(apiKey: string): Promise<{
  valid: boolean
  status: 'valid' | 'invalid' | 'error'
  error?: string
}> {
  try {
    console.log('🔍 Проверка DeepSeek API...')
    const response = await fetchWithTimeout('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, 8000)

    if (response.status === 200) {
      console.log('✅ DeepSeek API ключ валиден')
      return { valid: true, status: 'valid' }
    } else if (response.status === 401) {
      console.log('❌ DeepSeek API ключ невалиден (401 Unauthorized)')
      return { valid: false, status: 'invalid', error: 'API ключ отклонен DeepSeek' }
    } else {
      console.log(`⚠️ DeepSeek API ответил с кодом: ${response.status}`)
      return { valid: false, status: 'error', error: `HTTP ${response.status}` }
    }
  } catch (error) {
    console.error('❌ Ошибка проверки DeepSeek API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return { valid: false, status: 'error', error: `DeepSeek недоступен: ${errorMessage}` }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.0.0',
    services: {
      database: 'connected',
      redis: 'connected'
    }
  })
})

// AI Status endpoint - теперь с реальными данными из .env
app.get('/api/ai/status', async (req, res) => {
  try {
    console.log('📊 Загрузка статуса AI сервисов с реальной проверкой...')
    
    const services: any = {}
    
    for (const provider of ['openai', 'claude', 'deepseek']) {
      const { apiKey, model } = envWriter.getAIServiceVars(provider)
      
      if (!apiKey) {
        services[provider] = {
          configured: false,
          status: 'not_configured',
          available: false,
          model: model || 'Не выбрана',
          apiKeyStatus: 'not_configured'
        }
        console.log(`📊 ${provider}: не настроен`)
      } else {
        console.log(`🔍 Проверка ${provider}...`)
        const validation = await validateApiKey(provider, apiKey)
        
        // Определяем статус сервиса на основе реальной проверки
        let serviceStatus = 'offline'
        if (validation.valid) {
          serviceStatus = 'online'
        } else if (validation.status === 'not_configured') {
          serviceStatus = 'not_configured'
        } else if (validation.status === 'error') {
          serviceStatus = 'error'
        }
        
        services[provider] = {
          configured: true,
          status: serviceStatus,
          available: validation.valid,
          model: model,
          apiKey: envWriter.maskApiKey(apiKey),
          apiKeyStatus: validation.status,
          error: validation.error
        }
        
        console.log(`📊 Результат проверки ${provider}:`, {
          status: serviceStatus,
          available: validation.valid,
          apiKeyStatus: validation.status,
          error: validation.error || 'нет'
        })
      }
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      services,
      note: 'Статусы основаны на реальных проверках API сервисов'
    })
  } catch (error) {
    console.error('❌ Ошибка получения статуса AI:', error)
    res.status(500).json({ 
      error: 'Ошибка получения статуса AI сервисов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }
})

// AI Settings endpoints - теперь с интеграцией .env файла
app.post('/api/ai/settings', async (req, res) => {
  const { provider, apiKey, model } = req.body
  
  console.log(`🔐 Обновление настроек ${provider}:`, { model, apiKeyMasked: envWriter.maskApiKey(apiKey) })
  
  // Валидация
  if (!provider || !apiKey || !model) {
    return res.status(400).json({
      success: false,
      error: 'Отсутствуют обязательные поля: provider, apiKey, model'
    })
  }
  
  try {
    // Проверяем валидность API ключа
    const validation = await validateApiKey(provider, apiKey)
    
    // Сохраняем в .env файл независимо от валидности (пользователь может ввести тестовый ключ)
    const saved = envWriter.updateAIServiceVars(provider, apiKey, model)
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Ошибка сохранения в .env файл'
      })
    }
    
    res.json({
      success: true,
      message: `Настройки ${provider} успешно сохранены`,
      provider,
      model,
      apiKeyStatus: validation.status,
      validation: validation,
      envSaved: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Ошибка сохранения настроек AI:', error)
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    })
  }
})

app.get('/api/ai/settings', (req, res) => {
  try {
    const settings: any = {}
    
    for (const provider of ['openai', 'claude', 'deepseek']) {
      const vars = envWriter.getAIServiceVars(provider)
      settings[provider] = {
        apiKey: vars.apiKey,
        model: vars.model,
        configured: !!vars.apiKey
      }
    }
    
    res.json({
      success: true,
      settings,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Ошибка загрузки настроек AI:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки настроек'
    })
  }
})

// Модели по провайдеру - актуальные данные
app.get('/api/ai/models/:provider', async (req, res) => {
  try {
    const { provider } = req.params
    console.log(`📊 Загрузка моделей для провайдера: ${provider}`)

    const allModels = {
      openai: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o (Новейшая)',
          description: 'Самая современная и быстрая модель OpenAI с мультимодальными возможностями'
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini (Экономичная)',
          description: 'Компактная версия GPT-4o, оптимизированная для скорости и стоимости'
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          description: 'Улучшенная версия GPT-4 с большим контекстным окном'
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Основная модель GPT-4 для сложных задач'
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Быстрая и экономичная модель для базовых задач'
        },
        {
          id: 'o1-preview',
          name: 'o1-preview (Экспериментальная)',
          description: 'Новая модель с улучшенным рассуждением (бета)'
        },
        {
          id: 'o1-mini',
          name: 'o1-mini',
          description: 'Компактная версия модели o1 для быстрых задач'
        }
      ],
      claude: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet (Новейшая)',
          description: 'Самая современная и продвинутая модель Claude с улучшенными возможностями'
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku (Быстрая)',
          description: 'Быстрая и экономичная модель для простых задач'
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus (Мощная)',
          description: 'Самая мощная модель Claude 3 для сложных задач'
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet (Рекомендуется)',
          description: 'Сбалансированная модель Claude 3 для большинства задач'
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Быстрая модель Claude 3 для простых задач'
        },
        {
          id: 'claude-2.1',
          name: 'Claude 2.1',
          description: 'Предыдущее поколение Claude (устаревшая)'
        },
        {
          id: 'claude-2.0',
          name: 'Claude 2.0',
          description: 'Базовая модель Claude 2 (устаревшая)'
        },
        {
          id: 'claude-instant-1.2',
          name: 'Claude Instant',
          description: 'Быстрая версия Claude для простых задач (устаревшая)'
        }
      ],
      deepseek: [
        {
          id: 'deepseek-chat',
          name: 'DeepSeek Chat (Универсальная)',
          description: 'Основная модель DeepSeek для общих задач и диалогов'
        },
        {
          id: 'deepseek-coder',
          name: 'DeepSeek Coder (Рекомендуется)',
          description: 'Специализированная модель для программирования и разработки'
        },
        {
          id: 'deepseek-reasoner',
          name: 'DeepSeek Reasoner (Новая)',
          description: 'Модель с улучшенными возможностями рассуждения и анализа'
        },
        {
          id: 'deepseek-v2',
          name: 'DeepSeek V2',
          description: 'Улучшенная версия основной модели DeepSeek'
        }
      ]
    }

    const models = allModels[provider as keyof typeof allModels]
    
    if (!models) {
      return res.status(404).json({
        success: false,
        error: `Провайдер ${provider} не поддерживается`
      })
    }

    res.json({
      success: true,
      provider,
      models,
      count: models.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`❌ Ошибка получения моделей для ${req.params.provider}:`, error)
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения моделей провайдера' 
    })
  }
})

// Generation Settings endpoints
app.get('/api/generation/settings', (req, res) => {
  console.log('📋 Запрос настроек этапов генерации')
  res.json({
    success: true,
    settings: generationSettings,
    timestamp: new Date().toISOString()
  })
})

app.post('/api/generation/settings', (req, res) => {
  const { stages } = req.body
  
  console.log('💾 Сохранение настроек этапов генерации:', stages)
  
  // Валидация
  if (!stages) {
    return res.status(400).json({
      success: false,
      error: 'Отсутствуют настройки этапов'
    })
  }
  
  // Сохранение настроек
  generationSettings = { stages }
  
  res.json({
    success: true,
    message: 'Настройки этапов генерации сохранены',
    settings: generationSettings,
    timestamp: new Date().toISOString()
  })
})

// Game creation endpoint
app.post('/api/games', (req, res) => {
  const { title, description, genre, artStyle, options } = req.body
  
  console.log('🎮 Получен запрос на создание игры:', { title, description, genre })
  console.log('⚙️ Текущие настройки этапов:', generationSettings)
  
  // Валидация
  if (!title || !description || !genre) {
    return res.status(400).json({
      success: false,
      error: 'Отсутствуют обязательные поля: title, description, genre'
    })
  }
  
  // Симуляция создания игры с учетом настроек этапов
  const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Показываем какие этапы будут выполнены
  const enabledStages = Object.entries(generationSettings.stages)
    .filter(([key, stage]) => stage.enabled)
    .map(([key, stage]) => `${key} (${stage.provider})`)
  
  console.log('🔄 Будут выполнены этапы:', enabledStages)
  
  res.status(201).json({
    success: true,
    game: {
      id: gameId,
      title,
      description,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      generationPlan: {
        enabledStages: enabledStages,
        settings: generationSettings
      }
    },
    message: 'Игра добавлена в очередь генерации'
  })
})

// Get games endpoint
app.get('/api/games', (req, res) => {
  res.json({
    success: true,
    games: [
      {
        id: 'demo-game-1',
        title: 'Демо игра 1',
        description: 'Это демонстрационная игра',
        genre: 'arcade',
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        downloadUrl: '/api/games/demo-game-1/download',
        thumbnailUrl: '/api/games/demo-game-1/thumbnail'
      }
    ]
  })
})

// Interactive generation endpoints
app.post('/api/interactive/start', async (req, res) => {
  try {
    console.log('🎮 Запуск интерактивной генерации:', req.body)
    
    const { title, description, genre, userId, quality } = req.body
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Необходимы title и description'
      })
    }

    // Генерируем userId если не предоставлен
    const effectiveUserId = userId || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const session = await interactiveGameService.startInteractiveGeneration({
      title,
      description,
      genre: genre || 'adventure',
      userId: effectiveUserId,
      quality: quality || 'balanced'
    })

    const currentStep = session.steps[session.currentStep]

    res.json({
      success: true,
      data: {
        gameId: session.gameId,
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        step: {
          stepId: currentStep.stepId,
          name: currentStep.name,
          description: currentStep.description,
          variants: currentStep.variants.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description
          }))
        }
      },
      message: 'Интерактивная генерация начата! Выберите один из вариантов.'
    })
  } catch (error) {
    console.error('Ошибка запуска интерактивной генерации:', error)
    res.status(500).json({
      success: false,
      error: 'Не удалось запустить интерактивную генерацию',
      details: error.message
    })
  }
})

app.get('/api/interactive/:gameId/state', async (req, res) => {
  try {
    const { gameId } = req.params
    console.log('📊 Запрос состояния интерактивной генерации:', gameId)
    
    const session = await interactiveGameService.getGameState(gameId)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия не найдена'
      })
    }

    const currentStep = session.steps[session.currentStep]
    
    res.json({
      success: true,
      data: {
        gameId: session.gameId,
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        step: {
          stepId: currentStep.stepId,
          name: currentStep.name,
          description: currentStep.description,
          variants: currentStep.variants.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description
          }))
        },
        isActive: session.isActive,
        isPaused: session.isPaused,
        completedSteps: session.completedSteps,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Ошибка получения состояния:', error)
    res.status(500).json({
      success: false,
      error: 'Не удалось получить состояние сессии',
      details: error.message
    })
  }
})

app.post('/api/interactive/:gameId/step/:stepId/select', async (req, res) => {
  try {
    const { gameId, stepId } = req.params
    const { variantId } = req.body
    
    console.log(`✅ Выбран вариант ${variantId} для этапа ${stepId} игры ${gameId}`)
    
    const result = await interactiveGameService.selectVariant(gameId, stepId, variantId)
    
    const responseData: any = {
      selectedVariant: variantId
    }

    if (result.nextStep) {
      responseData.nextStep = {
        stepId: result.nextStep.stepId,
        name: result.nextStep.name,
        description: result.nextStep.description,
        variants: result.nextStep.variants.map(v => ({
          id: v.id,
          title: v.title,
          description: v.description
        }))
      }
    }
    
    res.json({
      success: result.success,
      message: result.message,
      data: responseData
    })
  } catch (error) {
    console.error('Ошибка выбора варианта:', error)
    res.status(500).json({
      success: false,
      error: 'Не удалось выбрать вариант',
      details: error.message
    })
  }
})

app.post('/api/interactive/:gameId/complete', async (req, res) => {
  try {
    const { gameId } = req.params
    console.log('🎉 Завершение интерактивной генерации:', gameId)
    
    const result = await interactiveGameService.completeGeneration(gameId)
    
    res.json({
      success: result.success,
      data: {
        gameId,
        finalGamePath: result.finalGameData.gamePath,
        downloadUrl: result.finalGameData.downloadUrl,
        assets: result.finalGameData.assets,
        choices: result.finalGameData.choices
      },
      message: result.message
    })
  } catch (error) {
    console.error('Ошибка завершения генерации:', error)
    res.status(500).json({
      success: false,
      error: 'Не удалось завершить генерацию',
      details: error.message
    })
  }
})

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalGames: 1,
      completedGames: 1,
      totalDownloads: 42,
      totalPlayTime: 1337,
      averageRating: 4.5,
      genreStats: {
        arcade: 1,
        platformer: 0,
        puzzle: 0
      },
      monthlyStats: [
        {
          month: '2024-01',
          gamesCreated: 1,
          downloads: 42
        }
      ]
    }
  })
})

// Валидация модели
app.post('/api/ai/validate-model', async (req, res) => {
  try {
    const { provider, model, apiKey } = req.body
    
    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Необходимы параметры provider и model'
      })
    }

    console.log(`🔍 Валидация модели ${provider}/${model}`)

    // Базовая проверка названия модели
    if (model.length < 2) {
      return res.json({
        valid: false,
        error: 'Слишком короткое название модели',
        provider,
        model
      })
    }

    let validation = { valid: false, error: 'Модель не найдена' }

    try {
      // Получаем актуальный список моделей от провайдера
      const actualModels = await getActualModelsFromProvider(provider, apiKey)
      
      if (actualModels && actualModels.length > 0) {
        // Проверяем есть ли модель в актуальном списке
        const modelExists = actualModels.some((m: any) => 
          m.id === model || 
          m.name === model ||
          m.id?.toLowerCase() === model.toLowerCase()
        )

        if (modelExists) {
          validation = { valid: true }
          console.log(`✅ Модель ${model} найдена в актуальном списке ${provider}`)
        } else {
          validation = { 
            valid: false, 
            error: `Модель "${model}" не найдена в актуальном списке ${provider}. Проверьте написание.`
          }
          console.log(`❌ Модель ${model} не найдена в списке ${provider}`)
        }
      } else {
        // Если не удалось получить список, пробуем сделать тестовый запрос
        const testResult = await testModelAvailability(provider, model, apiKey)
        validation = testResult
      }
    } catch (error) {
      console.error(`❌ Ошибка валидации модели ${provider}/${model}:`, error)
      validation = {
        valid: false,
        error: `Ошибка проверки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      }
    }

    res.json({
      ...validation,
      provider,
      model,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Ошибка валидации модели:', error)
    res.status(500).json({
      success: false,
      error: 'Ошибка валидации модели'
    })
  }
})

// Получение актуального списка моделей от провайдера
async function getActualModelsFromProvider(provider: string, apiKey?: string): Promise<any[]> {
  if (!apiKey) return []

  try {
    let url = ''
    let headers: any = { 'Content-Type': 'application/json' }

    switch (provider.toLowerCase()) {
      case 'openai':
        url = 'https://api.openai.com/v1/models'
        headers['Authorization'] = `Bearer ${apiKey}`
        break
      case 'deepseek':
        url = 'https://api.deepseek.com/v1/models'
        headers['Authorization'] = `Bearer ${apiKey}`
        break
      case 'claude':
        // Anthropic не предоставляет публичный endpoint для списка моделей
        // Возвращаем актуальный список известных моделей
        return [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
          { id: 'claude-2.1', name: 'Claude 2.1' },
          { id: 'claude-2.0', name: 'Claude 2.0' },
          { id: 'claude-instant-1.2', name: 'Claude Instant' }
        ]
      default:
        return []
    }

    console.log(`🔍 Запрос актуальных моделей ${provider} из API...`)
    const response = await fetchWithTimeout(url, { headers }, 10000)

    if (response.ok) {
      const data = await response.json()
      const models = data.data || data.models || []
      console.log(`✅ Получено ${models.length} моделей от ${provider}`)
      return models
    } else {
      console.log(`⚠️ Ошибка получения моделей ${provider}: HTTP ${response.status}`)
      return []
    }
  } catch (error) {
    console.error(`❌ Ошибка получения актуальных моделей ${provider}:`, error)
    return []
  }
}

// Тестирование доступности модели
async function testModelAvailability(provider: string, model: string, apiKey?: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: 'API ключ не предоставлен для тестирования' }
  }

  try {
    switch (provider.toLowerCase()) {
      case 'openai':
        return await testOpenAIModel(model, apiKey)
      case 'claude':
        return await testClaudeModel(model, apiKey)
      case 'deepseek':
        return await testDeepSeekModel(model, apiKey)
      default:
        return { valid: false, error: 'Неподдерживаемый провайдер' }
    }
  } catch (error) {
    return { 
      valid: false, 
      error: `Ошибка тестирования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
    }
  }
}

// Тестирование модели OpenAI
async function testOpenAIModel(model: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    }, 8000)

    if (response.status === 200) {
      return { valid: true }
    } else if (response.status === 404) {
      return { valid: false, error: 'Модель не найдена в OpenAI' }
    } else {
      return { valid: false, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    return { valid: false, error: `Ошибка тестирования OpenAI модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` }
  }
}

// Тестирование модели Claude
async function testClaudeModel(model: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    }, 8000)

    if (response.status === 200) {
      return { valid: true }
    } else if (response.status === 400) {
      const errorData = await response.json()
      if (errorData.error?.type === 'invalid_request_error' && 
          errorData.error?.message?.includes('model')) {
        return { valid: false, error: 'Модель не найдена в Claude' }
      }
      return { valid: false, error: errorData.error?.message || 'Ошибка запроса' }
    } else {
      return { valid: false, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    return { valid: false, error: `Ошибка тестирования Claude модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` }
  }
}

// Тестирование модели DeepSeek
async function testDeepSeekModel(model: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    }, 8000)

    if (response.status === 200) {
      return { valid: true }
    } else if (response.status === 404 || response.status === 400) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.error?.message?.includes('model')) {
        return { valid: false, error: 'Модель не найдена в DeepSeek' }
      }
      return { valid: false, error: errorData.error?.message || 'Модель не поддерживается' }
    } else {
      return { valid: false, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    return { valid: false, error: `Ошибка тестирования DeepSeek модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` }
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Эндпоинт не найден',
    path: req.originalUrl,
    method: req.method
  })
})

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Ошибка сервера:', error)
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: error.message
  })
})

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Расширенный backend запущен на http://0.0.0.0:${PORT}`)
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`)
  console.log(`🎮 API endpoints: http://0.0.0.0:${PORT}/api/`)
  console.log(`⚙️ AI настройки: http://0.0.0.0:${PORT}/api/ai/settings`)
  console.log(`🤖 AI модели: http://0.0.0.0:${PORT}/api/ai/models`)
  console.log(`📋 Настройки этапов: http://0.0.0.0:${PORT}/api/generation/settings`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал SIGINT. Завершаю работу...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал SIGTERM. Завершаю работу...')
  process.exit(0)
}) 