import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, FunnelChart, Funnel
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Activity, DollarSign, Target,
  AlertTriangle, CheckCircle, Clock, Eye, Download, Filter,
  Calendar, Zap, Brain, Bell, Settings, RefreshCw, Search,
  ArrowUp, ArrowDown, Minus, Play, Pause, MoreVertical,
  FileText, Share, BookOpen, Star, Award, Shield
} from 'lucide-react';

interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  icon: React.ComponentType<any>;
  color: string;
  target?: number;
}

interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'funnel';
  data: any[];
  config: any;
  insights?: string[];
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: string;
  metric: string;
  currentValue: number;
}

interface AdvancedAnalyticsDashboardProps {
  gameId?: string;
  refreshInterval?: number;
  onAlertTriggered?: (alert: Alert) => void;
  onMetricClicked?: (metricId: string) => void;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  gameId,
  refreshInterval = 30000,
  onAlertTriggered,
  onMetricClicked
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'reports' | 'funnels' | 'cohorts' | 'alerts'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Данные дашборда
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, gameId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Загружаем данные дашборда
      const response = await fetch('/api/advanced-analytics/dashboard');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
        setMetrics(transformMetrics(data.data.metrics));
        setCharts(generateCharts(data.data));
        setAlerts(data.data.alerts || []);
      }

      // Загружаем отчеты
      const reportsResponse = await fetch('/api/advanced-analytics/reports?limit=10');
      const reportsData = await reportsResponse.json();
      if (reportsData.success) {
        setReports(reportsData.data.reports);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformMetrics = (rawMetrics: any[]): MetricCard[] => {
    const metricConfigs = {
      daily_active_users: {
        title: 'Активные пользователи',
        icon: Users,
        color: 'text-blue-600',
        unit: 'пользователей',
        target: 1000
      },
      total_games: {
        title: 'Всего игр',
        icon: Activity,
        color: 'text-green-600',
        unit: 'игр'
      },
      avg_play_time: {
        title: 'Среднее время игры',
        icon: Clock,
        color: 'text-purple-600',
        unit: 'минут'
      },
      system_cpu: {
        title: 'Загрузка CPU',
        icon: Zap,
        color: 'text-yellow-600',
        unit: '%'
      },
      system_memory: {
        title: 'Использование памяти',
        icon: Target,
        color: 'text-red-600',
        unit: '%'
      }
    };

    return rawMetrics.map(metric => {
      const config = metricConfigs[metric.id as keyof typeof metricConfigs] || {
        title: metric.name,
        icon: Activity,
        color: 'text-gray-600',
        unit: metric.unit
      };

      return {
        id: metric.id,
        title: config.title,
        value: formatMetricValue(metric.value, metric.unit),
        previousValue: metric.previousValue,
        change: metric.change,
        changePercent: metric.changePercent,
        trend: metric.trend,
        unit: config.unit,
        icon: config.icon,
        color: config.color,
        target: config.target
      };
    });
  };

  const generateCharts = (data: any): ChartData[] => {
    const charts: ChartData[] = [];

    // График активных пользователей
    if (data.trends) {
      charts.push({
        id: 'user_activity',
        title: 'Активность пользователей',
        type: 'line',
        data: generateTimeSeriesData('users', 24),
        config: { stroke: '#3b82f6' }
      });

      // График производительности системы
      charts.push({
        id: 'system_performance',
        title: 'Производительность системы',
        type: 'area',
        data: generateTimeSeriesData('performance', 24),
        config: { fill: '#10b981' }
      });

      // Распределение игр по жанрам
      charts.push({
        id: 'games_by_genre',
        title: 'Игры по жанрам',
        type: 'pie',
        data: [
          { name: 'Аркады', value: 35, fill: '#3b82f6' },
          { name: 'Платформеры', value: 25, fill: '#10b981' },
          { name: 'Головоломки', value: 20, fill: '#f59e0b' },
          { name: 'Экшен', value: 15, fill: '#ef4444' },
          { name: 'Другие', value: 5, fill: '#6b7280' }
        ],
        config: {}
      });

      // График воронки конверсии
      charts.push({
        id: 'conversion_funnel',
        title: 'Воронка конверсии',
        type: 'funnel',
        data: [
          { name: 'Посетители', value: 1000, fill: '#3b82f6' },
          { name: 'Регистрация', value: 750, fill: '#10b981' },
          { name: 'Первая игра', value: 500, fill: '#f59e0b' },
          { name: 'Повторная игра', value: 300, fill: '#ef4444' },
          { name: 'Активные', value: 150, fill: '#8b5cf6' }
        ],
        config: {},
        insights: [
          'Высокий отток после регистрации (25%)',
          'Критичная точка - переход к первой игре'
        ]
      });
    }

    return charts;
  };

  const generateTimeSeriesData = (type: string, hours: number) => {
    const data = [];
    const now = new Date();

    for (let i = hours; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      let value;

      switch (type) {
        case 'users':
          value = Math.floor(Math.random() * 500) + 100 + Math.sin(i / 4) * 50;
          break;
        case 'performance':
          value = Math.floor(Math.random() * 30) + 60 + Math.sin(i / 6) * 10;
          break;
        default:
          value = Math.random() * 100;
      }

      data.push({
        time: time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        value: Math.round(value),
        timestamp: time.toISOString()
      });
    }

    return data;
  };

  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === 'seconds') {
      return `${Math.round(value / 60)}`;
    }
    if (unit === 'percent') {
      return `${Math.round(value)}`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return Math.round(value).toString();
  };

  const getTrendIcon = (trend: string, change?: number) => {
    if (trend === 'up' || (change && change > 0)) {
      return <ArrowUp className="w-4 h-4 text-green-500" />;
    }
    if (trend === 'down' || (change && change < 0)) {
      return <ArrowDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const filteredMetrics = useMemo(() => {
    return metrics.filter(metric => {
      const matchesSearch = metric.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || metric.id.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [metrics, searchQuery, selectedCategory]);

  const exportData = async (type: string, format: string) => {
    try {
      const response = await fetch('/api/advanced-analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id: 'dashboard',
          format,
          dateRange: { period: timeRange }
        })
      });

      const data = await response.json();
      if (data.success) {
        // В реальном приложении здесь была бы загрузка файла
        window.open(data.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const renderChart = (chart: ChartData) => {
    const chartProps = {
      data: chart.data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chart.type) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={chart.config.stroke || '#3b82f6'} 
              strokeWidth={2}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              fill={chart.config.fill || '#10b981'} 
              stroke={chart.config.fill || '#10b981'}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={chart.config.fill || '#3b82f6'} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      default:
        return <div>Неподдерживаемый тип графика</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и управление */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-2">
                <BarChart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Продвинутая аналитика</h2>
                <p className="text-gray-600">Интерактивные метрики и инсайты в реальном времени</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Временной диапазон */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Последний час</option>
                <option value="24h">24 часа</option>
                <option value="7d">7 дней</option>
                <option value="30d">30 дней</option>
                <option value="90d">90 дней</option>
              </select>

              {/* Автообновление */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg ${autoRefresh ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}`}
                title={autoRefresh ? 'Отключить автообновление' : 'Включить автообновление'}
              >
                {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* Обновить */}
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                title="Обновить данные"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Экспорт */}
              <div className="relative group">
                <button className="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  <Download className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => exportData('dashboard', 'json')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Экспорт JSON
                  </button>
                  <button
                    onClick={() => exportData('dashboard', 'csv')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Экспорт CSV
                  </button>
                  <button
                    onClick={() => exportData('dashboard', 'pdf')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Экспорт PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Обзор', icon: Eye },
              { id: 'metrics', label: 'Метрики', icon: TrendingUp },
              { id: 'reports', label: 'Отчеты', icon: FileText },
              { id: 'funnels', label: 'Воронки', icon: Target },
              { id: 'cohorts', label: 'Когорты', icon: Users },
              { id: 'alerts', label: 'Алерты', icon: Bell }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Обзор */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Ключевые метрики */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ключевые метрики</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.slice(0, 4).map(metric => (
                  <div
                    key={metric.id}
                    onClick={() => onMetricClicked?.(metric.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <metric.icon className={`w-6 h-6 ${metric.color}`} />
                      {getTrendIcon(metric.trend, metric.change)}
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-2xl font-bold text-gray-900">
                        {metric.value} <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
                      </div>
                      <div className="text-sm text-gray-600">{metric.title}</div>
                    </div>
                    
                    {metric.changePercent !== undefined && (
                      <div className={`text-xs flex items-center space-x-1 ${
                        metric.changePercent > 0 ? 'text-green-600' : 
                        metric.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <span>{metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%</span>
                        <span className="text-gray-400">за период</span>
                      </div>
                    )}

                    {metric.target && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Цель: {metric.target}</span>
                          <span>{Math.round((Number(metric.value) / metric.target) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all" 
                            style={{ width: `${Math.min(100, (Number(metric.value) / metric.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Графики */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Визуализация данных</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.map(chart => (
                  <div key={chart.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">{chart.title}</h4>
                      <div className="flex space-x-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {renderChart(chart)}
                      </ResponsiveContainer>
                    </div>

                    {chart.insights && chart.insights.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Инсайты</span>
                        </div>
                        <ul className="text-sm text-blue-800 space-y-1">
                          {chart.insights.map((insight, index) => (
                            <li key={index}>• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Алерты */}
            {alerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Активные алерты</h3>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${getAlertColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 mt-0.5" />
                          <div>
                            <div className="font-semibold">{alert.title}</div>
                            <div className="text-sm mt-1">{alert.description}</div>
                            <div className="text-xs mt-2 opacity-75">
                              Метрика: {alert.metric} • Значение: {alert.currentValue} • 
                              {new Date(alert.triggeredAt).toLocaleString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.status === 'active' ? 'bg-red-100 text-red-800' :
                          alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.status === 'active' ? 'Активен' :
                           alert.status === 'acknowledged' ? 'Принят' :
                           'Решен'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Метрики */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Поиск и фильтры */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск метрик..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все категории</option>
                <option value="user">Пользователи</option>
                <option value="game">Игры</option>
                <option value="system">Система</option>
                <option value="performance">Производительность</option>
              </select>
            </div>

            {/* Список метрик */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMetrics.map(metric => (
                <div
                  key={metric.id}
                  onClick={() => onMetricClicked?.(metric.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend, metric.change)}
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="text-xl font-bold text-gray-900">
                      {metric.value} <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
                    </div>
                    <div className="text-sm text-gray-600">{metric.title}</div>
                  </div>
                  
                  {metric.changePercent !== undefined && (
                    <div className={`text-xs ${
                      metric.changePercent > 0 ? 'text-green-600' : 
                      metric.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}% за период
                    </div>
                  )}

                  {metric.previousValue !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      Предыдущее значение: {formatMetricValue(metric.previousValue, metric.unit)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Отчеты */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Аналитические отчеты</h3>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span>Создать отчет</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map(report => (
                <div key={report.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      report.type === 'dashboard' ? 'bg-blue-100 text-blue-800' :
                      report.type === 'automated' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.type === 'dashboard' ? 'Дашборд' :
                       report.type === 'automated' ? 'Автоматический' :
                       'Пользовательский'}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-semibold text-gray-900">{report.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{report.description}</div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(report.generatedAt).toLocaleDateString('ru-RU')}</span>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">Просмотр</button>
                      <button className="text-gray-600 hover:text-gray-800">Скачать</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Воронки */}
        {activeTab === 'funnels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Анализ воронок</h3>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span>Создать воронку</span>
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">Анализ конверсии</span>
              </div>
              <p className="text-yellow-800 mt-1 text-sm">
                Создайте воронки для анализа пользовательских путей и выявления точек оттока
              </p>
            </div>

            {/* Пример воронки */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-4">Воронка регистрации</h4>
              
              <div className="space-y-3">
                {[
                  { step: 'Посещение сайта', users: 1000, rate: 100 },
                  { step: 'Просмотр игр', users: 750, rate: 75 },
                  { step: 'Регистрация', users: 500, rate: 50 },
                  { step: 'Первая игра', users: 300, rate: 30 },
                  { step: 'Повторная игра', users: 150, rate: 15 }
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-24 text-sm text-gray-600">{step.step}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                      <div 
                        className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all"
                        style={{ width: `${step.rate}%` }}
                      >
                        {step.users} ({step.rate}%)
                      </div>
                    </div>
                    {index > 0 && (
                      <div className="w-16 text-right text-sm text-red-600">
                        -{100 - step.rate}%
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-900 mb-1">Критические точки:</div>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Большой отток на этапе регистрации (25%)</li>
                  <li>• Проблема с удержанием после первой игры (40%)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Когорты */}
        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Когортный анализ</h3>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span>Создать когорту</span>
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Анализ удержания</span>
              </div>
              <p className="text-purple-800 mt-1 text-sm">
                Отслеживайте поведение групп пользователей во времени для понимания паттернов удержания
              </p>
            </div>

            {/* Таблица когорт */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Когорта</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">Размер</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">День 0</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">День 1</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">День 7</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">День 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { period: '2024-01', size: 1000, d0: 100, d1: 75, d7: 45, d30: 25 },
                    { period: '2024-02', size: 1200, d0: 100, d1: 80, d7: 50, d30: 30 },
                    { period: '2024-03', size: 1100, d0: 100, d1: 78, d7: 48, d30: 28 },
                    { period: '2024-04', size: 1300, d0: 100, d1: 82, d7: 52, d30: 32 }
                  ].map((cohort, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{cohort.period}</td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">{cohort.size}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                          {cohort.d0}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {cohort.d1}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                          {cohort.d7}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                          {cohort.d30}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Алерты */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Управление алертами</h3>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span>Создать алерт</span>
              </button>
            </div>

            {/* Статистика алертов */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Критичные</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  {alerts.filter(a => a.severity === 'critical').length}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Предупреждения</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900 mt-1">
                  {alerts.filter(a => a.severity === 'warning').length}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Активные</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {alerts.filter(a => a.status === 'active').length}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Решенные</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {alerts.filter(a => a.status === 'resolved').length}
                </div>
              </div>
            </div>

            {/* Список алертов */}
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className={`p-4 border rounded-lg ${getAlertColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{alert.title}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.severity === 'critical' ? 'Критично' :
                             alert.severity === 'warning' ? 'Предупреждение' :
                             'Информация'}
                          </span>
                        </div>
                        <div className="text-sm mt-1">{alert.description}</div>
                        <div className="text-xs mt-2 opacity-75">
                          Метрика: {alert.metric} • Значение: {alert.currentValue} • 
                          {new Date(alert.triggeredAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.status === 'active' ? 'bg-red-100 text-red-800' :
                        alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {alert.status === 'active' ? 'Активен' :
                         alert.status === 'acknowledged' ? 'Принят' :
                         'Решен'}
                      </div>
                      
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard; 