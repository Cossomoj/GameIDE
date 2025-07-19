import React, { useState, useEffect } from 'react';
import { useMobile } from '../hooks/useMobile';
import { useLocalization } from '../contexts/LocalizationContext';

interface BannerConfig {
  id: string;
  type: 'sticky' | 'fullscreen' | 'rewarded' | 'interstitial';
  placement: 'top' | 'bottom' | 'overlay' | 'between_levels';
  content: {
    title?: string;
    description?: string;
    imageUrl?: string;
    callToAction?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  priority: number;
}

interface StickyBannerProps {
  onBannerClick?: (bannerId: string) => void;
  onBannerDismiss?: (bannerId: string) => void;
  userId?: string;
  gameType?: string;
  userLevel?: number;
}

const StickyBanner: React.FC<StickyBannerProps> = ({
  onBannerClick,
  onBannerDismiss,
  userId = 'anonymous',
  gameType = 'general',
  userLevel = 1
}) => {
  const [banners, setBanners] = useState<BannerConfig[]>([]);
  const [activeBanner, setActiveBanner] = useState<BannerConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const { isMobile, isStandalone } = useMobile();
  const { t } = useLocalization();

  // Получение баннеров с сервера
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch(`/api/monetization/banners?gameType=${gameType}&userLevel=${userLevel}`, {
          headers: {
            'x-user-id': userId
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBanners(data.data || []);
          
          // Выбираем первый подходящий баннер
          const stickyBanners = data.data?.filter((banner: BannerConfig) => 
            banner.type === 'sticky' && !isDismissed.has(banner.id)
          );
          
          if (stickyBanners?.length > 0) {
            setActiveBanner(stickyBanners[0]);
            setIsVisible(true);
            
            // Отслеживаем показ
            trackBannerImpression(stickyBanners[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
      }
    };

    fetchBanners();
  }, [userId, gameType, userLevel, isDismissed]);

  // Отслеживание показа баннера
  const trackBannerImpression = async (bannerId: string) => {
    try {
      await fetch(`/api/monetization/banners/${bannerId}/impression`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error tracking banner impression:', error);
    }
  };

  // Отслеживание клика по баннеру
  const trackBannerClick = async (bannerId: string) => {
    try {
      await fetch(`/api/monetization/banners/${bannerId}/click`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error tracking banner click:', error);
    }
  };

  // Обработка клика по баннеру
  const handleBannerClick = () => {
    if (!activeBanner) return;

    trackBannerClick(activeBanner.id);
    onBannerClick?.(activeBanner.id);

    // Логика в зависимости от типа баннера
    if (activeBanner.id === 'sticky_premium_offer') {
      // Открываем страницу с планами
      window.location.href = '/pricing';
    } else if (activeBanner.id === 'rewarded_free_generation') {
      // Показываем рекламу
      showRewardedAd();
    }
  };

  // Показ рекламной вставки с наградой
  const showRewardedAd = async () => {
    if (window.ysdk?.adv?.showRewardedVideo) {
      try {
        const result = await window.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => console.log('Rewarded ad opened'),
            onClose: (wasShown: boolean) => {
              if (wasShown) {
                handleRewardedAdComplete();
              }
            },
            onError: (error: any) => console.error('Rewarded ad error:', error),
            onRewarded: () => handleRewardedAdComplete()
          }
        });
      } catch (error) {
        console.error('Error showing rewarded ad:', error);
        // Fallback для тестирования
        setTimeout(() => handleRewardedAdComplete(), 1000);
      }
    } else {
      // Симуляция для разработки
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            handleRewardedAdComplete();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Обработка завершения рекламы с наградой
  const handleRewardedAdComplete = async () => {
    try {
      await fetch('/api/monetization/yandex/rewarded-ad', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adId: activeBanner?.id,
          rewardType: 'free_generation'
        })
      });

      // Показываем уведомление о награде
      alert(t('monetization.rewardGranted', 'Free generation granted!'));
      
      // Скрываем баннер
      handleDismiss();
    } catch (error) {
      console.error('Error processing rewarded ad:', error);
    }
  };

  // Обработка закрытия баннера
  const handleDismiss = () => {
    if (!activeBanner) return;

    setIsDismissed(prev => new Set([...prev, activeBanner.id]));
    setIsVisible(false);
    onBannerDismiss?.(activeBanner.id);
  };

  // Минимизация/развертывание баннера
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isVisible || !activeBanner) return null;

  const bannerStyle = {
    backgroundColor: activeBanner.content.backgroundColor || '#2563eb',
    color: activeBanner.content.textColor || '#ffffff'
  };

  const isBottom = activeBanner.placement === 'bottom';
  const isTop = activeBanner.placement === 'top';

  return (
    <>
      {/* Overlay для fullscreen/rewarded баннеров */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">📺</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('monetization.watchingAd')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('monetization.adCountdown', `${countdown} seconds remaining`)}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky баннер */}
      <div
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
          isBottom ? 'bottom-0' : 'top-0'
        } ${isMinimized ? 'transform translate-y-0' : ''} ${
          isMobile && isStandalone ? (isBottom ? 'mb-safe-bottom' : 'mt-safe-top') : ''
        }`}
        style={bannerStyle}
      >
        <div className={`max-w-7xl mx-auto px-4 ${isMinimized ? 'py-2' : 'py-3'}`}>
          <div className="flex items-center justify-between">
            {/* Контент баннера */}
            <div 
              className={`flex items-center space-x-3 cursor-pointer flex-1 ${
                isMinimized ? 'opacity-75' : ''
              }`}
              onClick={handleBannerClick}
            >
              {activeBanner.content.imageUrl && (
                <img 
                  src={activeBanner.content.imageUrl} 
                  alt=""
                  className="w-8 h-8 rounded"
                />
              )}
              
              <div className={`flex-1 ${isMinimized ? 'hidden sm:block' : ''}`}>
                {activeBanner.content.title && (
                  <div className="font-semibold text-sm">
                    {activeBanner.content.title}
                  </div>
                )}
                {activeBanner.content.description && !isMinimized && (
                  <div className="text-xs opacity-90 hidden sm:block">
                    {activeBanner.content.description}
                  </div>
                )}
              </div>

              {activeBanner.content.callToAction && (
                <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium transition-colors">
                  {activeBanner.content.callToAction}
                </button>
              )}
            </div>

            {/* Кнопки управления */}
            <div className="flex items-center space-x-2 ml-3">
              {/* Кнопка минимизации */}
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={isMinimized ? t('monetization.expand') : t('monetization.minimize')}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                  />
                </svg>
              </button>

              {/* Кнопка закрытия */}
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={t('monetization.dismiss')}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Прогресс-бар для временных акций */}
        {activeBanner.id === 'sticky_premium_offer' && (
          <div className="h-1 bg-white/20">
            <div 
              className="h-full bg-white/60 transition-all duration-1000"
              style={{ width: '65%' }} // Пример прогресса акции
            />
          </div>
        )}
      </div>

      {/* Отступ для контента, чтобы не перекрывался баннером */}
      {isVisible && !isMinimized && (
        <div 
          className={`${isBottom ? 'pb-16' : 'pt-16'} ${
            isMobile ? (isBottom ? 'pb-20' : 'pt-20') : ''
          }`} 
        />
      )}
    </>
  );
};

export default StickyBanner; 