import { LocalizationService } from '../../backend/src/services/localization';

describe('LocalizationService', () => {
  let localizationService: LocalizationService;

  beforeEach(() => {
    localizationService = new LocalizationService();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const supportedLanguages = localizationService.getSupportedLanguages();
      
      expect(supportedLanguages).toBeDefined();
      expect(supportedLanguages.length).toBeGreaterThan(0);
      
      // Проверяем наличие основных языков
      const languageCodes = supportedLanguages.map(lang => lang.code);
      expect(languageCodes).toContain('en');
      expect(languageCodes).toContain('ru');
      expect(languageCodes).toContain('es');
      expect(languageCodes).toContain('fr');
    });

    it('should have valid language data structure', () => {
      const languages = localizationService.getSupportedLanguages();
      
      languages.forEach(language => {
        expect(language).toHaveProperty('code');
        expect(language).toHaveProperty('name');
        expect(language).toHaveProperty('nativeName');
        expect(language).toHaveProperty('rtl');
        expect(language).toHaveProperty('translations');
        
        expect(typeof language.code).toBe('string');
        expect(typeof language.name).toBe('string');
        expect(typeof language.nativeName).toBe('string');
        expect(typeof language.rtl).toBe('boolean');
        expect(typeof language.translations).toBe('object');
      });
    });
  });

  describe('getLanguage', () => {
    it('should return language data for valid code', () => {
      const englishLang = localizationService.getLanguage('en');
      
      expect(englishLang).toBeDefined();
      expect(englishLang?.code).toBe('en');
      expect(englishLang?.name).toBe('English');
    });

    it('should return null for invalid code', () => {
      const invalidLang = localizationService.getLanguage('invalid');
      
      expect(invalidLang).toBeNull();
    });

    it('should return correct data for all supported languages', () => {
      const testCases = [
        { code: 'ru', name: 'Русский' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
        { code: 'uk', name: 'Українська' },
        { code: 'be', name: 'Беларуская' },
        { code: 'kk', name: 'Қазақша' },
        { code: 'tr', name: 'Türkçe' }
      ];

      testCases.forEach(({ code, name }) => {
        const language = localizationService.getLanguage(code);
        expect(language).toBeDefined();
        expect(language?.code).toBe(code);
        expect(language?.name).toBe(name);
      });
    });
  });

  describe('getTranslation', () => {
    it('should return correct translation for existing keys', () => {
      const englishYes = localizationService.getTranslation('en', 'common.yes');
      const russianYes = localizationService.getTranslation('ru', 'common.yes');
      
      expect(englishYes).toBe('Yes');
      expect(russianYes).toBe('Да');
    });

    it('should return fallback translation for missing keys', () => {
      const translation = localizationService.getTranslation('ru', 'non.existent.key');
      const fallbackTranslation = localizationService.getTranslation('en', 'non.existent.key');
      
      // Должен вернуться ключ, если перевод не найден
      expect(translation).toBe('non.existent.key');
      expect(fallbackTranslation).toBe('non.existent.key');
    });

    it('should interpolate parameters correctly', () => {
      // Тестируем интерполяцию на примере game.score
      const scoreTranslation = localizationService.getTranslation('en', 'game.score', { score: 1500 });
      
      expect(scoreTranslation).toContain('1500');
    });

    it('should handle nested translation keys', () => {
      const gameTitle = localizationService.getTranslation('en', 'game.title');
      const commonYes = localizationService.getTranslation('en', 'common.yes');
      
      expect(gameTitle).toBeDefined();
      expect(gameTitle).not.toBe('game.title');
      expect(commonYes).toBe('Yes');
    });

    it('should fallback to English for unsupported languages', () => {
      const translation = localizationService.getTranslation('unsupported', 'common.yes');
      const englishTranslation = localizationService.getTranslation('en', 'common.yes');
      
      expect(translation).toBe(englishTranslation);
    });
  });

  describe('getPlural', () => {
    it('should handle English pluralization correctly', () => {
      // Английский: 1 = one, остальные = other
      const singular = localizationService.getPlural('en', 'game.lives', 1);
      const plural = localizationService.getPlural('en', 'game.lives', 3);
      
      expect(singular).toContain('1');
      expect(plural).toContain('3');
    });

    it('should handle Russian pluralization correctly', () => {
      // Русский язык имеет сложные правила множественного числа
      const one = localizationService.getPlural('ru', 'game.lives', 1);
      const few = localizationService.getPlural('ru', 'game.lives', 2);
      const many = localizationService.getPlural('ru', 'game.lives', 5);
      
      expect(one).toContain('1');
      expect(few).toContain('2');
      expect(many).toContain('5');
    });

    it('should handle languages without plural rules', () => {
      // Языки без правил множественного числа должны использовать обычный getTranslation
      const result = localizationService.getPlural('en', 'common.yes', 5);
      
      expect(result).toBeDefined();
    });
  });

  describe('autoDetectLanguage', () => {
    it('should detect language from Accept-Language header', () => {
      const testCases = [
        { header: 'en-US,en;q=0.9', expected: 'en' },
        { header: 'ru-RU,ru;q=0.9,en;q=0.8', expected: 'ru' },
        { header: 'es-ES,es;q=0.9', expected: 'es' },
        { header: 'fr-FR,fr;q=0.9', expected: 'fr' }
      ];

      testCases.forEach(({ header, expected }) => {
        const detected = localizationService.autoDetectLanguage(header);
        expect(detected).toBe(expected);
      });
    });

    it('should fallback to English for unsupported languages', () => {
      const detected = localizationService.autoDetectLanguage('zh-CN,zh;q=0.9');
      expect(detected).toBe('en');
    });

    it('should handle malformed headers gracefully', () => {
      const detected = localizationService.autoDetectLanguage('invalid-header');
      expect(detected).toBe('en');
    });

    it('should handle empty headers', () => {
      const detected = localizationService.autoDetectLanguage('');
      expect(detected).toBe('en');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly for different locales', () => {
      const amount = 1234.56;
      
      const usdFormat = localizationService.formatCurrency(amount, 'USD', 'en');
      const eurFormat = localizationService.formatCurrency(amount, 'EUR', 'en');
      const rubFormat = localizationService.formatCurrency(amount, 'RUB', 'ru');
      
      expect(usdFormat).toMatch(/\$.*1.*234.*56/);
      expect(eurFormat).toMatch(/€.*1.*234.*56/);
      expect(rubFormat).toMatch(/.*1.*234.*56.*₽/);
    });

    it('should handle zero and negative amounts', () => {
      const zeroFormat = localizationService.formatCurrency(0, 'USD', 'en');
      const negativeFormat = localizationService.formatCurrency(-100, 'USD', 'en');
      
      expect(zeroFormat).toContain('0');
      expect(negativeFormat).toContain('-');
    });

    it('should fallback gracefully for unsupported currencies', () => {
      const result = localizationService.formatCurrency(100, 'INVALID' as any, 'en');
      
      expect(result).toContain('100');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly for different locales', () => {
      const testDate = new Date('2023-12-25T12:00:00Z');
      
      const enFormat = localizationService.formatDate(testDate, 'en', 'full');
      const ruFormat = localizationService.formatDate(testDate, 'ru', 'full');
      
      expect(enFormat).toContain('2023');
      expect(enFormat).toContain('December');
      expect(ruFormat).toContain('2023');
    });

    it('should handle different date formats', () => {
      const testDate = new Date('2023-12-25T12:00:00Z');
      
      const shortFormat = localizationService.formatDate(testDate, 'en', 'short');
      const mediumFormat = localizationService.formatDate(testDate, 'en', 'medium');
      const longFormat = localizationService.formatDate(testDate, 'en', 'long');
      
      expect(shortFormat).toBeDefined();
      expect(mediumFormat).toBeDefined();
      expect(longFormat).toBeDefined();
      
      // Длинный формат должен быть больше короткого
      expect(longFormat.length).toBeGreaterThan(shortFormat.length);
    });
  });

  describe('translation completeness', () => {
    it('should have consistent translation keys across all languages', () => {
      const languages = localizationService.getSupportedLanguages();
      const englishLang = languages.find(lang => lang.code === 'en');
      
      if (!englishLang) {
        throw new Error('English language not found');
      }

      const englishKeys = extractAllKeys(englishLang.translations);
      
      languages.forEach(language => {
        if (language.code === 'en') return;
        
        const languageKeys = extractAllKeys(language.translations);
        
        // Проверяем, что основные ключи присутствуют
        const essentialKeys = [
          'common.yes',
          'common.no',
          'common.ok',
          'common.cancel',
          'game.title',
          'generation.title'
        ];
        
        essentialKeys.forEach(key => {
          expect(languageKeys).toContain(key);
        });
      });
    });
  });
});

// Вспомогательная функция для извлечения всех ключей из объекта переводов
function extractAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...extractAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
} 