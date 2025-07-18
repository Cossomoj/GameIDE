import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  HardDrive,
  Cpu,
  Zap,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { statsApi } from '@/services/api'

const StatsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  // Запросы статистики
  const { data: overallStats, isLoading: isLoadingOverall, refetch: refetchOverall } = useQuery({
    queryKey: ['stats', 'overall'],
    queryFn: () => statsApi.getOverall(),
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })

  const { data: historyStats, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['stats', 'history', selectedPeriod],
    queryFn: () => statsApi.getHistory(selectedPeriod),
  })

  const { data: genreStats, isLoading: isLoadingGenres } = useQuery({
    queryKey: ['stats', 'genres'],
    queryFn: () => statsApi.getGenres(),
  })

  const { data: performanceStats, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['stats', 'performance'],
    queryFn: () => statsApi.getPerformance(),
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  })

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}д ${hours}ч ${mins}м`
    } else if (hours > 0) {
      return `${hours}ч ${mins}м`
    } else {
      return `${mins}м`
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

  if (isLoadingOverall) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card">
              <div className="card-body">
                <div className="loading-skeleton h-6 mb-4" />
                <div className="loading-skeleton h-8 mb-2" />
                <div className="loading-skeleton h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
          <p className="text-gray-600 mt-2">
            Аналитика и метрики AI Game Generator
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="form-select"
          >
            <option value={7}>Последние 7 дней</option>
            <option value={30}>Последние 30 дней</option>
            <option value={90}>Последние 90 дней</option>
          </select>
          
          <button
            onClick={() => refetchOverall()}
            className="btn-ghost btn-sm"
            title="Обновить статистику"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Всего игр</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overallStats.games.total}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Успешно: {overallStats.games.successful} ({overallStats.games.successRate.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Обрабатывается</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overallStats.games.processing + overallStats.games.queued}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                В очереди: {overallStats.games.queued}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <HardDrive className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Общий размер</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overallStats.size.formatted.total}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Средний: {overallStats.size.formatted.average}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Время работы</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatUptime(overallStats.system.uptime)}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {overallStats.system.platform} {overallStats.system.nodeVersion}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* График активности по дням */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Активность за {selectedPeriod} дней
            </h2>
          </div>
          <div className="card-body">
            {isLoadingHistory ? (
              <div className="h-64 flex items-center justify-center">
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            ) : historyStats && historyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: ru })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: ru })}
                    formatter={(value, name) => [
                      value,
                      name === 'totalGames' ? 'Всего игр' :
                      name === 'successfulGames' ? 'Успешных' :
                      name === 'failedGames' ? 'Ошибок' : name
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalGames"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="successfulGames"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="failedGames"
                    stackId="3"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Нет данных для отображения
              </div>
            )}
          </div>
        </div>

        {/* Распределение по жанрам */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Распределение по жанрам
            </h2>
          </div>
          <div className="card-body">
            {isLoadingGenres ? (
              <div className="h-64 flex items-center justify-center">
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            ) : genreStats && genreStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genreStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ genre, percentage }) => `${genre} (${percentage.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {genreStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} игр (${props.payload.percentage.toFixed(1)}%)`,
                      'Количество'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Нет данных для отображения
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Системная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Очередь заданий */}
        {overallStats && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Состояние очереди</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ожидают</span>
                  <span className="font-semibold">{overallStats.queue.waiting}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Активных</span>
                  <span className="font-semibold">{overallStats.queue.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Завершено</span>
                  <span className="font-semibold">{overallStats.queue.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ошибок</span>
                  <span className="font-semibold">{overallStats.queue.failed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Отложено</span>
                  <span className="font-semibold">{overallStats.queue.delayed}</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Всего</span>
                  <span>{overallStats.queue.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Использование ИИ сервисов */}
        {overallStats && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Использование ИИ</h2>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Zap className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="font-medium">DeepSeek API</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {overallStats.ai.deepseek.requests} запросов
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Сброс лимита: {format(overallStats.ai.deepseek.resetTime, 'dd MMM HH:mm', { locale: ru })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Cpu className="h-5 w-5 text-green-500 mr-2" />
                      <span className="font-medium">OpenAI API</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {overallStats.ai.openai.requests} запросов
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Сброс лимита: {format(overallStats.ai.openai.resetTime, 'dd MMM HH:mm', { locale: ru })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Использование памяти */}
      {overallStats && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Системные ресурсы</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Использование памяти</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overallStats.system.memory.formatted.used}
                </div>
                <div className="text-sm text-gray-500">
                  из {overallStats.system.memory.formatted.total}
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${(overallStats.system.memory.used / overallStats.system.memory.total) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Платформа</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {overallStats.system.platform}
                </div>
                <div className="text-sm text-gray-500">
                  Node.js {overallStats.system.nodeVersion}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Время работы</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {formatUptime(overallStats.system.uptime)}
                </div>
                <div className="text-sm text-gray-500">
                  без перезагрузки
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsPage 