import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download, 
  X, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader,
  Play,
  FileText,
  Image,
  Volume2,
  Code,
  Eye,
  Calendar,
  HardDrive,
  Cpu
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useGame, useDeleteGame, useCancelGame, useDownloadGame } from '@/hooks/useGames'
import { useGameGeneration } from '@/hooks/useWebSocket'

const GameDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: game, isLoading, error } = useGame(id)
  const deleteGameMutation = useDeleteGame()
  const cancelGameMutation = useCancelGame()
  const downloadGameMutation = useDownloadGame()
  
  // WebSocket для отслеживания прогресса
  const { 
    progress, 
    logs, 
    error: generationError, 
    isCompleted,
    preview 
  } = useGameGeneration(id || null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'processing':
        return <Loader className="h-6 w-6 text-yellow-500 animate-spin" />
      case 'queued':
        return <Clock className="h-6 w-6 text-gray-500" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'cancelled':
        return <X className="h-6 w-6 text-gray-500" />
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Игра готова'
      case 'processing':
        return 'Генерируется'
      case 'queued':
        return 'В очереди'
      case 'failed':
        return 'Ошибка генерации'
      case 'cancelled':
        return 'Генерация отменена'
      default:
        return status
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Н/Д'
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const handleDownload = () => {
    if (game) {
      downloadGameMutation.mutate({ id: game.id, title: game.title })
    }
  }

  const handleCancel = () => {
    if (game && confirm('Вы уверены, что хотите отменить генерацию?')) {
      cancelGameMutation.mutate(game.id)
    }
  }

  const handleDelete = () => {
    if (game && confirm('Вы уверены, что хотите удалить эту игру?')) {
      deleteGameMutation.mutate(game.id, {
        onSuccess: () => navigate('/games')
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="loading-skeleton h-8 w-64" />
        <div className="card">
          <div className="card-body">
            <div className="loading-skeleton h-6 mb-4" />
            <div className="loading-skeleton h-4 mb-2" />
            <div className="loading-skeleton h-4 mb-4" />
            <div className="loading-skeleton h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Игра не найдена
        </h2>
        <p className="text-gray-600 mb-6">
          Возможно, игра была удалена или у вас нет прав доступа
        </p>
        <Link to="/games" className="btn-primary">
          Вернуться к списку игр
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <div className="flex items-center space-x-4">
        <Link 
          to="/games" 
          className="btn-ghost btn-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к играм
        </Link>
      </div>

      {/* Заголовок и статус */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon(game.status)}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{game.title}</h1>
              <p className="text-lg text-gray-600 mt-1">
                {getStatusText(game.status)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Создана {format(new Date(game.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </div>
            {game.size && (
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 mr-1" />
                {formatFileSize(game.size)}
              </div>
            )}
          </div>
        </div>

        {/* Действия */}
        <div className="flex flex-wrap gap-3">
          {game.status === 'completed' && (
            <button
              onClick={handleDownload}
              disabled={downloadGameMutation.isPending}
              className="btn-success"
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать игру
            </button>
          )}

          {(game.status === 'processing' || game.status === 'queued') && (
            <button
              onClick={handleCancel}
              disabled={cancelGameMutation.isPending}
              className="btn-warning"
            >
              <X className="h-4 w-4 mr-2" />
              Отменить
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleteGameMutation.isPending}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </button>
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Описание и детали */}
        <div className="lg:col-span-2 space-y-6">
          {/* Описание */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Описание</h2>
            </div>
            <div className="card-body">
              <p className="text-gray-700 whitespace-pre-wrap">{game.description}</p>
            </div>
          </div>

          {/* Прогресс генерации */}
          {(game.status === 'processing' || game.status === 'queued') && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900">Прогресс генерации</h2>
              </div>
              <div className="card-body space-y-4">
                {/* Прогресс бар */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{progress?.step || 'Ожидание...'}</span>
                    <span>{progress?.progress || game.progress || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill"
                      style={{ width: `${progress?.progress || game.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Текущий этап */}
                {progress?.step && (
                  <div className="text-sm text-gray-700">
                    <strong>Текущий этап:</strong> {progress.step}
                  </div>
                )}

                {/* Логи в реальном времени */}
                {logs.length > 0 && (
                  <div className="bg-gray-900 text-white text-sm rounded-lg p-4 max-h-64 overflow-y-auto scrollbar-thin">
                    <h3 className="text-gray-300 mb-2">Логи генерации:</h3>
                    <div className="space-y-1">
                      {logs.slice(-10).map((log, index) => (
                        <div key={index} className={`${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          'text-gray-300'
                        }`}>
                          <span className="text-gray-500">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                          {' '}{log.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ошибка генерации */}
          {(game.status === 'failed' || generationError) && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-red-900">Ошибка генерации</h2>
              </div>
              <div className="card-body">
                <div className="alert-error">
                  <div className="flex">
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm">
                        {generationError?.error || game.error || 'Произошла неизвестная ошибка'}
                      </p>
                      {generationError?.step && (
                        <p className="text-sm mt-1">
                          <strong>Этап:</strong> {generationError.step}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Превью игры */}
          {preview && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900">Превью</h2>
              </div>
              <div className="card-body">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Предварительный просмотр:</p>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(preview, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Боковая панель с информацией */}
        <div className="space-y-6">
          {/* Детали игры */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Детали</h2>
            </div>
            <div className="card-body space-y-4">
              {game.prompt?.genre && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Жанр</div>
                  <div className="text-sm text-gray-900">{game.prompt.genre}</div>
                </div>
              )}

              {game.prompt?.artStyle && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Стиль</div>
                  <div className="text-sm text-gray-900">{game.prompt.artStyle}</div>
                </div>
              )}

              {game.prompt?.targetAudience && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Аудитория</div>
                  <div className="text-sm text-gray-900">{game.prompt.targetAudience}</div>
                </div>
              )}

              {game.prompt?.monetization && game.prompt.monetization.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Монетизация</div>
                  <div className="text-sm text-gray-900">
                    {game.prompt.monetization.join(', ')}
                  </div>
                </div>
              )}

              <div className="divider" />

              <div>
                <div className="text-sm font-medium text-gray-700">ID игры</div>
                <div className="text-xs text-gray-600 font-mono">{game.id}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">Последнее обновление</div>
                <div className="text-sm text-gray-900">
                  {format(new Date(game.updatedAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                </div>
              </div>
            </div>
          </div>

          {/* Компоненты игры (для готовых игр) */}
          {game.status === 'completed' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Компоненты</h2>
              </div>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span>HTML файл</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Code className="h-4 w-4 text-gray-400 mr-2" />
                    <span>JavaScript код</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 text-gray-400 mr-2" />
                    <span>Графические ресурсы</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Volume2 className="h-4 w-4 text-gray-400 mr-2" />
                    <span>Звуковые эффекты</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Cpu className="h-4 w-4 text-gray-400 mr-2" />
                    <span>Yandex Games SDK</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Системная информация */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Информация</h2>
            </div>
            <div className="card-body space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Версия генератора</span>
                <span className="font-mono">v1.0.0</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Движок</span>
                <span>Phaser 3.70+</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">ИИ модель</span>
                <span>DeepSeek + OpenAI</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Совместимость</span>
                <span>Yandex Games</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameDetailsPage 