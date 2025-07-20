import React, { useState, useEffect } from 'react';
import regressionTestingService, {
  RegressionTestResult,
  TemplateAnalysis,
  TemplateTestConfig,
  RegressionTestingHealth
} from '../services/regressionTesting';

const RegressionTestingDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<RegressionTestResult[]>([]);
  const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis[]>([]);
  const [health, setHealth] = useState<RegressionTestingHealth | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testProgress, setTestProgress] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<RegressionTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'templates' | 'results'>('overview');
  const [customTestConfig, setCustomTestConfig] = useState<Partial<TemplateTestConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [resultsData, analysisData, healthData, statsData] = await Promise.all([
        regressionTestingService.getTestResults(20),
        regressionTestingService.getTemplateAnalysis(),
        regressionTestingService.getHealth(),
        regressionTestingService.getTestStatistics()
      ]);

      setTestResults(resultsData);
      setTemplateAnalysis(analysisData);
      setHealth(healthData);
      setStatistics(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runQuickTest = async (templatePath: string, gameType?: string) => {
    setIsRunningTest(true);
    setTestProgress('Инициализация теста...');
    
    try {
      setTestProgress('Создание снапшота шаблона...');
      const result = await regressionTestingService.runQuickTest(templatePath, gameType);
      
      setTestProgress('Тест завершен!');
      setTestResults(prev => [result, ...prev]);
      setSelectedResult(result);
      
      // Обновляем статистику
      const newStats = await regressionTestingService.getTestStatistics();
      setStatistics(newStats);
      
    } catch (err) {
      setError(`Ошибка при выполнении теста: ${err.message}`);
    } finally {
      setIsRunningTest(false);
      setTestProgress('');
    }
  };

  const runCustomTest = async () => {
    if (!selectedTemplate || !customTestConfig.testScenarios?.length) {
      setError('Выберите шаблон и добавьте тестовые сценарии');
      return;
    }

    setIsRunningTest(true);
    setTestProgress('Запуск пользовательского теста...');
    
    try {
      const testConfig: TemplateTestConfig = {
        templatePath: selectedTemplate,
        testScenarios: customTestConfig.testScenarios || [],
        regressionThresholds: customTestConfig.regressionThresholds || {
          generationTimeIncrease: 50,
          qualityDecrease: 20,
          performanceDecrease: 30
        }
      };

      const result = await regressionTestingService.runTest(selectedTemplate, testConfig);
      
      setTestProgress('Пользовательский тест завершен!');
      setTestResults(prev => [result, ...prev]);
      setSelectedResult(result);
      
    } catch (err) {
      setError(`Ошибка при выполнении пользовательского теста: ${err.message}`);
    } finally {
      setIsRunningTest(false);
      setTestProgress('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (ms: number) => {
    return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Регрессионное тестирование шаблонов
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-4 border-b">
          {[
            { id: 'overview', label: 'Обзор' },
            { id: 'tests', label: 'Тесты' },
            { id: 'templates', label: 'Шаблоны' },
            { id: 'results', label: 'Результаты' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Statistics Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Всего тестов</h3>
            <p className="text-3xl font-bold text-blue-600">{statistics?.totalTests || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Успешность</h3>
            <p className="text-3xl font-bold text-green-600">
              {statistics?.successRate ? `${statistics.successRate.toFixed(1)}%` : '0%'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Среднее время</h3>
            <p className="text-3xl font-bold text-purple-600">
              {statistics?.avgExecutionTime ? formatTime(statistics.avgExecutionTime) : '0ms'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Регрессии</h3>
            <p className="text-3xl font-bold text-red-600">
              {statistics?.regressionRate ? `${statistics.regressionRate.toFixed(1)}%` : '0%'}
            </p>
          </div>

          {/* System Health */}
          {health && (
            <div className="bg-white rounded-lg shadow p-6 col-span-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Состояние системы</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Статус</p>
                  <p className={`font-medium ${health.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {health.status === 'healthy' ? 'Здоровая' : 'Есть проблемы'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Снапшоты</p>
                  <p className="font-medium text-gray-900">{health.counts.snapshots}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Результаты</p>
                  <p className="font-medium text-gray-900">{health.counts.results}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Последняя проверка</p>
                  <p className="font-medium text-gray-900">{formatDate(health.lastCheck)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          {/* Quick Test Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Быстрое тестирование</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
                disabled={isRunningTest}
              >
                <option value="">Выберите шаблон</option>
                {templateAnalysis.map(template => (
                  <option key={template.templatePath} value={template.templatePath}>
                    {template.fileName} (сложность: {template.metrics.complexity})
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => runQuickTest(selectedTemplate)}
                disabled={!selectedTemplate || isRunningTest}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunningTest ? 'Выполняется...' : 'Запустить быстрый тест'}
              </button>
            </div>

            {testProgress && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
                <p className="text-blue-800">{testProgress}</p>
              </div>
            )}
          </div>

          {/* Custom Test Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Пользовательский тест</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пороги регрессии
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600">Увеличение времени (%)</label>
                    <input
                      type="number"
                      value={customTestConfig.regressionThresholds?.generationTimeIncrease || 50}
                      onChange={(e) => setCustomTestConfig(prev => ({
                        ...prev,
                        regressionThresholds: {
                          ...prev.regressionThresholds,
                          generationTimeIncrease: Number(e.target.value),
                          qualityDecrease: prev.regressionThresholds?.qualityDecrease || 20,
                          performanceDecrease: prev.regressionThresholds?.performanceDecrease || 30
                        }
                      }))}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Снижение качества (%)</label>
                    <input
                      type="number"
                      value={customTestConfig.regressionThresholds?.qualityDecrease || 20}
                      onChange={(e) => setCustomTestConfig(prev => ({
                        ...prev,
                        regressionThresholds: {
                          ...prev.regressionThresholds,
                          generationTimeIncrease: prev.regressionThresholds?.generationTimeIncrease || 50,
                          qualityDecrease: Number(e.target.value),
                          performanceDecrease: prev.regressionThresholds?.performanceDecrease || 30
                        }
                      }))}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Снижение производительности (%)</label>
                    <input
                      type="number"
                      value={customTestConfig.regressionThresholds?.performanceDecrease || 30}
                      onChange={(e) => setCustomTestConfig(prev => ({
                        ...prev,
                        regressionThresholds: {
                          ...prev.regressionThresholds,
                          generationTimeIncrease: prev.regressionThresholds?.generationTimeIncrease || 50,
                          qualityDecrease: prev.regressionThresholds?.qualityDecrease || 20,
                          performanceDecrease: Number(e.target.value)
                        }
                      }))}
                      className="mt-1 border border-gray-300 rounded-md px-3 py-1 w-full"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={runCustomTest}
                disabled={!selectedTemplate || isRunningTest}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isRunningTest ? 'Выполняется...' : 'Запустить пользовательский тест'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Анализ шаблонов</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Файл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Строки
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Функции
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сложность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Изменен
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templateAnalysis.map((template, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {template.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.metrics.linesCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.metrics.functionsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        template.metrics.complexity > 20 ? 'bg-red-100 text-red-800' :
                        template.metrics.complexity > 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {template.metrics.complexity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(template.lastModified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => runQuickTest(template.templatePath)}
                        disabled={isRunningTest}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        Тестировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Results List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">История тестов</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тест
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Шаблон
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Регрессия
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testResults.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.testId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.afterSnapshot.metadata.templateName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.overallStatus)}`}>
                          {result.overallStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.regressionDetected ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {result.regressionDetected ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(result.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Детали
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Result View */}
          {selectedResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Детали теста: {selectedResult.testId}
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Общая информация</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Статус:</span> {selectedResult.overallStatus}</p>
                    <p><span className="font-medium">Регрессия:</span> {selectedResult.regressionDetected ? 'Обнаружена' : 'Не обнаружена'}</p>
                    <p><span className="font-medium">Дата:</span> {formatDate(selectedResult.timestamp)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Шаблон</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Название:</span> {selectedResult.afterSnapshot.metadata.templateName}</p>
                    <p><span className="font-medium">Тип игры:</span> {selectedResult.afterSnapshot.metadata.gameType}</p>
                    <p><span className="font-medium">Версия:</span> {selectedResult.afterSnapshot.version}</p>
                  </div>
                </div>
              </div>

              {/* Test Cases */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Результаты тестов</h4>
                <div className="space-y-3">
                  {selectedResult.testCases.map((testCase, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900">{testCase.name}</h5>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(testCase.status)}`}>
                          {testCase.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{testCase.message}</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Время выполнения:</span>
                          <p>{formatTime(testCase.executionTime)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Время генерации:</span>
                          <p>{formatTime(testCase.metrics.generationTime)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Ассеты:</span>
                          <p>{testCase.metrics.assetCount}</p>
                        </div>
                        <div>
                          <span className="font-medium">Качество кода:</span>
                          <p>{testCase.metrics.codeQuality.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Производительность:</span>
                          <p>{testCase.metrics.performanceScore.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Issues & Recommendations */}
              {(selectedResult.criticalIssues.length > 0 || selectedResult.recommendations.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedResult.criticalIssues.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Критические проблемы</h4>
                      <ul className="space-y-1 text-sm text-red-700">
                        {selectedResult.criticalIssues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Рекомендации</h4>
                      <ul className="space-y-1 text-sm text-blue-700">
                        {selectedResult.recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegressionTestingDashboard; 