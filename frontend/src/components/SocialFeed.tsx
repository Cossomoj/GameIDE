import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Trophy, 
  Users, 
  GamepadIcon,
  Star,
  Clock,
  MoreHorizontal,
  UserPlus,
  Zap
} from 'lucide-react';

interface SocialActivity {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  type: 'game_created' | 'achievement_unlocked' | 'friend_added' | 'game_shared' | 'high_score' | 'level_up';
  content: {
    title: string;
    description: string;
    icon: string;
    data?: any;
  };
  visibility: 'public' | 'friends' | 'private';
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: Date;
  gameId?: string;
  achievementId?: string;
}

interface SocialFeedProps {
  filter?: 'all' | 'friends' | 'following';
  userId?: string;
}

const SocialFeed: React.FC<SocialFeedProps> = ({ 
  filter = 'all',
  userId 
}) => {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter_state, setFilterState] = useState(filter);

  useEffect(() => {
    fetchActivities();
  }, [filter_state, userId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter_state) params.append('filter', filter_state);
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/social/activities?${params}`);
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Ошибка загрузки активности:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (activityId: string) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const response = await fetch(`/api/social/activities/${activityId}/like`, {
        method: activity.isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setActivities(prev => prev.map(a => 
          a.id === activityId 
            ? { 
                ...a, 
                isLiked: !a.isLiked,
                likes: a.isLiked ? a.likes - 1 : a.likes + 1
              }
            : a
        ));
      }
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  const handleShare = async (activity: SocialActivity) => {
    try {
      const shareData = {
        title: activity.content.title,
        text: activity.content.description,
        url: window.location.origin + `/activities/${activity.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // Показать уведомление о копировании
      }

      // Увеличиваем счетчик шаров в backend
      await fetch(`/api/social/activities/${activity.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Ошибка шаринга:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_created': return <GamepadIcon className="w-5 h-5 text-blue-500" />;
      case 'achievement_unlocked': return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'friend_added': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'game_shared': return <Share2 className="w-5 h-5 text-purple-500" />;
      case 'high_score': return <Star className="w-5 h-5 text-orange-500" />;
      case 'level_up': return <Zap className="w-5 h-5 text-cyan-500" />;
      default: return <GamepadIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex space-x-2 mb-6">
        {['all', 'friends', 'following'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilterState(filterOption as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter_state === filterOption
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterOption === 'all' && 'Все'}
            {filterOption === 'friends' && 'Друзья'}
            {filterOption === 'following' && 'Подписки'}
          </button>
        ))}
      </div>

      {/* Лента активности */}
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Пока нет активности
          </h3>
          <p className="text-gray-500">
            Добавьте друзей или создайте игру, чтобы увидеть активность!
          </p>
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            {/* Заголовок активности */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {activity.avatar ? (
                    <img 
                      src={activity.avatar} 
                      alt={activity.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    activity.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">{activity.username}</span>
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{formatTimeAgo(activity.createdAt)}</span>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Контент активности */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                {activity.content.title}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {activity.content.description}
              </p>

              {/* Дополнительные данные */}
              {activity.content.data && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  {activity.type === 'game_created' && (
                    <div className="flex items-center space-x-3">
                      <GamepadIcon className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{activity.content.data.gameTitle}</div>
                        <div className="text-sm text-gray-500">{activity.content.data.gameType}</div>
                      </div>
                    </div>
                  )}
                  {activity.type === 'high_score' && (
                    <div className="flex items-center space-x-3">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div className="font-medium">{activity.content.data.score} очков</div>
                        <div className="text-sm text-gray-500">в игре {activity.content.data.gameName}</div>
                      </div>
                    </div>
                  )}
                  {activity.type === 'achievement_unlocked' && (
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div className="font-medium">{activity.content.data.achievementName}</div>
                        <div className="text-sm text-gray-500">+{activity.content.data.points} XP</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => handleLike(activity.id)}
                  className={`flex items-center space-x-2 transition-colors ${
                    activity.isLiked
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart 
                    className={`w-5 h-5 ${activity.isLiked ? 'fill-current' : ''}`} 
                  />
                  <span className="font-medium">{activity.likes}</span>
                </button>

                <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{activity.comments}</span>
                </button>

                <button 
                  onClick={() => handleShare(activity)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">Поделиться</span>
                </button>
              </div>

              {activity.gameId && (
                <button 
                  onClick={() => window.open(`/games/${activity.gameId}`, '_blank')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Играть
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SocialFeed; 