import React, { useState } from 'react';
import AdvancedAnalyticsDashboard from '../components/AdvancedAnalyticsDashboard';
import { 
  BarChart, TrendingUp, Brain, Zap, Target, Users, 
  AlertCircle, CheckCircle, Info, Star, Award, Shield,
  Globe, Smartphone, Monitor, PieChart, LineChart, Activity
} from 'lucide-react';

const AdvancedAnalyticsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAlertTriggered = (alert: any) => {
    setSuccessMessage(`Алерт активирован: ${alert.title}`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleMetricClicked = (metricId: string) => {
    console.log('Metric clicked:', metricId);
    // В реальном приложении здесь был бы переход к детальному просмотру метрики
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Уведомления */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Информационная панель */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3">
              <BarChart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Продвинутая аналитика и BI</h3>
              <p className="text-gray-600 mb-4">
                Комплексная система аналитики с интерактивными дашбордами, предиктивными моделями, 
                когортным анализом, воронками конверсии и системой алертов в реальном времени.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Real-time метрики</div>
                    <div className="text-sm text-gray-500">Мониторинг в реальном времени</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">ML прогнозы</div>
                    <div className="text-sm text-gray-500">Машинное обучение</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-900">Воронки</div>
                    <div className="text-sm text-gray-500">Анализ конверсии</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Когорты</div>
                    <div className="text-sm text-gray-500">Анализ удержания</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент аналитики */}
        <AdvancedAnalyticsDashboard
          gameId="current-game"
          refreshInterval={30000}
          onAlertTriggered={handleAlertTriggered}
          onMetricClicked={handleMetricClicked}
        />

        {/* Возможности и особенности */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Аналитические возможности */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 text-purple-500 mr-2" />
              Аналитические возможности
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Предиктивная аналитика</div>
                  <div className="text-sm text-gray-600">
                    Прогнозирование метрик с использованием ML моделей (ARIMA, линейная регрессия, экспоненциальное сглаживание)
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Когортный анализ</div>
                  <div className="text-sm text-gray-600">
                    Отслеживание поведения групп пользователей во времени для анализа удержания и LTV
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Воронки конверсии</div>
                  <div className="text-sm text-gray-600">
                    Анализ пользовательских путей с выявлением узких мест и точек оттока
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">A/B тестирование</div>
                  <div className="text-sm text-gray-600">
                    Статистический анализ экспериментов с расчетом значимости и доверительных интервалов
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Сегментация пользователей</div>
                  <div className="text-sm text-gray-600">
                    Создание динамических сегментов с настраиваемыми критериями и метриками
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Мониторинг и алерты */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 text-yellow-500 mr-2" />
              Мониторинг и алерты
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Real-time дашборды</div>
                  <div className="text-sm text-gray-600">
                    Интерактивные дашборды с автообновлением каждые 30 секунд
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Умные алерты</div>
                  <div className="text-sm text-gray-600">
                    Алерты с обнаружением аномалий, трендов и превышения пороговых значений
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Многоканальные уведомления</div>
                  <div className="text-sm text-gray-600">
                    Email, Slack, webhook уведомления с настраиваемыми условиями
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Системный мониторинг</div>
                  <div className="text-sm text-gray-600">
                    Отслеживание CPU, памяти, дискового пространства и сетевой активности
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Автоматические отчеты</div>
                  <div className="text-sm text-gray-600">
                    Периодическая генерация отчетов с экспортом в PDF, Excel, CSV форматы
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Типы графиков и визуализаций */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 text-orange-500 mr-2" />
            Типы визуализаций
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                <LineChart className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Временные ряды</div>
              <div className="text-sm text-gray-500 mt-1">
                Линейные и площадные графики для отслеживания метрик во времени
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <BarChart className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Столбчатые диаграммы</div>
              <div className="text-sm text-gray-500 mt-1">
                Сравнение категорий и группировка данных по различным параметрам
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <PieChart className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Круговые диаграммы</div>
              <div className="text-sm text-gray-500 mt-1">
                Распределение долей и процентное соотношение различных сегментов
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-yellow-50 rounded-lg p-4 mb-3">
                <Target className="w-8 h-8 text-yellow-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Воронки</div>
              <div className="text-sm text-gray-500 mt-1">
                Визуализация пользовательских путей и конверсионных процессов
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-red-50 rounded-lg p-4 mb-3">
                <Activity className="w-8 h-8 text-red-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Тепловые карты</div>
              <div className="text-sm text-gray-500 mt-1">
                Визуализация интенсивности данных и корреляций между метриками
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                <Users className="w-8 h-8 text-indigo-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Когортные таблицы</div>
              <div className="text-sm text-gray-500 mt-1">
                Анализ удержания пользователей по временным периодам
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-pink-50 rounded-lg p-4 mb-3">
                <TrendingUp className="w-8 h-8 text-pink-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Scatter plots</div>
              <div className="text-sm text-gray-500 mt-1">
                Анализ корреляций и зависимостей между различными метриками
              </div>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <Shield className="w-8 h-8 text-gray-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Gauge метрики</div>
              <div className="text-sm text-gray-500 mt-1">
                Отображение KPI с целевыми значениями и прогрессом выполнения
              </div>
            </div>
          </div>
        </div>

        {/* ML и AI возможности */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 text-purple-500 mr-2" />
            Возможности машинного обучения
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">Прогнозирование трендов</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                ARIMA, линейная регрессия, экспоненциальное сглаживание
              </p>
              <div className="text-sm text-purple-600 font-medium">
                Точность: 75-90%
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-gray-900">Обнаружение аномалий</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Статистические методы и алгоритмы выбросов
              </p>
              <div className="text-sm text-blue-600 font-medium">
                Чувствительность: 2σ
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900">Сегментация пользователей</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Кластеризация по поведению и характеристикам
              </p>
              <div className="text-sm text-green-600 font-medium">
                K-means, DBSCAN
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-900">Оптимизация конверсии</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Рекомендации по улучшению воронок
              </p>
              <div className="text-sm text-yellow-600 font-medium">
                Байесовская оптимизация
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-gray-900">Предсказание LTV</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Прогнозирование жизненной ценности пользователя
              </p>
              <div className="text-sm text-indigo-600 font-medium">
                Регрессионные модели
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-pink-200">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-pink-500" />
                <span className="font-medium text-gray-900">Рекомендательная система</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Персонализированные рекомендации игр
              </p>
              <div className="text-sm text-pink-600 font-medium">
                Коллаборативная фильтрация
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Часто задаваемые вопросы</h3>
          
          <div className="space-y-4">
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как настроить алерты для критических метрик?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Перейдите во вкладку "Алерты", нажмите "Создать алерт" и настройте условия срабатывания.
                Можно настроить пороговые значения, обнаружение аномалий или анализ трендов.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Какова точность предиктивных моделей?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Точность зависит от объема и качества данных. Линейная регрессия: 70-85%, 
                ARIMA: 75-90%, экспоненциальное сглаживание: 65-80%. Модели автоматически 
                переобучаются при накоплении новых данных.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Можно ли создавать пользовательские дашборды?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, система поддерживает создание настраиваемых дашбордов с выбором метрик,
                типов графиков, временных диапазонов и фильтров. Дашборды можно сохранять и делиться ими.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как экспортировать данные для внешнего анализа?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Используйте кнопку экспорта в правом верхнем углу. Доступны форматы: JSON для API,
                CSV для Excel, PDF для отчетов. Можно настроить автоматический экспорт по расписанию.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как интерпретировать когортный анализ?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Когортная таблица показывает процент пользователей, остающихся активными через определенные
                периоды времени. Высокие значения в первых колонках указывают на хорошее удержание.
                Резкие падения могут указывать на проблемы в пользовательском опыте.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage; 