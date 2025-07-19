import { Router, Request, Response } from 'express';
import { advancedSecurityService } from '../services/advancedSecurity';
import { logger } from '../services/logger';
import { analyticsService } from '../services/analytics';

const router = Router();

// Middleware для проверки IP блокировки
const checkIPBlocked = (req: Request, res: Response, next: any) => {
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  
  if (advancedSecurityService.checkIPBlocked(ipAddress)) {
    return res.status(429).json({
      success: false,
      error: 'IP адрес временно заблокирован из-за подозрительной активности'
    });
  }
  
  next();
};

// POST /api/security/register - регистрация пользователя
router.post('/register', checkIPBlocked, async (req: Request, res: Response) => {
  try {
    const { username, email, password, roles } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Требуются username, email и password'
      });
    }

    // Валидация ввода
    const usernameValidation = await advancedSecurityService.validateInput(username, 'general');
    const emailValidation = await advancedSecurityService.validateInput(email, 'general');

    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимые символы в имени пользователя'
      });
    }

    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимые символы в email'
      });
    }

    const user = await advancedSecurityService.createUser({
      username,
      email,
      passwordHash: password,
      roles: roles || ['user']
    });

    await analyticsService.trackEvent('user_registered', {
      userId: user.id,
      username: user.username,
      email: user.email
    });

    logger.info(`User registered: ${username} (${user.id})`);
    
    // Не возвращаем чувствительную информацию
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при регистрации пользователя'
    });
  }
});

// POST /api/security/login - вход пользователя
router.post('/login', checkIPBlocked, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Требуются username и password'
      });
    }

    const result = await advancedSecurityService.authenticateUser(
      username,
      password,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.message
      });
    }

    await analyticsService.trackEvent('user_login', {
      userId: result.user!.id,
      username: result.user!.username,
      ipAddress,
      userAgent
    });

    // Не возвращаем чувствительную информацию
    const safeUser = {
      id: result.user!.id,
      username: result.user!.username,
      email: result.user!.email,
      roles: result.user!.roles,
      isActive: result.user!.isActive,
      lastLogin: result.user!.lastLogin
    };

    res.json({
      success: true,
      data: {
        user: safeUser,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе в систему'
    });
  }
});

// POST /api/security/logout - выход пользователя
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await advancedSecurityService.terminateSession(sessionId);
    }

    await analyticsService.trackEvent('user_logout', {
      sessionId: sessionId || 'unknown'
    });

    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при выходе из системы'
    });
  }
});

// POST /api/security/verify-token - проверка токена
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token, requiredPermission } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Требуется токен'
      });
    }

    const result = await advancedSecurityService.authorizeUser(
      token,
      requiredPermission || 'basic_access'
    );

    if (!result.authorized) {
      return res.status(403).json({
        success: false,
        error: result.message
      });
    }

    const safeUser = {
      id: result.user!.id,
      username: result.user!.username,
      email: result.user!.email,
      roles: result.user!.roles,
      isActive: result.user!.isActive
    };

    res.json({
      success: true,
      data: {
        authorized: true,
        user: safeUser
      }
    });
  } catch (error) {
    logger.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при проверке токена'
    });
  }
});

// POST /api/security/api-keys - создание API ключа
router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const { userId, name, permissions, expiresIn } = req.body;

    if (!userId || !name || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Требуются userId, name и permissions'
      });
    }

    const apiKey = await advancedSecurityService.createApiKey(
      userId,
      name,
      permissions,
      expiresIn
    );

    await analyticsService.trackEvent('api_key_created', {
      userId,
      name,
      permissions: permissions.length
    });

    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании API ключа'
    });
  }
});

// POST /api/security/validate-api-key - проверка API ключа
router.post('/validate-api-key', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Требуется API ключ'
      });
    }

    const result = await advancedSecurityService.validateApiKey(key);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: 'Недействительный API ключ'
      });
    }

    const safeUser = {
      id: result.user!.id,
      username: result.user!.username,
      email: result.user!.email,
      roles: result.user!.roles
    };

    res.json({
      success: true,
      data: {
        valid: true,
        user: safeUser,
        apiKey: {
          id: result.apiKey!.id,
          name: result.apiKey!.name,
          permissions: result.apiKey!.permissions
        }
      }
    });
  } catch (error) {
    logger.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при проверке API ключа'
    });
  }
});

// POST /api/security/encrypt - шифрование данных
router.post('/encrypt', async (req: Request, res: Response) => {
  try {
    const { data, purpose } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Требуются данные для шифрования'
      });
    }

    const encryptedData = advancedSecurityService.encryptData(data, purpose);

    res.json({
      success: true,
      data: {
        encrypted: encryptedData
      }
    });
  } catch (error) {
    logger.error('Error encrypting data:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при шифровании данных'
    });
  }
});

// POST /api/security/decrypt - расшифровка данных
router.post('/decrypt', async (req: Request, res: Response) => {
  try {
    const { encryptedData, purpose } = req.body;

    if (!encryptedData) {
      return res.status(400).json({
        success: false,
        error: 'Требуются зашифрованные данные'
      });
    }

    const decryptedData = advancedSecurityService.decryptData(encryptedData, purpose);

    res.json({
      success: true,
      data: {
        decrypted: decryptedData
      }
    });
  } catch (error) {
    logger.error('Error decrypting data:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при расшифровке данных'
    });
  }
});

