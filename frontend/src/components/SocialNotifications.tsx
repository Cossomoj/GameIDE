import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Users, 
  GamepadIcon, 
  Trophy, 
  MessageCircle, 
  Heart, 
  Gift,
  Crown,
  Target,
  Clock,
  Settings,
  Trash2,
  CheckCircle
} from 'lucide-react';

interface SocialNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'game_invite' | 'achievement' | 'comment' | 'like' | 'mention' | 'tournament' | 'challenge';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  actionUrl?: string;
  data?: any;
  createdAt: Date;
  expiresAt?: Date;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: string;
  }>;
}

interface NotificationSettings {
  friendRequests: boolean;
  gameInvites: boolean;
  achievements: boolean;
  comments: boolean;
  likes: boolean;
  mentions: boolean;
  tournaments: boolean;
  challenges: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const SocialNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    friendRequests: true,
    gameInvites: true,
    achievements: true,
    comments: true,
    likes: false,
    mentions: true,
    tournaments: true,
    challenges: true,
    emailNotifications: false,
    pushNotifications: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'today'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/social/notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/social/notification-settings');
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/social/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      ));
    } catch (error) {
      console.error('Ошибка отметки как прочитанное:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/social/notifications/read-all', {
        method: 'PATCH'
      });

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Ошибка отметки всех как прочитанные:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/social/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
    }
  };

  const handleNotificationAction = async (notificationId: string, actionType: string) => {
    try {
      await fetch(`/api/social/notifications/${notificationId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType })
      });

      // Обновляем уведомление
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Ошибка выполнения действия:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      await fetch('/api/social/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Ошибка обновления настроек:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'game_invite':
        return <GamepadIcon className="w-5 h-5 text-green-500" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'mention':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'tournament':
        return <Crown className="w-5 h-5 text-gold-500" />;
      case 'challenge':
        return <Target className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
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

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.read;
      case 'today':
        const today = new Date();
        const notifDate = new Date(notif.createdAt);
        return notifDate.toDateString() === today.toDateString();
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка уведомлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Уведомления</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Прочитать все</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex space-x-2 mt-4">
          {[
            { key: 'all', label: 'Все' },
            { key: 'unread', label: 'Непрочитанные' },
            { key: 'today', label: 'Сегодня' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Настройки */}
      {showSettings && (
        <div className="border-b border-gray-200 p-6 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Настройки уведомлений</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(settings).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateSettings({ [key]: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {key === 'friendRequests' && 'Заявки в друзья'}
                  {key === 'gameInvites' && 'Игровые приглашения'}
                  {key === 'achievements' && 'Достижения'}
                  {key === 'comments' && 'Комментарии'}
                  {key === 'likes' && 'Лайки'}
                  {key === 'mentions' && 'Упоминания'}
                  {key === 'tournaments' && 'Турниры'}
                  {key === 'challenges' && 'Вызовы'}
                  {key === 'emailNotifications' && 'Email уведомления'}
                  {key === 'pushNotifications' && 'Push уведомления'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Список уведомлений */}
      <div className="divide-y divide-gray-200">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            {filter === 'unread' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Все уведомления прочитаны!
                </h3>
                <p className="text-gray-500">
                  Новые уведомления появятся здесь
                </p>
              </>
            ) : (
              <>
                <BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет уведомлений
                </h3>
                <p className="text-gray-500">
                  Уведомления появятся здесь, когда произойдут события
                </p>
              </>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start space-x-4">
                {/* Иконка */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Содержимое */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                      
                      {/* Дополнительные данные */}
                      {notification.data && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                          {notification.type === 'game_invite' && (
                            <span>Игра: {notification.data.gameTitle}</span>
                          )}
                          {notification.type === 'achievement' && (
                            <span>+{notification.data.points} XP</span>
                          )}
                          {notification.type === 'tournament' && (
                            <span>Приз: {notification.data.prize}</span>
                          )}
                        </div>
                      )}

                      {/* Время */}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                        </div>
                        {notification.expiresAt && (
                          <>
                            <span>•</span>
                            <span>Истекает {formatTimeAgo(notification.expiresAt)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Отметить как прочитанное"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Удалить уведомление"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Кнопки действий */}
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex items-center space-x-2 mt-3">
                      {notification.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationAction(notification.id, action.action);
                          }}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            action.type === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                            action.type === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' :
                            'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocialNotifications; 