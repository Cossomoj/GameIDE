import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Monitor, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    errors: number;
    requests: number;
  };
  graphics: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    texturesLoaded: number;
  };
  timestamp: Date;
}

interface PerformanceConfig {
  cache: {
    enabled: boolean;
    maxMemoryMB: number;
    maxFileSize: number;
    ttl: number;
    compression: boolean;
  };
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    maxTextureSize: number;
    enableMipmaps: boolean;
    antialiasing: boolean;
    shadows: boolean;
    particleCount: number;
  };
  resources: {
    maxConcurrentLoads: number;
    preloadCritical: boolean;
    lazyLoad: boolean;
    bundleSize: number;
    compressionLevel: number;
  };
  network: {
    timeout: number;
    retries: number;
    batchSize: number;
    enableGzip: boolean;
    prefetch: boolean;
  };
  memory: {
    gcInterval: number;
    maxHeapMB: number;
    enableAutoCleanup: boolean;
    warningThreshold: number;
  };
  monitoring: {
    enableMetrics: boolean;
    reportInterval: number;
    trackFrameRate: boolean;
    trackMemoryUsage: boolean;
    trackNetworkLatency: boolean;
  };
}

interface OptimizationSuggestion {
  type: 'memory' | 'cpu' | 'network' | 'graphics' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number; // в процентах
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [config, setConfig] = useState<PerformanceConfig | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'config' | 'suggestions'>('overview');
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchConfig();
    if (isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isMonitoring]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/performance/config');
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Ошибка загрузки конфигурации:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/performance/metrics');
      const data = await response.json();
      const newMetrics = {
        ...data.metrics,
        timestamp: new Date(data.metrics.timestamp)
      };
      
      setMetrics(newMetrics);
      setHistory(prev => [...prev.slice(-29), newMetrics]); // Храним последние 30 значений
      
