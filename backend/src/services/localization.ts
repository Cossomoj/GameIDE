/**
 * Сервис локализации для GameIDE
 * Поддерживает русский, английский, турецкий и другие языки
 */

export interface Translation {
  [key: string]: string | Translation;
}

export interface LanguageData {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  pluralRules?: (n: number) => string;
  translations: Translation;
}

export interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  fallbackLanguage: string;
  namespaces: string[];
}

export class LocalizationService {
  private languages: Map<string, LanguageData> = new Map();
  private config: LocalizationConfig = {
    defaultLanguage: 'ru',
    supportedLanguages: ['ru', 'en', 'tr', 'uk', 'be', 'kz'],
    fallbackLanguage: 'en',
    namespaces: ['common', 'game', 'ui', 'errors', 'achievements']
  };

  constructor() {
    this.initializeLanguages();
  }

  private initializeLanguages() {
    // Русский язык
    this.languages.set('ru', {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      flag: '🇷🇺',
      pluralRules: this.createRussianPluralRules(),
      translations: this.getRussianTranslations()
    });

    // Английский язык
    this.languages.set('en', {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      pluralRules: this.createEnglishPluralRules(),
      translations: this.getEnglishTranslations()
    });

    // Турецкий язык
    this.languages.set('tr', {
      code: 'tr',
      name: 'Turkish',
      nativeName: 'Türkçe',
      flag: '🇹🇷',
      pluralRules: this.createTurkishPluralRules(),
      translations: this.getTurkishTranslations()
    });

    // Украинский язык
    this.languages.set('uk', {
      code: 'uk',
      name: 'Ukrainian',
      nativeName: 'Українська',
      flag: '🇺🇦',
      pluralRules: this.createRussianPluralRules(), // Схожие правила с русским
      translations: this.getUkrainianTranslations()
    });

    // Белорусский язык
    this.languages.set('be', {
      code: 'be',
      name: 'Belarusian',
      nativeName: 'Беларуская',
      flag: '🇧🇾',
      pluralRules: this.createRussianPluralRules(),
      translations: this.getBelarusianTranslations()
    });

    // Казахский язык
    this.languages.set('kz', {
      code: 'kz',
      name: 'Kazakh',
      nativeName: 'Қазақша',
      flag: '🇰🇿',
      pluralRules: this.createTurkishPluralRules(), // Схожие правила с турецким
      translations: this.getKazakhTranslations()
    });
  }

  private createRussianPluralRules() {
    return (n: number): string => {
      if (n % 10 === 1 && n % 100 !== 11) return 'one';
      if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'few';
      return 'many';
    };
  }

  private createEnglishPluralRules() {
    return (n: number): string => n === 1 ? 'one' : 'other';
  }

  private createTurkishPluralRules() {
    return (n: number): string => 'other'; // Турецкий имеет только одну форму множественного числа
  }

