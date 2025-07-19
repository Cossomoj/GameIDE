import React, { useState, useEffect } from 'react'
import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Gamepad2, 
  BarChart3, 
  Zap, 
  Github,
  Wifi,
  WifiOff 
} from 'lucide-react'
import { useWebSocketConnection } from '@/hooks/useWebSocket'
import { useLocalization } from '../contexts/LocalizationContext'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { isConnected, latency } = useWebSocketConnection()
  const { t, currentLanguage, changeLanguage, availableLanguages } = useLocalization()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Закрытие мобильного меню при изменении роута
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const navigation = [
    { name: 'Главная', href: '/', icon: Home },
    { name: 'Игры', href: '/games', icon: Gamepad2 },
    { name: 'Магазин игр', href: '/game-store', icon: '🛒' },
    { name: 'Статистика', href: '/stats', icon: BarChart3 },
    { name: 'Достижения', href: '/achievements', icon: '🏅' },
    { name: 'Лидерборды', href: '/leaderboards', icon: '📊' },
    { name: 'Продвинутая аналитика', href: '/advanced-analytics', icon: '📈' },
    { name: 'Производительность', href: '/performance', icon: '⚡' },
    { name: 'Валидация', href: '/validation', icon: '🛡️' },
    { name: 'Социальные', href: '/social', icon: '👥' },
    { name: 'Облачные сохранения', href: '/cloud-save', icon: '☁️' },
    { name: 'Турниры', href: '/tournaments', icon: '🏆' },
    { name: 'Тестирование', href: '/testing', icon: '🧪' },
    { name: 'Мультиязычная генерация', href: '/multi-language', icon: '🌐' },
    { name: 'Расширенные шаблоны', href: '/advanced-templates', icon: '🧩' },
    { name: 'Безопасность', href: '/security', icon: '🔒' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Шапка */}
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Логотип и название */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Zap className="h-8 w-8 text-primary-600" />
                <h1 className="ml-2 text-xl font-bold text-gray-900">
                  AI Game Generator
                </h1>
              </div>
            </div>

            {/* Навигация */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-base">{Icon}</span>
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Статус подключения и ссылки */}
            <div className="flex items-center space-x-4">
              {/* WebSocket статус */}
              <div className="flex items-center text-sm">
                {isConnected ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">
                      Подключено {latency && `(${latency}ms)`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Отключено</span>
                  </div>
                )}
              </div>

              {/* GitHub ссылка */}
              <a
                href="https://github.com/yourusername/ai-game-generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>

              {/* Language Selector & Mobile Menu Button */}
              <div className="flex items-center space-x-4">
                {/* Language Selector */}
                <select
                  value={currentLanguage}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={t('navigation.menu')}
                >
                  <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${
                      isMobileMenuOpen ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <nav className="flex flex-col space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-4 py-3 rounded-lg flex items-center space-x-3 text-base font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xl">{Icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Футер */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              AI Game Generator для Яндекс Игр © 2024
            </p>
            <p className="mt-2">
              Создано с помощью DeepSeek AI и OpenAI
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 z-40">
          <nav className="flex justify-around items-center h-16 px-2">
            {navigation.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg flex-1 transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs font-medium truncate">{item.name}</span>
                {isActive(item.href) && (
                  <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Bottom padding for mobile navigation */}
      {isMobile && <div className="h-16"></div>}
    </div>
  )
}

export default Layout 