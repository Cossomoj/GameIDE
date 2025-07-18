import { GamePrompt, GameDesign } from '../../src/types';

export interface GameTemplate {
  name: string;
  genre: string;
  description: string;
  generateCode(prompt: GamePrompt, design: GameDesign): {
    html: string;
    js: string;
    css: string;
  };
  generateAssets?(design: GameDesign): {
    sprites: { name: string; prompt: string }[];
    sounds: { name: string; prompt: string }[];
    backgrounds: { name: string; prompt: string }[];
  };
}

export abstract class BaseGameTemplate implements GameTemplate {
  abstract name: string;
  abstract genre: string;
  abstract description: string;

  abstract generateCode(prompt: GamePrompt, design: GameDesign): {
    html: string;
    js: string;
    css: string;
  };

  protected generateHTML(title: string, jsContent: string, cssContent: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    <script src="https://yandex.ru/games/sdk/v2"></script>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div id="game-container">
        <div id="game"></div>
        <div id="ui-overlay">
            <div id="score">Очки: <span id="score-value">0</span></div>
            <div id="lives">Жизни: <span id="lives-value">3</span></div>
        </div>
    </div>
    
    <script>
        ${jsContent}
    </script>
</body>
</html>`;
  }

  protected generateBaseCSS(): string {
    return `
body {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    font-family: 'Arial', sans-serif;
    overflow: hidden;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

#game {
    border: 2px solid #fff;
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

#ui-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    color: white;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    z-index: 1000;
}

#ui-overlay div {
    margin-bottom: 10px;
}

.game-button {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    border: none;
    border-radius: 25px;
    color: white;
    font-size: 16px;
    font-weight: bold;
    padding: 12px 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.game-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.game-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(255, 107, 107, 0.4);
}
`;
  }

  protected generateYandexGamesSDK(): string {
    return `
// Yandex Games SDK Integration
class YandexGamesSDK {
    constructor() {
        this.ysdk = null;
        this.player = null;
        this.leaderboard = null;
        this.initialized = false;
    }

    async init() {
        try {
            this.ysdk = await YaGames.init();
            this.player = await this.ysdk.getPlayer();
            this.leaderboard = this.ysdk.getLeaderboards();
            this.initialized = true;
            console.log('Yandex Games SDK инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации Yandex Games SDK:', error);
        }
    }

    async showRewardedAd() {
        if (!this.ysdk) return false;
        
        try {
            await this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        console.log('Реклама открыта');
                        if (game && game.scene && game.scene.isActive('GameScene')) {
                            game.scene.pause('GameScene');
                        }
                    },
                    onRewarded: () => {
                        console.log('Награда получена');
                        if (window.gameInstance) {
                            window.gameInstance.addReward();
                        }
                    },
                    onClose: () => {
                        console.log('Реклама закрыта');
                        if (game && game.scene && game.scene.isPaused('GameScene')) {
                            game.scene.resume('GameScene');
                        }
                    },
                    onError: (error) => {
                        console.error('Ошибка рекламы:', error);
                        if (game && game.scene && game.scene.isPaused('GameScene')) {
                            game.scene.resume('GameScene');
                        }
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('Ошибка показа рекламы:', error);
            return false;
        }
    }

    async showInterstitialAd() {
        if (!this.ysdk) return;
        
        try {
            await this.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        if (game && game.scene && game.scene.isActive('GameScene')) {
                            game.scene.pause('GameScene');
                        }
                    },
                    onClose: () => {
                        if (game && game.scene && game.scene.isPaused('GameScene')) {
                            game.scene.resume('GameScene');
                        }
                    },
                    onError: (error) => {
                        console.error('Ошибка межстраничной рекламы:', error);
                    }
                }
            });
        } catch (error) {
            console.error('Ошибка показа межстраничной рекламы:', error);
        }
    }

    async saveScore(score) {
        if (!this.leaderboard) return;
        
        try {
            await this.leaderboard.setLeaderboardScore('main', score);
            console.log('Результат сохранен:', score);
        } catch (error) {
            console.error('Ошибка сохранения результата:', error);
        }
    }

    async getLeaderboard() {
        if (!this.leaderboard) return null;
        
        try {
            const result = await this.leaderboard.getLeaderboardEntries('main', {
                includeUser: true,
                quantityAround: 5,
                quantityTop: 10
            });
            return result;
        } catch (error) {
            console.error('Ошибка получения таблицы лидеров:', error);
            return null;
        }
    }
}

