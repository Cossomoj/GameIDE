import React, { useState, useEffect } from 'react'
import { aiAPI } from '../services/api'

interface ModelOption {
  id: string
  name: string
  description: string
}

interface ModelSelectorProps {
  provider: string
  currentModel: string
  models: ModelOption[]
  apiKey?: string
  onChange: (model: string) => void
  disabled?: boolean
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  provider,
  currentModel,
  models,
  apiKey,
  onChange,
  disabled = false
}) => {
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null)

  // Проверяем, есть ли текущая модель в списке доступных
  useEffect(() => {
    const modelExists = models.some(model => model.id === currentModel)
    if (!modelExists && currentModel) {
      setIsManualMode(true)
      setManualInput(currentModel)
    }
  }, [currentModel, models])



  // Валидация модели через бэкенд API
  const validateModel = async (model: string) => {
    if (!model.trim()) return

    setIsValidating(true)
    setValidationResult(null)

    try {
      console.log(`🔍 Валидация модели ${provider}/${model}`)
      
      const response = await aiAPI.validateModel(provider, model, apiKey)
      
      if (response.success) {
        setValidationResult({ 
          valid: response.valid,
          error: response.error || undefined
        })
        
        if (response.valid) {
          console.log(`✅ Модель ${model} найдена в API ${provider}`)
        } else {
          console.log(`❌ Модель ${model} не найдена в API ${provider}`)
        }
      } else {
        setValidationResult({ 
          valid: false, 
          error: response.error || 'Ошибка валидации модели'
        })
      }
    } catch (error) {
      setValidationResult({ 
        valid: false, 
        error: `Ошибка валидации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      })
      console.error(`❌ Ошибка валидации модели ${model}:`, error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleModeSwitch = (toManual: boolean) => {
    setIsManualMode(toManual)
    if (toManual) {
      setManualInput(currentModel)
    } else {
      // Если возвращаемся к выбору из списка, выбираем первую доступную модель
      if (models.length > 0) {
        onChange(models[0].id)
      }
    }
    setValidationResult(null)
  }

  const handleManualInputChange = (value: string) => {
    setManualInput(value)
    onChange(value)
    
    // Валидируем с задержкой
    if (value.trim()) {
      const timeoutId = setTimeout(() => validateModel(value), 1000)
      return () => clearTimeout(timeoutId)
    }
  }

  const selectedModel = models.find(m => m.id === currentModel)

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Модель
        </label>
        <button
          type="button"
          onClick={() => handleModeSwitch(!isManualMode)}
          className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
          disabled={disabled}
        >
          {isManualMode ? '📋 Выбрать из списка' : '✏️ Ввести вручную'}
        </button>
      </div>

      {isManualMode ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => handleManualInputChange(e.target.value)}
              placeholder={`Введите название модели ${provider}...`}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono pr-8"
            />
            {isValidating && (
              <div className="absolute right-2 top-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          
          {validationResult && (
            <div className={`text-xs p-2 rounded ${
              validationResult.valid 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {validationResult.valid ? (
                <span className="flex items-center">
                  <span className="mr-1">✅</span>
                  Модель найдена и доступна
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-1">❌</span>
                  {validationResult.error}
                </span>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            💡 Примеры моделей {provider}:
            {provider === 'openai' && (
              <div className="mt-1 space-y-1">
                <div>• gpt-4o, gpt-4o-mini</div>
                <div>• gpt-4-turbo, gpt-4</div>
                <div>• gpt-3.5-turbo</div>
              </div>
            )}
            {provider === 'claude' && (
              <div className="mt-1 space-y-1">
                <div>• claude-3-5-sonnet-20241022</div>
                <div>• claude-3-5-haiku-20241022</div>
                <div>• claude-3-opus-20240229</div>
              </div>
            )}
            {provider === 'deepseek' && (
              <div className="mt-1 space-y-1">
                <div>• deepseek-chat</div>
                <div>• deepseek-coder</div>
                <div>• deepseek-reasoner</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={currentModel}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          
          {selectedModel?.description && (
            <p className="text-xs text-gray-500">
              {selectedModel.description}
            </p>
          )}
          
          <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
            ⚠️ Список моделей может быть устаревшим. Используйте ручной ввод для новых моделей.
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector 