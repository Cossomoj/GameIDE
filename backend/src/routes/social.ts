import { Router } from 'express';
import { socialService } from '../services/social';
import { logger } from '../services/logger';

const router = Router();

// Пользователи

// Получение профиля пользователя
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = socialService.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Поиск пользователей
router.get('/users/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const users = socialService.searchUsers(query, limit);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// Создание/обновление пользователя
router.post('/users', async (req, res) => {
  try {
    const userData = req.body;
    const user = socialService.createOrUpdateUser(userData);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error creating/updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update user'
    });
  }
});

// Обновление статуса пользователя
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'playing'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: online, offline, away, or playing'
      });
    }

    const success = socialService.updateUserStatus(userId, status);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// Получение статистики пользователя
router.get('/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = socialService.getUserStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

// Система друзей

// Получение друзей пользователя
router.get('/users/:userId/friends', async (req, res) => {
  try {
    const { userId } = req.params;
    const friends = socialService.getUserFriends(userId);
    
    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    logger.error('Error getting user friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user friends'
    });
  }
});

// Отправка запроса в друзья
router.post('/users/:fromUserId/friends/request/:toUserId', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.params;
    
    const friendshipId = socialService.sendFriendRequest(fromUserId, toUserId);
    
    if (!friendshipId) {
      return res.status(400).json({
        success: false,
        error: 'Failed to send friend request. Users may already be friends or request exists.'
      });
    }

    res.json({
      success: true,
      data: { friendshipId },
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    logger.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send friend request'
    });
  }
});

// Принятие запроса в друзья
router.post('/friends/:friendshipId/accept', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const success = socialService.acceptFriendRequest(friendshipId, userId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to accept friend request. Request may not exist or already processed.'
      });
    }

    res.json({
      success: true,
      message: 'Friend request accepted successfully'
    });
  } catch (error) {
    logger.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept friend request'
    });
  }
});

// Отклонение запроса в друзья
router.post('/friends/:friendshipId/decline', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const success = socialService.declineFriendRequest(friendshipId, userId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to decline friend request. Request may not exist.'
      });
    }

    res.json({
      success: true,
      message: 'Friend request declined successfully'
    });
  } catch (error) {
    logger.error('Error declining friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline friend request'
    });
  }
});

// Приглашения в игры

// Отправка приглашения в игру
router.post('/games/invite', async (req, res) => {
  try {
    const { fromUserId, toUserId, gameId, message } = req.body;
    
    if (!fromUserId || !toUserId || !gameId) {
      return res.status(400).json({
        success: false,
        error: 'fromUserId, toUserId, and gameId are required'
      });
    }

    const inviteId = socialService.sendGameInvite(fromUserId, toUserId, gameId, message);
    
    if (!inviteId) {
      return res.status(400).json({
        success: false,
        error: 'Failed to send game invite'
      });
    }

    res.json({
      success: true,
      data: { inviteId },
      message: 'Game invite sent successfully'
    });
  } catch (error) {
    logger.error('Error sending game invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send game invite'
    });
  }
});

// Принятие приглашения в игру
router.post('/games/invite/:inviteId/accept', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const success = socialService.acceptGameInvite(inviteId, userId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to accept game invite. Invite may not exist, be expired, or already processed.'
      });
    }

    res.json({
      success: true,
      message: 'Game invite accepted successfully'
    });
  } catch (error) {
    logger.error('Error accepting game invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept game invite'
    });
  }
});

// Социальные активности

// Получение ленты активности
router.get('/users/:userId/feed', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const activities = socialService.getActivityFeed(userId, limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity feed'
    });
  }
});

// Создание активности
router.post('/activities', async (req, res) => {
  try {
    const { userId, ...activityData } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const activityId = socialService.createActivity(userId, activityData);
    
    res.json({
      success: true,
      data: { activityId },
      message: 'Activity created successfully'
    });
  } catch (error) {
    logger.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity'
    });
  }
});

// Лайк активности
router.post('/activities/:activityId/like', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const success = socialService.likeActivity(activityId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity liked successfully'
    });
  } catch (error) {
    logger.error('Error liking activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like activity'
    });
  }
});

// Комментарии

// Получение комментариев
router.get('/comments', async (req, res) => {
  try {
    const { activityId, gameId } = req.query;
    
    if (!activityId && !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Either activityId or gameId is required'
      });
    }

    const comments = socialService.getComments(
      activityId as string, 
      gameId as string
    );
    
    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    logger.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

// Добавление комментария
router.post('/comments', async (req, res) => {
  try {
    const { activityId, gameId, userId, content, parentId } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'User ID and content are required'
      });
    }

    if (!activityId && !gameId) {
      return res.status(400).json({
        success: false,
        error: 'Either activityId or gameId is required'
      });
    }

    const commentId = socialService.addComment({
      activityId,
      gameId,
      userId,
      content,
      parentId
    });
    
    res.json({
      success: true,
      data: { commentId },
      message: 'Comment added successfully'
    });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

// Sharing

// Создание контента для sharing
router.post('/share/create', async (req, res) => {
  try {
    const shareData = req.body;
    const shareId = socialService.createShareableContent(shareData);
    
    res.json({
      success: true,
      data: { shareId },
      message: 'Shareable content created successfully'
    });
  } catch (error) {
    logger.error('Error creating shareable content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shareable content'
    });
  }
});

