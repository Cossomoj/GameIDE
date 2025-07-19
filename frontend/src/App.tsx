import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { gameAPI, aiAPI, GameCreationRequest } from './services/api'
import ModelSelector from './components/ModelSelector'

// Красивые компоненты с Tailwind CSS
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигационная панель */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-blue-600">🎮 GameIDE</h1>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Главная
                </Link>
                <Link
                  to="/games"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/games') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Мои Игры
                </Link>
                <Link
                  to="/create"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/create') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Создать Игру
                </Link>
                <Link
                  to="/stats"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/stats') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Статистика
                </Link>
                <Link
                  to="/analytics"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/analytics') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Аналитика
                </Link>
                <Link
                  to="/social"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/social') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Социальные
                </Link>
                <Link
                  to="/achievements"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/achievements') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Достижения
                </Link>
                <Link
                  to="/settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/settings') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ Настройки
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Основной контент */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

const HomePage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🎮 GameIDE - AI Game Generator
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Создавайте уникальные игры с помощью искусственного интеллекта
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="text-blue-500 text-3xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Генерация</h3>
                <p className="text-gray-600">Мощные алгоритмы создают игры по вашему описанию</p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="text-green-500 text-3xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Быстро</h3>
                <p className="text-gray-600">Создайте игру за считанные минуты</p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="text-purple-500 text-3xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Настройки</h3>
                <p className="text-gray-600">Множество стилей и жанров на выбор</p>
              </div>
            </div>
            
            <div className="mt-8">
              <Link
                to="/create"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Создать Игру
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

const GamesPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🎮 Мои Игры</h1>
          <p className="text-gray-600 mb-6">
            Здесь будет список ваших созданных игр. Скоро добавим полный функционал!
          </p>
          
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <div className="text-gray-400 text-5xl mb-4">📦</div>
            <p className="text-gray-500">Пока что игр нет. Создайте свою первую игру!</p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
            >
              Создать Игру
            </Link>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

