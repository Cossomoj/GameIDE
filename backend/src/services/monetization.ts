import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  features: string[];
  duration?: number; // в днях, если не указано - одноразовая покупка
  popular?: boolean;
  discount?: number; // процент скидки
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetAudience?: {
    countries?: string[];
    platforms?: string[];
    newUsers?: boolean;
    returning?: boolean;
  };
  metrics: {
    conversionRate: number;
    revenue: number;
    participantCount: number;
  };
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // процент трафика (0-100)
  priceModifier: number; // множитель цены (0.5 = -50%, 1.5 = +50%)
  features?: {
    showDiscount?: boolean;
    urgencyTimer?: boolean;
    socialProof?: boolean;
    customMessage?: string;
  };
}

export interface BannerConfig {
  id: string;
  type: 'sticky' | 'fullscreen' | 'rewarded' | 'interstitial';
  placement: 'top' | 'bottom' | 'overlay' | 'between_levels';
  isActive: boolean;
  priority: number;
  frequency: {
    maxPerSession: number;
    minInterval: number; // секунды между показами
    maxPerDay: number;
  };
  targeting: {
    gameTypes?: string[];
    userLevels?: number[];
    timeOfDay?: string[];
    countries?: string[];
  };
  content: {
    title?: string;
    description?: string;
    imageUrl?: string;
    callToAction?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

export interface PurchaseData {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  abTestId?: string;
  abVariantId?: string;
  paymentMethod: 'yandex_money' | 'card' | 'mobile' | 'other';
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface UserMetrics {
  userId: string;
  totalSpent: number;
  purchaseCount: number;
  averageOrderValue: number;
  lastPurchase?: Date;
  preferredPaymentMethod?: string;
  conversionFunnelStage: 'visitor' | 'trial' | 'paying' | 'churned';
  ltv: number; // Lifetime Value
  churnRisk: number; // 0-1, вероятность оттока
}

class MonetizationService {
  private paymentPlans: Map<string, PaymentPlan> = new Map();
  private abTests: Map<string, ABTestConfig> = new Map();
  private banners: Map<string, BannerConfig> = new Map();
  private purchases: Map<string, PurchaseData> = new Map();
  private userMetrics: Map<string, UserMetrics> = new Map();
  private userABAssignments: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.initializeDefaultPlans();
    this.initializeDefaultBanners();
    this.initializeDefaultABTests();
  }

  // Инициализация планов по умолчанию
  private initializeDefaultPlans(): void {
    const defaultPlans: PaymentPlan[] = [
      {
        id: 'premium_month',
        name: 'Premium Monthly',
        description: 'Unlimited games, advanced AI, priority support',
        basePrice: 299,
        currency: 'RUB',
        duration: 30,
        features: [
          'Unlimited game generation',
          'Advanced AI models',
          'Priority support',
          'Custom game templates',
          'Export to multiple formats'
        ]
      },
      {
        id: 'premium_year',
        name: 'Premium Yearly',
        description: 'Best value! All premium features for a year',
        basePrice: 2990,
        currency: 'RUB',
        duration: 365,
        discount: 17,
        popular: true,
        features: [
          'Everything in Monthly',
          '2 months free',
          'Exclusive templates',
          'Beta features access',
          'Personal AI assistant'
        ]
      },
      {
        id: 'pro_game_pack',
        name: 'Pro Game Pack',
        description: '10 professional game generations',
        basePrice: 99,
        currency: 'RUB',
        features: [
          '10 game generations',
          'Commercial license',
          'High-quality assets',
          'Advanced customization'
        ]
      }
    ];

    defaultPlans.forEach(plan => {
      this.paymentPlans.set(plan.id, plan);
    });
  }

  // Инициализация баннеров по умолчанию
  private initializeDefaultBanners(): void {
    const defaultBanners: BannerConfig[] = [
      {
        id: 'sticky_premium_offer',
        type: 'sticky',
        placement: 'bottom',
        isActive: true,
        priority: 1,
        frequency: {
          maxPerSession: 1,
          minInterval: 300,
          maxPerDay: 3
        },
        targeting: {
          gameTypes: ['all'],
          userLevels: [1, 2, 3]
        },
        content: {
          title: '🚀 Upgrade to Premium!',
          description: 'Unlimited games, advanced AI, and more!',
          callToAction: 'Start Free Trial',
          backgroundColor: '#2563eb',
          textColor: '#ffffff'
        },
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        }
      },
      {
        id: 'rewarded_free_generation',
        type: 'rewarded',
        placement: 'overlay',
        isActive: true,
        priority: 2,
        frequency: {
          maxPerSession: 3,
          minInterval: 600,
          maxPerDay: 10
        },
        targeting: {
          gameTypes: ['all']
        },
        content: {
          title: '🎁 Get Free Generation!',
          description: 'Watch a short ad to unlock one free game generation',
          callToAction: 'Watch Ad',
          backgroundColor: '#10b981',
          textColor: '#ffffff'
        },
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        }
      }
    ];

    defaultBanners.forEach(banner => {
      this.banners.set(banner.id, banner);
    });
  }

