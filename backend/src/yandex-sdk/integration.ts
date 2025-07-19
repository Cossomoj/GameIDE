import { GameDesign } from '@/types';

export interface YandexSDKConfig {
  leaderboards?: boolean;
  payments?: boolean;
  advertising?: {
    rewarded?: boolean;
    interstitial?: boolean;
    banner?: boolean;
    sticky?: boolean;
  };
  shortcut?: boolean;
  rateApp?: boolean;
  social?: boolean;
  localization?: boolean;
  analytics?: boolean;
  achievements?: boolean;
}

export interface LocalizationConfig {
  supportedLanguages: string[];
  fallbackLanguage: string;
  translations: { [lang: string]: { [key: string]: string } };
}

export interface AnalyticsConfig {
  metrikaId?: string;
  trackingEvents: string[];
  customEvents: { [key: string]: any };
}

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  condition?: (gameState: any) => boolean;
  progress?: {
    current: number;
    target: number;
  };
  hidden?: boolean;
}

export class YandexSDKIntegrator {
  
  /**
   * Генерирует полную интеграцию Yandex Games SDK
   */
  public static generateSDKIntegration(config: YandexSDKConfig): string {
    return `
// Yandex Games SDK Advanced Integration
class YandexGamesSDK {
    constructor() {
        this.ysdk = null;
        this.player = null;
        this.leaderboards = null;
        this.payments = null;
        this.initialized = false;
        this.features = ${JSON.stringify(config, null, 8)};
        
        // Состояние
        this.gameState = {
            isPaused: false,
            isFullscreen: false,
            quality: 'high',
            volume: 1.0
        };
        
        // Аналитика
        this.analytics = {
            sessionStart: Date.now(),
            events: [],
            metrics: {}
        };
        
        // Локализация
        this.localization = new LocalizationSystem();
        
        // Достижения
        this.achievements = new AchievementSystem();
        
        // Устройство
        this.deviceInfo = null;
        
        // Реклама
        this.adState = {
            bannerVisible: false,
            lastInterstitial: 0,
            interstitialCooldown: 180000, // 3 минуты
            rewardedCooldown: 30000 // 30 секунд
        };
    }

    /**
     * Полная инициализация SDK
     */
    async init() {
        try {
            console.log('🎮 Запуск расширенной Yandex Games SDK интеграции...');
            
            // Проверяем доступность SDK
            if (typeof YaGames === 'undefined') {
                console.warn('⚠️ Yandex Games SDK не найден, запуск fallback режима');
                this.initializeFallback();
                return;
            }

            // Инициализируем SDK с расширенными настройками
            this.ysdk = await YaGames.init({
                orientation: {
                    value: 'landscape',
                    lock: true
                },
                adv: {
                    onAdvClose: () => this.handleAdClose(),
                    onAdvError: (error) => this.handleAdError(error)
                }
            });

            console.log('✅ Yandex Games SDK инициализирован');
            
            // Получаем информацию об устройстве
            this.deviceInfo = this.ysdk.deviceInfo;
            console.log('📱 Тип устройства:', this.deviceInfo.type);

            // Инициализируем компоненты
            await this.initializePlayer();
            await this.initializeEnvironment();
            
            ${config.leaderboards ? 'await this.initializeLeaderboards();' : ''}
            ${config.payments ? 'await this.initializePayments();' : ''}
            ${config.localization ? 'await this.initializeLocalization();' : ''}
            ${config.analytics ? 'await this.initializeAnalytics();' : ''}
            ${config.achievements ? 'await this.initializeAchievements();' : ''}
            
            // Настраиваем адаптивность
            this.setupResponsiveDesign();
            
            // Настраиваем оптимизацию производительности
            this.setupPerformanceOptimization();
            
            // Показываем sticky баннер если включен
            ${config.advertising?.sticky ? 'this.showStickyBanner();' : ''}

            this.initialized = true;
            console.log('🚀 Все сервисы Yandex Games готовы к работе');
            
            // Сигнализируем о готовности
            this.gameReady();

        } catch (error) {
            console.error('❌ Ошибка инициализации Yandex Games SDK:', error);
            this.initializeFallback();
        }
    }

    /**
     * Fallback режим для разработки
     */
    initializeFallback() {
        console.log('🔧 Запуск в режиме эмуляции');
        this.initialized = true;
        this.deviceInfo = {
            type: 'desktop',
            isMobile: () => false,
            isDesktop: () => true,
            isTablet: () => false,
            isTV: () => false
        };
        this.player = {
            getName: () => 'Разработчик',
            getPhoto: () => '',
            getUniqueID: () => 'dev_player_id',
            getMode: () => 'lite',
            getData: () => Promise.resolve({}),
            setData: () => Promise.resolve(),
            getStats: () => Promise.resolve({}),
            setStats: () => Promise.resolve(),
            incrementStats: () => Promise.resolve()
        };
        
        // Эмуляция окружения
        this.environment = {
            i18n: { lang: 'ru', tld: 'ru' },
            app: { id: 'dev_app' },
            payload: ''
        };
    }

    /**
     * Инициализация игрока
     */
    async initializePlayer() {
        try {
            this.player = await this.ysdk.getPlayer({
                scopes: false
            });
            console.log('👤 Игрок инициализирован:', this.player.getName());
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации игрока:', error);
        }
    }

    /**
     * Инициализация окружения
     */
    async initializeEnvironment() {
        try {
            this.environment = this.ysdk.environment;
            console.log('🌍 Окружение:', {
                язык: this.environment.i18n.lang,
                домен: this.environment.i18n.tld,
                приложение: this.environment.app.id
            });
        } catch (error) {
            console.warn('⚠️ Ошибка получения окружения:', error);
        }
    }

    ${this.generateLocalizationMethods()}
    ${this.generateLeaderboardMethods()}
    ${this.generatePaymentMethods()}
    ${this.generateAdvertisingMethods()}
    ${this.generateAchievementMethods()}
    ${this.generateAnalyticsMethods()}
    ${this.generatePerformanceMethods()}
    ${this.generateResponsiveMethods()}
    ${this.generateSocialMethods()}

    /**
     * Проверка готовности SDK
     */
    isReady() {
        return this.initialized;
    }

    /**
     * Получение информации об игроке
     */
    getPlayerInfo() {
        if (!this.player) return null;
        
        return {
            name: this.player.getName(),
            photo: this.player.getPhoto('medium'),
            id: this.player.getUniqueID(),
            isAuthorized: this.player.getMode() !== 'lite'
        };
    }

    /**
     * Сохранение данных игрока
     */
    async savePlayerData(data, immediate = true) {
        if (!this.player) return false;
        
        try {
            await this.player.setData(data, immediate);
            console.log('💾 Данные игрока сохранены');
            this.trackEvent('player_data_saved', { size: JSON.stringify(data).length });
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
            return false;
        }
    }

    /**
     * Загрузка данных игрока
     */
    async loadPlayerData(keys) {
        if (!this.player) return {};
        
        try {
            const data = await this.player.getData(keys);
            console.log('📂 Данные игрока загружены');
            this.trackEvent('player_data_loaded');
            return data;
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            return {};
        }
    }

    /**
     * Обработка паузы игры
     */
    setupGamePauseHandling() {
        try {
            // Обработка скрытия/показа вкладки
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseGame();
                } else {
                    this.resumeGame();
                }
            });

            // Обработка фокуса окна
            window.addEventListener('blur', () => this.pauseGame());
            window.addEventListener('focus', () => this.resumeGame());

        } catch (error) {
            console.warn('⚠️ Ошибка настройки паузы:', error);
        }
    }

    /**
     * Пауза игры
     */
    pauseGame() {
        this.gameState.isPaused = true;
        this.trackEvent('game_paused');
        
        // Уведомляем игру о паузе
        if (window.gameInstance && window.gameInstance.pause) {
            window.gameInstance.pause();
        }
        
        console.log('⏸️ Игра поставлена на паузу');
    }

    /**
     * Возобновление игры
     */
    resumeGame() {
        this.gameState.isPaused = false;
        this.trackEvent('game_resumed');
        
        // Уведомляем игру о возобновлении
        if (window.gameInstance && window.gameInstance.resume) {
            window.gameInstance.resume();
        }
        
        console.log('▶️ Игра возобновлена');
    }

    /**
     * Готовность к показу игры
     */
    gameReady() {
        try {
            if (this.ysdk && this.ysdk.features.LoadingAPI) {
                this.ysdk.features.LoadingAPI.ready();
                console.log('🎮 Игра готова к показу');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка сигнала готовности:', error);
        }
    }

    /**
     * Обработка закрытия рекламы
     */
    handleAdClose() {
        this.resumeGame();
        console.log('📺 Реклама закрыта, игра возобновлена');
    }

    /**
     * Обработка ошибки рекламы
     */
    handleAdError(error) {
        console.error('❌ Ошибка рекламы:', error);
        this.resumeGame();
        this.trackEvent('ad_error', { error: error.toString() });
    }
}

${this.generateLocalizationSystem()}
${this.generateAchievementSystem()}

// Глобальный экземпляр SDK
window.yandexGamesSDK = new YandexGamesSDK();

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await window.yandexGamesSDK.init();
});
`;
  }

