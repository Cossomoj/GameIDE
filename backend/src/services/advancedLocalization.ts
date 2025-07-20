import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { LoggerService } from './logger';

export interface ExtendedTranslation {
  [key: string]: string | ExtendedTranslation | ContextualTranslation;
}

export interface ContextualTranslation {
  default: string;
  contexts?: {
    [context: string]: string;
  };
  plurals?: {
    [form: string]: string;
  };
  gender?: {
    [gender: string]: string;
  };
}

export interface AdvancedLanguageData {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  rtl: boolean;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
  pluralRules: (n: number) => string;
  genderRules?: string[];
  translations: ExtendedTranslation;
  loadStatus: 'pending' | 'loaded' | 'error';
  lastUpdated: Date;
}

export interface YandexRegion {
  code: string;
  name: string;
  preferredLanguages: string[];
  currency: string;
  timezone: string;
}

export interface LocalizationSettings {
  autoDetectLanguage: boolean;
  fallbackChain: string[];
  enableContextualTranslations: boolean;
  enableDynamicLoading: boolean;
  cacheTranslations: boolean;
  translateNumbers: boolean;
  translateDates: boolean;
}

/**
 * Продвинутая система локализации для Yandex Games
 */
export class AdvancedLocalizationService extends EventEmitter {
  private languages: Map<string, AdvancedLanguageData> = new Map();
  private currentLanguage: string = 'ru';
  private settings: LocalizationSettings;
  private logger: LoggerService;
  private translationCache: Map<string, Map<string, string>> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  // Поддерживаемые регионы Yandex Games
  private yandexRegions: Map<string, YandexRegion> = new Map([
    ['ru', { code: 'ru', name: 'Russia', preferredLanguages: ['ru', 'en'], currency: 'RUB', timezone: 'Europe/Moscow' }],
    ['tr', { code: 'tr', name: 'Turkey', preferredLanguages: ['tr', 'en'], currency: 'TRY', timezone: 'Europe/Istanbul' }],
    ['by', { code: 'by', name: 'Belarus', preferredLanguages: ['be', 'ru', 'en'], currency: 'BYN', timezone: 'Europe/Minsk' }],
    ['ua', { code: 'ua', name: 'Ukraine', preferredLanguages: ['uk', 'ru', 'en'], currency: 'UAH', timezone: 'Europe/Kiev' }],
    ['kz', { code: 'kz', name: 'Kazakhstan', preferredLanguages: ['kz', 'ru', 'en'], currency: 'KZT', timezone: 'Asia/Almaty' }],
    ['uz', { code: 'uz', name: 'Uzbekistan', preferredLanguages: ['uz', 'ru', 'en'], currency: 'UZS', timezone: 'Asia/Tashkent' }],
    ['ge', { code: 'ge', name: 'Georgia', preferredLanguages: ['ka', 'ru', 'en'], currency: 'GEL', timezone: 'Asia/Tbilisi' }],
    ['am', { code: 'am', name: 'Armenia', preferredLanguages: ['hy', 'ru', 'en'], currency: 'AMD', timezone: 'Asia/Yerevan' }],
    ['az', { code: 'az', name: 'Azerbaijan', preferredLanguages: ['az', 'ru', 'en'], currency: 'AZN', timezone: 'Asia/Baku' }],
    ['kg', { code: 'kg', name: 'Kyrgyzstan', preferredLanguages: ['ky', 'ru', 'en'], currency: 'KGS', timezone: 'Asia/Bishkek' }],
    ['tj', { code: 'tj', name: 'Tajikistan', preferredLanguages: ['tg', 'ru', 'en'], currency: 'TJS', timezone: 'Asia/Dushanbe' }],
    ['md', { code: 'md', name: 'Moldova', preferredLanguages: ['mo', 'ru', 'en'], currency: 'MDL', timezone: 'Europe/Chisinau' }]
  ]);

