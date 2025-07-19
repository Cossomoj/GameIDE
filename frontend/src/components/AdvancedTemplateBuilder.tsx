import React, { useState, useEffect, useMemo } from 'react';
import { Play, Settings, Palette, Volume2, Eye, Download, Save, Upload, Search, Filter, Plus, Minus, Copy, Edit, Trash2, Star, Heart, Share, Code, Image, Music, Gamepad2, Layers, Grid, Move, RotateCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Info, BookOpen, Award, Target, Zap } from 'lucide-react';

interface GameTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  genre: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  version: string;
  author: string;
  tags: string[];
  thumbnail: string;
  screenshots: string[];
  usage: {
    downloads: number;
    likes: number;
    rating: number;
    reviews: number;
  };
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateComponent {
  id: string;
  name: string;
  type: 'entity' | 'system' | 'behavior' | 'ui' | 'effect' | 'sound' | 'script';
  category: string;
  description: string;
  icon: string;
  color: string;
  properties: ComponentProperty[];
  isCore: boolean;
  version: string;
}

interface ComponentProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function' | 'color' | 'texture' | 'sound';
  defaultValue: any;
  description: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  group?: string;
}

interface TemplateAsset {
  id: string;
  name: string;
  type: 'image' | 'sprite' | 'animation' | 'sound' | 'music' | 'font' | 'model' | 'texture' | 'shader';
  category: string;
  description: string;
  filename: string;
  size: number;
  format: string;
  metadata: any;
  tags: string[];
  preview: string;
  thumbnail: string;
  isBuiltIn: boolean;
}

