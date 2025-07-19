import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'creation' | 'mastery' | 'social' | 'monetization' | 'exploration' | 'special';
  type: 'progress' | 'single' | 'incremental' | 'streak';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  isSecret: boolean;
  targetValue?: number;
  rewards: AchievementReward[];
  userProgress: {
    id: string;
    progress: number;
    isUnlocked: boolean;
    unlockedAt?: Date;
    currentStreak?: number;
  };
}

interface AchievementReward {
  type: 'badge' | 'points' | 'currency' | 'feature_unlock' | 'discount' | 'premium_time' | 'cosmetic';
  value: number | string;
  description: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  onShare?: (achievementId: string) => void;
  onView?: (achievementId: string) => void;
  compact?: boolean;
  showProgress?: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onShare,
  onView,
  compact = false,
  showProgress = true
}) => {
  const { t } = useLocalization();
  const { isMobile } = useMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const { userProgress } = achievement;
  const isUnlocked = userProgress.isUnlocked;
  const progress = userProgress.progress;
  const targetValue = achievement.targetValue || 1;
  const progressPercent = Math.min(100, (progress / targetValue) * 100);

  // Получение цвета в зависимости от сложности
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return 'from-orange-400 to-orange-600';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-pink-400 to-pink-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  // Получение иконки категории
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'creation': return '🎨';
      case 'mastery': return '🎓';
      case 'social': return '👥';
      case 'monetization': return '💰';
      case 'exploration': return '🔍';
      case 'special': return '✨';
      default: return '🏆';
    }
  };

  // Получение текста категории
  const getCategoryText = (category: string) => {
    return t(`achievements.category.${category}`, category);
  };

  // Получение текста награды
  const getRewardText = (reward: AchievementReward) => {
    switch (reward.type) {
      case 'points':
        return `${reward.value} ${t('achievements.rewards.points')}`;
      case 'currency':
        return `${reward.value} ${t('achievements.rewards.currency')}`;
      case 'premium_time':
        return `${reward.value} ${t('achievements.rewards.premiumDays')}`;
      case 'discount':
        return `${reward.value}% ${t('achievements.rewards.discount')}`;
      default:
        return reward.description;
    }
  };

  // Обработка клика для показа деталей
  const handleCardClick = () => {
    if (compact) {
      setIsExpanded(!isExpanded);
    } else {
      onView?.(achievement.id);
    }
  };

  // Обработка sharing
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked) {
      onShare?.(achievement.id);
    }
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer group ${
        isUnlocked 
          ? 'hover:shadow-xl hover:scale-105 border-2 border-transparent hover:border-blue-300' 
          : 'opacity-75 hover:opacity-90'
      } ${compact ? 'p-4' : 'p-6'}`}
      onClick={handleCardClick}
    >
      {/* Статус разблокировки */}
      {isUnlocked && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg shadow-lg animate-bounce">
          ✓
        </div>
      )}

      {/* Секретный значок */}
      {achievement.isSecret && !isUnlocked && (
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
          ?
        </div>
      )}

      <div className="flex items-start space-x-4">
        {/* Иконка достижения */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${getDifficultyColor(achievement.difficulty)} flex items-center justify-center text-2xl shadow-lg ${
          isUnlocked ? 'animate-pulse' : 'grayscale'
        }`}>
          {achievement.icon}
        </div>

        {/* Основная информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className={`font-bold ${compact ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-white truncate`}>
              {achievement.isSecret && !isUnlocked ? t('achievements.secretAchievement') : achievement.title}
            </h3>
            
            {/* Категория */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {getCategoryIcon(achievement.category)} {getCategoryText(achievement.category)}
            </span>
          </div>

          <p className={`text-gray-600 dark:text-gray-300 ${compact ? 'text-sm' : 'text-base'} mb-3`}>
            {achievement.isSecret && !isUnlocked 
              ? t('achievements.secretDescription') 
              : achievement.description
            }
          </p>

          {/* Прогресс */}
          {showProgress && achievement.type !== 'single' && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('achievements.progress')}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {achievement.type === 'streak' && userProgress.currentStreak 
                    ? `${userProgress.currentStreak}/${targetValue} ${t('achievements.days')}`
                    : `${progress}/${targetValue}`
                  }
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${getDifficultyColor(achievement.difficulty)} transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              {progressPercent > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {progressPercent.toFixed(1)}% {t('achievements.complete')}
                </div>
              )}
            </div>
          )}

          {/* Награды */}
          {(isUnlocked || isExpanded) && achievement.rewards.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                🎁 {t('achievements.rewards.title')}:
              </h4>
              <div className="flex flex-wrap gap-2">
                {achievement.rewards.map((reward, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {getRewardText(reward)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Дата разблокировки */}
          {isUnlocked && userProgress.unlockedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              🎉 {t('achievements.unlockedOn')}: {new Date(userProgress.unlockedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Действия */}
      {isUnlocked && !compact && (
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleShare}
            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            📤 {t('achievements.share')}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView?.(achievement.id);
            }}
            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            👁️ {t('achievements.viewDetails')}
          </button>
        </div>
      )}

      {/* Мобильные действия */}
      {isUnlocked && isMobile && compact && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleShare}
            className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg"
          >
            📤
          </button>
        </div>
      )}

      {/* Эффект свечения для разблокированных достижений */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  );
};

export default AchievementCard; 