  constructor(settings?: Partial<LocalizationSettings>) {
    super();
    this.logger = new LoggerService();
    
    this.settings = {
      autoDetectLanguage: true,
      fallbackChain: ['en', 'ru'],
      enableContextualTranslations: true,
      enableDynamicLoading: true,
      cacheTranslations: true,
      translateNumbers: true,
      translateDates: true,
      ...settings
    };

    this.initializeLanguages();
  }

  /**
   * Инициализация языков с расширенной поддержкой
   */
  private async initializeLanguages(): Promise<void> {
    // Русский язык (базовый)
    this.languages.set('ru', {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      flag: '🇷🇺',
      region: 'ru',
      rtl: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: {
        decimal: ',',
        thousands: ' ',
        currency: '₽'
      },
      pluralRules: this.createRussianPluralRules(),
      genderRules: ['masculine', 'feminine', 'neuter'],
      translations: await this.loadRussianTranslations(),
      loadStatus: 'loaded',
      lastUpdated: new Date()
    });

    // Английский язык
    this.languages.set('en', {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      region: 'us',
      rtl: false,
      dateFormat: 'MM/DD/YYYY',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '$'
      },
      pluralRules: this.createEnglishPluralRules(),
      translations: await this.loadEnglishTranslations(),
      loadStatus: 'loaded',
      lastUpdated: new Date()
    });

    // Турецкий язык
    this.languages.set('tr', {
      code: 'tr',
      name: 'Turkish',
      nativeName: 'Türkçe',
      flag: '🇹🇷',
      region: 'tr',
      rtl: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: {
        decimal: ',',
        thousands: '.',
        currency: '₺'
      },
      pluralRules: this.createTurkishPluralRules(),
      translations: await this.loadTurkishTranslations(),
      loadStatus: 'loaded',
      lastUpdated: new Date()
    });

    // Добавляем остальные языки с ленивой загрузкой
    await this.registerLazyLanguages();

