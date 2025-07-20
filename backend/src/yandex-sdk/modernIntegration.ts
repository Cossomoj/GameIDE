import { GameDesign } from '@/types';
import { LoggerService } from '@/services/logger';

const logger = new LoggerService();

export interface ModernYandexSDKConfig {
  // Основные возможности
  leaderboards?: boolean;
  payments?: boolean;
  advertising?: {
    rewarded?: boolean;
    interstitial?: boolean;
    banner?: boolean;
    sticky?: boolean;
  };
  social?: boolean;
  auth?: boolean;
  cloudSaves?: boolean;
  
  // Новые возможности SDK v2.0+
  deviceInfo?: boolean;
  environment?: boolean;
  localization?: boolean;
  analytics?: boolean;
  achievements?: boolean;
  
  // Настройки окружения
  iframe?: {
    checkEnvironment?: boolean;
    allowFullscreen?: boolean;
    orientationLock?: 'landscape' | 'portrait' | 'any';
  };
  
  // Fallback конфигурация
  fallback?: {
    enabled?: boolean;
    logErrors?: boolean;
    emulateFeatures?: boolean;
  };
  
  // Производительность
  performance?: {
    lazyInit?: boolean;
    preloadFeatures?: string[];
    errorRetryCount?: number;
    timeoutMs?: number;
  };
}

export interface SDKEnvironment {
  app: {
    id: string;
    version?: string;
  };
  browser: {
    lang: string;
    userAgent: string;
  };
  domain: {
    tld: string;
    domain: string;
  };
  i18n: {
    lang: string;
    tld: string;
  };
  payload?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet' | 'tv';
    orientation?: 'portrait' | 'landscape';
    screen?: {
      width: number;
      height: number;
    };
  };
  iframe?: boolean;
}

export interface PlayerData {
  id: string;
  name: string;
  photo?: string;
  mode: 'lite' | 'logged';
  isAuthorized: boolean;
  personalInfo?: {
    scopePermissions: string[];
  };
}

export interface GameProgress {
  level: number;
  score: number;
  achievements: string[];
  statistics: { [key: string]: number };
  settings: { [key: string]: any };
}

/**
 * Современный интегратор Yandex Games SDK v2.0+
 */
export class ModernYandexSDKIntegrator {
  private static instance: ModernYandexSDKIntegrator;
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  public static getInstance(): ModernYandexSDKIntegrator {
    if (!ModernYandexSDKIntegrator.instance) {
      ModernYandexSDKIntegrator.instance = new ModernYandexSDKIntegrator();
    }
    return ModernYandexSDKIntegrator.instance;
  }

