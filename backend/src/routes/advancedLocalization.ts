import express from 'express';
import { AdvancedLocalizationService } from '@/services/advancedLocalization';
import { LoggerService } from '@/services/logger';
import { rateLimit } from '@/middleware/validation';

const router = express.Router();
const logger = new LoggerService();
const localizationService = new AdvancedLocalizationService();

/**
 * POST /api/advanced-localization/auto-detect
 * Автоматическое определение языка пользователя
 */
router.post('/auto-detect', rateLimit(20, 60 * 1000), async (req, res) => {
  try {
    const { region, browserLanguage, yandexLanguage, userAgent } = req.body;

    logger.info('🔍 Автоопределение языка:', { region, browserLanguage, yandexLanguage });

    const detectedLanguage = await localizationService.autoDetectLanguage({
      region,
      browserLanguage,
      yandexLanguage
    });

    const languageData = localizationService.getSupportedLanguages()
      .find(lang => lang.code === detectedLanguage);

    res.json({
      success: true,
      detectedLanguage,
      languageData: languageData ? {
        code: languageData.code,
        name: languageData.name,
        nativeName: languageData.nativeName,
        flag: languageData.flag,
        region: languageData.region
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Ошибка автоопределения языка:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/advanced-localization/set-language
 * Установка текущего языка
 */
router.post('/set-language', rateLimit(30, 60 * 1000), async (req, res) => {
  try {
    const { languageCode } = req.body;

    if (!languageCode) {
      return res.status(400).json({
        success: false,
        error: 'Требуется languageCode'
      });
    }

    const success = await localizationService.setLanguage(languageCode);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Неподдерживаемый язык'
      });
    }

    const currentLanguage = localizationService.getCurrentLanguage();
    const supportedLanguages = localizationService.getSupportedLanguages();
    const languageData = supportedLanguages.find(lang => lang.code === currentLanguage);

    res.json({
      success: true,
      currentLanguage,
      languageData: languageData ? {
        code: languageData.code,
        name: languageData.name,
        nativeName: languageData.nativeName,
        flag: languageData.flag,
        loadStatus: languageData.loadStatus
      } : null,
      message: `Язык изменен на ${currentLanguage}`
    });

  } catch (error: any) {
    logger.error('Ошибка установки языка:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * POST /api/advanced-localization/translate
 * Получение перевода с расширенными опциями
 */
router.post('/translate', rateLimit(100, 60 * 1000), async (req, res) => {
  try {
    const { 
      key, 
      context, 
      count, 
      gender, 
      interpolation, 
      namespace, 
      fallback 
    } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Требуется key для перевода'
      });
    }

    const translation = localizationService.translate(key, {
      context,
      count,
      gender,
      interpolation,
      namespace,
      fallback
    });

    res.json({
      success: true,
      key,
      translation,
      options: {
        context,
        count,
        gender,
        namespace
      },
      languageCode: localizationService.getCurrentLanguage()
    });

  } catch (error: any) {
    logger.error('Ошибка перевода:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения перевода'
    });
  }
});

/**
 * POST /api/advanced-localization/translate-batch
 * Пакетный перевод нескольких ключей
 */
router.post('/translate-batch', rateLimit(50, 60 * 1000), async (req, res) => {
  try {
    const { keys, globalOptions } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Требуется массив keys'
      });
    }

    if (keys.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Максимум 100 ключей за запрос'
      });
    }

    const translations: { [key: string]: string } = {};

    for (const keyData of keys) {
      const keyStr = typeof keyData === 'string' ? keyData : keyData.key;
      const options = typeof keyData === 'object' ? { ...globalOptions, ...keyData } : globalOptions;
      
      translations[keyStr] = localizationService.translate(keyStr, options);
    }

    res.json({
      success: true,
      translations,
      count: Object.keys(translations).length,
      languageCode: localizationService.getCurrentLanguage()
    });

  } catch (error: any) {
    logger.error('Ошибка пакетного перевода:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка пакетного перевода'
    });
  }
});

/**
 * POST /api/advanced-localization/format-number
 * Форматирование числа согласно локали
 */
router.post('/format-number', rateLimit(100, 60 * 1000), async (req, res) => {
  try {
    const { number, style, minimumFractionDigits, maximumFractionDigits } = req.body;

    if (typeof number !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Требуется число для форматирования'
      });
    }

    const formattedNumber = localizationService.formatNumber(number, {
      style,
      minimumFractionDigits,
      maximumFractionDigits
    });

    res.json({
      success: true,
      original: number,
      formatted: formattedNumber,
      options: { style, minimumFractionDigits, maximumFractionDigits },
      languageCode: localizationService.getCurrentLanguage()
    });

  } catch (error: any) {
    logger.error('Ошибка форматирования числа:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка форматирования числа'
    });
  }
});

