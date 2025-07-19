import React, { useState, useEffect } from 'react';
import {
  TestTube,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Download,
  Settings,
  Eye,
  Zap,
  Shield,
  Users,
  Monitor,
  Smartphone,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Bug,
  Award,
  Filter,
  Search,
  Plus
} from 'lucide-react';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'compatibility' | 'security' | 'accessibility' | 'usability';
  severity: 'critical' | 'major' | 'minor' | 'info';
  automated: boolean;
  estimatedDuration: number;
  tests: Array<{
    id: string;
    name: string;
    type: string;
    priority: string;
  }>;
}

interface TestExecution {
  id: string;
  gameId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  environment: {
    browser: string;
    device: string;
    resolution: string;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  issues: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
  }>;
  performance: {
    loadTime: number;
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
  };
}

interface GameTestingManagerProps {
  gameId: string;
  onTestCompleted?: (execution: TestExecution) => void;
  onError?: (error: string) => void;
}

const GameTestingManager: React.FC<GameTestingManagerProps> = ({
  gameId,
  onTestCompleted,
  onError
}) => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'suites' | 'executions' | 'quality' | 'reports'>('overview');
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [gameQuality, setGameQuality] = useState<any>(null);

  useEffect(() => {
    fetchTestSuites();
    fetchExecutions();
    fetchGameQuality();
  }, [gameId]);

  const fetchTestSuites = async () => {
    try {
      const response = await fetch('/api/testing/test-suites');
      const data = await response.json();
      
      if (data.success) {
        setTestSuites(data.data.testSuites);
      }
    } catch (error) {
      console.error('Ошибка загрузки тестовых наборов:', error);
      onError?.('Не удалось загрузить тестовые наборы');
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await fetch(`/api/testing/games/${gameId}/executions?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setExecutions(data.data.executions.map((execution: any) => ({
          ...execution,
          startTime: new Date(execution.startTime),
          endTime: execution.endTime ? new Date(execution.endTime) : undefined
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки результатов тестирования:', error);
      onError?.('Не удалось загрузить результаты тестирования');
    } finally {
      setLoading(false);
    }
  };

  const fetchGameQuality = async () => {
    try {
      const response = await fetch(`/api/testing/games/${gameId}/quality`);
      const data = await response.json();
      
      if (data.success) {
        setGameQuality(data.data.quality);
      }
    } catch (error) {
      console.error('Ошибка анализа качества игры:', error);
    }
  };

  const runTests = async (testSuiteIds: string[]) => {
    try {
      setRunningTests(testSuiteIds);

      const response = await fetch(`/api/testing/games/${gameId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSuiteIds,
          triggeredBy: 'user',
          trigger: 'manual',
          tags: ['manual-test']
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const execution = data.data.execution;
        // Обновляем список выполнений
        await fetchExecutions();
        onTestCompleted?.(execution);
        
        // Запускаем периодическое обновление статуса
        pollExecutionStatus(execution.id);
      } else {
        onError?.(data.error || 'Не удалось запустить тесты');
      }
    } catch (error) {
      console.error('Ошибка запуска тестов:', error);
      onError?.('Ошибка запуска тестов');
    } finally {
      setRunningTests([]);
    }
  };

  const pollExecutionStatus = async (executionId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/testing/executions/${executionId}`);
        const data = await response.json();
        
        if (data.success && data.data.execution.status !== 'running') {
          await fetchExecutions();
          await fetchGameQuality();
          return;
        }
        
        if (data.success && data.data.execution.status === 'running') {
          setTimeout(poll, 5000); // Проверяем каждые 5 секунд
        }
      } catch (error) {
        console.error('Ошибка получения статуса:', error);
      }
    };

    poll();
  };

  const generateReport = async (executionId: string, format: string = 'html') => {
    try {
      const response = await fetch(`/api/testing/executions/${executionId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      const data = await response.json();
      
      if (data.success) {
        // В реальной реализации здесь был бы download файла
        window.open(data.data.reportPath, '_blank');
      } else {
        onError?.(data.error || 'Не удалось сгенерировать отчет');
      }
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      onError?.('Ошибка генерации отчета');
    }
  };

  const formatDuration = (milliseconds?: number) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'functional': return <TestTube className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'compatibility': return <Monitor className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'accessibility': return <Users className="w-4 h-4" />;
      case 'usability': return <Target className="w-4 h-4" />;
      default: return <TestTube className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'functional': return 'text-blue-600 bg-blue-100';
      case 'performance': return 'text-green-600 bg-green-100';
      case 'compatibility': return 'text-purple-600 bg-purple-100';
      case 'security': return 'text-red-600 bg-red-100';
      case 'accessibility': return 'text-yellow-600 bg-yellow-100';
      case 'usability': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-gray-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredTestSuites = testSuites.filter(suite => {
    const matchesSearch = searchQuery === '' || 
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || suite.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка данных тестирования...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <TestTube className="w-7 h-7 text-blue-500 mr-3" />
              Автоматическое тестирование
            </h2>
            <p className="text-gray-600 mt-1">
              Тестирование функциональности, производительности и качества игры
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchExecutions()}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Обновить</span>
            </button>
            
            <button
              onClick={() => setActiveTab('suites')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Запустить тесты</span>
            </button>
          </div>
        </div>

        {/* Быстрая статистика */}
        {gameQuality && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{gameQuality.overallScore}%</div>
                  <div className="text-sm text-blue-700">Общий балл качества</div>
                </div>
                <Award className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{executions.length}</div>
                  <div className="text-sm text-green-700">Всего тестирований</div>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {Object.values(gameQuality.categories).reduce((sum: number, cat: any) => sum + cat.issues, 0)}
                  </div>
                  <div className="text-sm text-yellow-700">Найдено проблем</div>
                </div>
                <Bug className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600 flex items-center">
                    {gameQuality.trend === 'improving' && <TrendingUp className="w-6 h-6 mr-1" />}
                    {gameQuality.trend === 'declining' && <TrendingDown className="w-6 h-6 mr-1" />}
                    {gameQuality.trend === 'stable' && <span className="w-6 h-6 mr-1">→</span>}
                    {gameQuality.trend}
                  </div>
                  <div className="text-sm text-purple-700">Тренд качества</div>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Навигация */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0">
            {[
              { key: 'overview', label: 'Обзор', icon: Eye },
              { key: 'suites', label: 'Тестовые наборы', icon: TestTube },
              { key: 'executions', label: 'Результаты', icon: BarChart3 },
              { key: 'quality', label: 'Качество', icon: Award },
              { key: 'reports', label: 'Отчеты', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Содержимое табов */}
        <div className="p-6">
          {/* Обзор */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Последние выполнения */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние тестирования</h3>
                
                {executions.length === 0 ? (
                  <div className="text-center py-8">
                    <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Тестирование не запускалось
                    </h4>
                    <p className="text-gray-500 mb-4">
                      Запустите первое тестирование для анализа качества игры
                    </p>
                    <button
                      onClick={() => setActiveTab('suites')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Выбрать тесты
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.slice(0, 5).map((execution) => (
                      <div key={execution.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(execution.status)}
                            <div>
                              <div className="font-medium text-gray-900">
                                Тестирование {formatDate(execution.startTime)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {execution.environment.browser} • {execution.environment.device} • {execution.environment.resolution}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-green-600">{execution.summary.passed}</div>
                              <div className="text-gray-500">Успешно</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-red-600">{execution.summary.failed}</div>
                              <div className="text-gray-500">Провалено</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-blue-600">{execution.summary.successRate.toFixed(1)}%</div>
                              <div className="text-gray-500">Успешность</div>
                            </div>
                            
                            <button
                              onClick={() => generateReport(execution.id)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Скачать отчет"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Рекомендации */}
              {gameQuality && gameQuality.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации по улучшению</h3>
                  <div className="space-y-3">
                    {gameQuality.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-gray-900">{rec.action}</div>
                            <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                            <div className="text-xs text-yellow-700 mt-2">
                              Приоритет: {rec.priority}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Тестовые наборы */}
          {activeTab === 'suites' && (
            <div className="space-y-6">
              {/* Фильтры и поиск */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Поиск тестовых наборов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все категории</option>
                    <option value="functional">Функциональные</option>
                    <option value="performance">Производительность</option>
                    <option value="compatibility">Совместимость</option>
                    <option value="security">Безопасность</option>
                    <option value="accessibility">Доступность</option>
                    <option value="usability">Юзабилити</option>
                  </select>
                </div>

                {selectedSuites.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Выбрано: {selectedSuites.length}</span>
                    <button
                      onClick={() => runTests(selectedSuites)}
                      disabled={runningTests.length > 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Запустить выбранные</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Список тестовых наборов */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTestSuites.map((suite) => (
                  <div key={suite.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedSuites.includes(suite.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuites(prev => [...prev, suite.id]);
                            } else {
                              setSelectedSuites(prev => prev.filter(id => id !== suite.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className={`p-2 rounded-lg ${getCategoryColor(suite.category)}`}>
                          {getCategoryIcon(suite.category)}
                        </div>
                      </div>
                      
                      <span className={`text-xs px-2 py-1 rounded ${
                        suite.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        suite.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                        suite.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {suite.severity}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{suite.name}</h3>
                      <p className="text-gray-600 text-sm line-clamp-3">{suite.description}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Тестов:</span>
                        <span className="font-medium">{suite.tests.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Время:</span>
                        <span className="font-medium">{Math.ceil(suite.estimatedDuration / 60)} мин</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Автоматизация:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          suite.automated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {suite.automated ? 'Авто' : 'Ручная'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => runTests([suite.id])}
                        disabled={runningTests.includes(suite.id)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {runningTests.includes(suite.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>Запустить</span>
                      </button>
                      
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Результаты выполнения */}
          {activeTab === 'executions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">История тестирований</h3>
                <button
                  onClick={() => window.location.href = `/api/testing/games/${gameId}/export`}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Экспорт</span>
                </button>
              </div>

              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Нет результатов тестирования
                  </h4>
                  <p className="text-gray-500">
                    Запустите тесты, чтобы увидеть результаты
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {executions.map((execution) => (
                    <div key={execution.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <div className="font-semibold text-gray-900">
                              Тестирование {formatDate(execution.startTime)}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {execution.id}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => generateReport(execution.id, 'html')}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="HTML отчет"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generateReport(execution.id, 'json')}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="JSON отчет"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">{execution.summary.total}</div>
                          <div className="text-sm text-gray-500">Всего тестов</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{execution.summary.passed}</div>
                          <div className="text-sm text-green-700">Успешно</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">{execution.summary.failed}</div>
                          <div className="text-sm text-red-700">Провалено</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{execution.summary.successRate.toFixed(1)}%</div>
                          <div className="text-sm text-blue-700">Успешность</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Время загрузки:</span>
                          <span className="ml-2 font-medium">{execution.performance.loadTime}мс</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Память:</span>
                          <span className="ml-2 font-medium">{execution.performance.memoryUsage}МБ</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPU:</span>
                          <span className="ml-2 font-medium">{execution.performance.cpuUsage}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">FPS:</span>
                          <span className="ml-2 font-medium">{execution.performance.fps}</span>
                        </div>
                      </div>

                      {execution.issues.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-gray-900 mb-2">
                            Найденные проблемы ({execution.issues.length}):
                          </div>
                          <div className="space-y-2">
                            {execution.issues.slice(0, 3).map((issue) => (
                              <div key={issue.id} className="text-sm bg-red-50 border border-red-200 rounded p-2">
                                <div className="font-medium text-red-800">{issue.title}</div>
                                <div className="text-red-600">{issue.description}</div>
                              </div>
                            ))}
                            {execution.issues.length > 3 && (
                              <div className="text-sm text-gray-500">
                                и еще {execution.issues.length - 3} проблем...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Анализ качества */}
          {activeTab === 'quality' && gameQuality && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Общий балл */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Общий балл качества</h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{gameQuality.overallScore}%</div>
                    <div className="text-gray-600">
                      {gameQuality.overallScore >= 80 ? 'Отличное качество' :
                       gameQuality.overallScore >= 60 ? 'Хорошее качество' :
                       gameQuality.overallScore >= 40 ? 'Удовлетворительное качество' :
                       'Требует улучшений'}
                    </div>
                  </div>
                </div>

                {/* Тренд */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Тренд качества</h3>
                  <div className="flex items-center justify-center space-x-3">
                    {gameQuality.trend === 'improving' && (
                      <>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <span className="text-lg font-medium text-green-600">Улучшается</span>
                      </>
                    )}
                    {gameQuality.trend === 'declining' && (
                      <>
                        <TrendingDown className="w-8 h-8 text-red-500" />
                        <span className="text-lg font-medium text-red-600">Ухудшается</span>
                      </>
                    )}
                    {gameQuality.trend === 'stable' && (
                      <>
                        <BarChart3 className="w-8 h-8 text-blue-500" />
                        <span className="text-lg font-medium text-blue-600">Стабильное</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Категории */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Качество по категориям</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(gameQuality.categories).map(([category, data]: [string, any]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                          {getCategoryIcon(category)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">{category}</div>
                          <div className="text-sm text-gray-500">
                            {data.lastTested ? formatDate(new Date(data.lastTested)) : 'Не тестировалось'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Балл:</span>
                          <span className="font-semibold text-gray-900">{data.score}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Проблемы:</span>
                          <span className={`font-semibold ${data.issues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {data.issues}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Отчеты */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Генерация отчетов
                </h3>
                <p className="text-gray-500">
                  Выберите выполнение тестов из вкладки "Результаты" для генерации отчета
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameTestingManager; 