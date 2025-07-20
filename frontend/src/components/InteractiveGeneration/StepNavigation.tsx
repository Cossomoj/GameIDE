import React, { useState } from 'react';
import {
  Steps,
  Button,
  Modal,
  Card,
  Typography,
  Progress,
  Space,
  Tooltip,
  Alert,
  Breadcrumb,
  Tag,
  Divider,
  Timeline
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  FastBackwardOutlined,
  FastForwardOutlined
} from '@ant-design/icons';
import { ChevronLeft, ChevronRight, Home, Edit, Check, AlertTriangle, Eye, History, SkipBack, SkipForward } from 'lucide-react';

const { Step } = Steps;
const { Title, Paragraph, Text } = Typography;
const { confirm } = Modal;

interface NavigationStep {
  stepId: string;
  stepIndex: number;
  name: string;
  description: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  isSkippable: boolean;
  completedAt?: Date;
  selectedVariantId?: string;
  canEdit: boolean;
}

interface StepNavigationProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  totalSteps: number;
  onNavigateToStep: (stepIndex: number) => void;
  onGoBack: () => void;
  onGoNext: () => void;
  onSkipStep: () => void;
  onViewPreview: () => void;
  onGoHome: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  showPreview: boolean;
  progressPercent: number;
  gameTitle: string;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  steps,
  currentStepIndex,
  totalSteps,
  onNavigateToStep,
  onGoBack,
  onGoNext,
  onSkipStep,
  onViewPreview,
  onGoHome,
  canGoBack,
  canGoNext,
  canSkip,
  showPreview,
  progressPercent,
  gameTitle
}) => {
  const [showStepHistory, setShowStepHistory] = useState(false);
  const [showNavigationHelp, setShowNavigationHelp] = useState(false);

  const currentStep = steps[currentStepIndex];

  const handleNavigateToStep = (targetIndex: number) => {
    if (targetIndex === currentStepIndex) return;

    const targetStep = steps[targetIndex];
    
    // Проверяем, можно ли перейти к этому этапу
    if (targetStep.status === 'pending' && targetIndex > currentStepIndex) {
      Modal.warning({
        title: 'Невозможно перейти к этому этапу',
        content: 'Сначала завершите текущий этап.',
      });
      return;
    }

    // Если переходим к предыдущему этапу, показываем предупреждение
    if (targetIndex < currentStepIndex && currentStep.status === 'in_progress') {
      confirm({
        title: 'Вернуться к предыдущему этапу?',
        content: 'Текущий прогресс на этом этапе будет сохранен, но вы потеряете несохраненные изменения.',
        okText: 'Да, вернуться',
        cancelText: 'Отмена',
        onOk: () => onNavigateToStep(targetIndex),
      });
    } else {
      onNavigateToStep(targetIndex);
    }
  };

  const handleSkipStep = () => {
    if (!canSkip) return;

    confirm({
      title: 'Пропустить этот этап?',
      content: 'Для пропущенного этапа будет использован вариант по умолчанию. Вы сможете вернуться и изменить его позже.',
      okText: 'Да, пропустить',
      cancelText: 'Отмена',
      onOk: onSkipStep,
    });
  };

  const handleGoHome = () => {
    confirm({
      title: 'Вернуться на главную?',
      content: 'Ваш прогресс будет сохранен, и вы сможете продолжить позже.',
      okText: 'Да, на главную',
      cancelText: 'Отмена',
      onOk: onGoHome,
    });
  };

  const getStepIcon = (step: NavigationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'in_progress':
        return <EditOutlined className="text-blue-500" />;
      case 'skipped':
        return <FastForwardOutlined className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getStepStatus = (step: NavigationStep) => {
    switch (step.status) {
      case 'completed':
        return 'finish';
      case 'in_progress':
        return 'process';
      case 'skipped':
        return 'error';
      default:
        return 'wait';
    }
  };

  const renderStepHistory = () => (
    <Modal
      title="История этапов"
      visible={showStepHistory}
      onCancel={() => setShowStepHistory(false)}
      width={600}
      footer={[
        <Button key="close" onClick={() => setShowStepHistory(false)}>
          Закрыть
        </Button>
      ]}
    >
      <Timeline>
        {steps.map((step, index) => (
          <Timeline.Item
            key={step.stepId}
            color={
              step.status === 'completed' ? 'green' :
              step.status === 'in_progress' ? 'blue' :
              step.status === 'skipped' ? 'orange' : 'gray'
            }
            dot={getStepIcon(step)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Text strong>{step.name}</Text>
                  <Tag color={
                    step.status === 'completed' ? 'green' :
                    step.status === 'in_progress' ? 'blue' :
                    step.status === 'skipped' ? 'orange' : 'default'
                  }>
                    {step.status === 'completed' ? 'Завершен' :
                     step.status === 'in_progress' ? 'В процессе' :
                     step.status === 'skipped' ? 'Пропущен' : 'Ожидает'}
                  </Tag>
                </div>
                <Text type="secondary" className="text-sm">
                  {step.description}
                </Text>
                {step.completedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Завершен: {step.completedAt.toLocaleString()}
                  </div>
                )}
              </div>
              {step.canEdit && step.status !== 'pending' && (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setShowStepHistory(false);
                    handleNavigateToStep(index);
                  }}
                >
                  Изменить
                </Button>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </Modal>
  );

  const renderNavigationHelp = () => (
    <Modal
      title="Навигация по этапам"
      visible={showNavigationHelp}
      onCancel={() => setShowNavigationHelp(false)}
      width={500}
      footer={[
        <Button key="close" type="primary" onClick={() => setShowNavigationHelp(false)}>
          Понятно
        </Button>
      ]}
    >
      <div className="space-y-4">
        <Alert
          message="Как перемещаться между этапами"
          type="info"
          showIcon
        />
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ArrowLeftOutlined className="text-blue-600" />
            </div>
            <div>
              <Text strong>Назад</Text>
              <br />
              <Text type="secondary" className="text-sm">
                Вернуться к предыдущему этапу для изменений
              </Text>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <ArrowRightOutlined className="text-green-600" />
            </div>
            <div>
              <Text strong>Далее</Text>
              <br />
              <Text type="secondary" className="text-sm">
                Перейти к следующему этапу после выбора варианта
              </Text>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <FastForwardOutlined className="text-orange-600" />
            </div>
            <div>
              <Text strong>Пропустить</Text>
              <br />
              <Text type="secondary" className="text-sm">
                Использовать вариант по умолчанию (доступно не для всех этапов)
              </Text>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <EyeOutlined className="text-purple-600" />
            </div>
            <div>
              <Text strong>Предварительный просмотр</Text>
              <br />
              <Text type="secondary" className="text-sm">
                Посмотреть, как будет выглядеть готовая игра
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="bg-white border-b sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-3 border-b">
        <Breadcrumb>
          <Breadcrumb.Item>
            <Button 
              type="link" 
              icon={<HomeOutlined />} 
              onClick={handleGoHome}
              className="p-0"
            >
              Главная
            </Button>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Text type="secondary">Интерактивная генерация</Text>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Text strong>{gameTitle}</Text>
          </Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Title level={4} className="m-0">
              {currentStep.name}
            </Title>
            <Text type="secondary" className="text-sm">
              Этап {currentStepIndex + 1} из {totalSteps}
            </Text>
          </div>
          
          <div className="flex items-center space-x-2">
            <Text type="secondary" className="text-sm">
              {Math.round(progressPercent)}% завершено
            </Text>
            <div className="w-24">
              <Progress 
                percent={progressPercent} 
                showInfo={false} 
                strokeColor="#3b82f6"
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <Steps 
          current={currentStepIndex} 
          size="small"
          className="mb-4"
          onChange={handleNavigateToStep}
        >
          {steps.map((step, index) => (
            <Step
              key={step.stepId}
              title={step.name}
              description={step.type}
              status={getStepStatus(step)}
              icon={getStepIcon(step)}
              disabled={step.status === 'pending' && index > currentStepIndex}
            />
          ))}
        </Steps>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onGoBack}
              disabled={!canGoBack}
            >
              Назад
            </Button>

            {canSkip && (
              <Tooltip title="Использовать вариант по умолчанию">
                <Button
                  icon={<FastForwardOutlined />}
                  onClick={handleSkipStep}
                  disabled={!currentStep.isSkippable}
                >
                  Пропустить
                </Button>
              </Tooltip>
            )}

            <Button
              icon={<HistoryOutlined />}
              onClick={() => setShowStepHistory(true)}
              ghost
            >
              История
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {showPreview && (
              <Button
                icon={<EyeOutlined />}
                onClick={onViewPreview}
                type="dashed"
              >
                Предварительный просмотр
              </Button>
            )}

            <Button
              icon={<ExclamationCircleOutlined />}
              onClick={() => setShowNavigationHelp(true)}
              ghost
              size="small"
            >
              Помощь
            </Button>

            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={onGoNext}
              disabled={!canGoNext}
            >
              {currentStepIndex === totalSteps - 1 ? 'Завершить' : 'Далее'}
            </Button>
          </div>
        </div>

        {/* Current Step Info */}
        {currentStep.status === 'in_progress' && (
          <Alert
            message={`Этап: ${currentStep.name}`}
            description={currentStep.description}
            type="info"
            showIcon
            className="mt-4"
            action={
              <Space direction="vertical" size="small">
                {currentStep.isSkippable && (
                  <Button size="small" type="text" onClick={handleSkipStep}>
                    Пропустить этап
                  </Button>
                )}
                <Button size="small" type="text" onClick={() => setShowNavigationHelp(true)}>
                  Нужна помощь?
                </Button>
              </Space>
            }
          />
        )}
      </div>

      {/* Modals */}
      {renderStepHistory()}
      {renderNavigationHelp()}
    </div>
  );
};

export default StepNavigation; 