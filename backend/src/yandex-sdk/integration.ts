import { GameDesign } from '@/types';

export interface YandexSDKConfig {
  leaderboards?: boolean;
  payments?: boolean;
  advertising?: {
    rewarded?: boolean;
    interstitial?: boolean;
    banner?: boolean;
  };
  shortcut?: boolean;
  rateApp?: boolean;
  social?: boolean;
}

export class YandexSDKIntegrator {
  
  /**
   * Генерирует код интеграции Yandex Games SDK
   */
  public static generateSDKIntegration(config: YandexSDKConfig): string {
    return `
// Yandex Games SDK Integration
class YandexGamesSDK {
    constructor() {
        this.ysdk = null;
        this.player = null;
        this.leaderboard = null;
        this.payments = null;
        this.initialized = false;
        this.features = ${JSON.stringify(config, null, 8)};
    }

    /**
     * Инициализация SDK
     */
    async init() {
        try {
            console.log('🎮 Инициализация Yandex Games SDK...');
            
            // Проверяем доступность SDK
            if (typeof YaGames === 'undefined') {
                console.warn('⚠️ Yandex Games SDK не найден, работаем в режиме эмуляции');
                this.initializeFallback();
                return;
            }

            // Инициализируем SDK
            this.ysdk = await YaGames.init({
                orientation: {
                    value: 'landscape',
                    lock: true
                }
            });

            console.log('✅ Yandex Games SDK инициализирован');

            // Инициализируем игрока
            await this.initializePlayer();

            // Инициализируем дополнительные сервисы
            ${config.leaderboards ? 'await this.initializeLeaderboards();' : ''}
            ${config.payments ? 'await this.initializePayments();' : ''}

            this.initialized = true;
            console.log('🚀 Все сервисы Yandex Games готовы к работе');

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
        this.player = {
            getName: () => 'Разработчик',
            getPhoto: () => '',
            getUniqueID: () => 'dev_player_id'
        };
    }

    /**
     * Инициализация игрока
     */
    async initializePlayer() {
        try {
            this.player = await this.ysdk.getPlayer({
                scopes: false // Не запрашиваем персональные данные сразу
            });
            console.log('👤 Игрок инициализирован');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации игрока:', error);
        }
    }

    ${config.leaderboards ? this.generateLeaderboardMethods() : ''}
    ${config.payments ? this.generatePaymentMethods() : ''}
    ${config.advertising ? this.generateAdvertisingMethods(config.advertising) : ''}
    ${config.shortcut ? this.generateShortcutMethods() : ''}
    ${config.rateApp ? this.generateRateAppMethods() : ''}
    ${config.social ? this.generateSocialMethods() : ''}

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
            id: this.player.getUniqueID()
        };
    }

    /**
     * Сохранение данных игрока
     */
    async savePlayerData(data) {
        if (!this.player) return false;
        
        try {
            await this.player.setData(data, true);
            console.log('💾 Данные игрока сохранены');
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
            return data;
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            return {};
        }
    }

    /**
     * Логирование событий для аналитики
     */
    logEvent(eventName, parameters = {}) {
        try {
            if (this.ysdk && this.ysdk.metrica) {
                this.ysdk.metrica.hit(eventName, parameters);
                console.log(\`📊 Событие зафиксировано: \${eventName}\`, parameters);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка логирования события:', error);
        }
    }

    /**
     * Обработка паузы игры
     */
    onGamePause(callback) {
        try {
            if (this.ysdk) {
                this.ysdk.features.LoadingAPI?.ready();
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ Ошибка настройки паузы:', error);
        }
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
}

// Глобальный экземпляр SDK
window.yandexGamesSDK = new YandexGamesSDK();

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await window.yandexGamesSDK.init();
});
`;
  }

  /**
   * Генерирует методы для работы с таблицей лидеров
   */
  private static generateLeaderboardMethods(): string {
    return `
    /**
     * Инициализация таблицы лидеров
     */
    async initializeLeaderboards() {
        try {
            this.leaderboard = this.ysdk.getLeaderboards();
            console.log('🏆 Таблица лидеров инициализирована');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации таблицы лидеров:', error);
        }
    }

    /**
     * Отправка результата в таблицу лидеров
     */
    async submitScore(leaderboardName, score, extraData = '') {
        if (!this.leaderboard) {
            console.warn('⚠️ Таблица лидеров не инициализирована');
            return false;
        }

        try {
            await this.leaderboard.setLeaderboardScore(leaderboardName, score, extraData);
            console.log(\`🏆 Результат \${score} отправлен в таблицу \${leaderboardName}\`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка отправки результата:', error);
            return false;
        }
    }

    /**
     * Получение таблицы лидеров
     */
    async getLeaderboard(leaderboardName, options = {}) {
        if (!this.leaderboard) {
            console.warn('⚠️ Таблица лидеров не инициализирована');
            return null;
        }

        try {
            const result = await this.leaderboard.getLeaderboardEntries(leaderboardName, {
                includeUser: true,
                quantityAround: 5,
                quantityTop: 10,
                ...options
            });
            console.log(\`📊 Получена таблица лидеров: \${leaderboardName}\`);
            return result;
        } catch (error) {
            console.error('❌ Ошибка получения таблицы лидеров:', error);
            return null;
        }
    }`;
  }

