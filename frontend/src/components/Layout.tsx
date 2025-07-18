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

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { isConnected, latency } = useWebSocketConnection()

  const navigation = [
    { name: 'Главная', href: '/', icon: Home },
    { name: 'Игры', href: '/games', icon: Gamepad2 },
    { name: 'Статистика', href: '/stats', icon: BarChart3 },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href) 
                        ? 'nav-link-active' 
                        : 'nav-link-inactive'
                    } inline-flex items-center`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
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
            </div>
          </div>
        </div>

        {/* Мобильная навигация */}
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
          </div>
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
    </div>
  )
}

export default Layout 