  /**
   * Генерирует методы локализации
   */
  private static generateLocalizationMethods(): string {
    return `
    /**
     * Инициализация локализации
     */
    async initializeLocalization() {
        try {
            await this.localization.init(this.ysdk);
            console.log('🌐 Локализация инициализирована для языка:', this.localization.currentLanguage);
        } catch (error) {
            console.error('❌ Ошибка инициализации локализации:', error);
        }
    }

    /**
     * Получение перевода
     */
    getText(key, params = {}) {
        return this.localization.get(key, params);
    }

    /**
     * Множественное число
     */
    getPlural(key, count) {
        return this.localization.plural(key, count);
    }

    /**
     * Смена языка
     */
    async changeLanguage(lang) {
        await this.localization.changeLanguage(lang);
        this.trackEvent('language_changed', { language: lang });
    }`;
  }

  /**
   * Генерирует методы лидербордов
   */
  private static generateLeaderboardMethods(): string {
    return `
    /**
     * Инициализация лидербордов
     */
    async initializeLeaderboards() {
        try {
            this.leaderboards = await this.ysdk.getLeaderboards();
            console.log('🏆 Лидерборды инициализированы');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации лидербордов:', error);
        }
    }

    /**
     * Отправка результата с дополнительными данными
     */
    async submitScore(leaderboardName, score, metadata = {}) {
        if (!this.leaderboards) {
            console.warn('⚠️ Лидерборды не инициализированы');
            return false;
        }

        try {
            const extraData = {
                timestamp: Date.now(),
                gameVersion: window.gameInstance?.version || '1.0.0',
                ...metadata
            };

            await this.leaderboards.setLeaderboardScore(
                leaderboardName, 
                score,
                JSON.stringify(extraData)
            );

            console.log('🎯 Результат отправлен:', { leaderboardName, score });
            this.trackEvent('score_submitted', { leaderboardName, score });
            return true;
        } catch (error) {
            console.error('❌ Ошибка отправки результата:', error);
            return false;
        }
    }

    /**
     * Получение лидерборда с кешированием
     */
    async getLeaderboard(name, options = {}) {
        if (!this.leaderboards) return null;

        try {
            const result = await this.leaderboards.getLeaderboardEntries(name, {
                quantityTop: options.top || 10,
                includeUser: options.includeUser !== false,
                quantityAround: options.around || 5
            });

            // Обработка дополнительных данных
            result.entries = result.entries.map(entry => ({
                ...entry,
                metadata: entry.extraData ? JSON.parse(entry.extraData) : {}
            }));

            this.trackEvent('leaderboard_viewed', { leaderboard: name });
            return result;
        } catch (error) {
            console.error('❌ Ошибка получения лидерборда:', error);
            return null;
        }
    }

    /**
     * Получение позиции игрока
     */
    async getPlayerRank(leaderboardName) {
        if (!this.leaderboards) return null;

        try {
            const entry = await this.leaderboards.getLeaderboardPlayerEntry(leaderboardName);
            return entry ? entry.rank : null;
        } catch (error) {
            console.error('❌ Ошибка получения ранга:', error);
            return null;
        }
    }`;
  }

