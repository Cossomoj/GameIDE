import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout' | 'error';
  duration: number;
  message?: string;
  errors: Array<{
    code: string;
    message: string;
    severity: 'critical' | 'major' | 'minor';
  }>;
  warnings: Array<{
    code: string;
    message: string;
    impact: 'performance' | 'compatibility' | 'usability';
  }>;
}

interface TestReport {
  id: string;
  gameId: string;
  status: 'passed' | 'failed' | 'partial';
  duration: number;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    criticalIssues: number;
  };
  recommendations: string[];
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
}

interface TestStats {
  totalTests: number;
  todayTests: number;
  successRate: number;
  averageExecutionTime: number;
  topIssues: Array<{
    issue: string;
    count: number;
  }>;
  testsByCategory: Record<string, {
    total: number;
    passed: number;
    failed: number;
  }>;
  recentTrends: {
    labels: string[];
    successRates: number[];
    testCounts: number[];
  };
}

const GameTestingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'run' | 'results' | 'scenarios' | 'stats'>('run');
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [stats, setStats] = useState<TestStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [testProgress, setTestProgress] = useState<{
    currentStep: string;
    progress: number;
    logs: string[];
  } | null>(null);

  useEffect(() => {
    loadScenarios();
    loadStats();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await axios.get('/api/testing/scenarios');
      if (response.data.success) {
        setScenarios(response.data.data.scenarios);
      }
    } catch (error) {
      console.error('Ошибка загрузки сценариев:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/testing/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const runFullTest = async (gameData: any) => {
    if (!gameData) {
      alert('Выберите игру для тестирования');
      return;
    }

    setIsRunning(true);
    setTestProgress({ currentStep: 'Инициализация...', progress: 0, logs: [] });

    try {
      const response = await axios.post('/api/testing/run-full', {
        gameRequest: gameData
      });

      if (response.data.success) {
        setTestReport(response.data.data.testReport);
        setTestProgress(null);
      }
    } catch (error) {
      console.error('Ошибка тестирования:', error);
      alert('Ошибка при запуске тестирования');
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async (gameData: any) => {
    if (!gameData) {
      alert('Выберите игру для тестирования');
      return;
    }

    setIsRunning(true);
    setTestProgress({ currentStep: 'Быстрое тестирование...', progress: 0, logs: [] });

    try {
      const response = await axios.post('/api/testing/run-quick', {
        gameData
      });

      if (response.data.success) {
        const quickResult = response.data.data;
        // Создаем упрощенный отчет для быстрого тестирования
        setTestReport({
          id: quickResult.testId,
          gameId: gameData.id,
          status: quickResult.status,
          duration: quickResult.duration,
          summary: {
            totalTests: quickResult.quickSummary.totalCriticalTests,
            passed: quickResult.quickSummary.passed,
            failed: quickResult.quickSummary.failed,
            successRate: quickResult.quickSummary.totalCriticalTests > 0 
              ? Math.round((quickResult.quickSummary.passed / quickResult.quickSummary.totalCriticalTests) * 100)
              : 0,
            criticalIssues: quickResult.criticalIssues
          },
          recommendations: quickResult.recommendations
        });
        setTestProgress(null);
      }
    } catch (error) {
      console.error('Ошибка быстрого тестирования:', error);
      alert('Ошибка при запуске быстрого тестирования');
    } finally {
      setIsRunning(false);
    }
  };

  const runScenario = async (scenario: TestScenario) => {
    setIsRunning(true);
    setTestProgress({ currentStep: `Запуск сценария: ${scenario.name}`, progress: 0, logs: [] });

    try {
      const response = await axios.post('/api/testing/run-scenario', {
        scenario
      });

      if (response.data.success) {
        setTestReport(response.data.data.testReport);
        setTestProgress(null);
      }
    } catch (error) {
      console.error('Ошибка сценарного тестирования:', error);
      alert('Ошибка при запуске сценария');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'partial': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'partial': return '⚠️';
      default: return '⏳';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 Автоматическое тестирование игр
        </h1>
        <p className="text-gray-600">
          Комплексная система проверки качества и соответствия требованиям
        </p>
      </div>

      {/* Табы */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'run', name: 'Запуск тестов', icon: '🚀' },
              { id: 'results', name: 'Результаты', icon: '📊' },
              { id: 'scenarios', name: 'Сценарии', icon: '📝' },
              { id: 'stats', name: 'Статистика', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Вкладка "Запуск тестов" */}
          {activeTab === 'run' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Панель выбора игры */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Выберите игру для тестирования</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="ID игры или путь к файлам"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={selectedGame?.id || ''}
                      onChange={(e) => setSelectedGame({ id: e.target.value, prompt: {} })}
                    />
                    <p className="text-sm text-gray-500">
                      Введите ID существующей игры или создайте новую для тестирования
                    </p>
                  </div>
                </div>

                {/* Панель типов тестирования */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Типы тестирования</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => runQuickTest(selectedGame)}
                      disabled={isRunning || !selectedGame}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      ⚡ Быстрое тестирование (2-3 мин)
                    </button>
                    <button
                      onClick={() => runFullTest(selectedGame)}
                      disabled={isRunning || !selectedGame}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      🔍 Полное тестирование (5-10 мин)
                    </button>
                  </div>
                </div>
              </div>

              {/* Прогресс тестирования */}
              {testProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    {testProgress.currentStep}
                  </h4>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${testProgress.progress}%` }}
                    ></div>
                  </div>
                  {testProgress.logs.length > 0 && (
                    <div className="mt-2 text-sm text-blue-700">
                      {testProgress.logs.slice(-3).map((log, i) => (
                        <div key={i}>• {log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Вкладка "Результаты" */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {testReport ? (
                <>
                  {/* Сводка результатов */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {testReport.summary.totalTests}
                      </div>
                      <div className="text-sm text-gray-600">Всего тестов</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {testReport.summary.passed}
                      </div>
                      <div className="text-sm text-gray-600">Пройдено</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {testReport.summary.failed}
                      </div>
                      <div className="text-sm text-gray-600">Провалено</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {testReport.summary.successRate}%
                      </div>
                      <div className="text-sm text-gray-600">Успешность</div>
                    </div>
                  </div>

                  {/* Статус и время */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getStatusIcon(testReport.status)}</span>
                        <div>
                          <h3 className={`text-lg font-semibold ${getStatusColor(testReport.status)}`}>
                            {testReport.status === 'passed' ? 'Тесты пройдены' :
                             testReport.status === 'failed' ? 'Тесты провалены' :
                             'Частичный успех'}
                          </h3>
                          <p className="text-gray-600">
                            Время выполнения: {Math.round(testReport.duration / 1000)}с
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">ID теста</div>
                        <div className="font-mono text-sm">{testReport.id}</div>
                      </div>
                    </div>
                  </div>

                  {/* Рекомендации */}
                  {testReport.recommendations.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">
                        💡 Рекомендации по улучшению
                      </h4>
                      <ul className="space-y-1">
                        {testReport.recommendations.map((rec, i) => (
                          <li key={i} className="text-yellow-800 text-sm">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Критические проблемы */}
                  {testReport.summary.criticalIssues > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">
                        🚨 Критические проблемы ({testReport.summary.criticalIssues})
                      </h4>
                      <p className="text-red-800 text-sm">
                        Обнаружены критические проблемы, которые могут помешать публикации игры.
                        Рекомендуется исправить их перед загрузкой на платформу.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🧪</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Нет результатов тестирования
                  </h3>
                  <p className="text-gray-600">
                    Запустите тестирование во вкладке "Запуск тестов" чтобы увидеть результаты
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Вкладка "Сценарии" */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Предустановленные сценарии тестирования</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 mb-2">{scenario.name}</h4>
                    <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
                    <button
                      onClick={() => runScenario(scenario)}
                      disabled={isRunning}
                      className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Запустить сценарий
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вкладка "Статистика" */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Общая статистика */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalTests}</div>
                  <div className="text-sm text-gray-600">Всего тестов</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.todayTests}</div>
                  <div className="text-sm text-gray-600">Сегодня</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
                  <div className="text-sm text-gray-600">Успешность</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {Math.round(stats.averageExecutionTime / 1000)}с
                  </div>
                  <div className="text-sm text-gray-600">Среднее время</div>
                </div>
              </div>

              {/* Топ проблем */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">🔥 Самые частые проблемы</h4>
                <div className="space-y-2">
                  {stats.topIssues.map((issue, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <span className="text-gray-800">{issue.issue}</span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {issue.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Статистика по категориям */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">📊 Статистика по категориям</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats.testsByCategory).map(([category, data]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 capitalize mb-2">{category}</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Всего:</span>
                          <span className="font-medium">{data.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Пройдено:</span>
                          <span className="text-green-600 font-medium">{data.passed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Провалено:</span>
                          <span className="text-red-600 font-medium">{data.failed}</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(data.passed / data.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameTestingDashboard; 