import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Eye, 
  Clock, 
  Activity, 
  Target, 
  AlertTriangle,
  DollarSign,
  Smartphone,
  Globe,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { analyticsService, AnalyticsReport, RealtimeMetrics } from '../services/analytics';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

interface ChartData {
  name: string;
  value: number;
  timestamp?: string;
}

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'monetization'>('overview');
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [reports, setReports] = useState<Record<string, AnalyticsReport>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Получение данных
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [realtime, overviewReport, userReport, gameReport, monetizationReport] = await Promise.all([
        analyticsService.getRealtimeMetrics(),
        analyticsService.getReport('overview', getStartDate(), new Date()),
        analyticsService.getReport('user_behavior', getStartDate(), new Date()),
        analyticsService.getReport('game_performance', getStartDate(), new Date()),
        analyticsService.getReport('monetization', getStartDate(), new Date())
      ]);

      setRealtimeMetrics(realtime);
      setReports({
        overview: overviewReport,
        user_behavior: userReport,
        game_performance: gameReport,
        monetization: monetizationReport
      });
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Получение начальной даты
  const getStartDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '1d': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  // Форматирование значений
  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ru-RU', { 
          style: 'currency', 
          currency: 'RUB',
          minimumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      case 'number':
      default:
        return new Intl.NumberFormat('ru-RU').format(value);
    }
  };

  // Получение цвета тренда
  const getTrendColor = (trend: 'up' | 'down' | 'stable', change: number): string => {
    if (trend === 'stable' || change === 0) return 'text-gray-500';
    if (trend === 'up' && change > 0) return 'text-green-500';
    if (trend === 'down' && change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // Метрики для карточек
  const getMetricCards = (): MetricCard[] => {
    const overview = reports.overview;
    const userBehavior = reports.user_behavior;
    const monetization = reports.monetization;
    
    if (!overview || !userBehavior || !monetization || !realtimeMetrics) return [];

    return [
      {
        id: 'active_users',
        title: 'Активные пользователи',
        value: realtimeMetrics.activeUsers,
        change: overview.metrics.daily_active_users?.change || 0,
        trend: overview.metrics.daily_active_users?.trend || 'stable',
        icon: Users,
        color: 'bg-blue-500',
        format: 'number'
      },
      {
        id: 'page_views',
        title: 'Просмотры страниц',
        value: overview.metrics.active_sessions?.value || 0,
        change: overview.metrics.active_sessions?.change || 0,
        trend: overview.metrics.active_sessions?.trend || 'stable',
        icon: Eye,
        color: 'bg-green-500',
        format: 'number'
      },
      {
        id: 'session_duration',
        title: 'Время сессии',
        value: userBehavior.metrics.avg_session_duration?.value || 0,
        change: userBehavior.metrics.avg_session_duration?.change || 0,
        trend: userBehavior.metrics.avg_session_duration?.trend || 'stable',
        icon: Clock,
        color: 'bg-purple-500',
        format: 'duration'
      },
      {
        id: 'bounce_rate',
        title: 'Показатель отказов',
        value: userBehavior.metrics.bounce_rate?.value || 0,
        change: userBehavior.metrics.bounce_rate?.change || 0,
        trend: userBehavior.metrics.bounce_rate?.trend || 'stable',
        icon: TrendingUp,
        color: 'bg-orange-500',
        format: 'percentage'
      },
      {
        id: 'games_created',
        title: 'Создано игр',
        value: overview.metrics.games_created?.value || 0,
        change: overview.metrics.games_created?.change || 0,
        trend: overview.metrics.games_created?.trend || 'stable',
        icon: Target,
        color: 'bg-indigo-500',
        format: 'number'
      },
      {
        id: 'revenue',
        title: 'Выручка',
        value: realtimeMetrics.revenueToday,
        change: monetization.metrics.total_revenue?.change || 0,
        trend: monetization.metrics.total_revenue?.trend || 'stable',
        icon: DollarSign,
        color: 'bg-emerald-500',
        format: 'currency'
      },
      {
        id: 'conversion_rate',
        title: 'Конверсия',
        value: monetization.metrics.conversion_rate?.value || 0,
        change: monetization.metrics.conversion_rate?.change || 0,
        trend: monetization.metrics.conversion_rate?.trend || 'stable',
        icon: Activity,
        color: 'bg-cyan-500',
        format: 'percentage'
      },
      {
        id: 'errors',
        title: 'Ошибки за час',
        value: realtimeMetrics.errorsLastHour,
        change: 0,
        trend: 'stable',
        icon: AlertTriangle,
        color: 'bg-red-500',
        format: 'number'
      }
    ];
  };

  // Автообновление
  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 60000); // Каждую минуту
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange, autoRefresh]);

  // Обработка экспорта
  const handleExport = async (type: 'events' | 'sessions' | 'metrics', format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/analytics/export/${type}?format=${format}&startDate=${getStartDate().toISOString()}&endDate=${new Date().toISOString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error);
    }
  };

  const metricCards = getMetricCards();

  if (isLoading && !realtimeMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📈 Аналитика</h1>
              <p className="text-gray-600 mt-1">Подробная статистика и метрики проекта</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Автообновление */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                  autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Авто</span>
              </button>

              {/* Период времени */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">1 день</option>
                <option value="7d">7 дней</option>
                <option value="30d">30 дней</option>
                <option value="90d">90 дней</option>
              </select>

              {/* Экспорт */}
              <div className="relative group">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Экспорт</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="p-2">
                    <button
                      onClick={() => handleExport('events', 'json')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      События (JSON)
                    </button>
                    <button
                      onClick={() => handleExport('events', 'csv')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      События (CSV)
                    </button>
                    <button
                      onClick={() => handleExport('sessions', 'json')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      Сессии (JSON)
                    </button>
                    <button
                      onClick={() => handleExport('metrics', 'json')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      Метрики (JSON)
                    </button>
                  </div>
                </div>
              </div>

              {/* Обновить */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Карточки метрик */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div key={metric.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${metric.color}`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{metric.title}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatValue(Number(metric.value), metric.format)}
                      </p>
                    </div>
                  </div>
                  {metric.change !== 0 && (
                    <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend, metric.change)}`}>
                      <TrendingUp className={`h-4 w-4 ${metric.trend === 'down' ? 'rotate-180' : ''}`} />
                      <span className="text-sm font-medium">
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Вкладки */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Обзор', icon: BarChart3 },
                { id: 'users', name: 'Пользователи', icon: Users },
                { id: 'games', name: 'Игры', icon: Target },
                { id: 'monetization', name: 'Монетизация', icon: DollarSign }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'overview' && (
            <>
              {/* График активности */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Активность пользователей</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>График загружается...</p>
                  </div>
                </div>
              </div>

              {/* Топ события */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Популярные события</h3>
                <div className="space-y-3">
                  {realtimeMetrics?.topEvents.slice(0, 5).map((event, index) => (
                    <div key={event.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{event.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{event.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Источники трафика */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Источники трафика</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Данные загружаются...</p>
                  </div>
                </div>
              </div>

              {/* Устройства */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Устройства пользователей</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                      <span>Мобильные</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">28.5%</div>
                      <div className="text-sm text-gray-500">620 сессий</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-green-500" />
                      <span>Десктопы</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">65.2%</div>
                      <div className="text-sm text-gray-500">1420 сессий</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-purple-500" />
                      <span>Планшеты</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">6.3%</div>
                      <div className="text-sm text-gray-500">137 сессий</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Добавить другие вкладки */}
          {activeTab === 'users' && (
            <div className="col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Аналитика пользователей</h3>
                <p className="text-gray-600">Подробная аналитика поведения пользователей появится здесь.</p>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Аналитика игр</h3>
                <p className="text-gray-600">Статистика по играм и их производительности.</p>
              </div>
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Аналитика монетизации</h3>
                <p className="text-gray-600">Детали по выручке, конверсии и платежам.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 