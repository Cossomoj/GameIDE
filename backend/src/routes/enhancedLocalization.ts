import { Router } from 'express';
import { enhancedLocalizationService } from '../services/enhancedLocalization';
import { logger } from '../services/logger';

const router = Router();

// Автоматический перевод текста
router.post('/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context, gameType, domain } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: text, sourceLanguage, targetLanguage'
      });
    }

    const result = await enhancedLocalizationService.translateText({
      text,
      sourceLanguage,
      targetLanguage,
      context,
      gameType,
      domain
    });

    res.json({
      success: true,
      translation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка перевода текста:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения перевода'
    });
  }
});

// Массовый перевод игрового контента
router.post('/translate-game', async (req, res) => {
  try {
    const { gameId, content, targetLanguages } = req.body;

    if (!gameId || !content || !targetLanguages || !Array.isArray(targetLanguages)) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: gameId, content, targetLanguages (массив)'
      });
    }

    logger.info('Начинаем перевод игрового контента', { gameId, targetLanguages });

    const translation = await enhancedLocalizationService.translateGameContent(
      gameId,
      content,
      targetLanguages
    );

    res.json({
      success: true,
      translation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка перевода игрового контента:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка перевода игрового контента'
    });
  }
});

// Перевод с учетом игрового контекста
router.post('/translate-with-context', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, gameContext } = req.body;

    if (!text || !sourceLanguage || !targetLanguage || !gameContext) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: text, sourceLanguage, targetLanguage, gameContext'
      });
    }

    const result = await enhancedLocalizationService.translateWithGameContext(
      text,
      sourceLanguage,
      targetLanguage,
      gameContext
    );

    res.json({
      success: true,
      translation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка контекстного перевода:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения контекстного перевода'
    });
  }
});

// Перевод диалогов персонажей
router.post('/translate-dialogue', async (req, res) => {
  try {
    const { dialogue, sourceLanguage, targetLanguage, character } = req.body;

    if (!dialogue || !sourceLanguage || !targetLanguage || !character) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: dialogue, sourceLanguage, targetLanguage, character'
      });
    }

    const result = await enhancedLocalizationService.translateDialogue(
      dialogue,
      sourceLanguage,
      targetLanguage,
      character
    );

    res.json({
      success: true,
      translation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка перевода диалога:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка перевода диалога'
    });
  }
});

// Локализация UI элементов
router.post('/translate-ui', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, constraints } = req.body;

    if (!text || !sourceLanguage || !targetLanguage || !constraints) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: text, sourceLanguage, targetLanguage, constraints'
      });
    }

    const result = await enhancedLocalizationService.translateUIElement(
      text,
      sourceLanguage,
      targetLanguage,
      constraints
    );

    res.json({
      success: true,
      translation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка перевода UI элемента:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка перевода UI элемента'
    });
  }
});

// Культурная адаптация контента
router.post('/cultural-adaptation', async (req, res) => {
  try {
    const { content, sourceLanguage, targetLanguage, culturalContext } = req.body;

    if (!content || !sourceLanguage || !targetLanguage || !culturalContext) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: content, sourceLanguage, targetLanguage, culturalContext'
      });
    }

    const result = await enhancedLocalizationService.culturallyAdaptContent(
      content,
      sourceLanguage,
      targetLanguage,
      culturalContext
    );

    res.json({
      success: true,
      adaptation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка культурной адаптации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка культурной адаптации контента'
    });
  }
});

// Получение статистики кеша переводов
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = enhancedLocalizationService.getCacheStatistics();
    
    res.json({
      success: true,
      cacheStatistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка получения статистики кеша:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// Очистка кеша переводов
router.post('/clear-cache', async (req, res) => {
  try {
    const cleaned = enhancedLocalizationService.cleanupCache();
    
    res.json({
      success: true,
      message: `Очищено ${cleaned} записей из кеша`,
      cleanedCount: cleaned,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка очистки кеша:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка очистки кеша'
    });
  }
});

// Пакетный перевод множественных текстов
router.post('/translate-batch', async (req, res) => {
  try {
    const { texts, sourceLanguage, targetLanguage, domain, gameType } = req.body;

    if (!texts || !Array.isArray(texts) || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: texts (массив), sourceLanguage, targetLanguage'
      });
    }

    logger.info('Начинаем пакетный перевод', { count: texts.length, sourceLanguage, targetLanguage });

    const results = [];
    for (const text of texts) {
      try {
        const result = await enhancedLocalizationService.translateText({
          text,
          sourceLanguage,
          targetLanguage,
          domain,
          gameType
        });
        results.push({
          success: true,
          originalText: text,
          translation: result
        });
      } catch (error) {
        results.push({
          success: false,
          originalText: text,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      results,
      summary: {
        total: texts.length,
        successful: successCount,
        failed: failureCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка пакетного перевода:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения пакетного перевода'
    });
  }
});

// Предварительный просмотр перевода с альтернативами
router.post('/preview-translation', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context, domain } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: text, sourceLanguage, targetLanguage'
      });
    }

    const result = await enhancedLocalizationService.translateText({
      text,
      sourceLanguage,
      targetLanguage,
      context,
      domain
    });

    // Добавляем дополнительные метрики для предварительного просмотра
    const preview = {
      original: {
        text,
        language: sourceLanguage,
        length: text.length,
        wordCount: text.split(/\s+/).length
      },
      translation: {
        text: result.translatedText,
        language: targetLanguage,
        length: result.translatedText.length,
        wordCount: result.translatedText.split(/\s+/).length,
        model: result.model,
        confidence: result.confidence
      },
      alternatives: result.alternatives || [],
      quality: result.quality,
      metrics: {
        lengthRatio: result.translatedText.length / text.length,
        wordRatio: result.translatedText.split(/\s+/).length / text.split(/\s+/).length
      }
    };

    res.json({
      success: true,
      preview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка предварительного просмотра:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания предварительного просмотра'
    });
  }
});

// Получение поддерживаемых языков для автоперевода
router.get('/supported-languages', async (req, res) => {
  try {
    const languages = [
      { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
      { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
      { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾' },
      { code: 'kz', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
    ];

    res.json({
      success: true,
      languages,
      count: languages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка получения списка языков:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения поддерживаемых языков'
    });
  }
});

// Проверка качества существующего перевода
router.post('/evaluate-translation', async (req, res) => {
  try {
    const { originalText, translatedText, sourceLanguage, targetLanguage, domain } = req.body;

    if (!originalText || !translatedText || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Требуются параметры: originalText, translatedText, sourceLanguage, targetLanguage'
      });
    }

    // Используем внутренний метод для оценки качества
    const quality = await (enhancedLocalizationService as any).evaluateTranslation(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      domain
    );

    res.json({
      success: true,
      evaluation: {
        original: originalText,
        translation: translatedText,
        quality,
        recommendations: quality.suggestions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Ошибка оценки перевода:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка оценки качества перевода'
    });
  }
});

export default router; 