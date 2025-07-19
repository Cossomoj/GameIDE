import { Router } from 'express';
import { leaderboardsService } from '../services/leaderboards';
import { logger } from '../services/logger';

const router = Router();

// Получение списка доступных лидербордов
router.get('/configs', async (req, res) => {
  try {
    const category = req.query.category as string;
    const configs = leaderboardsService.getLeaderboardConfigs(category);
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('Error getting leaderboard configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard configs'
    });
  }
});

// Получение лидерборда с фильтрацией
router.get('/:leaderboardId', async (req, res) => {
  try {
    const { leaderboardId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const filter = {
      category: req.query.category as string,
      period: req.query.period as string,
      region: req.query.region as string,
      friendsOnly: req.query.friendsOnly === 'true',
      minLevel: req.query.minLevel ? parseInt(req.query.minLevel as string) : undefined,
      maxLevel: req.query.maxLevel ? parseInt(req.query.maxLevel as string) : undefined,
      onlineOnly: req.query.onlineOnly === 'true',
      search: req.query.search as string
    };

    // Очищаем undefined значения
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof typeof filter] === undefined) {
        delete filter[key as keyof typeof filter];
      }
    });

    const leaderboardData = leaderboardsService.getLeaderboard(leaderboardId, filter, userId);
    
    res.json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Leaderboard not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard'
      });
    }
  }
});

// Получение позиции конкретного пользователя
router.get('/:leaderboardId/position/:userId', async (req, res) => {
  try {
    const { leaderboardId, userId } = req.params;
    const position = leaderboardsService.getUserPosition(userId, leaderboardId);
    
    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    logger.error('Error getting user position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user position'
    });
  }
});

// Обновление счета игрока
router.post('/:leaderboardId/score', async (req, res) => {
  try {
    const { leaderboardId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { score, metadata } = req.body;

    if (typeof score !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Score must be a number'
      });
    }

    leaderboardsService.updatePlayerScore(userId, leaderboardId, score, metadata);
    
    const position = leaderboardsService.getUserPosition(userId, leaderboardId);
    
    res.json({
      success: true,
      data: {
        score,
        position
      }
    });
  } catch (error) {
    logger.error('Error updating player score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update score'
    });
  }
});

// Получение социальных функций между игроками
router.get('/social/:targetUserId', async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const socialFeatures = leaderboardsService.getSocialFeatures(userId, targetUserId);
    
    res.json({
      success: true,
      data: socialFeatures
    });
  } catch (error) {
    logger.error('Error getting social features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get social features'
    });
  }
});

// Вызов игрока на соревнование
router.post('/challenge', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const { targetUserId, leaderboardId } = req.body;

    if (!targetUserId || !leaderboardId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID and leaderboard ID are required'
      });
    }

    const challenge = leaderboardsService.challengePlayer(userId, targetUserId, leaderboardId);
    
    res.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    logger.error('Error creating challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create challenge'
    });
  }
});

// Получение активных соревнований пользователя
router.get('/challenges/active', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const challenges = leaderboardsService.getActiveChallenges(userId);
    
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

// Экспорт лидерборда в разных форматах
router.get('/:leaderboardId/export', async (req, res) => {
  try {
    const { leaderboardId } = req.params;
    const format = req.query.format as 'json' | 'csv' | 'xml' || 'json';
    
    const exportedData = leaderboardsService.exportLeaderboard(leaderboardId, format);
    
    // Установка правильного content-type
    let contentType = 'application/json';
    let filename = `leaderboard_${leaderboardId}.json`;
    
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        filename = `leaderboard_${leaderboardId}.csv`;
        break;
      case 'xml':
        contentType = 'application/xml';
        filename = `leaderboard_${leaderboardId}.xml`;
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportedData);
  } catch (error) {
    logger.error('Error exporting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export leaderboard'
    });
  }
});

// Получение статистики по всем лидербордам
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const configs = leaderboardsService.getLeaderboardConfigs();
    
    const overview = configs.map(config => {
      const position = userId ? leaderboardsService.getUserPosition(userId, config.id) : null;
      const leaderboardData = leaderboardsService.getLeaderboard(config.id);
      
      return {
        id: config.id,
        name: config.name,
        description: config.description,
        type: config.type,
        category: config.category,
        period: config.period,
        totalPlayers: leaderboardData.stats.totalPlayers,
        topScore: leaderboardData.stats.topScore,
        averageScore: leaderboardData.stats.averageScore,
        userPosition: position,
        lastUpdated: leaderboardData.stats.lastUpdated
      };
    });
    
    res.json({
      success: true,
      data: {
        leaderboards: overview,
        totalLeaderboards: configs.length
      }
    });
  } catch (error) {
    logger.error('Error getting leaderboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard overview'
    });
  }
});

