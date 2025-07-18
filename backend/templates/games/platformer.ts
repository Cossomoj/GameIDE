import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class PlatformerTemplate extends BaseGameTemplate {
  name = 'platformer';
  genre = 'platformer';
  description = 'Классический платформер с прыжками, врагами и сбором предметов';

  generateCode(prompt: GamePrompt, design: GameDesign) {
    const js = this.generateJavaScript(prompt, design);
    const css = this.generateCSS();
    const html = this.generateHTML(prompt.title, js, css);

    return { html, js, css };
  }

  private generateJavaScript(prompt: GamePrompt, design: GameDesign): string {
    return `
${this.generateYandexGamesSDK()}
${this.generateBaseSounds()}
${this.generateBasePhysics()}

// Главный класс игры
class PlatformerGame {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        
        // Настройки игры
        this.config = {
            playerSpeed: 200,
            jumpPower: 500,
            gravity: 800,
            enemySpeed: 100,
            collectiblePoints: 10
        };
    }

    addReward() {
        // Награда за просмотр рекламы
        this.lives += 1;
        this.updateUI();
    }

    updateScore(points) {
        this.score += points;
        this.updateUI();
        
        // Сохраняем результат в Yandex Games
        if (window.yandexSDK && window.yandexSDK.initialized) {
            window.yandexSDK.saveScore(this.score);
        }
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('lives-value').textContent = this.lives;
    }

    gameEnd() {
        this.gameOver = true;
        
        // Показываем межстраничную рекламу при окончании игры
        if (window.yandexSDK && window.yandexSDK.initialized) {
            window.yandexSDK.showInterstitialAd();
        }
    }
}

// Главная сцена игры
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Создаем простые цветные спрайты
        this.createSimpleSprites();
        
        // Инициализируем звуковой менеджер
        this.soundManager = new SoundManager(this);
        this.soundManager.preload();
    }

    createSimpleSprites() {
        // Создаем простые цветные прямоугольники как спрайты
        this.add.graphics()
            .fillStyle(${design.character.primaryColor || '0x4CAF50'})
            .fillRect(0, 0, 32, 32)
            .generateTexture('player', 32, 32);

        this.add.graphics()
            .fillStyle(0xFF5722)
            .fillRect(0, 0, 32, 32)
            .generateTexture('enemy', 32, 32);

        this.add.graphics()
            .fillStyle(0xFFEB3B)
            .fillCircle(12, 12, 12)
            .generateTexture('coin', 24, 24);

        this.add.graphics()
            .fillStyle(0x8BC34A)
            .fillRect(0, 0, 100, 20)
            .generateTexture('platform', 100, 20);

        // Фон
        this.add.graphics()
            .fillGradientStyle(0x87CEEB, 0x87CEEB, 0x98FB98, 0x98FB98)
            .fillRect(0, 0, 800, 600)
            .generateTexture('background', 800, 600);
    }

    create() {
        // Фон
        this.add.image(400, 300, 'background');

        // Инициализируем физику
        this.physics.world.gravity.y = window.gameInstance.config.gravity;

        // Создаем игрока
        this.createPlayer();
        
        // Создаем платформы
        this.createPlatforms();
        
        // Создаем врагов
        this.createEnemies();
        
        // Создаем предметы для сбора
        this.createCollectibles();
        
        // Настраиваем управление
        this.setupControls();
        
        // Настраиваем коллизии
        this.setupCollisions();

        // Инициализируем звуки
        this.soundManager.create();
    }

    createPlayer() {
        this.player = this.physics.add.sprite(100, 450, 'player');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.setMaxVelocity(window.gameInstance.config.playerSpeed, 1000);
    }

    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        
        // Земля
        for (let x = 0; x < 800; x += 100) {
            this.platforms.create(x + 50, 580, 'platform');
        }
        
        // Платформы на разных уровнях
        this.platforms.create(200, 450, 'platform');
        this.platforms.create(400, 350, 'platform');
        this.platforms.create(600, 250, 'platform');
        this.platforms.create(150, 250, 'platform');
        this.platforms.create(500, 150, 'platform');
    }

    createEnemies() {
        this.enemies = this.physics.add.group();
        
        // Создаем несколько врагов
        const enemyPositions = [
            { x: 300, y: 400 },
            { x: 500, y: 300 },
            { x: 700, y: 520 }
        ];

        enemyPositions.forEach(pos => {
            const enemy = this.enemies.create(pos.x, pos.y, 'enemy');
            enemy.setBounce(1);
            enemy.setCollideWorldBounds(true);
            enemy.setVelocity(Phaser.Math.Between(-window.gameInstance.config.enemySpeed, window.gameInstance.config.enemySpeed), 0);
        });
    }

    createCollectibles() {
        this.collectibles = this.physics.add.group();
        
        // Размещаем монеты на платформах
        const coinPositions = [
            { x: 200, y: 400 },
            { x: 400, y: 300 },
            { x: 600, y: 200 },
            { x: 150, y: 200 },
            { x: 500, y: 100 },
            { x: 350, y: 520 },
            { x: 650, y: 520 }
        ];

        coinPositions.forEach(pos => {
            const coin = this.collectibles.create(pos.x, pos.y, 'coin');
            coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
        
        // Поддержка касаний для мобильных устройств
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < 400) {
                // Левая половина экрана - движение влево
                this.player.setVelocityX(-window.gameInstance.config.playerSpeed);
            } else {
                // Правая половина экрана - прыжок или движение вправо
                if (this.player.body.touching.down) {
                    this.player.setVelocityY(-window.gameInstance.config.jumpPower);
                    this.soundManager.play('jump');
                } else {
                    this.player.setVelocityX(window.gameInstance.config.playerSpeed);
                }
            }
        });
    }

    setupCollisions() {
        // Игрок и платформы
        this.physics.add.collider(this.player, this.platforms);
        
        // Враги и платформы
        this.physics.add.collider(this.enemies, this.platforms);
        
        // Игрок и враги
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        
        // Игрок и предметы для сбора
        this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    }

    hitEnemy(player, enemy) {
        // Проверяем, находится ли игрок сверху врага
        if (player.body.velocity.y > 0 && player.y < enemy.y) {
            // Игрок прыгнул на врага
            enemy.destroy();
            player.setVelocityY(-200); // Небольшой отскок
            window.gameInstance.updateScore(50);
            this.soundManager.play('coin');
        } else {
            // Игрок получил урон
            this.hitPlayer();
        }
    }

    hitPlayer() {
        window.gameInstance.lives--;
        window.gameInstance.updateUI();
        this.soundManager.play('hurt');
        
        if (window.gameInstance.lives <= 0) {
            this.gameOver();
        } else {
            // Временная неуязвимость
            this.player.setTint(0xff0000);
            this.player.setAlpha(0.5);
            
            this.time.delayedCall(1000, () => {
                this.player.clearTint();
                this.player.setAlpha(1);
            });
            
            // Возвращаем игрока на начальную позицию
            this.player.setPosition(100, 450);
            this.player.setVelocity(0, 0);
        }
    }

    collectItem(player, item) {
        item.destroy();
        window.gameInstance.updateScore(window.gameInstance.config.collectiblePoints);
        this.soundManager.play('coin');
        
        // Проверяем, собраны ли все предметы
        if (this.collectibles.countActive() === 0) {
            this.nextLevel();
        }
    }

    nextLevel() {
        window.gameInstance.level++;
        
        // Увеличиваем сложность
        window.gameInstance.config.enemySpeed += 20;
        window.gameInstance.config.collectiblePoints += 5;
        
        // Перезапускаем сцену
        this.scene.restart();
    }

    gameOver() {
        window.gameInstance.gameEnd();
        
        // Показываем экран окончания игры
        const gameOverText = this.add.text(400, 250, 'ИГРА ОКОНЧЕНА', {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const finalScoreText = this.add.text(400, 300, \`Финальный счёт: \${window.gameInstance.score}\`, {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const restartText = this.add.text(400, 350, 'Нажмите ПРОБЕЛ для перезапуска', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Кнопка для просмотра рекламы и получения дополнительной жизни
        const adButton = this.add.text(400, 400, 'Посмотреть рекламу (+1 жизнь)', {
            fontSize: '18px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        adButton.on('pointerdown', () => {
            if (window.yandexSDK && window.yandexSDK.initialized) {
                window.yandexSDK.showRewardedAd();
            }
        });

        // Перезапуск игры
        this.input.keyboard.once('keydown-SPACE', () => {
            this.restartGame();
        });
    }

    restartGame() {
        window.gameInstance = new PlatformerGame();
        window.gameInstance.updateUI();
        this.scene.restart();
    }

    update() {
        if (window.gameInstance.gameOver) return;

        // Управление игроком
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
            this.player.setVelocityX(-window.gameInstance.config.playerSpeed);
        } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
            this.player.setVelocityX(window.gameInstance.config.playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        if ((this.cursors.up.isDown || this.wasdKeys.W.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-window.gameInstance.config.jumpPower);
            this.soundManager.play('jump');
        }

        // Проверяем, не упал ли игрок
        if (this.player.y > 650) {
            this.hitPlayer();
        }
    }
}

// Конфигурация игры
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#2c3e50',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: GameScene
};

// Инициализация
window.addEventListener('load', async () => {
    // Инициализируем Yandex SDK
    await window.yandexSDK.init();
    
    // Создаем экземпляр игры
    window.gameInstance = new PlatformerGame();
    window.gameInstance.updateUI();
    
    // Запускаем игру
    const game = new Phaser.Game(config);
    window.game = game;
});
`;
  }

  private generateCSS(): string {
    return this.generateBaseCSS() + `
/* Дополнительные стили для платформера */
#ui-overlay {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: calc(100% - 40px);
    top: 20px;
    left: 20px;
}

#ui-overlay > div {
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 12px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.level-indicator {
    position: absolute;
    top: 20px;
    right: 20px;
    color: white;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 12px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.mobile-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: none;
    gap: 20px;
}

@media (max-width: 768px) {
    .mobile-controls {
        display: flex;
    }
    
    #game {
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        border-radius: 0 !important;
    }
    
    #game-container {
        padding: 0;
    }
}

.control-hint {
    position: absolute;
    bottom: 20px;
    left: 20px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

@media (min-width: 769px) {
    .control-hint::after {
        content: "Используйте стрелки или WASD для управления";
    }
}

@media (max-width: 768px) {
    .control-hint::after {
        content: "Касайтесь экрана для управления";
    }
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { 
          name: 'player', 
          prompt: `Pixel art platformer character sprite, ${design.character.description}, ${design.artStyle} style, hero appearance, standing pose, transparent background, 32x32 pixels` 
        },
        { 
          name: 'enemy', 
          prompt: `Pixel art enemy sprite for platformer game, ${design.artStyle} style, menacing creature, simple design, transparent background, 32x32 pixels` 
        },
        { 
          name: 'coin', 
          prompt: `Pixel art collectible coin or gem, ${design.artStyle} style, golden and shiny, circular, transparent background, 24x24 pixels` 
        },
        { 
          name: 'platform', 
          prompt: `Pixel art platform tile for platformer game, ${design.artStyle} style, solid ground texture, tileable, 32x32 pixels` 
        }
      ],
      sounds: [
        { name: 'jump', prompt: 'Platformer jump sound effect, bouncy and energetic, 8-bit style' },
        { name: 'coin', prompt: 'Coin collection sound, positive chime, rewarding tone' },
        { name: 'hurt', prompt: 'Player damage sound, negative but not harsh, brief' },
        { name: 'enemy_defeat', prompt: 'Enemy defeat sound, satisfying pop or squish' }
      ],
      backgrounds: [
        { 
          name: 'background', 
          prompt: `Platformer game background, ${design.theme} theme, ${design.artStyle} style, parallax-friendly, sky and landscape elements, vibrant colors` 
        }
      ]
    };
  }
} 