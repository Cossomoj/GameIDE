import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class ArcadeTemplate extends BaseGameTemplate {
  name = 'arcade';
  genre = 'arcade';
  description = 'Быстрая аркадная игра с постоянно увеличивающейся сложностью';

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

// Главный класс аркадной игры
class ArcadeGame {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.speed = 100;
        this.spawnRate = 2000; // Интервал появления препятствий в мс
        this.difficulty = 1;
        
        // Настройки игры
        this.config = {
            playerSpeed: 300,
            maxSpeed: 500,
            speedIncrease: 10,
            spawnRateDecrease: 50,
            pointsPerSecond: 1,
            bonusPoints: 50
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
        
        // Увеличиваем сложность каждые 100 очков
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.increaseDifficulty();
        }
        
        // Сохраняем результат в Yandex Games
        if (window.yandexSDK && window.yandexSDK.initialized) {
            window.yandexSDK.saveScore(this.score);
        }
    }

    increaseDifficulty() {
        this.speed = Math.min(this.speed + this.config.speedIncrease, this.config.maxSpeed);
        this.spawnRate = Math.max(this.spawnRate - this.config.spawnRateDecrease, 500);
        this.difficulty = this.level;
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('lives-value').textContent = this.lives;
        
        // Обновляем индикатор уровня
        const levelElement = document.getElementById('level-value');
        if (levelElement) {
            levelElement.textContent = this.level;
        }
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
class ArcadeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ArcadeScene' });
    }

    preload() {
        this.createSimpleSprites();
        
        // Инициализируем звуковой менеджер
        this.soundManager = new SoundManager(this);
        this.soundManager.preload();
    }

    createSimpleSprites() {
        // Игрок - яркий квадрат
        this.add.graphics()
            .fillStyle(${design.character.primaryColor || '0x00FF00'})
            .fillRect(0, 0, 32, 32)
            .generateTexture('player', 32, 32);

        // Препятствие - красный треугольник
        this.add.graphics()
            .fillStyle(0xFF0000)
            .beginPath()
            .moveTo(16, 0)
            .lineTo(32, 32)
            .lineTo(0, 32)
            .closePath()
            .fillPath()
            .generateTexture('obstacle', 32, 32);

        // Бонус - золотая звезда
        this.add.graphics()
            .fillStyle(0xFFD700)
            .beginPath()
            .moveTo(12, 0)
            .lineTo(15, 9)
            .lineTo(24, 9)
            .lineTo(18, 15)
            .lineTo(21, 24)
            .lineTo(12, 18)
            .lineTo(3, 24)
            .lineTo(6, 15)
            .lineTo(0, 9)
            .lineTo(9, 9)
            .closePath()
            .fillPath()
            .generateTexture('bonus', 24, 24);

        // Фон с движущимися полосами
        this.add.graphics()
            .fillGradientStyle(0x000033, 0x000066, 0x000099, 0x0000CC)
            .fillRect(0, 0, 800, 600)
            .generateTexture('background', 800, 600);

        // Полоса для эффекта движения
        this.add.graphics()
            .fillStyle(0x444444)
            .fillRect(0, 0, 10, 100)
            .generateTexture('stripe', 10, 100);
    }

    create() {
        // Фон
        this.add.image(400, 300, 'background');

        // Создаем полосы для эффекта движения
        this.createMovingStripes();

        // Создаем игрока
        this.createPlayer();
        
        // Создаем группы для препятствий и бонусов
        this.createGroups();
        
        // Настраиваем управление
        this.setupControls();
        
        // Настраиваем коллизии
        this.setupCollisions();

        // Инициализируем звуки
        this.soundManager.create();

        // Запускаем таймеры
        this.startTimers();

        // Добавляем UI элементы
        this.createUI();
    }

    createMovingStripes() {
        this.stripes = this.add.group();
        
        for (let i = 0; i < 10; i++) {
            const x = i * 80;
            const stripe = this.add.image(x, 300, 'stripe');
            stripe.setAlpha(0.3);
            this.stripes.add(stripe);
        }
    }

    createPlayer() {
        this.player = this.add.sprite(100, 300, 'player');
        this.player.setScale(1.2);
        
        // Добавляем светящийся эффект
        this.player.setTint(0xFFFFFF);
        this.tweens.add({
            targets: this.player,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createGroups() {
        this.obstacles = this.add.group();
        this.bonuses = this.add.group();
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
        
        // Поддержка касаний для мобильных устройств
        this.input.on('pointerdown', (pointer) => {
            const targetY = pointer.y;
            this.movePlayerTo(targetY);
        });

        // Начинаем игру по любому нажатию
        this.input.keyboard.on('keydown', () => {
            if (!window.gameInstance.gameStarted) {
                this.startGame();
            }
        });

        this.input.on('pointerdown', () => {
            if (!window.gameInstance.gameStarted) {
                this.startGame();
            }
        });
    }

    movePlayerTo(y) {
        const clampedY = Phaser.Math.Clamp(y, 32, 568);
        
        this.tweens.add({
            targets: this.player,
            y: clampedY,
            duration: 200,
            ease: 'Power2'
        });
    }

    setupCollisions() {
        // Проверяем коллизии в update
    }

    startGame() {
        window.gameInstance.gameStarted = true;
        
        // Убираем инструкции
        if (this.instructionText) {
            this.instructionText.destroy();
        }
    }

    startTimers() {
        // Таймер добавления очков за выживание
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (window.gameInstance.gameStarted && !window.gameInstance.gameOver) {
                    window.gameInstance.updateScore(window.gameInstance.config.pointsPerSecond);
                }
            },
            loop: true
        });

        // Таймер создания препятствий
        this.obstacleTimer = this.time.addEvent({
            delay: window.gameInstance.spawnRate,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });

        // Таймер создания бонусов
        this.time.addEvent({
            delay: 5000,
            callback: this.spawnBonus,
            callbackScope: this,
            loop: true
        });
    }

    spawnObstacle() {
        if (!window.gameInstance.gameStarted || window.gameInstance.gameOver) return;

        const y = Phaser.Math.Between(32, 568);
        const obstacle = this.add.sprite(850, y, 'obstacle');
        obstacle.setScale(Phaser.Math.FloatBetween(0.8, 1.5));
        
        // Добавляем вращение
        this.tweens.add({
            targets: obstacle,
            rotation: 2 * Math.PI,
            duration: 2000,
            repeat: -1
        });

        this.obstacles.add(obstacle);

        // Обновляем интервал появления препятствий
        this.obstacleTimer.delay = window.gameInstance.spawnRate;
    }

    spawnBonus() {
        if (!window.gameInstance.gameStarted || window.gameInstance.gameOver) return;

        const y = Phaser.Math.Between(50, 550);
        const bonus = this.add.sprite(850, y, 'bonus');
        
        // Добавляем мерцание
        this.tweens.add({
            targets: bonus,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.bonuses.add(bonus);
    }

    createUI() {
        // Индикатор уровня
        const levelContainer = this.add.container(700, 50);
        const levelBg = this.add.rectangle(0, 0, 100, 40, 0x000000, 0.7);
        const levelText = this.add.text(0, 0, 'Уровень: 1', {
            fontSize: '14px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        levelContainer.add([levelBg, levelText]);
        this.levelText = levelText;

        // Полоса скорости
        this.speedBar = this.add.graphics();
        this.updateSpeedBar();

        // Инструкции
        if (!window.gameInstance.gameStarted) {
            this.instructionText = this.add.text(400, 300, 
                'Нажмите любую клавишу или\\nкасайтесь экрана для начала!\\n\\nИспользуйте стрелки или касания\\nдля управления', {
                fontSize: '24px',
                fill: '#ffffff',
                align: 'center',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            // Мерцающий эффект
            this.tweens.add({
                targets: this.instructionText,
                alpha: 0.5,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }
    }

    updateSpeedBar() {
        this.speedBar.clear();
        
        const barWidth = 200;
        const barHeight = 10;
        const x = 300;
        const y = 30;
        
        // Фон полосы
        this.speedBar.fillStyle(0x333333);
        this.speedBar.fillRect(x, y, barWidth, barHeight);
        
        // Заполнение полосы
        const progress = (window.gameInstance.speed - 100) / (window.gameInstance.config.maxSpeed - 100);
        const fillWidth = barWidth * progress;
        
        this.speedBar.fillStyle(0xFF6600);
        this.speedBar.fillRect(x, y, fillWidth, barHeight);
    }

    checkCollisions() {
        // Проверяем столкновения с препятствиями
        this.obstacles.children.entries.forEach(obstacle => {
            if (Phaser.Geom.Intersects.RectangleToRectangle(
                this.player.getBounds(),
                obstacle.getBounds()
            )) {
                this.hitObstacle(obstacle);
            }
        });

        // Проверяем столкновения с бонусами
        this.bonuses.children.entries.forEach(bonus => {
            if (Phaser.Geom.Intersects.RectangleToRectangle(
                this.player.getBounds(),
                bonus.getBounds()
            )) {
                this.collectBonus(bonus);
            }
        });
    }

    hitObstacle(obstacle) {
        obstacle.destroy();
        window.gameInstance.lives--;
        window.gameInstance.updateUI();
        this.soundManager.play('hurt');

        // Эффект тряски камеры
        this.cameras.main.shake(200, 0.01);

        // Эффект красного экрана
        const redFlash = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0.5);
        this.tweens.add({
            targets: redFlash,
            alpha: 0,
            duration: 200,
            onComplete: () => redFlash.destroy()
        });

        if (window.gameInstance.lives <= 0) {
            this.gameOver();
        }
    }

    collectBonus(bonus) {
        bonus.destroy();
        window.gameInstance.updateScore(window.gameInstance.config.bonusPoints);
        this.soundManager.play('coin');

        // Эффект сбора бонуса
        const particles = this.add.particles(bonus.x, bonus.y, 'bonus', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 5
        });

        this.time.delayedCall(300, () => particles.destroy());
    }

    gameOver() {
        window.gameInstance.gameEnd();
        
        // Останавливаем все таймеры
        this.obstacleTimer.destroy();

        // Показываем экран окончания игры
        const gameOverBg = this.add.rectangle(400, 300, 600, 400, 0x000000, 0.8);
        
        const gameOverText = this.add.text(400, 220, 'ИГРА ОКОНЧЕНА', {
            fontSize: '48px',
            fill: '#ff0000',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const finalScoreText = this.add.text(400, 280, \`Финальный счёт: \${window.gameInstance.score}\`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const levelText = this.add.text(400, 310, \`Достигнут уровень: \${window.gameInstance.level}\`, {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const restartText = this.add.text(400, 360, 'Нажмите ПРОБЕЛ для перезапуска', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Кнопка для просмотра рекламы
        const adButton = this.add.text(400, 410, 'Посмотреть рекламу (+1 жизнь)', {
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
        window.gameInstance = new ArcadeGame();
        window.gameInstance.updateUI();
        this.scene.restart();
    }

    update() {
        if (!window.gameInstance.gameStarted || window.gameInstance.gameOver) return;

        // Управление игроком
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
            this.player.y = Math.max(32, this.player.y - window.gameInstance.config.playerSpeed * 0.016);
        }
        if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
            this.player.y = Math.min(568, this.player.y + window.gameInstance.config.playerSpeed * 0.016);
        }

        // Движение препятствий
        this.obstacles.children.entries.forEach(obstacle => {
            obstacle.x -= window.gameInstance.speed * 0.016 * 60;
            
            if (obstacle.x < -32) {
                obstacle.destroy();
            }
        });

        // Движение бонусов
        this.bonuses.children.entries.forEach(bonus => {
            bonus.x -= window.gameInstance.speed * 0.016 * 40;
            
            if (bonus.x < -24) {
                bonus.destroy();
            }
        });

        // Движение полос фона
        this.stripes.children.entries.forEach(stripe => {
            stripe.x -= window.gameInstance.speed * 0.016 * 30;
            
            if (stripe.x < -10) {
                stripe.x = 810;
            }
        });

        // Проверяем коллизии
        this.checkCollisions();

        // Обновляем UI
        this.levelText.setText(\`Уровень: \${window.gameInstance.level}\`);
        this.updateSpeedBar();
    }
}

// Конфигурация игры
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#000033',
    scene: ArcadeScene
};

// Инициализация
window.addEventListener('load', async () => {
    // Инициализируем Yandex SDK
    await window.yandexSDK.init();
    
    // Создаем экземпляр игры
    window.gameInstance = new ArcadeGame();
    window.gameInstance.updateUI();
    
    // Добавляем индикатор уровня в UI
    const levelDiv = document.createElement('div');
    levelDiv.innerHTML = 'Уровень: <span id="level-value">1</span>';
    levelDiv.style.marginBottom = '10px';
    document.getElementById('ui-overlay').appendChild(levelDiv);
    
    // Запускаем игру
    const game = new Phaser.Game(config);
    window.game = game;
});
`;
  }

  private generateCSS(): string {
    return this.generateBaseCSS() + `
/* Дополнительные стили для аркадной игры */
#ui-overlay {
    background: rgba(0, 0, 50, 0.8);
    border-radius: 10px;
    padding: 15px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

#ui-overlay div {
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    margin-bottom: 5px;
}

.arcade-hint {
    position: absolute;
    bottom: 20px;
    right: 20px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    text-align: right;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

@media (max-width: 768px) {
    #ui-overlay {
        font-size: 16px;
        padding: 10px;
    }
    
    .arcade-hint {
        bottom: 10px;
        right: 10px;
        font-size: 10px;
    }
}

.speed-indicator {
    position: absolute;
    bottom: 60px;
    left: 20px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.game-effects {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999;
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { 
          name: 'player', 
          prompt: `Pixel art arcade game player sprite, ${design.character.description}, ${design.artStyle} style, bright and visible, futuristic design, transparent background, 32x32 pixels` 
        },
        { 
          name: 'obstacle', 
          prompt: `Pixel art obstacle sprite for arcade game, ${design.artStyle} style, dangerous looking, geometric shape, red color theme, transparent background, 32x32 pixels` 
        },
        { 
          name: 'bonus', 
          prompt: `Pixel art bonus item sprite, ${design.artStyle} style, star or gem shape, golden and shiny, collectible appearance, transparent background, 24x24 pixels` 
        },
        { 
          name: 'powerup', 
          prompt: `Pixel art power-up sprite, ${design.artStyle} style, special ability icon, glowing effect, transparent background, 32x32 pixels` 
        }
      ],
      sounds: [
        { name: 'collect', prompt: 'Arcade bonus collection sound, positive chime, energetic' },
        { name: 'hurt', prompt: 'Arcade damage sound, electric zap or hit, brief and clear' },
        { name: 'levelup', prompt: 'Level up sound effect, ascending tones, achievement feeling' },
        { name: 'background_music', prompt: 'Upbeat electronic arcade background music, loopable, energetic' }
      ],
      backgrounds: [
        { 
          name: 'background', 
          prompt: `Arcade game background, ${design.theme} theme, ${design.artStyle} style, space or abstract design, moving elements, neon colors` 
        }
      ]
    };
  }
} 