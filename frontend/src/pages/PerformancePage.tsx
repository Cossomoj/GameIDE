import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  Monitor, 
  Settings, 
  TrendingUp, 
  HardDrive,
  Cpu,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Sliders,
  Gauge
} from 'lucide-react';
import PerformanceMonitor from '../components/PerformanceMonitor';
import AssetOptimizer from '../components/AssetOptimizer';

interface PerformanceOverview {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: {
    critical: number;
    warning: number;
    info: number;
  };
  metrics: {
    loadTime: number;
    memoryUsage: number;
    fps: number;
    assetSize: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'configuration' | 'asset';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: number; // процент улучшения
  }>;
}

const PerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitor' | 'optimizer' | 'settings'>('overview');
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/performance/overview');
      const data = await response.json();
      setOverview(data.overview);
    } catch (error) {
      console.error('Ошибка загрузки обзора производительности:', error);
    } finally {
      setLoading(false);
    }
  };

  const runPerformanceAudit = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/performance/audit', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setOverview(data.overview);
      }
    } catch (error) {
      console.error('Ошибка аудита производительности:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { 
      key: 'overview', 
      label: 'Обзор', 
      icon: BarChart3, 
      description: 'Общая производительность и рекомендации' 
    },
    { 
      key: 'monitor', 
      label: 'Мониторинг', 
      icon: Activity, 
      description: 'Отслеживание метрик в реальном времени' 
    },
    { 
      key: 'optimizer', 
      label: 'Оптимизация', 
      icon: Zap, 
      description: 'Сжатие и оптимизация ассетов' 
    },
    { 
      key: 'settings', 
      label: 'Настройки', 
      icon: Settings, 
      description: 'Конфигурация производительности' 
    }
  ];

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Анализируем производительность...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок страницы */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Центр производительности</h1>
          <p className="text-gray-600">
            Мониторинг, анализ и оптимизация производительности ваших игр
          </p>
        </div>

        {/* Навигация */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors relative group ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {tab.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Содержимое табов */}
        <div className="space-y-6">
          {/* Обзор производительности */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              {/* Общий скор */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Скор производительности */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Общий скор</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${getScoreColor(overview.score)}`}>
                              {overview.score}
                            </div>
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getGradeColor(overview.grade)}`}>
                              Оценка: {overview.grade}
                            </div>
                          </div>
                        </div>
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${overview.score}, 100`}
                            className={getScoreColor(overview.score)}
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Проблемы */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Выявленные проблемы</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-red-800">Критичные</span>
                        </div>
                        <span className="text-2xl font-bold text-red-600">{overview.issues.critical}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          <span className="font-medium text-yellow-800">Предупреждения</span>
                        </div>
                        <span className="text-2xl font-bold text-yellow-600">{overview.issues.warning}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-blue-800">Информация</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{overview.issues.info}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ключевые метрики */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ключевые метрики</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-gray-600">Время загрузки</span>
                        </div>
                        <span className="font-semibold">{overview.metrics.loadTime.toFixed(1)}s</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600">Память</span>
                        </div>
                        <span className="font-semibold">{overview.metrics.memoryUsage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Gauge className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-600">FPS</span>
                        </div>
                        <span className="font-semibold">{overview.metrics.fps.toFixed(0)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">Размер ассетов</span>
                        </div>
                        <span className="font-semibold">{(overview.metrics.assetSize / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Действия */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Хотите улучшить производительность?</h4>
                      <p className="text-gray-600 text-sm">Запустите полный аудит для получения детальных рекомендаций</p>
                    </div>
                    <button
                      onClick={runPerformanceAudit}
                      disabled={loading}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <Target className="w-5 h-5" />
                      <span>Запустить аудит</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Рекомендации */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации по оптимизации</h3>
                
                {overview.recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Отличная работа!</h4>
                    <p className="text-gray-600">Ваша система работает оптимально. Рекомендаций нет.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overview.recommendations.map((recommendation, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                                {recommendation.priority === 'high' && 'Высокий приоритет'}
                                {recommendation.priority === 'medium' && 'Средний приоритет'}
                                {recommendation.priority === 'low' && 'Низкий приоритет'}
                              </span>
                              <span className="text-sm text-gray-500 capitalize">{recommendation.type}</span>
                            </div>
                            
                            <h4 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h4>
                            <p className="text-gray-600 text-sm">{recommendation.description}</p>
                            
                            <div className="mt-3 flex items-center space-x-4">
                              <button
                                onClick={() => {
                                  if (recommendation.type === 'optimization') setActiveTab('optimizer');
                                  if (recommendation.type === 'configuration') setActiveTab('settings');
                                  if (recommendation.type === 'asset') setActiveTab('optimizer');
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Исправить →
                              </button>
                            </div>
                          </div>
                          
                          <div className="ml-4 text-center">
                            <div className="text-xl font-bold text-green-600">
                              +{recommendation.impact}%
                            </div>
                            <div className="text-xs text-gray-500">улучшение</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Быстрые действия */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => setActiveTab('monitor')}
                  className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Activity className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-gray-900">Мониторинг в реальном времени</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Отслеживайте производительность ваших игр в режиме реального времени
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('optimizer')}
                  className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Zap className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-gray-900">Оптимизация ассетов</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Сжимайте изображения, аудио и другие ресурсы для ускорения загрузки
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Settings className="w-8 h-8 text-gray-500 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-gray-900">Тонкая настройка</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Настройте параметры производительности под ваши требования
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Мониторинг */}
          {activeTab === 'monitor' && <PerformanceMonitor />}
          
          {/* Оптимизация ассетов */}
          {activeTab === 'optimizer' && <AssetOptimizer />}
          
          {/* Настройки */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки производительности</h3>
              <div className="text-center py-12">
                <Sliders className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Настройки в разработке</h4>
                <p className="text-gray-600">
                  Расширенные настройки производительности будут доступны в следующих версиях
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformancePage; 