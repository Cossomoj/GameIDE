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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://yandex.ru https://yastatic.net https://mc.yandex.ru data: blob:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: wss:">
    <title>${title}</title>
    
    <!-- Yandex Games SDK v2 - Обязательное подключение -->
    <script src="https://yandex.ru/games/sdk/v2"></script>
    
    <!-- Phaser 3 игровой движок -->
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    
    <style>
        ${cssContent}
        ${this.generateResponsiveCSS()}
        ${this.generateUICSS()}
    </style>
</head>
<body>
    <div id="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Загрузка игры...</div>
        <div class="loading-progress">
            <div class="loading-bar"></div>
        </div>
    </div>
    
    <div id="game-container">
        <div id="game"></div>
        <div id="ui-overlay">
            <div id="score">Очки: <span id="score-value">0</span></div>
            <div id="lives">Жизни: <span id="lives-value">3</span></div>
            <div id="level">Уровень: <span id="level-value">1</span></div>
        </div>
        
        <!-- Мобильные элементы управления -->
        <div id="mobile-controls">
            <button id="pause-btn" class="mobile-btn">⏸</button>
            <button id="sound-btn" class="mobile-btn">🔊</button>
        </div>
    </div>

    <!-- Модальные окна -->
    <div id="pause-modal" class="modal hidden">
        <div class="modal-content">
            <h2>Пауза</h2>
            <button id="resume-btn" class="game-button">Продолжить</button>
            <button id="restart-btn" class="game-button">Заново</button>
            <button id="menu-btn" class="game-button">Меню</button>
        </div>
    </div>

    <div id="game-over-modal" class="modal hidden">
        <div class="modal-content">
            <h2>Игра окончена</h2>
            <div id="final-score">Ваш результат: <span id="final-score-value">0</span></div>
            <button id="play-again-btn" class="game-button">Играть снова</button>
            <button id="share-score-btn" class="game-button">Поделиться</button>
            <button id="leaderboard-btn" class="game-button">Рекорды</button>
        </div>
    </div>

    <!-- Уведомления о достижениях -->
    <div id="achievement-notifications"></div>

    <!-- Основной скрипт Yandex SDK интеграции -->
    <script>
        ${this.generateYandexSDKIntegration()}
    </script>
    
    <!-- Основной игровой код -->
    <script>
        ${jsContent}
    </script>
</body>
</html>`;
  }

  protected generateBaseCSS(): string {
    return `
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
}

#loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    color: white;
    font-size: 18px;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    margin-bottom: 20px;
    font-weight: bold;
}

.loading-progress {
    width: 200px;
    height: 6px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    overflow: hidden;
}

.loading-bar {
    height: 100%;
    background: white;
    width: 0%;
    border-radius: 3px;
    transition: width 0.3s ease;
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
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 10px;
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
    max-width: 100vw;
    max-height: 100vh;
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
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#mobile-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.mobile-btn {
    width: 50px;
    height: 50px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.mobile-btn:hover,
.mobile-btn:active {
    background: rgba(255, 255, 255, 0.4);
    transform: scale(1.1);
}

.game-button {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    border: none;
    border-radius: 25px;
    color: white;
    font-size: 16px;
    font-weight: bold;
    padding: 12px 24px;
    margin: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    min-width: 120px;
}

.game-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.game-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(255, 107, 107, 0.4);
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5000;
    backdrop-filter: blur(5px);
}

.modal.hidden {
    display: none;
}

.modal-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    color: white;
    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 24px;
}

#final-score {
    font-size: 20px;
    margin: 20px 0;
    font-weight: bold;
}

#achievement-notifications {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 6000;
    pointer-events: none;
}
`;
  }

  protected generateResponsiveCSS(): string {
    return `
