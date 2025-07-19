import React, { useState, useEffect } from 'react';
import { 
  Image, 
  Music, 
  FileText, 
  Archive, 
  Download, 
  Upload, 
  Zap, 
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Sliders,
  Maximize2,
  Minimize2,
  Settings,
  FileImage,
  FileVideo,
  FileAudio,
  Info
} from 'lucide-react';

interface AssetInfo {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'json' | 'js' | 'css';
  originalSize: number;
  optimizedSize?: number;
  compressionRatio?: number;
  format: string;
  dimensions?: { width: number; height: number };
  duration?: number; // для аудио/видео
  quality: 'original' | 'high' | 'medium' | 'low' | 'optimized';
  status: 'pending' | 'processing' | 'completed' | 'error';
  lastModified: Date;
  optimizationSuggestions: string[];
  preview?: string;
  metadata?: Record<string, any>;
}

interface OptimizationSettings {
  images: {
    format: 'auto' | 'webp' | 'png' | 'jpg';
    quality: number; // 0-100
    maxWidth: number;
    maxHeight: number;
    progressive: boolean;
    removeMetadata: boolean;
  };
  audio: {
    format: 'auto' | 'ogg' | 'mp3' | 'wav';
    bitrate: number; // kbps
    channels: 'mono' | 'stereo' | 'auto';
    normalize: boolean;
    removeMetadata: boolean;
  };
  code: {
    minify: boolean;
    removeComments: boolean;
    removeDebugCode: boolean;
    enableTreeShaking: boolean;
    bundleChunks: boolean;
  };
  general: {
    enableGzip: boolean;
    enableBrotli: boolean;
    maxFileSize: number; // MB
    deleteOriginals: boolean;
  };
}

interface OptimizationResult {
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalSavings: number;
  compressionRatio: number;
  processedFiles: number;
  errors: number;
  estimatedLoadTime: {
    original: number;
    optimized: number;
  };
}

