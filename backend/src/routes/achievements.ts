import { Router } from 'express';
import { achievementsService } from '../services/achievements';
import { logger } from '../services/logger';

const router = Router();

// Получение всех достижений
router.get('/all', async (req, res) => {
  try {
    const achievements = achievementsService.getAllAchievements();
    
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    logger.error('Error getting all achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

// Получение достижений пользователя
router.get('/user', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const includeSecret = req.query.includeSecret === 'true';
    
    const userAchievements = achievementsService.getUserAchievementsList(userId, includeSecret);
    
    res.json({
      success: true,
      data: userAchievements
    });
  } catch (error) {
    logger.error('Error getting user achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user achievements'
    });
  }
});

// Получение статистики пользователя
router.get('/user/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const stats = achievementsService.getUserStats(userId);
    
    res.json({
      success: true,
      data: {
        ...stats,
        lifetimeStats: {
          ...stats.lifetimeStats,
          featuresUsed: Array.from(stats.lifetimeStats.featuresUsed)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

// Получение уведомлений пользователя
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const notifications = achievementsService.getUserNotifications(userId, unreadOnly);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

// Отметка уведомления как прочитанного
router.patch('/notifications/:notificationId/read', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { notificationId } = req.params;
    
    const success = achievementsService.markNotificationAsRead(userId, notificationId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Отметка всех уведомлений как прочитанных
router.patch('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const markedCount = achievementsService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      data: {
        markedCount
      }
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
});

// Активация события достижения
router.post('/trigger', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { eventType, value = 1, metadata } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }
    
    achievementsService.triggerEvent(userId, eventType, value, metadata);
    
    res.json({
      success: true,
      message: 'Event triggered successfully'
    });
  } catch (error) {
    logger.error('Error triggering achievement event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger event'
    });
  }
});

// Получение топ пользователей по очкам
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    
    // В реальном приложении здесь была бы более сложная логика лидерборда
    // Пока возвращаем пример данных
    
    const leaderboard = [
      {
        userId: 'user1',
        username: 'GameMaster',
        totalPoints: 15000,
        achievementsUnlocked: 25,
        level: 'Gold',
        avatar: '🏆'
      },
      {
        userId: 'user2', 
        username: 'AIDeveloper',
        totalPoints: 12500,
        achievementsUnlocked: 20,
        level: 'Silver',
        avatar: '🤖'
      },
      {
        userId: 'user3',
        username: 'CreativeGenius',
        totalPoints: 10000,
        achievementsUnlocked: 18,
        level: 'Silver',
        avatar: '🎨'
      }
    ];
    
    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.slice(0, limit),
        total: leaderboard.length,
        category: category || 'overall'
      }
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Получение статистики системы достижений (для админов)
router.get('/system/stats', async (req, res) => {
  try {
    // В реальном приложении здесь была бы проверка прав доступа
    const stats = achievementsService.getAchievementSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting achievement system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system stats'
    });
  }
});

// Получение детальной информации о достижении
router.get('/:achievementId', async (req, res) => {
  try {
    const { achievementId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const achievements = achievementsService.getUserAchievementsList(userId, true);
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }
    
    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    logger.error('Error getting achievement details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievement details'
    });
  }
});

// Поделиться достижением (интеграция с Yandex Games)
router.post('/:achievementId/share', async (req, res) => {
  try {
    const { achievementId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { platform = 'yandex' } = req.body;
    
    const achievements = achievementsService.getUserAchievementsList(userId, true);
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (!achievement || !achievement.userProgress.isUnlocked) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found or not unlocked'
      });
    }
    
    // Активируем событие социального действия
    achievementsService.triggerEvent(userId, 'social_share', 1, {
      action: 'share',
      achievementId,
      platform
    });
    
    // В реальном приложении здесь была бы интеграция с Yandex Games SDK
    const shareData = {
      title: `🎉 Достижение разблокировано!`,
      description: `"${achievement.title}" - ${achievement.description}`,
      image: `https://gameide.app/achievements/${achievementId}/share.png`,
      url: `https://gameide.app/achievements/${achievementId}`
    };
    
    res.json({
      success: true,
      data: shareData
    });
  } catch (error) {
    logger.error('Error sharing achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share achievement'
    });
  }
});

// WebSocket уведомления (требует настройки WebSocket сервера)
router.get('/ws/notifications', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'WebSocket notifications endpoint',
      endpoint: '/ws/achievements'
    });
  } catch (error) {
    logger.error('Error getting WebSocket info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket info'
    });
  }
});

// Хелпер роуты для событий (упрощают интеграцию)
router.post('/events/game-created', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { gameType, duration, features } = req.body;
    
    const metadata = {
      gameType,
      duration,
      features,
      timeRange: new Date().getHours() < 6 ? '00:00-05:00' : 'other'
    };
    
    achievementsService.triggerEvent(userId, 'game_created', 1, metadata);
    
    res.json({
      success: true,
      message: 'Game creation event triggered'
    });
  } catch (error) {
    logger.error('Error triggering game creation event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger event'
    });
  }
});

router.post('/events/ai-request', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { provider, model, requestType } = req.body;
    
    const metadata = { provider, model, requestType };
    
    achievementsService.triggerEvent(userId, 'ai_request', 1, metadata);
    
    res.json({
      success: true,
      message: 'AI request event triggered'
    });
  } catch (error) {
    logger.error('Error triggering AI request event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger event'
    });
  }
});

router.post('/events/user-login', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    achievementsService.triggerEvent(userId, 'user_login', 1);
    
    res.json({
      success: true,
      message: 'User login event triggered'
    });
  } catch (error) {
    logger.error('Error triggering user login event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger event'
    });
  }
});

export default router; 