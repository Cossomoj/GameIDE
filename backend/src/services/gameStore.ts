import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { analyticsService } from './analytics';

export interface GameStoreItem {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  
  // Контент
  gameFile: string;
  thumbnailUrl: string;
  screenshotUrls: string[];
  videoUrl?: string;
  demoUrl?: string;
  
  // Метаданные
  category: 'arcade' | 'puzzle' | 'platformer' | 'action' | 'strategy' | 'simulation' | 'other';
  tags: string[];
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  ageRating: 'all' | '7+' | '12+' | '16+' | '18+';
  
  // Цены и монетизация
  pricing: {
    type: 'free' | 'paid' | 'freemium' | 'subscription';
    basePrice: number;
    salePrice?: number;
    saleEndDate?: Date;
    currency: string;
    inAppPurchases: boolean;
    subscriptionPlans?: Array<{
      id: string;
      name: string;
      price: number;
      duration: 'monthly' | 'yearly' | 'lifetime';
      features: string[];
    }>;
  };
  
  // Разработчик и публикация
  developer: {
    id: string;
    name: string;
    email: string;
    website?: string;
    verified: boolean;
  };
  
  // Статистика и рейтинги
  stats: {
    downloads: number;
    plays: number;
    averageRating: number;
    reviewCount: number;
    revenue: number;
    wishlistCount: number;
    viewCount: number;
  };
  
  // Технические характеристики
  technical: {
    fileSize: number;
    minRequirements: string;
    supportedPlatforms: ('web' | 'mobile' | 'desktop')[];
    languages: string[];
    version: string;
    lastUpdated: Date;
  };
  
  // Статус модерации
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    moderationNotes?: string;
  };
  
  // SEO и маркетинг
  seo: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    featured: boolean;
    trending: boolean;
    newRelease: boolean;
  };
  
  // Дополнительная информация
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    archivedAt?: Date;
    flags: string[];
    customData: Record<string, any>;
  };
}

export interface GameReview {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  rating: number; // 1-5 звезд
  title: string;
  content: string;
  
  // Полезность отзыва
  helpfulVotes: number;
  totalVotes: number;
  
  // Верификация
  verified: boolean; // Пользователь купил игру
  playtime: number; // Время игры в минутах
  
  // Модерация
  moderated: boolean;
  moderationNotes?: string;
  
  // Дополнительная информация
  pros: string[];
  cons: string[];
  screenshots: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreCollection {
  id: string;
  name: string;
  description: string;
  type: 'featured' | 'category' | 'developer' | 'custom' | 'seasonal';
  gameIds: string[];
  imageUrl?: string;
  
  // Условия включения
  criteria?: {
    category?: string;
    minRating?: number;
    maxPrice?: number;
    tags?: string[];
    developerId?: string;
  };
  
  // Сортировка и отображение
  sortBy: 'popularity' | 'rating' | 'price' | 'date' | 'custom';
  displayStyle: 'grid' | 'list' | 'carousel';
  maxItems?: number;
  
  // Временные рамки
  startDate?: Date;
  endDate?: Date;
  
  // Метаданные
  visible: boolean;
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  gameId: string;
  userId: string;
  
  // Детали покупки
  purchaseType: 'game' | 'dlc' | 'subscription' | 'in_app';
  itemId: string;
  amount: number;
  currency: string;
  
  // Статус
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'paypal' | 'crypto' | 'wallet' | 'promo';
  
  // Платежная информация
  paymentProvider: string;
  transactionId: string;
  providerTransactionId?: string;
  
  // Возврат и поддержка
  refundable: boolean;
  refundedAt?: Date;
  refundReason?: string;
  supportTicketId?: string;
  
  // Временные метки
  purchasedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  
  // Дополнительные данные
  metadata: {
    ip: string;
    userAgent: string;
    referrer?: string;
    promoCode?: string;
    discount?: number;
  };
}

export interface Wishlist {
  id: string;
  userId: string;
  gameIds: string[];
  
  // Уведомления
  notifyOnSale: boolean;
  notifyOnRelease: boolean;
  notifyOnUpdate: boolean;
  
