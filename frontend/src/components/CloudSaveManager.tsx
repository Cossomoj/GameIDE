import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Download, 
  Upload, 
  RefreshCw, 
  Save, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  HardDrive,
  Shield,
  Zap,
  Eye,
  Settings,
  ArrowUpDown,
  FileText,
  Image,
  Play,
  Pause,
  MoreHorizontal,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';

interface SaveData {
  id: string;
  slotName: string;
  metadata: {
    version: number;
    timestamp: Date;
    gameVersion: string;
    platform: string;
    checksum: string;
    compressed: boolean;
    encrypted: boolean;
    size: number;
  };
  tags: string[];
  description?: string;
  screenshot?: string;
  playTime: number;
  level?: number;
  progress?: number;
}

interface SaveSlot {
  name: string;
  displayName: string;
  description: string;
  maxSize: number;
  autoSave: boolean;
  versionsToKeep: number;
  syncWithCloud: boolean;
  encryptionEnabled: boolean;
}

interface SyncResult {
  success: boolean;
  action: 'uploaded' | 'downloaded' | 'conflict' | 'no_change';
  localVersion: number;
  cloudVersion: number;
  conflictResolution?: string;
  error?: string;
}

interface CloudSaveManagerProps {
  userId: string;
  gameId: string;
  onSaveLoaded?: (data: any) => void;
  onError?: (error: string) => void;
}