  private getRussianTranslations(): Translation {
    return {
      common: {
        yes: 'Да',
        no: 'Нет',
        ok: 'ОК',
        cancel: 'Отмена',
        save: 'Сохранить',
        load: 'Загрузить',
        delete: 'Удалить',
        edit: 'Редактировать',
        close: 'Закрыть',
        back: 'Назад',
        next: 'Далее',
        previous: 'Предыдущий',
        continue: 'Продолжить',
        settings: 'Настройки',
        help: 'Помощь',
        about: 'О программе',
        loading: 'Загрузка...',
        error: 'Ошибка',
        success: 'Успешно',
        warning: 'Предупреждение',
        info: 'Информация'
      },
      game: {
        title: 'GameIDE - Создатель игр',
        subtitle: 'Создавайте HTML5 игры с помощью ИИ',
        start: 'Начать игру',
        pause: 'Пауза',
        resume: 'Продолжить',
        restart: 'Начать заново',
        over: 'Игра окончена',
        score: 'Очки: {score}',
        level: 'Уровень {level}',
        lives: {
          one: '{count} жизнь',
          few: '{count} жизни',
          many: '{count} жизней'
        },
        coins: {
          one: '{count} монета',
          few: '{count} монеты',
          many: '{count} монет'
        },
        time: 'Время: {time}',
        best: 'Лучший результат: {score}',
        newRecord: 'Новый рекорд!',
        tryAgain: 'Попробовать еще раз',
        mainMenu: 'Главное меню'
      },
      ui: {
        create: 'Создать',
        newGame: 'Новая игра',
        generateGame: 'Сгенерировать игру',
        gameTitle: 'Название игры',
        gameDescription: 'Описание игры',
        gameType: 'Тип игры',
        platformer: 'Платформер',
        arcade: 'Аркада',
        puzzle: 'Головоломка',
        rpg: 'РПГ',
        strategy: 'Стратегия',
        sports: 'Спорт',
        racing: 'Гонки',
        shooter: 'Шутер',
        adventure: 'Приключение',
        simulation: 'Симулятор',
        generateWithAI: 'Генерация с ИИ',
        chooseAI: 'Выберите ИИ',
        deepseek: 'DeepSeek (Код игр)',
        openai: 'OpenAI (Графика)',
        claude: 'Claude (Архитектура)',
        preview: 'Предпросмотр',
        download: 'Скачать',
        share: 'Поделиться',
        publish: 'Опубликовать',
        analytics: 'Аналитика',
        leaderboard: 'Таблица лидеров',
        achievements: 'Достижения',
        statistics: 'Статистика'
      },
      ad: {
        reward: 'Посмотреть рекламу за награду',
        continue: 'Посмотреть рекламу для продолжения',
        extraLife: 'Дополнительная жизнь',
        doubleCoins: 'Удвоить монеты',
        powerUp: 'Усиление',
        noThanks: 'Нет, спасибо',
        watchAd: 'Смотреть рекламу',
        skipAd: 'Пропустить рекламу',
        adLoading: 'Загрузка рекламы...',
        adError: 'Ошибка загрузки рекламы'
      },
      achievements: {
        title: 'Достижения',
        subtitle: 'Ваш прогресс и достижения в GameIDE',
        loading: 'Загрузка достижений...',
        secretAchievement: 'Секретное достижение',
        secretDescription: 'Выполните определенные условия, чтобы разблокировать это достижение',
        progress: 'Прогресс',
        complete: 'завершено',
        days: 'дней',
        unlockedOn: 'Разблокировано',
        share: 'Поделиться',
        viewDetails: 'Подробнее',
        linkCopied: 'Ссылка скопирована!',
        moreNotifications: 'больше уведомлений',
        resultsFound: 'результатов найдено',
        noResults: 'Ничего не найдено',
        tryDifferentFilters: 'Попробуйте изменить фильтры поиска',
        unlocked: 'Разблокировано!',
        locked: 'Заблокировано',
        points: 'Очки: {points}',
        
        // Categories
        category: {
          creation: 'Создание',
          mastery: 'Мастерство',
          social: 'Социальные',
          monetization: 'Монетизация',
          exploration: 'Исследование',
          special: 'Особые'
        },

        // Difficulties
        difficulty: {
          bronze: 'Бронза',
          silver: 'Серебро',
          gold: 'Золото',
          platinum: 'Платина',
          legendary: 'Легендарный'
        },

        // Rewards
        rewards: {
          title: 'Награды',
          points: 'очков',
          currency: 'монет',
          premiumDays: 'дней премиум',
          discount: 'скидка'
        },

        // Stats
        stats: {
          title: 'Статистика',
          points: 'Очки',
          unlocked: 'Разблокировано',
          completion: 'Завершение',
          streak: 'Серия',
          overallProgress: 'Общий прогресс'
        },

        // Filters
        filters: {
          title: 'Фильтры',
          search: 'Поиск достижений...',
          category: 'Категория',
          allCategories: 'Все категории',
          difficulty: 'Сложность',
          allDifficulties: 'Все сложности',
          sortBy: 'Сортировать',
          byProgress: 'По прогрессу',
          byDifficulty: 'По сложности',
          byCategory: 'По категории',
          byDate: 'По дате',
          showSecrets: 'Показать секретные'
        },

        // Sample achievements
        firstWin: 'Первая победа',
        firstWinDesc: 'Выиграйте первую игру',
        collector: 'Коллекционер',
        collectorDesc: 'Соберите 100 монет',
        speedRunner: 'Спидраннер',
        speedRunnerDesc: 'Пройдите уровень за 30 секунд',
        persistent: 'Настойчивый',
        persistentDesc: 'Сыграйте 10 игр',
        master: 'Мастер',
        masterDesc: 'Достигните 10 уровня'
      },

      // Leaderboards
      leaderboards: {
        title: 'Лидерборды',
        subtitle: 'Соревнуйтесь с лучшими игроками',
        loading: 'Загрузка лидербордов...',
        updating: 'Обновление...',
        export: 'Экспорт',
        selectLeaderboard: 'Выберите лидерборд',
        filters: 'Фильтры',
        searchPlaceholder: 'Поиск игроков...',
        region: 'Регион',
        allRegions: 'Все регионы',
        levelRange: 'Диапазон уровней',
        friendsOnly: 'Только друзья',
        onlineOnly: 'Только онлайн',
        yourStats: 'Ваша статистика',
        yourRank: 'Ваш ранг',
        yourScore: 'Ваш счет',
        percentile: 'Процентиль',
        progressToTop10: 'Прогресс до топ-10',
        totalPlayers: 'Всего игроков',
        topScore: 'Лучший счет',
        averageScore: 'Средний счет',
        participation: 'Участие',
        lastUpdate: 'Обновлено',
        noPlayers: 'Нет игроков',
        noPlayersDescription: 'Станьте первым в этом лидерборде!',
        
        // Player card
        new: 'Новичок',
        friend: 'Друг',
        mutualFriends: 'общих друзей',
        level: 'Уровень',
        gamesPlayed: 'Игр сыграно',
        achievements: 'Достижения',
        playTime: 'Время игры',
        joined: 'Присоединился',
        today: 'Сегодня',
        yesterday: 'Вчера',
        daysAgo: 'дней назад',
        points: 'очков',
        
        // Actions
        challenge: 'Вызов',
        addFriend: 'Добавить в друзья',
        challengeSent: 'Вызов отправлен',
        challengeFailed: 'Не удалось отправить вызов',
        friendRequestSent: 'Запрос в друзья отправлен',
        viewingProfile: 'Просмотр профиля',
        
        // Categories
        categories: {
          arcade: 'Аркада',
          puzzle: 'Головоломки',
          strategy: 'Стратегия',
          action: 'Экшн',
          all: 'Все'
        },
        
        // Periods
        periods: {
          daily: 'За день',
          weekly: 'За неделю',
          monthly: 'За месяц',
          all_time: 'Всё время'
        },
        
        // Badges
        badges: {
          champion: 'Чемпион',
          expert: 'Эксперт',
          risingStar: 'Восходящая звезда',
          veteran: 'Ветеран'
        }
      },
      errors: {
        networkError: 'Ошибка сети',
        serverError: 'Ошибка сервера',
        notFound: 'Не найдено',
        unauthorized: 'Нет авторизации',
        forbidden: 'Доступ запрещен',
        validation: 'Ошибка валидации',
        gameNotFound: 'Игра не найдена',
        aiServiceUnavailable: 'ИИ сервис недоступен',
        generationFailed: 'Ошибка генерации',
        uploadFailed: 'Ошибка загрузки',
        saveFailed: 'Ошибка сохранения',
        loadFailed: 'Ошибка загрузки',
        connectionLost: 'Соединение потеряно',
        tryAgain: 'Попробуйте еще раз'
      }
    };
  }

