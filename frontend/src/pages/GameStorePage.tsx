import React, { useState } from 'react';
import GameStoreManager from '../components/GameStoreManager';
import { ShoppingCart, Store, Star, Shield, DollarSign, Gift, Users, Gamepad2, CheckCircle, AlertCircle, Info, Award, Trophy, Target, Zap, Globe, Heart, Download, Play, Eye, BookOpen } from 'lucide-react';

const GameStorePage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Симуляция ID пользователя
  const userId = "user123";

  const handleGameSelected = (game: any) => {
    setSuccessMessage(`Выбрана игра: ${game.title}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePurchase = (gameId: string, purchase: any) => {
    setSuccessMessage(`Игра успешно приобретена! ID покупки: ${purchase.id}`);
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
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Магазин игр</h3>
              <p className="text-gray-600 mb-4">
                Откройте для себя удивительный мир игр! Наш магазин предлагает широкий выбор 
                качественных игр разных жанров - от захватывающих аркад до сложных головоломок. 
                Покупайте, играйте и наслаждайтесь!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Gamepad2 className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Каталог игр</div>
                    <div className="text-sm text-gray-500">Более 1000+ игр</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Безопасность</div>
                    <div className="text-sm text-gray-500">Проверенные игры</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-gray-900">Отзывы</div>
                    <div className="text-sm text-gray-500">Честные рейтинги</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Цены</div>
                    <div className="text-sm text-gray-500">Выгодные предложения</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент магазина */}
        <GameStoreManager
          userId={userId}
          onGameSelected={handleGameSelected}
          onPurchase={handlePurchase}
          onError={handleError}
        />

        {/* Функции и возможности */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Покупки и платежи */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 text-blue-500 mr-2" />
              Покупки и платежи
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Безопасные платежи</div>
                  <div className="text-sm text-gray-600">
                    Все транзакции защищены современными системами шифрования
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Gift className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Промокоды и скидки</div>
                  <div className="text-sm text-gray-600">
                    Регулярные акции и специальные предложения для пользователей
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Мгновенная загрузка</div>
                  <div className="text-sm text-gray-600">
                    Сразу после покупки игра становится доступна для игры
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Гарантия возврата</div>
                  <div className="text-sm text-gray-600">
                    30-дневная гарантия возврата средств без вопросов
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Сообщество и отзывы */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 text-green-500 mr-2" />
              Сообщество и отзывы
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Честные рейтинги</div>
                  <div className="text-sm text-gray-600">
                    Рейтинги основаны на реальных отзывах покупателей
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Проверенные отзывы</div>
                  <div className="text-sm text-gray-600">
                    Отзывы от пользователей, которые действительно купили игру
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Heart className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Список желаний</div>
                  <div className="text-sm text-gray-600">
                    Сохраняйте интересные игры и получайте уведомления о скидках
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Award className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Рекомендации</div>
                  <div className="text-sm text-gray-600">
                    Персонализированные рекомендации на основе ваших предпочтений
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Категории игр */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Популярные категории</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Аркады', icon: '🕹️', description: 'Быстрые и захватывающие' },
              { name: 'Головоломки', icon: '🧩', description: 'Тренируют мозг' },
              { name: 'Платформеры', icon: '🏃', description: 'Прыжки и приключения' },
              { name: 'Стратегии', icon: '♟️', description: 'Тактическое мышление' },
              { name: 'Экшен', icon: '⚔️', description: 'Динамичные сражения' },
              { name: 'Симуляторы', icon: '🎮', description: 'Реалистичная симуляция' }
            ].map(category => (
              <div
                key={category.name}
                className="text-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <div className="font-medium text-gray-900 mb-1">{category.name}</div>
                <div className="text-xs text-gray-500">{category.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Статистика магазина */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Статистика магазина</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <Gamepad2 className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-gray-900">1,000+</div>
              <div className="text-sm text-gray-600">Игр в каталоге</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <Users className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-gray-900">50K+</div>
              <div className="text-sm text-gray-600">Активных игроков</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <Download className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-gray-900">1M+</div>
              <div className="text-sm text-gray-600">Скачиваний</div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <Star className="w-8 h-8 text-yellow-500 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-gray-900">4.8/5</div>
              <div className="text-sm text-gray-600">Средний рейтинг</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Часто задаваемые вопросы</h3>
          
          <div className="space-y-4">
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как купить игру в магазине?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Найдите игру через поиск или каталог, нажмите на неё для просмотра деталей, 
                затем нажмите кнопку "Купить". Следуйте инструкциям для оплаты.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Какие способы оплаты поддерживаются?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Мы принимаем банковские карты, электронные кошельки, мобильные платежи 
                и другие популярные способы оплаты. Все платежи защищены.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Можно ли вернуть купленную игру?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, у нас действует 30-дневная гарантия возврата. Если игра вам не понравилась, 
                вы можете вернуть деньги в течение 30 дней с момента покупки.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как работает список желаний?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Нажмите на иконку сердечка рядом с игрой, чтобы добавить её в список желаний. 
                Мы будем уведомлять вас о скидках на эти игры.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как оставить отзыв о игре?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Отзывы могут оставлять только пользователи, купившие игру. Перейдите на страницу 
                игры и нажмите "Написать отзыв". Укажите рейтинг и поделитесь мнением.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Есть ли мобильная версия магазина?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, наш магазин полностью адаптирован для мобильных устройств. Вы можете 
                покупать и играть в игры с любого устройства.
              </div>
            </details>
          </div>
        </div>

        {/* Преимущества для разработчиков */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Для разработчиков</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                <Target className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Простая публикация</div>
              <div className="text-sm text-gray-600">
                Легко загружайте свои игры в магазин через удобный интерфейс
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <Zap className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Быстрая модерация</div>
              <div className="text-sm text-gray-600">
                Ваши игры проходят проверку и появляются в магазине в кратчайшие сроки
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <Trophy className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Справедливая доля</div>
              <div className="text-sm text-gray-600">
                Получайте достойную долю от продаж с прозрачной системой выплат
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Стать разработчиком
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStorePage; 