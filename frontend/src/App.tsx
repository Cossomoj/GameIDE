// import { Routes, Route } from 'react-router-dom'
// import Layout from '@/components/Layout'
// import HomePage from '@/pages/HomePage'
// import GamesPage from '@/pages/GamesPage'
// import GameDetailsPage from '@/pages/GameDetailsPage'
// import StatsPage from '@/pages/StatsPage'
// import NotFoundPage from '@/pages/NotFoundPage'
// import InteractiveGeneration from './pages/InteractiveGeneration'
// import GameConfigurationPage from './pages/GameConfigurationPage'

import { useState, useEffect } from 'react'

function App() {
  console.log('🎮 App component rendering!')
  
  // Состояние для статусов сервисов
  const [apiStatus, setApiStatus] = useState({
    backend: 'checking', // 'online', 'offline', 'checking'
    frontend: 'online',
    database: 'checking'
  })

  // Состояние для AI сервисов
  const [aiStatus, setAiStatus] = useState({
    deepseek: {
      status: 'checking',
      configured: false,
      model: '',
      available: false
    },
    openai: {
      status: 'checking', 
      configured: false,
      model: '',
      available: false
    },
    claude: {
      status: 'checking',
      configured: false,
      model: '',
      available: false
    }
  })

  // Состояние для типов задач AI (множественный выбор)
  const [aiTaskTypes, setAiTaskTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('gameide-ai-task-types')
      const parsed = saved ? JSON.parse(saved) : null
      
      // Если старый формат (строки), конвертируем в массивы
      if (parsed && typeof parsed.deepseek === 'string') {
        return {
          deepseek: [parsed.deepseek],
          openai: [parsed.openai],
          claude: ['code'] // добавляем Claude с настройкой по умолчанию
        }
      }
      
      return parsed || {
        deepseek: ['code'], // массив выбранных типов
        openai: ['images'],  // массив выбранных типов
        claude: ['code'] // массив выбранных типов для Claude
      }
    } catch {
      return {
        deepseek: ['code'],
        openai: ['images'],
        claude: ['code']
      }
    }
  })

  // Состояние для модального окна настроек
  const [settingsModal, setSettingsModal] = useState({
    isOpen: false,
    provider: '', // 'deepseek' или 'openai'
    apiKey: '',
    model: ''
  })

  // Функция проверки статуса backend API
  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // таймаут 5 секунд
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend API доступен:', data)
        return 'online'
      } else {
        console.warn('⚠️ Backend API вернул ошибку:', response.status)
        return 'offline'
      }
    } catch (error) {
      console.warn('❌ Backend API недоступен:', error)
      return 'offline'
    }
  }

  // Функция проверки статуса AI сервисов
  const checkAiStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ai/status', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🤖 AI сервисы:', data.services)
        
        setAiStatus({
          deepseek: {
            status: data.services.deepseek.status,
            configured: data.services.deepseek.configured,
            model: data.services.deepseek.model,
            available: data.services.deepseek.available
          },
          openai: {
            status: data.services.openai.status,
            configured: data.services.openai.configured,
            model: data.services.openai.model,
            available: data.services.openai.available
          },
          claude: {
            status: data.services.claude.status,
            configured: data.services.claude.configured,
            model: data.services.claude.model,
            available: data.services.claude.available
          }
        })
      } else {
        console.warn('⚠️ Не удалось получить статус AI сервисов')
        setAiStatus(prev => ({
          deepseek: { ...prev.deepseek, status: 'offline' },
          openai: { ...prev.openai, status: 'offline' },
          claude: { ...prev.claude, status: 'offline' }
        }))
      }
    } catch (error) {
      console.warn('❌ Ошибка проверки AI сервисов:', error)
      setAiStatus(prev => ({
        deepseek: { ...prev.deepseek, status: 'offline' },
        openai: { ...prev.openai, status: 'offline' },
        claude: { ...prev.claude, status: 'offline' }
      }))
    }
  }

  // Функция проверки всех сервисов
  const checkAllServices = async () => {
    console.log('🔍 Проверка статуса сервисов...')
    
    const backendStatus = await checkBackendStatus()
    
    setApiStatus(prev => ({
      ...prev,
      backend: backendStatus,
      database: backendStatus === 'online' ? 'online' : 'checking'
    }))

    // Всегда проверяем AI сервисы
    await checkAiStatus()
  }

  // Проверяем статус при загрузке и каждые 10 секунд
  useEffect(() => {
    checkAllServices()
    
    const interval = setInterval(checkAllServices, 10000) // каждые 10 секунд
    
    return () => clearInterval(interval)
  }, [])

  // Сохраняем предпочтения типов задач в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gameide-ai-task-types', JSON.stringify(aiTaskTypes))
      console.log('💾 Предпочтения типов задач AI сохранены:', aiTaskTypes)
    } catch (error) {
      console.warn('⚠️ Не удалось сохранить предпочтения типов задач:', error)
    }
  }, [aiTaskTypes])

  // Функции управления модальным окном настроек
  const openSettingsModal = async (provider) => {
    try {
      console.log('🔧 Загрузка настроек для:', provider)
      
      // Загружаем текущие настройки с backend
      const response = await fetch('http://localhost:3000/api/ai/settings', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings[provider]
        
        setSettingsModal({
          isOpen: true,
          provider: provider,
          apiKey: settings.apiKey || '',
          model: settings.model || (
            provider === 'deepseek' ? 'deepseek-coder' : 
            provider === 'openai' ? 'dall-e-3' : 
            'claude-sonnet-4-20250514'
          )
        })
        
        console.log('✅ Настройки загружены:', { provider, hasKey: !!settings.apiKey, model: settings.model })
      } else {
        console.warn('⚠️ Не удалось загрузить настройки, используем значения по умолчанию')
        const currentSettings = aiStatus[provider]
        setSettingsModal({
          isOpen: true,
          provider: provider,
          apiKey: '',
          model: currentSettings.model || (
            provider === 'deepseek' ? 'deepseek-coder' : 
            provider === 'openai' ? 'dall-e-3' : 
            'claude-sonnet-4-20250514'
          )
        })
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек:', error)
      const currentSettings = aiStatus[provider]
      setSettingsModal({
        isOpen: true,
        provider: provider,
        apiKey: '',
        model: currentSettings.model || (
          provider === 'deepseek' ? 'deepseek-coder' : 
          provider === 'openai' ? 'dall-e-3' : 
          'claude-sonnet-4-20250514'
        )
      })
    }
  }

  const closeSettingsModal = () => {
    setSettingsModal({
      isOpen: false,
      provider: '',
      apiKey: '',
      model: ''
    })
  }

  const saveAiSettings = async () => {
    try {
      console.log('💾 Сохранение настроек AI:', settingsModal.provider)
      
      const response = await fetch('http://localhost:3000/api/ai/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: settingsModal.provider,
          apiKey: settingsModal.apiKey,
          model: settingsModal.model
        })
      })

      if (response.ok) {
        console.log('✅ Настройки AI сохранены')
        closeSettingsModal()
        // Перепроверяем статус AI после сохранения
        setTimeout(checkAiStatus, 1000)
      } else {
        const errorData = await response.json()
        console.error('❌ Ошибка сохранения настроек AI:', errorData)
        
        if (errorData.validModels) {
          alert(`❌ ${errorData.error}\n\n💡 ${errorData.suggestion}`)
        } else {
          alert(`❌ Ошибка: ${errorData.error || 'Неизвестная ошибка'}`)
        }
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек AI:', error)
      alert('❌ Ошибка сети при сохранении настроек')
    }
  }

  // Функция для получения иконки и цвета статуса
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'online':
        return { icon: '✅', text: 'Работает', color: '#10b981' }
      case 'offline':
        return { icon: '❌', text: 'Недоступен', color: '#ef4444' }
      case 'checking':
        return { icon: '🔄', text: 'Проверка...', color: '#f59e0b' }
      default:
        return { icon: '❓', text: 'Неизвестно', color: '#6b7280' }
    }
  }

  // Функции для типов задач AI
  const getTaskTypeIcon = (taskType) => {
    switch (taskType) {
      case 'code': return '💻'
      case 'text': return '📝'
      case 'logic': return '🧠'
      case 'images': return '🎨'
      case 'sprites': return '🖼️'
      case 'audio': return '🔊'
      case 'architecture': return '🏗️'
      case 'analysis': return '🔍'
      case 'optimization': return '⚡'
      default: return '❓'
    }
  }

  const getTaskTypeName = (taskType) => {
    switch (taskType) {
      case 'code': return 'Код'
      case 'text': return 'Текст'
      case 'logic': return 'Логика'
      case 'images': return 'Изображения'
      case 'sprites': return 'Спрайты'
      case 'audio': return 'Звуки'
      case 'architecture': return 'Архитектура'
      case 'analysis': return 'Анализ'
      case 'optimization': return 'Оптимизация'
      default: return 'Неизвестно'
    }
  }

  // Функция для обработки изменения типов задач (множественный выбор)
  const handleTaskTypeChange = (provider, taskType, checked) => {
    setAiTaskTypes(prev => {
      const currentTypes = prev[provider] || []
      if (checked) {
        // Добавляем тип, если его нет
        return {
          ...prev,
          [provider]: currentTypes.includes(taskType) 
            ? currentTypes 
            : [...currentTypes, taskType]
        }
      } else {
        // Убираем тип
        return {
          ...prev,
          [provider]: currentTypes.filter(type => type !== taskType)
        }
      }
    })
  }

  const backendDisplay = getStatusDisplay(apiStatus.backend)
  const frontendDisplay = getStatusDisplay(apiStatus.frontend)
  const databaseDisplay = getStatusDisplay(apiStatus.database)
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            margin: 0
          }}>
            🎮 AI Game Generator
          </h1>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <span style={{ 
              color: backendDisplay.color,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {backendDisplay.icon} API {backendDisplay.text}
            </span>
            <button 
              onClick={checkAllServices}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              🔄 Обновить
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Создавайте игры с помощью ИИ
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            marginBottom: '2rem'
          }}>
            Генерируйте HTML5 игры для Яндекс Игр с помощью искусственного интеллекта
          </p>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              style={{
                backgroundColor: (apiStatus.backend === 'online' && (aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available)) 
                  ? '#3b82f6' : '#94a3b8',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: (apiStatus.backend === 'online' && (aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available)) 
                  ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
              disabled={!(apiStatus.backend === 'online' && (aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available))}
                              title={
                  apiStatus.backend !== 'online' 
                    ? 'Backend недоступен' 
                    : !(aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available)
                      ? 'AI сервисы недоступны' 
                      : `Создать игру: ${[
                          aiStatus.deepseek.available && (aiTaskTypes.deepseek || []).length > 0 && 
                            (aiTaskTypes.deepseek || []).map(taskType => 
                              `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                            ).join(', '),
                          aiStatus.openai.available && (aiTaskTypes.openai || []).length > 0 && 
                            (aiTaskTypes.openai || []).map(taskType => 
                              `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                            ).join(', '),
                          aiStatus.claude.available && (aiTaskTypes.claude || []).length > 0 && 
                            (aiTaskTypes.claude || []).map(taskType => 
                              `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                            ).join(', ')
                        ].filter(Boolean).join(' + ')}`
                }
            >
              🚀 Создать игру
            </button>
            <button style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              📋 Мои игры
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              🎯 Статус системы
            </h3>
            <div style={{ color: '#64748b', margin: 0 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span>Frontend:</span>
                <span style={{ color: frontendDisplay.color }}>
                  {frontendDisplay.icon} {frontendDisplay.text}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span>Backend:</span>
                <span style={{ color: backendDisplay.color }}>
                  {backendDisplay.icon} {backendDisplay.text}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <span>База данных:</span>
                <span style={{ color: databaseDisplay.color }}>
                  {databaseDisplay.icon} {databaseDisplay.text}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🤖 AI Сервисы
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                fontWeight: 'normal',
                backgroundColor: '#f3f4f6',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem'
              }}>
                {Object.entries(aiTaskTypes).map(([provider, taskTypes]) => {
                  if (!Array.isArray(taskTypes) || taskTypes.length === 0) return null;
                  return taskTypes.map(taskType => 
                    `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                  ).join(', ');
                }).filter(Boolean).join(' + ')}
              </div>
            </h3>
            <div style={{ color: '#64748b', margin: 0 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span>DeepSeek AI:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  {(() => {
                    const ds = aiStatus.deepseek;
                    if (ds.status === 'checking') return <span style={{ color: '#f59e0b' }}>🔄 Проверка...</span>;
                    if (!ds.configured) return <span style={{ color: '#94a3b8' }}>⚙️ Не настроен</span>;
                    if (ds.status === 'online') return <span style={{ color: '#10b981' }}>✅ Работает</span>;
                    if (ds.status === 'error') return <span style={{ color: '#ef4444' }}>⚠️ Ошибка</span>;
                    return <span style={{ color: '#ef4444' }}>❌ Недоступен</span>;
                  })()}
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fafafa',
                    fontSize: '0.75rem',
                    minWidth: '140px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      borderBottom: '1px solid #e5e7eb',
                      paddingBottom: '0.25rem'
                    }}>
                      DeepSeek задачи:
                    </div>
                    {[
                      { value: 'code', label: '💻 Код игр' },
                      { value: 'text', label: '📝 Текст' },
                      { value: 'logic', label: '🧠 Логика' }
                    ].map(({ value, label }) => (
                      <label key={value} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        cursor: 'pointer',
                        color: '#374151',
                        padding: '0.125rem',
                        borderRadius: '0.25rem',
                        backgroundColor: (aiTaskTypes.deepseek || []).includes(value) ? '#dbeafe' : 'transparent',
                        border: (aiTaskTypes.deepseek || []).includes(value) ? '1px solid #3b82f6' : '1px solid transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={(aiTaskTypes.deepseek || []).includes(value)}
                          onChange={(e) => handleTaskTypeChange('deepseek', value, e.target.checked)}
                          style={{ 
                            margin: 0,
                            accentColor: '#3b82f6',
                            width: '14px',
                            height: '14px'
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => openSettingsModal('deepseek')}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.125rem 0.25rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ Настройка
                  </button>
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span>OpenAI:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  {(() => {
                    const oa = aiStatus.openai;
                    if (oa.status === 'checking') return <span style={{ color: '#f59e0b' }}>🔄 Проверка...</span>;
                    if (!oa.configured) return <span style={{ color: '#94a3b8' }}>⚙️ Не настроен</span>;
                    if (oa.status === 'online') return <span style={{ color: '#10b981' }}>✅ Работает</span>;
                    if (oa.status === 'error') return <span style={{ color: '#ef4444' }}>⚠️ Ошибка</span>;
                    return <span style={{ color: '#ef4444' }}>❌ Недоступен</span>;
                  })()}
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fafafa',
                    fontSize: '0.75rem',
                    minWidth: '140px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      borderBottom: '1px solid #e5e7eb',
                      paddingBottom: '0.25rem'
                    }}>
                      OpenAI задачи:
                    </div>
                    {[
                      { value: 'images', label: '🎨 Изображения' },
                      { value: 'sprites', label: '🖼️ Спрайты' },
                      { value: 'text', label: '📝 Текст' },
                      { value: 'audio', label: '🔊 Звуки' }
                    ].map(({ value, label }) => (
                      <label key={value} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        cursor: 'pointer',
                        color: '#374151',
                        padding: '0.125rem',
                        borderRadius: '0.25rem',
                        backgroundColor: (aiTaskTypes.openai || []).includes(value) ? '#dcfce7' : 'transparent',
                        border: (aiTaskTypes.openai || []).includes(value) ? '1px solid #10b981' : '1px solid transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={(aiTaskTypes.openai || []).includes(value)}
                          onChange={(e) => handleTaskTypeChange('openai', value, e.target.checked)}
                          style={{ 
                            margin: 0,
                            accentColor: '#10b981',
                            width: '14px',
                            height: '14px'
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => openSettingsModal('openai')}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      padding: '0.125rem 0.25rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ Настройка
                  </button>
                              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span>Claude AI:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                {(() => {
                  const cl = aiStatus.claude;
                  if (cl.status === 'checking') return <span style={{ color: '#f59e0b' }}>🔄 Проверка...</span>;
                  if (!cl.configured) return <span style={{ color: '#94a3b8' }}>⚙️ Не настроен</span>;
                  if (cl.status === 'online') return <span style={{ color: '#10b981' }}>✅ Работает</span>;
                  if (cl.status === 'error') return <span style={{ color: '#ef4444' }}>⚠️ Ошибка</span>;
                  return <span style={{ color: '#ef4444' }}>❌ Недоступен</span>;
                })()}
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fafafa',
                  fontSize: '0.75rem',
                  minWidth: '140px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#6b7280',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '0.25rem'
                  }}>
                    Claude задачи:
                  </div>
                  {[
                    { value: 'code', label: '💻 Код' },
                    { value: 'architecture', label: '🏗️ Архитектура' },
                    { value: 'analysis', label: '🔍 Анализ' },
                    { value: 'optimization', label: '⚡ Оптимизация' }
                  ].map(({ value, label }) => (
                    <label key={value} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      cursor: 'pointer',
                      color: '#374151',
                      padding: '0.125rem',
                      borderRadius: '0.25rem',
                      backgroundColor: (aiTaskTypes.claude || []).includes(value) ? '#fde8e8' : 'transparent',
                      border: (aiTaskTypes.claude || []).includes(value) ? '1px solid #f59e0b' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        checked={(aiTaskTypes.claude || []).includes(value)}
                        onChange={(e) => handleTaskTypeChange('claude', value, e.target.checked)}
                        style={{ 
                          margin: 0,
                          accentColor: '#f59e0b',
                          width: '14px',
                          height: '14px'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{label}</span>
                    </label>
                  ))}
                </div>
                
                <button 
                  onClick={() => openSettingsModal('claude')}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    padding: '0.125rem 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  ⚙️ Настройка
                </button>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <span>Генерация:</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span style={{ 
                  color: (aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available) ? '#10b981' : '#ef4444' 
                }}>
                  {(aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available) 
                    ? '✅ Готов' 
                    : '❌ AI недоступен'}
                </span>
                {(aiStatus.deepseek.available || aiStatus.openai.available || aiStatus.claude.available) && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {[
                        aiStatus.deepseek.available && (aiTaskTypes.deepseek || []).length > 0 && 
                          (aiTaskTypes.deepseek || []).map(taskType => 
                            `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                          ).join(', '),
                        aiStatus.openai.available && (aiTaskTypes.openai || []).length > 0 && 
                          (aiTaskTypes.openai || []).map(taskType => 
                            `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                          ).join(', '),
                        aiStatus.claude.available && (aiTaskTypes.claude || []).length > 0 && 
                          (aiTaskTypes.claude || []).map(taskType => 
                            `${getTaskTypeIcon(taskType)} ${getTaskTypeName(taskType)}`
                          ).join(', ')
                      ].filter(Boolean).join(' + ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Информация о последней проверке */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem'
        }}>
          <p>Автоматическая проверка каждые 10 секунд</p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'white',
        padding: '2rem 0',
        marginTop: '4rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ margin: 0 }}>
            AI Game Generator для Яндекс Игр © 2024
          </p>
        </div>
      </footer>

      {/* Модальное окно настроек AI */}
      {settingsModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Заголовок модального окна */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0
              }}>
                🤖 Настройки {
                  settingsModal.provider === 'deepseek' ? 'DeepSeek AI' : 
                  settingsModal.provider === 'openai' ? 'OpenAI' : 
                  'Claude AI'
                }
              </h3>
              <button 
                onClick={closeSettingsModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Форма настроек */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                API Ключ:
              </label>
              <input
                type="text"
                placeholder={`Введите ${
                  settingsModal.provider === 'deepseek' ? 'DeepSeek' : 
                  settingsModal.provider === 'openai' ? 'OpenAI' : 
                  'Claude'
                } API ключ`}
                value={settingsModal.apiKey}
                onChange={(e) => setSettingsModal(prev => ({ ...prev, apiKey: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.5rem 0 0 0'
              }}>
                {settingsModal.provider === 'deepseek' 
                  ? 'Получите API ключ на https://platform.deepseek.com'
                  : settingsModal.provider === 'openai' 
                    ? 'Получите API ключ на https://platform.openai.com'
                    : 'Получите API ключ на https://console.anthropic.com'
                }
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Модель:
              </label>
              <input
                type="text"
                placeholder={`Введите модель ${
                  settingsModal.provider === 'deepseek' ? '(например: deepseek-coder)' : 
                  settingsModal.provider === 'openai' ? '(например: dall-e-3)' : 
                  '(например: claude-sonnet-4-20250514)'
                }`}
                value={settingsModal.model}
                onChange={(e) => setSettingsModal(prev => ({ ...prev, model: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.5rem 0 0 0'
              }}>
                {settingsModal.provider === 'deepseek' 
                  ? 'Доступные модели: deepseek-coder, deepseek-chat, deepseek-reasoner'
                  : settingsModal.provider === 'openai' 
                    ? 'Доступные модели: dall-e-3, dall-e-2, gpt-4, gpt-4-turbo, gpt-4o, gpt-3.5-turbo'
                    : 'Доступные модели: claude-opus-4-20250514, claude-sonnet-4-20250514, claude-haiku-4-20250514, claude-3-5-sonnet-20241022'
                }
              </p>
            </div>

            {/* Кнопки */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeSettingsModal}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={saveAiSettings}
                disabled={!settingsModal.apiKey.trim() || !settingsModal.model.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: (settingsModal.apiKey.trim() && settingsModal.model.trim()) ? '#3b82f6' : '#94a3b8',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: (settingsModal.apiKey.trim() && settingsModal.model.trim()) ? 'pointer' : 'not-allowed'
                }}
              >
                💾 Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// function App() {
//   return (
//     <Layout>
//       <Routes>
//         <Route path="/" element={<HomePage />} />
//         <Route path="/games" element={<GamesPage />} />
//         <Route path="/games/:id" element={<GameDetailsPage />} />
//         <Route path="/configure-game" element={<GameConfigurationPage />} />
//         <Route path="/interactive-generation" element={<InteractiveGeneration />} />
//         <Route path="/interactive/:gameId" element={<InteractiveGeneration />} />
//         <Route path="/stats" element={<StatsPage />} />
//         <Route path="*" element={<NotFoundPage />} />
//       </Routes>
//     </Layout>
//   )
// }

export default App 