import { Router, Request, Response } from 'express';
import { localizationService, LanguageData, Translation } from '../services/localization';

const router = Router();

/**
 * Получить список поддерживаемых языков
 * GET /api/localization/languages
 */
router.get('/languages', (req: Request, res: Response) => {
  try {
    const languages = localizationService.getSupportedLanguages();
    res.json({
      success: true,
      languages: languages.map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        rtl: lang.rtl || false
      }))
    });
  } catch (error) {
    console.error('Ошибка получения языков:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получить все переводы для языка
 * GET /api/localization/translations/:languageCode
 */
router.get('/translations/:languageCode', (req: Request, res: Response) => {
  try {
    const { languageCode } = req.params;
    const translations = localizationService.getAllTranslations(languageCode);
    
    if (!translations) {
      return res.status(404).json({
        success: false,
        error: 'Язык не найден'
      });
    }

    res.json({
      success: true,
      languageCode,
      translations
    });
  } catch (error) {
    console.error('Ошибка получения переводов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получить переводы по неймспейсу
 * GET /api/localization/translations/:languageCode/:namespace
 */
router.get('/translations/:languageCode/:namespace', (req: Request, res: Response) => {
  try {
    const { languageCode, namespace } = req.params;
    const translations = localizationService.getNamespaceTranslations(languageCode, namespace);
    
    if (!translations) {
      return res.status(404).json({
        success: false,
        error: 'Неймспейс не найден'
      });
    }

    res.json({
      success: true,
      languageCode,
      namespace,
      translations
    });
  } catch (error) {
    console.error('Ошибка получения переводов неймспейса:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получить один перевод
 * GET /api/localization/translate/:languageCode/:key
 */
router.get('/translate/:languageCode/:key(*)', (req: Request, res: Response) => {
  try {
    const { languageCode, key } = req.params;
    const params = req.query as Record<string, any>;
    
    const translation = localizationService.getTranslation(languageCode, key, params);

    res.json({
      success: true,
      languageCode,
      key,
      translation,
      params
    });
  } catch (error) {
    console.error('Ошибка получения перевода:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получить множественное число
 * GET /api/localization/plural/:languageCode/:key/:count
 */
router.get('/plural/:languageCode/:key(*)/:count', (req: Request, res: Response) => {
  try {
    const { languageCode, key } = req.params;
    const count = parseInt(req.params.count);
    const params = req.query as Record<string, any>;
    
    if (isNaN(count)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректное число'
      });
    }

    const translation = localizationService.getPlural(languageCode, key, count, params);

    res.json({
      success: true,
      languageCode,
      key,
      count,
      translation,
      params
    });
  } catch (error) {
    console.error('Ошибка получения множественного числа:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Определить язык пользователя по заголовкам
 * GET /api/localization/detect
 */
router.get('/detect', (req: Request, res: Response) => {
  try {
    const acceptLanguage = req.headers['accept-language'] as string;
    const detectedLanguage = localizationService.detectUserLanguage(acceptLanguage);
    const languageData = localizationService.getLanguage(detectedLanguage);

    res.json({
      success: true,
      detectedLanguage,
      languageData: languageData ? {
        code: languageData.code,
        name: languageData.name,
        nativeName: languageData.nativeName,
        flag: languageData.flag,
        rtl: languageData.rtl || false
      } : null,
      acceptLanguage
    });
  } catch (error) {
    console.error('Ошибка определения языка:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Экспорт переводов
 * GET /api/localization/export
 * GET /api/localization/export/:languageCode
 */
router.get('/export/:languageCode?', (req: Request, res: Response) => {
  try {
    const { languageCode } = req.params;
    const translationsJson = localizationService.exportTranslations(languageCode);
    
    const filename = languageCode 
      ? `translations-${languageCode}.json`
      : 'all-translations.json';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(translationsJson);
  } catch (error) {
    console.error('Ошибка экспорта переводов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Импорт переводов
 * POST /api/localization/import
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { translations } = req.body;
    
    if (!translations || typeof translations !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Требуется JSON строка с переводами'
      });
    }

    const success = localizationService.importTranslations(translations);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка парсинга переводов'
      });
    }

    res.json({
      success: true,
      message: 'Переводы успешно импортированы'
    });
  } catch (error) {
    console.error('Ошибка импорта переводов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Обновить переводы неймспейса
 * PUT /api/localization/translations/:languageCode/:namespace
 */
router.put('/translations/:languageCode/:namespace', (req: Request, res: Response) => {
  try {
    const { languageCode, namespace } = req.params;
    const { translations } = req.body;
    
    if (!translations || typeof translations !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Требуется объект с переводами'
      });
    }

    const success = localizationService.updateTranslations(
      languageCode,
      namespace,
      translations as Translation
    );
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Язык не найден'
      });
    }

    res.json({
      success: true,
      message: 'Переводы успешно обновлены'
    });
  } catch (error) {
    console.error('Ошибка обновления переводов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получить информацию о языке
 * GET /api/localization/language/:languageCode
 */
router.get('/language/:languageCode', (req: Request, res: Response) => {
  try {
    const { languageCode } = req.params;
    const language = localizationService.getLanguage(languageCode);
    
    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Язык не найден'
      });
    }

    res.json({
      success: true,
      language: {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        flag: language.flag,
        rtl: language.rtl || false
      }
    });
  } catch (error) {
    console.error('Ошибка получения информации о языке:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Поиск переводов
 * GET /api/localization/search/:languageCode
 */
router.get('/search/:languageCode', (req: Request, res: Response) => {
  try {
    const { languageCode } = req.params;
    const { q: query } = req.query as { q?: string };
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Требуется поисковый запрос минимум 2 символа'
      });
    }

    const translations = localizationService.getAllTranslations(languageCode);
    if (!translations) {
      return res.status(404).json({
        success: false,
        error: 'Язык не найден'
      });
    }

    // Рекурсивный поиск по переводам
    const searchInTranslations = (obj: any, prefix = ''): Array<{key: string, value: string}> => {
      const results: Array<{key: string, value: string}> = [];
      
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'string') {
          if (value.toLowerCase().includes(query.toLowerCase()) || 
              fullKey.toLowerCase().includes(query.toLowerCase())) {
            results.push({ key: fullKey, value });
          }
        } else if (typeof value === 'object' && value !== null) {
          results.push(...searchInTranslations(value, fullKey));
        }
      }
      
      return results;
    };

    const results = searchInTranslations(translations);

    res.json({
      success: true,
      languageCode,
      query,
      results: results.slice(0, 50) // Ограничиваем результаты
    });
  } catch (error) {
    console.error('Ошибка поиска переводов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router; 