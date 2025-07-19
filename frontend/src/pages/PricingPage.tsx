import React from 'react';
import { useNavigate } from 'react-router-dom';
import PricingPlans from '../components/PricingPlans';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { isMobile } = useMobile();

  const handlePlanSelect = (planId: string, price: number) => {
    console.log(`Plan selected: ${planId} for ${price}`);
    
    // После успешной покупки перенаправляем на главную страницу
    setTimeout(() => {
      navigate('/', { 
        state: { 
          message: t('monetization.welcomePremium', 'Welcome to Premium!'),
          type: 'success' 
        }
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Hero секция */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              🚀 {t('monetization.upgradeToday')}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t('monetization.unlockFullPotential')}
            </p>

            {/* Преимущества */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('monetization.advancedAI')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t('monetization.advancedAIDesc')}
                </p>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('monetization.unlimitedGames')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t('monetization.unlimitedGamesDesc')}
                </p>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="text-3xl mb-3">🎨</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('monetization.exclusiveTemplates')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t('monetization.exclusiveTemplatesDesc')}
                </p>
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  10,000+
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('monetization.happyUsers')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  50,000+
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('monetization.gamesCreated')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                  99.9%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('monetization.uptime')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  24/7
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('monetization.support')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Планы */}
      <div className="relative">
        <PricingPlans 
          onPlanSelect={handlePlanSelect}
          showABTestInfo={process.env.NODE_ENV === 'development'}
        />
      </div>

      {/* FAQ секция */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          ❓ {t('monetization.faq')}
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('monetization.faq1Question')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('monetization.faq1Answer')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('monetization.faq2Question')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('monetization.faq2Answer')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('monetization.faq3Question')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('monetization.faq3Answer')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('monetization.faq4Question')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('monetization.faq4Answer')}
            </p>
          </div>
        </div>
      </div>

      {/* Отзывы */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            ⭐ {t('monetization.testimonials')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                  А
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900 dark:text-white">Алексей К.</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Инди-разработчик</div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "GameIDE completely changed my game development workflow. Now I can create prototypes in minutes!"
              </p>
              <div className="flex text-yellow-400 mt-4">
                ⭐⭐⭐⭐⭐
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-semibold">
                  М
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900 dark:text-white">Мария С.</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Game Designer</div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "Incredible AI assistance! It understands exactly what I want to create and helps bring ideas to life."
              </p>
              <div className="flex text-yellow-400 mt-4">
                ⭐⭐⭐⭐⭐
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold">
                  Д
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900 dark:text-white">Дмитрий Р.</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Студия GameDev</div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">
                "Perfect for rapid prototyping. Our team's productivity increased by 300% after switching to GameIDE."
              </p>
              <div className="flex text-yellow-400 mt-4">
                ⭐⭐⭐⭐⭐
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA секция */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            🎯 {t('monetization.readyToStart')}
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            {t('monetization.joinThousands')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                const plansSection = document.querySelector('#pricing-plans');
                plansSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              💎 {t('monetization.choosePlan')}
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              🏠 {t('navigation.home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage; 