/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
    #ui-overlay {
        top: 10px;
        left: 10px;
        font-size: 16px;
    }
    
    #mobile-controls {
        top: 10px;
        right: 10px;
    }
    
    .mobile-btn {
        width: 45px;
        height: 45px;
        font-size: 18px;
    }
    
    .game-button {
        font-size: 14px;
        padding: 10px 20px;
        min-width: 100px;
    }
    
    .modal-content {
        padding: 20px;
        margin: 20px;
    }
    
    .modal-content h2 {
        font-size: 20px;
    }
    
    #game {
        border: 1px solid rgba(255, 255, 255, 0.8);
        border-radius: 5px;
    }
}

@media (max-width: 480px) {
    #ui-overlay {
        font-size: 14px;
    }
    
    .game-button {
        font-size: 12px;
        padding: 8px 16px;
        min-width: 80px;
    }
    
    .modal-content {
        padding: 15px;
        margin: 10px;
    }
}

/* Планшеты */
@media (min-width: 769px) and (max-width: 1024px) {
    #game {
        max-width: 90vw;
        max-height: 90vh;
    }
}

/* Ландшафтная ориентация */
@media (orientation: landscape) and (max-height: 500px) {
    #ui-overlay {
        top: 5px;
        left: 5px;
        font-size: 14px;
    }
    
    #mobile-controls {
        top: 5px;
        right: 5px;
    }
}
`;
  }

  protected generateUICSS(): string {
    return `
/* Стили уведомлений о достижениях */
.achievement-notification {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: inherit;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.5s ease;
    pointer-events: auto;
    max-width: 300px;
}

.achievement-notification.show {
    opacity: 1;
    transform: translateX(0);
}

.achievement-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.achievement-info {
    flex: 1;
    min-width: 0;
}

.achievement-name {
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 14px;
}

.achievement-description {
    font-size: 12px;
    opacity: 0.9;
    margin-bottom: 4px;
}

.achievement-points {
    font-size: 11px;
    opacity: 0.8;
}

/* Стили для полноэкранной рекламы */
.fullscreen-ad-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    color: white;
    font-size: 18px;
    text-align: center;
}

/* Анимации */
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.pulse {
    animation: pulse 2s infinite;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.fade-in {
    animation: fadeIn 0.5s ease;
}

/* Скрытие элементов во время рекламы */
.during-ad {
    filter: blur(5px);
    pointer-events: none;
}

/* Sticky баннер */
.yandex-sticky-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
}
`;
  }

  protected generateYandexSDKIntegration(): string {
    return `
// Yandex Games SDK v2 Правильная интеграция
class YandexGamesManager {
    constructor() {
        this.ysdk = null;
        this.player = null;
        this.leaderboards = null;
        this.payments = null;
        this.initialized = false;
        this.gameReady = false;
        
        // Состояние игры
        this.gameState = {
            isPaused: false,
            isGameActive: false,
            currentLevel: 1,
            score: 0,
            lives: 3
        };
        
        // Реклама
        this.adState = {
            interstitialCount: 0,
            maxInterstitialPerSession: 3,
            lastInterstitialTime: 0,
            interstitialCooldown: 180000, // 3 минуты
            canShowAds: true
        };
        
        // Локализация
        this.language = 'ru';
        this.region = 'ru';
        
        // Флаги инициализации
        this.initPromise = null;
        
        // Bind методы
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }

    /**
     * Инициализация SDK - ОБЯЗАТЕЛЬНЫЙ ВЫЗОВ
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initSDK();
        return this.initPromise;
    }

    async _initSDK() {
        try {
            this.log('🎮 Инициализация Yandex Games SDK v2...');
            
            // Проверяем доступность SDK
            if (typeof YaGames === 'undefined') {
                throw new Error('Yandex Games SDK не загружен');
            }

            // Инициализируем SDK
            this.ysdk = await YaGames.init({
                orientation: {
                    value: 'landscape',
                    lock: true
                }
            });

            this.log('✅ Yandex Games SDK инициализирован');

            // Получаем информацию об окружении
            await this.initEnvironment();

            // Инициализируем игрока
            await this.initPlayer();

            // Инициализируем сервисы
            await this.initServices();

            // Настраиваем обработчики событий
            this.setupEventHandlers();

            // Настраиваем производительность
            this.optimizePerformance();

            this.initialized = true;
            this.log('🚀 Все сервисы готовы к работе');

            // Сигнализируем о готовности к показу
            this.signalGameReady();

            return true;

        } catch (error) {
            this.log('❌ Ошибка инициализации:', error);
            this.initFallbackMode();
            return false;
        }
    }

    /**
     * Инициализация окружения и определение региона
     */
    async initEnvironment() {
        try {
            if (this.ysdk.environment) {
                this.language = this.ysdk.environment.i18n.lang || 'ru';
                this.region = this.ysdk.environment.i18n.tld || 'ru';
                
                this.log('🌍 Окружение определено:', {
                    язык: this.language,
                    регион: this.region,
                    домен: '.' + this.region
                });

                // Применяем локализацию
                this.applyLocalization();
            }
        } catch (error) {
            this.log('⚠️ Ошибка получения окружения:', error);
        }
    }

