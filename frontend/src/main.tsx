import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

// Создаем экземпляр React Query клиента
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут (заменяет cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
})

console.log('🚀 Инициализация React приложения...')

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
  console.log('✅ React приложение успешно инициализировано')
} catch (error) {
  console.error('❌ Ошибка инициализации React:', error)
  
  // Показываем ошибку пользователю
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; color: red;">
      <h2>Ошибка загрузки приложения</h2>
      <p>Подробности в консоли браузера</p>
      <pre>${error}</pre>
    </div>
  `
} 