// Глобальный экземпляр SDK
window.yandexSDK = new YandexGamesSDK();
`;
  }

  protected generateBaseSounds(): string {
    return `
// Звуковая система
class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {};
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        this.muted = false;
    }

    preload() {
        // Звуки будут загружены из base64 или URL
        this.loadSounds();
    }

    loadSounds() {
        // Звук прыжка/действия
        this.scene.load.audio('jump', ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQeATuF0fPJdiMFl2a27+CVSA']);
        
        // Звук монеты/бонуса  
        this.scene.load.audio('coin', ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQeATuF0fPJdiMFl2a27+CVSA']);
        
        // Звук смерти/урона
        this.scene.load.audio('hurt', ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQeATuF0fPJdiMFl2a27+CVSA']);
    }

    create() {
        Object.keys(this.sounds).forEach(key => {
            if (this.scene.cache.audio.exists(key)) {
                this.sounds[key] = this.scene.sound.add(key, { volume: this.soundVolume });
            }
        });
    }

    play(key, config = {}) {
        if (this.muted) return;
        
        if (this.sounds[key]) {
            this.sounds[key].play({
                volume: this.soundVolume,
                ...config
            });
        }
    }

    setVolume(volume) {
        this.soundVolume = volume;
        Object.values(this.sounds).forEach(sound => {
            sound.setVolume(volume);
        });
    }

    mute() {
        this.muted = true;
        this.scene.sound.mute = true;
    }

    unmute() {
        this.muted = false;
        this.scene.sound.mute = false;
    }
}
`;
  }

  protected generateBasePhysics(): string {
    return `
// Базовая физика и коллизии
class PhysicsHelper {
    static setupCollision(object1, object2, callback, context) {
        if (context.physics && context.physics.world) {
            context.physics.add.overlap(object1, object2, callback, null, context);
        }
    }

    static enablePhysics(scene, object, options = {}) {
        scene.physics.add.existing(object);
        
        if (options.bounceX !== undefined) {
            object.body.setBounceX(options.bounceX);
        }
        if (options.bounceY !== undefined) {
            object.body.setBounceY(options.bounceY);
        }
        if (options.dragX !== undefined) {
            object.body.setDragX(options.dragX);
        }
        if (options.gravity !== undefined) {
            object.body.setGravityY(options.gravity);
        }
        if (options.maxVelocityX !== undefined) {
            object.body.setMaxVelocityX(options.maxVelocityX);
        }
        if (options.collideWorldBounds !== undefined) {
            object.body.setCollideWorldBounds(options.collideWorldBounds);
        }
        
        return object;
    }

    static createPlatform(scene, x, y, width, height, color = 0x654321) {
        const platform = scene.add.rectangle(x, y, width, height, color);
        scene.physics.add.existing(platform, true); // true для статичного тела
        return platform;
    }
}
`;
  }

  // Генерация ассетов по умолчанию
  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'player', prompt: `Pixel art sprite of ${design.character.description}, ${design.artStyle} style, transparent background, 32x32 pixels` },
        { name: 'enemy', prompt: `Pixel art enemy sprite, ${design.artStyle} style, threatening appearance, transparent background, 32x32 pixels` },
        { name: 'collectible', prompt: `Pixel art collectible item, ${design.artStyle} style, bright and appealing, transparent background, 24x24 pixels` }
      ],
      sounds: [
        { name: 'jump', prompt: 'Short jumping sound effect, 8-bit style, upbeat' },
        { name: 'coin', prompt: 'Coin collection sound, positive chime, brief' },
        { name: 'hurt', prompt: 'Damage sound effect, negative tone, short' }
      ],
      backgrounds: [
        { name: 'background', prompt: `Game background for ${design.theme}, ${design.artStyle} style, suitable for ${this.genre} game` }
      ]
    };
  }
} 