  // Группировка
  collections: Array<{
    name: string;
    gameIds: string[];
    public: boolean;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface StorePromotion {
  id: string;
  name: string;
  description: string;
  type: 'sale' | 'bundle' | 'free_weekend' | 'early_access' | 'beta';
  
  // Скидка
  discountType: 'percentage' | 'fixed' | 'bundle' | 'free';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  
  // Целевые игры
  gameIds: string[];
  categories: string[];
  developers: string[];
  
  // Условия
  userGroups: string[]; // premium, new, returning
  maxUsage?: number;
  usageCount: number;
  promoCode?: string;
  
  // Временные рамки
  startDate: Date;
  endDate: Date;
  
  // Маркетинг
  bannerUrl?: string;
  landingPageUrl?: string;
  featured: boolean;
  
  // Статус
  active: boolean;
  approved: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreAnalytics {
  // Общая статистика
  totalGames: number;
  totalDevelopers: number;
  totalRevenue: number;
  totalDownloads: number;
  
  // Топ-игры
  topByDownloads: Array<{ gameId: string; downloads: number }>;
  topByRevenue: Array<{ gameId: string; revenue: number }>;
  topByRating: Array<{ gameId: string; rating: number }>;
  
  // Категории
  categoryStats: Array<{
    category: string;
    gameCount: number;
    averagePrice: number;
    totalRevenue: number;
  }>;
  
  // Тренды
  trends: {
    newGames: number;
    growingGames: string[];
    decliningGames: string[];
  };
  
  // Пользовательское поведение
  userBehavior: {
    averageSessionTime: number;
    conversionRate: number;
    cartAbandonmentRate: number;
    repeatPurchaseRate: number;
  };
}

class GameStoreService extends EventEmitter {
  private games: Map<string, GameStoreItem> = new Map();
  private reviews: Map<string, GameReview[]> = new Map();
  private collections: Map<string, StoreCollection> = new Map();
  private purchases: Map<string, Purchase> = new Map();
  private wishlists: Map<string, Wishlist> = new Map();
  private promotions: Map<string, StorePromotion> = new Map();

  // Кэш для быстрого поиска
  private searchIndex: Map<string, string[]> = new Map();
  private categoryIndex: Map<string, string[]> = new Map();
  private priceIndex: Map<string, string[]> = new Map();

  constructor() {
    super();
    this.initializeStore();
    this.startPeriodicTasks();
  }

  // Управление играми в магазине

  public async submitGame(gameData: Partial<GameStoreItem>, developerId: string): Promise<GameStoreItem> {
    try {
      const gameId = this.generateGameId();
      
      const game: GameStoreItem = {
        id: gameId,
        title: gameData.title || '',
        description: gameData.description || '',
        shortDescription: gameData.shortDescription || '',
        
        gameFile: gameData.gameFile || '',
        thumbnailUrl: gameData.thumbnailUrl || '',
        screenshotUrls: gameData.screenshotUrls || [],
        videoUrl: gameData.videoUrl,
        demoUrl: gameData.demoUrl,
        
        category: gameData.category || 'other',
        tags: gameData.tags || [],
        genre: gameData.genre || 'Casual',
        difficulty: gameData.difficulty || 'medium',
        ageRating: gameData.ageRating || 'all',
        
        pricing: gameData.pricing || {
          type: 'free',
          basePrice: 0,
          currency: 'USD',
          inAppPurchases: false
        },
        
        developer: {
          id: developerId,
          name: gameData.developer?.name || 'Unknown Developer',
          email: gameData.developer?.email || '',
          website: gameData.developer?.website,
          verified: false
        },
        
        stats: {
          downloads: 0,
          plays: 0,
          averageRating: 0,
          reviewCount: 0,
          revenue: 0,
          wishlistCount: 0,
          viewCount: 0
        },
        
        technical: {
          fileSize: gameData.technical?.fileSize || 0,
          minRequirements: gameData.technical?.minRequirements || 'Modern browser',
          supportedPlatforms: gameData.technical?.supportedPlatforms || ['web'],
          languages: gameData.technical?.languages || ['en'],
          version: '1.0.0',
          lastUpdated: new Date()
        },
        
        moderation: {
          status: 'pending',
          submittedAt: new Date()
        },
        
        seo: {
          slug: this.generateSlug(gameData.title || ''),
          metaTitle: gameData.title || '',
          metaDescription: gameData.shortDescription || '',
          keywords: gameData.tags || [],
          featured: false,
          trending: false,
          newRelease: true
        },
        
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          flags: [],
          customData: {}
        }
      };

      this.games.set(gameId, game);
      this.updateSearchIndex(game);

      this.emit('gameSubmitted', game);
      logger.info(`Game submitted for review: ${gameId}`);

      analyticsService.trackEvent('game_submitted', {
        gameId,
        developerId,
        category: game.category,
        pricingType: game.pricing.type
      });

      return game;
    } catch (error) {
      logger.error('Error submitting game:', error);
      throw error;
    }
  }

  public async moderateGame(
    gameId: string, 
    decision: 'approve' | 'reject', 
    moderatorId: string,
    notes?: string
  ): Promise<GameStoreItem> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      game.moderation.status = decision === 'approve' ? 'approved' : 'rejected';
      game.moderation.reviewedAt = new Date();
      game.moderation.reviewedBy = moderatorId;
      game.moderation.moderationNotes = notes;
      
      if (decision === 'approve') {
        game.metadata.publishedAt = new Date();
      } else {
        game.moderation.rejectionReason = notes;
      }

      game.metadata.updatedAt = new Date();

      this.emit('gameModerated', { game, decision, moderatorId });
      logger.info(`Game ${decision}: ${gameId} by ${moderatorId}`);

      analyticsService.trackEvent('game_moderated', {
        gameId,
        decision,
        moderatorId,
        category: game.category
      });

      return game;
    } catch (error) {
      logger.error('Error moderating game:', error);
      throw error;
    }
  }

