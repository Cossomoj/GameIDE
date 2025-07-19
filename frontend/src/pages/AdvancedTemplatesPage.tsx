import React, { useState } from 'react';
import AdvancedTemplateBuilder from '../components/AdvancedTemplateBuilder';
import { Grid, Layers, Palette, Gamepad2, Zap, Code, Image, Music, CheckCircle, AlertCircle, Info, Star, Award, Target, Rocket, Globe, Smartphone, Monitor, Settings, Download, Upload, Play, BookOpen, Heart } from 'lucide-react';

const AdvancedTemplatesPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTemplateCreated = (template: any) => {
    setSuccessMessage(`Шаблон "${template.name}" успешно создан!`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleGameGenerated = (gameData: any) => {
    setSuccessMessage(`Игра успешно сгенерирована! ID: ${gameData.gameId}`);
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
              <Grid className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Расширенные шаблоны игр</h3>
              <p className="text-gray-600 mb-4">
                Создавайте игры быстрее с помощью профессиональных шаблонов! Визуальный конструктор 
                позволяет настроить игру по вашему вкусу, а богатая библиотека компонентов и ассетов 
                поможет воплотить любые идеи. От простых аркад до сложных стратегий - все возможно!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Визуальный конструктор</div>
                    <div className="text-sm text-gray-500">Drag & Drop интерфейс</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Code className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Система компонентов</div>
                    <div className="text-sm text-gray-500">Готовые блоки кода</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Image className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Библиотека ассетов</div>
                    <div className="text-sm text-gray-500">Спрайты, звуки, модели</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Rocket className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-900">Быстрый старт</div>
                    <div className="text-sm text-gray-500">Игра за минуты</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент конструктора */}
        <AdvancedTemplateBuilder
          onTemplateCreated={handleTemplateCreated}
          onGameGenerated={handleGameGenerated}
          onError={handleError}
        />

        {/* Возможности системы шаблонов */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Конструктор и создание */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 text-blue-500 mr-2" />
              Визуальный конструктор
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Play className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Пошаговое создание</div>
                  <div className="text-sm text-gray-600">
                    Интуитивный мастер проведет через все этапы создания игры
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Palette className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Настройка стиля</div>
                  <div className="text-sm text-gray-600">
                    Выбор цветовых схем, стилей графики и анимаций
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Игровые механики</div>
                  <div className="text-sm text-gray-600">
                    Готовые механики: движение, прыжки, стрельба, сбор предметов
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Экспорт проекта</div>
                  <div className="text-sm text-gray-600">
                    Готовый код игры в различных форматах и языках
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Компоненты и ассеты */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 text-green-500 mr-2" />
              Библиотеки ресурсов
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Code className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Готовые компоненты</div>
                  <div className="text-sm text-gray-600">
                    Система сущностей, поведения, UI элементы и эффекты
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Image className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Графические ассеты</div>
                  <div className="text-sm text-gray-600">
                    Спрайты, анимации, текстуры и UI элементы
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Music className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Аудио контент</div>
                  <div className="text-sm text-gray-600">
                    Звуковые эффекты, фоновая музыка и голосовые дорожки
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Upload className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Пользовательские ресурсы</div>
                  <div className="text-sm text-gray-600">
                    Загрузка собственных файлов и создание компонентов
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Типы шаблонов */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Категории шаблонов</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Аркады',
                icon: '🕹️',
                description: 'Простые и увлекательные игры',
                examples: ['Space Invaders', 'Pac-Man', 'Tetris'],
                difficulty: 'Начинающий'
              },
              {
                name: 'Платформеры',
                icon: '🏃',
                description: '2D игры с прыжками и препятствиями',
                examples: ['Mario Bros', 'Sonic', 'Mega Man'],
                difficulty: 'Средний'
              },
              {
                name: 'Головоломки',
                icon: '🧩',
                description: 'Логические и интеллектуальные игры',
                examples: ['Sokoban', 'Portal', 'Monument Valley'],
                difficulty: 'Начинающий'
              },
              {
                name: 'Стратегии',
                icon: '♟️',
                description: 'Тактические и стратегические игры',
                examples: ['Chess', 'Tower Defense', 'RTS'],
                difficulty: 'Продвинутый'
              },
              {
                name: 'RPG',
                icon: '⚔️',
                description: 'Ролевые игры с прокачкой',
                examples: ['Final Fantasy', 'Pokemon', 'Zelda'],
                difficulty: 'Эксперт'
              },
              {
                name: 'Симуляторы',
                icon: '🚗',
                description: 'Имитация реальных процессов',
                examples: ['SimCity', 'Flight Sim', 'Farming'],
                difficulty: 'Средний'
              },
              {
                name: 'Приключения',
                icon: '🗺️',
                description: 'Исследование и нарративные игры',
                examples: ['Adventure Games', 'Point & Click'],
                difficulty: 'Средний'
              },
              {
                name: 'Экшен',
                icon: '💥',
                description: 'Динамичные боевые игры',
                examples: ['Doom', 'Counter-Strike', 'GTA'],
                difficulty: 'Продвинутый'
              }
            ].map(category => (
              <div
                key={category.name}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <h4 className="font-semibold text-gray-900">{category.name}</h4>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Примеры:</div>
                  <div className="space-y-1">
                    {category.examples.map(example => (
                      <div key={example} className="text-xs text-gray-500">• {example}</div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Сложность: <span className="font-medium">{category.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Процесс создания игры */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Как создать игру за 5 шагов</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: 1,
                title: 'Выберите шаблон',
                description: 'Найдите подходящий шаблон из библиотеки',
                icon: <BookOpen className="w-6 h-6" />,
                color: 'blue'
              },
              {
                step: 2,
                title: 'Настройте параметры',
                description: 'Задайте название, размеры и основные настройки',
                icon: <Settings className="w-6 h-6" />,
                color: 'green'
              },
              {
                step: 3,
                title: 'Выберите механики',
                description: 'Добавьте нужные игровые механики',
                icon: <Gamepad2 className="w-6 h-6" />,
                color: 'purple'
              },
              {
                step: 4,
                title: 'Настройте стиль',
                description: 'Выберите цвета, графику и звуки',
                icon: <Palette className="w-6 h-6" />,
                color: 'yellow'
              },
              {
                step: 5,
                title: 'Сгенерируйте игру',
                description: 'Получите готовый код игры',
                icon: <Rocket className="w-6 h-6" />,
                color: 'red'
              }
            ].map(step => (
              <div key={step.step} className="text-center">
                <div className={`bg-${step.color}-100 rounded-full p-4 mb-3 mx-auto w-16 h-16 flex items-center justify-center`}>
                  <div className={`text-${step.color}-600`}>
                    {step.icon}
                  </div>
                </div>
                <div className="font-semibold text-gray-900 mb-2">
                  {step.step}. {step.title}
                </div>
                <div className="text-sm text-gray-600">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <div className="text-sm text-gray-600 mb-2">
              ⏱️ Среднее время создания: <strong>15-30 минут</strong>
            </div>
            <div className="text-xs text-gray-500">
              От идеи до готовой игры всего за полчаса!
            </div>
          </div>
        </div>

        {/* Преимущества системы */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Преимущества расширенных шаблонов</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-3">
                <Zap className="w-8 h-8 text-green-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Быстрое прототипирование</div>
              <div className="text-sm text-gray-600">
                Создавайте рабочие прототипы игр за минуты, а не часы
              </div>
            </div>

            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                <Code className="w-8 h-8 text-blue-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Чистый код</div>
              <div className="text-sm text-gray-600">
                Генерируемый код следует лучшим практикам и готов к расширению
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-3">
                <Globe className="w-8 h-8 text-purple-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Кроссплатформенность</div>
              <div className="text-sm text-gray-600">
                Игры работают в браузере, на мобильных устройствах и десктопе
              </div>
            </div>

            <div className="text-center">
              <div className="bg-yellow-50 rounded-lg p-4 mb-3">
                <Layers className="w-8 h-8 text-yellow-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Модульность</div>
              <div className="text-sm text-gray-600">
                Компонентная архитектура позволяет легко добавлять новые функции
              </div>
            </div>

            <div className="text-center">
              <div className="bg-red-50 rounded-lg p-4 mb-3">
                <Heart className="w-8 h-8 text-red-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Сообщество</div>
              <div className="text-sm text-gray-600">
                Делитесь шаблонами с другими разработчиками и используйте их работы
              </div>
            </div>

            <div className="text-center">
              <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                <Award className="w-8 h-8 text-indigo-500 mx-auto" />
              </div>
              <div className="font-medium text-gray-900 mb-2">Качество</div>
              <div className="text-sm text-gray-600">
                Все шаблоны проходят проверку и тестирование перед публикацией
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
                Могу ли я создать собственный шаблон?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да! В разделе "Создать" вы можете создать собственный шаблон, настроить его 
                структуру, добавить компоненты и ассеты. Созданные шаблоны можно использовать 
                повторно и даже публиковать для других пользователей.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Какие языки программирования поддерживаются?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Система генерирует код на JavaScript, TypeScript, Python, C#, Java, Rust и Go. 
                Вы можете выбрать предпочитаемый язык при генерации игры.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Можно ли изменить сгенерированный код?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Конечно! Сгенерированный код полностью редактируем и следует стандартным практикам. 
                Вы можете модифицировать его в любом редакторе кода или IDE.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Как добавить собственные ассеты?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                В разделе "Ассеты" есть кнопка "Загрузить ассет". Поддерживаются изображения, 
                звуки, 3D модели и другие форматы. Загруженные ассеты становятся доступны 
                для использования в ваших шаблонах.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Есть ли ограничения на размер проекта?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Базовый план позволяет создавать проекты до 100 МБ. Для больших проектов 
                доступны платные планы с увеличенными лимитами.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                Поддерживается ли мультиплеер?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, некоторые шаблоны включают готовую поддержку мультиплеера через WebSocket 
                или WebRTC. Также можно добавить мультиплеер в существующий проект.
              </div>
            </details>
          </div>
        </div>

        {/* Статистика */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Статистика системы шаблонов</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">150+</div>
              <div className="text-sm text-gray-600">Готовых шаблонов</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-sm text-gray-600">Компонентов</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">2K+</div>
              <div className="text-sm text-gray-600">Ассетов</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">10K+</div>
              <div className="text-sm text-gray-600">Созданных игр</div>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              🎯 Новые шаблоны и компоненты добавляются каждую неделю
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTemplatesPage; 