  /**
   * Генерирует современную интеграцию Yandex Games SDK v2.0+
   */
  public static generateModernSDKIntegration(config: ModernYandexSDKConfig): string {
    return `
// Yandex Games SDK v2.0+ Modern Integration
class ModernYandexGamesSDK {
    constructor() {
        this.sdkVersion = '2.0+';
        this.ysdk = null;
        this.player = null;
        this.environment = null;
        this.deviceInfo = null;
        this.leaderboards = null;
        this.payments = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.initPromise = null;
        this.config = ${JSON.stringify(config, null, 8)};
        
        // Состояние соединения
        this.connectionState = {
            online: navigator.onLine,
            lastPing: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 3
        };
        
        // Очередь команд для выполнения после инициализации
        this.commandQueue = [];
        
        // Кеш для часто используемых данных
        this.cache = {
            playerData: null,
            environment: null,
            leaderboards: new Map(),
            achievements: new Map()
        };
        
        // Метрики производительности
        this.metrics = {
            initTime: null,
            lastError: null,
            apiCalls: 0,
            errorCount: 0,
            retryCount: 0
        };
        
        // События для подписки
        this.eventListeners = {
            'ready': [],
            'error': [],
            'player:auth': [],
            'player:data': [],
            'ad:opened': [],
            'ad:closed': [],
            'ad:error': [],
            'game:pause': [],
            'game:resume': []
        };
        
        // Обработчики ошибок
        this.errorHandlers = new Map();
        
        // Автоматическая инициализация при создании
        this.autoInit();
    }

    /**
     * Автоматическая инициализация SDK
     */
    async autoInit() {
        try {
            // Проверяем готовность DOM
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            await this.init();
        } catch (error) {
            this.handleError('AUTO_INIT_FAILED', error);
        }
    }

    /**
     * Основная инициализация SDK с современными возможностями
     */
    async init() {
        if (this.isInitialized) return this;
        if (this.isInitializing) return this.initPromise;
        
        this.isInitializing = true;
        const startTime = performance.now();
        
        this.initPromise = this._performInit();
        
        try {
            await this.initPromise;
            this.metrics.initTime = performance.now() - startTime;
            this.log('info', \`SDK инициализирован за \${this.metrics.initTime.toFixed(2)}ms\`);
            this.emit('ready', { sdk: this, initTime: this.metrics.initTime });
        } catch (error) {
            this.metrics.lastError = error;
            this.metrics.errorCount++;
            throw error;
        } finally {
            this.isInitializing = false;
        }
        
        return this;
    }

    /**
     * Внутренняя логика инициализации
     */
    async _performInit() {
        try {
            // 1. Проверяем iframe окружение
            await this.checkIframeEnvironment();
            
            // 2. Проверяем доступность SDK
            if (!this.isSDKAvailable()) {
                this.log('warn', 'Yandex Games SDK недоступен, включаем fallback режим');
                await this.initializeFallbackMode();
                return;
            }
            
            // 3. Инициализируем основной SDK
            await this.initializeMainSDK();
            
            // 4. Получаем информацию об окружении
            await this.loadEnvironmentInfo();
            
            // 5. Инициализируем дополнительные сервисы
            await this.initializeServices();
            
            // 6. Настраиваем обработчики событий
            this.setupEventHandlers();
            
            // 7. Выполняем отложенные команды
            await this.processCommandQueue();
            
            this.isInitialized = true;
            this.log('info', 'Yandex Games SDK v2.0+ успешно инициализирован');
            
        } catch (error) {
            this.log('error', 'Ошибка инициализации SDK:', error);
            
            // Пытаемся запустить fallback режим
            try {
                await this.initializeFallbackMode();
            } catch (fallbackError) {
                this.log('error', 'Fallback режим также недоступен:', fallbackError);
                throw new Error('Полная ошибка инициализации SDK');
            }
        }
    }

    /**
     * Проверка iframe окружения
     */
    async checkIframeEnvironment() {
        const isInIframe = window !== window.top;
        
        if (this.config.iframe?.checkEnvironment && isInIframe) {
            this.log('info', 'Обнаружено iframe окружение');
            
            // Проверяем, можем ли мы получить информацию от родительского окна
            try {
                // Отправляем сообщение родительскому окну
                window.parent.postMessage({
                    type: 'yandex-games-iframe-check',
                    timestamp: Date.now()
                }, '*');
                
                // Ждем ответ
                const response = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout waiting for iframe response'));
                    }, 5000);
                    
                    const handler = (event) => {
                        if (event.data?.type === 'yandex-games-iframe-response') {
                            clearTimeout(timeout);
                            window.removeEventListener('message', handler);
                            resolve(event.data);
                        }
                    };
                    
                    window.addEventListener('message', handler);
                });
                
                this.log('info', 'Iframe окружение поддерживается:', response);
            } catch (error) {
                this.log('warn', 'Iframe окружение может иметь ограничения:', error);
            }
        }
        
        // Настраиваем ограничения для iframe
        if (isInIframe) {
            // Отключаем полноэкранный режим если не разрешен
            if (!this.config.iframe?.allowFullscreen) {
                this.config.iframe = { ...this.config.iframe, allowFullscreen: false };
            }
            
            // Блокируем ориентацию если указано
            if (this.config.iframe?.orientationLock) {
                try {
                    await screen.orientation.lock(this.config.iframe.orientationLock);
                } catch (error) {
                    this.log('warn', 'Не удалось заблокировать ориентацию:', error);
                }
            }
        }
    }

    /**
     * Проверка доступности SDK
     */
    isSDKAvailable() {
        return typeof window.YaGames !== 'undefined';
    }

    /**
     * Инициализация основного SDK
     */
    async initializeMainSDK() {
        const initConfig = {
            orientation: {
                value: this.config.iframe?.orientationLock || 'landscape',
                lock: true
            },
            adv: {
                onAdvOpen: () => this.handleAdOpened(),
                onAdvClose: (wasShown) => this.handleAdClosed(wasShown),
                onAdvError: (error) => this.handleAdError(error)
            }
        };
        
        this.ysdk = await YaGames.init(initConfig);
        this.log('info', 'Основной SDK инициализирован');
    }

    /**
     * Загрузка информации об окружении
     */
    async loadEnvironmentInfo() {
        try {
            this.environment = this.ysdk.environment;
            this.cache.environment = this.environment;
            
            // Определяем тип устройства
            this.deviceInfo = {
                type: this.ysdk.deviceInfo?.type || this.detectDeviceType(),
                isMobile: () => this.ysdk.deviceInfo?.isMobile() || this.isMobileDevice(),
                isDesktop: () => this.ysdk.deviceInfo?.isDesktop() || this.isDesktopDevice(),
                isTablet: () => this.ysdk.deviceInfo?.isTablet() || this.isTabletDevice(),
                isTV: () => this.ysdk.deviceInfo?.isTV() || false
            };
            
            this.log('info', 'Информация об окружении загружена:', {
                язык: this.environment.i18n.lang,
                домен: this.environment.i18n.tld,
                устройство: this.deviceInfo.type
            });
            
        } catch (error) {
            this.log('warn', 'Не удалось загрузить информацию об окружении:', error);
            this.setupFallbackEnvironment();
        }
    }

    /**
     * Инициализация сервисов
     */
    async initializeServices() {
        const services = [];
        
        // Игрок
        services.push(this.initializePlayer());
        
        // Условные сервисы
        if (this.config.leaderboards) {
            services.push(this.initializeLeaderboards());
        }
        
        if (this.config.payments) {
            services.push(this.initializePayments());
        }
        
        if (this.config.analytics) {
            services.push(this.initializeAnalytics());
        }
        
        if (this.config.achievements) {
            services.push(this.initializeAchievements());
        }
        
        // Выполняем инициализацию параллельно
        await Promise.allSettled(services);
    }

    /**
     * Инициализация игрока
     */
    async initializePlayer() {
        try {
            this.player = await this.ysdk.getPlayer({ scopes: false });
            this.cache.playerData = {
                id: this.player.getUniqueID(),
                name: this.player.getName(),
                photo: this.player.getPhoto('medium'),
                mode: this.player.getMode(),
                isAuthorized: this.player.getMode() !== 'lite'
            };
            
            this.log('info', \`Игрок инициализирован: \${this.cache.playerData.name} (режим: \${this.cache.playerData.mode})\`);
            this.emit('player:data', this.cache.playerData);
            
        } catch (error) {
            this.log('warn', 'Ошибка инициализации игрока:', error);
            this.setupFallbackPlayer();
        }
    }

    /**
     * Инициализация лидербордов
     */
    async initializeLeaderboards() {
        try {
            this.leaderboards = await this.ysdk.getLeaderboards();
            this.log('info', 'Лидерборды инициализированы');
        } catch (error) {
            this.log('warn', 'Ошибка инициализации лидербордов:', error);
        }
    }

    /**
     * Инициализация платежей
     */
    async initializePayments() {
        try {
            this.payments = await this.ysdk.getPayments({ signed: true });
            this.log('info', 'Платежи инициализированы');
        } catch (error) {
            this.log('warn', 'Ошибка инициализации платежей:', error);
        }
    }

    /**
     * Инициализация аналитики
     */
    async initializeAnalytics() {
        try {
            // Здесь можно добавить инициализацию Yandex.Metrika или других сервисов
            this.log('info', 'Аналитика инициализирована');
        } catch (error) {
            this.log('warn', 'Ошибка инициализации аналитики:', error);
        }
    }

    /**
     * Инициализация достижений
     */
    async initializeAchievements() {
        try {
            // Инициализация системы достижений
            this.log('info', 'Достижения инициализированы');
        } catch (error) {
            this.log('warn', 'Ошибка инициализации достижений:', error);
        }
    }

    /**
     * Fallback режим для разработки и отладки
     */
    async initializeFallbackMode() {
        this.log('info', 'Инициализация fallback режима');
        
        this.isInitialized = true;
        this.setupFallbackEnvironment();
        this.setupFallbackPlayer();
        this.setupFallbackServices();
        
        this.log('info', 'Fallback режим активирован');
    }

    /**
     * Настройка fallback окружения
     */
    setupFallbackEnvironment() {
        this.environment = {
            app: { id: 'dev_app_fallback' },
            browser: {
                lang: navigator.language.split('-')[0] || 'ru',
                userAgent: navigator.userAgent
            },
            domain: { tld: 'ru', domain: 'yandex.ru' },
            i18n: { lang: 'ru', tld: 'ru' },
            payload: '',
            device: {
                type: this.detectDeviceType(),
                orientation: this.getOrientation(),
                screen: {
                    width: window.screen.width,
                    height: window.screen.height
                }
            },
            iframe: window !== window.top
        };
        
        this.deviceInfo = {
            type: this.environment.device.type,
            isMobile: () => this.isMobileDevice(),
            isDesktop: () => this.isDesktopDevice(),
            isTablet: () => this.isTabletDevice(),
            isTV: () => false
        };
    }

    /**
     * Настройка fallback игрока
     */
    setupFallbackPlayer() {
        this.player = {
            getName: () => 'Разработчик',
            getPhoto: (size) => '',
            getUniqueID: () => 'dev_player_' + Date.now(),
            getMode: () => 'lite',
            getData: (keys) => Promise.resolve({}),
            setData: (data, immediate) => Promise.resolve(),
            getStats: (keys) => Promise.resolve({}),
            setStats: (data) => Promise.resolve(),
            incrementStats: (data) => Promise.resolve()
        };
        
        this.cache.playerData = {
            id: this.player.getUniqueID(),
            name: this.player.getName(),
            photo: '',
            mode: 'lite',
            isAuthorized: false
        };
    }

    /**
     * Настройка fallback сервисов
     */
    setupFallbackServices() {
        // Заглушки для лидербордов
        if (this.config.leaderboards) {
            this.leaderboards = {
                getLeaderboardEntries: (name, options) => Promise.resolve({
                    entries: [],
                    userRank: 0,
                    leaderboard: { name, title: name }
                }),
                setLeaderboardScore: (name, score, extraData) => Promise.resolve(),
                getLeaderboardPlayerEntry: (name) => Promise.resolve(null)
            };
        }
        
        // Заглушки для платежей
        if (this.config.payments) {
            this.payments = {
                getCatalog: () => Promise.resolve([]),
                purchase: (options) => Promise.reject(new Error('Payments not available in fallback mode')),
                getPurchases: () => Promise.resolve([]),
                consumePurchase: (token) => Promise.resolve()
            };
        }
    }

    /**
     * Определение типа устройства
     */
    detectDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        
        if (/SmartTV|SMART.TV|GoogleTV|AppleTV|roku|sonydtv|SonyDTV|HbbTV|CrKey|CE\\-HTML/.test(ua)) {
            return 'tv';
        }
        
        return 'desktop';
    }

    /**
     * Проверка мобильного устройства
     */
    isMobileDevice() {
        return this.detectDeviceType() === 'mobile';
    }

    /**
     * Проверка десктопного устройства
     */
    isDesktopDevice() {
        return this.detectDeviceType() === 'desktop';
    }

    /**
     * Проверка планшета
     */
    isTabletDevice() {
        return this.detectDeviceType() === 'tablet';
    }

    /**
     * Получение ориентации
     */
    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventHandlers() {
        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.emit('game:pause', { reason: 'visibility_change' });
            } else {
                this.emit('game:resume', { reason: 'visibility_change' });
            }
        });

        // Обработка фокуса окна
        window.addEventListener('blur', () => {
            this.emit('game:pause', { reason: 'window_blur' });
        });

        window.addEventListener('focus', () => {
            this.emit('game:resume', { reason: 'window_focus' });
        });

        // Обработка изменения сетевого статуса
        window.addEventListener('online', () => {
            this.connectionState.online = true;
            this.log('info', 'Подключение к сети восстановлено');
        });

        window.addEventListener('offline', () => {
            this.connectionState.online = false;
            this.log('warn', 'Потеряно подключение к сети');
        });

        // Обработка изменения ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.emit('orientation:change', {
                    orientation: this.getOrientation(),
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 100);
        });
    }

    /**
     * Обработка команд из очереди
     */
    async processCommandQueue() {
        while (this.commandQueue.length > 0) {
            const command = this.commandQueue.shift();
            try {
                await command();
            } catch (error) {
                this.log('warn', 'Ошибка выполнения отложенной команды:', error);
            }
        }
    }

    /**
     * Добавление команды в очередь
     */
    queueCommand(command) {
        if (this.isInitialized) {
            return command();
        } else {
            this.commandQueue.push(command);
        }
    }

    // =================== ПУБЛИЧНЫЕ МЕТОДЫ API ===================

    /**
     * Проверка готовности SDK
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Получение информации об игроке
     */
    getPlayer() {
        return this.cache.playerData;
    }

    /**
     * Получение информации об окружении
     */
    getEnvironment() {
        return this.environment;
    }

    /**
     * Получение информации об устройстве
     */
    getDeviceInfo() {
        return this.deviceInfo;
    }

    /**
     * Сохранение данных игрока с retry логикой
     */
    async savePlayerData(data, immediate = true) {
        return this.withRetry(async () => {
            if (!this.player) throw new Error('Player not initialized');
            
            await this.player.setData(data, immediate);
            this.log('info', 'Данные игрока сохранены', { size: JSON.stringify(data).length });
            return true;
        }, 'savePlayerData');
    }

    /**
     * Загрузка данных игрока с кешированием
     */
    async loadPlayerData(keys) {
        return this.withRetry(async () => {
            if (!this.player) throw new Error('Player not initialized');
            
            const data = await this.player.getData(keys);
            this.log('info', 'Данные игрока загружены');
            return data;
        }, 'loadPlayerData');
    }

    /**
     * Отправка результата в лидерборд
     */
    async submitScore(leaderboardName, score, extraData = {}) {
        return this.withRetry(async () => {
            if (!this.leaderboards) throw new Error('Leaderboards not initialized');
            
            const metadata = {
                timestamp: Date.now(),
                version: '2.0+',
                device: this.deviceInfo.type,
                ...extraData
            };
            
            await this.leaderboards.setLeaderboardScore(
                leaderboardName,
                score,
                JSON.stringify(metadata)
            );
            
            this.log('info', 'Результат отправлен в лидерборд', { 
                leaderboard: leaderboardName, 
                score 
            });
            
            return true;
        }, 'submitScore');
    }

    /**
     * Получение лидерборда с кешированием
     */
    async getLeaderboard(name, options = {}) {
        const cacheKey = \`leaderboard_\${name}_\${JSON.stringify(options)}\`;
        
        if (this.cache.leaderboards.has(cacheKey)) {
            const cached = this.cache.leaderboards.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // Кеш на 1 минуту
                return cached.data;
            }
        }
        
        return this.withRetry(async () => {
            if (!this.leaderboards) throw new Error('Leaderboards not initialized');
            
            const result = await this.leaderboards.getLeaderboardEntries(name, {
                quantityTop: options.top || 10,
                includeUser: options.includeUser !== false,
                quantityAround: options.around || 5
            });
            
            // Обрабатываем метаданные
            if (result.entries) {
                result.entries = result.entries.map(entry => ({
                    ...entry,
                    metadata: entry.extraData ? 
                        this.safeParseJSON(entry.extraData) : {}
                }));
            }
            
            // Кешируем результат
            this.cache.leaderboards.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        }, 'getLeaderboard');
    }

    /**
     * Показ межстраничной рекламы с улучшенной логикой
     */
    async showInterstitialAd(placement = 'default') {
        return this.withRetry(async () => {
            if (!this.ysdk?.adv) throw new Error('Advertising not available');
            
            // Проверяем кулдаун
            const timeSinceLastAd = Date.now() - this.adState.lastInterstitial;
            if (timeSinceLastAd < this.adState.interstitialCooldown) {
                this.log('info', 'Межстраничная реклама в кулдауне');
                return false;
            }
            
            return new Promise((resolve, reject) => {
                this.ysdk.adv.showFullscreenAdv({
                    callbacks: {
                        onOpen: () => {
                            this.emit('ad:opened', { type: 'interstitial', placement });
                            this.emit('game:pause', { reason: 'advertisement' });
                        },
                        onClose: (wasShown) => {
                            this.adState.lastInterstitial = Date.now();
                            this.emit('ad:closed', { 
                                type: 'interstitial', 
                                placement, 
                                wasShown 
                            });
                            this.emit('game:resume', { reason: 'advertisement_closed' });
                            resolve(wasShown);
                        },
                        onError: (error) => {
                            this.emit('ad:error', { 
                                type: 'interstitial', 
                                placement, 
                                error 
                            });
                            this.emit('game:resume', { reason: 'advertisement_error' });
                            reject(error);
                        }
                    }
                });
            });
        }, 'showInterstitialAd');
    }

    /**
     * Показ рекламы с вознаграждением
     */
    async showRewardedAd(placement = 'default') {
        return this.withRetry(async () => {
            if (!this.ysdk?.adv) throw new Error('Advertising not available');
            
            return new Promise((resolve, reject) => {
                this.ysdk.adv.showRewardedVideo({
                    callbacks: {
                        onOpen: () => {
                            this.emit('ad:opened', { type: 'rewarded', placement });
                            this.emit('game:pause', { reason: 'rewarded_ad' });
                        },
                        onRewarded: () => {
                            this.emit('ad:rewarded', { placement });
                        },
                        onClose: () => {
                            this.emit('ad:closed', { type: 'rewarded', placement });
                            this.emit('game:resume', { reason: 'rewarded_ad_closed' });
                            resolve(true);
                        },
                        onError: (error) => {
                            this.emit('ad:error', { type: 'rewarded', placement, error });
                            this.emit('game:resume', { reason: 'rewarded_ad_error' });
                            reject(error);
                        }
                    }
                });
            });
        }, 'showRewardedAd');
    }

    /**
     * Покупка товара с расширенной обработкой
     */
    async purchaseProduct(productId, developerPayload = {}) {
        return this.withRetry(async () => {
            if (!this.payments) throw new Error('Payments not initialized');
            
            const fullPayload = {
                timestamp: Date.now(),
                userId: this.cache.playerData?.id,
                device: this.deviceInfo.type,
                version: this.sdkVersion,
                ...developerPayload
            };
            
            const purchase = await this.payments.purchase({
                id: productId,
                developerPayload: JSON.stringify(fullPayload)
            });
            
            this.log('info', 'Покупка совершена', { productId, purchaseToken: purchase.purchaseToken });
            
            // Подтверждаем покупку
            await this.payments.consumePurchase(purchase.purchaseToken);
            
            return purchase;
        }, 'purchaseProduct');
    }

    // =================== СЛУЖЕБНЫЕ МЕТОДЫ ===================

    /**
     * Выполнение с повторными попытками
     */
    async withRetry(operation, operationName, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.metrics.apiCalls++;
                const result = await operation();
                
                if (attempt > 1) {
                    this.log('info', \`Операция \${operationName} успешна с \${attempt} попытки\`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                this.metrics.errorCount++;
                this.metrics.retryCount++;
                
                this.log('warn', \`Ошибка операции \${operationName} (попытка \${attempt}/\${maxRetries}):`, error);
                
