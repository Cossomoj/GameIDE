import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Steps,
  Button,
  Progress,
  Modal,
  Card,
  Typography,
  Result,
  Breadcrumb,
  Tooltip,
  Tag,
  notification,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  HomeOutlined
} from '@ant-design/icons';
import VariantSelector from '../components/InteractiveGeneration/VariantSelector';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../services/api';

const { Step } = Steps;
const { Title, Paragraph } = Typography;

interface InteractiveStep {
  stepId: string;
  name: string;
  description: string;
  type: string;
  variants: any[];
  selectedVariant?: string;
  customPrompt?: string;
  isCompleted: boolean;
  isSkippable: boolean;
}

interface InteractiveState {
  gameId: string;
  currentStep: number;
  totalSteps: number;
  step: InteractiveStep;
  isActive: boolean;
  completedSteps: number;
  startedAt: string;
  lastActivityAt: string;
}

const InteractiveGeneration: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState<InteractiveState | null>(null);
  const [guidelines, setGuidelines] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [finalGamePath, setFinalGamePath] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (gameId) {
      // Загружаем существующую интерактивную генерацию
      loadInteractiveState();
    } else {
      // Запускаем новую интерактивную генерацию с конфигурацией
      startNewInteractiveGeneration();
    }
  }, [gameId]);

  const startNewInteractiveGeneration = async () => {
    try {
      setIsInitializing(true);

      // Получаем конфигурацию игры из location.state или localStorage
      const gameConfiguration = location.state?.gameConfiguration || 
        JSON.parse(localStorage.getItem('gameConfiguration') || '{}');
      
      // Получаем базовые данные игры из localStorage
      const baseGameData = JSON.parse(localStorage.getItem('baseGameData') || '{}');

      if (!gameConfiguration.mainGenre) {
        notification.error({
          message: 'Ошибка',
          description: 'Конфигурация игры не найдена. Пожалуйста, начните сначала.'
        });
        navigate('/configure-game');
        return;
      }

      // Объединяем данные
      const fullGameData = {
        ...baseGameData,
        configuration: gameConfiguration
      };

      // Запускаем интерактивную генерацию с полной конфигурацией
      const response = await api.post('/interactive/start', fullGameData);
      
      const newGameId = response.data.data.gameId;
      
      // Обновляем URL без перезагрузки страницы
      window.history.replaceState({}, '', `/interactive-generation?gameId=${newGameId}`);
      
      // Загружаем состояние новой генерации
      setState(response.data.data);
      
      // Очищаем временные данные
      localStorage.removeItem('gameConfiguration');
      localStorage.removeItem('baseGameData');

      notification.success({
        message: 'Успешно!',
        description: 'Интерактивная генерация запущена с вашей конфигурацией'
      });

    } catch (error) {
      console.error('Ошибка запуска интерактивной генерации:', error);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось запустить интерактивную генерацию'
      });
      navigate('/');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const currentGameId = gameId || new URLSearchParams(location.search).get('gameId');
    
    if (socket && currentGameId) {
      // Подписываемся на события интерактивной генерации
      socket.emit('interactive:subscribe', currentGameId);

      // Обработчики событий
      socket.on('interactive:state', handleStateUpdate);
      socket.on('interactive:step:started', handleStepStarted);
      socket.on('interactive:variants:generating', handleVariantsGenerating);
      socket.on('interactive:variants:generated', handleVariantsGenerated);
      socket.on('interactive:step:completed', handleStepCompleted);
      socket.on('interactive:generation:completed', handleGenerationCompleted);
      socket.on('interactive:error', handleError);

      return () => {
        socket.off('interactive:state');
        socket.off('interactive:step:started');
        socket.off('interactive:variants:generating');
        socket.off('interactive:variants:generated');
        socket.off('interactive:step:completed');
        socket.off('interactive:generation:completed');
        socket.off('interactive:error');
      };
    }
  }, [socket, gameId, location.search]);

  const loadInteractiveState = async () => {
    try {
      const response = await api.get(`/interactive/${gameId}/state`);
      setState(response.data.data);
      
      if (response.data.data.step) {
        loadGuidelines(response.data.data.step.stepId, response.data.data.step.type);
      }
    } catch (error) {
      console.error('Ошибка загрузки состояния:', error);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось загрузить состояние интерактивной генерации'
      });
    }
  };

  const loadGuidelines = async (stepId: string, stepType: string) => {
    try {
      const currentGameId = gameId || new URLSearchParams(location.search).get('gameId');
      const response = await api.get(`/interactive/${currentGameId}/step/${stepId}/guidelines`);
      setGuidelines(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций:', error);
    }
  };

  const handleStateUpdate = (newState: InteractiveState) => {
    setState(newState);
  };

  const handleStepStarted = (stepData: any) => {
    setState(prevState => prevState ? {
      ...prevState,
      step: stepData,
      currentStep: stepData.currentStep
    } : null);
    
    if (stepData.stepId && stepData.type) {
      loadGuidelines(stepData.stepId, stepData.type);
    }
  };

  const handleVariantsGenerating = () => {
    setIsGenerating(true);
  };

  const handleVariantsGenerated = (stepData: any) => {
    setIsGenerating(false);
    setState(prevState => prevState ? {
      ...prevState,
      step: stepData
    } : null);
  };

  const handleStepCompleted = (stepData: any) => {
    setState(prevState => prevState ? {
      ...prevState,
      step: stepData,
      completedSteps: prevState.completedSteps + 1
    } : null);
  };

  const handleGenerationCompleted = (gameData: any) => {
    setFinalGamePath(gameData.gamePath);
    notification.success({
      message: 'Игра готова!',
      description: 'Интерактивная генерация успешно завершена'
    });
  };

  const handleError = (error: any) => {
    notification.error({
      message: 'Ошибка генерации',
      description: error.message || 'Произошла ошибка в процессе генерации'
    });
  };

  const handleSelectVariant = async (variantId: string, customPrompt?: string) => {
    if (!state) return;

    try {
      await api.post(`/interactive/${state.gameId}/step/${state.step.stepId}/select`, {
        variantId,
        customPrompt
      });
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось выбрать вариант'
      });
    }
  };

  const handleGenerateMore = async (count: number, customPrompt?: string) => {
    if (!state) return;

    try {
      setIsGenerating(true);
      await api.post(`/interactive/${state.gameId}/step/${state.step.stepId}/variants`, {
        count,
        customPrompt
      });
    } catch (error) {
      setIsGenerating(false);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось сгенерировать варианты'
      });
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!state) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/interactive/${state.gameId}/step/${state.step.stepId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Добавляем загруженный файл как вариант
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          step: {
            ...prev.step,
            variants: [...prev.step.variants, response.data.data]
          }
        };
      });

      notification.success({
        message: 'Файл загружен',
        description: 'Файл успешно загружен и добавлен как вариант'
      });
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось загрузить файл'
      });
    }
  };

  const handlePreviewVariant = (variant: any) => {
    setPreviewVariant(variant);
    setShowPreviewModal(true);
  };

  const handlePauseGeneration = async () => {
    try {
      await api.post(`/interactive/${state?.gameId}/pause`, {
        reason: 'Пользователь приостановил генерацию'
      });
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось приостановить генерацию'
      });
    }
  };

  const handleResumeGeneration = async () => {
    try {
      await api.post(`/interactive/${state?.gameId}/resume`);
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось возобновить генерацию'
      });
    }
  };

  const handleCompleteGeneration = async () => {
    try {
      setIsCompleting(true);
      await api.post(`/interactive/${state?.gameId}/complete`);
    } catch (error) {
      setIsCompleting(false);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось завершить генерацию'
      });
    }
  };

  const handleDownloadGame = () => {
    if (finalGamePath) {
      window.open(finalGamePath, '_blank');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center">
          <Spin size="large" />
          <Title level={4} className="mt-4">Запускаем интерактивную генерацию</Title>
          <Paragraph>Подготавливаем персонализированный процесс создания игры...</Paragraph>
        </Card>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <div className="text-center">
            <Title level={4}>Загрузка...</Title>
            <Paragraph>Загружаем состояние интерактивной генерации</Paragraph>
          </div>
        </Card>
      </div>
    );
  }

  if (finalGamePath) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="success"
          title="Игра готова!"
          subTitle="Интерактивная генерация завершена. Ваша уникальная игра готова к скачиванию."
          extra={[
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              size="large"
              onClick={handleDownloadGame}
            >
              Скачать игру
            </Button>,
            <Button
              key="home"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хлебные крошки */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb>
            <Breadcrumb.Item href="/">
              <HomeOutlined />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Интерактивная генерация</Breadcrumb.Item>
            <Breadcrumb.Item>Игра {gameId?.slice(0, 8)}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
      </div>

      {/* Заголовок и прогресс */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <Title level={2}>Интерактивная генерация игры</Title>
          <Paragraph className="text-lg text-gray-600">
            Пройдите через все этапы создания игры, выбирая варианты на каждом шаге
          </Paragraph>
          
          <div className="flex items-center justify-center space-x-4 mt-4">
            <Progress
              percent={Math.round((state.completedSteps / state.totalSteps) * 100)}
              showInfo={false}
              strokeColor="#1890ff"
              className="w-64"
            />
            <span className="text-sm text-gray-600">
              {state.completedSteps} из {state.totalSteps} этапов
            </span>
          </div>
        </div>

        {/* Этапы */}
        <div className="mb-8">
          <Steps current={state.currentStep} size="small">
            {Array.from({ length: state.totalSteps }, (_, index) => (
              <Step
                key={index}
                title={index < state.completedSteps ? 'Завершено' : 
                       index === state.currentStep ? state.step.name : 
                       'Ожидание'}
                status={index < state.completedSteps ? 'finish' :
                        index === state.currentStep ? 'process' : 'wait'}
              />
            ))}
          </Steps>
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Боковая панель */}
          <div className="lg:col-span-1">
            <Card title="Управление" className="mb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Статус:</span>
                  <Tag color={state.isActive ? 'green' : 'orange'}>
                    {state.isActive ? 'Активно' : 'Приостановлено'}
                  </Tag>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Соединение:</span>
                  <Tag color={isConnected ? 'green' : 'red'}>
                    {isConnected ? 'Подключено' : 'Отключено'}
                  </Tag>
                </div>

                <div className="border-t pt-3">
                  {state.isActive ? (
                    <Button
                      icon={<PauseCircleOutlined />}
                      onClick={handlePauseGeneration}
                      block
                    >
                      Приостановить
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleResumeGeneration}
                      block
                    >
                      Продолжить
                    </Button>
                  )}
                </div>

                {state.completedSteps === state.totalSteps && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleCompleteGeneration}
                    loading={isCompleting}
                    block
                    size="large"
                  >
                    Завершить создание
                  </Button>
                )}
              </div>
            </Card>

            {/* Информация о текущем этапе */}
            <Card title="Текущий этап" size="small">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Название:</span>
                  <p className="text-sm text-gray-900">{state.step.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Описание:</span>
                  <p className="text-sm text-gray-600">{state.step.description}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Вариантов:</span>
                  <p className="text-sm text-gray-900">{state.step.variants.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Основная область */}
          <div className="lg:col-span-3">
            <VariantSelector
              variants={state.step.variants}
              selectedVariantId={state.step.selectedVariant}
              stepType={state.step.type}
              stepName={state.step.name}
              isGenerating={isGenerating}
              guidelines={guidelines || {}}
              onSelectVariant={handleSelectVariant}
              onGenerateMore={handleGenerateMore}
              onUploadFile={handleUploadFile}
              onPreviewVariant={handlePreviewVariant}
            />
          </div>
        </div>
      </div>

      {/* Модал предварительного просмотра */}
      <Modal
        title="Предварительный просмотр"
        open={showPreviewModal}
        onCancel={() => setShowPreviewModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowPreviewModal(false)}>
            Закрыть
          </Button>,
          <Button
            key="select"
            type="primary"
            onClick={() => {
              if (previewVariant) {
                handleSelectVariant(previewVariant.id);
                setShowPreviewModal(false);
              }
            }}
          >
            Выбрать этот вариант
          </Button>
        ]}
        width={800}
      >
        {previewVariant && (
          <div className="space-y-4">
            {previewVariant.preview && (
              <div className="text-center">
                <img
                  src={previewVariant.preview}
                  alt="Превью"
                  className="max-w-full h-auto rounded"
                />
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Детали:</h4>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(previewVariant.content, null, 2)}
              </pre>
            </div>

            {previewVariant.metadata && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Метаданные:</h4>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(previewVariant.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InteractiveGeneration; 