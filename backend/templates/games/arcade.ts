import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '@/types';

export class ArcadeTemplate extends BaseGameTemplate {
  name = 'arcade';
  genre = 'arcade';
  description = 'Быстрая аркадная игра с постоянно увеличивающейся сложностью';

  public generateGame(prompt: GamePrompt, design: GameDesign): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${prompt.title}</title>
    <meta name="description" content="${prompt.title} - HTML5 аркада для Yandex Games">
    <meta name="keywords" content="аркада, игра, HTML5, Yandex Games">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #000033;
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
            justify-content: center;
            gap: 20px;
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
            background: #e74c3c;
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
            background: #c0392b;
        }
        
        .reward-button {
            background: #f39c12;
        }
        
        .reward-button:hover {
            background: #e67e22;
        }
    </style>
</head>
<body>
    <div id="game"></div>
    
    <!-- UI оверлей -->
    <div id="ui-overlay">
        <div data-i18n="game.score">Счёт</div>: <span id="score-value">0</span><br>
        <div data-i18n="game.lives">Жизни</div>: <span id="lives-value">3</span><br>
        <div data-i18n="game.level">Уровень</div>: <span id="level-value">1</span><br>
        <div>Скорость: <span id="speed-value">1</span></div>
    </div>
    
    <!-- Мобильные элементы управления -->
    <div class="mobile-controls">
        <div class="control-button" id="left-btn">←</div>
        <div class="control-button" id="right-btn">→</div>
        <div class="control-button" id="fire-btn">🔥</div>
    </div>
    
    <!-- Меню игры -->
    <div id="game-menu" class="game-menu">
        <h2 data-i18n="game.over">Игра окончена</h2>
        <p>Счёт: <span id="final-score">0</span></p>
        <button class="menu-button" id="restart-btn" data-i18n="game.restart">Начать заново</button>
        <button class="menu-button reward-button" id="reward-btn" data-i18n="ad.reward">Реклама за продолжение</button>
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
// Главный класс аркадной игры с интеграцией Yandex Games SDK
class ArcadeGame {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.speed = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.version = '1.0.0';
        
        // Настройки игры
        this.config = {
            playerSpeed: 300,
            bulletSpeed: 400,
            enemySpeed: 100,
            enemySpawnRate: 2000, // миллисекунды
            powerUpChance: 0.1
        };
        
        // Статистика для достижений
        this.stats = {
            gamesPlayed: 0,
            enemiesDestroyed: 0,
            bulletsShot: 0,
            powerUpsCollected: 0,
            survivalTime: 0,
            gameStartTime: 0
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
        this.updateUI();
        
        // Проверяем достижения
        this.checkAchievements();
        
        // Сохраняем результат в лидерборды
        if (window.yandexGamesSDK && window.yandexGamesSDK.isReady()) {
            window.yandexGamesSDK.submitScore('arcade_score', this.score, {
                level: this.level,
                enemiesDestroyed: this.stats.enemiesDestroyed
            });
        }
    }

    updateUI() {
        const scoreElement = document.getElementById('score-value');
        const livesElement = document.getElementById('lives-value');
        const levelElement = document.getElementById('level-value');
        const speedElement = document.getElementById('speed-value');
        
        if (scoreElement) scoreElement.textContent = this.score.toString();
        if (livesElement) livesElement.textContent = this.lives.toString();
        if (levelElement) levelElement.textContent = this.level.toString();
        if (speedElement) speedElement.textContent = this.speed.toFixed(1);
    }

