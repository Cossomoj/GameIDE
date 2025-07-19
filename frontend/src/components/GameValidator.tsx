import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Zap, 
  FileText, 
  Monitor, 
  Settings,
  Target,
  ShieldCheck,
  Code,
  Image,
  Music,
  Download,
  Upload,
  Eye,
  Wrench,
  Clock,
  TrendingUp,
  Star,
  AlertCircle
} from 'lucide-react';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'content' | 'performance' | 'integration' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  required: boolean;
  autoFixable: boolean;
}

interface ValidationResult {
  ruleId: string;
  passed: boolean;
  message: string;
  details?: string;
  suggestion?: string;
  autoFix?: {
    available: boolean;
    description: string;
  };
  evidence?: {
    files?: string[];
    code?: string;
    metrics?: Record<string, number>;
  };
}

interface ValidationReport {
  gameId: string;
  timestamp: Date;
  overallScore: number;
  status: 'passed' | 'failed' | 'warning';
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  results: ValidationResult[];
  recommendations: string[];
  estimatedFixTime: number;
  yandexCompliance: {
    score: number;
    ready: boolean;
    issues: string[];
  };
}

interface GameValidatorProps {
  gameId?: string;
  onValidationComplete?: (report: ValidationReport) => void;
}

const GameValidator: React.FC<GameValidatorProps> = ({ 
  gameId, 
  onValidationComplete 
}) => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['technical', 'integration', 'performance']);
  const [autoFixMode, setAutoFixMode] = useState(false);
  const [fixingRules, setFixingRules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'rules' | 'recommendations' | 'compliance'>('results');
  const [availableRules, setAvailableRules] = useState<ValidationRule[]>([]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/validation/rules');
      const data = await response.json();
      setAvailableRules(data.rules || []);
    } catch (error) {
      console.error('Ошибка загрузки правил валидации:', error);
    }
  };

  const validateGame = async () => {
    if (!gameId) return;

    try {
      setIsValidating(true);
      
      const response = await fetch('/api/validation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          categories: selectedCategories,
          autoFix: autoFixMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        const validationReport = {
          ...data.report,
          timestamp: new Date(data.report.timestamp)
        };
        
        setReport(validationReport);
        onValidationComplete?.(validationReport);
      }
    } catch (error) {
      console.error('Ошибка валидации игры:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const uploadGameForValidation = async (files: FileList) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/validation/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Автоматически запускаем валидацию после загрузки
        validateGame();
      }
    } catch (error) {
      console.error('Ошибка загрузки игры:', error);
    }
  };

  const autoFixIssue = async (ruleId: string) => {
    try {
      setFixingRules(prev => [...prev, ruleId]);
      
      const response = await fetch('/api/validation/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          ruleId
        })
      });

      if (response.ok) {
        // Перезапускаем валидацию чтобы увидеть результат
        setTimeout(() => validateGame(), 1000);
      }
    } catch (error) {
      console.error('Ошибка автоисправления:', error);
    } finally {
      setFixingRules(prev => prev.filter(id => id !== ruleId));
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const reportData = {
      ...report,
      exportedAt: new Date().toISOString(),
      format: 'json'
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `validation-report-${report.gameId}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <Code className="w-5 h-5 text-blue-500" />;
      case 'content': return <FileText className="w-5 h-5 text-green-500" />;
      case 'performance': return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'integration': return <Target className="w-5 h-5 text-orange-500" />;
      case 'accessibility': return <ShieldCheck className="w-5 h-5 text-cyan-500" />;
      default: return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'failed': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const categories = [
    { key: 'technical', label: 'Технические', icon: Code, description: 'Код, файлы, структура' },
    { key: 'content', label: 'Контент', icon: FileText, description: 'Тексты, изображения, звук' },
    { key: 'performance', label: 'Производительность', icon: TrendingUp, description: 'Скорость, память, FPS' },
    { key: 'integration', label: 'Интеграция', icon: Target, description: 'Yandex Games SDK' },
    { key: 'accessibility', label: 'Доступность', icon: ShieldCheck, description: 'Удобство использования' }
  ];

  const tabs = [
    { key: 'results', label: 'Результаты', icon: Eye },
    { key: 'rules', label: 'Правила', icon: Settings },
    { key: 'recommendations', label: 'Рекомендации', icon: Star },
    { key: 'compliance', label: 'Yandex Games', icon: Target }
  ];

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <ShieldCheck className="w-7 h-7 text-green-500 mr-3" />
              Валидация игр
            </h2>
            <p className="text-gray-600 mt-1">
              Проверьте соответствие игры требованиям Yandex Games
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {!gameId && (
              <>
                <input
                  type="file"
                  id="game-upload"
                  multiple
                  accept=".zip,.html,.js,.css"
                  onChange={(e) => e.target.files && uploadGameForValidation(e.target.files)}
                  className="hidden"
                />
                <label
                  htmlFor="game-upload"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Загрузить игру</span>
                </label>
              </>
            )}
            
            {report && (
              <button
                onClick={downloadReport}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Отчет</span>
              </button>
            )}
            
            <button
              onClick={validateGame}
              disabled={isValidating || !gameId}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isValidating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Проверяю...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Валидировать</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Настройки валидации */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Настройки проверки</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Категории */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Категории проверок</label>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <label key={category.key} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories(prev => [...prev, category.key]);
                          } else {
                            setSelectedCategories(prev => prev.filter(c => c !== category.key));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Icon className="w-4 h-4" />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{category.label}</span>
                        <div className="text-xs text-gray-500">{category.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Настройки автоисправления */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Дополнительные опции</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFixMode}
                    onChange={(e) => setAutoFixMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <Wrench className="w-4 h-4 text-purple-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Автоматическое исправление</span>
                    <div className="text-xs text-gray-500">Исправлять ошибки автоматически, где возможно</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Сводка результатов */}
        {report && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}/100
                  </div>
                  <div className="text-sm text-gray-500">Общий балл</div>
                </div>
                {getStatusIcon(report.status)}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
                  <div className="text-sm text-green-700">Пройдено</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
                  <div className="text-sm text-red-700">Ошибок</div>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
                  <div className="text-sm text-yellow-700">Предупреждений</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Результаты валидации */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm">
          {/* Табы */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-0">
              {tabs.map((tab) => {
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
            {/* Результаты проверок */}
            {activeTab === 'results' && (
              <div className="space-y-4">
                {report.results.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Валидация не проводилась
                    </h3>
                    <p className="text-gray-500">
                      Нажмите кнопку "Валидировать" для проверки игры
                    </p>
                  </div>
                ) : (
                  report.results.map((result, index) => {
                    const rule = availableRules.find(r => r.id === result.ruleId);
                    const isFixing = fixingRules.includes(result.ruleId);
                    
                    return (
                      <div key={index} className={`border rounded-lg p-4 ${
                        result.passed ? 'border-green-200 bg-green-50' : 
                        rule?.severity === 'error' ? 'border-red-200 bg-red-50' :
                        rule?.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {rule && getSeverityIcon(rule.severity)}
                            {rule && getCategoryIcon(rule.category)}
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{rule?.name || result.ruleId}</h4>
                                {rule && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                                    {rule.severity === 'error' && 'Ошибка'}
                                    {rule.severity === 'warning' && 'Предупреждение'}
                                    {rule.severity === 'info' && 'Информация'}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-700 mb-2">{result.message}</p>
                              
                              {result.details && (
                                <div className="text-sm text-gray-600 mb-2">
                                  <strong>Детали:</strong> {result.details}
                                </div>
                              )}
                              
                              {result.suggestion && (
                                <div className="text-sm text-blue-700 bg-blue-100 rounded p-2 mb-2">
                                  <strong>Рекомендация:</strong> {result.suggestion}
                                </div>
                              )}
                              
                              {result.evidence && (
                                <div className="text-xs text-gray-500 space-y-1">
                                  {result.evidence.files && (
                                    <div>
                                      <strong>Файлы:</strong> {result.evidence.files.join(', ')}
                                    </div>
                                  )}
                                  {result.evidence.metrics && (
                                    <div>
                                      <strong>Метрики:</strong> {Object.entries(result.evidence.metrics).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Действия */}
                          <div className="ml-4 flex items-center space-x-2">
                            {result.passed ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : result.autoFix?.available && (
                              <button
                                onClick={() => autoFixIssue(result.ruleId)}
                                disabled={isFixing}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  isFixing
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                                }`}
                              >
                                {isFixing ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Исправляю...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4" />
                                    <span>Исправить</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Правила валидации */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Доступные правила валидации</h3>
                  <p className="text-gray-600">Всего правил: {availableRules.length}</p>
                </div>
                
                {availableRules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {getCategoryIcon(rule.category)}
                      {getSeverityIcon(rule.severity)}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                            {rule.severity}
                          </span>
                          {rule.required && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Обязательно
                            </span>
                          )}
                          {rule.autoFixable && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Автоисправление
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700">{rule.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Рекомендации */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {report.recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Нет рекомендаций
                    </h3>
                    <p className="text-gray-500">
                      Ваша игра соответствует всем требованиям!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3 mb-6">
                      <Star className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Рекомендации по улучшению
                      </h3>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                        Время на исправление: ~{report.estimatedFixTime} мин
                      </span>
                    </div>
                    
                    {report.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-gray-700">{recommendation}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Соответствие Yandex Games */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-3 mb-4">
                    <Target className="w-8 h-8 text-orange-500" />
                    <h3 className="text-xl font-semibold text-gray-900">Yandex Games Compliance</h3>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-8 mb-6">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(report.yandexCompliance.score)}`}>
                        {report.yandexCompliance.score}/100
                      </div>
                      <div className="text-sm text-gray-500">Балл соответствия</div>
                    </div>
                    
                    <div className="text-center">
                      {report.yandexCompliance.ready ? (
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      ) : (
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                      )}
                      <div className="text-sm font-medium">
                        {report.yandexCompliance.ready ? 'Готово к публикации' : 'Требуется доработка'}
                      </div>
                    </div>
                  </div>
                </div>

                {report.yandexCompliance.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Проблемы соответствия:</h4>
                    <div className="space-y-2">
                      {report.yandexCompliance.issues.map((issue, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <span className="text-red-800">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.yandexCompliance.ready && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-green-800 mb-2">
                      Поздравляем!
                    </h4>
                    <p className="text-green-700">
                      Ваша игра полностью соответствует требованиям Yandex Games и готова к публикации на платформе.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Загрузка игры */}
      {!gameId && !report && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Загрузите игру для валидации
          </h3>
          <p className="text-gray-600 mb-6">
            Поддерживаются ZIP архивы, HTML файлы и отдельные ресурсы игр
          </p>
          <label
            htmlFor="game-upload"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Выбрать файлы</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default GameValidator; 