    this.logger.info('🌐 Система локализации инициализирована с поддержкой', this.languages.size, 'языков');
  }

  /**
   * Регистрирует языки для ленивой загрузки
   */
  private async registerLazyLanguages(): Promise<void> {
    const lazyLanguages = [
      { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'ua' },
      { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', region: 'by' },
      { code: 'kz', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿', region: 'kz' },
      { code: 'uz', name: 'Uzbek', nativeName: 'O\'zbekcha', flag: '🇺🇿', region: 'uz' },
      { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', region: 'ge' },
      { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', region: 'am' },
      { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca', flag: '🇦🇿', region: 'az' },
      { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', region: 'kg' },
      { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', region: 'tj' },
      { code: 'mo', name: 'Moldovan', nativeName: 'Română', flag: '🇲🇩', region: 'md' }
    ];

    for (const lang of lazyLanguages) {
      this.languages.set(lang.code, {
        ...lang,
        rtl: false,
        dateFormat: 'DD.MM.YYYY',
        numberFormat: {
          decimal: ',',
          thousands: ' ',
          currency: '₽'
        },
        pluralRules: this.createRussianPluralRules(), // По умолчанию русские правила
        translations: {},
        loadStatus: 'pending',
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Автоматическое определение языка пользователя
   */
  public async autoDetectLanguage(userContext?: {
    region?: string;
    browserLanguage?: string;
    yandexLanguage?: string;
  }): Promise<string> {
    try {
      if (!this.settings.autoDetectLanguage) {
        return this.currentLanguage;
      }

      let detectedLanguage = this.currentLanguage;

      // Приоритет 1: Язык Yandex Games
      if (userContext?.yandexLanguage) {
        const yandexLang = this.normalizeLanguageCode(userContext.yandexLanguage);
        if (this.languages.has(yandexLang)) {
          detectedLanguage = yandexLang;
          this.logger.info('🎯 Язык определен по Yandex Games:', detectedLanguage);
        }
      }

      // Приоритет 2: Регион Yandex
      if (userContext?.region && this.yandexRegions.has(userContext.region)) {
        const region = this.yandexRegions.get(userContext.region)!;
        for (const preferredLang of region.preferredLanguages) {
          if (this.languages.has(preferredLang)) {
            detectedLanguage = preferredLang;
            this.logger.info('🌍 Язык определен по региону:', userContext.region, '→', detectedLanguage);
            break;
          }
        }
      }

      // Приоритет 3: Язык браузера
      if (userContext?.browserLanguage) {
        const browserLang = this.normalizeLanguageCode(userContext.browserLanguage);
        if (this.languages.has(browserLang)) {
          detectedLanguage = browserLang;
          this.logger.info('🌐 Язык определен по браузеру:', detectedLanguage);
        }
      }

      // Устанавливаем определенный язык
      await this.setLanguage(detectedLanguage);
      
      this.emit('language:detected', { 
        detected: detectedLanguage, 
        previous: this.currentLanguage,
        context: userContext 
      });

      return detectedLanguage;
    } catch (error) {
      this.logger.error('Ошибка автоопределения языка:', error);
      return this.currentLanguage;
    }
  }

  /**
   * Устанавливает текущий язык с динамической загрузкой
   */
  public async setLanguage(languageCode: string): Promise<boolean> {
    try {
      const normalizedCode = this.normalizeLanguageCode(languageCode);
      
      if (!this.languages.has(normalizedCode)) {
        this.logger.warn('Неподдерживаемый язык:', languageCode);
        return false;
      }

      const language = this.languages.get(normalizedCode)!;
      
      // Загружаем переводы если еще не загружены
      if (language.loadStatus === 'pending') {
        await this.loadLanguageTranslations(normalizedCode);
      }

      const previousLanguage = this.currentLanguage;
      this.currentLanguage = normalizedCode;

      this.logger.info('🔄 Язык изменен:', previousLanguage, '→', normalizedCode);
      
      this.emit('language:changed', { 
        from: previousLanguage, 
        to: normalizedCode,
        language: {
          code: language.code,
          name: language.name,
          nativeName: language.nativeName
        }
      });

      return true;
    } catch (error) {
      this.logger.error('Ошибка установки языка:', error);
      return false;
    }
  }

  /**
   * Получает перевод с поддержкой контекста, множественного числа и интерполяции
   */
  public translate(
    key: string, 
    options: {
      context?: string;
      count?: number;
      gender?: string;
      interpolation?: { [key: string]: any };
      namespace?: string;
      fallback?: string;
    } = {}
  ): string {
    try {
      const cacheKey = this.createCacheKey(key, options);
      
      // Проверяем кеш
      if (this.settings.cacheTranslations) {
        const cached = this.getFromCache(this.currentLanguage, cacheKey);
        if (cached) {
          return cached;
        }
      }

      let translation = this.findTranslation(key, this.currentLanguage, options);
      
      // Fallback на другие языки
      if (!translation) {
        for (const fallbackLang of this.settings.fallbackChain) {
          translation = this.findTranslation(key, fallbackLang, options);
          if (translation) {
            this.logger.warn('Использован fallback перевод:', key, fallbackLang);
            break;
          }
        }
      }

      // Последний fallback
      if (!translation) {
        translation = options.fallback || key;
        this.logger.warn('Перевод не найден:', key);
      }

      // Применяем интерполяцию
      if (options.interpolation) {
        translation = this.interpolate(translation, options.interpolation);
      }

      // Кешируем результат
      if (this.settings.cacheTranslations) {
        this.saveToCache(this.currentLanguage, cacheKey, translation);
      }

      return translation;
    } catch (error) {
      this.logger.error('Ошибка перевода:', error, { key, options });
      return options.fallback || key;
    }
  }

  /**
   * Находит перевод с учетом контекста
   */
  private findTranslation(key: string, languageCode: string, options: any): string | null {
    const language = this.languages.get(languageCode);
    if (!language || language.loadStatus !== 'loaded') {
      return null;
    }

    const keyPath = options.namespace ? `${options.namespace}.${key}` : key;
    const value = this.getNestedValue(language.translations, keyPath);
    
    if (!value) {
      return null;
    }

    // Простая строка
    if (typeof value === 'string') {
      return value;
    }

    // Контекстуальный перевод
    if (typeof value === 'object' && value.default) {
      const contextual = value as ContextualTranslation;
      
      // Проверяем контекст
      if (options.context && contextual.contexts?.[options.context]) {
        return contextual.contexts[options.context];
      }
      
      // Проверяем множественное число
      if (options.count !== undefined && contextual.plurals) {
        const pluralForm = language.pluralRules!(options.count);
        if (contextual.plurals[pluralForm]) {
          return contextual.plurals[pluralForm];
        }
      }
      
      // Проверяем род
      if (options.gender && contextual.gender?.[options.gender]) {
        return contextual.gender[options.gender];
      }
      
      return contextual.default;
    }

    return null;
  }

  /**
   * Интерполяция переменных в строку
   */
  private interpolate(text: string, variables: { [key: string]: any }): string {
    return text.replace(/\{([^}]+)\}/g, (match, variableName) => {
      const keys = variableName.split('.');
      let value = variables;
      
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) {
          return match;
        }
      }
      
      return String(value);
    });
  }

  /**
   * Форматирует число согласно локали
   */
  public formatNumber(number: number, options: {
    style?: 'decimal' | 'currency' | 'percent';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}): string {
    if (!this.settings.translateNumbers) {
      return number.toString();
    }

    const language = this.languages.get(this.currentLanguage);
    if (!language) {
      return number.toString();
    }

    try {
      const { decimal, thousands, currency } = language.numberFormat;
      
      let formattedNumber = number.toFixed(options.maximumFractionDigits || 0);
      
      // Разделяем на целую и дробную части
      const [integerPart, decimalPart] = formattedNumber.split('.');
      
      // Добавляем разделители тысяч
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      
      // Собираем число
      let result = formattedInteger;
      if (decimalPart && options.maximumFractionDigits) {
        result += decimal + decimalPart;
      }
      
      // Добавляем валюту
      if (options.style === 'currency') {
        result += ' ' + currency;
      } else if (options.style === 'percent') {
        result += '%';
      }
      
      return result;
    } catch (error) {
      this.logger.error('Ошибка форматирования числа:', error);
      return number.toString();
    }
  }

  /**
   * Форматирует дату согласно локали
   */
  public formatDate(date: Date, format?: string): string {
    if (!this.settings.translateDates) {
      return date.toLocaleDateString();
    }

    const language = this.languages.get(this.currentLanguage);
    if (!language) {
      return date.toLocaleDateString();
    }

    try {
      const dateFormat = format || language.dateFormat;
      
      return dateFormat
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('DD', date.getDate().toString().padStart(2, '0'))
        .replace('HH', date.getHours().toString().padStart(2, '0'))
        .replace('mm', date.getMinutes().toString().padStart(2, '0'))
        .replace('ss', date.getSeconds().toString().padStart(2, '0'));
    } catch (error) {
      this.logger.error('Ошибка форматирования даты:', error);
      return date.toLocaleDateString();
    }
  }

  /**
   * Загружает переводы для языка
   */
  private async loadLanguageTranslations(languageCode: string): Promise<void> {
    if (this.loadingPromises.has(languageCode)) {
      return this.loadingPromises.get(languageCode)!;
    }

    const loadPromise = this.performLanguageLoad(languageCode);
    this.loadingPromises.set(languageCode, loadPromise);
    
    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(languageCode);
    }
  }

  /**
   * Выполняет загрузку переводов
   */
  private async performLanguageLoad(languageCode: string): Promise<void> {
    try {
      this.logger.info('📥 Загрузка переводов для языка:', languageCode);
      
      const language = this.languages.get(languageCode);
      if (!language) {
        throw new Error(`Язык ${languageCode} не найден`);
      }

      // Пытаемся загрузить из файла
      const translationsPath = path.join(process.cwd(), 'locales', `${languageCode}.json`);
      
      try {
        const fileContent = await fs.readFile(translationsPath, 'utf8');
        const translations = JSON.parse(fileContent);
        
        language.translations = translations;
        language.loadStatus = 'loaded';
        language.lastUpdated = new Date();
        
        this.logger.info('✅ Переводы загружены из файла:', languageCode);
      } catch (fileError) {
        // Файл не найден, загружаем базовые переводы
        this.logger.warn('⚠️ Файл переводов не найден, использую базовые переводы:', languageCode);
        
        language.translations = await this.generateFallbackTranslations(languageCode);
        language.loadStatus = 'loaded';
        language.lastUpdated = new Date();
      }

      this.emit('language:loaded', { 
        languageCode, 
        translationsCount: this.countTranslations(language.translations) 
      });
      
    } catch (error) {
      this.logger.error('❌ Ошибка загрузки переводов:', languageCode, error);
      
      const language = this.languages.get(languageCode);
      if (language) {
        language.loadStatus = 'error';
      }
      
      this.emit('language:error', { languageCode, error });
      throw error;
    }
  }

  /**
   * Генерирует базовые переводы для языка
   */
  private async generateFallbackTranslations(languageCode: string): Promise<ExtendedTranslation> {
    // Базовый набор переводов для всех языков
    const baseTranslations: ExtendedTranslation = {
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        ok: 'OK'
      },
      game: {
        start: 'Start Game',
        pause: 'Pause',
        resume: 'Resume',
        over: 'Game Over'
      }
    };

    return baseTranslations;
  }

  /**
   * Подсчитывает количество переводов
   */
  private countTranslations(translations: ExtendedTranslation): number {
    let count = 0;
    
    const countRecursive = (obj: any) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
          count++;
        } else if (typeof value === 'object' && value !== null) {
          if (value.default) {
            count++; // Контекстуальный перевод считается как один
          } else {
            countRecursive(value);
          }
        }
      }
    };
    
    countRecursive(translations);
    return count;
  }

  /**
   * Экспортирует переводы в различные форматы
   */
  public async exportTranslations(languageCode: string, format: 'json' | 'csv' | 'xlsx' = 'json'): Promise<string> {
    const language = this.languages.get(languageCode);
    if (!language) {
      throw new Error(`Язык ${languageCode} не найден`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(language.translations, null, 2);
      
      case 'csv':
        return this.convertToCSV(language.translations);
      
      case 'xlsx':
        // TODO: Реализовать экспорт в Excel
        throw new Error('XLSX экспорт пока не реализован');
      
      default:
        throw new Error(`Неподдерживаемый формат: ${format}`);
    }
  }

  /**
   * Конвертирует переводы в CSV
   */
  private convertToCSV(translations: ExtendedTranslation): string {
    const rows: string[] = ['Key,Translation'];
    
    const flattenTranslations = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'string') {
          rows.push(`"${fullKey}","${value.replace(/"/g, '""')}"`);
        } else if (typeof value === 'object' && value !== null) {
          if (value.default) {
            rows.push(`"${fullKey}","${value.default.replace(/"/g, '""')}"`);
          } else {
            flattenTranslations(value, fullKey);
          }
        }
      }
    };
    
    flattenTranslations(translations);
    return rows.join('\n');
  }

  /**
   * Получает статистику локализации
   */
  public getLocalizationStats(): {
    supportedLanguages: number;
    loadedLanguages: number;
    totalTranslations: number;
    languageStats: Array<{
      code: string;
      name: string;
      loadStatus: string;
      translationCount: number;
      lastUpdated: Date;
    }>;
  } {
    const languageStats = Array.from(this.languages.values()).map(lang => ({
      code: lang.code,
      name: lang.name,
      loadStatus: lang.loadStatus,
      translationCount: this.countTranslations(lang.translations),
      lastUpdated: lang.lastUpdated
    }));

    return {
      supportedLanguages: this.languages.size,
      loadedLanguages: languageStats.filter(l => l.loadStatus === 'loaded').length,
      totalTranslations: languageStats.reduce((sum, l) => sum + l.translationCount, 0),
      languageStats
    };
  }

  // Вспомогательные методы

  private normalizeLanguageCode(code: string): string {
    return code.toLowerCase().split('-')[0].split('_')[0];
  }

  private createCacheKey(key: string, options: any): string {
    return `${key}:${JSON.stringify(options)}`;
  }

  private getFromCache(languageCode: string, cacheKey: string): string | null {
    return this.translationCache.get(languageCode)?.get(cacheKey) || null;
  }

  private saveToCache(languageCode: string, cacheKey: string, translation: string): void {
    if (!this.translationCache.has(languageCode)) {
      this.translationCache.set(languageCode, new Map());
    }
    this.translationCache.get(languageCode)!.set(cacheKey, translation);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Методы создания правил множественного числа
  private createRussianPluralRules(): (n: number) => string {
    return (n: number) => {
      if (n % 10 === 1 && n % 100 !== 11) return 'one';
      if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'few';
      return 'many';
    };
  }

  private createEnglishPluralRules(): (n: number) => string {
    return (n: number) => n === 1 ? 'one' : 'other';
  }

  private createTurkishPluralRules(): (n: number) => string {
    return (n: number) => 'other'; // Турецкий язык не различает единственное/множественное число
  }

  // Методы загрузки переводов (заглушки - реальные переводы должны быть в отдельных файлах)
  private async loadRussianTranslations(): Promise<ExtendedTranslation> {
    return {
      common: {
        loading: 'Загрузка...',
        error: 'Ошибка',
        success: 'Успешно',
        cancel: 'Отмена',
        ok: 'ОК'
      },
      game: {
        start: 'Начать игру',
        pause: 'Пауза',
        resume: 'Продолжить',
        over: 'Игра окончена',
        score: {
          default: 'Очки: {count}',
          contexts: {
            final: 'Финальный счет: {count}',
            current: 'Текущие очки: {count}'
          }
        }
      }
    };
  }

  private async loadEnglishTranslations(): Promise<ExtendedTranslation> {
    return {
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        ok: 'OK'
      },
      game: {
        start: 'Start Game',
        pause: 'Pause',
        resume: 'Resume',
        over: 'Game Over',
        score: {
          default: 'Score: {count}',
          contexts: {
            final: 'Final Score: {count}',
            current: 'Current Score: {count}'
          }
        }
      }
    };
  }

  private async loadTurkishTranslations(): Promise<ExtendedTranslation> {
    return {
      common: {
        loading: 'Yükleniyor...',
        error: 'Hata',
        success: 'Başarılı',
        cancel: 'İptal',
        ok: 'Tamam'
      },
      game: {
        start: 'Oyunu Başlat',
        pause: 'Duraklat',
        resume: 'Devam Et',
        over: 'Oyun Bitti',
        score: {
          default: 'Puan: {count}',
          contexts: {
            final: 'Final Puan: {count}',
            current: 'Güncel Puan: {count}'
          }
        }
      }
    };
  }

  // Публичные геттеры
  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getSupportedLanguages(): AdvancedLanguageData[] {
    return Array.from(this.languages.values());
  }

  public getYandexRegions(): YandexRegion[] {
    return Array.from(this.yandexRegions.values());
  }

  public getSettings(): LocalizationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<LocalizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settings:updated', this.settings);
  }
} 