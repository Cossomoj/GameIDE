import fs from 'fs'
import path from 'path'

interface EnvVars {
  [key: string]: string | undefined
}

class EnvWriter {
  private envFilePath: string

  constructor() {
    // Используем корневой .env файл проекта, смонтированный в контейнер
    this.envFilePath = '/app/.env'
    console.log('📁 EnvWriter инициализирован с путем к корневому .env:', this.envFilePath)
  }

  // Метод для обновления пути к .env файлу
  set envPath(newPath: string) {
    this.envFilePath = newPath
    console.log('📁 EnvWriter путь обновлен:', this.envFilePath)
  }

  // Чтение всех переменных из .env файла
  readEnvFile(): EnvVars {
    try {
      if (!fs.existsSync(this.envFilePath)) {
        console.log('⚠️ Корневой .env файл не найден:', this.envFilePath)
        return {}
      }

      const envContent = fs.readFileSync(this.envFilePath, 'utf-8')
      const envVars: EnvVars = {}

      envContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim()
          }
        }
      })

      console.log('✅ Прочитано переменных из корневого .env:', Object.keys(envVars).length)
      return envVars
    } catch (error) {
      console.error('❌ Ошибка чтения корневого .env файла:', error)
      return {}
    }
  }

  // Запись переменных в .env файл (обновляет существующий)
  writeEnvFile(newVars: EnvVars): boolean {
    try {
      console.log('📝 Обновление корневого .env файла с переменными:', Object.keys(newVars))
      
      if (!fs.existsSync(this.envFilePath)) {
        console.log('⚠️ Корневой .env файл не найден, создаю новый')
        this.createDefaultEnvFile()
      }

      const existingContent = fs.readFileSync(this.envFilePath, 'utf-8')
      let lines = existingContent.split('\n')

      // Обновляем существующие переменные или добавляем новые
      Object.entries(newVars).forEach(([key, value]) => {
        let found = false
        
        // Ищем существующую строку с этой переменной
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith(`${key}=`)) {
            lines[i] = `${key}=${value}`
            found = true
            console.log(`🔄 Обновлена переменная: ${key}`)
            break
          }
        }
        
        // Если переменная не найдена, добавляем её в соответствующую секцию
        if (!found) {
          this.addVariableToSection(lines, key, value as string)
          console.log(`➕ Добавлена новая переменная: ${key}`)
        }
      })

      fs.writeFileSync(this.envFilePath, lines.join('\n'), 'utf-8')
      console.log('✅ Корневой .env файл успешно обновлен')
      return true
    } catch (error) {
      console.error('❌ Ошибка записи корневого .env файла:', error)
      return false
    }
  }

  // Добавление переменной в соответствующую секцию
  private addVariableToSection(lines: string[], key: string, value: string): void {
    const upperKey = key.toUpperCase()
    
    // Определяем секцию по ключу
    let sectionComment = ''
    if (upperKey.includes('OPENAI')) {
      sectionComment = '# OpenAI API для генерации графики и звуков'
    } else if (upperKey.includes('CLAUDE')) {
      sectionComment = '# Claude API для анализа и генерации'
    } else if (upperKey.includes('DEEPSEEK')) {
      sectionComment = '# DeepSeek API для генерации кода игр'
    } else if (upperKey.includes('POSTGRES') || upperKey.includes('DATABASE')) {
      sectionComment = '# PostgreSQL настройки'
    } else {
      sectionComment = '# Дополнительные настройки'
    }

    // Ищем секцию или добавляем в конец
    let sectionIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(sectionComment)) {
        sectionIndex = i
        break
      }
    }

    if (sectionIndex !== -1) {
      // Найдена секция, добавляем после неё
      let insertIndex = sectionIndex + 1
      // Пропускаем комментарии и пустые строки после заголовка секции
      while (insertIndex < lines.length && 
             (lines[insertIndex].trim().startsWith('#') || 
              lines[insertIndex].trim() === '')) {
        insertIndex++
      }
      // Найдем конец секции (следующая пустая строка или комментарий секции)
      while (insertIndex < lines.length && 
             lines[insertIndex].trim() !== '' && 
             !lines[insertIndex].trim().startsWith('# ===') &&
             !lines[insertIndex].trim().startsWith('# ---')) {
        insertIndex++
      }
      lines.splice(insertIndex, 0, `${key}=${value}`)
    } else {
      // Секция не найдена, добавляем в конец файла
      if (lines[lines.length - 1].trim() !== '') {
        lines.push('')
      }
      lines.push(`# ${sectionComment.replace('# ', '')}`)
      lines.push(`${key}=${value}`)
      lines.push('')
    }
  }

  // Обновление конкретных переменных AI сервиса
  updateAIServiceVars(provider: string, apiKey: string, model: string): boolean {
    const upperProvider = provider.toUpperCase()
    const vars: EnvVars = {}
    
    if (apiKey) {
      vars[`${upperProvider}_API_KEY`] = apiKey
    }
    if (model) {
      vars[`${upperProvider}_MODEL`] = model
    }

    console.log(`💾 Сохранение настроек ${provider} в корневой .env файл`)
    return this.writeEnvFile(vars)
  }

  // Получение переменных конкретного AI сервиса
  getAIServiceVars(provider: string): { apiKey: string; model: string } {
    const envVars = this.readEnvFile()
    const upperProvider = provider.toUpperCase()
    
    const result = {
      apiKey: envVars[`${upperProvider}_API_KEY`] || '',
      model: envVars[`${upperProvider}_MODEL`] || this.getDefaultModel(provider)
    }
    
    console.log(`📖 Загружены настройки ${provider}:`, {
      hasApiKey: !!result.apiKey,
      apiKeyLength: result.apiKey.length,
      model: result.model
    })
    
    return result
  }

  // Создание базового .env файла (если его нет)
  private createDefaultEnvFile(): void {
    const defaultContent = `# GameIDE Environment Configuration
# Скопируйте этот файл в .env и заполните своими значениями

# =====================================
# AI API Keys (обязательно)
# =====================================

# DeepSeek API для генерации кода игр
# Получить можно на: https://platform.deepseek.com/
DEEPSEEK_API_KEY=

# OpenAI API для генерации графики и звуков  
# Получить можно на: https://platform.openai.com/
OPENAI_API_KEY=

# Claude API для анализа и генерации
# Получить можно на: https://console.anthropic.com/
CLAUDE_API_KEY=

# =====================================
# Database Configuration
# =====================================

# PostgreSQL настройки
POSTGRES_DB=gameide_db
POSTGRES_USER=gameide
POSTGRES_PASSWORD=gameide_password

# =====================================
# Other Settings
# =====================================
`
    fs.writeFileSync(this.envFilePath, defaultContent, 'utf-8')
    console.log('✅ Создан базовый корневой .env файл')
  }

  // Получение модели по умолчанию для сервиса
  private getDefaultModel(provider: string): string {
    const defaults: { [key: string]: string } = {
      'openai': 'gpt-4',
      'claude': 'claude-3-sonnet-20240229',
      'deepseek': 'deepseek-coder'
    }
    return defaults[provider.toLowerCase()] || ''
  }

  // Валидация API ключа по формату
  validateApiKeyFormat(provider: string, apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') return false

    const patterns: { [key: string]: RegExp } = {
      'openai': /^sk-[a-zA-Z0-9\-_]{20,}$/,
      'claude': /^sk-ant-[a-zA-Z0-9\-_]{90,}$/,
      'deepseek': /^sk-[a-zA-Z0-9]{20,}$/
    }

    const pattern = patterns[provider.toLowerCase()]
    const isValid = pattern ? pattern.test(apiKey.trim()) : apiKey.length > 10
    
    console.log(`🔍 Валидация API ключа ${provider}:`, {
      length: apiKey.length,
      format: isValid ? 'valid' : 'invalid',
      pattern: pattern?.toString()
    })
    
    return isValid
  }

  // Маскирование API ключа для отображения
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return apiKey
    
    const start = apiKey.substring(0, 8)
    const end = apiKey.substring(apiKey.length - 4)
    const middle = '*'.repeat(Math.max(0, apiKey.length - 12))
    
    return `${start}${middle}${end}`
  }
}

// Экспортируем единственный экземпляр
export const envWriter = new EnvWriter()
export default envWriter 