  // Инициализация A/B тестов по умолчанию
  private initializeDefaultABTests(): void {
    const defaultABTests: ABTestConfig[] = [
      {
        id: 'pricing_test_2024',
        name: 'Premium Pricing Test',
        description: 'Testing different price points for premium subscription',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        variants: [
          {
            id: 'control',
            name: 'Original Price',
            weight: 40,
            priceModifier: 1.0
          },
          {
            id: 'discount_20',
            name: '20% Discount',
            weight: 30,
            priceModifier: 0.8,
            features: {
              showDiscount: true,
              urgencyTimer: true,
              customMessage: 'Limited Time: 20% OFF!'
            }
          },
          {
            id: 'premium_15',
            name: '15% Price Increase',
            weight: 30,
            priceModifier: 1.15,
            features: {
              socialProof: true,
              customMessage: 'Join 10,000+ game creators!'
            }
          }
        ],
        targetAudience: {
          newUsers: true
        },
        metrics: {
          conversionRate: 0,
          revenue: 0,
          participantCount: 0
        }
      }
    ];

    defaultABTests.forEach(test => {
      this.abTests.set(test.id, test);
    });
  }

  // Получение пользователя для A/B тестирования
  assignUserToABTest(userId: string, testId: string): string | null {
    const test = this.abTests.get(testId);
    if (!test || !test.isActive) {
      return null;
    }

    // Проверяем, не назначен ли уже пользователь
    if (!this.userABAssignments.has(userId)) {
      this.userABAssignments.set(userId, new Map());
    }

    const userAssignments = this.userABAssignments.get(userId)!;
    if (userAssignments.has(testId)) {
      return userAssignments.get(testId)!;
    }

    // Хеш-функция для консистентного назначения
    const hash = this.hashUserId(userId + testId);
    let cumulative = 0;
    
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (hash <= cumulative) {
        userAssignments.set(testId, variant.id);
        test.metrics.participantCount++;
        logger.info(`User ${userId} assigned to variant ${variant.id} in test ${testId}`);
        return variant.id;
      }
    }