  /**
   * Генерирует методы платежей
   */
  private static generatePaymentMethods(): string {
    return `
    /**
     * Инициализация платежей
     */
    async initializePayments() {
        try {
            this.payments = await this.ysdk.getPayments({ signed: true });
            console.log('💳 Платежи инициализированы');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации платежей:', error);
        }
    }

    /**
     * Загрузка каталога товаров
     */
    async getCatalog() {
        if (!this.payments) return [];

        try {
            const catalog = await this.payments.getCatalog();
            console.log('🛍️ Каталог загружен:', catalog.length, 'товаров');
            this.trackEvent('catalog_loaded', { itemCount: catalog.length });
            return catalog;
        } catch (error) {
            console.error('❌ Ошибка загрузки каталога:', error);
            return [];
        }
    }

    /**
     * Покупка товара
     */
    async purchaseItem(productId, developerPayload = {}) {
        if (!this.payments) {
            console.warn('⚠️ Платежи не инициализированы');
            return false;
        }

        try {
            this.trackEvent('purchase_initiated', { productId });

            const purchase = await this.payments.purchase({
                id: productId,
                developerPayload: JSON.stringify({
                    timestamp: Date.now(),
                    userId: this.player?.getUniqueID(),
                    ...developerPayload
                })
            });

            console.log('💰 Покупка совершена:', purchase);
            
            // Обработка покупки в игре
            if (window.gameInstance && window.gameInstance.processPurchase) {
                window.gameInstance.processPurchase(purchase);
            }

            // Подтверждение покупки
            await this.payments.consumePurchase(purchase.purchaseToken);
            
            this.trackEvent('purchase_completed', { 
                productId, 
                purchaseToken: purchase.purchaseToken 
            });
            
            return purchase;
        } catch (error) {
            console.error('❌ Ошибка покупки:', error);
            this.trackEvent('purchase_failed', { productId, error: error.toString() });
            return false;
        }
    }

    /**
     * Получение всех покупок
     */
    async getPurchases() {
        if (!this.payments) return [];

        try {
            const purchases = await this.payments.getPurchases();
            console.log('🧾 Загружены покупки:', purchases.length);
            return purchases;
        } catch (error) {
            console.error('❌ Ошибка получения покупок:', error);
            return [];
        }
    }`;
  }

