import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';

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

interface LeaderboardPlayerCardProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  showSocialFeatures?: boolean;
  onChallenge?: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  compact?: boolean;
  showStats?: boolean;
}

const LeaderboardPlayerCard: React.FC<LeaderboardPlayerCardProps> = ({
  entry,
  isCurrentUser = false,
  showSocialFeatures = true,
  onChallenge,
  onAddFriend,
  onViewProfile,
  compact = false,
  showStats = true
}) => {
  const { t } = useLocalization();
  const { isMobile } = useMobile();
  const [isHovered, setIsHovered] = useState(false);

  // Получение цвета медали для топ-3
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600'; // Золото
      case 2: return 'from-gray-300 to-gray-500'; // Серебро
      case 3: return 'from-orange-400 to-orange-600'; // Бронза
      default: return 'from-blue-400 to-blue-600';
    }
  };

  // Получение эмодзи медали
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  // Получение индикатора изменения ранга
  const getRankChangeIndicator = () => {
    switch (entry.change) {
      case 'up':
        return <span className="text-green-500 text-sm">↗️ +{entry.previousRank ? entry.previousRank - entry.rank : 0}</span>;
      case 'down':
        return <span className="text-red-500 text-sm">↘️ -{entry.rank - (entry.previousRank || 0)}</span>;
      case 'new':
        return <span className="text-blue-500 text-sm">✨ {t('leaderboards.new')}</span>;
      default:
        return <span className="text-gray-500 text-sm">➡️</span>;
    }
  };

  // Получение статуса онлайн
  const getOnlineStatus = () => {
    if (!entry.socialData) return null;
    
    const { isOnline, status } = entry.socialData;
    if (!isOnline) return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    
    switch (status) {
      case 'playing':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />;
      case 'idle':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
    }
  };

  // Получение бейджа пользователя
  const getUserBadge = () => {
    if (!entry.metadata.badge) return null;
    
    const badges = {
      champion: { icon: '👑', color: 'text-yellow-600', label: t('leaderboards.badges.champion') },
      expert: { icon: '🎓', color: 'text-purple-600', label: t('leaderboards.badges.expert') },
      rising_star: { icon: '⭐', color: 'text-blue-600', label: t('leaderboards.badges.risingStar') },
      veteran: { icon: '🛡️', color: 'text-green-600', label: t('leaderboards.badges.veteran') }
    };
    
    const badge = badges[entry.metadata.badge as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  // Форматирование времени игры
  const formatPlayTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}м`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}ч`;
    const days = Math.floor(hours / 24);
    return `${days}д`;
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('leaderboards.today');
    if (diffDays === 1) return t('leaderboards.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('leaderboards.daysAgo')}`;
    
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 ${
        isCurrentUser 
          ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' 
          : 'hover:shadow-xl hover:scale-[1.02]'
      } ${compact ? 'p-4' : 'p-6'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Топ-3 медали */}
      {entry.rank <= 3 && (
        <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br shadow-lg flex items-center justify-center text-2xl animate-bounce"
             style={{ background: `linear-gradient(135deg, ${getMedalColor(entry.rank).split(' ').join(', ')})` }}>
          {getMedalEmoji(entry.rank)}
        </div>
      )}

      {/* Текущий пользователь индикатор */}
      {isCurrentUser && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">
          👤
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* Ранг */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getMedalColor(entry.rank)} flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold text-lg">#{entry.rank}</span>
          </div>
          {/* Изменение ранга */}
          <div className="mt-1 flex justify-center">
            {getRankChangeIndicator()}
          </div>
        </div>

        {/* Аватар и информация */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`}
              alt={entry.displayName}
              className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
            />
            {/* Статус онлайн */}
            <div className="absolute -bottom-1 -right-1">
              {getOnlineStatus()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                {entry.displayName}
              </h3>
              {getUserBadge()}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              @{entry.username}
            </p>
            
            {/* Социальная информация */}
            {entry.socialData && showSocialFeatures && (
              <div className="flex items-center space-x-2 mt-1">
                {entry.socialData.isFriend && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    👥 {t('leaderboards.friend')}
                  </span>
                )}
                {entry.socialData.mutualFriends > 0 && (
                  <span className="text-xs text-gray-500">
                    {entry.socialData.mutualFriends} {t('leaderboards.mutualFriends')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Счет */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {entry.score.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('leaderboards.points')}
          </div>
        </div>
      </div>

      {/* Расширенная статистика */}
      {showStats && !compact && (isHovered || isMobile) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{entry.metadata.level}</div>
              <div className="text-gray-500 dark:text-gray-400">{t('leaderboards.level')}</div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{entry.metadata.gamesPlayed}</div>
              <div className="text-gray-500 dark:text-gray-400">{t('leaderboards.gamesPlayed')}</div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{entry.metadata.achievementsUnlocked}</div>
              <div className="text-gray-500 dark:text-gray-400">{t('leaderboards.achievements')}</div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{formatPlayTime(entry.metadata.totalPlayTime)}</div>
              <div className="text-gray-500 dark:text-gray-400">{t('leaderboards.playTime')}</div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-3 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>
              {t('leaderboards.joined')}: {formatDate(new Date(entry.metadata.joinDate))}
            </span>
            <span>
              {entry.metadata.region && `🌍 ${entry.metadata.region}`}
            </span>
          </div>
        </div>
      )}

      {/* Социальные действия */}
      {showSocialFeatures && !isCurrentUser && (isHovered || isMobile) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            {onChallenge && (
              <button
                onClick={() => onChallenge(entry.userId)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                ⚔️ {t('leaderboards.challenge')}
              </button>
            )}
            
            {onAddFriend && !entry.socialData?.isFriend && (
              <button
                onClick={() => onAddFriend(entry.userId)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                👥 {t('leaderboards.addFriend')}
              </button>
            )}
            
            {onViewProfile && (
              <button
                onClick={() => onViewProfile(entry.userId)}
                className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                👁️
              </button>
            )}
          </div>
        </div>
      )}

      {/* Анимированный эффект для топ игроков */}
      {entry.rank <= 3 && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-orange-400/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Эффект для текущего пользователя */}
      {isCurrentUser && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/10 to-purple-400/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

export default LeaderboardPlayerCard; 