  private getEnglishTranslations(): Translation {
    return {
      common: {
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        cancel: 'Cancel',
        save: 'Save',
        load: 'Load',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        continue: 'Continue',
        settings: 'Settings',
        help: 'Help',
        about: 'About',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information'
      },
      game: {
        title: 'GameIDE - Game Creator',
        subtitle: 'Create HTML5 games with AI',
        start: 'Start Game',
        pause: 'Pause',
        resume: 'Resume',
        restart: 'Restart',
        over: 'Game Over',
        score: 'Score: {score}',
        level: 'Level {level}',
        lives: {
          one: '{count} life',
          other: '{count} lives'
        },
        coins: {
          one: '{count} coin',
          other: '{count} coins'
        },
        time: 'Time: {time}',
        best: 'Best: {score}',
        newRecord: 'New Record!',
        tryAgain: 'Try Again',
        mainMenu: 'Main Menu'
      },
      ui: {
        create: 'Create',
        newGame: 'New Game',
        generateGame: 'Generate Game',
        gameTitle: 'Game Title',
        gameDescription: 'Game Description',
        gameType: 'Game Type',
        platformer: 'Platformer',
        arcade: 'Arcade',
        puzzle: 'Puzzle',
        rpg: 'RPG',
        strategy: 'Strategy',
        sports: 'Sports',
        racing: 'Racing',
        shooter: 'Shooter',
        adventure: 'Adventure',
        simulation: 'Simulation',
        generateWithAI: 'Generate with AI',
        chooseAI: 'Choose AI',
        deepseek: 'DeepSeek (Game Code)',
        openai: 'OpenAI (Graphics)',
        claude: 'Claude (Architecture)',
        preview: 'Preview',
        download: 'Download',
        share: 'Share',
        publish: 'Publish',
        analytics: 'Analytics',
        leaderboard: 'Leaderboard',
        achievements: 'Achievements',
        statistics: 'Statistics'
      },
      ad: {
        reward: 'Watch ad for reward',
        continue: 'Watch ad to continue',
        extraLife: 'Extra Life',
        doubleCoins: 'Double Coins',
        powerUp: 'Power Up',
        noThanks: 'No Thanks',
        watchAd: 'Watch Ad',
        skipAd: 'Skip Ad',
        adLoading: 'Loading ad...',
        adError: 'Ad loading error'
      },
      achievements: {
        title: 'Achievements',
        unlocked: 'Unlocked!',
        locked: 'Locked',
        progress: 'Progress: {current}/{total}',
        points: 'Points: {points}',
        firstWin: 'First Victory',
        firstWinDesc: 'Win your first game',
        collector: 'Collector',
        collectorDesc: 'Collect 100 coins',
        speedRunner: 'Speed Runner',
        speedRunnerDesc: 'Complete level in 30 seconds',
        persistent: 'Persistent',
        persistentDesc: 'Play 10 games',
        master: 'Master',
        masterDesc: 'Reach level 10'
      },
      errors: {
        networkError: 'Network Error',
        serverError: 'Server Error',
        notFound: 'Not Found',
        unauthorized: 'Unauthorized',
        forbidden: 'Forbidden',
        validation: 'Validation Error',
        gameNotFound: 'Game Not Found',
        aiServiceUnavailable: 'AI Service Unavailable',
        generationFailed: 'Generation Failed',
        uploadFailed: 'Upload Failed',
        saveFailed: 'Save Failed',
        loadFailed: 'Load Failed',
        connectionLost: 'Connection Lost',
        tryAgain: 'Try Again'
      }
    };
  }