  /**
   * Генерирует методы рекламы
   */
  private static generateAdvertisingMethods(): string {
    return `
    /**
     * Показ sticky-баннера (максимальная доходность)
     */
    showStickyBanner() {
        if (!this.ysdk) return false;

        try {
            this.ysdk.adv.showBannerAdv();
            this.adState.bannerVisible = true;
            console.log('📰 Sticky-баннер показан');
            this.trackEvent('banner_shown', { type: 'sticky' });
            return true;
        } catch (error) {
            console.error('❌ Ошибка показа баннера:', error);
            return false;
        }
    }

    /**
     * Скрытие sticky-баннера
     */
    hideStickyBanner() {
        if (!this.ysdk) return false;

        try {
            this.ysdk.adv.hideBannerAdv();
            this.adState.bannerVisible = false;
            console.log('📰 Sticky-баннер скрыт');
            this.trackEvent('banner_hidden', { type: 'sticky' });
            return true;
        } catch (error) {
            console.error('❌ Ошибка скрытия баннера:', error);
            return false;
        }
    }

    /**
     * Проверка возможности показа межстраничной рекламы
     */
    canShowInterstitial() {
        const now = Date.now();
        const timeSinceLastAd = now - this.adState.lastInterstitial;
        return timeSinceLastAd >= this.adState.interstitialCooldown;
    }

    /**
     * Показ межстраничной рекламы
     */
    async showInterstitialAd(placement = 'game_pause') {
        if (!this.ysdk) return false;

        if (!this.canShowInterstitial()) {
            console.log('⏰ Межстраничная реклама в кулдауне');
            return false;
        }

        try {
            this.pauseGame();
            this.trackEvent('interstitial_requested', { placement });

            await this.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        console.log('📺 Межстраничная реклама открыта');
                        this.trackEvent('interstitial_opened', { placement });
                    },
                    onClose: (wasShown) => {
                        console.log('📺 Межстраничная реклама закрыта, показана:', wasShown);
                        this.adState.lastInterstitial = Date.now();
                        this.resumeGame();
                        this.trackEvent('interstitial_closed', { placement, wasShown });
                    },
                    onError: (error) => {
                        console.error('❌ Ошибка межстраничной рекламы:', error);
                        this.resumeGame();
                        this.trackEvent('interstitial_error', { placement, error: error.toString() });
                    }
                }
            });

            return true;
        } catch (error) {
            console.error('❌ Ошибка показа межстраничной рекламы:', error);
            this.resumeGame();
            return false;
        }
    }

    /**
     * Показ рекламы с вознаграждением
     */
    async showRewardedVideo(placement = 'extra_life', rewardCallback = null) {
        if (!this.ysdk) return false;

        try {
            this.pauseGame();
            this.trackEvent('rewarded_requested', { placement });

            await this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        console.log('🎁 Реклама с вознаграждением открыта');
                        this.trackEvent('rewarded_opened', { placement });
                    },
                    onRewarded: () => {
                        console.log('🎁 Награда получена');
                        this.trackEvent('rewarded_completed', { placement });
                        
                        if (rewardCallback) {
                            rewardCallback();
                        } else if (window.gameInstance && window.gameInstance.addReward) {
                            window.gameInstance.addReward();
                        }
                    },
                    onClose: () => {
                        console.log('🎁 Реклама с вознаграждением закрыта');
                        this.resumeGame();
                        this.trackEvent('rewarded_closed', { placement });
                    },
                    onError: (error) => {
                        console.error('❌ Ошибка рекламы с вознаграждением:', error);
                        this.resumeGame();
                        this.trackEvent('rewarded_error', { placement, error: error.toString() });
                    }
                }
            });

            return true;
        } catch (error) {
            console.error('❌ Ошибка показа рекламы с вознаграждением:', error);
            this.resumeGame();
            return false;
        }
    }

    /**
     * Проверка статуса рекламы
     */
    async getAdStatus() {
        if (!this.ysdk) return { available: false };

        try {
            const status = await this.ysdk.adv.getAdvStatus();
            return status;
        } catch (error) {
            console.error('❌ Ошибка проверки статуса рекламы:', error);
            return { available: false };
        }
    }`;
  }

  /**
   * Генерирует методы достижений
   */
  private static generateAchievementMethods(): string {
    return `
    /**
     * Инициализация достижений
     */
    async initializeAchievements() {
        try {
            await this.achievements.init(this.player);
            console.log('🏆 Система достижений инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации достижений:', error);
        }
    }

    /**
     * Разблокировка достижения
     */
    async unlockAchievement(achievementId) {
        return await this.achievements.unlock(achievementId);
    }

    /**
     * Обновление прогресса достижения
     */
    async updateAchievementProgress(achievementId, value) {
        return await this.achievements.updateProgress(achievementId, value);
    }

    /**
     * Получение всех достижений
     */
    getAchievements() {
        return this.achievements.getAll();
    }

    /**
     * Получение разблокированных достижений
     */
    getUnlockedAchievements() {
        return this.achievements.getUnlocked();
    }`;
  }

  /**
   * Генерирует методы аналитики
   */
  private static generateAnalyticsMethods(): string {
    return `
    /**
     * Инициализация аналитики
     */
    async initializeAnalytics() {
        try {
            console.log('📊 Аналитика инициализирована');
            this.trackEvent('game_started', {
                language: this.environment?.i18n?.lang,
                platform: this.deviceInfo?.type,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ Ошибка инициализации аналитики:', error);
        }
    }

    /**
     * Отслеживание событий
     */
    trackEvent(eventName, parameters = {}) {
        try {
            const event = {
                name: eventName,
                timestamp: Date.now(),
                sessionTime: Date.now() - this.analytics.sessionStart,
                ...parameters
            };

            this.analytics.events.push(event);

            // Отправка в Яндекс.Метрику если доступна
            if (window.ym && this.analytics.metrikaId) {
                window.ym(this.analytics.metrikaId, 'reachGoal', eventName, parameters);
            }

            // Отправка в Yandex Games если есть метрика
            if (this.ysdk && this.ysdk.metrica) {
                this.ysdk.metrica.hit(eventName, parameters);
            }

            console.log(\`📊 Событие зафиксировано: \${eventName}\`, parameters);
        } catch (error) {
            console.warn('⚠️ Ошибка отслеживания события:', error);
        }
    }

    /**
     * Отслеживание игровых событий
     */
    trackGameEvent(eventType, data = {}) {
        const gameEvents = {
            level_start: (data) => this.trackEvent('level_start', { level: data.level }),
            level_complete: (data) => this.trackEvent('level_complete', { 
                level: data.level, 
                score: data.score, 
                time: data.time 
            }),
            game_over: (data) => this.trackEvent('game_over', { 
                score: data.score, 
                level: data.level, 
                reason: data.reason 
            }),
            purchase: (data) => this.trackEvent('purchase', { 
                product_id: data.productId, 
                price: data.price 
            }),
            tutorial_step: (data) => this.trackEvent('tutorial_step', { 
                step: data.step, 
                completed: data.completed 
            })
        };

        if (gameEvents[eventType]) {
            gameEvents[eventType](data);
        } else {
            this.trackEvent(eventType, data);
        }
    }

    /**
     * Получение метрик сессии
     */
    getSessionMetrics() {
        return {
            duration: Date.now() - this.analytics.sessionStart,
            events: this.analytics.events.length,
            achievements: this.achievements.getUnlocked().length,
            lastEvent: this.analytics.events[this.analytics.events.length - 1]
        };
    }`;
  }

