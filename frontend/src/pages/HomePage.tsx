import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Zap, 
  Gamepad2, 
  Sparkles, 
  Clock, 
  Download,
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react'
import { useCreateGame } from '@/hooks/useGames'
import { 
  GENRES, 
  ART_STYLES, 
  TARGET_AUDIENCES, 
  MONETIZATION_TYPES,
  QUALITY_LEVELS,
  OPTIMIZATION_TYPES
} from '@/types'

// Схема валидации формы
const gameFormSchema = z.object({
  title: z.string().min(3, 'Название должно содержать минимум 3 символа').max(50, 'Максимум 50 символов'),
  genre: z.string().min(1, 'Выберите жанр'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов').max(500, 'Максимум 500 символов'),
  artStyle: z.string().optional(),
  targetAudience: z.string().optional(),
  monetization: z.array(z.string()).optional(),
  quality: z.enum(['fast', 'balanced', 'high']).default('balanced'),
  optimization: z.enum(['size', 'performance']).default('size'),
})

type GameFormData = z.infer<typeof gameFormSchema>

const HomePage = () => {
  const navigate = useNavigate()
  const [selectedMonetization, setSelectedMonetization] = useState<string[]>([])
  const createGameMutation = useCreateGame()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<GameFormData>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      quality: 'balanced',
      optimization: 'size',
    },
  })

  const watchedQuality = watch('quality')
  const watchedGenre = watch('genre')

  const onSubmit = async (data: GameFormData) => {
    try {
      const gameData = {
        ...data,
        monetization: selectedMonetization,
      }
      
      const game = await createGameMutation.mutateAsync(gameData)
      navigate(`/games/${game.id}`)
    } catch (error) {
      console.error('Ошибка создания игры:', error)
    }
  }

  const handleMonetizationChange = (value: string, checked: boolean) => {
    if (checked) {
      setSelectedMonetization(prev => [...prev, value])
    } else {
      setSelectedMonetization(prev => prev.filter(item => item !== value))
    }
  }

  const features = [
    {
      icon: Zap,
      title: 'Генерация ИИ',
      description: 'Используем DeepSeek для создания кода игр и OpenAI для графики'
    },
    {
      icon: Gamepad2,
      title: '8 жанров игр',
      description: 'От платформеров до RPG - выберите подходящий стиль'
    },
    {
      icon: Sparkles,
      title: 'Готово к публикации',
      description: 'Автоматическая интеграция с Yandex Games SDK'
    },
    {
      icon: Clock,
      title: 'Быстрая генерация',
      description: 'От 3 до 30 минут в зависимости от сложности'
    },
  ]

  return (
    <div className="space-y-12">
      {/* Hero секция */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
          <Sparkles className="h-4 w-4 mr-2" />
          Создавайте игры с помощью ИИ
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
          AI Game Generator
          <span className="block text-primary-600">для Яндекс Игр</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Опишите свою идею игры, и наш ИИ создаст полноценную HTML5 игру, 
          готовую к публикации на Яндекс Играх
        </p>
      </div>

      {/* Особенности */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <feature.icon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Форма создания игры */}
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-gray-900">Создать новую игру</h2>
            <p className="text-gray-600 mt-2">
              Заполните форму ниже, чтобы начать генерацию игры
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-6">
            {/* Название и жанр */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  Название игры *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Например: Космический пират"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="form-error">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Жанр *
                </label>
                <select
                  className="form-select"
                  {...register('genre')}
                >
                  <option value="">Выберите жанр</option>
                  {GENRES.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.label}
                    </option>
                  ))}
                </select>
                {errors.genre && (
                  <p className="form-error">{errors.genre.message}</p>
                )}
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="form-label">
                Описание игры *
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Опишите вашу игру: механики, сюжет, особенности..."
                {...register('description')}
              />
              {errors.description && (
                <p className="form-error">{errors.description.message}</p>
              )}
              <p className="form-help">
                Чем подробнее описание, тем лучше результат
              </p>
            </div>

            {/* Стиль и аудитория */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  Художественный стиль
                </label>
                <select
                  className="form-select"
                  {...register('artStyle')}
                >
                  <option value="">Автоматический выбор</option>
                  {ART_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Целевая аудитория
                </label>
                <select
                  className="form-select"
                  {...register('targetAudience')}
                >
                  <option value="">Универсальная</option>
                  {TARGET_AUDIENCES.map((audience) => (
                    <option key={audience.value} value={audience.value}>
                      {audience.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Монетизация */}
            <div>
              <label className="form-label">
                Монетизация
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MONETIZATION_TYPES.map((monetization) => (
                  <label key={monetization.value} className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={selectedMonetization.includes(monetization.value)}
                      onChange={(e) => handleMonetizationChange(monetization.value, e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {monetization.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Настройки генерации */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Настройки генерации
              </h3>

              {/* Качество */}
              <div>
                <label className="form-label">
                  Качество генерации
                </label>
                <div className="space-y-3">
                  {QUALITY_LEVELS.map((quality) => (
                    <label key={quality.value} className="flex items-start">
                      <input
                        type="radio"
                        className="form-radio mt-1"
                        value={quality.value}
                        {...register('quality')}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-700">
                          {quality.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quality.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Оптимизация */}
              <div>
                <label className="form-label">
                  Оптимизация
                </label>
                <div className="space-y-3">
                  {OPTIMIZATION_TYPES.map((optimization) => (
                    <label key={optimization.value} className="flex items-start">
                      <input
                        type="radio"
                        className="form-radio mt-1"
                        value={optimization.value}
                        {...register('optimization')}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-700">
                          {optimization.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {optimization.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Информация о времени генерации */}
            {watchedQuality && (
              <div className="alert-info">
                <div className="flex">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm">
                      <strong>Примерное время генерации:</strong>{' '}
                      {watchedQuality === 'fast' && '~3 минуты'}
                      {watchedQuality === 'balanced' && '~10 минут'}
                      {watchedQuality === 'high' && '~30 минут'}
                    </p>
                    <p className="text-sm mt-1">
                      Вы сможете отслеживать прогресс в реальном времени
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопка отправки */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createGameMutation.isPending}
                className="btn-primary btn-lg inline-flex items-center"
              >
                {createGameMutation.isPending ? (
                  <>
                    <div className="spinner mr-2" />
                    Создание игры...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Создать игру
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Примеры готовых игр */}
      <div className="text-center space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Примеры созданных игр
          </h2>
          <p className="text-gray-600 mt-4">
            Вот что может создать наш ИИ всего за несколько минут
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Космический пират',
              genre: 'Платформер',
              description: 'Аркадный платформер с пиксельной графикой',
              features: ['Автоматическая стрельба', 'Бонусы', 'Звуковые эффекты']
            },
            {
              title: 'Магический пазл',
              genre: 'Головоломка',
              description: 'Интеллектуальная игра в стиле match-3',
              features: ['Спецэффекты', 'Система очков', 'Яркая графика']
            },
            {
              title: 'Гонки будущего',
              genre: 'Гонки',
              description: 'Футуристические гонки на высокой скорости',
              features: ['Управление', 'Препятствия', 'Рекорды']
            },
          ].map((game, index) => (
            <div key={index} className="card text-left">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {game.title}
                  </h3>
                  <span className="badge-primary">
                    {game.genre}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">
                  {game.description}
                </p>
                
                <div className="space-y-2">
                  {game.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HomePage 