    startGame() {
        this.stats.gameStartTime = Date.now();
        
        // Отслеживаем начало игры
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('game_start', { 
                level: this.level,
                lives: this.lives 
            });
        }
    }

    levelUp() {
        this.level++;
        this.speed += 0.2;
        this.config.enemySpawnRate = Math.max(500, this.config.enemySpawnRate - 100);
        
        // Проверяем достижения
        this.checkAchievements();
        
        // Отслеживаем повышение уровня
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('level_up', { 
                level: this.level,
                score: this.score,
                speed: this.speed
            });
        }
        
        // Показываем межстраничную рекламу каждые 5 уровней
        if (this.level % 5 === 0 && window.yandexGamesSDK) {
            window.yandexGamesSDK.showInterstitialAd('level_up');
        }
    }

    destroyEnemy() {
        this.stats.enemiesDestroyed++;
        this.updateScore(10 * this.level);
        
        // Повышение уровня каждые 10 врагов
        if (this.stats.enemiesDestroyed % 10 === 0) {
            this.levelUp();
        }
    }

    gameEnd() {
        this.gameOver = true;
        this.stats.gamesPlayed++;
        this.stats.survivalTime = Date.now() - this.stats.gameStartTime;
        
        // Отслеживаем окончание игры
        if (window.yandexGamesSDK) {
            window.yandexGamesSDK.trackGameEvent('game_over', { 
                score: this.score,
                level: this.level,
                survivalTime: this.stats.survivalTime,
                enemiesDestroyed: this.stats.enemiesDestroyed,
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
        
        // Уничтожитель (100 врагов)
        if (this.stats.enemiesDestroyed >= 100) {
            window.yandexGamesSDK.updateAchievementProgress('DESTROY_100_ENEMIES', this.stats.enemiesDestroyed);
        }
        
        // Снайпер (высокая точность)
        const accuracy = this.stats.bulletsShot > 0 ? this.stats.enemiesDestroyed / this.stats.bulletsShot : 0;
        if (accuracy >= 0.8 && this.stats.bulletsShot >= 50) {
            window.yandexGamesSDK.unlockAchievement('SNIPER');
        }
        
        // Выживший (5 минут)
        if (this.stats.survivalTime >= 300000) {
            window.yandexGamesSDK.unlockAchievement('SURVIVOR');
        }
    }

    async saveProgress() {
        if (!window.yandexGamesSDK) return;
        
        const gameData = {
            highScore: Math.max(this.score, await this.getHighScore()),
            totalGames: this.stats.gamesPlayed,
            totalEnemiesDestroyed: this.stats.enemiesDestroyed,
            maxLevel: this.level,
            bestSurvivalTime: Math.max(this.stats.survivalTime, await this.getBestSurvivalTime()),
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

    async getBestSurvivalTime() {
        if (!window.yandexGamesSDK) return 0;
        
        const data = await window.yandexGamesSDK.loadPlayerData(['bestSurvivalTime']);
        return data.bestSurvivalTime || 0;
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
        this.speed = 1;
        this.gameOver = false;
        this.gameStarted = true;
        
        // Сброс статистики
        this.stats.enemiesDestroyed = 0;
        this.stats.bulletsShot = 0;
        this.stats.powerUpsCollected = 0;
        this.stats.survivalTime = 0;
        
        this.updateUI();
        this.hideGameOverMenu();
        
        // Перезапускаем сцену
        if (window.game && window.game.scene) {
            window.game.scene.restart('ArcadeScene');
        }
    }

    pause() {
        if (window.game && window.game.scene && window.game.scene.isActive('ArcadeScene')) {
            window.game.scene.pause('ArcadeScene');
        }
    }

    resume() {
        if (window.game && window.game.scene && window.game.scene.isPaused('ArcadeScene')) {
            window.game.scene.resume('ArcadeScene');
        }
    }

    setQuality(quality) {
        console.log('🎮 Качество игры изменено на:', quality);
        
        if (window.game && window.game.scene) {
            const scene = window.game.scene.getScene('ArcadeScene');
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
        
        switch (purchase.productID) {
            case 'extra_lives':
                this.lives += 3;
                break;
            case 'power_boost':
                this.config.playerSpeed *= 1.5;
                this.config.bulletSpeed *= 1.5;
                break;
            case 'shield':
                // Временная неуязвимость
                break;
        }
        
        this.updateUI();
    }
}

// Главная сцена аркадной игры
class ArcadeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ArcadeScene' });
    }

    preload() {
        this.createSimpleSprites();
        this.soundManager = new SoundManager(this);
        this.soundManager.preload();
    }

    createSimpleSprites() {
        // Игрок (космический корабль)
        this.add.graphics()
            .fillStyle(0x00ff00)
            .fillTriangle(16, 0, 0, 32, 32, 32)
            .generateTexture('player', 32, 32);

        // Враги
        this.add.graphics()
            .fillStyle(0xff0000)
            .fillTriangle(16, 32, 0, 0, 32, 0)
            .generateTexture('enemy', 32, 32);

        // Пули игрока
        this.add.graphics()
            .fillStyle(0xffff00)
            .fillRect(0, 0, 4, 8)
            .generateTexture('bullet', 4, 8);

        // Пули врагов
        this.add.graphics()
            .fillStyle(0xff6600)
            .fillRect(0, 0, 4, 8)
            .generateTexture('enemyBullet', 4, 8);

        // Бонусы
        this.add.graphics()
            .fillStyle(0x00ffff)
            .fillStar(16, 16, 8, 16, 8, 0)
            .generateTexture('powerUp', 32, 32);

        // Звезды для фона
        this.add.graphics()
            .fillStyle(0xffffff)
            .fillCircle(2, 2, 1)
            .generateTexture('star', 4, 4);
    }

    create() {
        // Фон со звездами
        this.createStarField();

        // Игрок
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);

        // Группы объектов
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.powerUps = this.physics.add.group();

        // Управление
        this.setupControls();

        // Коллизии
        this.setupCollisions();

        // Спавн врагов
        this.spawnTimer = this.time.addEvent({
            delay: window.gameInstance.config.enemySpawnRate,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Спавн бонусов
        this.powerUpTimer = this.time.addEvent({
            delay: 10000,
            callback: this.spawnPowerUp,
            callbackScope: this,
            loop: true
        });

        // Начинаем игру
        if (window.gameInstance) {
            window.gameInstance.startGame();
        }
    }

    createStarField() {
        this.stars = this.add.group();
        
        for (let i = 0; i < 100; i++) {
            const star = this.add.sprite(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                'star'
            );
            star.setAlpha(Phaser.Math.FloatBetween(0.1, 1.0));
            this.stars.add(star);
        }
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Мобильные элементы управления
        this.setupMobileControls();
        
        // Автоматическая стрельба
        this.fireTimer = this.time.addEvent({
            delay: 150,
            callback: this.autoFire,
            callbackScope: this,
            loop: true
        });
    }

    setupMobileControls() {
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const fireBtn = document.getElementById('fire-btn');

        this.mobileControls = {
            left: false,
            right: false,
            fire: false
        };

        if (leftBtn) {
            leftBtn.addEventListener('touchstart', () => this.mobileControls.left = true);
            leftBtn.addEventListener('touchend', () => this.mobileControls.left = false);
        }

        if (rightBtn) {
            rightBtn.addEventListener('touchstart', () => this.mobileControls.right = true);
            rightBtn.addEventListener('touchend', () => this.mobileControls.right = false);
        }

        if (fireBtn) {
            fireBtn.addEventListener('touchstart', () => this.mobileControls.fire = true);
            fireBtn.addEventListener('touchend', () => this.mobileControls.fire = false);
        }
    }

    setupCollisions() {
        // Пули игрока и враги
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        
        // Игрок и враги
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
        
        // Игрок и пули врагов
        this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, null, this);
        
        // Игрок и бонусы
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
    }

    spawnEnemy() {
        if (window.gameInstance && window.gameInstance.gameOver) return;

        const x = Phaser.Math.Between(50, 750);
        const enemy = this.enemies.create(x, -50, 'enemy');
        enemy.setVelocityY(window.gameInstance.config.enemySpeed * window.gameInstance.speed);

        // Враги стреляют случайно
        this.time.delayedCall(Phaser.Math.Between(1000, 3000), () => {
            if (enemy.active) {
                this.enemyFire(enemy);
            }
        });
    }

    spawnPowerUp() {
        if (window.gameInstance && window.gameInstance.gameOver) return;
        if (Math.random() > window.gameInstance.config.powerUpChance) return;

        const x = Phaser.Math.Between(50, 750);
        const powerUp = this.powerUps.create(x, -50, 'powerUp');
        powerUp.setVelocityY(100);
    }

    autoFire() {
        if (window.gameInstance && window.gameInstance.gameOver) return;
        if (this.spaceKey.isDown || this.mobileControls.fire) {
            this.fire();
        }
    }

    fire() {
        const bullet = this.bullets.create(this.player.x, this.player.y - 16, 'bullet');
        bullet.setVelocityY(-window.gameInstance.config.bulletSpeed);
        
        window.gameInstance.stats.bulletsShot++;
        this.soundManager.play('shoot');

        // Удаляем пулю когда она выходит за экран
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    }

    enemyFire(enemy) {
        if (!enemy.active) return;

        const bullet = this.enemyBullets.create(enemy.x, enemy.y + 16, 'enemyBullet');
        bullet.setVelocityY(200);

        // Удаляем пулю когда она выходит за экран
        this.time.delayedCall(3000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    }

    hitEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        
        if (window.gameInstance) {
            window.gameInstance.destroyEnemy();
        }
        
        this.soundManager.play('explosion');
        
        // Создаем простой эффект взрыва
        const explosion = this.add.graphics();
        explosion.fillStyle(0xffff00);
        explosion.fillCircle(enemy.x, enemy.y, 20);
        explosion.setAlpha(1);
        
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => explosion.destroy()
        });
    }

    hitPlayer(player, object) {
        if (window.gameInstance) {
            window.gameInstance.lives--;
            window.gameInstance.updateUI();
            
            if (window.gameInstance.lives <= 0) {
                window.gameInstance.gameEnd();
            } else {
                // Временная неуязвимость
                player.setTint(0xff0000);
                this.time.delayedCall(1000, () => {
                    player.clearTint();
                });
            }
        }
        
        if (object.destroy) {
            object.destroy();
        }
        
        this.soundManager.play('hit');
    }

    collectPowerUp(player, powerUp) {
        powerUp.destroy();
        
        if (window.gameInstance) {
            window.gameInstance.stats.powerUpsCollected++;
            window.gameInstance.updateScore(50);
        }
        
        // Временное усиление
        this.player.setTint(0x00ffff);
        window.gameInstance.config.bulletSpeed *= 1.5;
        
        this.time.delayedCall(5000, () => {
            this.player.clearTint();
            window.gameInstance.config.bulletSpeed /= 1.5;
        });
        
        this.soundManager.play('powerup');
    }

    update() {
        if (window.gameInstance && window.gameInstance.gameOver) return;

        // Управление игроком
        const isLeft = this.cursors.left.isDown || this.wasdKeys.A.isDown || this.mobileControls.left;
        const isRight = this.cursors.right.isDown || this.wasdKeys.D.isDown || this.mobileControls.right;

        if (isLeft) {
            this.player.setVelocityX(-window.gameInstance.config.playerSpeed);
        } else if (isRight) {
            this.player.setVelocityX(window.gameInstance.config.playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        // Движение звезд
        this.stars.children.entries.forEach(star => {
            star.y += 1 * window.gameInstance.speed;
            if (star.y > 600) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, 800);
            }
        });

        // Удаляем объекты за экраном
        this.cleanupOffScreenObjects();

        // Обновляем скорость спавна врагов
        if (this.spawnTimer) {
            this.spawnTimer.delay = window.gameInstance.config.enemySpawnRate;
        }
    }

    cleanupOffScreenObjects() {
        // Враги
        this.enemies.children.entries.forEach(enemy => {
            if (enemy.y > 650) {
                enemy.destroy();
            }
        });

        // Пули
        this.bullets.children.entries.forEach(bullet => {
            if (bullet.y < -50) {
                bullet.destroy();
            }
        });

        // Пули врагов
        this.enemyBullets.children.entries.forEach(bullet => {
            if (bullet.y > 650) {
                bullet.destroy();
            }
        });

        // Бонусы
        this.powerUps.children.entries.forEach(powerUp => {
            if (powerUp.y > 650) {
                powerUp.destroy();
            }
        });
    }

    applyQuality(quality) {
        switch (quality) {
            case 'low':
                this.stars.children.entries.forEach((star, index) => {
                    if (index % 2 === 0) star.setVisible(false);
                });
                break;
            case 'medium':
                this.stars.children.entries.forEach(star => star.setVisible(true));
                break;
            case 'high':
                this.stars.children.entries.forEach(star => star.setVisible(true));
                // Добавляем дополнительные эффекты
                break;
        }
    }
}

// Менеджер звуков для аркады
class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.sounds = {};
        this.enabled = true;
    }

    preload() {
        this.createSimpleSounds();
    }

    createSimpleSounds() {
        this.sounds.shoot = null;
        this.sounds.explosion = null;
        this.sounds.hit = null;
        this.sounds.powerup = null;
    }

    play(soundName) {
        if (!this.enabled) return;
        
        try {
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            switch (soundName) {
                case 'shoot':
                    oscillator.frequency.setValueAtTime(800, context.currentTime);
                    gainNode.gain.setValueAtTime(0.1, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.1);
                    break;
                case 'explosion':
                    oscillator.frequency.setValueAtTime(150, context.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.2, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.3);
                    break;
                case 'hit':
                    oscillator.frequency.setValueAtTime(200, context.currentTime);
                    oscillator.frequency.setValueAtTime(100, context.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.15, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.2);
                    break;
                case 'powerup':
                    oscillator.frequency.setValueAtTime(440, context.currentTime);
                    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(1320, context.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.1, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.3);
                    break;
            }
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
    backgroundColor: '#000033',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: ArcadeScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Инициализация аркадной игры...');
    
    // Ждем инициализации Yandex SDK
    while (!window.yandexGamesSDK || !window.yandexGamesSDK.isReady()) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🚀 Yandex Games SDK готов, запускаем аркадную игру');
    
    // Создаем экземпляр игры
    window.gameInstance = new ArcadeGame();
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
        gameType: 'arcade',
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
                window.yandexGamesSDK.showRewardedVideo('continue_game', () => {
                    window.gameInstance.addReward();
                });
            }
        });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', async () => {
            if (window.yandexGamesSDK) {
                const leaderboard = await window.yandexGamesSDK.getLeaderboard('arcade_score');
                console.log('🏆 Таблица лидеров аркады:', leaderboard);
            }
        });
    }
}

// Экспортируем для доступа из SDK
window.ArcadeGame = ArcadeGame;
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