  private getTurkishTranslations(): Translation {
    return {
      common: {
        yes: 'Evet',
        no: 'Hayır',
        ok: 'Tamam',
        cancel: 'İptal',
        save: 'Kaydet',
        load: 'Yükle',
        delete: 'Sil',
        edit: 'Düzenle',
        close: 'Kapat',
        back: 'Geri',
        next: 'İleri',
        previous: 'Önceki',
        continue: 'Devam Et',
        settings: 'Ayarlar',
        help: 'Yardım',
        about: 'Hakkında',
        loading: 'Yükleniyor...',
        error: 'Hata',
        success: 'Başarılı',
        warning: 'Uyarı',
        info: 'Bilgi'
      },
      game: {
        title: 'GameIDE - Oyun Yaratıcısı',
        subtitle: 'AI ile HTML5 oyunları oluşturun',
        start: 'Oyunu Başlat',
        pause: 'Duraklat',
        resume: 'Devam Et',
        restart: 'Yeniden Başlat',
        over: 'Oyun Bitti',
        score: 'Puan: {score}',
        level: 'Seviye {level}',
        lives: {
          other: '{count} can'
        },
        coins: {
          other: '{count} madeni para'
        },
        time: 'Süre: {time}',
        best: 'En İyi: {score}',
        newRecord: 'Yeni Rekor!',
        tryAgain: 'Tekrar Dene',
        mainMenu: 'Ana Menü'
      },
      ui: {
        create: 'Oluştur',
        newGame: 'Yeni Oyun',
        generateGame: 'Oyun Oluştur',
        gameTitle: 'Oyun Başlığı',
        gameDescription: 'Oyun Açıklaması',
        gameType: 'Oyun Türü',
        platformer: 'Platform Oyunu',
        arcade: 'Arcade',
        puzzle: 'Bulmaca',
        rpg: 'RPG',
        strategy: 'Strateji',
        sports: 'Spor',
        racing: 'Yarış',
        shooter: 'Nişancı',
        adventure: 'Macera',
        simulation: 'Simülasyon',
        generateWithAI: 'AI ile Oluştur',
        chooseAI: 'AI Seç',
        deepseek: 'DeepSeek (Oyun Kodu)',
        openai: 'OpenAI (Grafikler)',
        claude: 'Claude (Mimari)',
        preview: 'Önizleme',
        download: 'İndir',
        share: 'Paylaş',
        publish: 'Yayınla',
        analytics: 'Analitik',
        leaderboard: 'Lider Tablosu',
        achievements: 'Başarımlar',
        statistics: 'İstatistikler'
      },
      ad: {
        reward: 'Ödül için reklam izle',
        continue: 'Devam etmek için reklam izle',
        extraLife: 'Ekstra Can',
        doubleCoins: 'Çifte Para',
        powerUp: 'Güçlendirici',
        noThanks: 'Hayır Teşekkürler',
        watchAd: 'Reklam İzle',
        skipAd: 'Reklamı Geç',
        adLoading: 'Reklam yükleniyor...',
        adError: 'Reklam yükleme hatası'
      },
      achievements: {
        title: 'Başarımlar',
        unlocked: 'Kilidi Açıldı!',
        locked: 'Kilitli',
        progress: 'İlerleme: {current}/{total}',
        points: 'Puan: {points}',
        firstWin: 'İlk Zafer',
        firstWinDesc: 'İlk oyununuzu kazanın',
        collector: 'Koleksiyoncu',
        collectorDesc: '100 madeni para toplayın',
        speedRunner: 'Hız Koşucusu',
        speedRunnerDesc: 'Seviyeyi 30 saniyede tamamlayın',
        persistent: 'Azimli',
        persistentDesc: '10 oyun oynayın',
        master: 'Usta',
        masterDesc: '10. seviyeye ulaşın'
      },
      errors: {
        networkError: 'Ağ Hatası',
        serverError: 'Sunucu Hatası',
        notFound: 'Bulunamadı',
        unauthorized: 'Yetkisiz',
        forbidden: 'Yasak',
        validation: 'Doğrulama Hatası',
        gameNotFound: 'Oyun Bulunamadı',
        aiServiceUnavailable: 'AI Hizmeti Kullanılamıyor',
        generationFailed: 'Oluşturma Başarısız',
        uploadFailed: 'Yükleme Başarısız',
        saveFailed: 'Kaydetme Başarısız',
        loadFailed: 'Yükleme Başarısız',
        connectionLost: 'Bağlantı Kesildi',
        tryAgain: 'Tekrar Deneyin'
      },
      templates: {
        title: 'Şablonlar',
        browse: 'Şablonlara Göz At',
        create: 'Yeni Şablon Oluştur',
        edit: 'Şablonu Düzenle',
        clone: 'Şablonu Kopyala',
        publish: 'Yayınla',
        unpublish: 'Yayından Kaldır',
        featured: 'Öne Çıkanlar',
        popular: 'Popüler',
        recent: 'Son Eklenenler',
        myTemplates: 'Şablonlarım',
        communityTemplates: 'Topluluk Şablonları',
        tags: 'Etiketler',
        category: 'Kategori',
        author: 'Yazar',
        downloads: 'İndirmeler',
        rating: 'Değerlendirme',
        reviews: 'Yorumlar',
        preview: 'Önizleme',
        use: 'Kullan',
        customize: 'Özelleştir'
      },
      analytics: {
        title: 'Analitik',
        dashboard: 'Gösterge Paneli',
        overview: 'Genel Bakış',
        users: 'Kullanıcılar',
        sessions: 'Oturumlar',
        events: 'Etkinlikler',
        revenue: 'Gelir',
        performance: 'Performans',
        demographics: 'Demografi',
        geography: 'Coğrafya',
        devices: 'Cihazlar',
        browsers: 'Tarayıcılar',
        referrers: 'Yönlendiren Siteler',
        pageViews: 'Sayfa Görüntülemeleri',
        uniqueVisitors: 'Tekil Ziyaretçiler',
        bounceRate: 'Çıkış Oranı',
        conversionRate: 'Dönüşüm Oranı',
        avgSessionDuration: 'Ortalama Oturum Süresi',
        totalRevenue: 'Toplam Gelir',
        revenuePerUser: 'Kullanıcı Başına Gelir',
        exportData: 'Veriyi Dışa Aktar',
        dateRange: 'Tarih Aralığı',
        realTime: 'Gerçek Zamanlı',
        last7Days: 'Son 7 Gün',
        last30Days: 'Son 30 Gün',
        lastMonth: 'Geçen Ay',
        lastYear: 'Geçen Yıl'
      },
      monetization: {
        title: 'Monetizasyon',
        plans: 'Abonelik Planları',
        currentPlan: 'Mevcut Plan',
        upgrade: 'Yükselt',
        downgrade: 'Düşür',
        monthly: 'Aylık',
        yearly: 'Yıllık',
        lifetime: 'Yaşam Boyu',
        free: 'Ücretsiz',
        premium: 'Premium',
        pro: 'Pro',
        enterprise: 'Kurumsal',
        features: 'Özellikler',
        price: 'Fiyat',
        save: '%{percent} tasarruf',
        mostPopular: 'En Popüler',
        purchaseSuccess: 'Satın alma başarıyla tamamlandı!',
        purchaseError: 'Ödeme işleminde hata. Lütfen tekrar deneyin.',
        processing: 'Ödeme işleniyor...',
        cancelled: 'Ödeme iptal edildi',
        expired: 'Süresi doldu'
      },
      leaderboard: {
        title: 'Lider Tablosu',
        rank: 'Sıra',
        player: 'Oyuncu',
        score: 'Puan',
        level: 'Seviye',
        gamesPlayed: 'Oynanan Oyunlar',
        winRate: 'Kazanma Oranı',
        achievementsUnlocked: 'Açılan Başarımlar',
        loading: 'Lider tablosu yükleniyor...',
        noData: 'Veri bulunamadı',
        refresh: 'Yenile',
        viewProfile: 'Profili Görüntüle',
        global: 'Küresel',
        friends: 'Arkadaşlar',
        weekly: 'Haftalık',
        monthly: 'Aylık',
        allTime: 'Tüm Zamanlar'
      }
    };
  }

