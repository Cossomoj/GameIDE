import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  model: string;
  alternatives: string[];
  quality: TranslationQuality;
}

interface TranslationQuality {
  accuracy: number;
  fluency: number;
  culturalAdaptation: number;
  gameContext: number;
  overallScore: number;
  issues: string[];
  suggestions: string[];
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface CacheStatistics {
  totalCached: number;
  mostUsed: any[];
  byDomain: Record<string, number>;
  byLanguage: Record<string, number>;
}

const EnhancedLocalizationDashboard: React.FC = () => {
  const [text, setText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('ru');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [domain, setDomain] = useState('ui');
  const [context, setContext] = useState('');
  const [gameType, setGameType] = useState('arcade');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStatistics | null>(null);
  const [mode, setMode] = useState<'single' | 'batch' | 'game'>('single');
  const [batchTexts, setBatchTexts] = useState<string[]>(['']);
  const [gameContent, setGameContent] = useState({
    gameId: '',
    title: '',
    description: '',
    instructions: '',
    dialogues: [''],
    uiElements: {} as Record<string, string>,
    achievements: [{ title: '', description: '' }]
  });
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [gameTranslation, setGameTranslation] = useState<any>(null);

  useEffect(() => {
    loadLanguages();
    loadCacheStats();
  }, []);

  const loadLanguages = async () => {
    try {
      const response = await fetch('/api/enhanced-localization/supported-languages');
      const data = await response.json();
      if (data.success) {
        setLanguages(data.languages);
      }
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  };

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/enhanced-localization/cache-stats');
      const data = await response.json();
      if (data.success) {
        setCacheStats(data.cacheStatistics);
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const translateText = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/enhanced-localization/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
          context,
          gameType,
          domain
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.translation);
      }
    } catch (error) {
      console.error('Error translating text:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateBatch = async () => {
    const validTexts = batchTexts.filter(t => t.trim());
    if (validTexts.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/enhanced-localization/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: validTexts,
          sourceLanguage,
          targetLanguage,
          domain,
          gameType
        })
      });

