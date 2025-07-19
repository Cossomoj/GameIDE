import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Типы для локализации
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export interface Translation {
  [key: string]: string | Translation;
}

export interface LocalizationContextType {
  currentLanguage: string;
  languages: Language[];
  translations: Translation;
  loading: boolean;
  error: string | null;
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
  tPlural: (key: string, count: number, params?: Record<string, any>) => string;
  isRTL: boolean;
}

// Создаем контекст
const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Провайдер локализации
interface LocalizationProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({
  children,
  defaultLanguage = 'ru'
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    // Пытаемся загрузить язык из localStorage
    return localStorage.getItem('gameide-language') || defaultLanguage;
  });
  
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Определяем RTL направление
  const isRTL = ['ar', 'he', 'fa'].includes(currentLanguage);

  // Загрузка списка языков
  const loadLanguages = async () => {
    try {
      const response = await fetch('/api/localization/languages');
      if (!response.ok) {
        throw new Error('Ошибка загрузки списка языков');
      }
      
      const data = await response.json();
      if (data.success) {
        setLanguages(data.languages);
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      console.error('Ошибка загрузки языков:', err);
      setError('Ошибка загрузки языков');
      
      // Fallback к минимальному набору языков
      setLanguages([
        { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
        { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' }
      ]);
    }
  };

  // Загрузка переводов для языка
  const loadTranslations = async (languageCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/localization/translations/${languageCode}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки переводов');
      }
      
      const data = await response.json();
      if (data.success) {
        setTranslations(data.translations);
        setError(null);
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      console.error('Ошибка загрузки переводов:', err);
      setError('Ошибка загрузки переводов');
      
      // Fallback к базовым переводам
      setTranslations(getFallbackTranslations(languageCode));
    } finally {
      setLoading(false);
    }
  };

  // Смена языка
  const changeLanguage = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;
    
    try {
      await loadTranslations(languageCode);
      setCurrentLanguage(languageCode);
      localStorage.setItem('gameide-language', languageCode);
      
      // Обновляем атрибут lang у документа
      document.documentElement.lang = languageCode;
      
      // Обновляем направление текста
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      
    } catch (err) {
      console.error('Ошибка смены языка:', err);
      setError('Ошибка смены языка');
    }
  };

  // Получение перевода по ключу
  const t = (key: string, params: Record<string, any> = {}): string => {
    const keys = key.split('.');
    let translation: any = translations;

    // Поиск по ключам
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) break;
    }

    if (typeof translation === 'string') {
      return interpolate(translation, params);
    }

    // Если перевод не найден, возвращаем ключ
    console.warn(`Перевод не найден для ключа: ${key}`);
    return key;
  };

  // Получение множественного числа
  const tPlural = (key: string, count: number, params: Record<string, any> = {}): string => {
    const form = getPluralForm(currentLanguage, count);
    const pluralKey = `${key}.${form}`;
    return t(pluralKey, { count, ...params });
  };

  // Интерполяция параметров в строку
  const interpolate = (str: string, params: Record<string, any>): string => {
    return str.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param].toString() : match;
    });
  };

  // Определение формы множественного числа
  const getPluralForm = (languageCode: string, count: number): string => {
    switch (languageCode) {
      case 'ru':
      case 'uk':
      case 'be':
        if (count % 10 === 1 && count % 100 !== 11) return 'one';
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'few';
        return 'many';
      
      case 'en':
        return count === 1 ? 'one' : 'other';
      
      case 'tr':
      case 'kz':
      default:
        return 'other';
    }
  };

  // Fallback переводы
  const getFallbackTranslations = (languageCode: string): Translation => {
    const fallbackTranslations: Record<string, Translation> = {
      ru: {
        common: {
          loading: 'Загрузка...',
          error: 'Ошибка',
          ok: 'ОК',
          cancel: 'Отмена'
        },
        game: {
          title: 'GameIDE',
          start: 'Начать игру',
          score: 'Очки: {score}'
        }
      },
      en: {
        common: {
          loading: 'Loading...',
          error: 'Error',
          ok: 'OK',
          cancel: 'Cancel'
        },
        game: {
          title: 'GameIDE',
          start: 'Start Game',
          score: 'Score: {score}'
        }
      },
      tr: {
        common: {
          loading: 'Yükleniyor...',
          error: 'Hata',
          ok: 'Tamam',
          cancel: 'İptal'
        },
        game: {
          title: 'GameIDE',
          start: 'Oyunu Başlat',
          score: 'Puan: {score}'
        }
      }
    };

    return fallbackTranslations[languageCode] || fallbackTranslations.en;
  };

  // Автоматическое определение языка пользователя
  const detectUserLanguage = async () => {
    try {
      const response = await fetch('/api/localization/detect');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.detectedLanguage) {
          const savedLanguage = localStorage.getItem('gameide-language');
          if (!savedLanguage) {
            await changeLanguage(data.detectedLanguage);
          }
        }
      }
    } catch (err) {
      console.error('Ошибка определения языка:', err);
    }
  };

  // Эффект инициализации
  useEffect(() => {
    const initialize = async () => {
      await loadLanguages();
      
      // Если язык не сохранен, пытаемся определить автоматически
      if (!localStorage.getItem('gameide-language')) {
        await detectUserLanguage();
      } else {
        await loadTranslations(currentLanguage);
      }
    };

    initialize();
  }, []);

  // Эффект обновления направления текста
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLanguage, isRTL]);

  const contextValue: LocalizationContextType = {
    currentLanguage,
    languages,
    translations,
    loading,
    error,
    changeLanguage,
    t,
    tPlural,
    isRTL
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Хук для использования локализации
export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

// Компонент выбора языка
export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentLanguage, languages, changeLanguage, loading } = useLocalization();

  if (loading || languages.length === 0) {
    return null;
  }

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      className={`language-selector ${className}`}
      disabled={loading}
    >
      {languages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.flag} {language.nativeName}
        </option>
      ))}
    </select>
  );
};

// Компонент для условного рендеринга на основе языка
export const LanguageConditional: React.FC<{
  languages: string[];
  children: ReactNode;
}> = ({ languages, children }) => {
  const { currentLanguage } = useLocalization();
  
  if (languages.includes(currentLanguage)) {
    return <>{children}</>;
  }
  
  return null;
};

// HOC для добавления переводов в компонент
export function withLocalization<P extends object>(
  Component: React.ComponentType<P & { t: LocalizationContextType['t'] }>
) {
  return function WrappedComponent(props: P) {
    const { t } = useLocalization();
    return <Component {...props} t={t} />;
  };
}

export default LocalizationProvider; 