  private getUkrainianTranslations(): Translation {
    return {
      common: {
        yes: 'Так',
        no: 'Ні',
        ok: 'OK',
        cancel: 'Скасувати',
        save: 'Зберегти',
        load: 'Завантажити',
        delete: 'Видалити',
        edit: 'Редагувати',
        close: 'Закрити',
        back: 'Назад',
        next: 'Далі',
        previous: 'Попередній',
        continue: 'Продовжити',
        settings: 'Налаштування',
        help: 'Допомога',
        about: 'Про програму',
        loading: 'Завантаження...',
        error: 'Помилка',
        success: 'Успішно',
        warning: 'Попередження',
        info: 'Інформація'
      },
      game: {
        title: 'GameIDE - Творець ігор',
        subtitle: 'Створюйте HTML5 ігри за допомогою ШІ',
        start: 'Почати гру',
        pause: 'Пауза',
        resume: 'Продовжити',
        restart: 'Почати знову',
        over: 'Гра закінчена',
        score: 'Очки: {score}',
        level: 'Рівень {level}',
        lives: {
          one: '{count} життя',
          few: '{count} життя',
          many: '{count} життів'
        },
        coins: {
          one: '{count} монета',
          few: '{count} монети',
          many: '{count} монет'
        },
        time: 'Час: {time}',
        best: 'Кращий результат: {score}',
        newRecord: 'Новий рекорд!',
        tryAgain: 'Спробувати ще раз',
        mainMenu: 'Головне меню'
      },
      ui: {
        create: 'Створити',
        newGame: 'Нова гра',
        generateGame: 'Згенерувати гру',
        gameTitle: 'Назва гри',
        gameDescription: 'Опис гри',
        gameType: 'Тип гри',
        platformer: 'Платформер',
        arcade: 'Аркада',
        puzzle: 'Головоломка',
        rpg: 'РПГ',
        strategy: 'Стратегія',
        sports: 'Спорт',
        racing: 'Гонки',
        shooter: 'Шутер',
        adventure: 'Пригода',
        simulation: 'Симулятор',
        generateWithAI: 'Генерація з ШІ',
        chooseAI: 'Оберіть ШІ',
        deepseek: 'DeepSeek (Код ігор)',
        openai: 'OpenAI (Графіка)',
        claude: 'Claude (Архітектура)',
        preview: 'Попередній перегляд',
        download: 'Завантажити',
        share: 'Поділитися',
        publish: 'Опублікувати',
        analytics: 'Аналітика',
        leaderboard: 'Таблиця лідерів',
        achievements: 'Досягнення',
        statistics: 'Статистика'
      },
      ad: {
        reward: 'Переглянути рекламу за нагороду',
        continue: 'Переглянути рекламу для продовження',
        extraLife: 'Додаткове життя',
        doubleCoins: 'Подвоїти монети',
        powerUp: 'Посилення',
        noThanks: 'Ні, дякую',
        watchAd: 'Дивитися рекламу',
        skipAd: 'Пропустити рекламу',
        adLoading: 'Завантаження реклами...',
        adError: 'Помилка завантаження реклами'
      },
      achievements: {
        title: 'Досягнення',
        subtitle: 'Ваш прогрес і досягнення в GameIDE',
        loading: 'Завантаження досягнень...',
        secretAchievement: 'Секретне досягнення',
        secretDescription: 'Виконайте певні умови, щоб розблокувати це досягнення',
        progress: 'Прогрес',
        complete: 'завершено',
        days: 'днів',
        unlockedOn: 'Розблоковано',
        share: 'Поділитися',
        viewDetails: 'Детальніше',
        linkCopied: 'Посилання скопійовано!',
        moreNotifications: 'більше сповіщень',
        resultsFound: 'результатів знайдено',
        noResults: 'Нічого не знайдено',
        tryDifferentFilters: 'Спробуйте змінити фільтры пошуку',
        unlocked: 'Розблоковано!',
        locked: 'Заблоковано',
        points: 'Очки: {points}',
        
        category: {
          creation: 'Створення',
          mastery: 'Майстерність',
          social: 'Соціальні',
          monetization: 'Монетизація',
          exploration: 'Дослідження',
          special: 'Особливі'
        },

        difficulty: {
          bronze: 'Бронза',
          silver: 'Срібло',
          gold: 'Золото',
          platinum: 'Платина',
          legendary: 'Легендарний'
        }
      },
      monetization: {
        title: 'Монетизація',
        plans: 'Планы підписки',
        currentPlan: 'Бягучы план',
        upgrade: 'Покращити',
        downgrade: 'Знизити',
        monthly: 'Щомісячно',
        yearly: 'Щорічно',
        lifetime: 'Назавжди',
        free: 'Безкоштовно',
        premium: 'Преміум',
        pro: 'Про',
        enterprise: 'Корпоративний',
        features: 'Функції',
        price: 'Ціна',
        save: 'Заощадити {percent}%',
        mostPopular: 'Найпопулярніший',
        purchaseSuccess: 'Покупка успішно завершена!',
        purchaseError: 'Помилка обробки покупки. Спробуйте ще раз.',
        processing: 'Обробка платежу...',
        cancelled: 'Платіж скасовано',
        expired: 'Термін дії закінчився'
      },
      leaderboard: {
        title: 'Таблиця лідерів',
        rank: 'Ранг',
        player: 'Гравець',
        score: 'Рахунок',
        level: 'Рівень',
        gamesPlayed: 'Ігор зіграно',
        winRate: 'Відсоток перемог',
        achievementsUnlocked: 'Достигнень розблоковано',
        loading: 'Завантаження таблиці лідерів...',
        noData: 'Дані не знайдено',
        refresh: 'Оновити',
        viewProfile: 'Переглянути профіль',
        global: 'Глобальний',
        friends: 'Друзі',
        weekly: 'Тижневий',
        monthly: 'Місячний',
        allTime: 'За весь час'
      }
    };
  }