// Получение топ игроков по категориям
router.get('/top/categories', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const categories = ['arcade', 'puzzle', 'strategy', 'action'];
    
    const topByCategory = categories.map(category => {
      const configs = leaderboardsService.getLeaderboardConfigs(category);
      const topPlayers: any[] = [];
      
      configs.forEach(config => {
        const leaderboard = leaderboardsService.getLeaderboard(config.id);
        const topFromThis = leaderboard.entries.slice(0, 3).map(entry => ({
          ...entry,
          leaderboardName: config.name,
          leaderboardId: config.id
        }));
        topPlayers.push(...topFromThis);
      });
      
      // Сортируем по счету и берем топ
      topPlayers.sort((a, b) => b.score - a.score);
      
      return {
        category,
        topPlayers: topPlayers.slice(0, limit)
      };
    });
    
    res.json({
      success: true,
      data: topByCategory
    });
  } catch (error) {
    logger.error('Error getting top by categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top by categories'
    });
  }
});

// Получение глобального топа игроков
router.get('/global/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const period = req.query.period as string || 'all_time';
    
    // Получаем данные из глобального лидерборда
    const globalLeaderboard = leaderboardsService.getLeaderboard('global_score');
    
    const topPlayers = globalLeaderboard.entries.slice(0, limit).map((entry, index) => ({
      ...entry,
      globalRank: index + 1,
      badge: index < 3 ? ['🥇', '🥈', '🥉'][index] : undefined
    }));
    
    res.json({
      success: true,
      data: {
        topPlayers,
        period,
        totalPlayers: globalLeaderboard.stats.totalPlayers,
        lastUpdated: globalLeaderboard.stats.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error getting global top:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get global top'
    });
  }
});

// Поиск игроков
router.get('/search/players', async (req, res) => {
  try {
    const query = req.query.q as string;
    const leaderboardId = req.query.leaderboard as string || 'global_score';
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const leaderboard = leaderboardsService.getLeaderboard(leaderboardId, { search: query });
    const results = leaderboard.entries.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        query,
        results,
        total: leaderboard.entries.length
      }
    });
  } catch (error) {
    logger.error('Error searching players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search players'
    });
  }
});

// Получение истории изменений ранга пользователя
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const leaderboardId = req.query.leaderboard as string || 'global_score';
    const days = parseInt(req.query.days as string) || 7;
    
    // В реальном приложении здесь была бы история из базы данных
    // Пока генерируем примерные данные
    const currentPosition = leaderboardsService.getUserPosition(userId, leaderboardId);
    
    const history = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      return {
        date: date.toISOString().split('T')[0],
        rank: currentPosition.rank ? currentPosition.rank + Math.floor(Math.random() * 10 - 5) : undefined,
        score: currentPosition.score ? currentPosition.score + Math.floor(Math.random() * 1000 - 500) : undefined
      };
    }).reverse();
    
    res.json({
      success: true,
      data: {
        userId,
        leaderboardId,
        history,
        currentPosition
      }
    });
  } catch (error) {
    logger.error('Error getting user history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user history'
    });
  }
});

// Получение статистики регионов
router.get('/stats/regions', async (req, res) => {
  try {
    const leaderboardId = req.query.leaderboard as string || 'global_score';
    const leaderboard = leaderboardsService.getLeaderboard(leaderboardId);
    
    const regionStats = leaderboard.entries.reduce((acc, entry) => {
      const region = entry.metadata.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          region,
          players: 0,
          totalScore: 0,
          averageScore: 0,
          topPlayer: null
        };
      }
      
      acc[region].players++;
      acc[region].totalScore += entry.score;
      acc[region].averageScore = acc[region].totalScore / acc[region].players;
      
      if (!acc[region].topPlayer || entry.score > acc[region].topPlayer.score) {
        acc[region].topPlayer = {
          username: entry.username,
          score: entry.score,
          rank: entry.rank
        };
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    const sortedRegions = Object.values(regionStats)
      .sort((a: any, b: any) => b.averageScore - a.averageScore);
    
    res.json({
      success: true,
      data: {
        leaderboardId,
        regions: sortedRegions,
        totalRegions: sortedRegions.length
      }
    });
  } catch (error) {
    logger.error('Error getting region stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get region stats'
    });
  }
});

// WebSocket endpoint информация
router.get('/ws/info', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        endpoint: '/ws/leaderboards',
        events: [
          'scoreUpdated',
          'rankChanged', 
          'leaderboardReset',
          'challengeSent',
          'rewardEarned'
        ],
        description: 'Real-time leaderboard updates'
      }
    });
  } catch (error) {
    logger.error('Error getting WebSocket info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket info'
    });
  }
});

export default router; 