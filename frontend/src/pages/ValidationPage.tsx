import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Target, 
  FileText, 
  Monitor,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Zap,
  BarChart3,
  Star,
  Clock,
  TrendingUp
} from 'lucide-react';
import GameValidator from '../components/GameValidator';

interface ValidationStats {
  totalValidations: number;
  passedGames: number;
  failedGames: number;
  averageScore: number;
  topIssues: Array<{
    issue: string;
    count: number;
    category: string;
  }>;
  recentValidations: Array<{
    id: string;
    gameName: string;
    score: number;
    status: 'passed' | 'failed' | 'warning';
    timestamp: Date;
  }>;
}

interface QuickCheck {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  estimatedTime: number; // секунды
  severity: 'info' | 'warning' | 'error';
}

const ValidationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'validator' | 'stats' | 'rules' | 'tools'>('validator');
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [quickChecks] = useState<QuickCheck[]>([
    {
      id: 'yandex_sdk',
      name: 'Yandex SDK',
      description: 'Проверка интеграции с Yandex Games SDK',
      icon: Target,
      category: 'integration',
      estimatedTime: 30,
      severity: 'error'
    },
    {
      id: 'file_size',
      name: 'Размер файлов',
      description: 'Проверка соответствия ограничениям по размеру',
      icon: Monitor,
      category: 'technical',
      estimatedTime: 15,
      severity: 'warning'
    },
    {
      id: 'performance',
      name: 'Производительность',
      description: 'Анализ производительности и оптимизации',
      icon: TrendingUp,
      category: 'performance',
      estimatedTime: 60,
      severity: 'info'
    },
    {
      id: 'content_policy',
      name: 'Контент-политика',
      description: 'Соответствие требованиям к контенту',
      icon: FileText,
      category: 'content',
      estimatedTime: 45,
      severity: 'warning'
    }
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/validation/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики валидации:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQuickCheck = async (checkId: string) => {
    try {
      const response = await fetch('/api/validation/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkId, gameId: selectedGameId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Quick check результат:', data);
      }
    } catch (error) {
      console.error('Ошибка быстрой проверки:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const tabs = [
    { 
      key: 'validator', 
      label: 'Валидатор', 
      icon: ShieldCheck, 
      description: 'Основной инструмент валидации игр' 
    },
    { 
      key: 'stats', 
      label: 'Статистика', 
      icon: BarChart3, 
      description: 'Аналитика и тренды валидации' 
    },
    { 
      key: 'rules', 
      label: 'Правила', 
      icon: FileText, 
      description: 'Справочник по требованиям Yandex Games' 
    },
    { 
      key: 'tools', 
      label: 'Инструменты', 
      icon: Settings, 
      description: 'Дополнительные утилиты проверки' 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Загрузка системы валидации...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Центр валидации игр</h1>
          <p className="text-gray-600">
            Проверьте соответствие ваших игр требованиям Yandex Games и исправьте проблемы автоматически
          </p>
        </div>

        {/* Быстрая статистика */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalValidations}</div>
                  <div className="text-sm text-gray-500">Всего проверок</div>
                </div>
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.passedGames}</div>
                  <div className="text-sm text-gray-500">Прошли проверку</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.failedGames}</div>
                  <div className="text-sm text-gray-500">Не прошли</div>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.averageScore.toFixed(0)}</div>
                  <div className="text-sm text-gray-500">Средний балл</div>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>
        )}

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
          {/* Основной валидатор */}
          {activeTab === 'validator' && (
            <GameValidator 
              gameId={selectedGameId}
              onValidationComplete={(report) => {
                console.log('Валидация завершена:', report);
                // Обновляем статистику
                fetchStats();
              }}
            />
          )}

          {/* Статистика валидации */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Топ проблем */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Наиболее частые проблемы</h3>
                <div className="space-y-3">
                  {stats.topIssues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{issue.issue}</div>
                          <div className="text-sm text-gray-500 capitalize">{issue.category}</div>
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-red-600">{issue.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Последние валидации */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Недавние валидации</h3>
                <div className="space-y-3">
                  {stats.recentValidations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Нет недавних валидаций</p>
                    </div>
                  ) : (
                    stats.recentValidations.map((validation) => (
                      <div key={validation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            validation.status === 'passed' ? 'bg-green-500' :
                            validation.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="font-medium text-gray-900">{validation.gameName}</div>
                            <div className="text-sm text-gray-500">
                              {validation.timestamp.toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${getStatusColor(validation.status)}`}>
                            {validation.score}/100
                          </div>
                          <div className="text-sm text-gray-500 capitalize">{validation.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Справочник правил */}
          {activeTab === 'rules' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Требования Yandex Games</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Технические требования */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Технические требования</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Максимальный размер игры: 20 МБ</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Обязательный файл index.html в корне</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Поддержка WebGL 1.0+</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Адаптивный дизайн для мобильных устройств</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Время загрузки до 10 секунд</span>
                    </li>
                  </ul>
                </div>

                {/* SDK интеграция */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">SDK интеграция</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Подключение Yandex Games SDK v2.0+</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Инициализация SDK при загрузке</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Обработка событий жизненного цикла</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Интеграция рекламы (опционально)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Лидерборды и достижения (опционально)</span>
                    </li>
                  </ul>
                </div>

                {/* Контент требования */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Контент требования</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Соответствие возрастным ограничениям</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Отсутствие запрещенного контента</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Поддержка русского языка</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Корректные метаданные игры</span>
                    </li>
                  </ul>
                </div>

                {/* Производительность */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Производительность</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>FPS не менее 30 на мобильных устройствах</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Использование памяти до 100 МБ</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Плавная работа на слабых устройствах</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Оптимизированные ассеты</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Дополнительные инструменты */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Быстрые проверки</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickChecks.map((check) => {
                    const Icon = check.icon;
                    return (
                      <button
                        key={check.id}
                        onClick={() => runQuickCheck(check.id)}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="w-6 h-6 text-gray-500 group-hover:text-blue-500 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{check.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(check.severity)}`}>
                                {check.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{check.description}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>~{check.estimatedTime}с</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Пакетная обработка */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Пакетная обработка</h3>
                <p className="text-gray-600 mb-4">
                  Проверьте несколько игр одновременно для экономии времени
                </p>
                
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Загрузить несколько игр</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    <span>Валидировать все</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                    <Zap className="w-4 h-4" />
                    <span>Автоисправление</span>
                  </button>
                </div>
              </div>

              {/* Экспорт отчетов */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Экспорт отчетов</h3>
                <p className="text-gray-600 mb-4">
                  Сохраните результаты валидации в различных форматах
                </p>
                
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>JSON</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>PDF отчет</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationPage; 