  /**
   * Генерирует методы для работы с платежами
   */
  private static generatePaymentMethods(): string {
    return `
    /**
     * Инициализация платежей
     */
    async initializePayments() {
        try {
            this.payments = this.ysdk.getPayments({ signed: true });
            console.log('💳 Платежная система инициализирована');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации платежей:', error);
        }
    }

    /**
     * Покупка товара
     */
    async purchaseItem(productID, developerPayload = '') {
        if (!this.payments) {
            console.warn('⚠️ Платежная система не инициализирована');
            return false;
        }

        try {
            const purchase = await this.payments.purchase({
                id: productID,
                developerPayload: developerPayload
            });
            
            console.log(\`💰 Товар \${productID} успешно куплен\`, purchase);
            return purchase;
        } catch (error) {
            console.error('❌ Ошибка покупки:', error);
            return false;
        }
    }

    /**
     * Получение каталога товаров
     */
    async getCatalog() {
        if (!this.payments) {
            console.warn('⚠️ Платежная система не инициализирована');
            return [];
        }

        try {
            const catalog = await this.payments.getCatalog();
            console.log('🛍️ Каталог товаров получен:', catalog);
            return catalog;
        } catch (error) {
            console.error('❌ Ошибка получения каталога:', error);
            return [];
        }
    }

    /**
     * Получение покупок игрока
     */
    async getPurchases() {
        if (!this.payments) {
            console.warn('⚠️ Платежная система не инициализирована');
            return [];
        }

        try {
            const purchases = await this.payments.getPurchases();
            console.log('🛒 Покупки игрока получены:', purchases);
            return purchases;
        } catch (error) {
            console.error('❌ Ошибка получения покупок:', error);
            return [];
        }
    }`;
  }

  /**
   * Генерирует методы для работы с рекламой
   */
  private static generateAdvertisingMethods(adConfig: any): string {
    return `
    /**
     * Показ полноэкранной рекламы
     */
    async showInterstitialAd(callbacks = {}) {
        ${adConfig.interstitial ? `
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            await this.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        console.log('📺 Межстраничная реклама открыта');
                        if (callbacks.onOpen) callbacks.onOpen();
                        // Ставим игру на паузу
                        if (window.game && window.game.scene && window.game.scene.isActive()) {
                            window.game.scene.pause();
                        }
                    },
                    onClose: (wasShown) => {
                        console.log(\`📺 Межстраничная реклама закрыта, показана: \${wasShown}\`);
                        if (callbacks.onClose) callbacks.onClose(wasShown);
                        // Снимаем игру с паузы
                        if (window.game && window.game.scene && window.game.scene.isPaused()) {
                            window.game.scene.resume();
                        }
                    },
                    onError: (error) => {
                        console.error('❌ Ошибка межстраничной рекламы:', error);
                        if (callbacks.onError) callbacks.onError(error);
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('❌ Ошибка показа межстраничной рекламы:', error);
            return false;
        }
        ` : `
        console.warn('⚠️ Межстраничная реклама отключена в конфигурации');
        return false;
        `}
    }

    /**
     * Показ рекламы с вознаграждением
     */
    async showRewardedAd(callbacks = {}) {
        ${adConfig.rewarded ? `
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            await this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        console.log('🎁 Реклама с вознаграждением открыта');
                        if (callbacks.onOpen) callbacks.onOpen();
                        // Ставим игру на паузу
                        if (window.game && window.game.scene && window.game.scene.isActive()) {
                            window.game.scene.pause();
                        }
                    },
                    onRewarded: () => {
                        console.log('🎁 Вознаграждение получено');
                        if (callbacks.onRewarded) callbacks.onRewarded();
                        this.logEvent('rewarded_ad_watched');
                    },
                    onClose: () => {
                        console.log('🎁 Реклама с вознаграждением закрыта');
                        if (callbacks.onClose) callbacks.onClose();
                        // Снимаем игру с паузы
                        if (window.game && window.game.scene && window.game.scene.isPaused()) {
                            window.game.scene.resume();
                        }
                    },
                    onError: (error) => {
                        console.error('❌ Ошибка рекламы с вознаграждением:', error);
                        if (callbacks.onError) callbacks.onError(error);
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('❌ Ошибка показа рекламы с вознаграждением:', error);
            return false;
        }
        ` : `
        console.warn('⚠️ Реклама с вознаграждением отключена в конфигурации');
        return false;
        `}
    }

