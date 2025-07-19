import { Router } from 'express';
import { monetizationService } from '../services/monetization';
import { logger } from '../services/logger';

const router = Router();

// Получение планов оплаты для пользователя (с A/B тестированием цен)
router.get('/plans', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const plans = monetizationService.getPaymentPlans();
    
    // Применяем A/B тестирование к ценам
    const plansWithPricing = plans.map(plan => {
      const priceInfo = monetizationService.getPriceForUser(userId, plan.id);
      return {
        ...plan,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discount: priceInfo.discount,
        abVariant: priceInfo.variant
      };
    });

    res.json({
      success: true,
      data: plansWithPricing
    });
  } catch (error) {
    logger.error('Error getting payment plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment plans'
    });
  }
});

// Получение конкретного плана
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const plan = monetizationService.getPaymentPlan(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    const priceInfo = monetizationService.getPriceForUser(userId, planId);
    
    res.json({
      success: true,
      data: {
        ...plan,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discount: priceInfo.discount,
        abVariant: priceInfo.variant
      }
    });
  } catch (error) {
    logger.error('Error getting payment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment plan'
    });
  }
});

// Создание покупки
router.post('/purchase', async (req, res) => {
  try {
    const { planId, paymentMethod = 'yandex_money' } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    const purchase = await monetizationService.createPurchase(userId, planId, paymentMethod);
    
    // В реальном приложении здесь была бы интеграция с платежной системой
    // Симулируем обработку платежа
    setTimeout(async () => {
      const success = Math.random() > 0.1; // 90% успешных платежей
      if (success) {
        await monetizationService.completePurchase(purchase.id);
        logger.info(`Purchase ${purchase.id} completed successfully`);
      } else {
        logger.warn(`Purchase ${purchase.id} failed`);
      }
    }, 2000);

    res.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        // В реальном приложении здесь был бы URL для редиректа на платежную форму
        paymentUrl: `/payment/${purchase.id}`
      }
    });
  } catch (error) {
    logger.error('Error creating purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create purchase'
    });
  }
});

// Получение истории покупок пользователя
router.get('/purchases', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const purchases = monetizationService.getUserPurchases(userId);
    
    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    logger.error('Error getting user purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user purchases'
    });
  }
});

// Получение метрик пользователя
router.get('/user-metrics', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const metrics = monetizationService.getUserMetrics(userId);
    
    res.json({
      success: true,
      data: metrics || {
        userId,
        totalSpent: 0,
        purchaseCount: 0,
        averageOrderValue: 0,
        conversionFunnelStage: 'visitor',
        ltv: 0,
        churnRisk: 0
      }
    });
  } catch (error) {
    logger.error('Error getting user metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user metrics'
    });
  }
});

// Получение баннеров для пользователя
router.get('/banners', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { gameType, userLevel, country } = req.query;
    
    const context = {
      gameType: gameType as string,
      userLevel: userLevel ? parseInt(userLevel as string) : undefined,
      country: country as string,
      timeOfDay: new Date().getHours() < 12 ? 'morning' : 
                 new Date().getHours() < 18 ? 'afternoon' : 'evening'
    };
    
    const banners = monetizationService.getBannersForUser(userId, context);
    
    res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    logger.error('Error getting banners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get banners'
    });
  }
});

// Отслеживание показа баннера
router.post('/banners/:bannerId/impression', async (req, res) => {
  try {
    const { bannerId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    monetizationService.trackBannerImpression(bannerId, userId);
    
    res.json({
      success: true,
      message: 'Banner impression tracked'
    });
  } catch (error) {
    logger.error('Error tracking banner impression:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track banner impression'
    });
  }
});

// Отслеживание клика по баннеру
router.post('/banners/:bannerId/click', async (req, res) => {
  try {
    const { bannerId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    monetizationService.trackBannerClick(bannerId, userId);
    
    res.json({
      success: true,
      message: 'Banner click tracked'
    });
  } catch (error) {
    logger.error('Error tracking banner click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track banner click'
    });
  }
});

// Отслеживание конверсии с баннера
router.post('/banners/:bannerId/conversion', async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { revenue = 0 } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    monetizationService.trackBannerConversion(bannerId, userId, revenue);
    
    res.json({
      success: true,
      message: 'Banner conversion tracked'
    });
  } catch (error) {
    logger.error('Error tracking banner conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track banner conversion'
    });
  }
});

// Получение статистики монетизации (для админов)
router.get('/stats', async (req, res) => {
  try {
    // В реальном приложении здесь была бы проверка прав доступа
    const stats = monetizationService.getMonetizationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting monetization stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monetization stats'
    });
  }
});

// Симуляция завершения платежа (webhook)
router.post('/payment/:purchaseId/complete', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { status = 'completed' } = req.body;
    
    if (status === 'completed') {
      const success = await monetizationService.completePurchase(purchaseId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Purchase completed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Purchase not found'
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Purchase status updated'
      });
    }
  } catch (error) {
    logger.error('Error completing purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete purchase'
    });
  }
});

// Интеграция с Yandex Games SDK - получение информации о платежах
router.post('/yandex/payment-info', async (req, res) => {
  try {
    const { productId, purchaseToken } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    // Здесь должна быть интеграция с Yandex Games API
    // Пока возвращаем мок данные
    res.json({
      success: true,
      data: {
        productId,
        purchaseToken,
        userId,
        verified: true,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error processing Yandex payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment info'
    });
  }
});

// Yandex Games реклама - награда за просмотр
router.post('/yandex/rewarded-ad', async (req, res) => {
  try {
    const { adId, rewardType = 'free_generation' } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    // Отслеживаем конверсию баннера
    if (adId) {
      monetizationService.trackBannerConversion('rewarded_free_generation', userId, 0);
    }
    
    // В реальном приложении здесь была бы выдача награды
    res.json({
      success: true,
      data: {
        reward: rewardType,
        granted: true,
        userId
      }
    });
  } catch (error) {
    logger.error('Error processing rewarded ad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process rewarded ad'
    });
  }
});

export default router; 