    // Fallback к контрольной группе
    const controlVariant = test.variants[0];
    userAssignments.set(testId, controlVariant.id);
    return controlVariant.id;
  }

  // Простая хеш-функция для консистентного назначения
  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }

  // Получение цены с учетом A/B тестирования
  getPriceForUser(userId: string, planId: string): { price: number; originalPrice: number; variant?: string; discount?: number } {
    const plan = this.paymentPlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const originalPrice = plan.basePrice;
    let price = originalPrice;
    let variant: string | undefined;
    let discount: number | undefined;

    // Ищем активные A/B тесты
    for (const [testId, test] of this.abTests) {
      if (test.isActive) {
        const userVariant = this.assignUserToABTest(userId, testId);
        if (userVariant) {
          const variantConfig = test.variants.find(v => v.id === userVariant);
          if (variantConfig) {
            price = Math.round(originalPrice * variantConfig.priceModifier);
            variant = userVariant;
            
            if (variantConfig.priceModifier < 1) {
              discount = Math.round((1 - variantConfig.priceModifier) * 100);
            }
            break; // Используем первый подходящий тест
          }
        }
      }
    }

    return { price, originalPrice, variant, discount };
  }

  // Создание покупки
  async createPurchase(userId: string, planId: string, paymentMethod: string): Promise<PurchaseData> {
    const priceInfo = this.getPriceForUser(userId, planId);
    const plan = this.paymentPlans.get(planId)!;

    const purchase: PurchaseData = {
      id: uuidv4(),
      userId,
      planId,
      amount: priceInfo.price,
      currency: plan.currency,
      status: 'pending',
      paymentMethod: paymentMethod as any,
      createdAt: new Date(),
      abTestId: priceInfo.variant ? 'pricing_test_2024' : undefined,
      abVariantId: priceInfo.variant,
      metadata: {
        originalPrice: priceInfo.originalPrice,
        discount: priceInfo.discount
      }
    };

    this.purchases.set(purchase.id, purchase);
    logger.info(`Purchase created: ${purchase.id} for user ${userId}`);
    
    return purchase;
  }

  // Завершение покупки
  async completePurchase(purchaseId: string): Promise<boolean> {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) {
      return false;
    }

    purchase.status = 'completed';
    purchase.completedAt = new Date();

    // Обновляем метрики пользователя
    this.updateUserMetrics(purchase);

    // Обновляем метрики A/B теста
    if (purchase.abTestId && purchase.abVariantId) {
      const test = this.abTests.get(purchase.abTestId);
      if (test) {
        test.metrics.revenue += purchase.amount;
        test.metrics.conversionRate = this.calculateConversionRate(purchase.abTestId, purchase.abVariantId);
      }
    }

    logger.info(`Purchase completed: ${purchaseId}`);
    return true;
  }

  // Обновление метрик пользователя
  private updateUserMetrics(purchase: PurchaseData): void {
    if (!this.userMetrics.has(purchase.userId)) {
      this.userMetrics.set(purchase.userId, {
        userId: purchase.userId,
        totalSpent: 0,
        purchaseCount: 0,
        averageOrderValue: 0,
        conversionFunnelStage: 'visitor',
        ltv: 0,
        churnRisk: 0
      });
    }

    const metrics = this.userMetrics.get(purchase.userId)!;
    metrics.totalSpent += purchase.amount;
    metrics.purchaseCount++;
    metrics.averageOrderValue = metrics.totalSpent / metrics.purchaseCount;
    metrics.lastPurchase = purchase.completedAt;
    metrics.preferredPaymentMethod = purchase.paymentMethod;
    metrics.conversionFunnelStage = 'paying';
    metrics.ltv = this.calculateLTV(metrics);
    metrics.churnRisk = this.calculateChurnRisk(metrics);
  }

  // Расчет конверсии A/B теста
  private calculateConversionRate(testId: string, variantId: string): number {
    const purchases = Array.from(this.purchases.values())
      .filter(p => p.abTestId === testId && p.abVariantId === variantId && p.status === 'completed');
    
    const test = this.abTests.get(testId);
    if (!test) return 0;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return 0;

    const participants = Math.round(test.metrics.participantCount * variant.weight / 100);
    return participants > 0 ? purchases.length / participants : 0;
  }

  // Простой расчет LTV
  private calculateLTV(metrics: UserMetrics): number {
    if (metrics.purchaseCount === 0) return 0;
    
    // Простая формула: среднее значение заказа * среднее количество покупок в год
    const avgPurchasesPerYear = Math.max(1, metrics.purchaseCount * (365 / this.daysSinceFirstPurchase(metrics)));
    return metrics.averageOrderValue * avgPurchasesPerYear;
  }

  // Расчет риска оттока
  private calculateChurnRisk(metrics: UserMetrics): number {
    if (!metrics.lastPurchase) return 0.8;
    
    const daysSinceLastPurchase = (Date.now() - metrics.lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
    
    // Простая модель: риск растет с временем без покупок
    if (daysSinceLastPurchase < 30) return 0.1;
    if (daysSinceLastPurchase < 60) return 0.3;
    if (daysSinceLastPurchase < 90) return 0.5;
    return 0.8;
  }

  private daysSinceFirstPurchase(metrics: UserMetrics): number {
    // Упрощение: берем разницу от сегодня
    return Math.max(1, metrics.purchaseCount * 30); // Предполагаем покупку раз в месяц
  }

  // Получение подходящих баннеров для пользователя
  getBannersForUser(userId: string, context: {
    gameType?: string;
    userLevel?: number;
    country?: string;
    timeOfDay?: string;
  }): BannerConfig[] {
    const userMetrics = this.userMetrics.get(userId);
    const availableBanners = Array.from(this.banners.values())
      .filter(banner => {
        if (!banner.isActive) return false;

        // Проверяем таргетинг
        if (banner.targeting.gameTypes && !banner.targeting.gameTypes.includes('all') && 
            !banner.targeting.gameTypes.includes(context.gameType || '')) {
          return false;
        }

        if (banner.targeting.userLevels && context.userLevel && 
            !banner.targeting.userLevels.includes(context.userLevel)) {
          return false;
        }

        if (banner.targeting.countries && context.country && 
            !banner.targeting.countries.includes(context.country)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    return availableBanners;
  }

  // Отслеживание показа баннера
  trackBannerImpression(bannerId: string, userId: string): void {
    const banner = this.banners.get(bannerId);
    if (banner) {
      banner.metrics.impressions++;
      logger.info(`Banner impression: ${bannerId} for user ${userId}`);
    }
  }

  // Отслеживание клика по баннеру
  trackBannerClick(bannerId: string, userId: string): void {
    const banner = this.banners.get(bannerId);
    if (banner) {
      banner.metrics.clicks++;
      logger.info(`Banner click: ${bannerId} for user ${userId}`);
    }
  }

  // Отслеживание конверсии с баннера
  trackBannerConversion(bannerId: string, userId: string, revenue: number = 0): void {
    const banner = this.banners.get(bannerId);
    if (banner) {
      banner.metrics.conversions++;
      banner.metrics.revenue += revenue;
      logger.info(`Banner conversion: ${bannerId} for user ${userId}, revenue: ${revenue}`);
    }
  }

  // Получение статистики монетизации
  getMonetizationStats(): {
    totalRevenue: number;
    totalPurchases: number;
    averageOrderValue: number;
    conversionRate: number;
    topPlans: { planId: string; revenue: number; count: number }[];
    abTestResults: { testId: string; variants: { id: string; conversionRate: number; revenue: number }[] }[];
  } {
    const completedPurchases = Array.from(this.purchases.values())
      .filter(p => p.status === 'completed');

    const totalRevenue = completedPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalPurchases = completedPurchases.length;
    const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

    // Топ планы
    const planStats = new Map<string, { revenue: number; count: number }>();
    completedPurchases.forEach(p => {
      if (!planStats.has(p.planId)) {
        planStats.set(p.planId, { revenue: 0, count: 0 });
      }
      const stats = planStats.get(p.planId)!;
      stats.revenue += p.amount;
      stats.count++;
    });

    const topPlans = Array.from(planStats.entries())
      .map(([planId, stats]) => ({ planId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    // Результаты A/B тестов
    const abTestResults = Array.from(this.abTests.values())
      .filter(test => test.isActive)
      .map(test => ({
        testId: test.id,
        variants: test.variants.map(variant => ({
          id: variant.id,
          conversionRate: this.calculateConversionRate(test.id, variant.id),
          revenue: completedPurchases
            .filter(p => p.abTestId === test.id && p.abVariantId === variant.id)
            .reduce((sum, p) => sum + p.amount, 0)
        }))
      }));

    // Простой расчет общей конверсии
    const totalUsers = this.userMetrics.size;
    const conversionRate = totalUsers > 0 ? totalPurchases / totalUsers : 0;

    return {
      totalRevenue,
      totalPurchases,
      averageOrderValue,
      conversionRate,
      topPlans,
      abTestResults
    };
  }

  // API методы для получения данных
  getPaymentPlans(): PaymentPlan[] {
    return Array.from(this.paymentPlans.values());
  }

  getPaymentPlan(planId: string): PaymentPlan | undefined {
    return this.paymentPlans.get(planId);
  }

  getUserPurchases(userId: string): PurchaseData[] {
    return Array.from(this.purchases.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUserMetrics(userId: string): UserMetrics | undefined {
    return this.userMetrics.get(userId);
  }
}

export const monetizationService = new MonetizationService(); 