interface TemplateBuilder {
  id: string;
  name: string;
  template: GameTemplate;
  currentStep: number;
  steps: BuilderStep[];
  configuration: any;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BuilderStep {
  id: string;
  name: string;
  title: string;
  description: string;
  type: 'selection' | 'configuration' | 'customization' | 'preview' | 'generation';
  component: string;
  required: boolean;
  order: number;
}

interface AdvancedTemplateBuilderProps {
  onTemplateCreated?: (template: GameTemplate) => void;
  onGameGenerated?: (gameData: any) => void;
  onError?: (error: string) => void;
}

const AdvancedTemplateBuilder: React.FC<AdvancedTemplateBuilderProps> = ({
  onTemplateCreated,
  onGameGenerated,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'builder' | 'components' | 'assets' | 'create'>('browse');
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [components, setComponents] = useState<TemplateComponent[]>([]);
  const [assets, setAssets] = useState<TemplateAsset[]>([]);
  const [currentBuilder, setCurrentBuilder] = useState<TemplateBuilder | null>(null);
  const [loading, setLoading] = useState(false);

  // Поиск и фильтрация
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  // Конструктор
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);
  const [builderConfig, setBuilderConfig] = useState<any>({});
  const [previewMode, setPreviewMode] = useState(false);

  // Создание шаблона
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom',
    genre: 'arcade',
    difficulty: 'beginner' as const,
    tags: [] as string[]
  });

  const categories = [
    'Все категории', 'Аркады', 'Платформеры', 'Головоломки', 
    'Стратегии', 'Симуляторы', 'RPG', 'Приключения', 'Экшен'
  ];

  const difficulties = ['Все уровни', 'beginner', 'intermediate', 'advanced', 'expert'];
  const genres = ['Все жанры', 'arcade', 'platformer', 'puzzle', 'strategy', 'simulation', 'rpg', 'adventure', 'action'];

  useEffect(() => {
    loadTemplates();
    loadComponents();
    loadAssets();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory && selectedCategory !== 'Все категории') {
        params.append('category', selectedCategory.toLowerCase());
      }
      if (selectedDifficulty && selectedDifficulty !== 'Все уровни') {
        params.append('difficulty', selectedDifficulty);
      }
      if (selectedGenre && selectedGenre !== 'Все жанры') {
        params.append('genre', selectedGenre);
      }
      params.append('sortBy', sortBy);

      const response = await fetch(`/api/advanced-templates/templates?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data.templates || []);
      } else {
        onError?.(result.error || 'Ошибка при загрузке шаблонов');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      onError?.('Ошибка при загрузке шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const loadComponents = async () => {
    try {
      const response = await fetch('/api/advanced-templates/components');
      const result = await response.json();
      
      if (result.success) {
        setComponents(result.data || []);
      }
    } catch (error) {
      console.error('Error loading components:', error);
    }
  };

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/advanced-templates/assets');
      const result = await response.json();
      
      if (result.success) {
        setAssets(result.data || []);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleCreateBuilder = async (template: GameTemplate) => {
    setLoading(true);
    try {
      const response = await fetch('/api/advanced-templates/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          userId: 'user123' // В реальном приложении получать из контекста
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentBuilder(result.data);
        setSelectedTemplate(template);
        setActiveTab('builder');
        setBuilderConfig({});
      } else {
        onError?.(result.error || 'Ошибка при создании конструктора');
      }
    } catch (error) {
      console.error('Error creating builder:', error);
      onError?.('Ошибка при создании конструктора');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBuilderStep = async (stepId: string, configuration: any) => {
    if (!currentBuilder) return;

    try {
      const response = await fetch(`/api/advanced-templates/builder/${currentBuilder.id}/step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepId,
          configuration
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCurrentBuilder(result.data);
        setBuilderConfig({
          ...builderConfig,
          [stepId]: configuration
        });
      } else {
        onError?.(result.error || 'Ошибка при обновлении конфигурации');
      }
    } catch (error) {
      console.error('Error updating builder step:', error);
      onError?.('Ошибка при обновлении конфигурации');
    }
  };

  const handleGenerateGame = async () => {
    if (!currentBuilder) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/advanced-templates/builder/${currentBuilder.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        onGameGenerated?.(result.data);
        alert('Игра успешно сгенерирована!');
      } else {
        onError?.(result.error || 'Ошибка при генерации игры');
      }
    } catch (error) {
      console.error('Error generating game:', error);
      onError?.('Ошибка при генерации игры');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      onError?.('Введите название шаблона');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/advanced-templates/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      });

      const result = await response.json();
      if (result.success) {
        onTemplateCreated?.(result.data);
        setNewTemplate({
          name: '',
          description: '',
          category: 'custom',
          genre: 'arcade',
          difficulty: 'beginner',
          tags: []
        });
        loadTemplates();
        alert('Шаблон успешно создан!');
      } else {
        onError?.(result.error || 'Ошибка при создании шаблона');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      onError?.('Ошибка при создании шаблона');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50 border-green-200';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'advanced': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'expert': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Начинающий';
      case 'intermediate': return 'Средний';
      case 'advanced': return 'Продвинутый';
      case 'expert': return 'Эксперт';
      default: return difficulty;
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      if (selectedCategory && selectedCategory !== 'Все категории' && 
          template.category !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (selectedDifficulty && selectedDifficulty !== 'Все уровни' && 
          template.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedGenre && selectedGenre !== 'Все жанры' && 
          template.genre !== selectedGenre) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return template.name.toLowerCase().includes(query) ||
               template.description.toLowerCase().includes(query) ||
               template.tags.some(tag => tag.toLowerCase().includes(query));
      }
      return true;
    });
  }, [templates, selectedCategory, selectedDifficulty, selectedGenre, searchQuery]);

  const renderBasicSettingsStep = () => {
    const config = builderConfig['basic-settings'] || {};
    
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название игры
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => handleUpdateBuilderStep('basic-settings', {
              ...config,
              title: e.target.value
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Введите название игры"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleUpdateBuilderStep('basic-settings', {
              ...config,
              description: e.target.value
            })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Опишите вашу игру"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ширина экрана
            </label>
            <input
              type="number"
              value={config.width || 800}
              onChange={(e) => handleUpdateBuilderStep('basic-settings', {
                ...config,
                width: parseInt(e.target.value)
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Высота экрана
            </label>
            <input
              type="number"
              value={config.height || 600}
              onChange={(e) => handleUpdateBuilderStep('basic-settings', {
                ...config,
                height: parseInt(e.target.value)
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGameMechanicsStep = () => {
    const config = builderConfig['game-mechanics'] || {};
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Выберите игровые механики</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'movement', name: 'Движение персонажа', icon: '🏃', description: 'Управление движением игрока' },
              { id: 'jumping', name: 'Прыжки', icon: '⬆️', description: 'Механика прыжков' },
              { id: 'shooting', name: 'Стрельба', icon: '🔫', description: 'Система стрельбы' },
              { id: 'collecting', name: 'Сбор предметов', icon: '💎', description: 'Сбор монет и бонусов' },
              { id: 'enemies', name: 'Враги', icon: '👾', description: 'AI противников' },
              { id: 'physics', name: 'Физика', icon: '🌍', description: 'Физический движок' }
            ].map(mechanic => (
              <div
                key={mechanic.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  config.mechanics?.includes(mechanic.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const mechanics = config.mechanics || [];
                  const newMechanics = mechanics.includes(mechanic.id)
                    ? mechanics.filter((m: string) => m !== mechanic.id)
                    : [...mechanics, mechanic.id];
                  
                  handleUpdateBuilderStep('game-mechanics', {
                    ...config,
                    mechanics: newMechanics
                  });
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{mechanic.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{mechanic.name}</div>
                    <div className="text-sm text-gray-600">{mechanic.description}</div>
                  </div>
                  {config.mechanics?.includes(mechanic.id) && (
                    <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVisualStyleStep = () => {
    const config = builderConfig['visual-style'] || {};
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройте визуальный стиль</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цветовая схема
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Синяя', value: 'blue', color: '#3B82F6' },
                  { name: 'Зеленая', value: 'green', color: '#10B981' },
                  { name: 'Красная', value: 'red', color: '#EF4444' },
                  { name: 'Фиолетовая', value: 'purple', color: '#8B5CF6' }
                ].map(scheme => (
                  <button
                    key={scheme.value}
                    onClick={() => handleUpdateBuilderStep('visual-style', {
                      ...config,
                      colorScheme: scheme.value
                    })}
                    className={`w-12 h-12 rounded-lg border-2 ${
                      config.colorScheme === scheme.value ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: scheme.color }}
                    title={scheme.name}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Стиль графики
              </label>
              <select
                value={config.artStyle || 'pixel'}
                onChange={(e) => handleUpdateBuilderStep('visual-style', {
                  ...config,
                  artStyle: e.target.value
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pixel">Пиксельный</option>
                <option value="cartoon">Мультяшный</option>
                <option value="realistic">Реалистичный</option>
                <option value="minimalist">Минималистичный</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewStep = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Предварительный просмотр</h3>
          
          <div className="bg-gray-100 rounded-lg p-8 mb-6">
            <div 
              className="bg-white rounded-lg shadow-sm mx-auto flex items-center justify-center"
              style={{ 
                width: Math.min(builderConfig['basic-settings']?.width || 800, 600),
                height: Math.min(builderConfig['basic-settings']?.height || 600, 400)
              }}
            >
              <div className="text-center">
                <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-700">
                  {builderConfig['basic-settings']?.title || 'Моя игра'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Размер: {builderConfig['basic-settings']?.width || 800} × {builderConfig['basic-settings']?.height || 600}
                </div>
                {builderConfig['game-mechanics']?.mechanics && (
                  <div className="text-sm text-gray-500 mt-2">
                    Механики: {builderConfig['game-mechanics'].mechanics.length}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              Здесь будет отображаться интерактивный предварительный просмотр вашей игры
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Конфигурация</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>Название: {builderConfig['basic-settings']?.title || 'Не указано'}</div>
            <div>Размер: {builderConfig['basic-settings']?.width || 800} × {builderConfig['basic-settings']?.height || 600}</div>
            <div>Механики: {builderConfig['game-mechanics']?.mechanics?.length || 0}</div>
            <div>Стиль: {builderConfig['visual-style']?.artStyle || 'pixel'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и вкладки */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Grid className="w-6 h-6 text-blue-500 mr-2" />
              Конструктор шаблонов
            </h2>
            <div className="flex items-center space-x-2">
              {currentBuilder && (
                <span className="text-sm text-gray-500">
                  Шаг {(currentBuilder.currentStep || 0) + 1} из {currentBuilder.steps.length}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-0 overflow-x-auto">
          {[
            { id: 'browse', name: 'Обзор шаблонов', icon: '📚' },
            { id: 'builder', name: 'Конструктор', icon: '🔧' },
            { id: 'components', name: 'Компоненты', icon: '🧩' },
            { id: 'assets', name: 'Ассеты', icon: '🖼️' },
            { id: 'create', name: 'Создать', icon: '✨' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Обзор шаблонов */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Поиск и фильтры */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Поиск шаблонов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty === 'Все уровни' ? difficulty : getDifficultyLabel(difficulty)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={loadTemplates}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Поиск...' : 'Найти шаблоны'}
                </button>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Сортировка:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="rating">Рейтинг</option>
                      <option value="downloads">Популярность</option>
                      <option value="name">Название</option>
                      <option value="date">Дата создания</option>
                      <option value="updated">Обновление</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Список шаблонов */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-gray-400" />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{template.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(template.difficulty)}`}>
                          {getDifficultyLabel(template.difficulty)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{template.usage.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {template.usage.downloads.toLocaleString()} загрузок
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm text-blue-600">{template.genre}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCreateBuilder(template)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Использовать
                        </button>
                        <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                          <Heart className="w-4 h-4" />
                        </button>
                        <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                          <Share className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Конструктор */}
        {activeTab === 'builder' && currentBuilder && (
          <div className="space-y-6">
            {/* Прогресс */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">
                  {currentBuilder.template.name}
                </h3>
                <span className="text-sm text-gray-500">
                  Шаг {(currentBuilder.currentStep || 0) + 1} из {currentBuilder.steps.length}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentBuilder.currentStep || 0) + 1) / currentBuilder.steps.length * 100}%`
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between mt-2">
                {currentBuilder.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`text-xs ${
                      index <= (currentBuilder.currentStep || 0)
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Текущий шаг */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {currentBuilder.currentStep === 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Основные настройки</h3>
                  <p className="text-gray-600 mb-6">Настройте базовые параметры вашей игры</p>
                  {renderBasicSettingsStep()}
                </div>
              )}
              
              {currentBuilder.currentStep === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Игровая механика</h3>
                  <p className="text-gray-600 mb-6">Выберите механики, которые будут использоваться в игре</p>
                  {renderGameMechanicsStep()}
                </div>
              )}
              
              {currentBuilder.currentStep === 2 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Визуальный стиль</h3>
                  <p className="text-gray-600 mb-6">Настройте внешний вид и цветовую схему</p>
                  {renderVisualStyleStep()}
                </div>
              )}
              
              {currentBuilder.currentStep === 4 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Предварительный просмотр</h3>
                  <p className="text-gray-600 mb-6">Посмотрите, как будет выглядеть ваша игра</p>
                  {renderPreviewStep()}
                </div>
              )}
              
              {currentBuilder.currentStep === 5 && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Генерация игры</h3>
                  <p className="text-gray-600 mb-6">Готово! Создайте финальную версию вашей игры</p>
                  
                  <div className="bg-green-50 rounded-lg p-6 mb-6">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <div className="text-lg font-medium text-green-900 mb-2">
                      Конфигурация завершена!
                    </div>
                    <div className="text-green-700">
                      Ваша игра готова к генерации
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGenerateGame}
                    disabled={loading}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center mx-auto"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {loading ? 'Генерация...' : 'Сгенерировать игру'}
                  </button>
                </div>
              )}
            </div>

            {/* Навигация */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentBuilder.currentStep > 0) {
                    setCurrentBuilder({
                      ...currentBuilder,
                      currentStep: currentBuilder.currentStep - 1
                    });
                  }
                }}
                disabled={currentBuilder.currentStep === 0}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Назад
              </button>
              
              <button
                onClick={() => {
                  if (currentBuilder.currentStep < currentBuilder.steps.length - 1) {
                    setCurrentBuilder({
                      ...currentBuilder,
                      currentStep: currentBuilder.currentStep + 1
                    });
                  }
                }}
                disabled={currentBuilder.currentStep === currentBuilder.steps.length - 1}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
              >
                Далее
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Компоненты */}
        {activeTab === 'components' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Библиотека компонентов</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Создать компонент
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {components.map(component => (
                <div
                  key={component.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: component.color + '20' }}
                    >
                      {component.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{component.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{component.description}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {component.type}
                        </span>
                        {component.isCore && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            Core
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 mt-3">
                        <button className="text-blue-600 hover:text-blue-700 text-sm">
                          <Code className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-700 text-sm">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-700 text-sm">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ассеты */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Библиотека ассетов</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Загрузить ассет
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                    {asset.type === 'image' && <Image className="w-8 h-8 text-gray-400" />}
                    {asset.type === 'sound' && <Music className="w-8 h-8 text-gray-400" />}
                    {asset.type === 'sprite' && <Layers className="w-8 h-8 text-gray-400" />}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm truncate">{asset.name}</h4>
                    <p className="text-xs text-gray-500">{asset.type}</p>
                    <p className="text-xs text-gray-500">{(asset.size / 1024).toFixed(1)} KB</p>
                  </div>
                  
                  <div className="flex space-x-1 mt-2">
                    <button className="text-blue-600 hover:text-blue-700 text-xs">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-700 text-xs">
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Создание шаблона */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать новый шаблон</h3>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Создание шаблона</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Создайте собственный шаблон для повторного использования. Вы можете настроить 
                      структуру, добавить компоненты и ассеты.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название шаблона *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Введите название шаблона"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Опишите ваш шаблон"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Категория
                      </label>
                      <select
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="custom">Пользовательский</option>
                        <option value="arcade">Аркада</option>
                        <option value="platformer">Платформер</option>
                        <option value="puzzle">Головоломка</option>
                        <option value="strategy">Стратегия</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Сложность
                      </label>
                      <select
                        value={newTemplate.difficulty}
                        onChange={(e) => setNewTemplate({ ...newTemplate, difficulty: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">Начинающий</option>
                        <option value="intermediate">Средний</option>
                        <option value="advanced">Продвинутый</option>
                        <option value="expert">Эксперт</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Теги
                    </label>
                    <input
                      type="text"
                      placeholder="Введите теги через запятую"
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setNewTemplate({ ...newTemplate, tags });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Например: платформер, пиксели, 2D
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Предварительный просмотр</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Название:</strong> {newTemplate.name || 'Не указано'}</div>
                      <div><strong>Категория:</strong> {newTemplate.category}</div>
                      <div><strong>Сложность:</strong> {getDifficultyLabel(newTemplate.difficulty)}</div>
                      <div><strong>Теги:</strong> {newTemplate.tags.length > 0 ? newTemplate.tags.join(', ') : 'Нет'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleCreateTemplate}
                  disabled={loading || !newTemplate.name}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Создание...' : 'Создать шаблон'}
                </button>
                
                <button
                  onClick={() => {
                    setNewTemplate({
                      name: '',
                      description: '',
                      category: 'custom',
                      genre: 'arcade',
                      difficulty: 'beginner',
                      tags: []
                    });
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedTemplateBuilder; 