  private getBelarusianTranslations(): Translation {
    return {
      common: {
        yes: 'Так',
        no: 'Не',
        ok: 'OK',
        cancel: 'Скасаваць',
        save: 'Захаваць',
        load: 'Загрузіць',
        delete: 'Выдаліць',
        edit: 'Рэдагаваць',
        close: 'Зачыніць',
        back: 'Назад',
        next: 'Далей',
        previous: 'Папярэдні',
        continue: 'Працягнуць',
        settings: 'Налады',
        help: 'Дапамога',
        about: 'Пра праграму',
        loading: 'Загрузка...',
        error: 'Памылка',
        success: 'Паспяхова',
        warning: 'Папярэджанне',
        info: 'Інфармацыя'
      },
      game: {
        title: 'GameIDE - Стваральнік гульняў',
        subtitle: 'Ствараеце HTML5 гульні з дапамогай ШІ',
        start: 'Пачаць гульню',
        pause: 'Паўза',
        resume: 'Працягнуць',
        restart: 'Пачаць нанова',
        over: 'Гульня скончана',
        score: 'Ачкі: {score}',
        level: 'Узровень {level}',
        lives: {
          one: '{count} жыццё',
          few: '{count} жыцці',
          many: '{count} жыццяў'
        },
        coins: {
          one: '{count} манета',
          few: '{count} манеты',
          many: '{count} манет'
        },
        time: 'Час: {time}',
        best: 'Лепшы вынік: {score}',
        newRecord: 'Новы рэкорд!',
        tryAgain: 'Паспрабаваць яшчэ раз',
        mainMenu: 'Галоўнае меню'
      },
      ui: {
        create: 'Стварыць',
        newGame: 'Новая гульня',
        generateGame: 'Згенераваць гульню',
        gameTitle: 'Назва гульні',
        gameDescription: 'Апісанне гульні',
        gameType: 'Тып гульні',
        platformer: 'Платформер',
        arcade: 'Аркада',
        puzzle: 'Галаваломка',
        rpg: 'РПГ',
        strategy: 'Стратэгія',
        sports: 'Спорт',
        racing: 'Гонкі',
        shooter: 'Шутэр',
        adventure: 'Прыгода',
        simulation: 'Сімулятар',
        generateWithAI: 'Генерацыя з ШІ',
        chooseAI: 'Абярыце ШІ',
        deepseek: 'DeepSeek (Код гульняў)',
        openai: 'OpenAI (Графіка)',
        claude: 'Claude (Архітэктура)',
        preview: 'Папярэдні прагляд',
        download: 'Загрузіць',
        share: 'Падзяліцца',
        publish: 'Апублікаваць',
        analytics: 'Аналітыка',
        leaderboard: 'Табліца лідэраў',
        achievements: 'Дасягненні',
        statistics: 'Статыстыка'
      },
      ad: {
        reward: 'Паглядзець рэкламу за ўзнагароду',
        continue: 'Паглядзець рэкламу для працягу',
        extraLife: 'Дадатковае жыццё',
        doubleCoins: 'Падвоіць манеты',
        powerUp: 'Пасіленне',
        noThanks: 'Не, дзякуй',
        watchAd: 'Глядзець рэкламу',
        skipAd: 'Прапусціць рэкламу',
        adLoading: 'Загрузка рэкламы...',
        adError: 'Памылка загрузкі рэкламы'
      },
      achievements: {
        title: 'Дасягненні',
        subtitle: 'Ваш прагрэс і дасягненні ў GameIDE',
        loading: 'Загрузка дасягненняў...',
        secretAchievement: 'Сакрэтнае дасягненне',
        secretDescription: 'Выканайце пэўныя ўмовы, каб разблакіраваць гэта дасягненне',
        progress: 'Прагрэс',
        complete: 'завершана',
        days: 'дзён',
        unlockedOn: 'Разблакіравана',
        share: 'Падзяліцца',
        viewDetails: 'Падрабязней',
        linkCopied: 'Спасылка скапіравана!',
        moreNotifications: 'больш апавяшчэнняў',
        resultsFound: 'вынікаў знойдзена',
        noResults: 'Нічога не знойдзена',
        tryDifferentFilters: 'Паспрабуйце змяніць фільтры пошуку',
        unlocked: 'Разблакіравана!',
        locked: 'Заблакіравана',
        points: 'Ачкі: {points}',
        
        category: {
          creation: 'Стварэнне',
          mastery: 'Майстэрства',
          social: 'Сацыяльныя',
          monetization: 'Манетызацыя',
          exploration: 'Даследаванне',
          special: 'Адмысловыя'
        },

        difficulty: {
          bronze: 'Бронза',
          silver: 'Срэбра',
          gold: 'Золата',
          platinum: 'Платына',
          legendary: 'Легендарны'
        }
      },
      monetization: {
        title: 'Манетызацыя',
        plans: 'Планы падпіскі',
        currentPlan: 'Бягучы план',
        upgrade: 'Палепшыць',
        downgrade: 'Зніжыць',
        monthly: 'Штомесячна',
        yearly: 'Штогадова',
        lifetime: 'Назаўсёды',
        free: 'Бясплатна',
        premium: 'Прэміум',
        pro: 'Про',
        enterprise: 'Карпаратыўны',
        features: 'Функцыі',
        price: 'Цана',
        save: 'Зэканоміць {percent}%',
        mostPopular: 'Самы папулярны',
        purchaseSuccess: 'Покупка паспяхова завершана!',
        purchaseError: 'Памылка апрацоўкі покупкі. Паспрабуйце яшчэ раз.',
        processing: 'Апрацоўка плацяжу...',
        cancelled: 'Плацёж скасаваны',
        expired: 'Тэрмін дзеяння скончыўся'
      },
      leaderboard: {
        title: 'Табліца лідэраў',
        rank: 'Ранг',
        player: 'Гулец',
        score: 'Лік',
        level: 'Узровень',
        gamesPlayed: 'Гульняў згуляна',
        winRate: 'Адсотак перамог',
        achievementsUnlocked: 'Дасягненняў разблакіравана',
        loading: 'Загрузка табліцы лідэраў...',
        noData: 'Дадзеныя не знойдзены',
        refresh: 'Абнавіць',
        viewProfile: 'Прагледзець профіль',
        global: 'Глабальны',
        friends: 'Сябры',
        weekly: 'Тыднёвы',
        monthly: 'Месячны',
        allTime: 'За ўвесь час'
      }
    };
  }

