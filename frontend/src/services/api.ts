import axios, { AxiosResponse } from 'axios';
import {
  Game,
  CreateGameRequest,
  ApiResponse,
  PaginatedResponse,
  Statistics,
  HistoryStatistics,
  GenreStatistics,
} from '@/types';
import { toast } from 'react-hot-toast'

// Типы данных для API
export interface GameCreationRequest {
  title: string
  genre: string
  description: string
  artStyle?: string
  targetAudience?: string
  monetization?: string[]
  options?: {
    quality?: 'fast' | 'balanced' | 'high'
    optimization?: 'size' | 'performance'
  }
}

export interface GameCreationResponse {
  success: boolean
  game: {
    id: string
    title: string
    description: string
    status: 'queued' | 'generating' | 'completed' | 'failed'
    progress: number
    createdAt: string
    generationPlan?: {
      enabledStages: string[]
      settings: any
    }
  }
  message: string
}

export interface Game {
  id: string
  title: string
  description: string
  genre: string
  status: 'queued' | 'generating' | 'completed' | 'failed'
  progress: number
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  thumbnailUrl?: string
}

export interface StatsResponse {
  success: boolean
  data: {
    totalGames: number
    completedGames: number
    totalDownloads: number
    totalPlayTime: number
    averageRating: number
    genreStats: { [genre: string]: number }
    monthlyStats: Array<{
      month: string
      gamesCreated: number
      downloads: number
    }>
  }
}

export interface AIModel {
  id: string
  name: string
  description: string
}

export interface AIModelsResponse {
  success: boolean
  provider?: string
  models: AIModel[] | { [provider: string]: AIModel[] }
  timestamp: string
}

export interface AIStatusResponse {
  timestamp: string
  services: {
    [provider: string]: {
      configured: boolean
      status: 'online' | 'offline' | 'not_configured' | 'error'
      available: boolean
      model: string
      apiKey?: string
      apiKeyStatus: 'valid' | 'invalid' | 'error' | 'not_configured'
      error?: string
    }
  }
}

export interface GenerationSettingsResponse {
  success: boolean
  settings: {
    stages: {
      [stageName: string]: {
        enabled: boolean
        provider: string
      }
    }
  }
  timestamp: string
}

// Базовый URL API - всегда используем относительный путь для прокси
const API_BASE_URL = '/api'

console.log('🔗 API Base URL:', API_BASE_URL)
console.log('🔧 Vite ENV Mode:', import.meta.env.MODE)

class APIClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Базовый метод для HTTP запросов
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`)
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }
    
    try {
      const response = await fetch(url, config)
      
      console.log(`📡 API Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorData)
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`✅ API Success:`, data)
      
      return data
    } catch (error) {
      console.error(`💥 API Request Failed:`, {
        url,
        method: options.method || 'GET',
        error: error.message,
        baseURL: this.baseURL
      })
      
      // Показываем пользователю уведомление об ошибке
      if (error instanceof Error) {
        toast.error(`Ошибка API: ${error.message}`)
      } else {
        toast.error('Произошла неизвестная ошибка')
      }
      
      throw error
    }
  }

  // Методы для работы с играми
  async createGame(gameData: GameCreationRequest): Promise<GameCreationResponse> {
    return this.request<GameCreationResponse>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  }

  async getGames(): Promise<{ success: boolean; games: Game[] }> {
    return this.request<{ success: boolean; games: Game[] }>('/games')
  }

  async getGame(gameId: string): Promise<{ success: boolean; game: Game }> {
    return this.request<{ success: boolean; game: Game }>(`/games/${gameId}`)
  }

  async deleteGame(gameId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/games/${gameId}`, {
      method: 'DELETE',
    })
  }

  // Методы для статистики
  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/stats')
  }

  // Методы для AI сервисов
  async getAIStatus(): Promise<AIStatusResponse> {
    return this.request<AIStatusResponse>('/ai/status')
  }

  // Методы для интерактивной генерации
  async startInteractiveGeneration(data: {
    title: string;
    description: string;
    genre?: string;
    userId?: string;
    quality?: 'fast' | 'balanced' | 'high';
  }): Promise<{
    success: boolean;
    data: {
      gameId: string;
      currentStep: number;
      totalSteps: number;
      step: {
        stepId: string;
        name: string;
        description: string;
        variants: Array<{
          id: string;
          title: string;
          description: string;
        }>;
      };
    };
    message: string;
  }> {
    return this.request('/interactive/start', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getInteractiveState(gameId: string): Promise<{
    success: boolean;
    data: {
      gameId: string;
      currentStep: number;
      totalSteps: number;
      step: {
        stepId: string;
        name: string;
        description: string;
        variants: Array<{
          id: string;
          title: string;
          description: string;
        }>;
      };
      isActive: boolean;
      isPaused: boolean;
      completedSteps: number;
      startedAt: string;
      lastActivityAt: string;
    };
  }> {
    return this.request(`/interactive/${gameId}/state`)
  }

  async generateStepVariants(gameId: string, stepId: string, count: number = 5, customPrompt?: string): Promise<{
    success: boolean;
    data: {
      variants: any[];
    };
    message: string;
  }> {
    return this.request(`/interactive/${gameId}/step/${stepId}/variants`, {
      method: 'POST',
      body: JSON.stringify({ count, customPrompt }),
    })
  }

  async selectVariant(gameId: string, stepId: string, variantId: string, customPrompt?: string): Promise<{
    success: boolean;
    message: string;
    data: {
      selectedVariant: string;
      nextStep?: {
        stepId: string;
        name: string;
        description: string;
        variants: Array<{
          id: string;
          title: string;
          description: string;
        }>;
      };
    };
  }> {
    return this.request(`/interactive/${gameId}/step/${stepId}/select`, {
      method: 'POST',
      body: JSON.stringify({ variantId, customPrompt }),
    })
  }

  async completeInteractiveGeneration(gameId: string): Promise<{
    success: boolean;
    data: {
      gameId: string;
      finalGamePath: string;
      downloadUrl: string;
      assets?: string[];
      choices?: Array<{
        step: string;
        choice: string;
      }>;
    };
    message: string;
  }> {
    return this.request(`/interactive/${gameId}/complete`, {
      method: 'POST',
    })
  }

  async updateAISettings(provider: string, apiKey: string, model: string): Promise<{
    success: boolean
    message: string
    apiKeyStatus: string
    validation: any
    envSaved: boolean
  }> {
    return this.request<any>('/ai/settings', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey, model }),
    })
  }

  async getAISettings(): Promise<{
    success: boolean
    settings: {
      [provider: string]: {
        apiKey: string
        model: string
        configured: boolean
      }
    }
  }> {
    return this.request<any>('/ai/settings')
  }

  async validateModel(provider: string, model: string, apiKey?: string): Promise<{
    success: boolean
    valid: boolean
    error?: string
    availableModels?: Array<{ id: string; name: string }>
  }> {
    return this.request<any>('/ai/validate-model', {
      method: 'POST',
      body: JSON.stringify({ provider, model, apiKey }),
    })
  }

  // Новые методы для работы с моделями AI
  async getAIModels(provider?: string): Promise<AIModelsResponse> {
    const endpoint = provider ? `/ai/models/${provider}` : '/ai/models'
    return this.request<AIModelsResponse>(endpoint)
  }

  async getAIModelsByProvider(provider: string): Promise<{
    success: boolean
    provider: string
    models: AIModel[]
  }> {
    return this.request<any>(`/ai/models/${provider}`)
  }

  // Методы для настроек генерации
  async getGenerationSettings(): Promise<GenerationSettingsResponse> {
    return this.request<GenerationSettingsResponse>('/generation/settings')
  }

  async updateGenerationSettings(stages: {
    [stageName: string]: {
      enabled: boolean
      provider: string
    }
  }): Promise<{
    success: boolean
    message: string
    settings: any
  }> {
    return this.request<any>('/generation/settings', {
      method: 'POST',
      body: JSON.stringify({ stages }),
    })
  }

  // Health check
  async checkHealth(): Promise<{
    status: string
    timestamp: string
    uptime: number
    environment: string
    version: string
    services: { [key: string]: string }
  }> {
    return this.request<{
      status: string
      timestamp: string
      uptime: number
      environment: string
      version: string
      services: { [key: string]: string }
    }>('/health')
  }



  // Методы для достижений
  async getAchievements(userId: string): Promise<{
    success: boolean
    achievements: Array<{
      id: string
      title: string
      description: string
      progress: number
      maxProgress: number
      unlocked: boolean
      unlockedAt?: string
    }>
  }> {
    return this.request<any>(`/achievements?userId=${userId}`)
  }

  // Методы для таблицы лидеров
  async getLeaderboards(): Promise<{
    success: boolean
    leaderboards: Array<{
      id: string
      name: string
      type: string
      entries: Array<{
        userId: string
        username: string
        score: number
        rank: number
      }>
    }>
  }> {
    return this.request<any>('/leaderboards')
  }

  // Методы для социальных функций
  async getFriends(userId: string): Promise<{
    success: boolean
    friends: Array<{
      id: string
      username: string
      status: 'online' | 'offline'
      lastSeen: string
    }>
  }> {
    return this.request<any>(`/social/friends?userId=${userId}`)
  }

  async getSocialFeed(userId: string): Promise<{
    success: boolean
    activities: Array<{
      id: string
      userId: string
      username: string
      type: string
      description: string
      timestamp: string
    }>
  }> {
    return this.request<any>(`/social/feed?userId=${userId}`)
  }
}

// Экспортируем единственный экземпляр API клиента
export const apiClient = new APIClient()

// Экспортируем отдельные методы для удобства
export const gameAPI = {
  create: (data: GameCreationRequest) => apiClient.createGame(data),
  getAll: () => apiClient.getGames(),
  getById: (id: string) => apiClient.getGame(id),
  delete: (id: string) => apiClient.deleteGame(id),
}

export const statsAPI = {
  get: () => apiClient.getStats(),
}

export const aiAPI = {
  getStatus: () => apiClient.getAIStatus(),
  updateSettings: (provider: string, apiKey: string, model: string) => 
    apiClient.updateAISettings(provider, apiKey, model),
  getSettings: () => apiClient.getAISettings(),
  getModels: (provider?: string) => apiClient.getAIModels(provider),
  getModelsByProvider: (provider: string) => apiClient.getAIModelsByProvider(provider),
  validateModel: (provider: string, model: string, apiKey?: string) => 
    apiClient.validateModel(provider, model, apiKey),
}

export const generationAPI = {
  getSettings: () => apiClient.getGenerationSettings(),
  updateSettings: (stages: any) => apiClient.updateGenerationSettings(stages),
}

export const healthAPI = {
  check: () => apiClient.checkHealth(),
}

export default apiClient 