const AssetOptimizer: React.FC = () => {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [settings, setSettings] = useState<OptimizationSettings>({
    images: {
      format: 'auto',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      progressive: true,
      removeMetadata: true
    },
    audio: {
      format: 'auto',
      bitrate: 128,
      channels: 'stereo',
      normalize: true,
      removeMetadata: true
    },
    code: {
      minify: true,
      removeComments: true,
      removeDebugCode: true,
      enableTreeShaking: true,
      bundleChunks: true
    },
    general: {
      enableGzip: true,
      enableBrotli: true,
      maxFileSize: 10,
      deleteOriginals: false
    }
  });
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'audio' | 'code'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/optimization/assets');
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Ошибка загрузки ассетов:', error);
    }
  };

  const uploadFiles = async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/optimization/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fetchAssets();
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const optimizeAssets = async (assetIds: string[]) => {
    try {
      setIsOptimizing(true);
      
      const response = await fetch('/api/optimization/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds,
          settings
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        fetchAssets();
      }
    } catch (error) {
      console.error('Ошибка оптимизации:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const optimizeAll = () => {
    const assetIds = assets.filter(asset => 
      filter === 'all' || asset.type === filter
    ).map(asset => asset.id);
    
    optimizeAssets(assetIds);
  };

  const deleteAsset = async (assetId: string) => {
    try {
      const response = await fetch(`/api/optimization/assets/${assetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAssets(prev => prev.filter(asset => asset.id !== assetId));
      }
    } catch (error) {
      console.error('Ошибка удаления ассета:', error);
    }
  };

  const downloadOptimized = async (assetId: string) => {
    try {
      const response = await fetch(`/api/optimization/download/${assetId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = assets.find(a => a.id === assetId)?.name || 'optimized_asset';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image': return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'audio': return <FileAudio className="w-5 h-5 text-green-500" />;
      case 'video': return <FileVideo className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredAssets = assets.filter(asset => 
    filter === 'all' || asset.type === filter
  );

  const totalOriginalSize = filteredAssets.reduce((sum, asset) => sum + asset.originalSize, 0);
  const totalOptimizedSize = filteredAssets.reduce((sum, asset) => sum + (asset.optimizedSize || asset.originalSize), 0);
  const totalSavings = totalOriginalSize - totalOptimizedSize;
  const savingsPercentage = totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Zap className="w-7 h-7 text-yellow-500 mr-3" />
              Оптимизация ассетов
            </h2>
            <p className="text-gray-600 mt-1">
              Сжимайте и оптимизируйте ресурсы игр для лучшей производительности
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,audio/*,video/*,.js,.css,.json"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файлы</span>
            </label>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{filteredAssets.length}</div>
                <div className="text-sm text-blue-700">Файлов</div>
              </div>
              <Archive className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{formatFileSize(totalOriginalSize)}</div>
                <div className="text-sm text-green-700">Исходный размер</div>
              </div>
              <Maximize2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{formatFileSize(totalOptimizedSize)}</div>
                <div className="text-sm text-purple-700">После оптимизации</div>
              </div>
              <Minimize2 className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{savingsPercentage.toFixed(1)}%</div>
                <div className="text-sm text-yellow-700">Экономия</div>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Результаты оптимизации */}
        {result && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-3">Результаты оптимизации</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-600">Обработано файлов:</span>
                <span className="ml-2 font-semibold">{result.processedFiles}</span>
              </div>
              <div>
                <span className="text-green-600">Экономия:</span>
                <span className="ml-2 font-semibold">{formatFileSize(result.totalSavings)}</span>
              </div>
              <div>
                <span className="text-green-600">Сжатие:</span>
                <span className="ml-2 font-semibold">{(result.compressionRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-green-600">Время загрузки:</span>
                <span className="ml-2 font-semibold">-{(result.estimatedLoadTime.original - result.estimatedLoadTime.optimized).toFixed(1)}с</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Настройки оптимизации */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки оптимизации</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Настройки изображений */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Image className="w-5 h-5 text-blue-500 mr-2" />
                Изображения
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Формат</label>
                <select
                  value={settings.images.format}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    images: { ...prev.images, format: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Автоматически</option>
                  <option value="webp">WebP</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPEG</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Качество: {settings.images.quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.images.quality}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    images: { ...prev.images, quality: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Макс. ширина</label>
                  <input
                    type="number"
                    value={settings.images.maxWidth}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      images: { ...prev.images, maxWidth: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Макс. высота</label>
                  <input
                    type="number"
                    value={settings.images.maxHeight}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      images: { ...prev.images, maxHeight: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.images.progressive}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      images: { ...prev.images, progressive: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Прогрессивное сжатие</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.images.removeMetadata}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      images: { ...prev.images, removeMetadata: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Удалить метаданные</span>
                </label>
              </div>
            </div>

            {/* Настройки аудио */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800 flex items-center">
                <Music className="w-5 h-5 text-green-500 mr-2" />
                Аудио
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Формат</label>
                <select
                  value={settings.audio.format}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    audio: { ...prev.audio, format: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Автоматически</option>
                  <option value="ogg">OGG</option>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Битрейт: {settings.audio.bitrate} kbps
                </label>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="32"
                  value={settings.audio.bitrate}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    audio: { ...prev.audio, bitrate: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Каналы</label>
                <select
                  value={settings.audio.channels}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    audio: { ...prev.audio, channels: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Автоматически</option>
                  <option value="mono">Моно</option>
                  <option value="stereo">Стерео</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.audio.normalize}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      audio: { ...prev.audio, normalize: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Нормализация громкости</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.audio.removeMetadata}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      audio: { ...prev.audio, removeMetadata: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Удалить метаданные</span>
                </label>
              </div>
            </div>
          </div>

          {/* Общие настройки */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-800 mb-4">Общие настройки</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.general.enableGzip}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, enableGzip: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Gzip сжатие</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.general.enableBrotli}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, enableBrotli: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Brotli сжатие</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.code.minify}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    code: { ...prev.code, minify: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Минификация кода</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.general.deleteOriginals}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, deleteOriginals: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Удалить оригиналы</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Фильтры и действия */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {['all', 'image', 'audio', 'code'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType === 'all' && 'Все'}
                {filterType === 'image' && 'Изображения'}
                {filterType === 'audio' && 'Аудио'}
                {filterType === 'code' && 'Код'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {selectedAssets.length > 0 && (
              <span className="text-sm text-gray-600">
                Выбрано: {selectedAssets.length}
              </span>
            )}
            <button
              onClick={optimizeAll}
              disabled={isOptimizing || filteredAssets.length === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isOptimizing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Оптимизирую...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Оптимизировать все</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Список ассетов */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Файлы для оптимизации</h3>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет файлов для оптимизации
            </h3>
            <p className="text-gray-500 mb-4">
              Загрузите изображения, аудио или другие ресурсы для оптимизации
            </p>
            <label
              htmlFor="file-upload"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файлы</span>
            </label>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(asset.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssets(prev => [...prev, asset.id]);
                      } else {
                        setSelectedAssets(prev => prev.filter(id => id !== asset.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />

                  <div className="flex-shrink-0">
                    {getAssetIcon(asset.type)}
                  </div>

                  {/* Превью для изображений */}
                  {asset.type === 'image' && asset.preview && (
                    <div className="flex-shrink-0">
                      <img
                        src={asset.preview}
                        alt={asset.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 truncate">{asset.name}</h4>
                      {getStatusIcon(asset.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{asset.format.toUpperCase()}</span>
                      {asset.dimensions && (
                        <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
                      )}
                      {asset.duration && (
                        <span>{asset.duration.toFixed(1)}s</span>
                      )}
                      <span>{formatFileSize(asset.originalSize)}</span>
                    </div>

                    {asset.optimizationSuggestions.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-1">
                          <Info className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600 font-medium">Рекомендации:</span>
                        </div>
                        <ul className="text-sm text-gray-600 ml-5 mt-1 space-y-1">
                          {asset.optimizationSuggestions.slice(0, 2).map((suggestion, index) => (
                            <li key={index} className="list-disc">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {asset.optimizedSize && (
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          {formatFileSize(asset.optimizedSize)}
                        </div>
                        <div className="text-xs text-gray-500">
                          -{((1 - asset.optimizedSize / asset.originalSize) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center space-x-2">
                    {asset.status === 'completed' && asset.optimizedSize && (
                      <button
                        onClick={() => downloadOptimized(asset.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Скачать оптимизированный файл"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить файл"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetOptimizer; 