    /**
     * Инициализация игрока
     */
    async initPlayer() {
        try {
            this.player = await this.ysdk.getPlayer({ scopes: false });
            this.log('👤 Игрок инициализирован:', this.player.getName());
        } catch (error) {
            this.log('⚠️ Ошибка инициализации игрока:', error);
        }
    }

    /**
     * Инициализация дополнительных сервисов
     */
    async initServices() {
        try {
            // Лидерборды
            if (this.ysdk.getLeaderboards) {
                this.leaderboards = await this.ysdk.getLeaderboards();
                this.log('🏆 Лидерборды инициализированы');
            }

            // Платежи (если поддерживаются)
            if (this.ysdk.getPayments) {
                try {
                    this.payments = await this.ysdk.getPayments({ signed: true });
                    this.log('💳 Платежи инициализированы');
                } catch (error) {
                    this.log('⚠️ Платежи недоступны:', error);
                }
            }
        } catch (error) {
            this.log('⚠️ Ошибка инициализации сервисов:', error);
        }
    }

    /**
     * Fallback режим для разработки
     */
    initFallbackMode() {
        this.log('🔧 Запуск в режиме эмуляции');
        this.initialized = true;
        this.gameReady = true;
        
        // Создаем заглушки
        this.player = {
            getName: () => 'Игрок',
            getPhoto: () => '',
            getUniqueID: () => 'fallback_id',
            getMode: () => 'lite',
            getData: () => Promise.resolve({}),
            setData: () => Promise.resolve(),
            getStats: () => Promise.resolve({}),
            setStats: () => Promise.resolve()
        };

        this.removeLoadingScreen();
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventHandlers() {
        // Обработка видимости страницы
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Обработка закрытия окна
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Обработка фокуса
        window.addEventListener('blur', () => this.pauseGame());
        window.addEventListener('focus', () => this.resumeGame());

        // Мобильные обработчики
        this.setupMobileHandlers();
    }

    /**
     * Обработка изменения видимости
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseGame();
        } else {
            this.resumeGame();
        }
    }

    /**
     * Обработка перед закрытием
     */
    handleBeforeUnload() {
        this.saveGameData();
    }

    /**
     * Настройка мобильных обработчиков
     */
    setupMobileHandlers() {
        // Предотвращение масштабирования
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) e.preventDefault();
        }, { passive: false });

        // Предотвращение контекстного меню
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Обработка ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
    }

    /**
     * Обработка изменения ориентации
     */
    handleOrientationChange() {
        if (window.game && window.game.scale) {
            window.game.scale.refresh();
        }
    }

    /**
     * Применение локализации
     */
    applyLocalization() {
        const texts = {
            ru: {
                loading: 'Загрузка игры...',
                score: 'Очки:',
                lives: 'Жизни:',
                level: 'Уровень:',
                pause: 'Пауза',
                resume: 'Продолжить',
                gameOver: 'Игра окончена',
                playAgain: 'Играть снова',
                share: 'Поделиться'
            },
            en: {
                loading: 'Loading game...',
                score: 'Score:',
                lives: 'Lives:',
                level: 'Level:',
                pause: 'Pause',
                resume: 'Resume',
                gameOver: 'Game Over',
                playAgain: 'Play Again',
                share: 'Share'
            },
            tr: {
                loading: 'Oyun yükleniyor...',
                score: 'Puan:',
                lives: 'Can:',
                level: 'Seviye:',
                pause: 'Duraklat',
                resume: 'Devam Et',
                gameOver: 'Oyun Bitti',
                playAgain: 'Tekrar Oyna',
                share: 'Paylaş'
            }
        };

        const currentTexts = texts[this.language] || texts.ru;
        
        // Применяем переводы
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (currentTexts[key]) {
                el.textContent = currentTexts[key];
            }
        });
    }

    /**
     * ПРАВИЛЬНАЯ обработка полноэкранной рекламы с ограничениями
     */
    async showInterstitialAd() {
        if (!this.canShowInterstitial()) {
            this.log('⏰ Межстраничная реклама заблокирована (лимит или кулдаун)');
            return false;
        }

        try {
            this.log('📺 Показ межстраничной рекламы...');
            this.pauseGame();

            await this.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        this.log('📺 Реклама открыта');
                    },
                    onClose: (wasShown) => {
                        this.log('📺 Реклама закрыта, была показана:', wasShown);
                        if (wasShown) {
                            this.adState.interstitialCount++;
                            this.adState.lastInterstitialTime = Date.now();
                        }
                        this.resumeGame();
                    },
                    onError: (error) => {
                        this.log('❌ Ошибка рекламы:', error);
                        this.resumeGame();
                    }
                }
            });

            return true;

        } catch (error) {
            this.log('❌ Ошибка показа межстраничной рекламы:', error);
            this.resumeGame();
            return false;
        }
    }

    /**
     * Проверка возможности показа межстраничной рекламы
     */
    canShowInterstitial() {
        const now = Date.now();
        const timeSinceLastAd = now - this.adState.lastInterstitialTime;
        
        return this.adState.canShowAds && 
               this.adState.interstitialCount < this.adState.maxInterstitialPerSession &&
               timeSinceLastAd >= this.adState.interstitialCooldown;
    }

    /**
     * Показ рекламы с вознаграждением
     */
    async showRewardedAd() {
        if (!this.ysdk || !this.adState.canShowAds) {
            this.log('⚠️ Реклама недоступна');
            return false;
        }

        try {
            this.log('🎁 Показ рекламы с вознаграждением...');
            this.pauseGame();

            await this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        this.log('🎁 Реклама с наградой открыта');
                    },
                    onRewarded: () => {
                        this.log('🎁 Награда получена!');
                        this.giveReward();
                    },
                    onClose: () => {
                        this.log('🎁 Реклама с наградой закрыта');
                        this.resumeGame();
                    },
                    onError: (error) => {
                        this.log('❌ Ошибка рекламы с наградой:', error);
                        this.resumeGame();
                    }
                }
            });

            return true;

        } catch (error) {
            this.log('❌ Ошибка показа рекламы с наградой:', error);
            this.resumeGame();
            return false;
        }
    }

    /**
     * Выдача награды за просмотр рекламы
     */
    giveReward() {
        // Можно переопределить в конкретной игре
        if (window.game && window.game.addReward) {
            window.game.addReward();
        } else {
            // Стандартная награда - дополнительная жизнь
            this.gameState.lives = Math.min(this.gameState.lives + 1, 5);
            this.updateUI();
        }
    }

    /**
     * Sticky баннер (максимальная доходность)
     */
    showStickyBanner() {
        if (!this.ysdk) return false;

        try {
            this.ysdk.adv.showBannerAdv();
            this.log('📰 Sticky баннер показан');
            return true;
        } catch (error) {
            this.log('❌ Ошибка показа баннера:', error);
            return false;
        }
    }

    hideStickyBanner() {
        if (!this.ysdk) return false;

        try {
            this.ysdk.adv.hideBannerAdv();
            this.log('📰 Sticky баннер скрыт');
            return true;
        } catch (error) {
            this.log('❌ Ошибка скрытия баннера:', error);
            return false;
        }
    }

    /**
     * ПРАВИЛЬНАЯ работа с лидербордами через ysdk.getLeaderboards()
     */
    async submitScore(score, leaderboardName = 'main') {
        if (!this.leaderboards) {
            this.log('⚠️ Лидерборды не инициализированы');
            return false;
        }

        try {
            await this.leaderboards.setLeaderboardScore(leaderboardName, score);
            this.log('🎯 Результат отправлен в лидерборд:', score);
            return true;
        } catch (error) {
            this.log('❌ Ошибка отправки результата:', error);
            return false;
        }
    }

    /**
     * Получение лидерборда
     */
    async getLeaderboard(leaderboardName = 'main') {
        if (!this.leaderboards) return null;

        try {
            const result = await this.leaderboards.getLeaderboardEntries(leaderboardName, {
                quantityTop: 10,
                includeUser: true,
                quantityAround: 5
            });
            
            this.log('🏆 Лидерборд получен');
            return result;
        } catch (error) {
            this.log('❌ Ошибка получения лидерборда:', error);
            return null;
        }
    }

    /**
     * ПРАВИЛЬНАЯ работа с достижениями через специальный API
     */
    async unlockAchievement(achievementId) {
        if (!this.player) return false;

        try {
            const stats = await this.player.getStats(['achievements']);
            const achievements = new Set(stats.achievements || []);
            
            if (!achievements.has(achievementId)) {
                achievements.add(achievementId);
                await this.player.setStats({ 
                    achievements: Array.from(achievements) 
                });
                
                this.showAchievementNotification(achievementId);
                this.log('🏆 Достижение разблокировано:', achievementId);
                return true;
            }
            
            return false;
        } catch (error) {
            this.log('❌ Ошибка разблокировки достижения:', error);
            return false;
        }
    }

    /**
     * Показ уведомления о достижении
     */
    showAchievementNotification(achievementId) {
        const achievements = {
            first_game: { name: 'Первая игра', icon: '🎮' },
            score_1000: { name: '1000 очков', icon: '💯' },
            level_10: { name: '10 уровень', icon: '🚀' }
        };

        const achievement = achievements[achievementId];
        if (!achievement) return;

        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = \`
            <div class="achievement-icon">\${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">\${achievement.name}</div>
                <div class="achievement-description">Достижение разблокировано!</div>
            </div>
        \`;

        document.getElementById('achievement-notifications').appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    /**
     * Сохранение данных игры
     */
    async saveGameData(data = null) {
        if (!this.player) return false;

        try {
            const gameData = data || {
                level: this.gameState.currentLevel,
                score: this.gameState.score,
                lastPlayed: Date.now()
            };

            await this.player.setData(gameData, true);
            this.log('💾 Данные сохранены');
            return true;
        } catch (error) {
            this.log('❌ Ошибка сохранения:', error);
            return false;
        }
    }

    /**
     * Загрузка данных игры
     */
    async loadGameData() {
        if (!this.player) return {};

        try {
            const data = await this.player.getData();
            this.log('📂 Данные загружены');
            return data;
        } catch (error) {
            this.log('❌ Ошибка загрузки:', error);
            return {};
        }
    }

    /**
     * Пауза игры
     */
    pauseGame() {
        if (this.gameState.isPaused) return;
        
        this.gameState.isPaused = true;
        
        if (window.game && window.game.scene) {
            window.game.scene.pause();
        }
        
        this.log('⏸️ Игра на паузе');
    }

    /**
     * Возобновление игры
     */
    resumeGame() {
        if (!this.gameState.isPaused) return;
        
        this.gameState.isPaused = false;
        
        if (window.game && window.game.scene) {
            window.game.scene.resume();
        }
        
        this.log('▶️ Игра возобновлена');
    }

    /**
     * Сигнал готовности игры к показу
     */
    signalGameReady() {
        try {
            if (this.ysdk && this.ysdk.features && this.ysdk.features.LoadingAPI) {
                this.ysdk.features.LoadingAPI.ready();
                this.log('🎮 Сигнал готовности отправлен');
            }
            
            this.gameReady = true;
            this.removeLoadingScreen();
            
            // Показываем sticky баннер
            setTimeout(() => this.showStickyBanner(), 1000);
            
        } catch (error) {
            this.log('⚠️ Ошибка сигнала готовности:', error);
            this.removeLoadingScreen();
        }
    }

    /**
     * Удаление экрана загрузки
     */
    removeLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 300);
        }
    }

    /**
     * Обновление прогресса загрузки
     */
    updateLoadingProgress(progress) {
        const bar = document.querySelector('.loading-bar');
        if (bar) {
            bar.style.width = progress + '%';
        }
    }

    /**
     * Обновление UI
     */
    updateUI() {
        const scoreEl = document.getElementById('score-value');
        const livesEl = document.getElementById('lives-value');
        const levelEl = document.getElementById('level-value');
        
        if (scoreEl) scoreEl.textContent = this.gameState.score;
        if (livesEl) livesEl.textContent = this.gameState.lives;
        if (levelEl) levelEl.textContent = this.gameState.currentLevel;
    }

    /**
     * Оптимизация производительности
     */
    optimizePerformance() {
        // Определение качества на основе устройства
        const deviceInfo = this.ysdk?.deviceInfo;
        let quality = 'medium';
        
        if (deviceInfo) {
            if (deviceInfo.isMobile()) {
                quality = 'low';
            } else if (deviceInfo.isDesktop()) {
                quality = 'high';
            }
        }
        
        if (window.game && window.game.setQuality) {
            window.game.setQuality(quality);
        }
        
        this.log('⚡ Качество установлено:', quality);
    }

    /**
     * Логирование
     */
    log(...args) {
        console.log('[YandexGames]', ...args);
    }

    // Геттеры для состояния
    get isInitialized() { return this.initialized; }
    get isReady() { return this.gameReady; }
    get currentLanguage() { return this.language; }
    get currentRegion() { return this.region; }
    get playerInfo() {
        return this.player ? {
            name: this.player.getName(),
            id: this.player.getUniqueID(),
            photo: this.player.getPhoto('medium')
        } : null;
    }
}

// Создаем глобальный экземпляр
window.yandexGames = new YandexGamesManager();

// Автоматическая инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    await window.yandexGames.init();
});

// Базовые обработчики UI
document.addEventListener('DOMContentLoaded', () => {
    // Кнопка паузы
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            const modal = document.getElementById('pause-modal');
            if (modal) {
                modal.classList.remove('hidden');
                window.yandexGames.pauseGame();
            }
        });
    }

    // Кнопка возобновления
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            const modal = document.getElementById('pause-modal');
            if (modal) {
                modal.classList.add('hidden');
                window.yandexGames.resumeGame();
            }
        });
    }

    // Кнопка рестарта
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (window.game && window.game.restart) {
                window.game.restart();
            }
            document.getElementById('pause-modal').classList.add('hidden');
        });
    }

    // Кнопка звука
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        let soundOn = true;
        soundBtn.addEventListener('click', () => {
            soundOn = !soundOn;
            soundBtn.textContent = soundOn ? '🔊' : '🔇';
            if (window.game && window.game.toggleSound) {
                window.game.toggleSound(soundOn);
            }
        });
    }

    // Кнопка "Играть снова"
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            if (window.game && window.game.restart) {
                window.game.restart();
            }
            document.getElementById('game-over-modal').classList.add('hidden');
        });
    }

    // Кнопка "Поделиться"
    const shareBtn = document.getElementById('share-score-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const score = window.yandexGames.gameState.score;
            const text = \`Мой результат: \${score} очков! Попробуй повторить!\`;
            if (navigator.share) {
                navigator.share({ text });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
        });
    }

    // Кнопка лидерборда
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', async () => {
            const leaderboard = await window.yandexGames.getLeaderboard();
            console.log('Лидерборд:', leaderboard);
            // Здесь можно показать лидерборд в UI
        });
    }
});
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