const CloudSaveManager: React.FC<CloudSaveManagerProps> = ({
  userId,
  gameId,
  onSaveLoaded,
  onError
}) => {
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'saves' | 'slots' | 'sync' | 'conflicts'>('saves');
  const [selectedSaves, setSelectedSaves] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<any>(null);

  useEffect(() => {
    fetchSaves();
    fetchSlots();
  }, [userId, gameId]);

  const fetchSaves = async () => {
    try {
      const response = await fetch(`/api/cloud-save/saves/${userId}?gameId=${gameId}`);
      const data = await response.json();
      
      if (data.success) {
        setSaves(data.data.saves.map((save: any) => ({
          ...save,
          metadata: {
            ...save.metadata,
            timestamp: new Date(save.metadata.timestamp)
          }
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранений:', error);
      onError?.('Не удалось загрузить сохранения');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await fetch('/api/cloud-save/slots');
      const data = await response.json();
      
      if (data.success) {
        setSlots(data.data.slots);
      }
    } catch (error) {
      console.error('Ошибка загрузки слотов:', error);
    }
  };

  const loadSave = async (saveId: string) => {
    try {
      const response = await fetch(`/api/cloud-save/save/${saveId}`);
      const data = await response.json();
      
      if (data.success) {
        onSaveLoaded?.(data.data);
      } else {
        onError?.(data.error || 'Не удалось загрузить сохранение');
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранения:', error);
      onError?.('Ошибка загрузки сохранения');
    }
  };

  const createSave = async (slotName: string, data: any, options?: any) => {
    try {
      const response = await fetch('/api/cloud-save/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          gameId,
          slotName,
          data,
          options
        })
      });

      const result = await response.json();
      
      if (result.success) {
        fetchSaves(); // Обновляем список
      } else {
        onError?.(result.error || 'Не удалось создать сохранение');
      }
    } catch (error) {
      console.error('Ошибка создания сохранения:', error);
      onError?.('Ошибка создания сохранения');
    }
  };

  const deleteSave = async (saveId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это сохранение?')) return;

    try {
      const response = await fetch(`/api/cloud-save/save/${saveId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setSaves(prev => prev.filter(save => save.id !== saveId));
      } else {
        onError?.(data.error || 'Не удалось удалить сохранение');
      }
    } catch (error) {
      console.error('Ошибка удаления сохранения:', error);
      onError?.('Ошибка удаления сохранения');
    }
  };

  const syncSave = async (saveId: string, forceUpload = false) => {
    try {
      setSyncing(prev => [...prev, saveId]);

      const response = await fetch(`/api/cloud-save/sync/${saveId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpload })
      });

      const data = await response.json();
      
      if (data.success) {
        const result: SyncResult = data.data;
        
        if (result.action === 'conflict') {
          // Показываем диалог разрешения конфликта
          setCurrentConflict({ saveId, result });
          setConflictDialogOpen(true);
        } else {
          // Обновляем список сохранений
          fetchSaves();
        }
      } else {
        onError?.(data.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      onError?.('Ошибка синхронизации');
    } finally {
      setSyncing(prev => prev.filter(id => id !== saveId));
    }
  };

  const syncAllSaves = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/cloud-save/sync-all/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });

      const data = await response.json();
      
      if (data.success) {
        const summary = data.data.summary;
        const message = `Синхронизировано: ${summary.successful} из ${summary.total}`;
        
        if (summary.failed > 0) {
          onError?.(`${message}. Ошибок: ${summary.failed}`);
        }
        
        fetchSaves();
      }
    } catch (error) {
      console.error('Ошибка массовой синхронизации:', error);
      onError?.('Ошибка массовой синхронизации');
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (resolution: 'use_local' | 'use_cloud' | 'merge') => {
    if (!currentConflict) return;

    try {
      const response = await fetch(`/api/cloud-save/resolve-conflict/${currentConflict.saveId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });

      const data = await response.json();
      
      if (data.success) {
        setConflictDialogOpen(false);
        setCurrentConflict(null);
        fetchSaves();
      } else {
        onError?.(data.error || 'Ошибка разрешения конфликта');
      }
    } catch (error) {
      console.error('Ошибка разрешения конфликта:', error);
      onError?.('Ошибка разрешения конфликта');
    }
  };

  const exportSaves = async () => {
    try {
      const response = await fetch(`/api/cloud-save/export/${userId}?gameId=${gameId}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saves_${userId}_${gameId}_${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      onError?.('Ошибка экспорта сохранений');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredSaves = saves.filter(save => {
    const matchesFilter = filter === 'all' || save.slotName === filter;
    const matchesSearch = searchQuery === '' || 
      save.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      save.slotName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getSlotInfo = (slotName: string) => {
    return slots.find(slot => slot.name === slotName);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка сохранений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Cloud className="w-7 h-7 text-blue-500 mr-3" />
              Облачные сохранения
            </h2>
            <p className="text-gray-600 mt-1">
              Управление сохранениями и синхронизация с облаком
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportSaves}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Экспорт</span>
            </button>
            
            <button
              onClick={syncAllSaves}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Синхронизировать все</span>
            </button>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Создать сохранение</span>
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{saves.length}</div>
                <div className="text-sm text-blue-700">Всего сохранений</div>
              </div>
              <Save className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {saves.filter(s => slots.find(slot => slot.name === s.slotName)?.syncWithCloud).length}
                </div>
                <div className="text-sm text-green-700">Синхронизированы</div>
              </div>
              <Cloud className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatFileSize(saves.reduce((sum, save) => sum + save.metadata.size, 0))}
                </div>
                <div className="text-sm text-purple-700">Общий размер</div>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {saves.filter(s => s.metadata.encrypted).length}
                </div>
                <div className="text-sm text-yellow-700">Зашифрованы</div>
              </div>
              <Shield className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0">
            {[
              { key: 'saves', label: 'Сохранения', icon: Save },
              { key: 'slots', label: 'Слоты', icon: Settings },
              { key: 'sync', label: 'Синхронизация', icon: RefreshCw },
              { key: 'conflicts', label: 'Конфликты', icon: AlertTriangle }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Содержимое табов */}
        <div className="p-6">
          {/* Список сохранений */}
          {activeTab === 'saves' && (
            <div className="space-y-4">
              {/* Фильтры и поиск */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Поиск сохранений..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Все слоты</option>
                    {slots.map(slot => (
                      <option key={slot.name} value={slot.name}>{slot.displayName}</option>
                    ))}
                  </select>
                </div>

                {selectedSaves.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Выбрано: {selectedSaves.length}</span>
                    <button
                      onClick={() => {
                        selectedSaves.forEach(saveId => syncSave(saveId));
                        setSelectedSaves([]);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Синхронизировать
                    </button>
                  </div>
                )}
              </div>

              {/* Список сохранений */}
              {filteredSaves.length === 0 ? (
                <div className="text-center py-12">
                  <Save className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Нет сохранений
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Создайте первое сохранение для этой игры
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Создать сохранение
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSaves.map((save) => {
                    const slot = getSlotInfo(save.slotName);
                    const isSyncing = syncing.includes(save.id);
                    
                    return (
                      <div key={save.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedSaves.includes(save.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSaves(prev => [...prev, save.id]);
                                } else {
                                  setSelectedSaves(prev => prev.filter(id => id !== save.id));
                                }
                              }}
                              className="mt-1 w-4 h-4 text-blue-600"
                            />

                            {/* Превью */}
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {save.screenshot ? (
                                <img
                                  src={save.screenshot}
                                  alt="Превью"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Save className="w-6 h-6 text-gray-400" />
                              )}
                            </div>

                            {/* Информация */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-900">
                                  {slot?.displayName || save.slotName}
                                </h4>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  v{save.metadata.version}
                                </span>
                                {save.metadata.encrypted && (
                                  <Shield className="w-4 h-4 text-yellow-500" title="Зашифровано" />
                                )}
                                {save.metadata.compressed && (
                                  <Zap className="w-4 h-4 text-purple-500" title="Сжато" />
                                )}
                              </div>
                              
                              {save.description && (
                                <p className="text-gray-600 text-sm mb-2">{save.description}</p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(save.metadata.timestamp)}</span>
                                </div>
                                <span>{formatFileSize(save.metadata.size)}</span>
                                {save.playTime > 0 && (
                                  <span>{Math.round(save.playTime / 60)} мин</span>
                                )}
                                {save.level && (
                                  <span>Уровень {save.level}</span>
                                )}
                                {save.progress && (
                                  <span>{save.progress}% прогресса</span>
                                )}
                              </div>

                              {save.tags.length > 0 && (
                                <div className="flex items-center space-x-1 mt-2">
                                  {save.tags.map(tag => (
                                    <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Действия */}
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => loadSave(save.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Загрузить"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => syncSave(save.id)}
                              disabled={isSyncing}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Синхронизировать"
                            >
                              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>
                            
                            <button
                              onClick={() => deleteSave(save.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="relative group">
                              <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-lg">
                                  Переименовать
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-lg">
                                  Дублировать
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-lg">
                                  Экспорт
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Управление слотами */}
          {activeTab === 'slots' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Конфигурация слотов сохранений</h3>
              
              {slots.map((slot) => (
                <div key={slot.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{slot.displayName}</h4>
                      <p className="text-gray-600 text-sm mb-3">{slot.description}</p>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Размер:</span>
                          <span className="ml-2 font-medium">{formatFileSize(slot.maxSize)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Версий:</span>
                          <span className="ml-2 font-medium">{slot.versionsToKeep}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Автосохранение:</span>
                          <span className="ml-2 font-medium">{slot.autoSave ? 'Да' : 'Нет'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Облако:</span>
                          <span className="ml-2 font-medium">{slot.syncWithCloud ? 'Да' : 'Нет'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3">
                        {slot.encryptionEnabled && (
                          <span className="flex items-center space-x-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            <Shield className="w-3 h-3" />
                            <span>Шифрование</span>
                          </span>
                        )}
                        {slot.autoSave && (
                          <span className="flex items-center space-x-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            <Zap className="w-3 h-3" />
                            <span>Автосохранение</span>
                          </span>
                        )}
                        {slot.syncWithCloud && (
                          <span className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            <Cloud className="w-3 h-3" />
                            <span>Синхронизация</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Настроить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Статус синхронизации */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Синхронизация работает в фоне
                </h3>
                <p className="text-gray-500">
                  Ваши сохранения автоматически синхронизируются с облаком каждые 5 минут
                </p>
              </div>
            </div>
          )}

          {/* Разрешение конфликтов */}
          {activeTab === 'conflicts' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет конфликтов синхронизации
                </h3>
                <p className="text-gray-500">
                  Все сохранения успешно синхронизированы с облаком
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Диалог разрешения конфликтов */}
      {conflictDialogOpen && currentConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Конфликт синхронизации</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Обнаружен конфликт между локальной и облачной версиями сохранения. Выберите, какую версию использовать:
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => resolveConflict('use_local')}
                  className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">Использовать локальную версию</div>
                  <div className="text-sm text-gray-500">Заменить облачные данные</div>
                </button>
                
                <button
                  onClick={() => resolveConflict('use_cloud')}
                  className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">Использовать облачную версию</div>
                  <div className="text-sm text-gray-500">Заменить локальные данные</div>
                </button>
                
                <button
                  onClick={() => resolveConflict('merge')}
                  className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">Объединить версии</div>
                  <div className="text-sm text-gray-500">Автоматическое слияние данных</div>
                </button>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setConflictDialogOpen(false);
                    setCurrentConflict(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudSaveManager; 