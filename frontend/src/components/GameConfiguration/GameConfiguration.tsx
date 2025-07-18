import React, { useState, useEffect } from 'react';
import {
  Steps,
  Form,
  Card,
  Button,
  Typography,
  Row,
  Col,
  Select,
  Radio,
  Checkbox,
  InputNumber,
  Switch,
  Slider,
  Divider,
  Tag,
  Tooltip,
  Alert,
  Progress,
  Space,
  Badge
} from 'antd';
import {
  GameControllerOutlined,
  EyeOutlined,
  SettingOutlined,
  SoundOutlined,
  TrophyOutlined,
  TeamOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  RightOutlined
} from '@ant-design/icons';

const { Step } = Steps;
const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// Типы для конфигурации (упрощенные версии из backend)
interface GameConfiguration {
  title: string;
  description: string;
  mainGenre: string;
  subGenre?: string;
  gameMode: string;
  progressionType: string;
  visualStyle: {
    graphicStyle: string;
    colorPalette: string;
    artDirection: string;
    quality: string;
  };
  camera: {
    view: string;
    scrollType: string;
    behavior: string;
  };
  controls: {
    devices: string[];
    scheme: string;
    complexity: string;
    customizable: boolean;
  };
  mechanics: {
    core: string[];
    combat?: string[];
    movement: string[];
    physics: string;
    time: string;
  };
  progression: {
    levelSystem: boolean;
    skillTree: string;
    equipment: {
      weapons: boolean;
      armor: boolean;
      accessories: boolean;
      cosmetic: boolean;
    };
    currency: {
      ingame: boolean;
      premium: boolean;
      multiple: boolean;
    };
  };
  content: {
    levels: number;
    duration: string;
    replayability: string;
    proceduralGeneration: {
      levels: boolean;
      enemies: boolean;
      loot: boolean;
    };
    story: {
      hasStory: boolean;
      type: string;
    };
  };
  difficulty: {
    difficultyLevels: string[];
    difficultyCurve: string;
    deathSystem: string;
    playerHelp: {
      hints: boolean;
      tutorial: boolean;
      autoAim: boolean;
      assists: boolean;
    };
  };
  social: {
    multiplayer: string;
    leaderboards: {
      global: boolean;
      friends: boolean;
      weekly: boolean;
    };
    achievements: boolean;
    sharing: {
      screenshots: boolean;
      videos: boolean;
      results: boolean;
    };
  };
  technical: {
    platform: string;
    gameSize: string;
    internetRequirement: string;
    orientation: string;
    frameRate: string;
  };
  monetization: {
    model: string;
    inAppPurchases: {
      cosmetic: boolean;
      boosters: boolean;
      content: boolean;
      payToWin: boolean;
    };
    advertising: {
      banners: boolean;
      video: boolean;
      rewarded: boolean;
      interstitial: boolean;
    };
    energy: boolean;
    battlePass: boolean;
  };
  audio: {
    music: {
      type: string;
      genre: string;
    };
    soundEffects: string;
    voiceOver: string;
    languages: string[];
  };
  additional: {
    ageRating: string;
    interfaceLanguages: string[];
    subtitles: boolean;
    accessibility: boolean;
    modSupport: boolean;
  };
}

interface GameConfigurationProps {
  onConfigurationComplete: (config: GameConfiguration) => void;
  onBack?: () => void;
}