const CreatePage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    artStyle: '',
    quality: 'balanced' as 'fast' | 'balanced' | 'high',
    optimization: 'size' as 'size' | 'performance'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Введите название игры')
      return
    }
    
    if (!formData.description.trim()) {
      toast.error('Введите описание игры')
      return
    }
    
    if (!formData.genre) {
      toast.error('Выберите жанр игры')
      return
    }

    setIsLoading(true)

    try {
      const gameRequest: GameCreationRequest = {
        title: formData.title,
        description: formData.description,
        genre: formData.genre,
        artStyle: formData.artStyle || undefined,
        options: {
          quality: formData.quality,
          optimization: formData.optimization
        }
      }

      const response = await gameAPI.create(gameRequest)
      
      if (response.success) {
        toast.success(`Игра "${response.game.title}" добавлена в очередь генерации!`)
        navigate('/games')
      } else {
        toast.error('Не удалось создать игру')
      }
    } catch (error) {
      console.error('Ошибка создания игры:', error)
      // Ошибка уже показана в API клиенте
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">🎮 Создать Игру</h1>
            <p className="text-gray-600 mb-6">
              Опишите свою идею игры, и ИИ создаст её для вас!
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название игры *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Например: Космическое приключение"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание игры *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Опишите геймплей, сюжет, особенности..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Жанр *
                  </label>
                  <select 
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                    required
                  >
                    <option value="">Выберите жанр</option>
                    <option value="arcade">Аркада</option>
                    <option value="platformer">Платформер</option>
                    <option value="puzzle">Головоломка</option>
                    <option value="rpg">RPG</option>
                    <option value="strategy">Стратегия</option>
                    <option value="shooter">Шутер</option>
                    <option value="racing">Гонки</option>
                    <option value="adventure">Приключения</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Стиль графики
                  </label>
                  <select 
                    name="artStyle"
                    value={formData.artStyle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Выберите стиль</option>
                    <option value="pixel art">Пиксель-арт</option>
                    <option value="cartoon">Мультяшный</option>
                    <option value="realistic">Реалистичный</option>
                    <option value="minimalist">Минимализм</option>
                    <option value="fantasy">Фэнтези</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Качество генерации
                  </label>
                  <select 
                    name="quality"
                    value={formData.quality}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="fast">Быстро (5-10 мин)</option>
                    <option value="balanced">Сбалансированно (15-30 мин)</option>
                    <option value="high">Высокое качество (30-60 мин)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Оптимизация
                  </label>
                  <select 
                    name="optimization"
                    value={formData.optimization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="size">Размер файла</option>
                    <option value="performance">Производительность</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Создаю игру...
                    </div>
                  ) : (
                    '🚀 Создать Игру с ИИ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

const StatsPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 Статистика</h1>
          <p className="text-gray-600 mb-6">
            Аналитика ваших игр и использования платформы
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Созданных игр</div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Общих скачиваний</div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Часов игрового времени</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// Новые страницы для расширенного функционала
const AnalyticsPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📈 Расширенная Аналитика</h1>
          <p className="text-gray-600 mb-6">
            Подробная аналитика производительности ваших игр
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Популярность игр</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Аркадные игры</span>
                  <span className="text-sm font-semibold">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Вовлеченность</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">78%</div>
              <div className="text-sm text-gray-600">Средняя вовлеченность игроков</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

const SocialPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">👥 Социальные функции</h1>
          <p className="text-gray-600 mb-6">
            Общайтесь с друзьями и делитесь своими играми
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👫 Друзья</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium">Игрок_123</div>
                    <div className="text-xs text-gray-500">Онлайн</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium">GameMaster_456</div>
                    <div className="text-xs text-gray-500">Не в сети 2ч назад</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📰 Лента активности</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">Игрок_123</span> создал новую игру "Космические войны"
                </div>
                <div className="text-sm">
                  <span className="font-medium">GameMaster_456</span> достиг 1000 очков в "Головоломке"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

const AchievementsPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🏆 Достижения</h1>
          <p className="text-gray-600 mb-6">
            Ваши успехи и награды в GameIDE
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
              <div className="text-center">
                <div className="text-4xl mb-3">🥇</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Первая игра</h3>
                <p className="text-sm text-gray-600 mb-3">Создайте свою первую игру</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">0/1</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-4xl mb-3">🎮</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Игровой гуру</h3>
                <p className="text-sm text-gray-600 mb-3">Создайте 10 игр</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">0/10</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
              <div className="text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Мастер</h3>
                <p className="text-sm text-gray-600 mb-3">Используйте все AI сервисы</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">0/3</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
)

// НОВАЯ СТРАНИЦА НАСТРОЕК С РАСШИРЕННЫМ ФУНКЦИОНАЛОМ
const SettingsPage = () => {
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'generation' | 'general'>('ai')

  // Настройки AI сервисов
  const [aiSettings, setAiSettings] = useState({
    openai: { apiKey: '', model: 'gpt-4' },
    claude: { apiKey: '', model: 'claude-3-sonnet-20240229' },
    deepseek: { apiKey: '', model: 'deepseek-coder' }
  })

  // Состояние для списков моделей
  const [availableModels, setAvailableModels] = useState<{
    [provider: string]: Array<{ id: string; name: string; description: string }>
  }>({
    openai: [],
    claude: [],
    deepseek: []
  })

  // Состояние для ручного ввода моделей
  const [manualModelInput, setManualModelInput] = useState({
    openai: false,
    claude: false,
    deepseek: false
  })

  // Состояние валидации моделей
  const [modelValidation, setModelValidation] = useState<{
    [provider: string]: { valid: boolean; error?: string; isValidating: boolean }
  }>({
    openai: { valid: true, isValidating: false },
    claude: { valid: true, isValidating: false },
    deepseek: { valid: true, isValidating: false }
  })

  // Настройки этапов генерации игры
  const [generationSettings, setGenerationSettings] = useState({
    stages: {
      gameDesign: { enabled: true, provider: 'claude' },
      codeGeneration: { enabled: true, provider: 'deepseek' },
      assetGeneration: { enabled: true, provider: 'openai' },
      testing: { enabled: false, provider: 'claude' },
      optimization: { enabled: true, provider: 'deepseek' }
    }
  })

  // Загрузка статуса AI, настроек и моделей при монтировании
  useEffect(() => {
    loadAIStatus()
    loadGenerationSettings()
    loadAIModels()
    loadAISettings()
  }, [])

  const loadAIStatus = async () => {
    try {
      setIsLoading(true)
      const status = await aiAPI.getStatus()
      setAiStatus(status)
      console.log('📊 Статус AI сервисов:', status)
    } catch (error) {
      toast.error('Ошибка загрузки статуса AI сервисов')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAISettings = async () => {
    try {
      console.log('📥 Загрузка настроек AI...')
      const response = await aiAPI.getSettings()
      
      if (response.success) {
        console.log('✅ Настройки AI загружены:', response.settings)
        setAiSettings({
          openai: {
            apiKey: response.settings.openai?.apiKey || '',
            model: response.settings.openai?.model || 'gpt-4'
          },
          claude: {
            apiKey: response.settings.claude?.apiKey || '',
            model: response.settings.claude?.model || 'claude-3-sonnet-20240229'
          },
          deepseek: {
            apiKey: response.settings.deepseek?.apiKey || '',
            model: response.settings.deepseek?.model || 'deepseek-coder'
          }
        })
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек AI:', error)
    }
  }

  const loadAIModels = async () => {
    try {
      console.log('📥 Загрузка списков моделей AI...')
      const response = await aiAPI.getModels()
      
      if (response.success && typeof response.models === 'object') {
        console.log('✅ Модели загружены:', response.models)
        setAvailableModels(response.models as any)
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки моделей AI:', error)
    }
  }

  const loadGenerationSettings = async () => {
    try {
      console.log('📥 Загрузка настроек этапов генерации...')
      const response = await fetch('http://localhost:3001/api/generation/settings')
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Настройки загружены:', data.settings)
        setGenerationSettings(data.settings)
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек:', error)
      toast.error('Ошибка загрузки настроек этапов')
    }
  }

  const saveGenerationSettings = async () => {
    try {
      setIsUpdating(true)
      console.log('💾 Сохранение настроек этапов:', generationSettings)
      
      const response = await fetch('http://localhost:3001/api/generation/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationSettings),
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Настройки сохранены:', data)
        toast.success('Настройки этапов генерации сохранены!')
      } else {
        throw new Error(data.error || 'Ошибка сохранения')
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек:', error)
      toast.error('Ошибка сохранения настроек этапов')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <span className="text-green-500">🟢</span>
      case 'offline': return <span className="text-red-500">🔴</span>
      case 'not_configured': return <span className="text-yellow-500">🟡</span>
      case 'error': return <span className="text-red-500">❌</span>
      default: return <span className="text-gray-500">⚪</span>
    }
  }

  const getStatusText = (status: string, configured: boolean) => {
    if (!configured) return 'Не настроен'
    switch (status) {
      case 'online': return 'Онлайн'
      case 'offline': return 'Не доступен'
      case 'error': return 'Ошибка'
      default: return 'Проверка...'
    }
  }

  const getApiKeyValidationBadge = (provider: string) => {
    const service = aiStatus?.services?.[provider]
    if (!service) return null

    const status = service.apiKeyStatus
    const colors = {
      'valid': 'bg-green-100 text-green-800',
      'invalid': 'bg-red-100 text-red-800',
      'error': 'bg-red-100 text-red-800',
      'not_configured': 'bg-yellow-100 text-yellow-800'
    }

    const texts = {
      'valid': '✅ Валиден',
      'invalid': '❌ Невалиден',
      'error': '⚠️ Ошибка',
      'not_configured': '⚪ Не настроен'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {texts[status] || 'Неизвестно'}
      </span>
    )
  }

  const updateAISettings = async (provider: string) => {
    const settings = aiSettings[provider as keyof typeof aiSettings]
    if (!settings.apiKey.trim()) {
      toast.error('Введите API ключ')
      return
    }

    try {
      setIsUpdating(true)
      console.log(`💾 Сохранение настроек ${provider}...`)
      
      const response = await aiAPI.updateSettings(provider, settings.apiKey, settings.model)
      
      if (response.success) {
        toast.success(`Настройки ${provider} сохранены в .env файл!`)
        
        // Показываем статус валидации
        if (response.validation?.valid) {
          toast.success(`API ключ ${provider} валиден!`)
        } else if (response.validation?.error) {
          toast.error(`API ключ ${provider}: ${response.validation.error}`)
        }
        
        // Перезагружаем статус
        await loadAIStatus()
      }
    } catch (error) {
      console.error(`Ошибка сохранения настроек ${provider}:`, error)
      toast.error(`Ошибка сохранения настроек ${provider}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Настройки</h1>
            <p className="text-gray-600 mb-6">
              Управление AI сервисами и настройками генерации игр
            </p>

            {/* Вкладки */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'ai'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🤖 AI Сервисы
                </button>
                <button
                  onClick={() => setActiveTab('generation')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'generation'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🎮 Этапы Генерации
                </button>
                <button
                  onClick={() => setActiveTab('general')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'general'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ⚙️ Общие
                </button>
              </nav>
            </div>

            {/* Содержимое вкладок */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Мониторинг AI Сервисов</h3>
                  <button
                    onClick={loadAIStatus}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      '🔄'
                    )}
                    Обновить
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Загрузка статуса AI сервисов...
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* OpenAI */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🎨</span>
                          <h4 className="text-lg font-medium">OpenAI</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getApiKeyValidationBadge('openai')}
                          {aiStatus && getStatusIcon(aiStatus.services?.openai?.status || 'unknown')}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Статус:</span> {aiStatus ? getStatusText(aiStatus.services?.openai?.status, aiStatus.services?.openai?.configured) : 'Загрузка...'}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Ключ
                          </label>
                          <input
                            type="text"
                            placeholder="sk-proj-..."
                            value={aiSettings.openai.apiKey}
                            onChange={(e) => setAiSettings(prev => ({
                              ...prev,
                              openai: { ...prev.openai, apiKey: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                          />
                        </div>
                        
                        <ModelSelector
                          provider="openai"
                          currentModel={aiSettings.openai.model}
                          models={availableModels.openai}
                          apiKey={aiSettings.openai.apiKey}
                          onChange={(model) => setAiSettings(prev => ({
                            ...prev,
                            openai: { ...prev.openai, model }
                          }))}
                        />
                        
                        <button
                          onClick={() => updateAISettings('openai')}
                          disabled={isUpdating}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUpdating ? 'Сохранение...' : 'Сохранить в .env'}
                        </button>
                      </div>
                    </div>

                    {/* Claude */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🧠</span>
                          <h4 className="text-lg font-medium">Claude</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getApiKeyValidationBadge('claude')}
                          {aiStatus && getStatusIcon(aiStatus.services?.claude?.status || 'unknown')}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Статус:</span> {aiStatus ? getStatusText(aiStatus.services?.claude?.status, aiStatus.services?.claude?.configured) : 'Загрузка...'}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Ключ
                          </label>
                          <input
                            type="text"
                            placeholder="sk-ant-api03-..."
                            value={aiSettings.claude.apiKey}
                            onChange={(e) => setAiSettings(prev => ({
                              ...prev,
                              claude: { ...prev.claude, apiKey: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                          />
                        </div>
                        
                        <ModelSelector
                          provider="claude"
                          currentModel={aiSettings.claude.model}
                          models={availableModels.claude}
                          apiKey={aiSettings.claude.apiKey}
                          onChange={(model) => setAiSettings(prev => ({
                            ...prev,
                            claude: { ...prev.claude, model }
                          }))}
                        />
                        
                        <button
                          onClick={() => updateAISettings('claude')}
                          disabled={isUpdating}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUpdating ? 'Сохранение...' : 'Сохранить в .env'}
                        </button>
                      </div>
                    </div>

                    {/* DeepSeek */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">💻</span>
                          <h4 className="text-lg font-medium">DeepSeek</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getApiKeyValidationBadge('deepseek')}
                          {aiStatus && getStatusIcon(aiStatus.services?.deepseek?.status || 'unknown')}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Статус:</span> {aiStatus ? getStatusText(aiStatus.services?.deepseek?.status, aiStatus.services?.deepseek?.configured) : 'Загрузка...'}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Ключ
                          </label>
                          <input
                            type="text"
                            placeholder="sk-..."
                            value={aiSettings.deepseek.apiKey}
                            onChange={(e) => setAiSettings(prev => ({
                              ...prev,
                              deepseek: { ...prev.deepseek, apiKey: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                          />
                        </div>
                        
                        <ModelSelector
                          provider="deepseek"
                          currentModel={aiSettings.deepseek.model}
                          models={availableModels.deepseek}
                          apiKey={aiSettings.deepseek.apiKey}
                          onChange={(model) => setAiSettings(prev => ({
                            ...prev,
                            deepseek: { ...prev.deepseek, model }
                          }))}
                        />
                        
                        <button
                          onClick={() => updateAISettings('deepseek')}
                          disabled={isUpdating}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUpdating ? 'Сохранение...' : 'Сохранить в .env'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'generation' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Настройка Этапов Генерации Игры</h3>
                  <button
                    onClick={loadGenerationSettings}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    🔄 Обновить
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Выберите какие этапы создания игры будут обрабатываться AI и какой сервис использовать для каждого этапа.
                </p>

                <div className="space-y-4">
                  {/* Этап: Дизайн игры */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generationSettings.stages.gameDesign.enabled}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          stages: {
                            ...prev.stages,
                            gameDesign: { ...prev.stages.gameDesign, enabled: e.target.checked }
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">📋 Дизайн игры</h4>
                        <p className="text-sm text-gray-500">Создание концепции, механик и структуры игры</p>
                      </div>
                    </div>
                    <select
                      value={generationSettings.stages.gameDesign.provider}
                      onChange={(e) => setGenerationSettings(prev => ({
                        ...prev,
                        stages: {
                          ...prev.stages,
                          gameDesign: { ...prev.stages.gameDesign, provider: e.target.value }
                        }
                      }))}
                      disabled={!generationSettings.stages.gameDesign.enabled}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="claude">Claude</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>

                  {/* Этап: Генерация кода */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generationSettings.stages.codeGeneration.enabled}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          stages: {
                            ...prev.stages,
                            codeGeneration: { ...prev.stages.codeGeneration, enabled: e.target.checked }
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">💻 Генерация кода</h4>
                        <p className="text-sm text-gray-500">Создание JavaScript/HTML кода игры</p>
                      </div>
                    </div>
                    <select
                      value={generationSettings.stages.codeGeneration.provider}
                      onChange={(e) => setGenerationSettings(prev => ({
                        ...prev,
                        stages: {
                          ...prev.stages,
                          codeGeneration: { ...prev.stages.codeGeneration, provider: e.target.value }
                        }
                      }))}
                      disabled={!generationSettings.stages.codeGeneration.enabled}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="deepseek">DeepSeek</option>
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>

                  {/* Этап: Генерация ассетов */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generationSettings.stages.assetGeneration.enabled}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          stages: {
                            ...prev.stages,
                            assetGeneration: { ...prev.stages.assetGeneration, enabled: e.target.checked }
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">🎨 Генерация ассетов</h4>
                        <p className="text-sm text-gray-500">Создание графики, спрайтов и звуков</p>
                      </div>
                    </div>
                    <select
                      value={generationSettings.stages.assetGeneration.provider}
                      onChange={(e) => setGenerationSettings(prev => ({
                        ...prev,
                        stages: {
                          ...prev.stages,
                          assetGeneration: { ...prev.stages.assetGeneration, provider: e.target.value }
                        }
                      }))}
                      disabled={!generationSettings.stages.assetGeneration.enabled}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </div>

                  {/* Этап: Тестирование */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generationSettings.stages.testing.enabled}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          stages: {
                            ...prev.stages,
                            testing: { ...prev.stages.testing, enabled: e.target.checked }
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">🧪 Тестирование</h4>
                        <p className="text-sm text-gray-500">Автоматическое тестирование и исправление багов</p>
                      </div>
                    </div>
                    <select
                      value={generationSettings.stages.testing.provider}
                      onChange={(e) => setGenerationSettings(prev => ({
                        ...prev,
                        stages: {
                          ...prev.stages,
                          testing: { ...prev.stages.testing, provider: e.target.value }
                        }
                      }))}
                      disabled={!generationSettings.stages.testing.enabled}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="claude">Claude</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>

                  {/* Этап: Оптимизация */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generationSettings.stages.optimization.enabled}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          stages: {
                            ...prev.stages,
                            optimization: { ...prev.stages.optimization, enabled: e.target.checked }
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">⚡ Оптимизация</h4>
                        <p className="text-sm text-gray-500">Оптимизация кода для производительности и размера</p>
                      </div>
                    </div>
                    <select
                      value={generationSettings.stages.optimization.provider}
                      onChange={(e) => setGenerationSettings(prev => ({
                        ...prev,
                        stages: {
                          ...prev.stages,
                          optimization: { ...prev.stages.optimization, provider: e.target.value }
                        }
                      }))}
                      disabled={!generationSettings.stages.optimization.enabled}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="deepseek">DeepSeek</option>
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveGenerationSettings}
                    disabled={isUpdating}
                    className={`bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 ${
                      isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUpdating ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Сохранение...
                      </div>
                    ) : (
                      'Сохранить настройки этапов'
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Общие настройки</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Уведомления</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">Email уведомления о завершении генерации</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">Push уведомления в браузере</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                        <span className="ml-2 text-sm text-gray-700">Звуковые уведомления</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Интерфейс</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                          <option>Светлая</option>
                          <option>Темная</option>
                          <option>Автоматическая</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Язык</label>
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                          <option>Русский</option>
                          <option>English</option>
                          <option>中文</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => toast.success('Общие настройки сохранены!')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Сохранить настройки
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

const NotFoundPage = () => (
  <Layout>
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Страница не найдена</h1>
          <p className="text-gray-600 mb-6">
            Страница, которую вы ищете, не существует.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  </Layout>
)

function App() {
  console.log('🎮 App component rendering with Settings page!')
  
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App 