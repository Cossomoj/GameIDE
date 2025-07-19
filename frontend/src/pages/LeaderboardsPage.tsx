import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';
import LeaderboardPlayerCard from '../components/LeaderboardPlayerCard';

interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  previousRank?: number;
  change: 'up' | 'down' | 'same' | 'new';
  metadata: {
    gamesPlayed: number;
    achievementsUnlocked: number;
    totalPlayTime: number;
    averageScore: number;
    bestStreak: number;
    level: number;
    region?: string;
    badge?: string;
    joinDate: Date;
    lastActivity: Date;
  };
  socialData?: {
    isFriend: boolean;
    mutualFriends: number;
    isOnline: boolean;
    status?: 'playing' | 'idle' | 'offline';
  };
}

interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  type: 'score' | 'achievements' | 'time' | 'games_created' | 'custom';
  category?: 'arcade' | 'puzzle' | 'strategy' | 'action' | 'all';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  maxEntries: number;
}

interface LeaderboardStats {
  totalPlayers: number;
  averageScore: number;
  topScore: number;
  yourRank?: number;
  yourScore?: number;
  percentile?: number;
  participationRate: number;
  lastUpdated: Date;
}

const LeaderboardsPage: React.FC = () => {
  const [leaderboards, setLeaderboards] = useState<LeaderboardConfig[]>([]);
  const [currentLeaderboard, setCurrentLeaderboard] = useState<string>('global_score');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [minLevel, setMinLevel] = useState<number | undefined>();
  const [maxLevel, setMaxLevel] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');

  const { t } = useLocalization();
  const { isMobile } = useMobile();
  const userId = 'user123'; // В реальном приложении получаем из контекста авторизации

  // Загрузка списка лидербордов
  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const response = await fetch('/api/leaderboards/configs');
        if (response.ok) {
          const data = await response.json();
          setLeaderboards(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboards:', error);
      }
    };

    fetchLeaderboards();
  }, []);

  // Загрузка данных лидерборда
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!currentLeaderboard) return;

      try {
        setLoading(true);

        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (selectedRegion !== 'all') params.append('region', selectedRegion);
        if (showFriendsOnly) params.append('friendsOnly', 'true');
        if (showOnlineOnly) params.append('onlineOnly', 'true');
        if (minLevel !== undefined) params.append('minLevel', minLevel.toString());
        if (maxLevel !== undefined) params.append('maxLevel', maxLevel.toString());
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(
          `/api/leaderboards/${currentLeaderboard}?${params.toString()}`,
          {
            headers: { 'x-user-id': userId }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setEntries(data.data.entries || []);
          setStats(data.data.stats);
          setUserEntry(data.data.userEntry || null);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [currentLeaderboard, selectedCategory, selectedRegion, showFriendsOnly, showOnlineOnly, minLevel, maxLevel, searchQuery, userId]);

  // Текущий лидерборд
  const currentLeaderboardConfig = useMemo(() => {
    return leaderboards.find(lb => lb.id === currentLeaderboard);
  }, [leaderboards, currentLeaderboard]);

  // Обработка вызова на дуэль
  const handleChallenge = async (targetUserId: string) => {
    try {
      const response = await fetch('/api/leaderboards/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          targetUserId,
          leaderboardId: currentLeaderboard
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${t('leaderboards.challengeSent')}! ID: ${data.data.challengeId}`);
      } else {
        alert(t('leaderboards.challengeFailed'));
      }
    } catch (error) {
      console.error('Error sending challenge:', error);
      alert(t('leaderboards.challengeFailed'));
    }
  };

  // Обработка добавления в друзья
  const handleAddFriend = async (targetUserId: string) => {
    try {
      // В реальном приложении здесь был бы API для добавления в друзья
      alert(`${t('leaderboards.friendRequestSent')} ${targetUserId}`);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  // Обработка просмотра профиля
  const handleViewProfile = (targetUserId: string) => {
    // В реальном приложении здесь была бы навигация к профилю
    alert(`${t('leaderboards.viewingProfile')} ${targetUserId}`);
  };

  // Экспорт лидерборда
  const handleExport = (format: 'json' | 'csv' | 'xml') => {
    const url = `/api/leaderboards/${currentLeaderboard}/export?format=${format}`;
    window.open(url, '_blank');
  };

  // Получение иконки категории
  const getCategoryIcon = (category?: string) => {
    const icons = {
      arcade: '🕹️',
      puzzle: '🧩',
      strategy: '♟️',
      action: '⚡',
      all: '🎮'
    };
    return icons[category as keyof typeof icons] || '🏆';
  };

  // Получение иконки типа лидерборда
  const getTypeIcon = (type: string) => {
    const icons = {
      score: '🏆',
      achievements: '🏅',
      time: '⏱️',
      games_created: '🎨',
      custom: '⭐'
    };
    return icons[type as keyof typeof icons] || '📊';
  };

  // Получение цвета периода
  const getPeriodColor = (period: string) => {
    const colors = {
      daily: 'bg-green-100 text-green-800',
      weekly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-purple-100 text-purple-800',
      all_time: 'bg-gray-100 text-gray-800'
    };
    return colors[period as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('leaderboards.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Заголовок */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📊 {t('leaderboards.title')}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {t('leaderboards.subtitle')}
              </p>
            </div>

            {/* Действия */}
            <div className="flex items-center space-x-2">
              {/* Экспорт */}
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && handleExport(e.target.value as any)}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>{t('leaderboards.export')}</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                </select>
              </div>

              {/* Режим просмотра */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === 'compact'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  📃
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Боковая панель */}
          <div className="lg:col-span-1">
            {/* Выбор лидерборда */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🏆 {t('leaderboards.selectLeaderboard')}
              </h2>

              <div className="space-y-2">
                {leaderboards.map((leaderboard) => (
                  <button
                    key={leaderboard.id}
                    onClick={() => setCurrentLeaderboard(leaderboard.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      currentLeaderboard === leaderboard.id
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTypeIcon(leaderboard.type)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {leaderboard.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {leaderboard.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {leaderboard.category && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                              {getCategoryIcon(leaderboard.category)} {t(`leaderboards.categories.${leaderboard.category}`)}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getPeriodColor(leaderboard.period)}`}>
                            {t(`leaderboards.periods.${leaderboard.period}`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Фильтры */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔍 {t('leaderboards.filters')}
              </h2>

              {/* Поиск */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={t('leaderboards.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Регион */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('leaderboards.region')}
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('leaderboards.allRegions')}</option>
                  <option value="RU">🇷🇺 Россия</option>
                  <option value="UA">🇺🇦 Украина</option>
                  <option value="BY">🇧🇾 Беларусь</option>
                  <option value="KZ">🇰🇿 Казахстан</option>
                </select>
              </div>

              {/* Уровень */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('leaderboards.levelRange')}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Мин"
                    value={minLevel || ''}
                    onChange={(e) => setMinLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Макс"
                    value={maxLevel || ''}
                    onChange={(e) => setMaxLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Чекбоксы */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showFriendsOnly}
                    onChange={(e) => setShowFriendsOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    👥 {t('leaderboards.friendsOnly')}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showOnlineOnly}
                    onChange={(e) => setShowOnlineOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    🟢 {t('leaderboards.onlineOnly')}
                  </span>
                </label>
              </div>
            </div>

            {/* Статистика пользователя */}
            {userEntry && stats && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📈 {t('leaderboards.yourStats')}
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('leaderboards.yourRank')}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">#{stats.yourRank}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('leaderboards.yourScore')}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{stats.yourScore?.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('leaderboards.percentile')}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {stats.percentile?.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Прогресс до топ-10 */}
                {stats.yourRank && stats.yourRank > 10 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('leaderboards.progressToTop10')}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.max(10, 100 - ((stats.yourRank - 10) / stats.totalPlayers) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Основной контент */}
          <div className="lg:col-span-3">
            {/* Заголовок лидерборда */}
            {currentLeaderboardConfig && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getTypeIcon(currentLeaderboardConfig.type)} {currentLeaderboardConfig.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {currentLeaderboardConfig.description}
                    </p>
                  </div>

                  {stats && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalPlayers.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leaderboards.totalPlayers')}
                      </div>
                    </div>
                  )}
                </div>

                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.topScore.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leaderboards.topScore')}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(stats.averageScore).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leaderboards.averageScore')}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.participationRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leaderboards.participation')}
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {new Date(stats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('leaderboards.lastUpdate')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Список игроков */}
            {entries.length > 0 ? (
              <div className={viewMode === 'compact' ? 'space-y-3' : 'space-y-4'}>
                {entries.map((entry) => (
                  <LeaderboardPlayerCard
                    key={entry.id}
                    entry={entry}
                    isCurrentUser={entry.userId === userId}
                    showSocialFeatures={true}
                    onChallenge={handleChallenge}
                    onAddFriend={handleAddFriend}
                    onViewProfile={handleViewProfile}
                    compact={viewMode === 'compact'}
                    showStats={viewMode === 'list'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('leaderboards.noPlayers')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('leaderboards.noPlayersDescription')}
                </p>
              </div>
            )}

            {/* Индикатор загрузки */}
            {loading && entries.length > 0 && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t('leaderboards.updating')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsPage; 