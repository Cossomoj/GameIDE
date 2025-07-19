import React, { useState } from 'react';
import GameTestingManager from '../components/GameTestingManager';
import { TestTube, Zap, Shield, Monitor, Target, Users, AlertCircle, CheckCircle, Info } from 'lucide-react';

const GameTestingPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // В реальном приложении эти данные получались бы из контекста/состояния
  const gameId = "current-game";

  const handleTestCompleted = (execution: any) => {
    setSuccessMessage(`Тестирование завершено с результатом ${execution.summary.successRate}%`);
    setTimeout(() => setSuccessMessage(null), 5000);
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
            <div className="bg-blue-100 rounded-lg p-3">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">О системе автоматического тестирования</h3>
              <p className="text-gray-600 mb-4">
                Комплексная система тестирования обеспечивает высокое качество игр через автоматизированные 
                проверки функциональности, производительности, совместимости и доступности. Поддерживает 
                различные браузеры, устройства и сценарии использования.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <TestTube className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Функциональные тесты</div>
                    <div className="text-sm text-gray-500">Проверка основного функционала</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Zap className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Тесты производительности</div>
                    <div className="text-sm text-gray-500">Анализ скорости и ресурсов</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-900">Безопасность</div>
                    <div className="text-sm text-gray-500">Проверка уязвимостей</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Monitor className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Совместимость</div>
                    <div className="text-sm text-gray-500">Кроссплатформенность</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-gray-900">Доступность</div>
                    <div className="text-sm text-gray-500">WCAG стандарты</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="font-medium text-gray-900">Юзабилити</div>
                    <div className="text-sm text-gray-500">Удобство использования</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент управления тестированием */}
        <GameTestingManager
          gameId={gameId}
          onTestCompleted={handleTestCompleted}
          onError={handleError}
        />

        {/* Дополнительная информация */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Типы тестирования */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TestTube className="w-5 h-5 text-blue-500 mr-2" />
              Типы тестирования
            </h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Функциональное тестирование</div>
                <div className="text-sm text-gray-500 mb-2">
                  Проверка корректности работы игровой логики, интерфейса и взаимодействий.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">E2E тесты</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Unit тесты</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">API тесты</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Тестирование производительности</div>
                <div className="text-sm text-gray-500 mb-2">
                  Анализ времени загрузки, использования памяти, CPU и частоты кадров.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Load Time</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Memory</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">FPS</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Тестирование совместимости</div>
                <div className="text-sm text-gray-500 mb-2">
                  Проверка работы в разных браузерах, на различных устройствах и разрешениях.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Chrome</span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Firefox</span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Safari</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Тестирование безопасности</div>
                <div className="text-sm text-gray-500 mb-2">
                  Проверка на наличие уязвимостей, XSS атак и защиты данных пользователей.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">XSS</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">CSRF</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Injection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Процесс тестирования */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 text-orange-500 mr-2" />
              Процесс тестирования
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Выбор тестовых наборов</div>
                  <div className="text-sm text-gray-500">
                    Выберите подходящие категории тестов для вашей игры
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Настройка окружения</div>
                  <div className="text-sm text-gray-500">
                    Выбор браузеров, устройств и параметров для тестирования
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Автоматическое выполнение</div>
                  <div className="text-sm text-gray-500">
                    Система автоматически выполняет все выбранные тесты
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">4</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Анализ результатов</div>
                  <div className="text-sm text-gray-500">
                    Получение подробного отчета с найденными проблемами
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">5</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Исправление и повтор</div>
                  <div className="text-sm text-gray-500">
                    Устранение найденных проблем и повторное тестирование
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="font-medium text-green-800">Автоматизация CI/CD</div>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Тесты могут запускаться автоматически при каждом обновлении игры
              </div>
            </div>
          </div>
        </div>

        {/* Метрики и стандарты */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Метрики и стандарты качества</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                <Zap className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Производительность</div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• Загрузка &lt; 3 сек</div>
                <div>• FPS ≥ 30</div>
                <div>• Память &lt; 100 МБ</div>
                <div>• CPU &lt; 70%</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <Users className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Доступность</div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• WCAG 2.1 AA</div>
                <div>• Контрастность 4.5:1</div>
                <div>• Навигация с клавиатуры</div>
                <div>• Screen reader support</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <Monitor className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Совместимость</div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• Chrome 90+</div>
                <div>• Firefox 88+</div>
                <div>• Safari 14+</div>
                <div>• Edge 90+</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-red-50 rounded-lg p-4 mb-3">
                <Shield className="w-8 h-8 text-red-500 mx-auto" />
              </div>
              <div className="font-semibold text-gray-900">Безопасность</div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• HTTPS только</div>
                <div>• CSP headers</div>
                <div>• XSS защита</div>
                <div>• Безопасные API</div>
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
                Как часто нужно запускать тесты?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Рекомендуется запускать базовые тесты при каждом изменении кода, полное тестирование 
                - перед релизом. Критические тесты можно настроить на автоматический запуск в CI/CD.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Что делать, если тесты показывают низкую производительность?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Изучите детальный отчет, оптимизируйте ресурсы (изображения, звуки), улучшите код, 
                используйте компонент AssetOptimizer для автоматической оптимизации.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Можно ли добавить собственные тесты?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, система поддерживает создание пользовательских тестовых наборов. Используйте 
                раздел "Тестовые наборы" для создания собственных тестов.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как интерпретировать результаты тестирования?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Зеленые результаты - все хорошо, желтые - требуют внимания, красные - критические 
                проблемы. Смотрите детали в отчетах и следуйте рекомендациям системы.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Поддерживается ли тестирование мобильных игр?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, система эмулирует различные мобильные устройства и разрешения экрана. 
                Выберите соответствующие настройки в конфигурации тестирования.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTestingPage; 