                if (attempt < maxRetries) {
                    // Экспоненциальная задержка
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        this.emit('error', {
            operation: operationName,
            error: lastError,
            attempts: maxRetries
        });
        
        throw lastError;
    }

    /**
     * Безопасный парсинг JSON
     */
    safeParseJSON(str, defaultValue = {}) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    }

    /**
     * Обработчики рекламных событий
     */
    handleAdOpened() {
        this.log('info', 'Реклама открыта');
    }

    handleAdClosed(wasShown) {
        this.log('info', \`Реклама закрыта, показана: \${wasShown}\`);
    }

    handleAdError(error) {
        this.log('error', 'Ошибка рекламы:', error);
    }

    /**
     * Обработка ошибок
     */
    handleError(type, error) {
        this.log('error', \`\${type}:`, error);
        this.emit('error', { type, error });
    }

    /**
     * Система событий
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log('error', \`Ошибка в обработчике события \${event}:`, error);
                }
            });
        }
    }

    /**
     * Логирование с отправкой на сервер в продакшене
     */
    log(level, message, data = {}) {
        const logEntry = {
            level,
            message,
            data,
            timestamp: new Date().toISOString(),
            sdk: this.sdkVersion,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Локальное логирование
        console[level] || console.log(\`[Yandex SDK \${level.toUpperCase()}]\`, message, data);

        // Отправка на сервер в продакшене
        if (window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1' &&
            this.connectionState.online) {
            
            this.queueCommand(async () => {
                try {
                    await fetch('/api/analytics/sdk-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(logEntry)
                    });
                } catch (error) {
                    console.warn('Failed to send SDK log to server:', error);
                }
            });
        }
    }

    /**
     * Получение метрик производительности
     */
    getMetrics() {
        return {
            ...this.metrics,
            connectionState: this.connectionState,
            cacheSize: {
                leaderboards: this.cache.leaderboards.size,
                achievements: this.cache.achievements.size
            }
        };
    }

    /**
     * Очистка кеша
     */
    clearCache() {
        this.cache.leaderboards.clear();
        this.cache.achievements.clear();
        this.log('info', 'Кеш очищен');
    }

    /**
     * Получение состояния SDK
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isInitializing: this.isInitializing,
            environment: this.environment,
            player: this.cache.playerData,
            deviceInfo: this.deviceInfo,
            connectionState: this.connectionState,
            metrics: this.getMetrics(),
            config: this.config
        };
    }
}

// Автоматическое создание глобального экземпляра
if (typeof window !== 'undefined') {
    window.YandexGamesSDK = new ModernYandexGamesSDK();
    
    // Совместимость со старым API
    window.yandexGamesSDK = window.YandexGamesSDK;
}

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModernYandexGamesSDK };
}
`;
  }

  /**
   * Генерирует код интеграции для конкретной игры
   */
  public static integrateIntoGame(gameCode: string, config: ModernYandexSDKConfig): string {
    const sdkScript = this.generateModernSDKIntegration(config);
    
    const htmlIntegration = `
    <!-- Yandex Games SDK v2.0+ Modern Integration -->
    <script src="https://yandex.ru/games/sdk/v2"></script>
    <script>
        ${sdkScript}
        
        // Глобальная функция для игр
        function getYandexSDK() {
            return window.YandexGamesSDK;
        }
        
        // Хелперы для быстрого доступа
        function whenSDKReady(callback) {
            const sdk = getYandexSDK();
            if (sdk.isReady()) {
                callback(sdk);
            } else {
                sdk.on('ready', () => callback(sdk));
            }
        }
        
        function saveGame(data) {
            return getYandexSDK().savePlayerData(data);
        }
        
        function loadGame(keys) {
            return getYandexSDK().loadPlayerData(keys);
        }
        
        function submitHighScore(score, leaderboard = 'main') {
            return getYandexSDK().submitScore(leaderboard, score);
        }
        
        function showAd(type = 'interstitial', placement = 'game') {
            const sdk = getYandexSDK();
            return type === 'rewarded' ? 
                sdk.showRewardedAd(placement) : 
                sdk.showInterstitialAd(placement);
        }
        
        // Автоматический обработчик паузы/возобновления
        getYandexSDK().on('game:pause', (data) => {
            if (window.gameInstance && typeof window.gameInstance.pause === 'function') {
                window.gameInstance.pause();
            }
        });
        
        getYandexSDK().on('game:resume', (data) => {
            if (window.gameInstance && typeof window.gameInstance.resume === 'function') {
                window.gameInstance.resume();
            }
        });
    </script>
    
    <style>
        /* Стили для адаптивности в iframe */
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        
        /* Стили для уведомлений SDK */
        .yandex-sdk-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.5s ease;
        }
        
        .yandex-sdk-notification.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .yandex-sdk-notification .title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .yandex-sdk-notification .message {
            font-size: 14px;
            opacity: 0.9;
        }
        
        /* Адаптивность для разных экранов */
        @media (max-width: 768px) {
            .yandex-sdk-notification {
                top: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
        
        @media (orientation: portrait) {
            body {
                /* Стили для портретной ориентации */
            }
        }
        
        @media (orientation: landscape) {
            body {
                /* Стили для альбомной ориентации */
            }
        }
    </style>`;

    // Ищем </body> и добавляем скрипт перед ним
    if (gameCode.includes('</body>')) {
      return gameCode.replace('</body>', `${htmlIntegration}\n</body>`);
    } else {
      // Если нет </body>, добавляем в конец
      return gameCode + htmlIntegration;
    }
  }

  /**
   * Создает конфигурацию SDK на основе дизайна игры
   */
  public static createSDKConfig(gameDesign: GameDesign): ModernYandexSDKConfig {
    return {
      // Основные возможности
      leaderboards: true,
      advertising: {
        rewarded: true,
        interstitial: true,
        banner: true,
        sticky: true
      },
      social: true,
      auth: true,
      
      // Новые возможности
      deviceInfo: true,
      environment: true,
      localization: true,
      analytics: true,
      achievements: true,
      
      // Настройки iframe
      iframe: {
        checkEnvironment: true,
        allowFullscreen: true,
        orientationLock: gameDesign.orientation || 'landscape'
      },
      
      // Fallback
      fallback: {
        enabled: true,
        logErrors: true,
        emulateFeatures: true
      },
      
      // Производительность
      performance: {
        lazyInit: false,
        preloadFeatures: ['player', 'environment', 'deviceInfo'],
        errorRetryCount: 3,
        timeoutMs: 10000
      }
    };
  }
} 