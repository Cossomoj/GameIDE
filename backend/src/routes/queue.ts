import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { QueueService } from '@/services/queue';
import { LoggerService } from '@/services/logger';

const router = Router();
const queueService = new QueueService();
const logger = new LoggerService();

// GET /api/queue/stats - Статистика очереди
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await queueService.getQueueStats();
    
    res.json({
      success: true,
      queue: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/queue/pause - Приостановка очереди
router.post(
  '/pause',
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.pauseQueue();
    
    logger.info('🚫 Очередь приостановлена администратором');
    
    res.json({
      success: true,
      message: 'Очередь приостановлена',
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/queue/resume - Возобновление очереди
router.post(
  '/resume',
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.resumeQueue();
    
    logger.info('▶️ Очередь возобновлена администратором');
    
    res.json({
      success: true,
      message: 'Очередь возобновлена',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router; 