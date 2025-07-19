import React, { useState, useEffect } from 'react';
import { 
  Code2, Download, Languages, FileText, Settings, Zap, Compare,
  Rocket, CheckCircle, AlertCircle, Clock, Star, Cpu, Shield,
  Globe, Smartphone, Monitor, Box, PlayCircle, FileCode,
  Copy, ExternalLink, RefreshCw, Trash2, Eye, Plus
} from 'lucide-react';

interface LanguageConfig {
  id: string;
  name: string;
  displayName: string;
  version: string;
  fileExtension: string;
  features: {
    typeSafety: 'static' | 'dynamic' | 'optional';
    memoryManagement: 'manual' | 'garbage_collected' | 'reference_counted';
    webSupport: boolean;
    mobileSupport: boolean;
    desktopSupport: boolean;
    gameEngines: string[];
  };
  runtime: {
    type: 'interpreted' | 'compiled' | 'transpiled';
    packageManager?: string;
  };
}

interface GeneratedCode {
  id: string;
  language: string;
  gameId: string;
  files: Array<{
    path: string;
    content: string;
    type: 'source' | 'config' | 'asset' | 'documentation' | 'test';
    size: number;
  }>;
  metadata: {
    generatedAt: string;
    language: string;
    version: string;
    totalFiles: number;
    totalSize: number;
    dependencies: string[];
    buildInstructions: string[];
    runInstructions: string[];
  };
  projectStructure: {
    name: string;
    version: string;
    description: string;
    main: string;
  };
}

interface ConversionJob {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errors: Array<{
    type: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  generatedCode?: GeneratedCode;
}

interface MultiLanguageGeneratorProps {
  gameConfig?: any;
  onCodeGenerated?: (code: GeneratedCode) => void;
  onError?: (error: string) => void;
}

const MultiLanguageGenerator: React.FC<MultiLanguageGeneratorProps> = ({
  gameConfig,
  onCodeGenerated,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'convert' | 'projects' | 'compare'>('generate');
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [generatedProjects, setGeneratedProjects] = useState<GeneratedCode[]>([]);
  const [conversionJobs, setConversionJobs] = useState<ConversionJob[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Настройки генерации
  const [outputFormat, setOutputFormat] = useState<'single_file' | 'multi_file' | 'project'>('multi_file');
  const [optimizations, setOptimizations] = useState({
    minify: false,
    obfuscate: false,
    bundleAssets: false,
    generateDocs: true,
    includeTests: false
  });

  // Конвертация кода
  const [sourceCode, setSourceCode] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');

  // Сравнение языков
  const [compareLanguages, setCompareLanguages] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  useEffect(() => {
    loadSupportedLanguages();
    loadGeneratedProjects();
  }, []);

  const loadSupportedLanguages = async () => {
    try {
      const response = await fetch('/api/multi-language/languages');
      const data = await response.json();
      
      if (data.success) {
        setLanguages(data.data.languages);
        if (data.data.languages.length > 0 && !selectedLanguage) {
          setSelectedLanguage(data.data.languages[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      onError?.('Не удалось загрузить список языков');
    }
  };

  const loadGeneratedProjects = () => {
    // В реальном приложении здесь был бы запрос к API
    const stored = localStorage.getItem('generatedProjects');
    if (stored) {
      setGeneratedProjects(JSON.parse(stored));
    }
  };

  const saveGeneratedProject = (project: GeneratedCode) => {
    const updated = [...generatedProjects, project];
    setGeneratedProjects(updated);
    localStorage.setItem('generatedProjects', JSON.stringify(updated));
  };

  const generateCode = async () => {
    if (!selectedLanguage || !gameConfig) {
      onError?.('Выберите язык программирования и убедитесь, что игра сконфигурирована');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/multi-language/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameConfig,
          targetLanguage: selectedLanguage,
          outputFormat,
          optimizations
        })
      });

      const data = await response.json();
      
      if (data.success) {
        saveGeneratedProject(data.data);
        onCodeGenerated?.(data.data);
      } else {
        onError?.(data.message || 'Ошибка генерации кода');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      onError?.('Ошибка при генерации кода');
    } finally {
      setLoading(false);
    }
  };

  const convertCode = async () => {
    if (!sourceCode || !sourceLanguage || !targetLanguage) {
      onError?.('Заполните все поля для конвертации');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/multi-language/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          sourceLanguage,
          targetLanguage,
          gameId: gameConfig?.id || 'unknown'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConversionJobs(prev => [...prev, data.data]);
        pollConversionStatus(data.data.id);
      } else {
        onError?.(data.message || 'Ошибка конвертации кода');
      }
    } catch (error) {
      console.error('Error converting code:', error);
      onError?.('Ошибка при конвертации кода');
    } finally {
      setLoading(false);
    }
  };

  const pollConversionStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/multi-language/conversion/${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          setConversionJobs(prev => 
            prev.map(job => job.id === jobId ? data.data : job)
          );
          
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            clearInterval(interval);
            if (data.data.status === 'completed' && data.data.generatedCode) {
              saveGeneratedProject(data.data.generatedCode);
            }
          }
        }
      } catch (error) {
        console.error('Error polling conversion status:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const compareLanguagesFunc = async () => {
    if (compareLanguages.length < 2) {
      onError?.('Выберите минимум 2 языка для сравнения');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/multi-language/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageIds: compareLanguages })
      });

