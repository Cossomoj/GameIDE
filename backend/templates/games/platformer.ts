import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '@/types';

export class PlatformerTemplate extends BaseGameTemplate {
  name = 'platformer';
  genre = 'platformer';
  description = 'Классический платформер с прыжками, врагами и сбором предметов';

  public generateGame(prompt: GamePrompt, design: GameDesign): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${prompt.title}</title>
    <meta name="description" content="${prompt.title} - HTML5 платформер для Yandex Games">
    <meta name="keywords" content="платформер, игра, HTML5, Yandex Games">
    
    <!-- Основные стили -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #2c3e50;
            color: #fff;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
        }
        
        #game {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        #ui-overlay {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            color: white;
            font-size: 18px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 8px;
        }
        
        .mobile-controls {
            position: fixed;
            bottom: 20px;
            width: 100%;
            display: none;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 1000;
        }
        
        .control-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.3);
            color: white;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: manipulation;
            user-select: none;
            cursor: pointer;
        }
        
        .control-button:active {
            background: rgba(255,255,255,0.4);
        }
        
        @media (max-width: 768px) {
            .mobile-controls {
                display: flex;
            }
        }
        
        .game-menu {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 2000;
            display: none;
        }
        
        .menu-button {
            background: #3498db;
            border: none;
            color: white;
            padding: 12px 24px;
            margin: 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        
        .menu-button:hover {
            background: #2980b9;
        }
        
        .reward-button {
            background: #e74c3c;
        }
        
        .reward-button:hover {
            background: #c0392b;
        }
    </style>
</head>
<body>
    <div id="game"></div>
    
    <!-- UI оверлей -->
    <div id="ui-overlay">
        <div data-i18n="game.score">Счёт</div>: <span id="score-value">0</span><br>
        <div data-i18n="game.lives">Жизни</div>: <span id="lives-value">3</span><br>
        <div data-i18n="game.level">Уровень</div>: <span id="level-value">1</span>
    </div>
    
    <!-- Мобильные элементы управления -->
    <div class="mobile-controls">
        <div class="control-button" id="left-btn">←</div>
        <div class="control-button" id="jump-btn">↑</div>
        <div class="control-button" id="right-btn">→</div>
    </div>
    
    <!-- Меню игры -->
    <div id="game-menu" class="game-menu">
        <h2 data-i18n="game.over">Игра окончена</h2>
        <p>Счёт: <span id="final-score">0</span></p>
        <button class="menu-button" id="restart-btn" data-i18n="game.restart">Начать заново</button>
        <button class="menu-button reward-button" id="reward-btn" data-i18n="ad.reward">Реклама за жизнь</button>
        <button class="menu-button" id="leaderboard-btn" data-i18n="leaderboard.title">Таблица лидеров</button>
    </div>
    
    <!-- Phaser 3 -->
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    
    <!-- Yandex Games SDK Enhanced Integration -->
    <script src="https://yandex.ru/games/sdk/v2"></script>
    
    <script>
        ${this.generateJavaScript(prompt, design)}
    </script>
</body>
</html>
`;
  }

  private generateJavaScript(prompt: GamePrompt, design: GameDesign): string {
    return `
// Главный класс игры с интеграцией Yandex Games SDK
class PlatformerGame {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.version = '1.0.0';
        
        // Настройки игры
        this.config = {
            playerSpeed: 200,
            jumpPower: 500,
            gravity: 800,
            enemySpeed: 100,
            collectiblePoints: 10
        };
        
        // Статистика для достижений
        this.stats = {
            gamesPlayed: 0,
            totalCoins: 0,
            levelTime: 0,
            levelStartTime: 0
        };
    }

    // Методы для интеграции с Yandex SDK
    addReward() {
        this.lives += 1;
        this.updateUI();
        
        // Отслеживаем событие получения награды
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('reward_received', { 
                type: 'extra_life', 
                lives: this.lives 
            });
        }
        
        console.log('🎁 Получена дополнительная жизнь');
    }

    updateScore(points) {
        this.score += points;
        this.stats.totalCoins += points / this.config.collectiblePoints;
        this.updateUI();
        
        // Проверяем достижения
        this.checkAchievements();
        
        // Сохраняем результат в лидерборды
        if (window.yandexGamesSDK && window.yandexGamesSDK.isReady()) {
            window.yandexGamesSDK.submitScore('main_score', this.score, {
                level: this.level,
                time: Date.now() - this.stats.levelStartTime
            });
        }
    }

    updateUI() {
        const scoreElement = document.getElementById('score-value');
        const livesElement = document.getElementById('lives-value');
        const levelElement = document.getElementById('level-value');
        
        if (scoreElement) scoreElement.textContent = this.score.toString();
        if (livesElement) livesElement.textContent = this.lives.toString();
        if (levelElement) levelElement.textContent = this.level.toString();
    }

    startLevel() {
        this.stats.levelStartTime = Date.now();
        
        // Отслеживаем начало уровня
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('level_start', { 
                level: this.level,
                lives: this.lives 
            });
        }
    }

    completeLevel() {
        this.stats.levelTime = Date.now() - this.stats.levelStartTime;
        this.level++;
        
        // Проверяем достижения
        this.checkAchievements();
        
        // Отслеживаем завершение уровня
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('level_complete', { 
                level: this.level - 1,
                score: this.score,
                time: this.stats.levelTime
            });
        }
        
        // Показываем межстраничную рекламу каждые 3 уровня
        if (this.level % 3 === 0 && window.yandexGamesSDK) {
            window.yandexGamesSDK.showInterstitialAd('level_complete');
        }
    }

    gameEnd() {
        this.gameOver = true;
        this.stats.gamesPlayed++;
        
        // Отслеживаем окончание игры
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('game_over', { 
                score: this.score,
                level: this.level,
                reason: this.lives <= 0 ? 'no_lives' : 'quit'
            });
        }
        
        // Показываем меню окончания игры
        this.showGameOverMenu();
        
        // Сохраняем прогресс
        this.saveProgress();
    }

    checkAchievements() {
        if (!window.yandexGamesSDK) return;
        
        // Первая победа
        if (this.score > 0 && this.stats.gamesPlayed === 0) {
            window.yandexGamesSDK.unlockAchievement('FIRST_WIN');
        }
        
        // Коллекционер (1000 очков)
        if (this.score >= 1000) {
            window.yandexGamesSDK.updateAchievementProgress('SCORE_1000', this.score);
        }
        
        // Настойчивый игрок (10 игр)
        window.yandexGamesSDK.updateAchievementProgress('PLAY_10_GAMES', this.stats.gamesPlayed);
        
        // Спидраннер (уровень за 30 секунд)
        if (this.stats.levelTime <= 30000) {
            window.yandexGamesSDK.unlockAchievement('SPEEDRUN');
        }
    }

    async saveProgress() {
        if (!window.yandexGamesSDK) return;
        
        const gameData = {
            highScore: Math.max(this.score, await this.getHighScore()),
            totalGames: this.stats.gamesPlayed,
            totalCoins: this.stats.totalCoins,
            maxLevel: this.level,
            settings: {
                sound: true,
                music: true
            },
            lastPlayed: Date.now()
        };
        
        await window.yandexGamesSDK.savePlayerData(gameData);
    }

    async getHighScore() {
        if (!window.yandexGamesSDK) return 0;
        
        const data = await window.yandexGamesSDK.loadPlayerData(['highScore']);
        return data.highScore || 0;
    }

    showGameOverMenu() {
        const menu = document.getElementById('game-menu');
        const finalScore = document.getElementById('final-score');
        
        if (menu) menu.style.display = 'block';
        if (finalScore) finalScore.textContent = this.score.toString();
    }

    hideGameOverMenu() {
        const menu = document.getElementById('game-menu');
        if (menu) menu.style.display = 'none';
    }

    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.gameStarted = true;
        
        this.updateUI();
        this.hideGameOverMenu();
        
        // Перезапускаем сцену
        if (window.game && window.game.scene) {
            window.game.scene.restart('GameScene');
        }
    }

    pause() {
        if (window.game && window.game.scene && window.game.scene.isActive('GameScene')) {
            window.game.scene.pause('GameScene');
        }
    }

    resume() {
        if (window.game && window.game.scene && window.game.scene.isPaused('GameScene')) {
            window.game.scene.resume('GameScene');
        }
    }

    setQuality(quality) {
        // Применяем настройки качества к игре
        console.log('🎮 Качество игры изменено на:', quality);
        
        if (window.game && window.game.scene) {
            const scene = window.game.scene.getScene('GameScene');
            if (scene && scene.applyQuality) {
                scene.applyQuality(quality);
            }
        }
    }

    resize(width, height) {
        if (window.game) {
            window.game.scale.resize(width, height);
        }
    }

    processPurchase(purchase) {
        console.log('💰 Обрабатываем покупку:', purchase);
        
        // Примеры обработки разных товаров
        switch (purchase.productID) {
            case 'extra_lives':
                this.lives += 5;
                break;
            case 'double_coins':
                this.config.collectiblePoints *= 2;
                break;
            case 'speed_boost':
                this.config.playerSpeed *= 1.5;
                break;
        }
        
        this.updateUI();
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
        // Игрок
        this.add.graphics()
            .fillStyle(0x3498db)
            .fillRect(0, 0, 32, 48)
            .generateTexture('player', 32, 48);

        // Платформы
        this.add.graphics()
            .fillStyle(0x2ecc71)
            .fillRect(0, 0, 64, 32)
            .generateTexture('platform', 64, 32);

        // Враги
        this.add.graphics()
            .fillStyle(0xe74c3c)
            .fillRect(0, 0, 32, 32)
            .generateTexture('enemy', 32, 32);

        // Монеты
        this.add.graphics()
            .fillStyle(0xf1c40f)
            .fillCircle(16, 16, 12)
            .generateTexture('coin', 32, 32);

        // Фон
        this.add.graphics()
            .fillGradientStyle(0x3498db, 0x3498db, 0x2980b9, 0x2980b9)
            .fillRect(0, 0, 800, 600)
            .generateTexture('background', 800, 600);
    }

    create() {
        // Фон
        this.add.image(400, 300, 'background');

        // Физика
        this.physics.world.setBounds(0, 0, 800, 600);

        // Игрок
        this.player = this.physics.add.sprite(100, 450, 'player');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(200);

        // Группы объектов
        this.platforms = this.physics.add.staticGroup();
        this.coins = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // Создаем уровень
        this.createLevel();

        // Управление
        this.setupControls();

        // Коллизии
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.collider(this.player, this.enemies, this.hitPlayer, null, this);

        // Начинаем уровень
        if (window.gameInstance) {
            window.gameInstance.startLevel();
        }
    }

    createLevel() {
        // Основная платформа
        this.platforms.create(400, 568, 'platform').setScale(12.5, 1).refreshBody();
        
        // Платформы уровня
        this.platforms.create(600, 400, 'platform');
        this.platforms.create(50, 250, 'platform');
        this.platforms.create(750, 220, 'platform');

        // Монеты
        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(50, 750);
            const y = Phaser.Math.Between(100, 400);
            const coin = this.coins.create(x, y, 'coin');
            coin.setBounce(Phaser.Math.FloatBetween(0.4, 0.8));
        }

        // Враги
        for (let i = 0; i < 3; i++) {
            const x = Phaser.Math.Between(200, 600);
            const enemy = this.enemies.create(x, 450, 'enemy');
            enemy.setBounce(1);
            enemy.setCollideWorldBounds(true);
            enemy.setVelocity(Phaser.Math.Between(-200, 200), 20);
        }
    }

    setupControls() {
        // Клавиатура
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');

        // Мобильные элементы управления
        this.setupMobileControls();
    }

    setupMobileControls() {
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const jumpBtn = document.getElementById('jump-btn');

        if (leftBtn) {
            leftBtn.addEventListener('touchstart', () => this.mobileControls.left = true);
            leftBtn.addEventListener('touchend', () => this.mobileControls.left = false);
        }

        if (rightBtn) {
            rightBtn.addEventListener('touchstart', () => this.mobileControls.right = true);
            rightBtn.addEventListener('touchend', () => this.mobileControls.right = false);
        }

        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', () => this.mobileControls.jump = true);
            jumpBtn.addEventListener('touchend', () => this.mobileControls.jump = false);
        }

        this.mobileControls = {
            left: false,
            right: false,
            jump: false
        };
    }

    collectCoin(player, coin) {
        coin.disableBody(true, true);
        
        if (window.gameInstance) {
            window.gameInstance.updateScore(window.gameInstance.config.collectiblePoints);
        }
        
        this.soundManager.play('collect');
        
        // Проверяем завершение уровня
        if (this.coins.countActive(true) === 0) {
            this.completeLevel();
        }
    }

    hitPlayer(player, enemy) {
        if (window.gameInstance) {
            window.gameInstance.lives--;
            window.gameInstance.updateUI();
            
            if (window.gameInstance.lives <= 0) {
                window.gameInstance.gameEnd();
            } else {
                // Отбрасываем игрока
                player.setTint(0xff0000);
                this.time.delayedCall(500, () => {
                    player.clearTint();
                });
                
                // Временная неуязвимость
                player.setPosition(100, 450);
            }
        }
        
        this.soundManager.play('hurt');
    }

    completeLevel() {
        if (window.gameInstance) {
            window.gameInstance.completeLevel();
        }
        
        // Создаем новый уровень
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }

    update() {
        if (window.gameInstance && window.gameInstance.gameOver) return;

        // Управление игроком
        const isLeft = this.cursors.left.isDown || this.wasdKeys.A.isDown || this.mobileControls.left;
        const isRight = this.cursors.right.isDown || this.wasdKeys.D.isDown || this.mobileControls.right;
        const isJump = this.cursors.up.isDown || this.wasdKeys.W.isDown || this.mobileControls.jump;

        if (isLeft) {
            this.player.setVelocityX(-window.gameInstance.config.playerSpeed);
        } else if (isRight) {
            this.player.setVelocityX(window.gameInstance.config.playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        if (isJump && this.player.body.touching.down) {
            this.player.setVelocityY(-window.gameInstance.config.jumpPower);
            this.soundManager.play('jump');
        }

        // Проверяем, не упал ли игрок
        if (this.player.y > 650) {
            this.hitPlayer(this.player, null);
        }
    }

    applyQuality(quality) {
        // Применяем настройки качества
        switch (quality) {
            case 'low':
                this.physics.world.timeScale = 0.8;
                break;
            case 'medium':
                this.physics.world.timeScale = 0.9;
                break;
            case 'high':
                this.physics.world.timeScale = 1.0;
                break;
        }
    }
}

// Менеджер звуков
class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {};
        this.enabled = true;
    }

    preload() {
        // Создаем простые звуки
        this.createSimpleSounds();
    }

    createSimpleSounds() {
        // В реальной игре здесь будут загружаться звуковые файлы
        // Пока используем заглушки
        this.sounds.jump = null;
        this.sounds.collect = null;
        this.sounds.hurt = null;
    }

    play(soundName) {
        if (!this.enabled) return;
        
        // Простая эмуляция звуков через Web Audio API
        try {
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            switch (soundName) {
                case 'jump':
                    oscillator.frequency.setValueAtTime(440, context.currentTime);
                    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.1);
                    break;
                case 'collect':
                    oscillator.frequency.setValueAtTime(523, context.currentTime);
                    oscillator.frequency.setValueAtTime(659, context.currentTime + 0.1);
                    break;
                case 'hurt':
                    oscillator.frequency.setValueAtTime(200, context.currentTime);
                    oscillator.frequency.setValueAtTime(100, context.currentTime + 0.2);
                    break;
            }
            
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } catch (error) {
            console.warn('Звук недоступен:', error);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
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
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Инициализация игры...');
    
    // Ждем инициализации Yandex SDK
    while (!window.yandexGamesSDK || !window.yandexGamesSDK.isReady()) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🚀 Yandex Games SDK готов, запускаем игру');
    
    // Создаем экземпляр игры
    window.gameInstance = new PlatformerGame();
    window.gameInstance.updateUI();
    
    // Загружаем сохраненный прогресс
    const savedData = await window.gameInstance.loadPlayerData();
    if (savedData && savedData.highScore) {
        console.log('💾 Загружен прогресс, лучший результат:', savedData.highScore);
    }
    
    // Запускаем Phaser игру
    window.game = new Phaser.Game(config);
    
    // Настраиваем UI события
    setupUIEvents();
    
    // Отслеживаем начало игры
    window.yandexGamesSDK.trackGameEvent('game_start', { 
        platform: window.yandexGamesSDK.deviceInfo?.type || 'unknown' 
    });
});

// Настройка UI событий
function setupUIEvents() {
    const restartBtn = document.getElementById('restart-btn');
    const rewardBtn = document.getElementById('reward-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            window.gameInstance.restart();
        });
    }
    
    if (rewardBtn) {
        rewardBtn.addEventListener('click', () => {
            if (window.yandexGamesSDK) {
                window.yandexGamesSDK.showRewardedVideo('extra_life', () => {
                    window.gameInstance.addReward();
                });
            }
        });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', async () => {
            if (window.yandexGamesSDK) {
                const leaderboard = await window.yandexGamesSDK.getLeaderboard('main_score');
                console.log('🏆 Таблица лидеров:', leaderboard);
                // Здесь можно показать UI с таблицей лидеров
            }
        });
    }
}

// Экспортируем для доступа из SDK
window.PlatformerGame = PlatformerGame;
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