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
import { apiClient } from '../services/api';
import { Variant, Step as InteractiveStepType, GameState } from '../types/interactive';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Download
} from 'lucide-react';

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

// Типы импортированы из '../types/interactive'

const InteractiveGeneration: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (gameId) {
      loadGameState();
    }
  }, [gameId]);

     const loadGameState = async () => {
     try {
       setIsLoading(true);
       const response = await apiClient.getInteractiveState(gameId!);
       setGameState(response.data);
     } catch (error) {
       console.error('Ошибка загрузки состояния:', error);
     } finally {
       setIsLoading(false);
     }
   };

  const handleVariantSelect = async (variantId: string) => {
    if (!gameState) return;

    try {
      setIsSelecting(true);
      setSelectedVariant(variantId);

             const response = await apiClient.selectVariant(
         gameState.gameId,
         gameState.step.stepId,
         variantId
       );

      if (response.data.nextStep) {
        // Есть следующий этап
        setGameState(prev => prev ? {
          ...prev,
          currentStep: prev.currentStep + 1,
          step: response.data.nextStep,
          completedSteps: prev.completedSteps + 1
        } : null);
        setSelectedVariant('');
      } else {
        // Это был последний этап, завершаем генерацию
        await completeGeneration();
      }
    } catch (error) {
      console.error('Ошибка выбора варианта:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const completeGeneration = async () => {
    if (!gameState) return;

         try {
       const response = await apiClient.completeInteractiveGeneration(gameState.gameId);
       setIsCompleted(true);
     } catch (error) {
       console.error('Ошибка завершения генерации:', error);
     }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Загрузка интерактивной генерации...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Игра не найдена</h1>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Игра создана!
          </h1>
          <p className="text-gray-600 mb-6">
            Ваша игра готова! Теперь вы можете скачать её и опубликовать.
          </p>
          <div className="space-y-3">
            <button className="btn-primary w-full">
              <Download className="h-4 w-4 mr-2" />
              Скачать игру
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary w-full"
            >
              Создать новую игру
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((gameState.completedSteps) / gameState.totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Хедер */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Вернуться на главную
            </button>
            <div className="text-sm text-gray-500">
              Этап {gameState.currentStep + 1} из {gameState.totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* Прогресс */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Прогресс создания игры
            </span>
            <span className="text-sm text-gray-500">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Заголовок этапа */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {gameState.step.name}
            </h1>
            <p className="text-lg text-gray-600">
              {gameState.step.description}
            </p>
          </div>

          {/* Варианты */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Выберите один из вариантов:
            </h2>
            
            <div className="grid gap-4">
              {gameState.step.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant.id)}
                  disabled={isSelecting}
                  className={`text-left p-6 border-2 rounded-lg transition-all hover:shadow-lg ${
                    selectedVariant === variant.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300'
                  } ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {variant.title}
                      </h3>
                      <p className="text-gray-600">
                        {variant.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0 ml-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Статус */}
          {isSelecting && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-800 rounded-full">
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Обработка вашего выбора...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveGeneration; 