// Получение sharing URL
router.get('/share/:shareId/:platform', async (req, res) => {
  try {
    const { shareId, platform } = req.params;
    const { userId } = req.query;
    
    const shareUrl = socialService.getShareUrl(shareId, platform);
    
    if (!shareUrl) {
      return res.status(404).json({
        success: false,
        error: 'Shareable content not found'
      });
    }

    // Отслеживаем sharing
    socialService.trackShare(shareId, platform, userId as string);
    
    res.json({
      success: true,
      data: { shareUrl, platform }
    });
  } catch (error) {
    logger.error('Error getting share URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get share URL'
    });
  }
});

// Отслеживание sharing
router.post('/share/:shareId/track', async (req, res) => {
  try {
    const { shareId } = req.params;
    const { platform, userId } = req.body;
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Platform is required'
      });
    }

    socialService.trackShare(shareId, platform, userId);
    
    res.json({
      success: true,
      message: 'Share tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track share'
    });
  }
});

// Социальные вызовы (Challenges)

// Получение активных вызовов
router.get('/challenges/active', async (req, res) => {
  try {
    const challenges = socialService.getActiveChallenges();
    
    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    logger.error('Error getting active challenges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active challenges'
    });
  }
});

// Создание вызова
router.post('/challenges', async (req, res) => {
  try {
    const { creatorId, ...challengeData } = req.body;
    
    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required'
      });
    }

    const challengeId = socialService.createChallenge(creatorId, challengeData);
    
    res.json({
      success: true,
      data: { challengeId },
      message: 'Challenge created successfully'
    });
  } catch (error) {
    logger.error('Error creating challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create challenge'
    });
  }
});

// Участие в вызове
router.post('/challenges/:challengeId/join', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const success = socialService.joinChallenge(challengeId, userId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to join challenge. Challenge may not exist, be full, or inactive.'
      });
    }

    res.json({
      success: true,
      message: 'Successfully joined challenge'
    });
  } catch (error) {
    logger.error('Error joining challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join challenge'
    });
  }
});

// Уведомления

// Получение уведомлений пользователя
router.get('/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const notifications = socialService.getUserNotifications(userId, limit);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user notifications'
    });
  }
});

// Отметка уведомления как прочитанного
router.patch('/users/:userId/notifications/:notificationId/read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    const success = socialService.markNotificationAsRead(userId, notificationId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Создание уведомления (для тестирования)
router.post('/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const notificationData = req.body;
    
    const notificationId = socialService.createNotification(userId, notificationData);
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create notification. User may not exist or notifications disabled.'
      });
    }

    res.json({
      success: true,
      data: { notificationId },
      message: 'Notification created successfully'
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// Популярные пользователи и рейтинги

// Получение популярных пользователей
router.get('/users/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const popularUsers = socialService.getPopularUsers(limit);
    
    res.json({
      success: true,
      data: popularUsers
    });
  } catch (error) {
    logger.error('Error getting popular users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular users'
    });
  }
});

// Получение полных данных пользователя
router.get('/users/:userId/data/full', async (req, res) => {
  try {
    const { userId } = req.params;
    const fullData = socialService.getAllUserData(userId);
    
    if (!fullData.user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: fullData
    });
  } catch (error) {
    logger.error('Error getting full user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get full user data'
    });
  }
});

// Тестовые данные для демонстрации

// Получение демо-данных
router.get('/demo/data', async (req, res) => {
  try {
    // Возвращаем пример данных для демонстрации
    const demoData = {
      users: [
        {
          id: 'demo-user-1',
          username: 'gamemaster',
          displayName: 'Мастер Игр',
          level: 15,
          status: 'online'
        },
        {
          id: 'demo-user-2',
          username: 'puzzlelover',
          displayName: 'Любитель Головоломок',
          level: 8,
          status: 'away'
        },
        {
          id: 'demo-user-3',
          username: 'speedrunner',
          displayName: 'Спидраннер',
          level: 22,
          status: 'playing'
        }
      ],
      sampleActivities: [
        {
          type: 'game_created',
          content: {
            title: 'Создал новую игру',
            description: 'Космический платформер "Звездный путь"',
            icon: '🚀'
          },
          likes: 12,
          comments: 3
        },
        {
          type: 'achievement_unlocked',
          content: {
            title: 'Разблокировал достижение',
            description: 'Решил 100 головоломок',
            icon: '🧩'
          },
          likes: 8,
          comments: 1
        }
      ],
      stats: {
        totalUsers: 3,
        totalFriendships: 2,
        totalActivities: 3,
        totalChallenges: 1
      }
    };

    res.json({
      success: true,
      data: demoData
    });
  } catch (error) {
    logger.error('Error getting demo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get demo data'
    });
  }
});

export default router; 