  private getKazakhTranslations(): Translation {
    return {
      common: {
        yes: 'Иә',
        no: 'Жоқ',
        ok: 'Жарайды',
        cancel: 'Болдырмау',
        save: 'Сақтау',
        load: 'Жүктеу',
        delete: 'Жою',
        edit: 'Өңдеу',
        close: 'Жабу',
        back: 'Артқа',
        next: 'Келесі',
        previous: 'Алдыңғы',
        continue: 'Жалғастыру',
        settings: 'Баптаулар',
        help: 'Көмек',
        about: 'Бағдарлама туралы',
        loading: 'Жүктелуде...',
        error: 'Қате',
        success: 'Сәтті',
        warning: 'Ескерту',
        info: 'Ақпарат'
      },
      game: {
        title: 'GameIDE - Ойын жасаушысы',
        subtitle: 'ЖИ көмегімен HTML5 ойындарын жасаңыз',
        start: 'Ойынды бастау',
        pause: 'Тоқтату',
        resume: 'Жалғастыру',
        restart: 'Қайта бастау',
        gameOver: 'Ойын аяқталды',
        victory: 'Жеңіс!',
        defeat: 'Жеңіліс',
        score: 'Ұпай',
        level: 'Деңгей',
        lives: 'Өмірлер',
        time: 'Уақыт',
        highScore: 'Ең жоғары ұпай',
        player: 'Ойыншы',
        menu: 'Мәзір',
        controls: 'Басқару',
        sound: 'Дыбыс',
        music: 'Музыка',
        mute: 'Дыбысты өшіру',
        unmute: 'Дыбысты қосу',
        fullscreen: 'Толық экран',
        exitFullscreen: 'Толық экраннан шығу'
      },
      generation: {
        title: 'Ойын жасау',
        prompt: 'Ойын сипаттамасын енгізіңіз',
        placeholderPrompt: 'Мысалы: 2D платформер, жасыл арқафонда, қызыл дөңгелек кейіпкер...',
        generate: 'Жасау',
        generating: 'Ойын жасалуда...',
        success: 'Ойын сәтті жасалды!',
        error: 'Ойын жасау кезінде қате пайда болды',
        preview: 'Алдын ала қарау',
        download: 'Жүктеп алу',
        share: 'Бөлісу',
        edit: 'Өңдеу',
        delete: 'Жою',
        duplicate: 'Көшіру',
        export: 'Экспорттау',
        import: 'Импорттау',
        customize: 'Баптау',
        gameTitle: 'Ойын атауы',
        gameDescription: 'Ойын сипаттамасы',
        gameGenre: 'Ойын жанры',
        difficulty: 'Қиындық деңгейі',
        easy: 'Оңай',
        medium: 'Орташа',
        hard: 'Қиын',
        expert: 'Сарапшы'
      },
      templates: {
        title: 'Үлгілер',
        browse: 'Үлгілерді қарау',
        create: 'Жаңа үлгі жасау',
        edit: 'Үлгіні өңдеу',
        clone: 'Үлгіні көшіру',
        publish: 'Жариялау',
        unpublish: 'Жариялауды тоқтату',
        featured: 'Ұсынылатын',
        popular: 'Танымал',
        recent: 'Жақында қосылған',
        myTemplates: 'Менің үлгілерім',
        communityTemplates: 'Қауымдастық үлгілері',
        tags: 'Тегтер',
        category: 'Санат',
        author: 'Автор',
        downloads: 'Жүктеулер',
        rating: 'Бағалау',
        reviews: 'Пікірлер',
        preview: 'Алдын ала қарау',
        use: 'Пайдалану',
        customize: 'Баптау'
      },
      analytics: {
        title: 'Аналитика',
        dashboard: 'Басқару тақтасы',
        overview: 'Жалпы көрініс',
        users: 'Пайдаланушылар',
        sessions: 'Сеанстар',
        events: 'Оқиғалар',
        revenue: 'Кіріс',
        performance: 'Өнімділік',
        demographics: 'Демография',
        geography: 'География',
        devices: 'Құрылғылар',
        browsers: 'Браузерлер',
        referrers: 'Сілтеме көздері',
        pageViews: 'Бет көрулері',
        uniqueVisitors: 'Бірегей келушілер',
        bounceRate: 'Кету жылдамдығы',
        conversionRate: 'Түрлендіру жылдамдығы',
        avgSessionDuration: 'Орташа сеанс ұзақтығы',
        totalRevenue: 'Жалпы кіріс',
        revenuePerUser: 'Пайдаланушы үшін кіріс',
        exportData: 'Деректерді экспорттау',
        dateRange: 'Күн аралығы',
        realTime: 'Нақты уақыт',
        last7Days: 'Соңғы 7 күн',
        last30Days: 'Соңғы 30 күн',
        lastMonth: 'Өткен ай',
        lastYear: 'Өткен жыл'
      },
      achievements: {
        title: 'Жетістіктер',
        unlock: 'Ашу',
        unlocked: 'Ашылды',
        locked: 'Жабық',
        progress: 'Прогресс',
        description: 'Сипаттама',
        requirements: 'Талаптар',
        reward: 'Сыйақы',
        rarity: 'Сирек',
        points: 'Ұпайлар',
        badges: 'Белгілер',
        trophies: 'Кубоктар',
        medals: 'Медальдар',
        ranks: 'Дәрежелер',
        leaderboard: 'Көшбасшылар тізімі',
        compare: 'Салыстыру',
        share: 'Бөлісу',
        categories: {
          gameplay: 'Ойын процесі',
          social: 'Әлеуметтік',
          creative: 'Шығармашылық',
          progression: 'Дамыту',
          special: 'Арнайы'
        },
        rarity: {
          common: 'Жалпы',
          uncommon: 'Сирек емес',
          rare: 'Сирек',
          epic: 'Эпикалық',
          legendary: 'Ұлы',
          bronze: 'Қола',
          silver: 'Күміс',
          gold: 'Алтын',
          platinum: 'Платина',
          legendary: 'Ұлы'
        }
      },
      monetization: {
        title: 'Монетизация',
        plans: 'Жазылым жоспарлары',
        currentPlan: 'Ағымдағы жоспар',
        upgrade: 'Жақсарту',
        downgrade: 'Төмендету',
        monthly: 'Ай сайын',
        yearly: 'Жыл сайын',
        lifetime: 'Өмір бойы',
        free: 'Тегін',
        premium: 'Премиум',
        pro: 'Pro',
        enterprise: 'Кәсіпорын',
        features: 'Мүмкіндіктер',
        price: 'Баға',
        save: '{percent}% үнемдеу',
        mostPopular: 'Ең танымал',
        purchaseSuccess: 'Сатып алу сәтті аяқталды!',
        purchaseError: 'Төлемді өңдеу қатесі. Қайталап көріңіз.',
        processing: 'Төлем өңделуде...',
        cancelled: 'Төлем тоқтатылды',
        expired: 'Мерзімі өтті'
      },
      leaderboard: {
        title: 'Көшбасшылар тізімі',
        rank: 'Орын',
        player: 'Ойыншы',
        score: 'Ұпай',
        level: 'Деңгей',
        gamesPlayed: 'Ойналған ойындар',
        winRate: 'Жеңіс пайызы',
        achievementsUnlocked: 'Ашылған жетістіктер',
        loading: 'Көшбасшылар тізімі жүктелуде...',
        noData: 'Деректер табылмады',
        refresh: 'Жаңарту',
        viewProfile: 'Профильді қарау',
        global: 'Жаһандық',
        friends: 'Достар',
        weekly: 'Апталық',
        monthly: 'Айлық',
        allTime: 'Барлық уақыт'
      }
    };
  }

