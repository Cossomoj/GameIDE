import React, { useState } from 'react';
import TournamentManager from '../components/TournamentManager';
import { Tournament, Trophy, Award, Users, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react';

const TournamentsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // В реальном приложении эти данные получались бы из контекста/состояния
  const userId = "user123";

  const handleTournamentJoined = (tournament: any) => {
    setSuccessMessage(`Вы успешно зарегистрированы в турнире "${tournament.name}"`);
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
            <div className="bg-yellow-100 rounded-lg p-3">
              <Info className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">О системе турниров</h3>
              <p className="text-gray-600 mb-4">
                Присоединяйтесь к турнирам и соревнованиям, чтобы проверить свои навыки против 
                других игроков. Участвуйте в различных форматах турниров, зарабатывайте призы 
                и поднимайтесь в рейтинге.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-gray-900">Турниры на выбывание</div>
                    <div className="text-sm text-gray-500">Классический формат</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Круговая система</div>
                    <div className="text-sm text-gray-500">Каждый против каждого</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Award className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Призовые фонды</div>
                    <div className="text-sm text-gray-500">Реальные награды</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Расписание</div>
                    <div className="text-sm text-gray-500">Удобное время</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент управления турнирами */}
        <TournamentManager
          userId={userId}
          onTournamentJoined={handleTournamentJoined}
          onError={handleError}
        />

        {/* Дополнительная информация */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Типы турниров */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
              Типы турниров
            </h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">На выбывание (Single Elimination)</div>
                <div className="text-sm text-gray-500 mb-2">
                  Проигравший покидает турнир. Быстрый и динамичный формат.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Быстро</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Популярно</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Двойное выбывание (Double Elimination)</div>
                <div className="text-sm text-gray-500 mb-2">
                  Два поражения для выбывания. Более справедливый результат.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Сбалансировано</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Справедливо</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Круговая система (Round Robin)</div>
                <div className="text-sm text-gray-500 mb-2">
                  Каждый играет против каждого. Точное определение силы.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Долго</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Точно</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-2">Швейцарская система (Swiss)</div>
                <div className="text-sm text-gray-500 mb-2">
                  Участники с похожими результатами играют друг против друга.
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Адаптивно</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Большие турниры</span>
                </div>
              </div>
            </div>
          </div>

          {/* Правила и требования */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 text-purple-500 mr-2" />
              Правила участия
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Регистрация</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Подтвердите участие до окончания регистрации</li>
                  <li>• Check-in за 15 минут до начала турнира</li>
                  <li>• Соответствие требованиям по уровню и рейтингу</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Проведение матчей</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Явка в назначенное время</li>
                  <li>• Готовность к игре в течение 5 минут</li>
                  <li>• Соблюдение правил fair play</li>
                  <li>• Запрет на использование читов</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Призы и награды</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Автоматическое начисление призов</li>
                  <li>• Достижения за участие в турнирах</li>
                  <li>• Рейтинговые очки по результатам</li>
                  <li>• Специальные титулы победителям</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Споры и нарушения</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Система подачи жалоб</li>
                  <li>• Рассмотрение спорных ситуаций</li>
                  <li>• Наказания за нарушения</li>
                  <li>• Возможность апелляции</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Часто задаваемые вопросы</h3>
          
          <div className="space-y-4">
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-yellow-600">
                Как принять участие в турнире?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Найдите подходящий турнир в разделе "Обзор турниров", проверьте требования и нажмите 
                "Участвовать". Не забудьте сделать check-in перед началом турнира.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-yellow-600">
                Что такое check-in и зачем он нужен?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Check-in - это подтверждение готовности к участию. Его нужно сделать за 15 минут 
                до начала турнира, чтобы подтвердить свое присутствие.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-yellow-600">
                Как начисляются призы?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Призы начисляются автоматически после завершения турнира согласно итоговой 
                таблице результатов. Проверить начисления можно в разделе "Мои турниры".
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-yellow-600">
                Можно ли создать приватный турнир?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, при создании турнира снимите галочку "Публичный турнир". Такой турнир будет 
                виден только по прямой ссылке или приглашению.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-yellow-600">
                Что делать, если возникли технические проблемы во время матча?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Сразу сообщите о проблеме через кнопку "Спор" в интерфейсе матча. Опишите ситуацию 
                подробно - модераторы рассмотрят случай и примут решение.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentsPage; 