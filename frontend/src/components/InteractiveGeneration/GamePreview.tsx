import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Button,
  Tabs,
  Tag,
  Typography,
  Row,
  Col,
  Image,
  Divider,
  Space,
  Tooltip,
  Progress,
  Alert,
  Badge,
  Timeline,
  Descriptions,
  Spin
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  EditOutlined,
  PlayCircleOutlined,
  ShareAltOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  BugOutlined,
  MobileOutlined,
  DesktopOutlined,
  ChromeOutlined
} from '@ant-design/icons';
import { Play, Download, Share2, Settings, Eye, Star, Smartphone, Monitor, Globe } from 'lucide-react';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface GamePreviewData {
  gameId: string;
  title: string;
  description: string;
  genre: string;
  completedSteps: Array<{
    stepId: string;
    stepType: string;
    stepName: string;
    selectedVariant: {
      id: string;
      content: any;
      preview?: string;
    };
  }>;
  gameStructure: {
    character?: any;
    mechanics?: any;
    levels?: any[];
    graphics?: any;
    sounds?: any;
    ui?: any;
    story?: any;
  };
  technicalInfo: {
    estimatedSize: string;
    platforms: string[];
    buildTime: string;
    complexity: 'simple' | 'medium' | 'complex';
  };
  projectMetrics: {
    totalSteps: number;
    completedSteps: number;
    qualityScore: number;
    innovation: number;
    marketability: number;
  };
}

interface GamePreviewProps {
  visible: boolean;
  gameData: GamePreviewData;
  onClose: () => void;
  onStartGeneration: () => void;
  onEditStep: (stepId: string) => void;
  onSharePreview: () => void;
  isLoading?: boolean;
}

