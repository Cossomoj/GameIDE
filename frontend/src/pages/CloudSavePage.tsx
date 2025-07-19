import React, { useState } from 'react';
import CloudSaveManager from '../components/CloudSaveManager';
import { Cloud, Save, Shield, Zap, AlertCircle, CheckCircle, Info } from 'lucide-react';

const CloudSavePage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // В реальном приложении эти данные получались бы из контекста/состояния
  const userId = "user123";
  const gameId = "current-game";

  const handleSaveLoaded = (data: any) => {
    setSuccessMessage('Сохранение успешно загружено');
    setTimeout(() => setSuccessMessage(null), 3000);
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">О облачных сохранениях</h3>
              <p className="text-gray-600 mb-4">
                Система облачных сохранений позволяет автоматически синхронизировать прогресс игр 
                между различными устройствами через Yandex Games API. Все данные шифруются и сжимаются 
                для обеспечения безопасности и экономии трафика.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-gray-900">Безопасность</div>
                    <div className="text-sm text-gray-500">AES-256 шифрование</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Сжатие</div>
                    <div className="text-sm text-gray-500">До 70% экономии</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Cloud className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Синхронизация</div>
                    <div className="text-sm text-gray-500">Автоматическая</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент управления сохранениями */}
        <CloudSaveManager
          userId={userId}
          gameId={gameId}
          onSaveLoaded={handleSaveLoaded}
          onError={handleError}
        />

        {/* Дополнительная информация */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Как это работает */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Save className="w-5 h-5 text-blue-500 mr-2" />
              Как работают сохранения
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Автоматическое сохранение</div>
                  <div className="text-sm text-gray-500">
                    Игра автоматически создает сохранения в ключевых точках
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Шифрование и сжатие</div>
                  <div className="text-sm text-gray-500">
                    Данные защищаются и сжимаются для быстрой передачи
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Синхронизация с облаком</div>
                  <div className="text-sm text-gray-500">
                    Данные автоматически загружаются в Yandex Games
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">4</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Доступ с любого устройства</div>
                  <div className="text-sm text-gray-500">
                    Продолжайте игру на любом устройстве с того же места
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Типы слотов */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Cloud className="w-5 h-5 text-green-500 mr-2" />
              Типы слотов сохранений
            </h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Быстрое сохранение</div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Авто</span>
                </div>
                <div className="text-sm text-gray-500">
                  Автоматическое сохранение каждые 30 секунд. Хранит 3 последние версии.
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Контрольная точка</div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Защищено
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Сохранение на важных этапах прохождения. Зашифровано, хранит 5 версий.
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Ручное сохранение</div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Ручное</span>
                </div>
                <div className="text-sm text-gray-500">
                  Создается игроком вручную. Максимальный размер и защита.
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Настройки</div>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Система</span>
                </div>
                <div className="text-sm text-gray-500">
                  Пользовательские настройки игры. Синхронизируются между устройствами.
                </div>
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
                Что делать, если возник конфликт синхронизации?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                При конфликте система предложит выбрать версию сохранения: локальную, облачную или объединить их. 
                Рекомендуется выбирать версию с более поздним временем создания.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Сколько места занимают сохранения?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Благодаря сжатию, типичное сохранение занимает 10-50 КБ. Максимальный размер одного 
                сохранения — 1 МБ, что соответствует требованиям Yandex Games.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Безопасны ли мои данные?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, все критически важные сохранения шифруются с использованием AES-256. 
                Данные передаются по защищенному соединению и хранятся в облаке Yandex.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Что происходит при отсутствии интернета?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Сохранения продолжают работать в автономном режиме. При восстановлении соединения 
                происходит автоматическая синхронизация с облаком.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSavePage; 