import { Router } from 'express';
import { cloudSaveService } from '../services/cloudSave';
import { logger } from '../services/logger';

const router = Router();

// Создание нового сохранения
router.post('/save', async (req, res) => {
  try {
    const { userId, gameId, slotName, data, options } = req.body;

    if (!userId || !gameId || !slotName || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, gameId, slotName, data'
      });
    }

    const save = await cloudSaveService.createSave(
      userId,
      gameId,
      slotName,
      data,
      options
    );

    res.json({
      success: true,
      data: {
        save: {
          id: save.id,
          slotName: save.slotName,
          metadata: save.metadata,
          description: save.description,
          screenshot: save.screenshot,
          tags: save.tags,
          playTime: save.playTime,
          level: save.level,
          progress: save.progress
        }
      }
    });
  } catch (error) {
    logger.error('Error creating save:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create save'
    });
  }
});

// Загрузка сохранения
router.get('/save/:saveId', async (req, res) => {
  try {
    const { saveId } = req.params;
    const data = await cloudSaveService.loadSave(saveId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error loading save:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load save'
    });
  }
});

// Получение списка сохранений пользователя
router.get('/saves/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { gameId, slotName, limit, offset } = req.query;

    let saves = cloudSaveService.getUserSaves(
      userId,
      gameId as string
    );

    // Фильтрация по слоту
    if (slotName) {
      saves = saves.filter(save => save.slotName === slotName);
    }

    // Пагинация
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    const paginatedSaves = saves.slice(offsetNum, offsetNum + limitNum);

    // Убираем данные сохранений из ответа для экономии трафика
    const savesList = paginatedSaves.map(save => ({
      id: save.id,
      slotName: save.slotName,
      metadata: save.metadata,
      description: save.description,
      screenshot: save.screenshot,
      tags: save.tags,
      playTime: save.playTime,
      level: save.level,
      progress: save.progress
    }));

    res.json({
      success: true,
      data: {
        saves: savesList,
        total: saves.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    logger.error('Error getting user saves:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get saves'
    });
  }
});

// Удаление сохранения
router.delete('/save/:saveId', async (req, res) => {
  try {
    const { saveId } = req.params;
    const success = await cloudSaveService.deleteSave(saveId);

    if (success) {
      res.json({
        success: true,
        message: 'Save deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Save not found'
      });
    }
  } catch (error) {
    logger.error('Error deleting save:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete save'
    });
  }
});

// Синхронизация с облаком
router.post('/sync/:saveId', async (req, res) => {
  try {
    const { saveId } = req.params;
    const { forceUpload } = req.body;

    const result = await cloudSaveService.syncWithCloud(saveId, forceUpload);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('Error syncing save:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync save'
    });
  }
});

// Получение конфликтов
router.get('/conflicts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // В реальной реализации здесь был бы метод получения конфликтов пользователя
    const conflicts = []; // cloudSaveService.getUserConflicts(userId);

    res.json({
      success: true,
      data: { conflicts }
    });
  } catch (error) {
    logger.error('Error getting conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conflicts'
    });
  }
});

// Разрешение конфликта
router.post('/resolve-conflict/:saveId', async (req, res) => {
  try {
    const { saveId } = req.params;
    const { resolution } = req.body;

    if (!['use_local', 'use_cloud', 'merge'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution type'
      });
    }

    const success = await cloudSaveService.resolveConflict(saveId, resolution);

    res.json({
      success,
      message: success ? 'Conflict resolved successfully' : 'Failed to resolve conflict'
    });
  } catch (error) {
    logger.error('Error resolving conflict:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve conflict'
    });
  }
});

// Экспорт сохранений
router.get('/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { gameId } = req.query;

    const exportData = await cloudSaveService.exportSaves(userId, gameId as string);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="saves_${userId}_${Date.now()}.json"`);
    res.send(exportData);
  } catch (error) {
    logger.error('Error exporting saves:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export saves'
    });
  }
});

// Импорт сохранений
router.post('/import', async (req, res) => {
  try {
    const { importData } = req.body;

    if (!importData) {
      return res.status(400).json({
        success: false,
        error: 'Import data is required'
      });
    }

    const importedCount = await cloudSaveService.importSaves(importData);

    res.json({
      success: true,
      data: {
        importedCount,
        message: `Successfully imported ${importedCount} saves`
      }
    });
  } catch (error) {
    logger.error('Error importing saves:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import saves'
    });
  }
});

// Массовая синхронизация
router.post('/sync-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { gameId } = req.body;

    const saves = cloudSaveService.getUserSaves(userId, gameId);
    const results = [];

    for (const save of saves) {
      try {
        const result = await cloudSaveService.syncWithCloud(save.id);
        results.push({
          saveId: save.id,
          slotName: save.slotName,
          result
        });
      } catch (error) {
        results.push({
          saveId: save.id,
          slotName: save.slotName,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    const successful = results.filter(r => r.result.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed
        }
      }
    });
  } catch (error) {
    logger.error('Error syncing all saves:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync saves'
    });
  }
});

// Получение статистики
router.get('/stats', async (req, res) => {
  try {
    const stats = cloudSaveService.getStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting save stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

// Проверка состояния сервиса
router.get('/health', async (req, res) => {
  try {
    const stats = cloudSaveService.getStats();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        stats: {
          totalSaves: stats.totalSaves,
          syncQueueSize: stats.syncQueueSize,
          conflictsCount: stats.conflictsCount
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

// Очистка старых сохранений
router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays, dryRun } = req.body;
    
    // В реальной реализации здесь был бы метод очистки
    const cleanupResult = {
      deletedCount: 0,
      freedSpace: 0,
      dryRun: dryRun || false
    };

    res.json({
      success: true,
      data: cleanupResult
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

// Получение информации о слотах сохранений
router.get('/slots', async (req, res) => {
  try {
    // В реальной реализации здесь был бы метод получения слотов
    const slots = [
      {
        name: 'quicksave',
        displayName: 'Быстрое сохранение',
        description: 'Автоматическое сохранение каждые 30 секунд',
        maxSize: 100 * 1024,
        autoSave: true,
        versionsToKeep: 3,
        syncWithCloud: true,
        encryptionEnabled: false
      },
      {
        name: 'checkpoint',
        displayName: 'Контрольная точка',
        description: 'Сохранение на важных этапах игры',
        maxSize: 500 * 1024,
        autoSave: false,
        versionsToKeep: 5,
        syncWithCloud: true,
        encryptionEnabled: true
      },
      {
        name: 'manual',
        displayName: 'Ручное сохранение',
        description: 'Сохранение по желанию игрока',
        maxSize: 1024 * 1024,
        autoSave: false,
        versionsToKeep: 10,
        syncWithCloud: true,
        encryptionEnabled: true
      },
      {
        name: 'settings',
        displayName: 'Настройки',
        description: 'Пользовательские настройки игры',
        maxSize: 50 * 1024,
        autoSave: true,
        versionsToKeep: 1,
        syncWithCloud: true,
        encryptionEnabled: false
      }
    ];

    res.json({
      success: true,
      data: { slots }
    });
  } catch (error) {
    logger.error('Error getting save slots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get save slots'
    });
  }
});

export default router; 