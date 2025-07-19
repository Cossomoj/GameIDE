import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';
import AchievementCard from '../components/AchievementCard';
import AchievementNotifications from '../components/AchievementNotifications';

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
  rewards: Array<{
    type: string;
    value: number | string;
    description: string;
  }>;
  userProgress: {
    id: string;
    progress: number;
    isUnlocked: boolean;
    unlockedAt?: Date;
    currentStreak?: number;
  };
}

interface UserStats {
  userId: string;
  totalPoints: number;
  achievementsUnlocked: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: string;
  lastActivityDate: Date;
  lifetimeStats: {
    gamesCreated: number;
    aiRequestsMade: number;
    timeSpentMinutes: number;
    loginDays: number;
    socialShares: number;
    purchasesMade: number;
    featuresUsed: string[];
  };
}

const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [sortBy, setSortBy] = useState<'progress' | 'difficulty' | 'category' | 'date'>('progress');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { t } = useLocalization();
  const { isMobile } = useMobile();
  const userId = 'user123'; // В реальном приложении получаем из контекста авторизации

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Параллельная загрузка достижений и статистики
        const [achievementsResponse, statsResponse] = await Promise.all([
          fetch('/api/achievements/user?includeSecret=true', {
            headers: { 'x-user-id': userId }
          }),
          fetch('/api/achievements/user/stats', {
            headers: { 'x-user-id': userId }
          })
        ]);

        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          setAchievements(achievementsData.data || []);
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setUserStats(statsData.data);
        }
      } catch (error) {
        console.error('Error fetching achievements data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Фильтрация и сортировка достижений
  const filteredAndSortedAchievements = useMemo(() => {
    let filtered = achievements.filter(achievement => {
      // Фильтр по категории
      if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
        return false;
      }

      // Фильтр по сложности
      if (selectedDifficulty !== 'all' && achievement.difficulty !== selectedDifficulty) {
        return false;
      }

      // Фильтр по поиску
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = achievement.title.toLowerCase().includes(query);
        const descMatch = achievement.description.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      // Фильтр секретных достижений
      if (achievement.isSecret && !achievement.userProgress.isUnlocked && !showSecrets) {
        return false;
      }

      return true;
    });

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          // Сначала разблокированные, потом по прогрессу
          if (a.userProgress.isUnlocked !== b.userProgress.isUnlocked) {
            return a.userProgress.isUnlocked ? -1 : 1;
          }
          return b.userProgress.progress - a.userProgress.progress;
        
        case 'difficulty':
          const difficultyOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4, legendary: 5 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        
        case 'category':
          return a.category.localeCompare(b.category);
        
        case 'date':
          if (a.userProgress.unlockedAt && b.userProgress.unlockedAt) {
            return new Date(b.userProgress.unlockedAt).getTime() - new Date(a.userProgress.unlockedAt).getTime();
          }
          return a.userProgress.unlockedAt ? -1 : b.userProgress.unlockedAt ? 1 : 0;
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [achievements, selectedCategory, selectedDifficulty, searchQuery, showSecrets, sortBy]);

  // Статистика по достижениям
  const achievementStats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.userProgress.isUnlocked).length;
    const byCategory = achievements.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDifficulty = achievements.reduce((acc, achievement) => {
      acc[achievement.difficulty] = (acc[achievement.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completionRate = total > 0 ? (unlocked / total) * 100 : 0;

    return {
      total,
      unlocked,
      completionRate,
      byCategory,
      byDifficulty
    };
  }, [achievements]);

  // Обработка sharing достижений
  const handleShareAchievement = async (achievementId: string) => {
    try {
      const response = await fetch(`/api/achievements/${achievementId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ platform: 'yandex' })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Здесь можно интегрировать с Yandex Games SDK для sharing
        if (typeof window !== 'undefined' && (window as any).YaGames) {
          try {
            await (window as any).YaGames.features.SocialApi.share({
              title: data.data.title,
              description: data.data.description,
              image: data.data.image,
              url: data.data.url
            });
          } catch (error) {
            console.error('Error sharing with Yandex Games:', error);
            // Fallback на обычный share API
            if (navigator.share) {
              navigator.share(data.data);
            }
          }
        } else if (navigator.share) {
          navigator.share(data.data);
        } else {
          // Fallback - копирование в буфер обмена
          navigator.clipboard.writeText(`${data.data.title}: ${data.data.url}`);
          alert(t('achievements.linkCopied'));
        }
      }
    } catch (error) {
      console.error('Error sharing achievement:', error);
    }
  };

  // Получение иконки категории
  const getCategoryIcon = (category: string) => {
    const icons = {
      creation: '🎨',
      mastery: '🎓', 
      social: '👥',
      monetization: '💰',
      exploration: '🔍',
      special: '✨'
    };
    return icons[category as keyof typeof icons] || '🏆';
  };

  // Получение иконки сложности
  const getDifficultyIcon = (difficulty: string) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      legendary: '🌟'
    };
    return icons[difficulty as keyof typeof icons] || '🏆';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('achievements.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Уведомления */}
      <AchievementNotifications userId={userId} />

      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🏆 {t('achievements.title')}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {t('achievements.subtitle')}
              </p>
            </div>

            {/* Переключатель вида */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Боковая панель */}
          <div className="lg:col-span-1">
            {/* Статистика пользователя */}
            {userStats && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📊 {t('achievements.stats.title')}
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('achievements.stats.points')}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{userStats.totalPoints}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('achievements.stats.unlocked')}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {achievementStats.unlocked}/{achievementStats.total}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('achievements.stats.completion')}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {achievementStats.completionRate.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('achievements.stats.streak')}</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {userStats.currentStreak} {t('achievements.days')}
                    </span>
                  </div>

                  {/* Прогресс-бар завершения */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('achievements.stats.overallProgress')}
                      </span>
                      <span className="text-sm font-medium">{achievementStats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${achievementStats.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Фильтры */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔍 {t('achievements.filters.title')}
              </h2>

              {/* Поиск */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={t('achievements.filters.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Категория */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.filters.category')}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('achievements.filters.allCategories')}</option>
                  {Object.keys(achievementStats.byCategory).map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {t(`achievements.category.${category}`, category)} ({achievementStats.byCategory[category]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Сложность */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.filters.difficulty')}
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('achievements.filters.allDifficulties')}</option>
                  {Object.keys(achievementStats.byDifficulty).map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {getDifficultyIcon(difficulty)} {t(`achievements.difficulty.${difficulty}`, difficulty)} ({achievementStats.byDifficulty[difficulty]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Сортировка */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('achievements.filters.sortBy')}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="progress">{t('achievements.filters.byProgress')}</option>
                  <option value="difficulty">{t('achievements.filters.byDifficulty')}</option>
                  <option value="category">{t('achievements.filters.byCategory')}</option>
                  <option value="date">{t('achievements.filters.byDate')}</option>
                </select>
              </div>

              {/* Показать секретные */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showSecrets"
                  checked={showSecrets}
                  onChange={(e) => setShowSecrets(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <label htmlFor="showSecrets" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('achievements.filters.showSecrets')}
                </label>
              </div>
            </div>
          </div>

          {/* Основной контент */}
          <div className="lg:col-span-3">
            {/* Результаты поиска */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {filteredAndSortedAchievements.length} {t('achievements.resultsFound')}
                </h3>
              </div>
            </div>

            {/* Сетка достижений */}
            {filteredAndSortedAchievements.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? `grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`
                  : 'space-y-4'
              }>
                {filteredAndSortedAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onShare={handleShareAchievement}
                    compact={viewMode === 'list'}
                    showProgress={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('achievements.noResults')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('achievements.tryDifferentFilters')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage; 