      const data = await response.json();
      
      if (data.success) {
        setComparisonResult(data.data);
      } else {
        onError?.(data.message || 'Ошибка сравнения языков');
      }
    } catch (error) {
      console.error('Error comparing languages:', error);
      onError?.('Ошибка при сравнении языков');
    } finally {
      setLoading(false);
    }
  };

  const downloadProject = async (projectId: string, format: 'zip' | 'tar.gz' = 'zip') => {
    try {
      const response = await fetch(`/api/multi-language/download/${projectId}?format=${format}`);
      const data = await response.json();
      
      if (data.success) {
        // В реальном приложении здесь была бы загрузка файла
        window.open(data.data.downloadUrl, '_blank');
      } else {
        onError?.(data.message || 'Ошибка скачивания проекта');
      }
    } catch (error) {
      console.error('Error downloading project:', error);
      onError?.('Ошибка при скачивании проекта');
    }
  };

  const getLanguageIcon = (languageId: string) => {
    const icons: Record<string, string> = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      csharp: '💙',
      rust: '🦀',
      go: '🔷'
    };
    return icons[languageId] || '💻';
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLearningCurveColor = (rating: string) => {
    switch (rating) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и вкладки */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <Languages className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Мультиязычная генерация</h2>
                <p className="text-gray-600">Генерация игр на разных языках программирования</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Поддерживается {languages.length} языков
            </div>
          </div>

          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'generate', label: 'Генерация', icon: Code2 },
              { id: 'convert', label: 'Конвертация', icon: RefreshCw },
              { id: 'projects', label: 'Проекты', icon: FileCode },
              { id: 'compare', label: 'Сравнение', icon: Compare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Генерация кода */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            {/* Выбор языка */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выберите язык программирования
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {languages.map(language => (
                  <div
                    key={language.id}
                    onClick={() => setSelectedLanguage(language.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedLanguage === language.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getLanguageIcon(language.id)}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{language.displayName}</div>
                        <div className="text-sm text-gray-500">{language.version}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        language.features.typeSafety === 'static' ? 'bg-green-100 text-green-800' :
                        language.features.typeSafety === 'optional' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {language.features.typeSafety === 'static' ? 'Статически типизированный' :
                         language.features.typeSafety === 'optional' ? 'Опциональная типизация' :
                         'Динамически типизированный'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                      {language.features.webSupport && <Globe className="w-3 h-3" />}
                      {language.features.mobileSupport && <Smartphone className="w-3 h-3" />}
                      {language.features.desktopSupport && <Monitor className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Настройки генерации */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Настройки генерации
              </label>
              
              <div className="space-y-4">
                {/* Формат вывода */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Формат проекта</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="single_file">Один файл</option>
                    <option value="multi_file">Несколько файлов</option>
                    <option value="project">Полный проект</option>
                  </select>
                </div>

                {/* Оптимизации */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Дополнительные опции</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: 'generateDocs', label: 'Документация', icon: FileText },
                      { key: 'includeTests', label: 'Тесты', icon: CheckCircle },
                      { key: 'bundleAssets', label: 'Ресурсы', icon: Box },
                      { key: 'minify', label: 'Минификация', icon: Zap },
                      { key: 'obfuscate', label: 'Обфускация', icon: Shield }
                    ].map(option => (
                      <label key={option.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={optimizations[option.key as keyof typeof optimizations]}
                          onChange={(e) => setOptimizations(prev => ({
                            ...prev,
                            [option.key]: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <option.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Кнопка генерации */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {gameConfig ? (
                  `Игра: ${gameConfig.name || 'Без названия'}`
                ) : (
                  'Сначала создайте или выберите игру'
                )}
              </div>
              
              <button
                onClick={generateCode}
                disabled={loading || !selectedLanguage || !gameConfig}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Генерация...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Генерировать код</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Конвертация кода */}
        {activeTab === 'convert' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Конвертация между языками</h3>
              </div>
              <p className="text-blue-700 mt-1">
                Автоматическая конвертация кода игры из одного языка в другой
              </p>
            </div>

            {/* Выбор языков */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Исходный язык
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Выберите язык</option>
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {getLanguageIcon(lang.id)} {lang.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Целевой язык
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Выберите язык</option>
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {getLanguageIcon(lang.id)} {lang.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Исходный код */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Исходный код
              </label>
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                placeholder="Вставьте код для конвертации..."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>

            {/* Кнопка конвертации */}
            <div className="flex justify-end">
              <button
                onClick={convertCode}
                disabled={loading || !sourceCode || !sourceLanguage || !targetLanguage}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Конвертация...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Конвертировать</span>
                  </>
                )}
              </button>
            </div>

            {/* Задачи конвертации */}
            {conversionJobs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Задачи конвертации</h3>
                <div className="space-y-3">
                  {conversionJobs.map(job => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getLanguageIcon(job.sourceLanguage)}</span>
                          <RefreshCw className="w-4 h-4 text-gray-400" />
                          <span className="text-lg">{getLanguageIcon(job.targetLanguage)}</span>
                          <span className="text-sm text-gray-600">
                            {languages.find(l => l.id === job.sourceLanguage)?.displayName} → {' '}
                            {languages.find(l => l.id === job.targetLanguage)?.displayName}
                          </span>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status === 'completed' ? 'Завершено' :
                           job.status === 'failed' ? 'Ошибка' :
                           job.status === 'processing' ? 'Обработка' :
                           'В очереди'}
                        </div>
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Прогресс</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {job.errors.length > 0 && (
                        <div className="text-sm text-red-600">
                          {job.errors.map((error, idx) => (
                            <div key={idx}>• {error.message}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Сгенерированные проекты */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Сгенерированные проекты ({generatedProjects.length})
              </h3>
              
              <button
                onClick={loadGeneratedProjects}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Обновить</span>
              </button>
            </div>

            {generatedProjects.length === 0 ? (
              <div className="text-center py-12">
                <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Нет сгенерированных проектов</p>
                <p className="text-sm text-gray-400">Создайте первый проект во вкладке "Генерация"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedProjects.map(project => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getLanguageIcon(project.language)}</span>
                        <div>
                          <div className="font-semibold text-gray-900">{project.projectStructure.name}</div>
                          <div className="text-xs text-gray-500">
                            {languages.find(l => l.id === project.language)?.displayName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => downloadProject(project.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Скачать проект"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Просмотреть код"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {project.projectStructure.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{project.metadata.totalFiles} файлов</span>
                      <span>{Math.round(project.metadata.totalSize / 1024)} КБ</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>{new Date(project.metadata.generatedAt).toLocaleDateString()}</span>
                      <span>v{project.projectStructure.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Сравнение языков */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Compare className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Сравнение языков программирования</h3>
              </div>
              <p className="text-green-700 mt-1">
                Выберите языки для детального сравнения их характеристик
              </p>
            </div>

            {/* Выбор языков для сравнения */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выберите языки для сравнения (минимум 2)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {languages.map(language => (
                  <label key={language.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={compareLanguages.includes(language.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCompareLanguages(prev => [...prev, language.id]);
                        } else {
                          setCompareLanguages(prev => prev.filter(id => id !== language.id));
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-lg">{getLanguageIcon(language.id)}</span>
                    <span className="text-sm text-gray-700">{language.displayName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Кнопка сравнения */}
            <div className="flex justify-end">
              <button
                onClick={compareLanguagesFunc}
                disabled={loading || compareLanguages.length < 2}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Сравнение...</span>
                  </>
                ) : (
                  <>
                    <Compare className="w-4 h-4" />
                    <span>Сравнить языки</span>
                  </>
                )}
              </button>
            </div>

            {/* Результаты сравнения */}
            {comparisonResult && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Результаты сравнения</h3>
                
                {/* Таблица сравнения */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Характеристика</th>
                        {comparisonResult.languages.map((lang: any) => (
                          <th key={lang.id} className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                            <div className="flex items-center justify-center space-x-2">
                              <span>{getLanguageIcon(lang.id)}</span>
                              <span>{lang.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Типизация</td>
                        {comparisonResult.languages.map((lang: any) => (
                          <td key={`${lang.id}-type`} className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              lang.typeSafety === 'static' ? 'bg-green-100 text-green-800' :
                              lang.typeSafety === 'optional' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lang.typeSafety === 'static' ? 'Статическая' :
                               lang.typeSafety === 'optional' ? 'Опциональная' :
                               'Динамическая'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Производительность</td>
                        {comparisonResult.languages.map((lang: any) => (
                          <td key={`${lang.id}-perf`} className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPerformanceColor(lang.performance)}`}>
                              {lang.performance === 'high' ? 'Высокая' :
                               lang.performance === 'medium' ? 'Средняя' :
                               'Низкая'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Сложность изучения</td>
                        {comparisonResult.languages.map((lang: any) => (
                          <td key={`${lang.id}-learn`} className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLearningCurveColor(lang.learningCurve)}`}>
                              {lang.learningCurve === 'easy' ? 'Легкая' :
                               lang.learningCurve === 'medium' ? 'Средняя' :
                               'Сложная'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Поддержка платформ</td>
                        {comparisonResult.languages.map((lang: any) => (
                          <td key={`${lang.id}-platforms`} className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {lang.webSupport && <Globe className="w-4 h-4 text-blue-500" title="Веб" />}
                              {lang.mobileSupport && <Smartphone className="w-4 h-4 text-green-500" title="Мобильные" />}
                              {lang.desktopSupport && <Monitor className="w-4 h-4 text-purple-500" title="Десктоп" />}
                            </div>
                          </td>
                        ))}
                      </tr>
                      
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Игровые движки</td>
                        {comparisonResult.languages.map((lang: any) => (
                          <td key={`${lang.id}-engines`} className="px-4 py-3 text-center text-xs text-gray-600">
                            {lang.gameEngines.slice(0, 2).join(', ')}
                            {lang.gameEngines.length > 2 && ` +${lang.gameEngines.length - 2}`}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Рекомендации */}
                {comparisonResult.recommendations && Object.keys(comparisonResult.recommendations).length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Рекомендации</h4>
                    <div className="space-y-2">
                      {Object.entries(comparisonResult.recommendations).map(([key, value]) => (
                        <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-900 font-medium">
                              {key === 'web' ? 'Веб-разработка' :
                               key === 'mobile' ? 'Мобильная разработка' :
                               key === 'enterprise' ? 'Корпоративная разработка' :
                               key === 'performance' ? 'Производительность' :
                               key}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">{value as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiLanguageGenerator; 