  /**
   * Генерирует методы управления производительностью
   */
  private static generatePerformanceMethods(): string {
    return `
    /**
     * Настройка оптимизации производительности
     */
    setupPerformanceOptimization() {
        try {
            // Определение оптимального качества на основе устройства
            this.gameState.quality = this.detectOptimalQuality();
            
            // Настройка FPS
            this.setupFPSMonitoring();
            
            // Управление памятью
            this.setupMemoryManagement();
            
            console.log('⚡ Оптимизация производительности настроена:', this.gameState.quality);
        } catch (error) {
            console.error('❌ Ошибка настройки производительности:', error);
        }
    }

    /**
     * Определение оптимального качества
     */
    detectOptimalQuality() {
        if (!this.deviceInfo) return 'medium';

        // Мобильные устройства - низкое качество
        if (this.deviceInfo.isMobile()) {
            return 'low';
        }

        // Планшеты - среднее качество
        if (this.deviceInfo.isTablet()) {
            return 'medium';
        }

        // ТВ - высокое качество
        if (this.deviceInfo.isTV()) {
            return 'high';
        }

        // Десктоп - проверяем производительность
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) return 'low';
        
        const renderer = gl.getParameter(gl.RENDERER);
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        if (maxTextureSize >= 4096 && !renderer.includes('Mali')) {
            return 'high';
        } else if (maxTextureSize >= 2048) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * Мониторинг FPS
     */
    setupFPSMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 60;

        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                // Автоматическая корректировка качества
                this.adjustQualityBasedOnPerformance(fps);
            }
            
            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    }

    /**
     * Корректировка качества на основе производительности
     */
    adjustQualityBasedOnPerformance(currentFPS) {
        const targetFPS = 30;
        
        if (currentFPS < targetFPS - 5 && this.gameState.quality !== 'low') {
            this.decreaseQuality();
        } else if (currentFPS > targetFPS + 10 && this.gameState.quality !== 'high') {
            this.increaseQuality();
        }
    }

    /**
     * Понижение качества
     */
    decreaseQuality() {
        const qualities = ['high', 'medium', 'low'];
        const currentIndex = qualities.indexOf(this.gameState.quality);
        
        if (currentIndex < qualities.length - 1) {
            this.gameState.quality = qualities[currentIndex + 1];
            this.applyQualitySettings();
            console.log('📉 Качество понижено до:', this.gameState.quality);
            this.trackEvent('quality_decreased', { quality: this.gameState.quality });
        }
    }

    /**
     * Повышение качества
     */
    increaseQuality() {
        const qualities = ['high', 'medium', 'low'];
        const currentIndex = qualities.indexOf(this.gameState.quality);
        
        if (currentIndex > 0) {
            this.gameState.quality = qualities[currentIndex - 1];
            this.applyQualitySettings();
            console.log('📈 Качество повышено до:', this.gameState.quality);
            this.trackEvent('quality_increased', { quality: this.gameState.quality });
        }
    }

    /**
     * Применение настроек качества
     */
    applyQualitySettings() {
        if (window.gameInstance && window.gameInstance.setQuality) {
            window.gameInstance.setQuality(this.gameState.quality);
        }
    }

    /**
     * Управление памятью
     */
    setupMemoryManagement() {
        // Очистка каждые 5 минут
        setInterval(() => {
            this.cleanupMemory();
        }, 300000);
    }

    /**
     * Очистка памяти
     */
    cleanupMemory() {
        try {
            if (window.gameInstance && window.gameInstance.cleanup) {
                window.gameInstance.cleanup();
            }
            
            // Принудительная сборка мусора если доступна
            if (window.gc) {
                window.gc();
            }
            
            console.log('🧹 Очистка памяти выполнена');
        } catch (error) {
            console.warn('⚠️ Ошибка очистки памяти:', error);
        }
    }`;
  }

