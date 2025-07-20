import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Space,
  message,
  Upload,
  Divider,
  Radio,
  Alert
} from 'antd';
import { 
  SendOutlined, 
  UploadOutlined, 
  InfoCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import api from '../services/api';

const GameForm = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [generationMode, setGenerationMode] = useState<'automatic' | 'interactive'>('automatic');
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    try {
      setIsLoading(true);

      const gameData = {
        ...values,
        mode: generationMode
      };

      if (generationMode === 'interactive') {
        // Запускаем интерактивную генерацию
        const response = await api.startInteractiveGeneration({
          title: gameData.title,
          description: gameData.description,
          genre: gameData.genre,
          userId: 'user-001', // TODO: получать из контекста пользователя
        });
        
        message.success('Интерактивная генерация начата! Теперь вы сможете выбирать варианты на каждом этапе.');
        navigate(`/interactive/${response.data.gameId}`);
      } else {
        // Обычная автоматическая генерация
        const response = await api.createGame(gameData);
        
        message.success('Игра поставлена в очередь на генерацию!');
        navigate(`/games/${response.game.id}`);
      }

    } catch (error) {
      console.error('Ошибка отправки формы:', error);
      message.error('Произошла ошибка при создании игры');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Создать новую игру" className="w-full max-w-2xl mx-auto">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          genre: 'platformer',
          quality: 'medium',
          targetAudience: 'everyone'
        }}
      >
        {/* Режим генерации */}
        <Form.Item 
          label="Режим генерации"
          tooltip="Выберите, как создавать игру: автоматически или с пошаговым выбором"
        >
          <Radio.Group 
            value={generationMode} 
            onChange={(e) => setGenerationMode(e.target.value)}
            className="w-full"
          >
            <Radio.Button value="automatic" className="w-1/2 text-center">
              <PlayCircleOutlined className="mr-2" />
              Автоматически
            </Radio.Button>
            <Radio.Button value="interactive" className="w-1/2 text-center">
              <SettingOutlined className="mr-2" />
              Интерактивно
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {generationMode === 'interactive' && (
          <Alert
            message="Интерактивная генерация"
            description="Сначала вы детально настроите все параметры игры (жанр, стиль, механики), а затем пошагово выберете варианты для персонажей, уровней, графики и звуков. Это даст полный контроль над результатом."
            type="info"
            showIcon
            className="mb-4"
          />
        )}

        {generationMode === 'automatic' && (
          <Alert
            message="Автоматическая генерация"
            description="ИИ создаст игру автоматически на основе вашего описания. Процесс займет 5-10 минут."
            type="success"
            showIcon
            className="mb-4"
          />
        )}

        {/* Основные поля формы */}
        <Form.Item
          name="title"
          label="Название игры"
          rules={[{ required: true, message: 'Введите название игры' }]}
        >
          <Input 
            placeholder="Например: Космический защитник"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Описание игры"
          rules={[{ required: true, message: 'Опишите вашу игру' }]}
        >
          <Input.TextArea
            placeholder="Опишите игру, которую хотите создать..."
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="genre"
              label="Жанр"
              rules={[{ required: true, message: 'Выберите жанр' }]}
            >
              <Select size="large">
                <Select.Option value="platformer">Платформер</Select.Option>
                <Select.Option value="arcade">Аркада</Select.Option>
                <Select.Option value="puzzle">Головоломка</Select.Option>
                <Select.Option value="shooter">Шутер</Select.Option>
                <Select.Option value="rpg">RPG</Select.Option>
                <Select.Option value="strategy">Стратегия</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="artStyle"
              label="Художественный стиль"
            >
              <Select size="large" placeholder="Выберите стиль">
                <Select.Option value="pixel">Пиксель-арт</Select.Option>
                <Select.Option value="cartoon">Мультяшный</Select.Option>
                <Select.Option value="realistic">Реалистичный</Select.Option>
                <Select.Option value="minimalist">Минималистичный</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            icon={generationMode === 'interactive' ? <SettingOutlined /> : <SendOutlined />}
            size="large"
            block
          >
            {generationMode === 'interactive' 
              ? 'Перейти к настройке параметров' 
              : 'Создать игру автоматически'
            }
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default GameForm; 