const GamePreview: React.FC<GamePreviewProps> = ({
  visible,
  gameData,
  onClose,
  onStartGeneration,
  onEditStep,
  onSharePreview,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'web'>('desktop');

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Заголовок игры */}
      <Card className="text-center bg-gradient-to-r from-blue-50 to-purple-50 border-0">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <PlayCircleOutlined className="text-2xl text-blue-600" />
          </div>
          <Title level={2} className="mb-2">{gameData.title}</Title>
          <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
            {gameData.description}
          </Paragraph>
          <div className="flex justify-center space-x-2">
            <Tag color="blue" className="px-3 py-1">
              {gameData.genre}
            </Tag>
            <Tag color="green" className="px-3 py-1">
              {gameData.technicalInfo.complexity === 'simple' ? 'Простая' : 
               gameData.technicalInfo.complexity === 'medium' ? 'Средняя' : 
               'Сложная'} сложность
            </Tag>
          </div>
        </div>
      </Card>

      {/* Метрики проекта */}
      <Card title="Анализ проекта" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round(gameData.projectMetrics.qualityScore * 100)}%
              </div>
              <div className="text-sm text-gray-600">Качество</div>
              <Progress 
                percent={gameData.projectMetrics.qualityScore * 100} 
                showInfo={false} 
                strokeColor="#3b82f6"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round(gameData.projectMetrics.innovation * 100)}%
              </div>
              <div className="text-sm text-gray-600">Инновации</div>
              <Progress 
                percent={gameData.projectMetrics.innovation * 100} 
                showInfo={false} 
                strokeColor="#8b5cf6"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {Math.round(gameData.projectMetrics.marketability * 100)}%
              </div>
              <div className="text-sm text-gray-600">Рыночность</div>
              <Progress 
                percent={gameData.projectMetrics.marketability * 100} 
                showInfo={false} 
                strokeColor="#10b981"
                size="small"
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {gameData.projectMetrics.completedSteps}/{gameData.projectMetrics.totalSteps}
              </div>
              <div className="text-sm text-gray-600">Этапы</div>
              <Progress 
                percent={(gameData.projectMetrics.completedSteps / gameData.projectMetrics.totalSteps) * 100} 
                showInfo={false} 
                strokeColor="#f59e0b"
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Компоненты игры */}
      <Card title="Компоненты игры">
        <Row gutter={[16, 16]}>
          {gameData.completedSteps.map((step, index) => (
            <Col xs={24} sm={12} md={8} key={step.stepId}>
              <Card 
                size="small" 
                className="h-full hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onEditStep(step.stepId)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Badge count={index + 1} size="small" className="mb-2">
                      <Title level={5} className="m-0">{step.stepName}</Title>
                    </Badge>
                  </div>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStep(step.stepId);
                    }}
                  />
                </div>
                
                {step.selectedVariant.preview && (
                  <div className="mb-3">
                    <Image
                      src={step.selectedVariant.preview}
                      alt={step.stepName}
                      className="w-full rounded"
                      height={80}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  {this.renderStepSummary(step.stepType, step.selectedVariant.content)}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Техническая информация */}
      <Card title="Техническая информация">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Размер игры">
            {gameData.technicalInfo.estimatedSize}
          </Descriptions.Item>
          <Descriptions.Item label="Время сборки">
            {gameData.technicalInfo.buildTime}
          </Descriptions.Item>
          <Descriptions.Item label="Платформы">
            <Space size="small">
              {gameData.technicalInfo.platforms.map(platform => (
                <Tag key={platform} className="flex items-center">
                  {platform === 'mobile' && <Smartphone className="w-3 h-3 mr-1" />}
                  {platform === 'desktop' && <Monitor className="w-3 h-3 mr-1" />}
                  {platform === 'web' && <Globe className="w-3 h-3 mr-1" />}
                  {platform}
                </Tag>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Сложность">
            <Tag color={
              gameData.technicalInfo.complexity === 'simple' ? 'green' :
              gameData.technicalInfo.complexity === 'medium' ? 'orange' : 'red'
            }>
              {gameData.technicalInfo.complexity === 'simple' ? 'Простая' :
               gameData.technicalInfo.complexity === 'medium' ? 'Средняя' : 'Сложная'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      {/* Выбор устройства */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="m-0">Предварительный просмотр</Title>
          <Space>
            <Button.Group>
              <Button 
                type={previewMode === 'desktop' ? 'primary' : 'default'}
                icon={<DesktopOutlined />}
                onClick={() => setPreviewMode('desktop')}
              >
                Десктоп
              </Button>
              <Button 
                type={previewMode === 'mobile' ? 'primary' : 'default'}
                icon={<MobileOutlined />}
                onClick={() => setPreviewMode('mobile')}
              >
                Мобильный
              </Button>
              <Button 
                type={previewMode === 'web' ? 'primary' : 'default'}
                icon={<ChromeOutlined />}
                onClick={() => setPreviewMode('web')}
              >
                Веб
              </Button>
            </Button.Group>
          </Space>
        </div>

        {/* Mockup устройства */}
        <div className="flex justify-center">
          <div className={`
            ${previewMode === 'mobile' ? 'w-80 h-96' : 'w-full h-96'}
            ${previewMode === 'mobile' ? 'border-8 border-gray-800 rounded-3xl' : 'border border-gray-300 rounded-lg'}
            bg-gray-100 flex items-center justify-center relative overflow-hidden
          `}>
            {/* Симуляция игры */}
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 animate-pulse"></div>
              <Title level={4} className="text-gray-600">
                {gameData.title}
              </Title>
              <Paragraph className="text-gray-500 text-sm">
                Интерактивный просмотр будет доступен после генерации
              </Paragraph>
              
              {/* Мок элементов игры */}
              <div className="mt-6 space-y-2">
                {gameData.gameStructure.character && (
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Персонаж: {gameData.gameStructure.character.name || 'Готов'}
                  </div>
                )}
                {gameData.gameStructure.mechanics && (
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Механики: Настроены
                  </div>
                )}
                {gameData.gameStructure.levels && (
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Уровни: {gameData.gameStructure.levels.length} шт.
                  </div>
                )}
              </div>
            </div>

            {/* Оверлей для мобильной версии */}
            {previewMode === 'mobile' && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full"></div>
            )}
          </div>
        </div>

        <Alert
          message="Интерактивный просмотр"
          description="После генерации игры вы сможете протестировать её прямо в браузере на разных устройствах."
          type="info"
          showIcon
          className="mt-4"
        />
      </Card>
    </div>
  );

  const renderTimelineTab = () => (
    <div className="space-y-6">
      <Card title="История создания">
        <Timeline>
          {gameData.completedSteps.map((step, index) => (
            <Timeline.Item
              key={step.stepId}
              color="green"
              dot={<CheckCircleOutlined className="text-green-500" />}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Title level={5} className="mb-1">{step.stepName}</Title>
                  <Paragraph className="text-gray-600 mb-2">
                    Выбран вариант: {step.selectedVariant.id}
                  </Paragraph>
                  <div className="text-sm text-gray-500">
                    {this.renderStepSummary(step.stepType, step.selectedVariant.content)}
                  </div>
                </div>
                <Button 
                  type="link" 
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEditStep(step.stepId)}
                >
                  Изменить
                </Button>
              </div>
            </Timeline.Item>
          ))}
          
          <Timeline.Item
            color="blue"
            dot={<ClockCircleOutlined className="text-blue-500" />}
          >
            <div>
              <Title level={5} className="mb-1">Генерация игры</Title>
              <Paragraph className="text-gray-600">
                Финальная сборка игры на основе выбранных вариантов
              </Paragraph>
            </div>
          </Timeline.Item>
        </Timeline>
      </Card>
    </div>
  );

  const renderStepSummary = (stepType: string, content: any) => {
    switch (stepType) {
      case 'character':
        return `${content.name || 'Персонаж'} - ${content.description || 'описание недоступно'}`;
      case 'mechanics':
        return `Основной цикл: ${content.coreLoop || 'не указан'}`;
      case 'levels':
        return `Тема: ${content.theme || 'не указана'}, размер: ${content.size?.width}x${content.size?.height}`;
      case 'graphics':
        return `Стиль: ${content.artStyle || 'не указан'}, настроение: ${content.mood || 'не указано'}`;
      case 'sounds':
        return `Стиль: ${content.style || 'не указан'}, темп: ${content.tempo || 'не указан'}`;
      case 'ui':
        return `Стиль: ${content.style || 'не указан'}, схема: ${content.colorScheme || 'не указана'}`;
      default:
        return 'Конфигурация завершена';
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2">
          <EyeOutlined className="text-blue-500" />
          <span>Предварительный просмотр игры</span>
        </div>
      }
      visible={visible}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      footer={
        <div className="flex justify-between">
          <div className="space-x-2">
            <Button 
              icon={<ShareAltOutlined />} 
              onClick={onSharePreview}
            >
              Поделиться
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => {
                // Логика экспорта конфигурации
                const configData = JSON.stringify(gameData, null, 2);
                const blob = new Blob([configData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${gameData.title}_config.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Экспорт конфигурации
            </Button>
          </div>
          <div className="space-x-2">
            <Button onClick={onClose}>
              Продолжить редактирование
            </Button>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={onStartGeneration}
              loading={isLoading}
              size="large"
            >
              Создать игру
            </Button>
          </div>
        </div>
      }
    >
      <Spin spinning={isLoading} tip="Подготовка данных...">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <EyeOutlined />
                Обзор
              </span>
            } 
            key="overview"
          >
            {renderOverviewTab()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <PlayCircleOutlined />
                Просмотр
              </span>
            } 
            key="preview"
          >
            {renderPreviewTab()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined />
                История
              </span>
            } 
            key="timeline"
          >
            {renderTimelineTab()}
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
};

export default GamePreview; 