  /**
   * Генерирует методы адаптивности
   */
  private static generateResponsiveMethods(): string {
    return `
    /**
     * Настройка адаптивного дизайна
     */
    setupResponsiveDesign() {
        try {
            // Определяем начальные размеры
            this.updateScreenSize();
            
            // Слушаем изменения размера окна
            window.addEventListener('resize', () => this.updateScreenSize());
            
            // Слушаем изменения ориентации
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.updateScreenSize(), 100);
            });
            
            // Настраиваем управление для мобильных
            if (this.deviceInfo.isMobile()) {
                this.setupMobileControls();
            }
            
            console.log('📱 Адаптивный дизайн настроен');
        } catch (error) {
            console.error('❌ Ошибка настройки адаптивности:', error);
        }
    }

    /**
     * Обновление размеров экрана
     */
    updateScreenSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Уведомляем игру об изменении размеров
        if (window.gameInstance && window.gameInstance.resize) {
            window.gameInstance.resize(width, height);
        }
        
        // Обновляем CSS переменные
        document.documentElement.style.setProperty('--screen-width', width + 'px');
        document.documentElement.style.setProperty('--screen-height', height + 'px');
        
        this.trackEvent('screen_resized', { width, height });
    }

    /**
     * Настройка мобильного управления
     */
    setupMobileControls() {
        // Предотвращаем масштабирование
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }

        // Предотвращаем выделение текста
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Предотвращаем контекстное меню
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Предотвращаем скролл при касаниях игровой области
        const gameContainer = document.getElementById('game') || document.body;
        gameContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        
        console.log('📱 Мобильное управление настроено');
    }

    /**
     * Проверка ориентации устройства
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
        }
        
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    /**
     * Запрос полноэкранного режима
     */
    async requestFullscreen() {
        if (!this.ysdk) return false;

        try {
            await this.ysdk.screen.fullscreen.request();
            this.gameState.isFullscreen = true;
            this.trackEvent('fullscreen_requested');
            return true;
        } catch (error) {
            console.error('❌ Ошибка полноэкранного режима:', error);
            return false;
        }
    }

    /**
     * Выход из полноэкранного режима
     */
    async exitFullscreen() {
        if (!this.ysdk) return false;

        try {
            await this.ysdk.screen.fullscreen.exit();
            this.gameState.isFullscreen = false;
            this.trackEvent('fullscreen_exited');
            return true;
        } catch (error) {
            console.error('❌ Ошибка выхода из полноэкранного режима:', error);
            return false;
        }
    }`;
  }

  /**
   * Генерирует методы социальных функций
   */
  private static generateSocialMethods(): string {
    return `
    /**
     * Поделиться результатом
     */
    async shareScore(score, message = '') {
        try {
            const shareText = message || \`Мой результат в игре: \${score} очков! Попробуй обыграть меня!\`;
            
            if (this.ysdk && this.ysdk.clipboard) {
                await this.ysdk.clipboard.writeText(shareText);
                console.log('📋 Результат скопирован в буфер обмена');
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
                console.log('📋 Результат скопирован в буфер обмена');
            }
            
            this.trackEvent('score_shared', { score });
            return true;
        } catch (error) {
            console.error('❌ Ошибка копирования результата:', error);
            return false;
        }
    }

    /**
     * Пригласить друзей
     */
    async inviteFriends(message = '') {
        try {
            const inviteText = message || 'Попробуй эту классную игру!';
            
            if (this.ysdk && this.ysdk.clipboard) {
                await this.ysdk.clipboard.writeText(inviteText);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(inviteText);
            }
            
            console.log('📋 Приглашение скопировано в буфер обмена');
            this.trackEvent('friends_invited');
            return true;
        } catch (error) {
            console.error('❌ Ошибка приглашения друзей:', error);
            return false;
        }
    }

    /**
     * Создание ярлыка игры
     */
    async createShortcut() {
        if (!this.ysdk) return false;

        try {
            await this.ysdk.shortcut.requestShortcut();
            console.log('🔗 Ярлык создан');
            this.trackEvent('shortcut_created');
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания ярлыка:', error);
            return false;
        }
    }

    /**
     * Запрос оценки игры
     */
    async requestRating() {
        if (!this.ysdk) return false;

        try {
            await this.ysdk.feedback.requestReview();
            console.log('⭐ Запрос оценки отправлен');
            this.trackEvent('rating_requested');
            return true;
        } catch (error) {
            console.error('❌ Ошибка запроса оценки:', error);
            return false;
        }
    }`;
  }