      const data = await response.json();
      if (data.success) {
        setBatchResults(data.results);
      }
    } catch (error) {
      console.error('Error batch translating:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateGameContent = async () => {
    if (!gameContent.gameId.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/enhanced-localization/translate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameContent.gameId,
          content: gameContent,
          targetLanguages: [targetLanguage]
        })
      });

      const data = await response.json();
      if (data.success) {
        setGameTranslation(data.translation);
      }
    } catch (error) {
      console.error('Error translating game content:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/enhanced-localization/clear-cache', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await loadCacheStats();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const addBatchText = () => {
    setBatchTexts([...batchTexts, '']);
  };

  const updateBatchText = (index: number, value: string) => {
    const newTexts = [...batchTexts];
    newTexts[index] = value;
    setBatchTexts(newTexts);
  };

  const removeBatchText = (index: number) => {
    setBatchTexts(batchTexts.filter((_, i) => i !== index));
  };

  const addDialogue = () => {
    setGameContent({
      ...gameContent,
      dialogues: [...gameContent.dialogues, '']
    });
  };

  const updateDialogue = (index: number, value: string) => {
    const newDialogues = [...gameContent.dialogues];
    newDialogues[index] = value;
    setGameContent({ ...gameContent, dialogues: newDialogues });
  };

  const addAchievement = () => {
    setGameContent({
      ...gameContent,
      achievements: [...gameContent.achievements, { title: '', description: '' }]
    });
  };

  const updateAchievement = (index: number, field: 'title' | 'description', value: string) => {
    const newAchievements = [...gameContent.achievements];
    newAchievements[index] = { ...newAchievements[index], [field]: value };
    setGameContent({ ...gameContent, achievements: newAchievements });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌐 Расширенная Локализация</h1>
          <p className="text-gray-600">Автоматический перевод игрового контента с помощью ИИ</p>
        </div>

        {/* Stats Cards */}
        {cacheStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Кешированные переводы</h3>
              <p className="text-3xl font-bold text-blue-600">{cacheStats.totalCached}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Популярный язык</h3>
              <p className="text-xl font-bold text-green-600">
                {Object.keys(cacheStats.byLanguage)[0] || 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Домены переводов</h3>
              <p className="text-xl font-bold text-purple-600">
                {Object.keys(cacheStats.byDomain).length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <button
                onClick={clearCache}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑️ Очистить кеш
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-lg ${
                mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Одиночный перевод
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-4 py-2 rounded-lg ${
                mode === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Пакетный перевод
            </button>
            <button
              onClick={() => setMode('game')}
              className={`px-4 py-2 rounded-lg ${
                mode === 'game' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Перевод игры
            </button>
          </div>

          {/* Language and Domain Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Исходный язык</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Целевой язык</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Домен</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="ui">UI элементы</option>
                <option value="game-content">Игровой контент</option>
                <option value="story">Сюжет</option>
                <option value="dialogue">Диалоги</option>
                <option value="menu">Меню</option>
                <option value="error">Ошибки</option>
                <option value="achievement">Достижения</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тип игры</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="arcade">Аркада</option>
                <option value="platformer">Платформер</option>
                <option value="puzzle">Головоломка</option>
                <option value="rpg">РПГ</option>
                <option value="strategy">Стратегия</option>
                <option value="racing">Гонки</option>
              </select>
            </div>
          </div>
        </div>

        {/* Single Translation Mode */}
        {mode === 'single' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Одиночный перевод</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Текст для перевода</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Введите текст для перевода..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Контекст (необязательно)</label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Дополнительный контекст для лучшего перевода..."
                />
              </div>

              <button
                onClick={translateText}
                disabled={loading || !text.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Переводим...' : 'Перевести'}
              </button>
            </div>

            {/* Translation Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gray-50 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Результат перевода</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Оригинал ({result.sourceLanguage}):</div>
                    <div className="text-gray-900">{result.originalText}</div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-600">
                        Перевод ({result.targetLanguage}) - {result.model}:
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadge(result.confidence)}`}>
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-gray-900 font-medium">{result.translatedText}</div>
                  </div>

                  {/* Quality Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(result.quality.accuracy)}`}>
                        {(result.quality.accuracy * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Точность</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(result.quality.fluency)}`}>
                        {(result.quality.fluency * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Беглость</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(result.quality.culturalAdaptation)}`}>
                        {(result.quality.culturalAdaptation * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Культурная адаптация</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(result.quality.gameContext)}`}>
                        {(result.quality.gameContext * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Игровой контекст</div>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Альтернативные варианты:</h4>
                      <div className="space-y-2">
                        {result.alternatives.map((alt, index) => (
                          <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                            {alt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues and Suggestions */}
                  {(result.quality.issues.length > 0 || result.quality.suggestions.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.quality.issues.length > 0 && (
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">⚠️ Проблемы:</h4>
                          <ul className="text-sm text-red-600 space-y-1">
                            {result.quality.issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.quality.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-blue-700 mb-2">💡 Рекомендации:</h4>
                          <ul className="text-sm text-blue-600 space-y-1">
                            {result.quality.suggestions.map((suggestion, index) => (
                              <li key={index}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Batch Translation Mode */}
        {mode === 'batch' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Пакетный перевод</h2>
            
            <div className="space-y-4">
              {batchTexts.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateBatchText(index, e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    placeholder={`Текст ${index + 1}...`}
                  />
                  {batchTexts.length > 1 && (
                    <button
                      onClick={() => removeBatchText(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-4">
                <button
                  onClick={addBatchText}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  + Добавить текст
                </button>
                <button
                  onClick={translateBatch}
                  disabled={loading || batchTexts.filter(t => t.trim()).length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Переводим...' : 'Перевести все'}
                </button>
              </div>
            </div>

            {/* Batch Results */}
            {batchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты пакетного перевода</h3>
                <div className="space-y-4">
                  {batchResults.map((result, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      {result.success ? (
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Оригинал:</div>
                          <div className="text-gray-900 mb-2">{result.originalText}</div>
                          <div className="text-sm text-gray-600 mb-1">Перевод:</div>
                          <div className="text-green-700 font-medium">{result.translation.translatedText}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Качество: {(result.translation.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-red-600">Ошибка: {result.error}</div>
                          <div className="text-gray-500 text-sm">Текст: {result.originalText}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Translation Mode */}
        {mode === 'game' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Перевод игрового контента</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID игры</label>
                  <input
                    type="text"
                    value={gameContent.gameId}
                    onChange={(e) => setGameContent({...gameContent, gameId: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="my-awesome-game"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название игры</label>
                  <input
                    type="text"
                    value={gameContent.title}
                    onChange={(e) => setGameContent({...gameContent, title: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Космические приключения"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Описание игры</label>
                <textarea
                  value={gameContent.description}
                  onChange={(e) => setGameContent({...gameContent, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Увлекательная игра о космических путешествиях..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Инструкции</label>
                <textarea
                  value={gameContent.instructions}
                  onChange={(e) => setGameContent({...gameContent, instructions: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Используйте стрелки для движения..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Диалоги</label>
                {gameContent.dialogues.map((dialogue, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={dialogue}
                      onChange={(e) => updateDialogue(index, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg"
                      placeholder={`Диалог ${index + 1}...`}
                    />
                  </div>
                ))}
                <button
                  onClick={addDialogue}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  + Добавить диалог
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Достижения</label>
                {gameContent.achievements.map((achievement, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={achievement.title}
                      onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder={`Название достижения ${index + 1}...`}
                    />
                    <input
                      type="text"
                      value={achievement.description}
                      onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder={`Описание достижения ${index + 1}...`}
                    />
                  </div>
                ))}
                <button
                  onClick={addAchievement}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  + Добавить достижение
                </button>
              </div>

              <button
                onClick={translateGameContent}
                disabled={loading || !gameContent.gameId.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Переводим игру...' : 'Перевести всю игру'}
              </button>
            </div>

            {/* Game Translation Result */}
            {gameTranslation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gray-50 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Результат перевода игры (Качество: {(gameTranslation.qualityScore * 100).toFixed(0)}%)
                </h3>
                
                <div className="space-y-4">
                  {Object.entries(gameTranslation.translatedContent).map(([lang, content]: [string, any]) => (
                    <div key={lang} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">🌐 {lang.toUpperCase()}</h4>
                      
                      {content.title && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Название: </span>
                          <span className="font-medium">{content.title}</span>
                        </div>
                      )}
                      
                      {content.description && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Описание: </span>
                          <span>{content.description}</span>
                        </div>
                      )}
                      
                      {content.instructions && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Инструкции: </span>
                          <span>{content.instructions}</span>
                        </div>
                      )}
                      
                      {content.dialogues && content.dialogues.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Диалоги: </span>
                          <ul className="list-disc list-inside ml-4">
                            {content.dialogues.map((dialogue: string, index: number) => (
                              <li key={index} className="text-sm">{dialogue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {content.achievements && content.achievements.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Достижения: </span>
                          <div className="space-y-1 ml-4">
                            {content.achievements.map((achievement: any, index: number) => (
                              <div key={index} className="text-sm">
                                <strong>{achievement.title}</strong>: {achievement.description}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLocalizationDashboard; 