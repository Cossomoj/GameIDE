import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useMobile } from '../hooks/useMobile';

interface AchievementNotification {
  id: string;
  userId: string;
  achievementId: string;
  type: 'progress' | 'unlocked' | 'milestone';
  title: string;
  message: string;
  progress?: number;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

interface AchievementNotificationsProps {
  userId?: string;
  maxNotifications?: number;
  autoHideDelay?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  showProgress?: boolean;
}

const AchievementNotifications: React.FC<AchievementNotificationsProps> = ({
  userId = 'user123',
  maxNotifications = 3,
  autoHideDelay = 5000,
  position = 'top-right',
  showProgress = true
}) => {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());
  const { t } = useLocalization();
  const { isMobile, vibrate } = useMobile();

  // Получение уведомлений с сервера
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/achievements/notifications?unreadOnly=true', {
        headers: {
          'x-user-id': userId
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.data || [];
        
        // Показываем только новые уведомления
        const existingIds = new Set(notifications.map(n => n.id));
        const trulyNew = newNotifications.filter((n: AchievementNotification) => !existingIds.has(n.id));
        
        if (trulyNew.length > 0) {
          setNotifications(prev => [...trulyNew, ...prev].slice(0, maxNotifications));
          
          // Анимация появления для новых уведомлений
          trulyNew.forEach((notification: AchievementNotification) => {
            setTimeout(() => {
              setVisibleNotifications(prev => new Set([...prev, notification.id]));
              
              // Вибрация для разблокированных достижений
              if (notification.type === 'unlocked' && isMobile) {
                vibrate([200, 100, 200]);
              }
            }, 100);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [userId, notifications, maxNotifications, isMobile, vibrate]);

  // Отметка уведомления как прочитанного
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/achievements/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId
        }
      });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [userId]);

  // Скрытие уведомления
  const hideNotification = useCallback((notificationId: string) => {
    setVisibleNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });

    // Удаляем из списка через задержку (для анимации)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 300);
  }, []);

  // Автоскрытие уведомлений
  useEffect(() => {
    notifications.forEach(notification => {
      if (visibleNotifications.has(notification.id) && !notification.isRead) {
        const timer = setTimeout(() => {
          hideNotification(notification.id);
          markAsRead(notification.id);
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, visibleNotifications, autoHideDelay, hideNotification, markAsRead]);

  // Периодическая проверка новых уведомлений
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Каждые 10 секунд
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Обработка клика по уведомлению
  const handleNotificationClick = (notification: AchievementNotification) => {
    markAsRead(notification.id);
    hideNotification(notification.id);
    
    // Можно добавить навигацию к странице достижений
    // navigate(`/achievements/${notification.achievementId}`);
  };

  // Получение позиционирования
  const getPositionClasses = () => {
    const base = 'fixed z-50 pointer-events-none';
    const spacing = isMobile ? 'p-4' : 'p-6';
    
    switch (position) {
      case 'top-right':
        return `${base} top-0 right-0 ${spacing}`;
      case 'top-left':
        return `${base} top-0 left-0 ${spacing}`;
      case 'bottom-right':
        return `${base} bottom-0 right-0 ${spacing}`;
      case 'bottom-left':
        return `${base} bottom-0 left-0 ${spacing}`;
      case 'top-center':
        return `${base} top-0 left-1/2 transform -translate-x-1/2 ${spacing}`;
      default:
        return `${base} top-0 right-0 ${spacing}`;
    }
  };

  // Получение иконки типа уведомления
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'unlocked': return '🎉';
      case 'progress': return '📈';
      case 'milestone': return '🎯';
      default: return '🏆';
    }
  };

  // Получение цвета уведомления
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'unlocked': return 'from-green-500 to-emerald-600';
      case 'progress': return 'from-blue-500 to-blue-600';
      case 'milestone': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={getPositionClasses()}>
      <div className="space-y-3 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto transform transition-all duration-300 ${
              visibleNotifications.has(notification.id)
                ? 'translate-x-0 opacity-100 scale-100'
                : position.includes('right')
                ? 'translate-x-full opacity-0 scale-95'
                : '-translate-x-full opacity-0 scale-95'
            }`}
          >
            <div
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-xl ${
                isMobile ? 'p-4' : 'p-5'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              {/* Цветная полоска сверху */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getNotificationColor(notification.type)}`} />

              {/* Кнопка закрытия */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hideNotification(notification.id);
                  markAsRead(notification.id);
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm transition-colors"
              >
                ✕
              </button>

              <div className="flex items-start space-x-3 pr-8">
                {/* Иконка */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${getNotificationColor(notification.type)} flex items-center justify-center text-white text-lg shadow-lg`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Содержимое */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1">
                    {notification.title}
                  </h4>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {notification.message}
                  </p>

                  {/* Прогресс-бар для уведомлений о прогрессе */}
                  {showProgress && notification.type === 'progress' && notification.progress && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('achievements.progress')}
                        </span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {notification.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full bg-gradient-to-r ${getNotificationColor(notification.type)} transition-all duration-500`}
                          style={{ width: `${notification.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Время */}
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(notification.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              {/* Анимированный индикатор для новых уведомлений */}
              {notification.type === 'unlocked' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse" />
                  
                  {/* Конфетти эффект */}
                  <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" 
                       style={{ animationDelay: '0ms' }} />
                  <div className="absolute top-4 left-6 w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" 
                       style={{ animationDelay: '200ms' }} />
                  <div className="absolute top-6 left-3 w-1 h-1 bg-red-400 rounded-full animate-bounce" 
                       style={{ animationDelay: '400ms' }} />
                </>
              )}

              {/* Hover эффект */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Общий счетчик уведомлений */}
      {notifications.length > maxNotifications && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 pointer-events-auto">
            +{notifications.length - maxNotifications} {t('achievements.moreNotifications')}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementNotifications; 