  /**
   * Генерирует систему локализации
   */
  private static generateLocalizationSystem(): string {
    return `
// Система локализации
class LocalizationSystem {
    constructor() {
        this.supportedLanguages = ['ru', 'en', 'tr', 'uk', 'be', 'kz'];
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.pluralRules = {};
    }
    
    async init(ysdk) {
        // Определение языка пользователя
        const userLang = ysdk?.environment?.i18n?.lang || 'en';
        this.currentLanguage = this.supportedLanguages.includes(userLang) ? userLang : this.fallbackLanguage;
        
        // Загрузка переводов
        await this.loadLanguage(this.currentLanguage);
        
        // Загрузка fallback языка
        if (this.currentLanguage !== this.fallbackLanguage) {
            await this.loadLanguage(this.fallbackLanguage);
        }
        
        // Настройка правил множественного числа
        this.setupPluralRules();
    }
    
    async loadLanguage(lang) {
        try {
            // В реальном проекте здесь будет загрузка с сервера
            this.translations[lang] = this.getBuiltInTranslations(lang);
        } catch (error) {
            console.error(\`Ошибка загрузки языка \${lang}:\`, error);
        }
    }
    
    getBuiltInTranslations(lang) {
        const translations = {
            ru: {
                'game.start': 'Начать игру',
                'game.pause': 'Пауза',
                'game.resume': 'Продолжить',
                'game.over': 'Игра окончена',
                'game.score': 'Очки: {score}',
                'game.level': 'Уровень {level}',
                'game.lives': {
                    one: '{count} жизнь',
                    few: '{count} жизни',
                    many: '{count} жизней'
                },
                'ad.reward': 'Посмотреть рекламу за награду',
                'leaderboard.title': 'Таблица лидеров',
                'achievement.unlocked': 'Достижение разблокировано!',
                'settings.sound': 'Звук',
                'settings.music': 'Музыка'
            },
            en: {
                'game.start': 'Start Game',
                'game.pause': 'Pause',
                'game.resume': 'Resume',
                'game.over': 'Game Over',
                'game.score': 'Score: {score}',
                'game.level': 'Level {level}',
                'game.lives': {
                    one: '{count} life',
                    other: '{count} lives'
                },
                'ad.reward': 'Watch ad for reward',
                'leaderboard.title': 'Leaderboard',
                'achievement.unlocked': 'Achievement unlocked!',
                'settings.sound': 'Sound',
                'settings.music': 'Music'
            },
            tr: {
                'game.start': 'Oyunu Başlat',
                'game.pause': 'Duraklat',
                'game.resume': 'Devam Et',
                'game.over': 'Oyun Bitti',
                'game.score': 'Puan: {score}',
                'game.level': 'Seviye {level}',
                'game.lives': {
                    other: '{count} can'
                },
                'ad.reward': 'Ödül için reklam izle',
                'leaderboard.title': 'Lider Tablosu',
                'achievement.unlocked': 'Başarım kilidi açıldı!',
                'settings.sound': 'Ses',
                'settings.music': 'Müzik'
            }
        };
        
        return translations[lang] || translations.en;
    }
    
    get(key, params = {}) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        // Поиск по ключам
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) break;
        }
        
        // Fallback на английский
        if (!translation && this.currentLanguage !== this.fallbackLanguage) {
            translation = this.translations[this.fallbackLanguage];
            for (const k of keys) {
                translation = translation?.[k];
                if (!translation) break;
            }
        }
        
        // Если перевод не найден
        if (!translation) {
            console.warn(\`Перевод не найден: \${key}\`);
            return key;
        }
        
        // Подстановка параметров
        return this.interpolate(translation, params);
    }
    
    interpolate(str, params) {
        if (typeof str !== 'string') return str;
        
        return str.replace(/\\{(\\w+)\\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }
    
    plural(key, count) {
        const rule = this.pluralRules[this.currentLanguage];
        const form = rule ? rule(count) : 'other';
        
        const pluralKey = \`\${key}.\${form}\`;
        return this.get(pluralKey, { count });
    }
    
    setupPluralRules() {
        // Русский язык
        this.pluralRules.ru = (n) => {
            if (n % 10 === 1 && n % 100 !== 11) return 'one';
            if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'few';
            return 'many';
        };
        
        // Английский язык
        this.pluralRules.en = (n) => n === 1 ? 'one' : 'other';
        
        // Турецкий язык
        this.pluralRules.tr = (n) => 'other';
    }
    
    async changeLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.error(\`Язык \${lang} не поддерживается\`);
            return;
        }
        
        if (!this.translations[lang]) {
            await this.loadLanguage(lang);
        }
        
        this.currentLanguage = lang;
        this.updateUI();
    }
    
    updateUI() {
        // Обновление всех элементов с атрибутом data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.get(key);
        });
        
        // Обновление placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.get(key);
        });
    }
}`;
  }

  /**
   * Генерирует систему достижений
   */
  private static generateAchievementSystem(): string {
    return `
// Система достижений
class AchievementSystem {
    constructor() {
        this.achievements = this.defineAchievements();
        this.unlockedAchievements = new Set();
        this.progress = {};
        this.player = null;
    }
    
    async init(player) {
        this.player = player;
        await this.loadProgress();
    }
    
    defineAchievements() {
        return {
            FIRST_WIN: {
                id: 'first_win',
                name: 'Первая победа',
                description: 'Выиграйте первую игру',
                icon: '🏆',
                points: 10
            },
            SCORE_1000: {
                id: 'score_1000',
                name: 'Тысячник',
                description: 'Наберите 1000 очков',
                icon: '💯',
                points: 20,
                progress: { current: 0, target: 1000 }
            },
            PLAY_10_GAMES: {
                id: 'play_10_games',
                name: 'Настойчивый игрок',
                description: 'Сыграйте 10 игр',
                icon: '🎮',
                points: 30,
                progress: { current: 0, target: 10 }
            },
            SPEEDRUN: {
                id: 'speedrun',
                name: 'Спидраннер',
                description: 'Пройдите уровень за 30 секунд',
                icon: '⚡',
                points: 50,
                condition: (gameState) => gameState.levelTime <= 30
            }
        };
    }
    
    async loadProgress() {
        if (!this.player) return;
        
        try {
            const stats = await this.player.getStats(['achievements', 'achievementProgress']);
            this.unlockedAchievements = new Set(stats.achievements || []);
            this.progress = stats.achievementProgress || {};
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
        }
    }
    
    async unlock(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || this.unlockedAchievements.has(achievementId)) {
            return false;
        }
        
        this.unlockedAchievements.add(achievementId);
        
        // Сохранение
        await this.saveProgress();
        
        // Уведомление
        this.showNotification(achievement);
        
        // Начисление очков
        if (this.player) {
            await this.player.incrementStats({ achievementPoints: achievement.points });
        }
        
        return true;
    }
    
    async updateProgress(achievementId, value) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !achievement.progress || this.unlockedAchievements.has(achievementId)) {
            return;
        }
        
        this.progress[achievementId] = Math.min(value, achievement.progress.target);
        
        // Проверка завершения
        if (this.progress[achievementId] >= achievement.progress.target) {
            await this.unlock(achievementId);
        } else {
            await this.saveProgress();
        }
    }
    
    async saveProgress() {
        if (!this.player) return;
        
        try {
            await this.player.setStats({
                achievements: Array.from(this.unlockedAchievements),
                achievementProgress: this.progress
            });
        } catch (error) {
            console.error('Ошибка сохранения достижений:', error);
        }
    }
    
    showNotification(achievement) {
        // Создание UI уведомления
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = \`
            <div class="achievement-icon">\${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">\${achievement.name}</div>
                <div class="achievement-description">\${achievement.description}</div>
                <div class="achievement-points">+\${achievement.points} очков</div>
            </div>
        \`;
        
        // Стили
        notification.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.5s ease;
            max-width: 300px;
            font-family: system-ui;
        \`;
        
        document.body.appendChild(notification);
        
        // Анимация
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
    
    getAll() {
        return Object.values(this.achievements);
    }
    
    getUnlocked() {
        return Array.from(this.unlockedAchievements).map(id => this.achievements[id]);
    }
    
    getProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !achievement.progress) return null;
        
        return {
            current: this.progress[achievementId] || 0,
            target: achievement.progress.target,
            percentage: Math.round(((this.progress[achievementId] || 0) / achievement.progress.target) * 100)
        };
    }
}`;
  }