  // Поиск и фильтрация

  public async searchGames(query: {
    search?: string;
    category?: string;
    priceRange?: { min: number; max: number };
    rating?: number;
    tags?: string[];
    sortBy?: 'popularity' | 'rating' | 'price' | 'date';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
    games: GameStoreItem[];
    total: number;
    facets: {
      categories: Array<{ name: string; count: number }>;
      priceRanges: Array<{ range: string; count: number }>;
      ratings: Array<{ rating: number; count: number }>;
      tags: Array<{ tag: string; count: number }>;
    };
  }> {
    try {
      let filteredGames = Array.from(this.games.values())
        .filter(game => game.moderation.status === 'approved');

      // Текстовый поиск
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        filteredGames = filteredGames.filter(game =>
          game.title.toLowerCase().includes(searchTerm) ||
          game.description.toLowerCase().includes(searchTerm) ||
          game.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          game.developer.name.toLowerCase().includes(searchTerm)
        );
      }

      // Фильтр по категории
      if (query.category) {
        filteredGames = filteredGames.filter(game => game.category === query.category);
      }

      // Фильтр по цене
      if (query.priceRange) {
        filteredGames = filteredGames.filter(game => {
          const price = game.pricing.salePrice || game.pricing.basePrice;
          return price >= query.priceRange!.min && price <= query.priceRange!.max;
        });
      }

      // Фильтр по рейтингу
      if (query.rating) {
        filteredGames = filteredGames.filter(game => game.stats.averageRating >= query.rating!);
      }

      // Фильтр по тегам
      if (query.tags && query.tags.length > 0) {
        filteredGames = filteredGames.filter(game =>
          query.tags!.some(tag => game.tags.includes(tag))
        );
      }

      // Сортировка
      filteredGames = this.sortGames(filteredGames, query.sortBy || 'popularity', query.sortOrder || 'desc');

      // Пагинация
      const total = filteredGames.length;
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      const paginatedGames = filteredGames.slice(offset, offset + limit);

      // Генерируем фасеты для фильтров
      const facets = this.generateFacets(Array.from(this.games.values()));

      return {
        games: paginatedGames,
        total,
        facets
      };
    } catch (error) {
      logger.error('Error searching games:', error);
      throw error;
    }
  }

  // Системы оценок и отзывов

  public async addReview(reviewData: {
    gameId: string;
    userId: string;
    username: string;
    rating: number;
    title: string;
    content: string;
    pros?: string[];
    cons?: string[];
    playtime?: number;
  }): Promise<GameReview> {
    try {
      const { gameId, userId } = reviewData;

      // Проверяем, что игра существует
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Проверяем, не оставлял ли пользователь уже отзыв
      const existingReviews = this.reviews.get(gameId) || [];
      const existingReview = existingReviews.find(review => review.userId === userId);
      if (existingReview) {
        throw new Error('User has already reviewed this game');
      }

      // Проверяем, купил ли пользователь игру (для верификации)
      const hasPurchased = await this.hasUserPurchasedGame(userId, gameId);

      const reviewId = this.generateReviewId();
      const review: GameReview = {
        id: reviewId,
        gameId,
        userId,
        username: reviewData.username,
        rating: Math.max(1, Math.min(5, reviewData.rating)),
        title: reviewData.title,
        content: reviewData.content,
        
        helpfulVotes: 0,
        totalVotes: 0,
        
        verified: hasPurchased,
        playtime: reviewData.playtime || 0,
        
        moderated: false,
        
        pros: reviewData.pros || [],
        cons: reviewData.cons || [],
        screenshots: [],
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Добавляем отзыв
      if (!this.reviews.has(gameId)) {
        this.reviews.set(gameId, []);
      }
      this.reviews.get(gameId)!.push(review);

      // Обновляем статистику игры
      await this.updateGameRatingStats(gameId);

      this.emit('reviewAdded', review);
      logger.info(`Review added: ${reviewId} for game ${gameId}`);

      analyticsService.trackEvent('review_added', {
        reviewId,
        gameId,
        userId,
        rating: review.rating,
        verified: review.verified
      });

      return review;
    } catch (error) {
      logger.error('Error adding review:', error);
      throw error;
    }
  }

  public async voteOnReview(reviewId: string, userId: string, helpful: boolean): Promise<void> {
    try {
      // Находим отзыв
      let targetReview: GameReview | null = null;
      
      for (const reviews of this.reviews.values()) {
        const review = reviews.find(r => r.id === reviewId);
        if (review) {
          targetReview = review;
          break;
        }
      }

      if (!targetReview) {
        throw new Error('Review not found');
      }

      // В реальном приложении здесь была бы проверка на повторное голосование
      targetReview.totalVotes++;
      if (helpful) {
        targetReview.helpfulVotes++;
      }

      targetReview.updatedAt = new Date();

      analyticsService.trackEvent('review_voted', {
        reviewId,
        userId,
        helpful,
        gameId: targetReview.gameId
      });

    } catch (error) {
      logger.error('Error voting on review:', error);
      throw error;
    }
  }

  // Покупки и монетизация

  public async purchaseGame(purchaseData: {
    gameId: string;
    userId: string;
    paymentMethod: Purchase['paymentMethod'];
    paymentProvider: string;
    promoCode?: string;
    metadata?: any;
  }): Promise<Purchase> {
    try {
      const { gameId, userId } = purchaseData;

      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      if (game.pricing.type === 'free') {
        throw new Error('Cannot purchase free game');
      }

      // Проверяем, не купил ли уже пользователь эту игру
      const existingPurchase = await this.findExistingPurchase(userId, gameId);
      if (existingPurchase) {
        throw new Error('User has already purchased this game');
      }

      // Применяем промокод
      let finalPrice = game.pricing.salePrice || game.pricing.basePrice;
      let discount = 0;
      
      if (purchaseData.promoCode) {
        const promoResult = await this.applyPromoCode(purchaseData.promoCode, gameId, finalPrice);
        finalPrice = promoResult.finalPrice;
        discount = promoResult.discount;
      }

      const purchaseId = this.generatePurchaseId();
      const purchase: Purchase = {
        id: purchaseId,
        gameId,
        userId,
        
        purchaseType: 'game',
        itemId: gameId,
        amount: finalPrice,
        currency: game.pricing.currency,
        
        status: 'pending',
        paymentMethod: purchaseData.paymentMethod,
        
        paymentProvider: purchaseData.paymentProvider,
        transactionId: this.generateTransactionId(),
        
        refundable: true,
        
        purchasedAt: new Date(),
        
        metadata: {
          ip: purchaseData.metadata?.ip || '',
          userAgent: purchaseData.metadata?.userAgent || '',
          referrer: purchaseData.metadata?.referrer,
          promoCode: purchaseData.promoCode,
          discount
        }
      };

      this.purchases.set(purchaseId, purchase);

      // Имитируем обработку платежа
      setTimeout(() => {
        this.processPurchase(purchaseId);
      }, 1000);

      this.emit('purchaseInitiated', purchase);
      logger.info(`Purchase initiated: ${purchaseId}`);

      analyticsService.trackEvent('purchase_initiated', {
        purchaseId,
        gameId,
        userId,
        amount: finalPrice,
        paymentMethod: purchaseData.paymentMethod
      });

      return purchase;
    } catch (error) {
      logger.error('Error purchasing game:', error);
      throw error;
    }
  }

  private async processPurchase(purchaseId: string): Promise<void> {
    try {
      const purchase = this.purchases.get(purchaseId);
      if (!purchase) return;

      // Имитируем успешную обработку платежа
      const success = Math.random() > 0.1; // 90% успешных платежей

      if (success) {
        purchase.status = 'completed';
        purchase.confirmedAt = new Date();
        purchase.deliveredAt = new Date();

        // Обновляем статистику игры
        const game = this.games.get(purchase.gameId);
        if (game) {
          game.stats.downloads++;
          game.stats.revenue += purchase.amount;
        }

        this.emit('purchaseCompleted', purchase);
        logger.info(`Purchase completed: ${purchaseId}`);

        analyticsService.trackEvent('purchase_completed', {
          purchaseId,
          gameId: purchase.gameId,
          userId: purchase.userId,
          amount: purchase.amount
        });
      } else {
        purchase.status = 'failed';
        
        this.emit('purchaseFailed', purchase);
        logger.warn(`Purchase failed: ${purchaseId}`);

        analyticsService.trackEvent('purchase_failed', {
          purchaseId,
          gameId: purchase.gameId,
          userId: purchase.userId
        });
      }
    } catch (error) {
      logger.error('Error processing purchase:', error);
    }
  }

  // Wishlist управление

  public async addToWishlist(userId: string, gameId: string): Promise<void> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      let wishlist = this.wishlists.get(userId);
      if (!wishlist) {
        wishlist = {
          id: this.generateWishlistId(),
          userId,
          gameIds: [],
          notifyOnSale: true,
          notifyOnRelease: true,
          notifyOnUpdate: false,
          collections: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.wishlists.set(userId, wishlist);
      }

      if (!wishlist.gameIds.includes(gameId)) {
        wishlist.gameIds.push(gameId);
        wishlist.updatedAt = new Date();

        // Обновляем статистику игры
        game.stats.wishlistCount++;

        this.emit('gameAddedToWishlist', { userId, gameId });
        logger.info(`Game ${gameId} added to wishlist for user ${userId}`);

        analyticsService.trackEvent('wishlist_added', {
          userId,
          gameId,
          gameTitle: game.title
        });
      }
    } catch (error) {
      logger.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  public async removeFromWishlist(userId: string, gameId: string): Promise<void> {
    try {
      const wishlist = this.wishlists.get(userId);
      if (!wishlist) return;

      const index = wishlist.gameIds.indexOf(gameId);
      if (index > -1) {
        wishlist.gameIds.splice(index, 1);
        wishlist.updatedAt = new Date();

        // Обновляем статистику игры
        const game = this.games.get(gameId);
        if (game) {
          game.stats.wishlistCount = Math.max(0, game.stats.wishlistCount - 1);
        }

        this.emit('gameRemovedFromWishlist', { userId, gameId });
        logger.info(`Game ${gameId} removed from wishlist for user ${userId}`);

        analyticsService.trackEvent('wishlist_removed', {
          userId,
          gameId
        });
      }
    } catch (error) {
      logger.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  // Промоакции и скидки

  public async createPromotion(promotionData: Partial<StorePromotion>): Promise<StorePromotion> {
    try {
      const promotionId = this.generatePromotionId();
      
      const promotion: StorePromotion = {
        id: promotionId,
        name: promotionData.name || '',
        description: promotionData.description || '',
        type: promotionData.type || 'sale',
        
        discountType: promotionData.discountType || 'percentage',
        discountValue: promotionData.discountValue || 0,
        minPurchaseAmount: promotionData.minPurchaseAmount,
        maxDiscountAmount: promotionData.maxDiscountAmount,
        
        gameIds: promotionData.gameIds || [],
        categories: promotionData.categories || [],
        developers: promotionData.developers || [],
        
        userGroups: promotionData.userGroups || [],
        maxUsage: promotionData.maxUsage,
        usageCount: 0,
        promoCode: promotionData.promoCode,
        
        startDate: promotionData.startDate || new Date(),
        endDate: promotionData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        
        bannerUrl: promotionData.bannerUrl,
        landingPageUrl: promotionData.landingPageUrl,
        featured: promotionData.featured || false,
        
        active: true,
        approved: false,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.promotions.set(promotionId, promotion);

      this.emit('promotionCreated', promotion);
      logger.info(`Promotion created: ${promotionId}`);

      return promotion;
    } catch (error) {
      logger.error('Error creating promotion:', error);
      throw error;
    }
  }

  private async applyPromoCode(promoCode: string, gameId: string, basePrice: number): Promise<{
    finalPrice: number;
    discount: number;
  }> {
    // Находим активную промоакцию с данным промокодом
    const promotion = Array.from(this.promotions.values()).find(promo =>
      promo.promoCode === promoCode &&
      promo.active &&
      promo.approved &&
      new Date() >= promo.startDate &&
      new Date() <= promo.endDate &&
      (!promo.maxUsage || promo.usageCount < promo.maxUsage)
    );

    if (!promotion) {
      throw new Error('Invalid or expired promo code');
    }

    // Проверяем, применима ли промоакция к этой игре
    const isApplicable = promotion.gameIds.includes(gameId) ||
      promotion.gameIds.length === 0; // Если gameIds пустой, применяется ко всем играм

    if (!isApplicable) {
      throw new Error('Promo code is not applicable to this game');
    }

    let discount = 0;
    let finalPrice = basePrice;

    switch (promotion.discountType) {
      case 'percentage':
        discount = basePrice * (promotion.discountValue / 100);
        if (promotion.maxDiscountAmount) {
          discount = Math.min(discount, promotion.maxDiscountAmount);
        }
        finalPrice = basePrice - discount;
        break;
        
      case 'fixed':
        discount = Math.min(promotion.discountValue, basePrice);
        finalPrice = basePrice - discount;
        break;
        
      case 'free':
        discount = basePrice;
        finalPrice = 0;
        break;
    }

    // Увеличиваем счетчик использований
    promotion.usageCount++;

    return { finalPrice: Math.max(0, finalPrice), discount };
  }

  // Коллекции и рекомендации

  public async createCollection(collectionData: Partial<StoreCollection>): Promise<StoreCollection> {
    try {
      const collectionId = this.generateCollectionId();
      
      const collection: StoreCollection = {
        id: collectionId,
        name: collectionData.name || '',
        description: collectionData.description || '',
        type: collectionData.type || 'custom',
        gameIds: collectionData.gameIds || [],
        imageUrl: collectionData.imageUrl,
        
        criteria: collectionData.criteria,
        
        sortBy: collectionData.sortBy || 'popularity',
        displayStyle: collectionData.displayStyle || 'grid',
        maxItems: collectionData.maxItems,
        
        startDate: collectionData.startDate,
        endDate: collectionData.endDate,
        
        visible: collectionData.visible !== false,
        featured: collectionData.featured || false,
        order: collectionData.order || 0,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Если есть критерии, автоматически заполняем gameIds
      if (collection.criteria) {
        collection.gameIds = this.applyCollectionCriteria(collection.criteria);
      }

      this.collections.set(collectionId, collection);

      this.emit('collectionCreated', collection);
      logger.info(`Collection created: ${collectionId}`);

      return collection;
    } catch (error) {
      logger.error('Error creating collection:', error);
      throw error;
    }
  }

  public async getRecommendations(userId: string, limit: number = 10): Promise<GameStoreItem[]> {
    try {
      // Простой алгоритм рекомендаций на основе:
      // 1. Wishlist пользователя
      // 2. Похожих игр по тегам
      // 3. Популярных игр в категориях, которые нравятся пользователю

      const userWishlist = this.wishlists.get(userId);
      const userPurchases = this.getUserPurchases(userId);

      // Анализируем предпочтения пользователя
      const userPreferences = this.analyzeUserPreferences(userWishlist, userPurchases);

      // Получаем игры, которые могут понравиться
      let candidates = Array.from(this.games.values())
        .filter(game => 
          game.moderation.status === 'approved' &&
          !userPurchases.some(p => p.gameId === game.id) &&
          (!userWishlist || !userWishlist.gameIds.includes(game.id))
        );

      // Ранжируем кандидатов
      candidates = candidates.map(game => ({
        ...game,
        score: this.calculateRecommendationScore(game, userPreferences)
      }))
      .sort((a, b) => (b as any).score - (a as any).score)
      .slice(0, limit);

      return candidates;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  // Аналитика магазина

  public async getStoreAnalytics(): Promise<StoreAnalytics> {
    try {
      const games = Array.from(this.games.values());
      const purchases = Array.from(this.purchases.values());

      const approvedGames = games.filter(g => g.moderation.status === 'approved');
      const developers = new Set(games.map(g => g.developer.id));

      const totalRevenue = purchases
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalDownloads = approvedGames.reduce((sum, g) => sum + g.stats.downloads, 0);

      // Топ игры
      const topByDownloads = approvedGames
        .sort((a, b) => b.stats.downloads - a.stats.downloads)
        .slice(0, 10)
        .map(g => ({ gameId: g.id, downloads: g.stats.downloads }));

      const topByRevenue = approvedGames
        .sort((a, b) => b.stats.revenue - a.stats.revenue)
        .slice(0, 10)
        .map(g => ({ gameId: g.id, revenue: g.stats.revenue }));

      const topByRating = approvedGames
        .filter(g => g.stats.reviewCount > 0)
        .sort((a, b) => b.stats.averageRating - a.stats.averageRating)
        .slice(0, 10)
        .map(g => ({ gameId: g.id, rating: g.stats.averageRating }));

      // Статистика по категориям
      const categoryStats = this.calculateCategoryStats(approvedGames);

      // Пользовательское поведение
      const userBehavior = this.calculateUserBehavior(purchases);

      return {
        totalGames: approvedGames.length,
        totalDevelopers: developers.size,
        totalRevenue,
        totalDownloads,
        topByDownloads,
        topByRevenue,
        topByRating,
        categoryStats,
        trends: {
          newGames: games.filter(g => 
            g.metadata.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          growingGames: [], // Упрощено для демо
          decliningGames: []
        },
        userBehavior
      };
    } catch (error) {
      logger.error('Error getting store analytics:', error);
      throw error;
    }
  }

  // Вспомогательные методы

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePurchaseId(): string {
    return `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWishlistId(): string {
    return `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePromotionId(): string {
    return `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCollectionId(): string {
    return `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private updateSearchIndex(game: GameStoreItem): void {
    const searchTerms = [
      game.title,
      game.description,
      game.developer.name,
      ...game.tags
    ].join(' ').toLowerCase().split(/\s+/);

    searchTerms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, []);
      }
      if (!this.searchIndex.get(term)!.includes(game.id)) {
        this.searchIndex.get(term)!.push(game.id);
      }
    });
  }

  private sortGames(
    games: GameStoreItem[], 
    sortBy: string, 
    order: 'asc' | 'desc'
  ): GameStoreItem[] {
    const multiplier = order === 'desc' ? -1 : 1;

    return games.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.stats.downloads - a.stats.downloads) * multiplier;
        case 'rating':
          return (b.stats.averageRating - a.stats.averageRating) * multiplier;
        case 'price':
          const priceA = a.pricing.salePrice || a.pricing.basePrice;
          const priceB = b.pricing.salePrice || b.pricing.basePrice;
          return (priceB - priceA) * multiplier;
        case 'date':
          return (b.metadata.publishedAt?.getTime() || 0 - a.metadata.publishedAt?.getTime() || 0) * multiplier;
        default:
          return 0;
      }
    });
  }

  private generateFacets(games: GameStoreItem[]): any {
    const categories = new Map<string, number>();
    const priceRanges = new Map<string, number>();
    const ratings = new Map<number, number>();
    const tags = new Map<string, number>();

    games.forEach(game => {
      if (game.moderation.status !== 'approved') return;

      // Категории
      categories.set(game.category, (categories.get(game.category) || 0) + 1);

      // Ценовые диапазоны
      const price = game.pricing.salePrice || game.pricing.basePrice;
      let priceRange = 'free';
      if (price > 0 && price <= 5) priceRange = '$0-5';
      else if (price <= 15) priceRange = '$5-15';
      else if (price <= 30) priceRange = '$15-30';
      else if (price > 30) priceRange = '$30+';
      
      priceRanges.set(priceRange, (priceRanges.get(priceRange) || 0) + 1);

      // Рейтинги
      const rating = Math.floor(game.stats.averageRating);
      if (rating > 0) {
        ratings.set(rating, (ratings.get(rating) || 0) + 1);
      }

      // Теги
      game.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });

    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      priceRanges: Array.from(priceRanges.entries()).map(([range, count]) => ({ range, count })),
      ratings: Array.from(ratings.entries()).map(([rating, count]) => ({ rating, count })),
      tags: Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }))
    };
  }

