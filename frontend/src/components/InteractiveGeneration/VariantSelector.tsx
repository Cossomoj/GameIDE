import React, { useState, useRef } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  Input, 
  Upload, 
  message, 
  Tooltip, 
  Badge,
  Tag,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  UploadOutlined, 
  EditOutlined, 
  CheckOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

interface GenerationVariant {
  id: string;
  type: 'ai_generated' | 'user_uploaded' | 'user_prompt';
  content: any;
  preview?: string;
  metadata?: {
    prompt?: string;
    style?: string;
    filename?: string;
    size?: number;
    dimensions?: { width: number; height: number };
  };
}

interface VariantSelectorProps {
  variants: GenerationVariant[];
  selectedVariantId?: string;
  stepType: string;
  stepName: string;
  isGenerating: boolean;
  guidelines: {
    fileUpload?: {
      acceptedFormats: string[];
      maxSizeBytes: number;
      dimensions?: {
        min: { width: number; height: number };
        max: { width: number; height: number };
        recommended: { width: number; height: number };
      };
      description: string;
      examples: string[];
    };
    customPrompt?: {
      placeholder: string;
      examples: string[];
      tips: string[];
    };
  };
  onSelectVariant: (variantId: string, customPrompt?: string) => void;
  onGenerateMore: (count: number, customPrompt?: string) => void;
  onUploadFile: (file: File) => void;
  onPreviewVariant: (variant: GenerationVariant) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  stepType,
  stepName,
  isGenerating,
  guidelines,
  onSelectVariant,
  onGenerateMore,
  onUploadFile,
  onPreviewVariant
}) => {
  const [isPromptModalVisible, setIsPromptModalVisible] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generateCount, setGenerateCount] = useState(5);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectVariant = (variantId: string) => {
    if (selectedVariantId === variantId) return;
    onSelectVariant(variantId);
  };

  const handleGenerateWithPrompt = () => {
    if (!customPrompt.trim()) {
      message.error('Введите описание для генерации');
      return;
    }
    onGenerateMore(generateCount, customPrompt);
    setIsPromptModalVisible(false);
    setCustomPrompt('');
  };

  const handleFileUpload = (file: File) => {
    // Проверяем размер файла
    if (guidelines.fileUpload && file.size > guidelines.fileUpload.maxSizeBytes) {
      message.error(`Файл слишком большой. Максимальный размер: ${Math.round(guidelines.fileUpload.maxSizeBytes / 1024 / 1024)}MB`);
      return;
    }

    // Проверяем тип файла
    if (guidelines.fileUpload && !guidelines.fileUpload.acceptedFormats.includes(file.type)) {
      message.error(`Неподдерживаемый тип файла. Разрешенные форматы: ${guidelines.fileUpload.acceptedFormats.join(', ')}`);
      return;
    }

    onUploadFile(file);
    setUploadModalVisible(false);
  };

  const renderVariantContent = (variant: GenerationVariant) => {
    switch (variant.type) {
      case 'ai_generated':
        return (
          <div className="space-y-2">
            {variant.content.name && (
              <h4 className="font-medium text-gray-900">{variant.content.name}</h4>
            )}
            {variant.content.description && (
              <p className="text-sm text-gray-600">{variant.content.description}</p>
            )}
            {stepType === 'character' && variant.content.abilities && (
              <div className="flex flex-wrap gap-1">
                {variant.content.abilities.map((ability: string, index: number) => (
                  <Tag key={index} color="blue" size="small">{ability}</Tag>
                ))}
              </div>
            )}
            {stepType === 'graphics' && variant.content.colorPalette && (
              <div className="flex space-x-1">
                {variant.content.colorPalette.map((color: string, index: number) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'user_uploaded':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <UploadOutlined className="text-green-600" />
              <span className="text-sm font-medium">Загруженный файл</span>
            </div>
            {variant.metadata?.filename && (
              <p className="text-sm text-gray-600">{variant.metadata.filename}</p>
            )}
            {variant.metadata?.size && (
              <p className="text-xs text-gray-500">
                Размер: {Math.round(variant.metadata.size / 1024)}KB
              </p>
            )}
          </div>
        );

      case 'user_prompt':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <EditOutlined className="text-purple-600" />
              <span className="text-sm font-medium">Пользовательский промпт</span>
            </div>
            <p className="text-sm text-gray-600 italic">
              "{variant.metadata?.prompt}"
            </p>
          </div>
        );

      default:
        return <div className="text-gray-500">Неизвестный тип варианта</div>;
    }
  };

  const getVariantTypeColor = (type: string) => {
    switch (type) {
      case 'ai_generated': return 'blue';
      case 'user_uploaded': return 'green';
      case 'user_prompt': return 'purple';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок этапа */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{stepName}</h2>
        <p className="text-gray-600">Выберите один из предложенных вариантов или создайте свой</p>
      </div>

      {/* Сетка вариантов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variants.map((variant) => (
          <Card
            key={variant.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedVariantId === variant.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSelectVariant(variant.id)}
            actions={[
              <Tooltip title="Предварительный просмотр">
                <Button 
                  type="text" 
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewVariant(variant);
                  }}
                />
              </Tooltip>,
              selectedVariantId === variant.id ? (
                <CheckOutlined className="text-green-600" />
              ) : (
                <div />
              )
            ]}
          >
            <Badge.Ribbon 
              text={variant.type === 'ai_generated' ? 'ИИ' : variant.type === 'user_uploaded' ? 'Файл' : 'Промпт'}
              color={getVariantTypeColor(variant.type)}
            >
              <div className="min-h-[120px]">
                {variant.preview && (
                  <div className="mb-3">
                    <img
                      src={variant.preview}
                      alt="Превью"
                      className="w-full h-24 object-cover rounded"
                    />
                  </div>
                )}
                {renderVariantContent(variant)}
              </div>
            </Badge.Ribbon>
          </Card>
        ))}

        {/* Кнопки добавления новых вариантов */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <div className="flex flex-col items-center justify-center min-h-[120px] space-y-3">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => onGenerateMore(5)}
              loading={isGenerating}
              className="w-full"
            >
              Еще 5 вариантов
            </Button>

            {guidelines.customPrompt && (
              <Button
                icon={<EditOutlined />}
                onClick={() => setIsPromptModalVisible(true)}
                disabled={isGenerating}
                className="w-full"
              >
                Свой промпт
              </Button>
            )}

            {guidelines.fileUpload && (
              <Button
                icon={<UploadOutlined />}
                onClick={() => setUploadModalVisible(true)}
                disabled={isGenerating}
                className="w-full"
              >
                Загрузить файл
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Модал для кастомного промпта */}
      <Modal
        title="Создать вариант по описанию"
        open={isPromptModalVisible}
        onCancel={() => {
          setIsPromptModalVisible(false);
          setCustomPrompt('');
        }}
        onOk={handleGenerateWithPrompt}
        okText="Сгенерировать"
        cancelText="Отмена"
        width={600}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество вариантов:
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value) || 5)}
              className="w-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание:
            </label>
            <Input.TextArea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={guidelines.customPrompt?.placeholder}
            />
          </div>

          {guidelines.customPrompt?.examples && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Примеры:
              </label>
              <div className="space-y-2">
                {guidelines.customPrompt.examples.map((example, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setCustomPrompt(example)}
                  >
                    <p className="text-sm text-gray-700 italic">"{example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guidelines.customPrompt?.tips && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Советы:
              </label>
              <ul className="text-sm text-gray-600 space-y-1">
                {guidelines.customPrompt.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Модал для загрузки файла */}
      <Modal
        title="Загрузить файл"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          {guidelines.fileUpload && (
            <>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Требования к файлу:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Форматы: {guidelines.fileUpload.acceptedFormats.join(', ')}</li>
                  <li>• Максимальный размер: {Math.round(guidelines.fileUpload.maxSizeBytes / 1024 / 1024)}MB</li>
                  {guidelines.fileUpload.dimensions && (
                    <li>
                      • Рекомендуемый размер: {guidelines.fileUpload.dimensions.recommended.width}x{guidelines.fileUpload.dimensions.recommended.height}px
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-sm text-gray-700 mb-3">{guidelines.fileUpload.description}</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={guidelines.fileUpload.acceptedFormats.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  size="large"
                >
                  Выбрать файл
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Или перетащите файл сюда
                </p>
              </div>

              {guidelines.fileUpload.examples.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Примеры файлов:</h4>
                  <div className="flex flex-wrap gap-2">
                    {guidelines.fileUpload.examples.map((example, index) => (
                      <Tag key={index} color="blue">{example}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Индикатор загрузки */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <Spin size="large" />
            <p className="text-lg font-medium">Генерируем варианты...</p>
            <p className="text-sm text-gray-600">Это может занять несколько секунд</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector; 