  /**
   * Интегрирует расширенный SDK в существующий код игры
   */
  public static integrateIntoGame(gameCode: string, config: YandexSDKConfig): string {
    const sdkIntegration = this.generateSDKIntegration(config);
    
    // Добавляем расширенный SDK в HTML
    const sdkScript = `
    <!-- Yandex Games SDK v2.0 Enhanced Integration -->
    <script src="https://yandex.ru/games/sdk/v2"></script>
    <style>
        .achievement-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: system-ui;
        }
        
        .achievement-icon {
            font-size: 24px;
        }
        
        .achievement-info {
            flex: 1;
        }
        
        .achievement-name {
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .achievement-description {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        
        .achievement-points {
            font-size: 12px;
            opacity: 0.8;
        }

        /* Адаптивные стили */
        @media (max-width: 768px) {
            .achievement-notification {
                top: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
    </style>
    <script>
        ${sdkIntegration}
    </script>`;

    // Ищем закрывающий тег body и добавляем перед ним
    if (gameCode.includes('</body>')) {
      return gameCode.replace('</body>', `${sdkScript}\n</body>`);
    } else {
      // Если нет тега body, добавляем в конец
      return gameCode + sdkScript;
    }
  }

  /**
   * Создает расширенную конфигурацию SDK на основе дизайна игры
   */
  public static createSDKConfig(gameDesign: GameDesign): YandexSDKConfig {
    const config: YandexSDKConfig = {
      leaderboards: true,      // Всегда включаем таблицу лидеров
      localization: true,      // Всегда включаем локализацию
      analytics: true,         // Всегда включаем аналитику
      achievements: true,      // Всегда включаем достижения
      advertising: {
        rewarded: true,        // Всегда включаем рекламу с вознаграждением
        interstitial: true,    // Всегда включаем межстраничную рекламу
        banner: false,         // Обычные баннеры отключаем
        sticky: true           // Включаем sticky-баннеры (максимальная доходность)
      },
      shortcut: true,          // Всегда предлагаем создать ярлык
      rateApp: true,           // Всегда просим оценить
      social: true             // Всегда включаем социальные функции
    };

    // Настраиваем на основе монетизации
    if (gameDesign.monetization && gameDesign.monetization.length > 0) {
      gameDesign.monetization.forEach(monetization => {
        switch (monetization) {
          case 'purchases':
            config.payments = true;
            break;
          case 'rewarded_ads':
            config.advertising!.rewarded = true;
            break;
          case 'interstitial_ads':
            config.advertising!.interstitial = true;
            break;
          case 'banner_ads':
            config.advertising!.banner = true;
            break;
        }
      });
    }

    return config;
  }

  /**
   * Генерирует базовую HTML структуру с поддержкой SDK
   */
  public static generateGameHTML(gameTitle: string, config: YandexSDKConfig): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${gameTitle}</title>
    <meta name="description" content="${gameTitle} - HTML5 игра для Yandex Games">
    <meta name="keywords" content="игра, HTML5, Yandex Games">
    
    <!-- Основные стили -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #000;
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
        }
        
        @media (max-width: 768px) {
            .mobile-controls {
                display: flex;
            }
        }
    </style>
</head>
<body>
    <div id="game"></div>
    
    <!-- UI оверлей -->
    <div id="ui-overlay">
        Счёт: <span id="score-value">0</span><br>
        Жизни: <span id="lives-value">3</span>
    </div>
    
    <!-- Мобильные элементы управления -->
    <div class="mobile-controls">
        <div class="control-button" id="left-btn">←</div>
        <div class="control-button" id="jump-btn">↑</div>
        <div class="control-button" id="right-btn">→</div>
    </div>
    
    <!-- Phaser 3 -->
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    
    <!-- Игровой код будет вставлен здесь -->
    
</body>
</html>`;
  }
} 