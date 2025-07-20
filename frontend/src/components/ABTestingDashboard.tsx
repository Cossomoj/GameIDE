import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'ui_ux' | 'generation_algorithm' | 'asset_quality' | 'user_flow' | 'monetization' | 'performance' | 'content';
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: ABTestVariant[];
  metrics: TestMetrics;
  startDate: string;
  endDate?: string;
  trafficAllocation: number;
  configuration: any;
}

interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  configuration: any;
  allocation: number;
  conversionRate?: number;
  sampleSize?: number;
}

interface TestMetrics {
  totalUsers: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  significance: number;
  revenue?: number;
  avgSessionTime?: number;
  bounceRate?: number;
}

interface TestResults {
  testId: string;
  variants: {
    [variantId: string]: {
      users: number;
      conversions: number;
      conversionRate: number;
      metrics: any;
    };
  };
  winner?: string;
  confidence: number;
}

const ABTestingDashboard: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [activeTests, setActiveTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Новый тест
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    type: 'ui_ux' as ABTest['type'],
    trafficAllocation: 50,
    variants: [
      { name: 'Control', description: 'Original version', allocation: 50 },
      { name: 'Variant A', description: 'Test version', allocation: 50 }
    ],
    configuration: {}
  });

  useEffect(() => {
    loadTests();
    loadActiveTests();
    loadAnalytics();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ab-testing/tests');
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTests = async () => {
    try {
      const response = await fetch('/api/ab-testing/tests/active');
      const data = await response.json();
      setActiveTests(data);
    } catch (error) {
      console.error('Error loading active tests:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/ab-testing/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const createTest = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ab-testing/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTest)
      });
      
      if (response.ok) {
        await loadTests();
        setShowCreateModal(false);
        setNewTest({
          name: '',
          description: '',
          type: 'ui_ux',
          trafficAllocation: 50,
          variants: [
            { name: 'Control', description: 'Original version', allocation: 50 },
            { name: 'Variant A', description: 'Test version', allocation: 50 }
          ],
          configuration: {}
        });
      }
    } catch (error) {
      console.error('Error creating test:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTestResults = async (testId: string) => {
    try {
      const response = await fetch(`/api/ab-testing/tests/${testId}/results`);
      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const stopTest = async (testId: string) => {
    try {
      await fetch(`/api/ab-testing/tests/${testId}/stop`, { method: 'POST' });
      await loadTests();
      await loadActiveTests();
    } catch (error) {
      console.error('Error stopping test:', error);
    }
  };

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: ABTest['type']) => {
    switch (type) {
      case 'ui_ux': return 'text-purple-600 bg-purple-100';
      case 'generation_algorithm': return 'text-blue-600 bg-blue-100';
      case 'asset_quality': return 'text-green-600 bg-green-100';
      case 'user_flow': return 'text-orange-600 bg-orange-100';
      case 'monetization': return 'text-red-600 bg-red-100';
      case 'performance': return 'text-cyan-600 bg-cyan-100';
      case 'content': return 'text-pink-600 bg-pink-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">A/B Testing Dashboard</h1>
          <p className="text-gray-600">Управление и анализ A/B тестов для оптимизации продукта</p>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Активные тесты</h3>
              <p className="text-3xl font-bold text-green-600">{analytics.activeTests || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Завершенные тесты</h3>
              <p className="text-3xl font-bold text-blue-600">{analytics.completedTests || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Общий uplift</h3>
              <p className="text-3xl font-bold text-purple-600">{analytics.averageUplift || 0}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Значимые результаты</h3>
              <p className="text-3xl font-bold text-orange-600">{analytics.significantTests || 0}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Создать тест
          </button>
          <button
            onClick={loadTests}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Обновить
          </button>
        </div>

        {/* Tests List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Все тесты</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка тестов...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Тесты не найдены. Создайте первый тест!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tests.map((test) => (
                <motion.div
                  key={test.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedTest(test);
                    loadTestResults(test.id);
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(test.type)}`}>
                        {test.type}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{test.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Варианты: {test.variants.length}</span>
                    <span>Трафик: {test.trafficAllocation}%</span>
                    <span>Создан: {new Date(test.startDate).toLocaleDateString()}</span>
                    {test.metrics.conversionRate > 0 && (
                      <span className="text-green-600 font-medium">
                        CR: {test.metrics.conversionRate.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Test Details Modal */}
        <AnimatePresence>
          {selectedTest && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
            >
              <motion.div
                className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTest.name}</h2>
                      <p className="text-gray-600">{selectedTest.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTest(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Test Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div>
                      <span className="text-sm text-gray-500">Статус</span>
                      <p className={`font-medium ${getStatusColor(selectedTest.status).split(' ')[0]}`}>
                        {selectedTest.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Тип</span>
                      <p className={`font-medium ${getTypeColor(selectedTest.type).split(' ')[0]}`}>
                        {selectedTest.type}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Пользователи</span>
                      <p className="font-medium">{selectedTest.metrics.totalUsers}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Конверсия</span>
                      <p className="font-medium">{selectedTest.metrics.conversionRate.toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Варианты тестирования</h3>
                    <div className="grid gap-4">
                      {selectedTest.variants.map((variant, index) => (
                        <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{variant.name}</h4>
                            <span className="text-sm text-gray-500">{variant.allocation}% трафика</span>
                          </div>
                          <p className="text-gray-600 mb-3">{variant.description}</p>
                          {variant.conversionRate && (
                            <div className="text-sm">
                              <span className="text-gray-500">Конверсия: </span>
                              <span className="font-medium">{variant.conversionRate.toFixed(2)}%</span>
                              <span className="text-gray-500 ml-4">Пользователи: </span>
                              <span className="font-medium">{variant.sampleSize}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  {testResults && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты теста</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Уровень доверия</span>
                            <p className="font-medium">{testResults.confidence.toFixed(1)}%</p>
                          </div>
                          {testResults.winner && (
                            <div>
                              <span className="text-sm text-gray-500">Победитель</span>
                              <p className="font-medium text-green-600">{testResults.winner}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4">
                    {selectedTest.status === 'running' && (
                      <button
                        onClick={() => stopTest(selectedTest.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Остановить тест
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/api/ab-testing/tests/${selectedTest.id}/export`)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Экспорт результатов
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Test Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Создать новый A/B тест</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Название теста
                      </label>
                      <input
                        type="text"
                        value={newTest.name}
                        onChange={(e) => setNewTest({...newTest, name: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Например: Тест кнопки CTA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Описание
                      </label>
                      <textarea
                        value={newTest.description}
                        onChange={(e) => setNewTest({...newTest, description: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Опишите цель и гипотезу теста"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Тип теста
                      </label>
                      <select
                        value={newTest.type}
                        onChange={(e) => setNewTest({...newTest, type: e.target.value as ABTest['type']})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ui_ux">UI/UX элементы</option>
                        <option value="generation_algorithm">Алгоритмы генерации</option>
                        <option value="asset_quality">Качество ассетов</option>
                        <option value="user_flow">Пользовательский flow</option>
                        <option value="monetization">Монетизация</option>
                        <option value="performance">Производительность</option>
                        <option value="content">Контент</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Доля трафика (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newTest.trafficAllocation}
                        onChange={(e) => setNewTest({...newTest, trafficAllocation: parseInt(e.target.value)})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={createTest}
                      disabled={loading || !newTest.name || !newTest.description}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Создание...' : 'Создать тест'}
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ABTestingDashboard; 