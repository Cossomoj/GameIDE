import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './InteractiveGameCreator.css';

interface GenerationVariant {
  id: string;
  type: 'ai_generated';
  content: any;
  metadata: {
    prompt?: string;
    userPrompt?: string;
    isCustom?: boolean;
  };
  preview?: string;
}

interface GenerationStep {
  stepId: string;
  type: 'character' | 'mechanics' | 'levels' | 'graphics' | 'sounds' | 'ui';
  name: string;
  description: string;
  variants: GenerationVariant[];
  selectedVariant?: string;
  isCompleted: boolean;
}

interface GenerationProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepDescription: string;
  progress: number;
  variantsGenerated: number;
  isWaitingForSelection: boolean;
}

export const InteractiveGameCreator: React.FC = () => {
  const [gameId, setGameId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<GenerationStep | null>(null);
  const [variants, setVariants] = useState<GenerationVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Подключение к WebSocket
            socketRef.current = io('http://localhost:3001');
    
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('🔗 Подключен к WebSocket');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ WebSocket отключен');
    });

    // Обработчики интерактивной генерации
    socketRef.current.on('interactive:step:started', (data) => {
      setCurrentStep(data.step);
      setVariants([]);
      setSelectedVariant('');
      setGenerationLogs(prev => [...prev, `🚀 Начат этап: ${data.step.name}`]);
    });

    socketRef.current.on('interactive:variants:generating', (data) => {
      setIsGenerating(true);
      setGenerationLogs(prev => [...prev, `🎲 ${data.message}`]);
    });

    socketRef.current.on('interactive:variants:generated', (data) => {
      setIsGenerating(false);
      setVariants(prev => [...prev, ...data.variants]);
      setGenerationLogs(prev => [...prev, 
        `✨ Сгенерировано ${data.variants.length} вариантов${data.isCustomGeneration ? ' (с учетом ваших требований)' : ''}`
      ]);
    });

    socketRef.current.on('interactive:step:completed', (data) => {
      setGenerationLogs(prev => [...prev, `✅ Этап "${currentStep?.name}" завершен`]);
    });

    socketRef.current.on('interactive:progress:update', (data) => {
      setProgress(data);
    });

    socketRef.current.on('interactive:preview:generated', (data) => {
      // Обновляем превью для варианта
      setVariants(prev => prev.map(v => 
        v.id === data.variantId 
          ? { ...v, preview: data.preview.preview }
          : v
      ));
    });

    socketRef.current.on('interactive:error', (data) => {
      setGenerationLogs(prev => [...prev, `❌ Ошибка: ${data.message}`]);
      setIsGenerating(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const startInteractiveGeneration = async () => {
    try {
      const response = await fetch('/api/interactive/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Космические приключения',
          description: 'Платформер про космонавта на чужой планете',
          genre: 'platformer',
          userId: 'user123'
        })
      });

      const result = await response.json();
      if (result.success) {
        setGameId(result.data.gameId);
        setProgress({
          currentStep: result.data.currentStep + 1,
          totalSteps: result.data.totalSteps,
          stepName: result.data.step.name,
          stepDescription: result.data.step.description,
          progress: Math.round(((result.data.currentStep + 1) / result.data.totalSteps) * 100),
          variantsGenerated: 0,
          isWaitingForSelection: false
        });

        // Подписываемся на события этой игры
        socketRef.current?.emit('interactive:subscribe', result.data.gameId);
        
        setGenerationLogs(['🎮 Интерактивная генерация запущена!']);
      }
    } catch (error) {
      console.error('Ошибка запуска генерации:', error);
    }
  };

  const generateMoreVariants = () => {
    if (!gameId || !currentStep) return;
    
    socketRef.current?.emit('interactive:generate:more', {
      gameId,
      stepId: currentStep.stepId,
      count: 5
    });
  };

  const generateCustomVariants = () => {
    if (!gameId || !currentStep || !customPrompt.trim()) return;

    socketRef.current?.emit('interactive:generate:custom', {
      gameId,
      stepId: currentStep.stepId,
      customPrompt: customPrompt.trim(),
      count: 3
    });

    setCustomPrompt('');
    setShowCustomPrompt(false);
  };

  const selectVariant = (variantId: string) => {
    if (!gameId || !currentStep) return;

    socketRef.current?.emit('interactive:select:variant', {
      gameId,
      stepId: currentStep.stepId,
      variantId
    });

    setSelectedVariant(variantId);
  };

  const generatePreview = (variantId: string) => {
    if (!gameId || !currentStep) return;

    socketRef.current?.emit('interactive:generate:preview', {
      gameId,
      stepId: currentStep.stepId,
      variantId
    });
  };

  return (
    <div className="interactive-game-creator">
      <div className="header">
        <h1>🎮 Интерактивная генерация игр</h1>
        <div className="connection-status">
          {isConnected ? '🟢 Подключен' : '🔴 Отключен'}
        </div>
      </div>

      {!gameId ? (
        <div className="start-section">
          <button 
            className="start-btn"
            onClick={startInteractiveGeneration}
            disabled={!isConnected}
          >
            🚀 Начать интерактивную генерацию
          </button>
        </div>
      ) : (
        <>
          {/* Прогресс генерации */}
          {progress && (
            <div className="progress-section">
              <div className="progress-header">
                <h2>{progress.stepName}</h2>
                <span className="step-counter">
                  Этап {progress.currentStep} из {progress.totalSteps}
                </span>
              </div>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
              
              <p className="progress-description">{progress.stepDescription}</p>
              
              {progress.isWaitingForSelection && (
                <div className="waiting-notice">
                  ⏳ Ожидается ваш выбор из {progress.variantsGenerated} вариантов
                </div>
              )}
            </div>
          )}

          {/* Варианты для выбора */}
          {variants.length > 0 && (
            <div className="variants-section">
              <h3>Выберите вариант:</h3>
              
              <div className="variants-grid">
                {variants.map((variant) => (
                  <div 
                    key={variant.id}
                    className={`variant-card ${selectedVariant === variant.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(variant.id)}
                  >
                    {variant.preview && (
                      <div className="variant-preview">
                        {variant.preview.startsWith('data:image/') ? (
                          <img src={variant.preview} alt="Превью" />
                        ) : variant.preview.startsWith('data:audio/') ? (
                          <audio controls src={variant.preview} />
                        ) : (
                          <pre className="text-preview">{variant.preview}</pre>
                        )}
                      </div>
                    )}
                    
                    <div className="variant-content">
                      {currentStep?.type === 'character' && (
                        <>
                          <h4>{variant.content.name}</h4>
                          <p>{variant.content.description}</p>
                          <div className="abilities">
                            {variant.content.abilities?.map((ability: string, idx: number) => (
                              <span key={idx} className="ability-tag">{ability}</span>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {currentStep?.type === 'mechanics' && (
                        <>
                          <h4>Геймплей</h4>
                          <p>{variant.content.coreLoop}</p>
                          <div className="controls">
                            {variant.content.controls?.map((control: string, idx: number) => (
                              <span key={idx} className="control-tag">{control}</span>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {variant.metadata.isCustom && (
                        <div className="custom-badge">✨ По вашим требованиям</div>
                      )}
                    </div>
                    
                    <div className="variant-actions">
                      {!variant.preview && (
                        <button 
                          className="preview-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            generatePreview(variant.id);
                          }}
                        >
                          👁️ Превью
                        </button>
                      )}
                      
                      <button 
                        className="select-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectVariant(variant.id);
                        }}
                      >
                        ✅ Выбрать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Действия с вариантами */}
              <div className="variant-actions-section">
                <button 
                  className="generate-more-btn"
                  onClick={generateMoreVariants}
                  disabled={isGenerating}
                >
                  {isGenerating ? '⏳ Генерируем...' : '🎲 Генерировать еще 5'}
                </button>
                
                <button 
                  className="custom-prompt-btn"
                  onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                  disabled={isGenerating}
                >
                  ✏️ Добавить свои требования
                </button>
              </div>
              
              {/* Кастомный промпт */}
              {showCustomPrompt && (
                <div className="custom-prompt-section">
                  <textarea
                    placeholder="Опишите ваши требования... (например: 'Хочу женщину-космонавта с зеленым костюмом')"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                  />
                  <div className="custom-prompt-actions">
                    <button 
                      className="generate-custom-btn"
                      onClick={generateCustomVariants}
                      disabled={!customPrompt.trim() || isGenerating}
                    >
                      🎯 Генерировать с учетом требований
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        setShowCustomPrompt(false);
                        setCustomPrompt('');
                      }}
                    >
                      ❌ Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Логи генерации */}
          <div className="logs-section">
            <h3>📋 Ход генерации:</h3>
            <div className="logs-container">
              {generationLogs.map((log, idx) => (
                <div key={idx} className="log-entry">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 