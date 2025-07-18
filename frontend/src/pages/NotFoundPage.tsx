import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="min-h-96 flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <div className="text-4xl font-bold text-gray-900 mb-4">
          Страница не найдена
        </div>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          Похоже, что запрашиваемая страница не существует или была перемещена.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          to="/" 
          className="btn-primary inline-flex items-center"
        >
          <Home className="h-4 w-4 mr-2" />
          На главную
        </Link>
        
        <button 
          onClick={() => window.history.back()}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </button>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 mb-4">Возможно, вас заинтересует:</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/games" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Мои игры
          </Link>
          <Link 
            to="/stats" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Статистика
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage 