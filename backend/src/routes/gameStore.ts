import { Router, Request, Response } from 'express';
import { gameStoreService } from '../services/gameStore';
import { logger } from '../services/logger';
import { analyticsService } from '../services/analytics';

const router = Router();

// POST /api/game-store/submit - отправка игры в магазин
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { gameData, developerId } = req.body;

    if (!gameData || !developerId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются данные игры и ID разработчика'
      });
    }

    const game = await gameStoreService.submitGame(gameData, developerId);
    
    await analyticsService.trackEvent('game_submitted', {
      gameId: game.id,
      developerId,
      category: game.category,
      pricing: game.pricing.type
    });

    logger.info(`Game submitted to store: ${game.id} by developer ${developerId}`);
    
    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    logger.error('Error submitting game to store:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при отправке игры в магазин'
    });
  }
});

// POST /api/game-store/moderate/:gameId - модерация игры
router.post('/moderate/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { decision, moderatorId, notes } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Решение должно быть approve или reject'
      });
    }

    const game = await gameStoreService.moderateGame(gameId, decision, moderatorId, notes);
    
    await analyticsService.trackEvent('game_moderated', {
      gameId,
      decision,
      moderatorId,
      notes: notes || ''
    });

    logger.info(`Game moderated: ${gameId} - ${decision} by ${moderatorId}`);
    
    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    logger.error('Error moderating game:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при модерации игры'
    });
  }
});

// GET /api/game-store/search - поиск игр
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      query,
      category,
      priceMin,
      priceMax,
      pricingType,
      platform,
      rating,
      sortBy,
      sortOrder,
      page,
      limit
    } = req.query;

    const searchParams = {
      query: query as string,
      filters: {
        category: category as string,
        priceMin: priceMin ? parseFloat(priceMin as string) : undefined,
        priceMax: priceMax ? parseFloat(priceMax as string) : undefined,
        pricingType: pricingType as string,
        platform: platform as string,
        rating: rating ? parseFloat(rating as string) : undefined
      },
      sort: {
        by: (sortBy as string) || 'rating',
        order: (sortOrder as string) || 'desc'
      },
      pagination: {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      }
    };

    const result = await gameStoreService.searchGames(searchParams);
    
    await analyticsService.trackEvent('store_search', {
      query: query || '',
      category: category || '',
      resultsCount: result.games.length,
      totalResults: result.total
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error searching games:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при поиске игр'
    });
  }
});

// GET /api/game-store/games/:gameId - получение игры
router.get('/games/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = gameStoreService.getGame(gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Игра не найдена'
      });
    }

    await analyticsService.trackEvent('game_viewed', {
      gameId,
      category: game.category,
      pricing: game.pricing.type
    });

    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    logger.error('Error getting game:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении игры'
    });
  }
});

// POST /api/game-store/reviews - добавление отзыва
router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const reviewData = req.body;

    if (!reviewData.gameId || !reviewData.userId || !reviewData.rating || !reviewData.content) {
      return res.status(400).json({
        success: false,
        error: 'Требуются gameId, userId, rating и content'
      });
    }

    const review = await gameStoreService.addReview(reviewData);
    
    await analyticsService.trackEvent('review_added', {
      gameId: reviewData.gameId,
      userId: reviewData.userId,
      rating: reviewData.rating
    });

    logger.info(`Review added: ${review.id} for game ${reviewData.gameId}`);
    
    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении отзыва'
    });
  }
});

// GET /api/game-store/reviews/:gameId - получение отзывов игры
router.get('/reviews/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const reviews = gameStoreService.getGameReviews(gameId);

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    logger.error('Error getting reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении отзывов'
    });
  }
});

// POST /api/game-store/reviews/:reviewId/vote - голосование за отзыв
router.post('/reviews/:reviewId/vote', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { userId, helpful } = req.body;

    if (!userId || typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Требуются userId и helpful (boolean)'
      });
    }

    await gameStoreService.voteOnReview(reviewId, userId, helpful);
    
    await analyticsService.trackEvent('review_voted', {
      reviewId,
      userId,
      helpful
    });

    res.json({
      success: true,
      message: 'Голос учтен'
    });
  } catch (error) {
    logger.error('Error voting on review:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при голосовании за отзыв'
    });
  }
});

// POST /api/game-store/purchase - покупка игры
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const purchaseData = req.body;

    if (!purchaseData.gameId || !purchaseData.userId || !purchaseData.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Требуются gameId, userId и paymentMethod'
      });
    }

    const purchase = await gameStoreService.purchaseGame(purchaseData);
    
    await analyticsService.trackEvent('game_purchased', {
      gameId: purchaseData.gameId,
      userId: purchaseData.userId,
      amount: purchase.amount,
      paymentMethod: purchaseData.paymentMethod,
      promoCode: purchaseData.promoCode || null
    });

    logger.info(`Game purchased: ${purchaseData.gameId} by user ${purchaseData.userId}`);
    
    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    logger.error('Error purchasing game:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при покупке игры'
    });
  }
});

// GET /api/game-store/purchase/:purchaseId - получение информации о покупке
router.get('/purchase/:purchaseId', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;
    const purchase = gameStoreService.getPurchase(purchaseId);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Покупка не найдена'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    logger.error('Error getting purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении покупки'
    });
  }
});

// POST /api/game-store/wishlist - добавление в wishlist
router.post('/wishlist', async (req: Request, res: Response) => {
  try {
    const { userId, gameId } = req.body;

    if (!userId || !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются userId и gameId'
      });
    }

    await gameStoreService.addToWishlist(userId, gameId);
    
    await analyticsService.trackEvent('wishlist_added', {
      userId,
      gameId
    });

    res.json({
      success: true,
      message: 'Игра добавлена в список желаний'
    });
  } catch (error) {
    logger.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении в список желаний'
    });
  }
});

// DELETE /api/game-store/wishlist - удаление из wishlist
router.delete('/wishlist', async (req: Request, res: Response) => {
  try {
    const { userId, gameId } = req.body;

    if (!userId || !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются userId и gameId'
      });
    }

    await gameStoreService.removeFromWishlist(userId, gameId);
    
    await analyticsService.trackEvent('wishlist_removed', {
      userId,
      gameId
    });

    res.json({
      success: true,
      message: 'Игра удалена из списка желаний'
    });
  } catch (error) {
    logger.error('Error removing from wishlist:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении из списка желаний'
    });
  }
});

// GET /api/game-store/wishlist/:userId - получение wishlist пользователя
router.get('/wishlist/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const wishlist = gameStoreService.getUserWishlist(userId);

    res.json({
      success: true,
      data: wishlist || { userId, games: [], createdAt: new Date(), updatedAt: new Date() }
    });
  } catch (error) {
    logger.error('Error getting wishlist:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка желаний'
    });
  }
});

// POST /api/game-store/promotions - создание промо-акции
router.post('/promotions', async (req: Request, res: Response) => {
  try {
    const promotionData = req.body;

    if (!promotionData.title || !promotionData.type) {
      return res.status(400).json({
        success: false,
        error: 'Требуются title и type'
      });
    }

    const promotion = await gameStoreService.createPromotion(promotionData);
    
    await analyticsService.trackEvent('promotion_created', {
      promotionId: promotion.id,
      type: promotion.type,
      discount: promotion.discount
    });

    logger.info(`Promotion created: ${promotion.id}`);
    
    res.json({
      success: true,
      data: promotion
    });
  } catch (error) {
    logger.error('Error creating promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании промо-акции'
    });
  }
});

// GET /api/game-store/promotions/:promotionId - получение промо-акции
router.get('/promotions/:promotionId', async (req: Request, res: Response) => {
  try {
    const { promotionId } = req.params;
    const promotion = gameStoreService.getPromotion(promotionId);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Промо-акция не найдена'
      });
    }

    res.json({
      success: true,
      data: promotion
    });
  } catch (error) {
    logger.error('Error getting promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении промо-акции'
    });
  }
});

// POST /api/game-store/collections - создание коллекции
router.post('/collections', async (req: Request, res: Response) => {
  try {
    const collectionData = req.body;

    if (!collectionData.title || !collectionData.games) {
      return res.status(400).json({
        success: false,
        error: 'Требуются title и games'
      });
    }

    const collection = await gameStoreService.createCollection(collectionData);
    
    await analyticsService.trackEvent('collection_created', {
      collectionId: collection.id,
      gamesCount: collection.games.length,
      category: collection.category
    });

    logger.info(`Collection created: ${collection.id}`);
    
    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    logger.error('Error creating collection:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании коллекции'
    });
  }
});

// GET /api/game-store/collections/:collectionId - получение коллекции
router.get('/collections/:collectionId', async (req: Request, res: Response) => {
  try {
    const { collectionId } = req.params;
    const collection = gameStoreService.getCollection(collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Коллекция не найдена'
      });
    }

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    logger.error('Error getting collection:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении коллекции'
    });
  }
});

// GET /api/game-store/recommendations/:userId - получение рекомендаций
router.get('/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const recommendations = await gameStoreService.getRecommendations(
      userId,
      limit ? parseInt(limit as string) : 10
    );
    
    await analyticsService.trackEvent('recommendations_viewed', {
      userId,
      count: recommendations.length
    });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении рекомендаций'
    });
  }
});

// GET /api/game-store/analytics - получение аналитики магазина
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await gameStoreService.getStoreAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting store analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении аналитики магазина'
    });
  }
});

// GET /api/game-store/stats - получение статистики сервиса
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = gameStoreService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting store stats:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении статистики'
    });
  }
});

export default router; 