    /**
     * Показ баннерной рекламы
     */
    async showBannerAd(options = {}) {
        ${adConfig.banner ? `
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            await this.ysdk.adv.getBannerAdvStatus().then(({ stickyAdvIsShowing, reason }) => {
                if (stickyAdvIsShowing) {
                    console.log('🏷️ Баннерная реклама уже показана');
                } else {
                    console.log('🏷️ Баннерная реклама недоступна:', reason);
                }
            });
            return true;
        } catch (error) {
            console.error('❌ Ошибка баннерной рекламы:', error);
            return false;
        }
        ` : `
        console.warn('⚠️ Баннерная реклама отключена в конфигурации');
        return false;
        `}
    }`;
  }

  /**
   * Генерирует методы для ярлыка на рабочий стол
   */
  private static generateShortcutMethods(): string {
    return `
    /**
     * Предложение создать ярлык
     */
    async promptShortcut() {
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            const canPrompt = await this.ysdk.shortcut.canShowPrompt();
            if (canPrompt.canShow) {
                const result = await this.ysdk.shortcut.showPrompt();
                if (result.outcome === 'accepted') {
                    console.log('📱 Ярлык создан');
                    this.logEvent('shortcut_created');
                    return true;
                } else {
                    console.log('📱 Создание ярлыка отклонено');
                    return false;
                }
            } else {
                console.log('📱 Нельзя предложить создание ярлыка:', canPrompt.reason);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка создания ярлыка:', error);
            return false;
        }
    }`;
  }

  /**
   * Генерирует методы для оценки приложения
   */
  private static generateRateAppMethods(): string {
    return `
    /**
     * Предложение оценить игру
     */
    async promptRating() {
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            const canReview = await this.ysdk.feedback.canReview();
            if (canReview.value) {
                const result = await this.ysdk.feedback.requestReview();
                if (result.feedbackSent) {
                    console.log('⭐ Отзыв отправлен');
                    this.logEvent('rating_given');
                    return true;
                } else {
                    console.log('⭐ Отзыв не был отправлен');
                    return false;
                }
            } else {
                console.log('⭐ Нельзя запросить отзыв:', canReview.reason);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка запроса отзыва:', error);
            return false;
        }
    }`;
  }

  /**
   * Генерирует методы для социальных функций
   */
  private static generateSocialMethods(): string {
    return `
    /**
     * Поделиться результатом
     */
    async shareScore(score, options = {}) {
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            await this.ysdk.clipboard.writeText(\`Мой результат в игре: \${score} очков! Попробуй обыграть меня!\`);
            console.log('📋 Результат скопирован в буфер обмена');
            this.logEvent('score_shared', { score });
            return true;
        } catch (error) {
            console.error('❌ Ошибка копирования результата:', error);
            return false;
        }
    }

    /**
     * Пригласить друзей
     */
    async inviteFriends() {
        if (!this.ysdk) {
            console.warn('⚠️ SDK не инициализирован');
            return false;
        }

        try {
            // Yandex Games пока не поддерживает прямые приглашения
            // Используем fallback через буфер обмена
            await this.ysdk.clipboard.writeText('Попробуй эту классную игру!');
            console.log('📋 Приглашение скопировано в буфер обмена');
            this.logEvent('friends_invited');
            return true;
        } catch (error) {
            console.error('❌ Ошибка приглашения друзей:', error);
            return false;
        }
    }`;
  }

  /**
   * Интегрирует SDK в существующий код игры
   */
  public static integrateIntoGame(gameCode: string, config: YandexSDKConfig): string {
    const sdkIntegration = this.generateSDKIntegration(config);
    
    // Добавляем SDK в HTML перед закрывающим тегом body
    const sdkScript = `
    <!-- Yandex Games SDK -->
    <script src="https://yandex.ru/games/sdk/v2"></script>
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
   * Создает конфигурацию SDK на основе дизайна игры
   */
  public static createSDKConfig(gameDesign: GameDesign): YandexSDKConfig {
    const config: YandexSDKConfig = {
      leaderboards: true, // Всегда включаем таблицу лидеров
      advertising: {
        rewarded: true,     // Всегда включаем рекламу с вознаграждением
        interstitial: true, // Всегда включаем межстраничную рекламу
        banner: false       // Баннеры отключаем по умолчанию
      },
      shortcut: true,       // Всегда предлагаем создать ярлык
      rateApp: true         // Всегда просим оценить
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

    // Включаем социальные функции для мультиплеерных игр
    if (gameDesign.mechanics && gameDesign.mechanics.includes('multiplayer')) {
      config.social = true;
    }

    return config;
  }
} 