  /**
   * Получить все поддерживаемые языки
   */
  public getSupportedLanguages(): LanguageData[] {
    return Array.from(this.languages.values());
  }

  /**
   * Получить данные языка по коду
   */
  public getLanguage(code: string): LanguageData | null {
    return this.languages.get(code) || null;
  }

  /**
   * Получить перевод по ключу
   */
  public getTranslation(
    languageCode: string, 
    key: string, 
    params: Record<string, any> = {}
  ): string {
    const language = this.languages.get(languageCode);
    if (!language) {
      // Fallback к английскому языку
      return this.getTranslation(this.config.fallbackLanguage, key, params);
    }

    const keys = key.split('.');
    let translation: any = language.translations;

    // Поиск по ключам
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) break;
    }

    // Если перевод не найден, используем fallback
    if (!translation && languageCode !== this.config.fallbackLanguage) {
      return this.getTranslation(this.config.fallbackLanguage, key, params);
    }

    if (typeof translation === 'string') {
      return this.interpolate(translation, params);
    }

    return key; // Возвращаем ключ, если перевод не найден
  }

  /**
   * Получить множественное число
   */
  public getPlural(
    languageCode: string,
    key: string,
    count: number,
    params: Record<string, any> = {}
  ): string {
    const language = this.languages.get(languageCode);
    if (!language || !language.pluralRules) {
      return this.getTranslation(languageCode, key, { count, ...params });
    }

    const form = language.pluralRules(count);
    const pluralKey = `${key}.${form}`;
    
    return this.getTranslation(languageCode, pluralKey, { count, ...params });
  }

  /**
   * Интерполяция параметров в строку
   */
  private interpolate(str: string, params: Record<string, any>): string {
    return str.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param].toString() : match;
    });
  }

  /**
   * Определить язык пользователя
   */
  public detectUserLanguage(acceptLanguage?: string): string {
    if (acceptLanguage) {
      // Парсим Accept-Language заголовок
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase())
        .map(lang => lang.split('-')[0]); // Берем только основную часть (ru-RU -> ru)

      for (const lang of languages) {
        if (this.config.supportedLanguages.includes(lang)) {
          return lang;
        }
      }
    }

    return this.config.defaultLanguage;
  }

  /**
   * Получить все переводы для языка (для фронтенда)
   */
  public getAllTranslations(languageCode: string): Translation | null {
    const language = this.languages.get(languageCode);
    return language ? language.translations : null;
  }

  /**
   * Получить переводы по неймспейсу
   */
  public getNamespaceTranslations(
    languageCode: string, 
    namespace: string
  ): Translation | null {
    const translations = this.getAllTranslations(languageCode);
    return translations && translations[namespace] ? translations[namespace] as Translation : null;
  }

  /**
   * Добавить или обновить переводы
   */
  public updateTranslations(
    languageCode: string, 
    namespace: string, 
    translations: Translation
  ): boolean {
    const language = this.languages.get(languageCode);
    if (!language) return false;

    if (!language.translations[namespace]) {
      language.translations[namespace] = {};
    }

    language.translations[namespace] = {
      ...language.translations[namespace] as Translation,
      ...translations
    };

    return true;
  }

  /**
   * Экспорт переводов в JSON
   */
  public exportTranslations(languageCode?: string): string {
    if (languageCode) {
      const language = this.languages.get(languageCode);
      return JSON.stringify(language?.translations || {}, null, 2);
    }

    const allTranslations: Record<string, Translation> = {};
    for (const [code, language] of this.languages) {
      allTranslations[code] = language.translations;
    }

    return JSON.stringify(allTranslations, null, 2);
  }

  /**
   * Импорт переводов из JSON
   */
  public importTranslations(data: string): boolean {
    try {
      const translations = JSON.parse(data);
      
      for (const [languageCode, languageTranslations] of Object.entries(translations)) {
        const language = this.languages.get(languageCode);
        if (language && typeof languageTranslations === 'object') {
          language.translations = languageTranslations as Translation;
        }
      }

      return true;
    } catch (error) {
      console.error('Ошибка импорта переводов:', error);
      return false;
    }
  }
}

// Экспортируем синглтон
export const localizationService = new LocalizationService(); 