// POST /api/security/validate-input - валидация ввода
router.post('/validate-input', async (req: Request, res: Response) => {
  try {
    const { input, type } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Требуются данные для валидации'
      });
    }

    const result = await advancedSecurityService.validateInput(input, type);

    if (!result.valid) {
      // Логируем попытку атаки
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      
      await advancedSecurityService.detectThreat({
        type: result.threat as any,
        source: ipAddress,
        target: 'input_validation',
        severity: 'medium',
        description: `Обнаружена попытка ${result.threat} атаки через пользовательский ввод`
      });

      return res.status(400).json({
        success: false,
        error: 'Обнаружен потенциально опасный ввод'
      });
    }

    res.json({
      success: true,
      data: {
        valid: true
      }
    });
  } catch (error) {
    logger.error('Error validating input:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при валидации ввода'
    });
  }
});

// GET /api/security/users/:userId - получение пользователя
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = advancedSecurityService.getUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Не возвращаем чувствительную информацию
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении пользователя'
    });
  }
});

// GET /api/security/audit-logs - получение журнала аудита
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { userId, action, riskLevel, startDate, endDate, limit, page } = req.query;

    const filters = {
      userId: userId as string,
      action: action as string,
      riskLevel: riskLevel as string,
      startDate: startDate as string,
      endDate: endDate as string
    };

    const logs = advancedSecurityService.getAuditLogs(filters);
    
    // Пагинация
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: logs.length,
          pages: Math.ceil(logs.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении журнала аудита'
    });
  }
});

// GET /api/security/threats - получение активных угроз
router.get('/threats', async (req: Request, res: Response) => {
  try {
    const { status, severity, type, limit } = req.query;
    
    let threats = advancedSecurityService.getActiveThreats();

    // Фильтрация
    if (status) {
      threats = threats.filter(t => t.status === status);
    }
    if (severity) {
      threats = threats.filter(t => t.severity === severity);
    }
    if (type) {
      threats = threats.filter(t => t.type === type);
    }

    // Ограничение количества
    if (limit) {
      threats = threats.slice(0, parseInt(limit as string));
    }

    res.json({
      success: true,
      data: threats
    });
  } catch (error) {
    logger.error('Error getting threats:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении угроз'
    });
  }
});

// GET /api/security/threats/:threatId - получение конкретной угрозы
router.get('/threats/:threatId', async (req: Request, res: Response) => {
  try {
    const { threatId } = req.params;
    const threat = advancedSecurityService.getThreat(threatId);

    if (!threat) {
      return res.status(404).json({
        success: false,
        error: 'Угроза не найдена'
      });
    }

    res.json({
      success: true,
      data: threat
    });
  } catch (error) {
    logger.error('Error getting threat:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении угрозы'
    });
  }
});

// POST /api/security/threats/:threatId/resolve - разрешение угрозы
router.post('/threats/:threatId/resolve', async (req: Request, res: Response) => {
  try {
    const { threatId } = req.params;
    const { resolution, notes } = req.body;

    const threat = advancedSecurityService.getThreat(threatId);
    if (!threat) {
      return res.status(404).json({
        success: false,
        error: 'Угроза не найдена'
      });
    }

    threat.status = 'resolved';
    threat.resolvedAt = new Date();

    await analyticsService.trackEvent('threat_resolved', {
      threatId,
      type: threat.type,
      severity: threat.severity,
      resolution
    });

    logger.info(`Threat resolved: ${threatId} - ${threat.type}`);

    res.json({
      success: true,
      data: threat
    });
  } catch (error) {
    logger.error('Error resolving threat:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при разрешении угрозы'
    });
  }
});

// GET /api/security/stats - получение статистики безопасности
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = advancedSecurityService.getSecurityStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении статистики безопасности'
    });
  }
});

// POST /api/security/report-threat - ручное сообщение об угрозе
router.post('/report-threat', async (req: Request, res: Response) => {
  try {
    const { type, source, target, description, severity } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Требуются type и description'
      });
    }

    const threat = await advancedSecurityService.detectThreat({
      type,
      source: source || req.ip || '',
      target: target || '',
      severity: severity || 'medium',
      description
    });

    await analyticsService.trackEvent('threat_reported', {
      threatId: threat.id,
      type: threat.type,
      severity: threat.severity
    });

    res.json({
      success: true,
      data: threat
    });
  } catch (error) {
    logger.error('Error reporting threat:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сообщении об угрозе'
    });
  }
});

// GET /api/security/health - проверка состояния системы безопасности
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = advancedSecurityService.getSecurityStats();
    const activeThreats = advancedSecurityService.getActiveThreats();

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      metrics: {
        activeUsers: stats.users.active,
        activeSessions: stats.sessions.active,
        activeThreats: activeThreats.length,
        criticalThreats: activeThreats.filter(t => t.severity === 'critical').length,
        blockedIPs: stats.blockedIPs
      },
      alerts: activeThreats.filter(t => t.severity === 'critical' || t.severity === 'high').length > 0 ? 
        'Обнаружены угрозы высокого уровня' : null
    };

    // Определяем общее состояние
    if (health.metrics.criticalThreats > 0) {
      health.status = 'critical';
    } else if (health.metrics.activeThreats > 5) {
      health.status = 'warning';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting security health:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при проверке состояния безопасности'
    });
  }
});

export default router; 