import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageCircle,
  Heart,
  Share2,
  Bell,
  UserPlus,
  Trophy,
  Gamepad2,
  Star,
  Clock,
  Send,
  Search,
  Filter,
  TrendingUp,
  Award,
  Target,
  Crown,
  Activity
} from 'lucide-react';
import SocialFeed from '../components/SocialFeed';
import FriendsManager from '../components/FriendsManager';
import GameInvites from '../components/GameInvites';
import SocialNotifications from '../components/SocialNotifications';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  level: number;
  status: 'online' | 'offline' | 'away' | 'playing';
  gamesCreated: number;
  achievementsCount: number;
}

interface SocialActivity {
  id: string;
  userId: string;
  user?: User;
  type: 'game_created' | 'achievement_unlocked' | 'friend_added' | 'high_score' | 'level_up';
  content: {
    title: string;
    description: string;
    icon: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
  liked?: boolean;
}

interface SocialNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'game_invite' | 'achievement' | 'comment' | 'like';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  createdAt: string;
}

interface SocialStats {
  totalFriends: number;
  pendingRequests: number;
  activeInvites: number;
  unreadNotifications: number;
  weeklyActivity: number;
  popularGames: Array<{
    id: string;
    title: string;
    players: number;
  }>;
}

const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'invites' | 'notifications'>('feed');
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [friends, setFriends] = useState<{ user: User }[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [popularUsers, setPopularUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SocialStats>({
    totalFriends: 0,
    pendingRequests: 0,
    activeInvites: 0,
    unreadNotifications: 0,
    weeklyActivity: 0,
    popularGames: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Текущий пользователь (демо)
  const currentUser: User = {
    id: 'demo-user-1',
    username: 'currentuser',
    displayName: 'Текущий пользователь',
    level: 10,
    status: 'online',
    gamesCreated: 15,
    achievementsCount: 23
  };

  // Загрузка данных
  useEffect(() => {
    fetchSocialData();
    fetchSocialStats();
  }, []);

  const fetchSocialData = async () => {
    try {
      setLoading(true);

      // Получаем демо-данные
      const demoResponse = await fetch('/api/social/demo/data');
      const demoData = await demoResponse.json();

      if (demoData.success) {
        // Создаем активности с пользователями
        const activitiesWithUsers: SocialActivity[] = demoData.data.sampleActivities.map((activity: any, index: number) => ({
          id: `activity-${index}`,
          userId: demoData.data.users[index % demoData.data.users.length].id,
          user: demoData.data.users[index % demoData.data.users.length],
          type: activity.type,
          content: activity.content,
          likes: activity.likes,
          comments: activity.comments,
          createdAt: new Date(Date.now() - index * 2 * 60 * 60 * 1000).toISOString(),
          liked: Math.random() > 0.7
        }));

        setActivities(activitiesWithUsers);
        setFriends(demoData.data.users.slice(1).map((user: User) => ({ user })));
        setPopularUsers(demoData.data.users);
      }

      // Создаем демо уведомления
      const demoNotifications: SocialNotification[] = [
        {
          id: 'notif-1',
          type: 'friend_request',
          title: 'Новый запрос в друзья',
          message: 'Спидраннер хочет добавить вас в друзья',
          icon: '👤',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: 'notif-2',
          type: 'achievement',
          title: 'Новое достижение',
          message: 'Вы разблокировали достижение "Социальная бабочка"',
          icon: '🏆',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'notif-3',
          type: 'like',
          title: 'Лайк активности',
          message: 'Мастер Игр лайкнул вашу игру',
          icon: '❤️',
          read: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setNotifications(demoNotifications);
    } catch (error) {
      console.error('Ошибка загрузки социальных данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialStats = async () => {
    try {
      const response = await fetch('/api/social/stats');
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  // Обработчики событий
  const handleLikeActivity = async (activityId: string) => {
    try {
      const response = await fetch(`/api/social/activities/${activityId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (response.ok) {
        setActivities(prev => prev.map(activity => 
          activity.id === activityId 
            ? { 
                ...activity, 
                likes: activity.liked ? activity.likes - 1 : activity.likes + 1,
                liked: !activity.liked 
              }
            : activity
        ));
      }
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  const handleAddComment = async (activityId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          userId: currentUser.id,
          content: newComment
        })
      });

      if (response.ok) {
        setActivities(prev => prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, comments: activity.comments + 1 }
            : activity
        ));
        setNewComment('');
        setSelectedActivity(null);
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch(`/api/social/users/${currentUser.id}/friends/request/${userId}`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Запрос в друзья отправлен!');
      }
    } catch (error) {
      console.error('Ошибка отправки запроса в друзья:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/social/users/${currentUser.id}/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        ));
      }
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  // Получение статуса пользователя
  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'playing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: User['status']) => {
    switch (status) {
      case 'online': return 'В сети';
      case 'away': return 'Отошел';
      case 'playing': return 'Играет';
      default: return 'Не в сети';
    }
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)} дн.`;
    } else if (hours > 0) {
      return `${hours} ч.`;
    } else {
      return `${minutes} мин.`;
    }
  };

  const tabs = [
    { 
      key: 'feed', 
      label: 'Лента', 
      icon: Activity, 
      description: 'Активность друзей и сообщества' 
    },
    { 
      key: 'friends', 
      label: 'Друзья', 
      icon: Users, 
      count: stats.pendingRequests,
      description: 'Управление друзьями и заявками' 
    },
    { 
      key: 'invites', 
      label: 'Игры', 
      icon: Trophy, 
      count: stats.activeInvites,
      description: 'Приглашения, турниры и вызовы' 
    },
    { 
      key: 'notifications', 
      label: 'Уведомления', 
      icon: Bell, 
      count: stats.unreadNotifications,
      description: 'Все уведомления и настройки' 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Загрузка социальных данных...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок страницы */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Социальная сеть GameIDE</h1>
          <p className="text-gray-600">
            Общайтесь с другими разработчиками игр, участвуйте в турнирах и делитесь достижениями
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalFriends}</div>
                <div className="text-sm text-gray-500">Друзей</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.weeklyActivity}</div>
                <div className="text-sm text-gray-500">Активность за неделю</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Gamepad2 className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.activeInvites}</div>
                <div className="text-sm text-gray-500">Активных приглашений</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Bell className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.unreadNotifications}</div>
                <div className="text-sm text-gray-500">Непрочитанных</div>
              </div>
            </div>
          </div>
        </div>

        {/* Популярные игры */}
        {stats.popularGames.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
              Популярные игры сегодня
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.popularGames.slice(0, 3).map((game, index) => (
                <div key={game.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    'bg-yellow-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{game.title}</h4>
                    <p className="text-sm text-gray-500">{game.players} игроков</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Навигация */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors relative group ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    {tab.count && tab.count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                        {tab.count}
                      </span>
                    )}
                    
                    {/* Tooltip с описанием */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {tab.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Содержимое табов */}
        <div className="space-y-6">
          {activeTab === 'feed' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Основная лента */}
              <div className="lg:col-span-2">
                <SocialFeed />
              </div>
              
              {/* Боковая панель */}
              <div className="space-y-6">
                {/* Быстрые действия */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium text-gray-900">Найти друзей</div>
                        <div className="text-sm text-gray-500">Расширьте свою сеть</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('invites')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Crown className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium text-gray-900">Создать турнир</div>
                        <div className="text-sm text-gray-500">Организуйте соревнование</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('invites')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                    >
                      <Target className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="font-medium text-gray-900">Бросить вызов</div>
                        <div className="text-sm text-gray-500">Соревнуйтесь с друзьями</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Онлайн друзья */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Онлайн сейчас</h3>
                  <div className="space-y-3">
                    {/* Здесь будет список онлайн друзей */}
                    <div className="text-center py-4 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Нет друзей онлайн</p>
                    </div>
                  </div>
                </div>

                {/* Рекомендации */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Возможно, вы знаете</h3>
                  <div className="space-y-3">
                    {/* Здесь будут рекомендации друзей */}
                    <div className="text-center py-4 text-gray-500">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Ищем подходящих людей</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'friends' && <FriendsManager />}
          {activeTab === 'invites' && <GameInvites />}
          {activeTab === 'notifications' && <SocialNotifications />}
        </div>

        {/* Плавающая кнопка создания поста */}
        {activeTab === 'feed' && (
          <button className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50">
            <Send className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SocialPage; 