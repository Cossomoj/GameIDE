import React, { useState } from 'react';
import SecurityDashboard from '../components/SecurityDashboard';
import { Shield, Lock, Eye, AlertTriangle, Users, Key, FileText, Settings, CheckCircle, Info, Award, Zap, Globe, Smartphone, Monitor, Star, Target, Clock, Activity } from 'lucide-react';

const SecurityPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleThreatDetected = (threat: any) => {
    setSuccessMessage(`Обнаружена угроза: ${threat.description}`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleUserAction = (action: string, userId: string) => {
    setSuccessMessage(`Действие "${action}" выполнено для пользователя ${userId}`);
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
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
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
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Продвинутая система безопасности</h3>
              <p className="text-gray-600 mb-4">
                Комплексная система защиты включает мониторинг угроз в реальном времени, аудит событий 
                безопасности, управление пользователями и автоматическое обнаружение подозрительной 
                активности. Обеспечивает максимальную защиту вашего GameIDE проекта.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-900">Обнаружение угроз</div>
                    <div className="text-sm text-gray-500">В реальном времени</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Управление доступом</div>
                    <div className="text-sm text-gray-500">Роли и разрешения</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Eye className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Аудит событий</div>
                    <div className="text-sm text-gray-500">Полное логирование</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Lock className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Шифрование</div>
                    <div className="text-sm text-gray-500">AES-256</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент панели безопасности */}
        <SecurityDashboard
          onThreatDetected={handleThreatDetected}
          onUserAction={handleUserAction}
          onError={handleError}
        />

        {/* Функции безопасности */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Защита от атак */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 text-red-500 mr-2" />
              Защита от атак
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">SQL Injection Protection</div>
                  <div className="text-sm text-gray-600">
                    Автоматическое обнаружение и блокировка попыток SQL инъекций
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">XSS Protection</div>
                  <div className="text-sm text-gray-600">
                    Фильтрация потенциально опасного JavaScript кода
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Brute Force Protection</div>
                  <div className="text-sm text-gray-600">
                    Автоматическая блокировка при множественных неудачных попытках входа
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">CSRF Protection</div>
                  <div className="text-sm text-gray-600">
                    Защита от межсайтовой подделки запросов
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Аутентификация и авторизация */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-5 h-5 text-blue-500 mr-2" />
              Аутентификация и авторизация
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">JWT токены</div>
                  <div className="text-sm text-gray-600">
                    Безопасная аутентификация с использованием JSON Web Tokens
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Управление ролями</div>
                  <div className="text-sm text-gray-600">
                    Гибкая система ролей и разрешений для контроля доступа
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Key className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">API ключи</div>
                  <div className="text-sm text-gray-600">
                    Генерация и управление API ключами для безопасного доступа
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Управление сессиями</div>
                  <div className="text-sm text-gray-600">
                    Отслеживание и управление пользовательскими сессиями
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Мониторинг и аудит */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Мониторинг и аудит безопасности</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <Activity className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Мониторинг в реальном времени</div>
              <div className="text-sm text-gray-600">
                Непрерывное отслеживание подозрительной активности и автоматическое 
                реагирование на потенциальные угрозы
              </div>
            </div>

            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                <FileText className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Журнал аудита</div>
              <div className="text-sm text-gray-600">
                Детальное логирование всех событий безопасности с возможностью 
                фильтрации и анализа
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <AlertTriangle className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Система оповещений</div>
              <div className="text-sm text-gray-600">
                Мгновенные уведомления о критических событиях безопасности 
                и автоматические меры защиты
              </div>
            </div>
          </div>
        </div>

        {/* Уровни безопасности */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Уровни защиты</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-green-600">Низкий</div>
              </div>
              <div className="text-sm text-gray-600">Базовая защита</div>
              <div className="text-xs text-gray-500 mt-1">Логирование, базовая валидация</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-lg font-bold text-yellow-600">Средний</div>
              </div>
              <div className="text-sm text-gray-600">Активная защита</div>
              <div className="text-xs text-gray-500 mt-1">Мониторинг, фильтрация</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-lg font-bold text-orange-600">Высокий</div>
              </div>
              <div className="text-sm text-gray-600">Продвинутая защита</div>
              <div className="text-xs text-gray-500 mt-1">Автоблокировка, анализ угроз</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-lg font-bold text-red-600">Критический</div>
              </div>
              <div className="text-sm text-gray-600">Максимальная защита</div>
              <div className="text-xs text-gray-500 mt-1">Немедленное реагирование</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Часто задаваемые вопросы</h3>
          
          <div className="space-y-4">
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как работает система обнаружения угроз?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Система анализирует входящие запросы в реальном времени, проверяя их на наличие 
                признаков вредоносной активности. При обнаружении подозрительных паттернов 
                автоматически срабатывают защитные механизмы.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Что происходит при обнаружении угрозы?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                При обнаружении угрозы система автоматически блокирует подозрительный IP, 
                логирует событие, отправляет уведомление администраторам и применяет 
                соответствующие меры защиты в зависимости от типа угрозы.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как настроить уровни доступа пользователей?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                В разделе "Пользователи" можно назначать роли и разрешения каждому пользователю. 
                Система поддерживает гибкую настройку прав доступа к различным ресурсам 
                и функциям приложения.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Можно ли настроить автоматические уведомления?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, в разделе "Настройки" можно настроить типы событий, о которых вы хотите 
                получать уведомления, а также способы доставки уведомлений (email, webhook, etc.).
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как долго хранятся журналы аудита?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Журналы аудита хранятся в течение 90 дней по умолчанию. В настройках можно 
                изменить период хранения или настроить экспорт данных в внешние системы.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Поддерживается ли двухфакторная аутентификация?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, система поддерживает 2FA с использованием мобильных приложений-аутентификаторов 
                (Google Authenticator, Authy и др.). Можно настроить обязательное использование 
                2FA для всех пользователей или отдельных ролей.
              </div>
            </details>
          </div>
        </div>

        {/* Лучшие практики */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации по безопасности</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-2" />
                Для администраторов
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Регулярно проверяйте журналы аудита на наличие подозрительной активности</li>
                <li>• Настройте уведомления для событий высокого и критического уровня</li>
                <li>• Периодически обновляйте роли и разрешения пользователей</li>
                <li>• Проводите регулярный анализ активных угроз</li>
                <li>• Используйте сложные пароли и включите 2FA для административных аккаунтов</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Award className="w-4 h-4 text-blue-500 mr-2" />
                Для пользователей
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Используйте надежные пароли длиной не менее 12 символов</li>
                <li>• Включите двухфакторную аутентификацию в настройках профиля</li>
                <li>• Не передавайте свои учетные данные третьим лицам</li>
                <li>• Сообщайте о подозрительной активности администраторам</li>
                <li>• Регулярно обновляйте свой профиль и проверяйте активные сессии</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage; 