/**
 * POST /api/advanced-localization/format-date
 * Форматирование даты согласно локали
 */
router.post('/format-date', rateLimit(100, 60 * 1000), async (req, res) => {
  try {
    const { date, format } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Требуется дата для форматирования'
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Некорректная дата'
      });
    }

    const formattedDate = localizationService.formatDate(dateObj, format);

    res.json({
      success: true,
      original: date,
      formatted: formattedDate,
      format,
      languageCode: localizationService.getCurrentLanguage()
    });

  } catch (error: any) {
    logger.error('Ошибка форматирования даты:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка форматирования даты'
    });
  }
});

/**
 * GET /api/advanced-localization/languages
 * Получение списка поддерживаемых языков
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = localizationService.getSupportedLanguages().map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      flag: lang.flag,
      region: lang.region,
      rtl: lang.rtl,
      loadStatus: lang.loadStatus,
      lastUpdated: lang.lastUpdated
    }));

    const currentLanguage = localizationService.getCurrentLanguage();

    res.json({
      success: true,
      languages,
      currentLanguage,
      total: languages.length,
      loaded: languages.filter(l => l.loadStatus === 'loaded').length
    });

  } catch (error: any) {
    logger.error('Ошибка получения языков:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения списка языков'
    });
  }
});

/**
 * GET /api/advanced-localization/regions
 * Получение списка поддерживаемых регионов Yandex
 */
router.get('/regions', async (req, res) => {
  try {
    const regions = localizationService.getYandexRegions();

    res.json({
      success: true,
      regions,
      total: regions.length,
      description: 'Поддерживаемые регионы Yandex Games'
    });

  } catch (error: any) {
    logger.error('Ошибка получения регионов:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения регионов'
    });
  }
});

/**
 * GET /api/advanced-localization/stats
 * Получение статистики локализации
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = localizationService.getLocalizationStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения статистики'
    });
  }
});

/**
 * GET /api/advanced-localization/export/:languageCode
 * Экспорт переводов в различных форматах
 */
router.get('/export/:languageCode', rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const { languageCode } = req.params;
    const { format = 'json' } = req.query as { format?: 'json' | 'csv' | 'xlsx' };

    if (!languageCode) {
      return res.status(400).json({
        success: false,
        error: 'Требуется languageCode'
      });
    }

    const exportedData = await localizationService.exportTranslations(languageCode, format);

    // Устанавливаем правильные заголовки для скачивания
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const extensions = {
      json: 'json',
      csv: 'csv', 
      xlsx: 'xlsx'
    };

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="translations_${languageCode}.${extensions[format]}"`
    );

    res.send(exportedData);

  } catch (error: any) {
    logger.error('Ошибка экспорта переводов:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка экспорта переводов'
    });
  }
});

/**
 * PUT /api/advanced-localization/settings
 * Обновление настроек локализации
 */
router.put('/settings', rateLimit(10, 60 * 1000), async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Требуются настройки'
      });
    }

    localizationService.updateSettings(settings);
    const updatedSettings = localizationService.getSettings();

    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Настройки локализации обновлены'
    });

  } catch (error: any) {
    logger.error('Ошибка обновления настроек:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка обновления настроек'
    });
  }
});

/**
 * GET /api/advanced-localization/settings
 * Получение текущих настроек локализации
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = localizationService.getSettings();

    res.json({
      success: true,
      settings,
      description: {
        autoDetectLanguage: 'Автоматическое определение языка пользователя',
        fallbackChain: 'Последовательность резервных языков',
        enableContextualTranslations: 'Поддержка контекстуальных переводов',
        enableDynamicLoading: 'Динамическая загрузка переводов',
        cacheTranslations: 'Кеширование переводов',
        translateNumbers: 'Локализация чисел',
        translateDates: 'Локализация дат'
      }
    });

  } catch (error: any) {
    logger.error('Ошибка получения настроек:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка получения настроек'
    });
  }
});

/**
 * WebSocket события для локализации
 */
localizationService.on('language:detected', (data) => {
  logger.info('🎯 Язык автоопределен:', data);
});

localizationService.on('language:changed', (data) => {
  logger.info('🔄 Язык изменен:', data);
});

localizationService.on('language:loaded', (data) => {
  logger.info('📥 Переводы загружены:', data);
});

localizationService.on('language:error', (data) => {
  logger.error('❌ Ошибка загрузки языка:', data);
});

localizationService.on('settings:updated', (settings) => {
  logger.info('⚙️ Настройки локализации обновлены:', settings);
});

export default router; 