  private async updateGameRatingStats(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    const reviews = this.reviews.get(gameId) || [];

    if (!game || reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    game.stats.averageRating = totalRating / reviews.length;
    game.stats.reviewCount = reviews.length;
    game.metadata.updatedAt = new Date();
  }

  private async hasUserPurchasedGame(userId: string, gameId: string): Promise<boolean> {
    return Array.from(this.purchases.values()).some(
      purchase => 
        purchase.userId === userId && 
        purchase.gameId === gameId && 
        purchase.status === 'completed'
    );
  }

  private async findExistingPurchase(userId: string, gameId: string): Promise<Purchase | null> {
    return Array.from(this.purchases.values()).find(
      purchase => 
        purchase.userId === userId && 
        purchase.gameId === gameId && 
        (purchase.status === 'completed' || purchase.status === 'pending')
    ) || null;
  }

  private getUserPurchases(userId: string): Purchase[] {
    return Array.from(this.purchases.values()).filter(
      purchase => purchase.userId === userId && purchase.status === 'completed'
    );
  }

  private applyCollectionCriteria(criteria: StoreCollection['criteria']): string[] {
    let games = Array.from(this.games.values())
      .filter(game => game.moderation.status === 'approved');

    if (criteria?.category) {
      games = games.filter(game => game.category === criteria.category);
    }

    if (criteria?.minRating) {
      games = games.filter(game => game.stats.averageRating >= criteria.minRating!);
    }

    if (criteria?.maxPrice !== undefined) {
      games = games.filter(game => {
        const price = game.pricing.salePrice || game.pricing.basePrice;
        return price <= criteria.maxPrice!;
      });
    }

    if (criteria?.tags && criteria.tags.length > 0) {
      games = games.filter(game =>
        criteria.tags!.some(tag => game.tags.includes(tag))
      );
    }

    if (criteria?.developerId) {
      games = games.filter(game => game.developer.id === criteria.developerId);
    }

    return games.map(game => game.id);
  }

  private analyzeUserPreferences(
    wishlist?: Wishlist, 
    purchases?: Purchase[]
  ): { categories: string[]; tags: string[]; priceRange: { min: number; max: number } } {
    const categories = new Set<string>();
    const tags = new Set<string>();
    let totalSpent = 0;
    let purchaseCount = 0;

    // Анализируем покупки
    purchases?.forEach(purchase => {
      if (purchase.status === 'completed') {
        const game = this.games.get(purchase.gameId);
        if (game) {
          categories.add(game.category);
          game.tags.forEach(tag => tags.add(tag));
          totalSpent += purchase.amount;
          purchaseCount++;
        }
      }
    });

    // Анализируем wishlist
    wishlist?.gameIds.forEach(gameId => {
      const game = this.games.get(gameId);
      if (game) {
        categories.add(game.category);
        game.tags.forEach(tag => tags.add(tag));
      }
    });

    const averageSpending = purchaseCount > 0 ? totalSpent / purchaseCount : 0;

    return {
      categories: Array.from(categories),
      tags: Array.from(tags),
      priceRange: {
        min: 0,
        max: Math.max(30, averageSpending * 1.5) // Готов потратить на 50% больше обычного
      }
    };
  }

  private calculateRecommendationScore(
    game: GameStoreItem, 
    preferences: ReturnType<typeof this.analyzeUserPreferences>
  ): number {
    let score = 0;

    // Совпадение категории
    if (preferences.categories.includes(game.category)) {
      score += 30;
    }

    // Совпадение тегов
    const tagMatches = game.tags.filter(tag => preferences.tags.includes(tag)).length;
    score += tagMatches * 10;

    // Ценовой диапазон
    const price = game.pricing.salePrice || game.pricing.basePrice;
    if (price <= preferences.priceRange.max) {
      score += 15;
    }

    // Рейтинг игры
    score += game.stats.averageRating * 5;

    // Популярность
    score += Math.log(game.stats.downloads + 1) * 2;

    // Новизна
    if (game.seo.newRelease) {
      score += 10;
    }

    return score;
  }

  private calculateCategoryStats(games: GameStoreItem[]): StoreAnalytics['categoryStats'] {
    const stats = new Map<string, { games: GameStoreItem[]; totalRevenue: number }>();

    games.forEach(game => {
      if (!stats.has(game.category)) {
        stats.set(game.category, { games: [], totalRevenue: 0 });
      }
      
      const categoryData = stats.get(game.category)!;
      categoryData.games.push(game);
      categoryData.totalRevenue += game.stats.revenue;
    });

    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      gameCount: data.games.length,
      averagePrice: data.games.reduce((sum, g) => sum + (g.pricing.salePrice || g.pricing.basePrice), 0) / data.games.length,
      totalRevenue: data.totalRevenue
    }));
  }

  private calculateUserBehavior(purchases: Purchase[]): StoreAnalytics['userBehavior'] {
    const completedPurchases = purchases.filter(p => p.status === 'completed');
    const totalPurchases = purchases.length;

    // Упрощенные расчеты для демонстрации
    return {
      averageSessionTime: 15 * 60, // 15 минут
      conversionRate: totalPurchases > 0 ? (completedPurchases.length / totalPurchases) * 100 : 0,
      cartAbandonmentRate: totalPurchases > 0 ? ((totalPurchases - completedPurchases.length) / totalPurchases) * 100 : 0,
      repeatPurchaseRate: 25 // 25% пользователей совершают повторные покупки
    };
  }

  private initializeStore(): void {
    // Создаем демо-игры для тестирования
    this.createDemoGames();
    logger.info('Game store service initialized');
  }

  private createDemoGames(): void {
    const demoGames = [
      {
        title: 'Космические приключения',
        description: 'Захватывающая аркадная игра в космической тематике',
        shortDescription: 'Исследуйте галактику и сражайтесь с пришельцами',
        category: 'arcade' as const,
        tags: ['космос', 'аркада', 'шутер'],
        pricing: { type: 'paid' as const, basePrice: 9.99, currency: 'USD', inAppPurchases: false }
      },
      {
        title: 'Загадки древности',
        description: 'Логическая головоломка с элементами приключений',
        shortDescription: 'Разгадайте тайны древних цивилизаций',
        category: 'puzzle' as const,
        tags: ['головоломка', 'приключения', 'история'],
        pricing: { type: 'freemium' as const, basePrice: 0, currency: 'USD', inAppPurchases: true }
      }
    ];

    demoGames.forEach(gameData => {
      this.submitGame(gameData, 'demo_developer').then(game => {
        this.moderateGame(game.id, 'approve', 'system');
      });
    });
  }

  private startPeriodicTasks(): void {
    // Периодические задачи каждые 10 минут
    setInterval(() => {
      this.updatePromotions();
      this.updateCollections();
      this.cleanupExpiredData();
    }, 10 * 60 * 1000);
  }

  private updatePromotions(): void {
    const now = new Date();
    
    this.promotions.forEach(promotion => {
      if (promotion.active && now > promotion.endDate) {
        promotion.active = false;
        this.emit('promotionExpired', promotion);
      }
    });
  }

  private updateCollections(): void {
    this.collections.forEach(collection => {
      if (collection.criteria) {
        const newGameIds = this.applyCollectionCriteria(collection.criteria);
        if (JSON.stringify(newGameIds) !== JSON.stringify(collection.gameIds)) {
          collection.gameIds = newGameIds;
          collection.updatedAt = new Date();
        }
      }
    });
  }

  private cleanupExpiredData(): void {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Удаляем старые неуспешные покупки
    this.purchases.forEach((purchase, id) => {
      if (purchase.status === 'failed' && purchase.purchasedAt < monthAgo) {
        this.purchases.delete(id);
      }
    });
  }

  // Публичные методы доступа

  public getGame(gameId: string): GameStoreItem | null {
    return this.games.get(gameId) || null;
  }

  public getGameReviews(gameId: string): GameReview[] {
    return this.reviews.get(gameId) || [];
  }

  public getCollection(collectionId: string): StoreCollection | null {
    return this.collections.get(collectionId) || null;
  }

  public getPurchase(purchaseId: string): Purchase | null {
    return this.purchases.get(purchaseId) || null;
  }

  public getUserWishlist(userId: string): Wishlist | null {
    return this.wishlists.get(userId) || null;
  }

  public getPromotion(promotionId: string): StorePromotion | null {
    return this.promotions.get(promotionId) || null;
  }

  public getStats(): {
    totalGames: number;
    totalPurchases: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  } {
    const games = Array.from(this.games.values());
    const purchases = Array.from(this.purchases.values());
    const completedPurchases = purchases.filter(p => p.status === 'completed');
    
    let totalReviews = 0;
    let totalRatingSum = 0;
    
    this.reviews.forEach(gameReviews => {
      totalReviews += gameReviews.length;
      totalRatingSum += gameReviews.reduce((sum, review) => sum + review.rating, 0);
    });

    return {
      totalGames: games.filter(g => g.moderation.status === 'approved').length,
      totalPurchases: completedPurchases.length,
      totalRevenue: completedPurchases.reduce((sum, p) => sum + p.amount, 0),
      averageRating: totalReviews > 0 ? totalRatingSum / totalReviews : 0,
      totalReviews
    };
  }
}

export const gameStoreService = new GameStoreService();
export { GameStoreService }; 