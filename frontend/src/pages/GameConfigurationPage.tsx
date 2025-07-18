import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Alert, Button, Space, Result } from 'antd';
import { ArrowLeftOutlined, RocketOutlined } from '@ant-design/icons';
import GameConfiguration from '../components/GameConfiguration/GameConfiguration';

const { Title, Paragraph } = Typography;

// Типы для конфигурации (импортированы из компонента)
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

const GameConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [configurationComplete, setConfigurationComplete] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfiguration | null>(null);

  const handleConfigurationComplete = (config: GameConfiguration) => {
    console.log('Конфигурация завершена:', config);
    setGameConfig(config);
    setConfigurationComplete(true);
    
    // Перенаправляем на интерактивную генерацию с конфигурацией
    // Сохраняем конфигурацию в localStorage для передачи
    localStorage.setItem('gameConfiguration', JSON.stringify(config));
    
    // Переходим к интерактивной генерации
    navigate('/interactive-generation', { 
      state: { gameConfiguration: config }
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  const startInteractiveGeneration = () => {
    if (gameConfig) {
      navigate('/interactive-generation', { 
        state: { gameConfiguration: gameConfig }
      });
    }
  };

  if (configurationComplete && gameConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Result
            status="success"
            title="Конфигурация игры завершена!"
            subTitle="Все параметры настроены. Теперь вы можете начать интерактивную генерацию игры."
            extra={[
              <Button type="primary" key="start" icon={<RocketOutlined />} onClick={startInteractiveGeneration}>
                Начать интерактивную генерацию
              </Button>,
              <Button key="back" onClick={handleBack}>
                Вернуться на главную
              </Button>
            ]}
          />
          
          <Card className="mt-6" title="Сводка конфигурации">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Жанр:</strong> {gameConfig.mainGenre}
                {gameConfig.subGenre && ` (${gameConfig.subGenre})`}
              </div>
              <div>
                <strong>Режим:</strong> {gameConfig.gameMode}
              </div>
              <div>
                <strong>Стиль:</strong> {gameConfig.visualStyle.graphicStyle}
              </div>
              <div>
                <strong>Камера:</strong> {gameConfig.camera.view}
              </div>
              <div>
                <strong>Платформа:</strong> {gameConfig.technical.platform}
              </div>
              <div>
                <strong>Уровни:</strong> {gameConfig.content.levels}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хлебные крошки */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            className="mb-2"
          >
            Вернуться на главную
          </Button>
          <Title level={3} className="mb-0">Создание новой игры</Title>
          <Paragraph className="text-gray-600 mb-0">
            Настройте параметры игры перед началом интерактивной генерации
          </Paragraph>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Alert
          message="Новый подход к созданию игр"
          description="Теперь вы можете детально настроить все аспекты будущей игры перед началом генерации. Это позволит AI создать более точную и персонализированную игру, соответствующую вашим предпочтениям."
          type="info"
          showIcon
          className="mb-6"
          action={
            <Space>
              <Button size="small" type="text">
                Подробнее
              </Button>
            </Space>
          }
        />
      </div>

      {/* Компонент конфигурации */}
      <GameConfiguration 
        onConfigurationComplete={handleConfigurationComplete}
        onBack={handleBack}
      />
    </div>
  );
};

export default GameConfigurationPage; 