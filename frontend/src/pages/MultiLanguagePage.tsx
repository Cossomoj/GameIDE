import React, { useState } from 'react';
import MultiLanguageGenerator from '../components/MultiLanguageGenerator';
import { 
  Languages, Code2, Zap, Globe, Smartphone, Monitor,
  Star, CheckCircle, AlertCircle, Info, BookOpen,
  Cpu, Shield, RefreshCw, FileCode, Download
} from 'lucide-react';

const MultiLanguagePage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // В реальном приложении эти данные получались бы из контекста/состояния
  const gameConfig = {
    id: "current-game",
    name: "Моя игра",
    description: "Пример игры для демонстрации",
    width: 800,
    height: 600
  };

  const handleCodeGenerated = (code: any) => {
    setSuccessMessage(`Код успешно сгенерирован для ${code.language}! Создано ${code.files.length} файлов.`);
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
            <div className="bg-purple-100 rounded-lg p-3">
              <Languages className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Мультиязычная генерация кода</h3>
              <p className="text-gray-600 mb-4">
                Генерируйте код игр на разных языках программирования с полной поддержкой всех 
                возможностей каждого языка. Система автоматически адаптирует код под особенности 
                выбранного языка и создает готовый к запуску проект.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Code2 className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">7+ языков</div>
                    <div className="text-sm text-gray-500">JavaScript, Python, Java, C#...</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Конвертация</div>
                    <div className="text-sm text-gray-500">Между языками</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Download className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Готовые проекты</div>
                    <div className="text-sm text-gray-500">Со всеми зависимостями</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Основной компонент */}
        <MultiLanguageGenerator
          gameConfig={gameConfig}
          onCodeGenerated={handleCodeGenerated}
          onError={handleError}
        />

        {/* Поддерживаемые языки */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Languages className="w-5 h-5 text-purple-500 mr-2" />
            Поддерживаемые языки программирования
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* JavaScript */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🟨</span>
                <div>
                  <div className="font-semibold text-gray-900">JavaScript</div>
                  <div className="text-sm text-gray-500">ES2020+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Отлично для веб-игр</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Быстрая разработка</span>
                </div>
                <div className="text-gray-600">Phaser, Three.js, PixiJS</div>
              </div>
            </div>

            {/* TypeScript */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🔷</span>
                <div>
                  <div className="font-semibold text-gray-900">TypeScript</div>
                  <div className="text-sm text-gray-500">4.9+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Статическая типизация</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Веб + мобильные</span>
                </div>
                <div className="text-gray-600">React, Angular, Vue</div>
              </div>
            </div>

            {/* Python */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🐍</span>
                <div>
                  <div className="font-semibold text-gray-900">Python</div>
                  <div className="text-sm text-gray-500">3.9+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <span>Легко изучать</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-purple-500" />
                  <span>Десктопные игры</span>
                </div>
                <div className="text-gray-600">Pygame, Panda3D, Arcade</div>
              </div>
            </div>

            {/* Java */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">☕</span>
                <div>
                  <div className="font-semibold text-gray-900">Java</div>
                  <div className="text-sm text-gray-500">11+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-red-500" />
                  <span>Высокая производительность</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-green-500" />
                  <span>Android разработка</span>
                </div>
                <div className="text-gray-600">LibGDX, LWJGL, jMonkeyEngine</div>
              </div>
            </div>

            {/* C# */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">💙</span>
                <div>
                  <div className="font-semibold text-gray-900">C#</div>
                  <div className="text-sm text-gray-500">.NET 6+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>Unity поддержка</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-purple-500" />
                  <span>Windows приложения</span>
                </div>
                <div className="text-gray-600">Unity, MonoGame, Godot</div>
              </div>
            </div>

            {/* Rust */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🦀</span>
                <div>
                  <div className="font-semibold text-gray-900">Rust</div>
                  <div className="text-sm text-gray-500">1.65+</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-red-500" />
                  <span>Максимальная производительность</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Безопасность памяти</span>
                </div>
                <div className="text-gray-600">Bevy, Amethyst, Macroquad</div>
              </div>
            </div>
          </div>
        </div>

        {/* Возможности и особенности */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Возможности генерации */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 text-yellow-500 mr-2" />
              Возможности генерации
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Полная структура проекта</div>
                  <div className="text-sm text-gray-600">
                    Автоматическое создание всех необходимых файлов, конфигураций и зависимостей
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Адаптация под язык</div>
                  <div className="text-sm text-gray-600">
                    Код генерируется с учетом особенностей и лучших практик каждого языка
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Готовность к запуску</div>
                  <div className="text-sm text-gray-600">
                    Сгенерированный проект можно сразу компилировать и запускать
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Документация и тесты</div>
                  <div className="text-sm text-gray-600">
                    Опциональная генерация README, документации и базовых тестов
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Процесс работы */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 text-blue-500 mr-2" />
              Как это работает
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Выбор языка</div>
                  <div className="text-sm text-gray-600">
                    Выберите целевой язык программирования из доступных опций
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Настройка проекта</div>
                  <div className="text-sm text-gray-600">
                    Укажите формат вывода, оптимизации и дополнительные опции
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Генерация кода</div>
                  <div className="text-sm text-gray-600">
                    Система анализирует вашу игру и генерирует оптимизированный код
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold block w-5 h-5 text-center leading-5">4</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Скачивание проекта</div>
                  <div className="text-sm text-gray-600">
                    Получите готовый архив с проектом, инструкциями и зависимостями
                  </div>
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
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-purple-600">
                Какие языки программирования поддерживаются?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                В настоящее время поддерживается 7 языков: JavaScript, TypeScript, Python, Java, C#, Rust и Go. 
                Каждый язык поддерживается с учетом его особенностей и популярных игровых фреймворков.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-purple-600">
                Можно ли конвертировать код между языками?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да! Функция конвертации позволяет переводить код игры из одного языка в другой. 
                Учтите, что некоторые особенности языков могут потребовать ручной доработки.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-purple-600">
                Готов ли сгенерированный код к использованию?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Да, сгенерированный код полностью готов к компиляции и запуску. Включены все необходимые 
                зависимости, конфигурационные файлы и инструкции по сборке.
              </div>
            </details>
            
            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-purple-600">
                Какие игровые движки поддерживаются?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Для каждого языка используются популярные игровые фреймворки: Phaser для JavaScript, 
                Pygame для Python, LibGDX для Java, Unity для C#, Bevy для Rust и Ebiten для Go.
              </div>
            </details>

            <details className="group">
              <summary className="font-medium text-gray-900 cursor-pointer hover:text-purple-600">
                Можно ли добавить собственный код в сгенерированный проект?
              </summary>
              <div className="mt-2 text-sm text-gray-600 pl-4">
                Конечно! Сгенерированный код структурирован и документирован для легкого расширения. 
                Вы можете добавлять новые функции, модифицировать существующую логику и интегрировать внешние библиотеки.
              </div>
            </details>
          </div>
        </div>

        {/* Рекомендации по выбору языка */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Рекомендации по выбору языка
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900">Веб-игры</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для браузерных игр и HTML5
              </p>
              <div className="text-sm text-purple-600 font-medium">
                JavaScript, TypeScript
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Smartphone className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900">Мобильные игры</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для Android и iOS разработки
              </p>
              <div className="text-sm text-green-600 font-medium">
                Java, C#, JavaScript
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Monitor className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-900">Десктопные игры</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для Windows, Mac, Linux
              </p>
              <div className="text-sm text-yellow-600 font-medium">
                C#, Java, Python, Rust
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="w-5 h-5 text-red-500" />
                <span className="font-medium text-gray-900">Высокая производительность</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для требовательных игр
              </p>
              <div className="text-sm text-red-600 font-medium">
                Rust, C#, Java
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-gray-900">Легкое изучение</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для начинающих разработчиков
              </p>
              <div className="text-sm text-indigo-600 font-medium">
                Python, JavaScript
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Типобезопасность</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Для больших проектов
              </p>
              <div className="text-sm text-gray-600 font-medium">
                TypeScript, Java, C#, Rust
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiLanguagePage; 