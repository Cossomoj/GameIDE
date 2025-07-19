import React, { useState, useEffect } from 'react';
import { useMobile } from '../hooks/useMobile';
import { useLocalization } from '../contexts/LocalizationContext';

interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  price: number;
  originalPrice: number;
  currency: string;
  features: string[];
  duration?: number;
  popular?: boolean;
  discount?: number;
  abVariant?: string;
}

interface PricingPlansProps {
  userId?: string;
  onPlanSelect?: (planId: string, price: number) => void;
  showABTestInfo?: boolean;
  embedded?: boolean;
}

const PricingPlans: React.FC<PricingPlansProps> = ({
  userId = 'anonymous',
  onPlanSelect,
  showABTestInfo = false,
  embedded = false
}) => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [urgencyTimer, setUrgencyTimer] = useState<number | null>(null);
  const [socialProof, setSocialProof] = useState<string | null>(null);
  
  const { isMobile, deviceInfo } = useMobile();
  const { t, currentLanguage } = useLocalization();

  // Получение планов с сервера
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/monetization/plans', {
          headers: {
            'x-user-id': userId,
            'Accept-Language': currentLanguage
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlans(data.data || []);
          
          // Проверяем A/B тест варианты и устанавливаем специальные фичи
          data.data?.forEach((plan: PaymentPlan) => {
            if (plan.abVariant === 'discount_20') {
              // Таймер срочности для скидочного варианта
              setUrgencyTimer(24 * 60 * 60); // 24 часа в секундах
            } else if (plan.abVariant === 'premium_15') {
              // Социальное доказательство для премиум варианта
              setSocialProof('10,000+ happy game creators!');
            }
          });
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [userId, currentLanguage]);

  // Таймер срочности
  useEffect(() => {
    if (urgencyTimer && urgencyTimer > 0) {
      const timer = setInterval(() => {
        setUrgencyTimer(prev => prev && prev > 0 ? prev - 1 : 0);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [urgencyTimer]);

  // Обработка выбора плана
  const handlePlanSelect = async (plan: PaymentPlan) => {
    if (processing) return;
    
    try {
      setProcessing(true);
      setSelectedPlan(plan.id);
      
      // Создаем покупку
      const response = await fetch('/api/monetization/purchase', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod: 'yandex_money'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Интеграция с Yandex Games платежами
        if (window.ysdk?.getPayments) {
          try {
            const payments = await window.ysdk.getPayments({
              signed: true
            });
            
            const purchase = await payments.purchase({
              id: plan.id,
              developerPayload: JSON.stringify({
                userId,
                purchaseId: data.data.purchaseId,
                abVariant: plan.abVariant
              })
            });
            
            // Подтверждаем покупку на сервере
            await fetch(`/api/monetization/payment/${data.data.purchaseId}/complete`, {
              method: 'POST',
              headers: {
                'x-user-id': userId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: 'completed',
                yandexPurchase: purchase
              })
            });
            
            onPlanSelect?.(plan.id, plan.price);
            alert(t('monetization.purchaseSuccess', 'Purchase completed successfully!'));
            
          } catch (yandexError) {
            console.error('Yandex payment error:', yandexError);
            // Fallback к обычной обработке
            onPlanSelect?.(plan.id, plan.price);
          }
        } else {
          // Симуляция для разработки
          setTimeout(() => {
            onPlanSelect?.(plan.id, plan.price);
            alert(t('monetization.purchaseSuccess', 'Purchase completed successfully!'));
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      alert(t('monetization.purchaseError', 'Purchase failed. Please try again.'));
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'max-w-6xl mx-auto px-4 py-8'}`}>
      {/* Заголовок */}
      {!embedded && (
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            💎 {t('monetization.choosePlan')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('monetization.unlockPremium')}
          </p>
          
          {/* Социальное доказательство */}
          {socialProof && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
              <span className="mr-2">🎉</span>
              {socialProof}
            </div>
          )}
          
          {/* Таймер срочности */}
          {urgencyTimer && urgencyTimer > 0 && (
            <div className="mt-4 inline-flex items-center px-6 py-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-xl font-semibold">
              <span className="mr-2">⏰</span>
              {t('monetization.limitedOffer')}: {formatTime(urgencyTimer)}
            </div>
          )}
        </div>
      )}

      {/* A/B тест информация (только для разработки) */}
      {showABTestInfo && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            🧪 A/B Test Information (Dev Only)
          </h4>
          {plans.map(plan => plan.abVariant && (
            <div key={plan.id} className="text-sm text-yellow-700 dark:text-yellow-300">
              {plan.name}: variant "{plan.abVariant}" 
              {plan.discount && ` (${plan.discount}% discount)`}
            </div>
          ))}
        </div>
      )}

      {/* Планы */}
      <div className={`grid gap-6 ${
        isMobile ? 'grid-cols-1' : 
        plans.length === 3 ? 'lg:grid-cols-3 md:grid-cols-2' :
        plans.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
      }`}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 transition-all duration-200 ${
              plan.popular 
                ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105' 
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            {/* Популярный бейдж */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  ⭐ {t('monetization.mostPopular')}
                </div>
              </div>
            )}

            {/* Скидка бейдж */}
            {plan.discount && plan.discount > 0 && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{plan.discount}%
                </div>
              </div>
            )}

            <div className="p-8">
              {/* Заголовок плана */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {plan.description}
                </p>
              </div>

              {/* Цена */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-2">
                  {plan.discount && plan.discount > 0 && (
                    <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      {plan.originalPrice} {plan.currency}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-lg text-gray-600 dark:text-gray-300">
                    {plan.currency}
                  </span>
                </div>
                
                {plan.duration && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {plan.duration === 30 ? t('monetization.perMonth') :
                     plan.duration === 365 ? t('monetization.perYear') :
                     `${plan.duration} ${t('monetization.days')}`}
                  </div>
                )}

                {/* A/B тест сообщение */}
                {plan.abVariant === 'discount_20' && (
                  <div className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    ⚡ Limited Time: 20% OFF!
                  </div>
                )}
              </div>

              {/* Функции */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Кнопка покупки */}
              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={processing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  processing && selectedPlan === plan.id
                    ? 'bg-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {processing && selectedPlan === plan.id ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('monetization.processing')}</span>
                  </div>
                ) : (
                  <>
                    <span>💳 {t('monetization.selectPlan')}</span>
                    {plan.duration && (
                      <div className="text-sm opacity-80 mt-1">
                        {plan.duration === 30 && t('monetization.startFreeTrial')}
                      </div>
                    )}
                  </>
                )}
              </button>

              {/* Дополнительная информация */}
              <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                <p>{t('monetization.securePayment')}</p>
                {plan.duration === 30 && (
                  <p className="mt-1">{t('monetization.cancelAnytime')}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Доверие и безопасность */}
      <div className="mt-12 text-center">
        <div className="flex justify-center items-center space-x-6 text-gray-500 dark:text-gray-400 text-sm">
          <div className="flex items-center space-x-2">
            <span>🔒</span>
            <span>{t('monetization.secureSSL')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>💳</span>
            <span>{t('monetization.yandexPayments')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⚡</span>
            <span>{t('monetization.instantAccess')}</span>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {t('monetization.noHiddenFees')} • {t('monetization.supportedCountries')}
        </div>
      </div>
    </div>
  );
};

export default PricingPlans; 