const GameConfiguration: React.FC<GameConfigurationProps> = ({
  onConfigurationComplete,
  onBack
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [configuration, setConfiguration] = useState<Partial<GameConfiguration>>({});
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(8).fill(false));

  // Опции для выбора
  const mainGenres = [
    { value: 'action', label: 'Экшен', description: 'Быстрые реакции и активные действия', icon: '⚔️' },
    { value: 'strategy', label: 'Стратегия', description: 'Планирование и тактическое мышление', icon: '🧩' },
    { value: 'rpg', label: 'RPG', description: 'Развитие персонажа и ролевая игра', icon: '🏹' },
    { value: 'simulation', label: 'Симулятор', description: 'Имитация реальных процессов', icon: '🚁' },
    { value: 'sports', label: 'Спорт', description: 'Спортивные состязания', icon: '⚽' },
    { value: 'racing', label: 'Гонки', description: 'Соревнования на скорость', icon: '🏎️' },
    { value: 'fighting', label: 'Файтинг', description: 'Бои один на один', icon: '🥊' },
    { value: 'shooter', label: 'Шутер', description: 'Стрельба и меткость', icon: '🔫' },
    { value: 'platformer', label: 'Платформер', description: 'Прыжки по платформам', icon: '🏃' },
    { value: 'puzzle', label: 'Головоломка', description: 'Решение логических задач', icon: '🧠' },
    { value: 'arcade', label: 'Аркада', description: 'Простые и захватывающие игры', icon: '🕹️' },
    { value: 'adventure', label: 'Приключения', description: 'Исследование и открытия', icon: '🗺️' },
    { value: 'horror', label: 'Хоррор', description: 'Страх и напряжение', icon: '👻' },
    { value: 'survival', label: 'Выживание', description: 'Борьба за выживание', icon: '🏕️' }
  ];

  const subGenres = {
    action: ['runner', 'battle_royale'],
    strategy: ['tower_defense', 'turn_based'],
    rpg: ['roguelike'],
    puzzle: ['clicker'],
    arcade: ['idle'],
    // ... и так далее
  };

  const graphicStyles = [
    { value: 'pixel_art_8bit', label: '8-bit Пиксель-арт', colors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00'] },
    { value: 'pixel_art_16bit', label: '16-bit Пиксель-арт', colors: ['#2C3E50', '#E74C3C', '#3498DB', '#F1C40F'] },
    { value: 'pixel_art_32bit', label: '32-bit Пиксель-арт', colors: ['#34495E', '#E67E22', '#9B59B6', '#1ABC9C'] },
    { value: 'vector', label: 'Векторная графика', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'] },
    { value: '3d_realistic', label: '3D Реалистичная', colors: ['#8B4513', '#228B22', '#4169E1', '#DC143C'] },
    { value: '3d_low_poly', label: '3D Low-poly', colors: ['#FF69B4', '#00CED1', '#FFD700', '#32CD32'] },
    { value: 'cartoon', label: 'Мультяшная', colors: ['#FFA500', '#FF1493', '#00BFFF', '#ADFF2F'] },
    { value: 'minimalist', label: 'Минималистичная', colors: ['#F5F5F5', '#2F2F2F', '#007ACC', '#FF6B35'] }
  ];

  const steps = [
    {
      title: 'Жанр и тип',
      icon: <GameControllerOutlined />,
      description: 'Определите основной жанр и тип игры'
    },
    {
      title: 'Визуальный стиль',
      icon: <EyeOutlined />,
      description: 'Выберите графический стиль и цветовую палитру'
    },
    {
      title: 'Камера и управление',
      icon: <SettingOutlined />,
      description: 'Настройте перспективу и схему управления'
    },
    {
      title: 'Игровые механики',
      icon: <GameControllerOutlined />,
      description: 'Определите основные механики игры'
    },
    {
      title: 'Прогрессия',
      icon: <TrophyOutlined />,
      description: 'Система развития и достижений'
    },
    {
      title: 'Контент и сложность',
      icon: <InfoCircleOutlined />,
      description: 'Структура контента и баланс сложности'
    },
    {
      title: 'Социальные функции',
      icon: <TeamOutlined />,
      description: 'Мультиплеер и социальные возможности'
    },
    {
      title: 'Технические параметры',
      icon: <SettingOutlined />,
      description: 'Платформа, монетизация и аудио'
    }
  ];

  const handleStepComplete = (stepIndex: number, values: any) => {
    const newConfiguration = { ...configuration, ...values };
    setConfiguration(newConfiguration);
    
    const newCompletedSteps = [...completedSteps];
    newCompletedSteps[stepIndex] = true;
    setCompletedSteps(newCompletedSteps);

    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      // Все шаги завершены
      onConfigurationComplete(newConfiguration as GameConfiguration);
    }
  };

  const renderGenreStep = () => (
    <Card title="Жанр и тип игры" className="mb-4">
      <Form.Item 
        name="mainGenre" 
        label="Основной жанр"
        rules={[{ required: true, message: 'Выберите основной жанр' }]}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mainGenres.map(genre => (
            <Card
              key={genre.value}
              size="small"
              hoverable
              className="text-center cursor-pointer border-2 hover:border-blue-400"
              onClick={() => form.setFieldsValue({ mainGenre: genre.value })}
            >
              <div className="text-2xl mb-2">{genre.icon}</div>
              <div className="font-medium">{genre.label}</div>
              <div className="text-xs text-gray-500 mt-1">{genre.description}</div>
            </Card>
          ))}
        </div>
      </Form.Item>

      <Form.Item 
        name="gameMode" 
        label="Режим игры"
        rules={[{ required: true, message: 'Выберите режим игры' }]}
      >
        <Radio.Group className="w-full">
          <Radio.Button value="single_player" className="w-1/4 text-center">Одиночная</Radio.Button>
          <Radio.Button value="cooperative" className="w-1/4 text-center">Кооператив</Radio.Button>
          <Radio.Button value="pvp" className="w-1/4 text-center">PvP</Radio.Button>
          <Radio.Button value="mmo" className="w-1/4 text-center">MMO</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item 
        name="progressionType" 
        label="Тип прохождения"
        rules={[{ required: true, message: 'Выберите тип прохождения' }]}
      >
        <Select placeholder="Выберите тип прохождения">
          <Option value="linear">Линейное прохождение</Option>
          <Option value="open_world">Открытый мир</Option>
          <Option value="levels">Уровни</Option>
          <Option value="endless">Бесконечное</Option>
        </Select>
      </Form.Item>
    </Card>
  );

  const renderVisualStep = () => (
    <Card title="Визуальный стиль" className="mb-4">
      <Form.Item 
        name={['visualStyle', 'graphicStyle']} 
        label="Графический стиль"
        rules={[{ required: true, message: 'Выберите графический стиль' }]}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {graphicStyles.map(style => (
            <Card
              key={style.value}
              size="small"
              hoverable
              className="cursor-pointer border-2 hover:border-blue-400"
              onClick={() => form.setFieldsValue({ 
                visualStyle: { 
                  ...form.getFieldValue('visualStyle'),
                  graphicStyle: style.value 
                } 
              })}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{style.label}</span>
                <div className="flex space-x-1">
                  {style.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item 
            name={['visualStyle', 'colorPalette']} 
            label="Цветовая палитра"
            rules={[{ required: true, message: 'Выберите палитру' }]}
          >
            <Select placeholder="Выберите палитру">
              <Option value="bright">Яркая</Option>
              <Option value="dark">Темная</Option>
              <Option value="monochrome">Монохромная</Option>
              <Option value="pastel">Пастельная</Option>
              <Option value="contrast">Контрастная</Option>
              <Option value="neon">Неоновая</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item 
            name={['visualStyle', 'artDirection']} 
            label="Художественное направление"
            rules={[{ required: true, message: 'Выберите направление' }]}
          >
            <Select placeholder="Выберите направление">
              <Option value="fantasy">Фэнтези</Option>
              <Option value="cyberpunk">Киберпанк</Option>
              <Option value="steampunk">Стимпанк</Option>
              <Option value="realism">Реализм</Option>
              <Option value="anime">Аниме/Манга</Option>
              <Option value="abstract">Абстракция</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item 
            name={['visualStyle', 'quality']} 
            label="Качество графики"
            rules={[{ required: true, message: 'Выберите качество' }]}
          >
            <Select placeholder="Выберите качество">
              <Option value="retro">Ретро</Option>
              <Option value="hd">HD</Option>
              <Option value="full_hd">Full HD</Option>
              <Option value="4k">4K</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderCameraControlsStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Камера и перспектива" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['camera', 'view']} 
              label="Вид камеры"
              rules={[{ required: true, message: 'Выберите вид камеры' }]}
            >
              <Select placeholder="Выберите вид">
                <Option value="side_view">Сбоку (Side-view)</Option>
                <Option value="top_down">Сверху (Top-down)</Option>
                <Option value="isometric">Изометрия</Option>
                <Option value="first_person">От первого лица</Option>
                <Option value="third_person">От третьего лица</Option>
                <Option value="2_5d">2.5D</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['camera', 'scrollType']} 
              label="Тип прокрутки"
              rules={[{ required: true, message: 'Выберите тип прокрутки' }]}
            >
              <Select placeholder="Выберите тип">
                <Option value="horizontal">Горизонтальная</Option>
                <Option value="vertical">Вертикальная</Option>
                <Option value="multidirectional">Многонаправленная</Option>
                <Option value="static_screen">Статичный экран</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['camera', 'behavior']} 
              label="Поведение камеры"
              rules={[{ required: true, message: 'Выберите поведение' }]}
            >
              <Select placeholder="Выберите поведение">
                <Option value="following">Следящая</Option>
                <Option value="dynamic">Динамическая</Option>
                <Option value="cinematic">Кинематографичная</Option>
                <Option value="manual_control">Ручное управление</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Управление" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name={['controls', 'devices']} 
              label="Устройства ввода"
              rules={[{ required: true, message: 'Выберите устройства' }]}
            >
              <Checkbox.Group className="w-full">
                <Row>
                  <Col span={12}><Checkbox value="keyboard">Клавиатура</Checkbox></Col>
                  <Col span={12}><Checkbox value="mouse">Мышь</Checkbox></Col>
                  <Col span={12}><Checkbox value="touchscreen">Тачскрин</Checkbox></Col>
                  <Col span={12}><Checkbox value="gamepad">Геймпад</Checkbox></Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['controls', 'complexity']} 
              label="Сложность управления"
              rules={[{ required: true, message: 'Выберите сложность' }]}
            >
              <Radio.Group>
                <Radio.Button value="simple">Простое</Radio.Button>
                <Radio.Button value="medium">Среднее</Radio.Button>
                <Radio.Button value="complex">Сложное</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['controls', 'customizable']} 
              label="Настройка управления"
              valuePropName="checked"
            >
              <Switch checkedChildren="Есть" unCheckedChildren="Нет" />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderMechanicsStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Основные механики" size="small">
        <Form.Item 
          name={['mechanics', 'core']} 
          label="Основные механики"
          rules={[{ required: true, message: 'Выберите основные механики' }]}
        >
          <Checkbox.Group className="w-full">
            <Row gutter={[16, 8]}>
              <Col span={8}><Checkbox value="jumping">Прыжки</Checkbox></Col>
              <Col span={8}><Checkbox value="shooting">Стрельба</Checkbox></Col>
              <Col span={8}><Checkbox value="building">Строительство</Checkbox></Col>
              <Col span={8}><Checkbox value="resource_gathering">Сбор ресурсов</Checkbox></Col>
              <Col span={8}><Checkbox value="crafting">Крафтинг</Checkbox></Col>
              <Col span={8}><Checkbox value="exploration">Исследование</Checkbox></Col>
              <Col span={8}><Checkbox value="puzzle_solving">Головоломки</Checkbox></Col>
              <Col span={8}><Checkbox value="stealth">Скрытность</Checkbox></Col>
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['mechanics', 'physics']} 
              label="Физика"
              rules={[{ required: true, message: 'Выберите тип физики' }]}
            >
              <Select placeholder="Выберите физику">
                <Option value="realistic">Реалистичная</Option>
                <Option value="arcade">Аркадная</Option>
                <Option value="ragdoll">Рэгдолл</Option>
                <Option value="destructible">Разрушаемость</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['mechanics', 'time']} 
              label="Время"
              rules={[{ required: true, message: 'Выберите тип времени' }]}
            >
              <Select placeholder="Выберите время">
                <Option value="real_time">Реальное время</Option>
                <Option value="turn_based">Пошаговое</Option>
                <Option value="pause">С паузой</Option>
                <Option value="bullet_time">Bullet-time</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['mechanics', 'movement']} 
              label="Система передвижения"
              rules={[{ required: true, message: 'Выберите движение' }]}
            >
              <Select mode="multiple" placeholder="Выберите движения">
                <Option value="running">Бег</Option>
                <Option value="jumping">Прыжки</Option>
                <Option value="double_jump">Двойной прыжок</Option>
                <Option value="dash">Дэш</Option>
                <Option value="flying">Полет</Option>
                <Option value="climbing">Лазание</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderProgressionStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Система прогрессии" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name={['progression', 'levelSystem']} 
              label="Система уровней персонажа"
              valuePropName="checked"
            >
              <Switch checkedChildren="Есть" unCheckedChildren="Нет" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name={['progression', 'skillTree']} 
              label="Прокачка навыков"
              rules={[{ required: true, message: 'Выберите тип прокачки' }]}
            >
              <Select placeholder="Выберите тип">
                <Option value="none">Отсутствует</Option>
                <Option value="linear">Линейная</Option>
                <Option value="branching">Ветвистая</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Экипировка">
              <Form.Item name={['progression', 'equipment', 'weapons']} valuePropName="checked" noStyle>
                <Checkbox>Оружие</Checkbox>
              </Form.Item>
              <Form.Item name={['progression', 'equipment', 'armor']} valuePropName="checked" noStyle>
                <Checkbox>Броня</Checkbox>
              </Form.Item>
              <Form.Item name={['progression', 'equipment', 'accessories']} valuePropName="checked" noStyle>
                <Checkbox>Аксессуары</Checkbox>
              </Form.Item>
              <Form.Item name={['progression', 'equipment', 'cosmetic']} valuePropName="checked" noStyle>
                <Checkbox>Косметика</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Валюта">
              <Form.Item name={['progression', 'currency', 'ingame']} valuePropName="checked" noStyle>
                <Checkbox>Внутриигровая</Checkbox>
              </Form.Item>
              <Form.Item name={['progression', 'currency', 'premium']} valuePropName="checked" noStyle>
                <Checkbox>Премиум</Checkbox>
              </Form.Item>
              <Form.Item name={['progression', 'currency', 'multiple']} valuePropName="checked" noStyle>
                <Checkbox>Несколько типов</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderContentStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Структура контента" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['content', 'levels']} 
              label="Количество уровней"
              rules={[{ required: true, message: 'Укажите количество' }]}
            >
              <InputNumber min={1} max={100} placeholder="Количество уровней" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['content', 'duration']} 
              label="Длительность прохождения"
              rules={[{ required: true, message: 'Выберите длительность' }]}
            >
              <Select placeholder="Выберите длительность">
                <Option value="short">Короткая (&lt;1ч)</Option>
                <Option value="medium">Средняя (1-5ч)</Option>
                <Option value="long">Длинная (&gt;5ч)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['content', 'replayability']} 
              label="Реиграбельность"
              rules={[{ required: true, message: 'Выберите уровень' }]}
            >
              <Select placeholder="Выберите уровень">
                <Option value="low">Низкая</Option>
                <Option value="medium">Средняя</Option>
                <Option value="high">Высокая</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Процедурная генерация">
              <Form.Item name={['content', 'proceduralGeneration', 'levels']} valuePropName="checked" noStyle>
                <Checkbox>Уровни</Checkbox>
              </Form.Item>
              <Form.Item name={['content', 'proceduralGeneration', 'enemies']} valuePropName="checked" noStyle>
                <Checkbox>Враги</Checkbox>
              </Form.Item>
              <Form.Item name={['content', 'proceduralGeneration', 'loot']} valuePropName="checked" noStyle>
                <Checkbox>Лут</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name={['content', 'story', 'hasStory']} 
              label="Сюжет"
              valuePropName="checked"
            >
              <Switch checkedChildren="Есть" unCheckedChildren="Нет" />
            </Form.Item>
            <Form.Item 
              name={['content', 'story', 'type']} 
              label="Тип сюжета"
            >
              <Select placeholder="Выберите тип">
                <Option value="linear">Линейный</Option>
                <Option value="branching">Ветвящийся</Option>
                <Option value="multiple_endings">Множественные концовки</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Сложность и баланс" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name={['difficulty', 'difficultyLevels']} 
              label="Уровни сложности"
              rules={[{ required: true, message: 'Выберите уровни' }]}
            >
              <Checkbox.Group>
                <Row>
                  <Col span={12}><Checkbox value="easy">Легкий</Checkbox></Col>
                  <Col span={12}><Checkbox value="normal">Нормальный</Checkbox></Col>
                  <Col span={12}><Checkbox value="hard">Сложный</Checkbox></Col>
                  <Col span={12}><Checkbox value="nightmare">Кошмар</Checkbox></Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['difficulty', 'difficultyCurve']} 
              label="Кривая сложности"
              rules={[{ required: true, message: 'Выберите кривую' }]}
            >
              <Select placeholder="Выберите кривую">
                <Option value="smooth">Плавная</Option>
                <Option value="steep">Резкая</Option>
                <Option value="adaptive">Адаптивная</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['difficulty', 'deathSystem']} 
              label="Система смерти"
              rules={[{ required: true, message: 'Выберите систему' }]}
            >
              <Select placeholder="Выберите систему">
                <Option value="permanent">Перманентная</Option>
                <Option value="checkpoints">Чекпоинты</Option>
                <Option value="respawn">Респавн</Option>
                <Option value="lives">Жизни</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Помощь игроку">
          <Form.Item name={['difficulty', 'playerHelp', 'hints']} valuePropName="checked" noStyle>
            <Checkbox>Подсказки</Checkbox>
          </Form.Item>
          <Form.Item name={['difficulty', 'playerHelp', 'tutorial']} valuePropName="checked" noStyle>
            <Checkbox>Туториал</Checkbox>
          </Form.Item>
          <Form.Item name={['difficulty', 'playerHelp', 'autoAim']} valuePropName="checked" noStyle>
            <Checkbox>Авто-прицеливание</Checkbox>
          </Form.Item>
          <Form.Item name={['difficulty', 'playerHelp', 'assists']} valuePropName="checked" noStyle>
            <Checkbox>Ассисты</Checkbox>
          </Form.Item>
        </Form.Item>
      </Card>
    </Space>
  );

  const renderSocialStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Социальные функции" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['social', 'multiplayer']} 
              label="Мультиплеер"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select placeholder="Выберите тип">
                <Option value="none">Отсутствует</Option>
                <Option value="local">Локальный</Option>
                <Option value="online">Онлайн</Option>
                <Option value="async">Асинхронный</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['social', 'achievements']} 
              label="Достижения"
              valuePropName="checked"
            >
              <Switch checkedChildren="Есть" unCheckedChildren="Нет" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Таблицы лидеров">
              <Form.Item name={['social', 'leaderboards', 'global']} valuePropName="checked" noStyle>
                <Checkbox>Глобальная</Checkbox>
              </Form.Item>
              <Form.Item name={['social', 'leaderboards', 'friends']} valuePropName="checked" noStyle>
                <Checkbox>Среди друзей</Checkbox>
              </Form.Item>
              <Form.Item name={['social', 'leaderboards', 'weekly']} valuePropName="checked" noStyle>
                <Checkbox>Еженедельная</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Возможности шаринга">
          <Form.Item name={['social', 'sharing', 'screenshots']} valuePropName="checked" noStyle>
            <Checkbox>Скриншоты</Checkbox>
          </Form.Item>
          <Form.Item name={['social', 'sharing', 'videos']} valuePropName="checked" noStyle>
            <Checkbox>Видео</Checkbox>
          </Form.Item>
          <Form.Item name={['social', 'sharing', 'results']} valuePropName="checked" noStyle>
            <Checkbox>Результаты</Checkbox>
          </Form.Item>
        </Form.Item>
      </Card>
    </Space>
  );

  const renderTechnicalStep = () => (
    <Space direction="vertical" className="w-full">
      <Card title="Технические параметры" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item 
              name={['technical', 'platform']} 
              label="Платформа"
              rules={[{ required: true, message: 'Выберите платформу' }]}
            >
              <Select placeholder="Выберите платформу">
                <Option value="browser">Браузер</Option>
                <Option value="ios">iOS</Option>
                <Option value="android">Android</Option>
                <Option value="crossplatform">Кроссплатформа</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['technical', 'gameSize']} 
              label="Размер игры (МБ)"
              rules={[{ required: true, message: 'Укажите размер' }]}
            >
              <InputNumber min={1} max={1000} placeholder="Размер в МБ" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['technical', 'orientation']} 
              label="Ориентация экрана"
              rules={[{ required: true, message: 'Выберите ориентацию' }]}
            >
              <Select placeholder="Выберите ориентацию">
                <Option value="portrait">Портретная</Option>
                <Option value="landscape">Альбомная</Option>
                <Option value="both">Обе</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name={['technical', 'frameRate']} 
              label="FPS"
              rules={[{ required: true, message: 'Выберите FPS' }]}
            >
              <Select placeholder="Выберите FPS">
                <Option value="30fps">30 FPS</Option>
                <Option value="60fps">60 FPS</Option>
                <Option value="120fps">120 FPS</Option>
                <Option value="variable">Переменный</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Монетизация" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['monetization', 'model']} 
              label="Модель монетизации"
              rules={[{ required: true, message: 'Выберите модель' }]}
            >
              <Select placeholder="Выберите модель">
                <Option value="free">Бесплатная</Option>
                <Option value="paid">Платная</Option>
                <Option value="freemium">Freemium</Option>
                <Option value="subscription">Подписка</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Внутриигровые покупки">
              <Form.Item name={['monetization', 'inAppPurchases', 'cosmetic']} valuePropName="checked" noStyle>
                <Checkbox>Косметика</Checkbox>
              </Form.Item>
              <Form.Item name={['monetization', 'inAppPurchases', 'boosters']} valuePropName="checked" noStyle>
                <Checkbox>Ускорители</Checkbox>
              </Form.Item>
              <Form.Item name={['monetization', 'inAppPurchases', 'content']} valuePropName="checked" noStyle>
                <Checkbox>Контент</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Реклама">
              <Form.Item name={['monetization', 'advertising', 'banners']} valuePropName="checked" noStyle>
                <Checkbox>Баннеры</Checkbox>
              </Form.Item>
              <Form.Item name={['monetization', 'advertising', 'video']} valuePropName="checked" noStyle>
                <Checkbox>Видео</Checkbox>
              </Form.Item>
              <Form.Item name={['monetization', 'advertising', 'rewarded']} valuePropName="checked" noStyle>
                <Checkbox>Награждаемая</Checkbox>
              </Form.Item>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Аудио и дополнительно" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name={['audio', 'music', 'type']} 
              label="Тип музыки"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select placeholder="Выберите тип">
                <Option value="original">Оригинальная</Option>
                <Option value="licensed">Лицензированная</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['audio', 'soundEffects']} 
              label="Звуковые эффекты"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select placeholder="Выберите тип">
                <Option value="realistic">Реалистичные</Option>
                <Option value="arcade">Аркадные</Option>
                <Option value="minimalist">Минималистичные</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name={['additional', 'ageRating']} 
              label="Возрастной рейтинг"
              rules={[{ required: true, message: 'Выберите рейтинг' }]}
            >
              <Select placeholder="Выберите рейтинг">
                <Option value="0+">0+</Option>
                <Option value="6+">6+</Option>
                <Option value="12+">12+</Option>
                <Option value="16+">16+</Option>
                <Option value="18+">18+</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderGenreStep();
      case 1: return renderVisualStep();
      case 2: return renderCameraControlsStep();
      case 3: return renderMechanicsStep();
      case 4: return renderProgressionStep();
      case 5: return renderContentStep();
      case 6: return renderSocialStep();
      case 7: return renderTechnicalStep();
      default: return null;
    }
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      handleStepComplete(currentStep, values);
    } catch (error) {
      console.error('Ошибка валидации:', error);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const progressPercent = Math.round(((completedSteps.filter(Boolean).length) / steps.length) * 100);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Заголовок и прогресс */}
      <div className="text-center mb-8">
        <Title level={2}>Конфигурация игры</Title>
        <Paragraph className="text-lg text-gray-600">
          Настройте все аспекты вашей будущей игры
        </Paragraph>
        
        <div className="flex items-center justify-center space-x-4 mt-4">
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor="#1890ff"
            className="w-64"
          />
          <span className="text-sm text-gray-600">
            {completedSteps.filter(Boolean).length} из {steps.length} секций
          </span>
        </div>
      </div>

      {/* Шаги */}
      <div className="mb-8">
        <Steps 
          current={currentStep} 
          size="small"
          className="mb-6"
        >
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={completedSteps[index] ? <CheckCircleOutlined /> : step.icon}
              status={
                completedSteps[index] ? 'finish' :
                index === currentStep ? 'process' : 'wait'
              }
            />
          ))}
        </Steps>
      </div>

      {/* Форма */}
      <Form
        form={form}
        layout="vertical"
        initialValues={configuration}
        className="mb-8"
      >
        {renderCurrentStep()}
      </Form>

      {/* Навигация */}
      <div className="flex justify-between items-center">
        <Button onClick={handlePrevious}>
          {currentStep === 0 ? 'Назад' : 'Предыдущий шаг'}
        </Button>
        
        <div className="text-center">
          <Text type="secondary">
            Шаг {currentStep + 1} из {steps.length}
          </Text>
        </div>
        
        <Button 
          type="primary" 
          onClick={handleNext}
          icon={currentStep === steps.length - 1 ? <CheckCircleOutlined /> : <RightOutlined />}
        >
          {currentStep === steps.length - 1 ? 'Начать генерацию' : 'Следующий шаг'}
        </Button>
      </div>
    </div>
  );
};

export default GameConfiguration; 