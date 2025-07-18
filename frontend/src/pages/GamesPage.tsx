import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Gamepad2, 
  Download, 
  Eye, 
  Trash2, 
  X, 
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useGames, useDeleteGame, useCancelGame, useDownloadGame } from '@/hooks/useGames'
import { Game } from '@/types'

const GamesPage = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: gamesData, isLoading, error } = useGames({
    page: currentPage,
    limit: 12,
    status: statusFilter || undefined,
  })

  const deleteGameMutation = useDeleteGame()
  const cancelGameMutation = useCancelGame()
  const downloadGameMutation = useDownloadGame()

  // Фильтрация по поиску
  const filteredGames = gamesData?.games?.filter(game =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const getStatusBadge = (status: Game['status']) => {
    switch (status) {
      case 'completed':
        return <span className="badge-success">Готова</span>
      case 'processing':
        return <span className="badge-warning">Генерируется</span>
      case 'queued':
        return <span className="badge-gray">В очереди</span>
      case 'failed':
        return <span className="badge-danger">Ошибка</span>
      case 'cancelled':
        return <span className="badge-gray">Отменена</span>
      default:
        return <span className="badge-gray">{status}</span>
    }
  }

  const getStatusIcon = (status: Game['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'queued':
        return <Clock className="h-5 w-5 text-gray-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'cancelled':
        return <X className="h-5 w-5 text-gray-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Н/Д'
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const handleDownload = (game: Game) => {
    downloadGameMutation.mutate({ id: game.id, title: game.title })
  }

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту игру?')) {
      deleteGameMutation.mutate(id)
    }
  }

  const handleCancel = (id: string) => {
    if (confirm('Вы уверены, что хотите отменить генерацию?')) {
      cancelGameMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Мои игры</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card">
              <div className="card-body">
                <div className="loading-skeleton h-6 mb-4" />
                <div className="loading-skeleton h-4 mb-2" />
                <div className="loading-skeleton h-4 mb-4" />
                <div className="loading-skeleton h-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Ошибка загрузки
        </h2>
        <p className="text-gray-600">
          Не удалось загрузить список игр. Попробуйте обновить страницу.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мои игры</h1>
          <p className="text-gray-600 mt-2">
            Всего игр: {gamesData?.pagination.total || 0}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск игр..."
              className="form-input pl-10 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Фильтр по статусу */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="form-select pl-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Все статусы</option>
              <option value="completed">Готовы</option>
              <option value="processing">Генерируются</option>
              <option value="queued">В очереди</option>
              <option value="failed">С ошибками</option>
              <option value="cancelled">Отменены</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список игр */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery || statusFilter ? 'Игры не найдены' : 'У вас пока нет игр'}
          </h2>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter 
              ? 'Попробуйте изменить критерии поиска'
              : 'Создайте свою первую игру с помощью ИИ'
            }
          </p>
          {!searchQuery && !statusFilter && (
            <Link to="/" className="btn-primary">
              Создать игру
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div key={game.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                {/* Заголовок и статус */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {game.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(game.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    {getStatusIcon(game.status)}
                    {getStatusBadge(game.status)}
                  </div>
                </div>

                {/* Описание */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {game.description}
                </p>

                {/* Прогресс для генерирующихся игр */}
                {(game.status === 'processing' || game.status === 'queued') && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Прогресс</span>
                      <span>{game.progress || 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${game.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Размер файла для готовых игр */}
                {game.status === 'completed' && game.size && (
                  <div className="text-sm text-gray-600 mb-4">
                    Размер: {formatFileSize(game.size)}
                  </div>
                )}

                {/* Ошибка */}
                {game.status === 'failed' && game.error && (
                  <div className="text-sm text-red-600 mb-4 p-2 bg-red-50 rounded">
                    {game.error}
                  </div>
                )}

                {/* Действия */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <Link 
                    to={`/games/${game.id}`}
                    className="btn-ghost btn-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Подробнее
                  </Link>

                  <div className="flex space-x-2">
                    {/* Скачивание */}
                    {game.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(game)}
                        disabled={downloadGameMutation.isPending}
                        className="btn-success btn-sm"
                        title="Скачать игру"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}

                    {/* Отмена генерации */}
                    {(game.status === 'processing' || game.status === 'queued') && (
                      <button
                        onClick={() => handleCancel(game.id)}
                        disabled={cancelGameMutation.isPending}
                        className="btn-warning btn-sm"
                        title="Отменить генерацию"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Удаление */}
                    <button
                      onClick={() => handleDelete(game.id)}
                      disabled={deleteGameMutation.isPending}
                      className="btn-danger btn-sm"
                      title="Удалить игру"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {gamesData && gamesData.pagination.pages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn-ghost btn-sm"
            >
              Назад
            </button>
            
            {Array.from({ length: gamesData.pagination.pages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === gamesData.pagination.pages ||
                Math.abs(page - currentPage) <= 2
              )
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-gray-400 mx-1">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`btn-sm ${
                      currentPage === page ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {page}
                  </button>
                </div>
              ))
            }
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(gamesData.pagination.pages, prev + 1))}
              disabled={currentPage === gamesData.pagination.pages}
              className="btn-ghost btn-sm"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GamesPage 