      // Анализируем производительность и получаем рекомендации
      analyzeSuggestions(newMetrics);
    } catch (error) {
      console.error('Ошибка загрузки метрик:', error);
    }
  };

  const startMonitoring = () => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 2000); // Каждые 2 секунды
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const analyzeSuggestions = (currentMetrics: PerformanceMetrics) => {
    const newSuggestions: OptimizationSuggestion[] = [];

    // Анализ памяти
    if (currentMetrics.memory.percentage > 80) {
      newSuggestions.push({
        type: 'memory',
        severity: currentMetrics.memory.percentage > 90 ? 'critical' : 'high',
        title: 'Высокое потребление памяти',
        description: `Используется ${currentMetrics.memory.percentage.toFixed(1)}% доступной памяти`,
        impact: 'Может привести к замедлению или сбоям игр',
        implementation: 'Включите автоочистку памяти и уменьшите размер кэша',
        estimatedImprovement: 25
      });
    }

    // Анализ FPS
    if (currentMetrics.graphics.fps < 30) {
      newSuggestions.push({
        type: 'graphics',
        severity: currentMetrics.graphics.fps < 20 ? 'critical' : 'high',
        title: 'Низкий FPS',
        description: `Текущий FPS: ${currentMetrics.graphics.fps}`,
        impact: 'Плохой игровой опыт',
        implementation: 'Снизьте качество графики или отключите сложные эффекты',
        estimatedImprovement: 40
      });
    }

    // Анализ сети
    if (currentMetrics.network.latency > 200) {
      newSuggestions.push({
        type: 'network',
        severity: currentMetrics.network.latency > 500 ? 'high' : 'medium',
        title: 'Высокая задержка сети',
        description: `Ping: ${currentMetrics.network.latency}ms`,
        impact: 'Задержки в онлайн играх',
        implementation: 'Включите сжатие и предзагрузку ресурсов',
        estimatedImprovement: 30
      });
    }

    // Анализ кэша
    if (currentMetrics.cache.hitRate < 0.7) {
      newSuggestions.push({
        type: 'cache',
        severity: 'medium',
        title: 'Низкая эффективность кэша',
        description: `Процент попаданий: ${(currentMetrics.cache.hitRate * 100).toFixed(1)}%`,
        impact: 'Частые загрузки ресурсов',
        implementation: 'Увеличьте размер кэша и TTL для часто используемых ресурсов',
        estimatedImprovement: 20
      });
    }

    setSuggestions(newSuggestions);
  };

  const updateConfig = async (newConfig: Partial<PerformanceConfig>) => {
    try {
      const response = await fetch('/api/performance/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Ошибка обновления конфигурации:', error);
    }
  };

  const applyOptimization = async (preset: 'performance' | 'quality' | 'balanced') => {
    try {
      const response = await fetch('/api/performance/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset })
      });

      if (response.ok) {
        fetchConfig();
      }
    } catch (error) {
      console.error('Ошибка применения оптимизации:', error);
    }
  };

  const exportMetrics = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (value <= thresholds.warning) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!metrics && !config) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка данных производительности...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="w-7 h-7 text-blue-500 mr-3" />
              Мониторинг производительности
            </h2>
            <p className="text-gray-600 mt-1">
              Отслеживайте и оптимизируйте производительность ваших игр
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isMonitoring ? (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Остановить</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Запустить</span>
                </>
              )}
            </button>
            
            {history.length > 0 && (
              <button
                onClick={exportMetrics}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Экспорт</span>
              </button>
            )}
            
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </button>
          </div>
        </div>

        {/* Статус система */}
        {metrics && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <HardDrive className="w-6 h-6 text-blue-500" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Память</span>
                  {getStatusIcon(metrics.memory.percentage, { good: 50, warning: 80 })}
                </div>
                <div className={`text-lg font-semibold ${getStatusColor(metrics.memory.percentage, { good: 50, warning: 80 })}`}>
                  {metrics.memory.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Cpu className="w-6 h-6 text-green-500" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">CPU</span>
                  {getStatusIcon(metrics.cpu.usage, { good: 30, warning: 70 })}
                </div>
                <div className={`text-lg font-semibold ${getStatusColor(metrics.cpu.usage, { good: 30, warning: 70 })}`}>
                  {metrics.cpu.usage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Monitor className="w-6 h-6 text-purple-500" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">FPS</span>
                  {getStatusIcon(60 - metrics.graphics.fps, { good: 30, warning: 40 })}
                </div>
                <div className={`text-lg font-semibold ${getStatusColor(60 - metrics.graphics.fps, { good: 30, warning: 40 })}`}>
                  {metrics.graphics.fps.toFixed(0)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Wifi className="w-6 h-6 text-orange-500" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Ping</span>
                  {getStatusIcon(metrics.network.latency, { good: 50, warning: 150 })}
                </div>
                <div className={`text-lg font-semibold ${getStatusColor(metrics.network.latency, { good: 50, warning: 150 })}`}>
                  {metrics.network.latency}ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Навигация по табам */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0">
            {[
              { key: 'overview', label: 'Обзор', icon: BarChart3 },
              { key: 'metrics', label: 'Детальные метрики', icon: LineChart },
              { key: 'config', label: 'Конфигурация', icon: Settings },
              { key: 'suggestions', label: 'Рекомендации', icon: TrendingUp, count: suggestions.length }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count && tab.count > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Содержимое табов */}
        <div className="p-6">
          {/* Обзор */}
          {activeTab === 'overview' && metrics && (
            <div className="space-y-6">
              {/* Быстрая оптимизация */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => applyOptimization('performance')}
                  className="p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:border-green-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Zap className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-green-800">Режим производительности</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    Максимальная скорость работы, минимум эффектов
                  </p>
                </button>

                <button
                  onClick={() => applyOptimization('balanced')}
                  className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Сбалансированный режим</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    Оптимальное соотношение качества и производительности
                  </p>
                </button>

                <button
                  onClick={() => applyOptimization('quality')}
                  className="p-4 border-2 border-purple-200 bg-purple-50 rounded-lg hover:border-purple-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Monitor className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-purple-800">Режим качества</h3>
                  </div>
                  <p className="text-sm text-purple-700">
                    Максимальное качество графики и эффектов
                  </p>
                </button>
              </div>

              {/* Текущие показатели */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* График использования памяти */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Использование памяти</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Heap память</span>
                        <span>{(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)} MB / {(metrics.memory.heapTotal / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(metrics.memory.heapUsed / metrics.memory.heapTotal) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Общая память</span>
                        <span>{(metrics.memory.used / 1024 / 1024).toFixed(1)} MB / {(metrics.memory.total / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            metrics.memory.percentage > 80 ? 'bg-red-500' : 
                            metrics.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${metrics.memory.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Кэш статистика */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Эффективность кэша</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Попадания</span>
                      <span className="font-medium">{metrics.cache.hits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Промахи</span>
                      <span className="font-medium">{metrics.cache.misses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Процент попаданий</span>
                      <span className={`font-semibold ${
                        metrics.cache.hitRate > 0.8 ? 'text-green-600' :
                        metrics.cache.hitRate > 0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(metrics.cache.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Размер кэша</span>
                      <span className="font-medium">{(metrics.cache.memoryUsage / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Детальные метрики */}
          {activeTab === 'metrics' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* CPU метрики */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Cpu className="w-5 h-5 text-green-500 mr-2" />
                    Процессор
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Использование</span>
                      <span className="font-medium">{metrics.cpu.usage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Load Average (1m)</span>
                      <span className="font-medium">{metrics.cpu.loadAverage[0].toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Load Average (5m)</span>
                      <span className="font-medium">{metrics.cpu.loadAverage[1].toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Load Average (15m)</span>
                      <span className="font-medium">{metrics.cpu.loadAverage[2].toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Графика метрики */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Monitor className="w-5 h-5 text-purple-500 mr-2" />
                    Графика
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">FPS</span>
                      <span className="font-medium">{metrics.graphics.fps.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Время кадра</span>
                      <span className="font-medium">{metrics.graphics.frameTime.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Draw Calls</span>
                      <span className="font-medium">{metrics.graphics.drawCalls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Текстуры</span>
                      <span className="font-medium">{metrics.graphics.texturesLoaded}</span>
                    </div>
                  </div>
                </div>

                {/* Сеть метрики */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Wifi className="w-5 h-5 text-orange-500 mr-2" />
                    Сеть
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Латентность</span>
                      <span className="font-medium">{metrics.network.latency}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Пропускная способность</span>
                      <span className="font-medium">{(metrics.network.bandwidth / 1024).toFixed(1)} KB/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Запросы</span>
                      <span className="font-medium">{metrics.network.requests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ошибки</span>
                      <span className={`font-medium ${metrics.network.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {metrics.network.errors}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* История производительности */}
              {history.length > 5 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Тренды производительности</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {((history[history.length - 1].memory.percentage - history[0].memory.percentage) > 0 ? '+' : '')}
                        {(history[history.length - 1].memory.percentage - history[0].memory.percentage).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Изменение памяти</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {((history[history.length - 1].graphics.fps - history[0].graphics.fps) > 0 ? '+' : '')}
                        {(history[history.length - 1].graphics.fps - history[0].graphics.fps).toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Изменение FPS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {((history[history.length - 1].cache.hitRate - history[0].cache.hitRate) > 0 ? '+' : '')}
                        {((history[history.length - 1].cache.hitRate - history[0].cache.hitRate) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Изменение кэша</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {((history[history.length - 1].network.latency - history[0].network.latency) > 0 ? '+' : '')}
                        {(history[history.length - 1].network.latency - history[0].network.latency).toFixed(0)}ms
                      </div>
                      <div className="text-sm text-gray-600">Изменение ping</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Конфигурация */}
          {activeTab === 'config' && config && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Настройки графики */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Настройки графики</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Качество</label>
                    <select
                      value={config.graphics.quality}
                      onChange={(e) => updateConfig({
                        graphics: { ...config.graphics, quality: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Низкое</option>
                      <option value="medium">Среднее</option>
                      <option value="high">Высокое</option>
                      <option value="ultra">Ультра</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.graphics.antialiasing}
                        onChange={(e) => updateConfig({
                          graphics: { ...config.graphics, antialiasing: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Сглаживание</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.graphics.shadows}
                        onChange={(e) => updateConfig({
                          graphics: { ...config.graphics, shadows: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Тени</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.graphics.enableMipmaps}
                        onChange={(e) => updateConfig({
                          graphics: { ...config.graphics, enableMipmaps: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Mipmaps</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Количество частиц: {config.graphics.particleCount}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={config.graphics.particleCount}
                      onChange={(e) => updateConfig({
                        graphics: { ...config.graphics, particleCount: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Настройки памяти и кэша */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Память и кэш</h4>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.cache.enabled}
                      onChange={(e) => updateConfig({
                        cache: { ...config.cache, enabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Включить кэширование</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальный размер кэша: {config.cache.maxMemoryMB} MB
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={config.cache.maxMemoryMB}
                      onChange={(e) => updateConfig({
                        cache: { ...config.cache, maxMemoryMB: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TTL кэша: {config.cache.ttl} секунд
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="3600"
                      step="10"
                      value={config.cache.ttl}
                      onChange={(e) => updateConfig({
                        cache: { ...config.cache, ttl: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.memory.enableAutoCleanup}
                      onChange={(e) => updateConfig({
                        memory: { ...config.memory, enableAutoCleanup: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Автоочистка памяти</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Интервал GC: {config.memory.gcInterval} секунд
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="10"
                      value={config.memory.gcInterval}
                      onChange={(e) => updateConfig({
                        memory: { ...config.memory, gcInterval: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Производительность оптимальна!
                  </h3>
                  <p className="text-gray-500">
                    Система работает эффективно, рекомендаций нет
                  </p>
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(suggestion.severity)}`}>
                            {suggestion.severity === 'low' && 'Низкий приоритет'}
                            {suggestion.severity === 'medium' && 'Средний приоритет'}
                            {suggestion.severity === 'high' && 'Высокий приоритет'}
                            {suggestion.severity === 'critical' && 'Критично'}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">{suggestion.type}</span>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {suggestion.title}
                        </h4>
                        
                        <p className="text-gray-600 mb-3">{suggestion.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Влияние:</span>
                            <span className="ml-2 text-gray-600">{suggestion.impact}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Решение:</span>
                            <span className="ml-2 text-gray-600">{suggestion.implementation}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          +{suggestion.estimatedImprovement}%
                        </div>
                        <div className="text-sm text-gray-500">улучшение</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor; 