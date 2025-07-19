import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash, randomBytes, createCipher, createDecipher } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { logger } from './logger';
import { analyticsService } from './analytics';

// Интерфейсы для системы безопасности
interface SecurityUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  apiKeys: SecurityApiKey[];
  sessions: SecuritySession[];
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: any;
  createdAt: Date;
}

interface SecuritySession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

interface SecurityApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

interface SecurityAuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'sql_injection' | 'xss_attempt' | 'csrf_attempt' | 'suspicious_activity' | 'unauthorized_access';
  source: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'mitigated' | 'resolved';
  description: string;
  evidences: any[];
  detectedAt: Date;
  resolvedAt?: Date;
}

interface SecurityPolicy {
  id: string;
  name: string;
  type: 'authentication' | 'authorization' | 'data_protection' | 'access_control' | 'monitoring';
  rules: any[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityEncryption {
  id: string;
  name: string;
  algorithm: string;
  keySize: number;
  purpose: string;
  isActive: boolean;
  createdAt: Date;
}

class AdvancedSecurityService extends EventEmitter {
  private users: Map<string, SecurityUser> = new Map();
  private roles: Map<string, SecurityRole> = new Map();
  private permissions: Map<string, SecurityPermission> = new Map();
  private sessions: Map<string, SecuritySession> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private threats: Map<string, SecurityThreat> = new Map();
  private policies: Map<string, SecurityPolicy> = new Map();
  private encryptionKeys: Map<string, SecurityEncryption> = new Map();

  private suspiciousIPs: Map<string, any> = new Map();
  private failedAttempts: Map<string, number> = new Map();
  private rateLimits: Map<string, any> = new Map();

  private readonly saltRounds = 12;
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'your-encryption-key';

  constructor() {
    super();
    this.initializeDefaults();
    this.startSecurityMonitoring();
  }

  // Аутентификация и авторизация
  public async createUser(userData: Partial<SecurityUser>): Promise<SecurityUser> {
    const userId = this.generateId();
    const passwordHash = await bcrypt.hash(userData.passwordHash || '', this.saltRounds);

    const user: SecurityUser = {
      id: userId,
      username: userData.username || '',
      email: userData.email || '',
      passwordHash,
      roles: userData.roles || ['user'],
      permissions: userData.permissions || [],
      isActive: true,
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      apiKeys: [],
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(userId, user);
    
    await this.logAuditEvent({
      userId,
      action: 'user_created',
      resource: 'user',
      details: { username: user.username, email: user.email },
      ipAddress: '',
      userAgent: '',
      success: true,
      riskLevel: 'low'
    });

    logger.info(`User created: ${user.username} (${userId})`);
    return user;
  }

  public async authenticateUser(username: string, password: string, ipAddress: string, userAgent: string): Promise<{ success: boolean; user?: SecurityUser; token?: string; message?: string }> {
    const user = Array.from(this.users.values()).find(u => u.username === username || u.email === username);

    if (!user) {
      await this.logAuditEvent({
        action: 'login_failed',
        resource: 'auth',
        details: { username, reason: 'user_not_found' },
        ipAddress,
        userAgent,
        success: false,
        riskLevel: 'medium'
      });
      return { success: false, message: 'Неверные учетные данные' };
    }

    if (!user.isActive) {
      await this.logAuditEvent({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
        details: { username, reason: 'account_disabled' },
        ipAddress,
        userAgent,
        success: false,
        riskLevel: 'medium'
      });
      return { success: false, message: 'Аккаунт заблокирован' };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logAuditEvent({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
        details: { username, reason: 'account_locked' },
        ipAddress,
        userAgent,
        success: false,
        riskLevel: 'high'
      });
      return { success: false, message: 'Аккаунт временно заблокирован' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      user.failedLoginAttempts++;
      
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 минут
        await this.detectThreat({
          type: 'brute_force',
          source: ipAddress,
          target: user.username,
          severity: 'high',
          description: `Множественные неудачные попытки входа для пользователя ${user.username}`
        });
      }

      user.updatedAt = new Date();
      this.users.set(user.id, user);

      await this.logAuditEvent({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
        details: { username, reason: 'invalid_password', attempts: user.failedLoginAttempts },
        ipAddress,
        userAgent,
        success: false,
        riskLevel: user.failedLoginAttempts >= 3 ? 'high' : 'medium'
      });

      return { success: false, message: 'Неверные учетные данные' };
    }

    // Успешный вход
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLogin = new Date();
    user.updatedAt = new Date();

    const token = this.generateToken(user);
    const session = await this.createSession(user.id, token, ipAddress, userAgent);

    this.users.set(user.id, user);

    await this.logAuditEvent({
      userId: user.id,
      action: 'login_success',
      resource: 'auth',
      details: { username, sessionId: session.id },
      ipAddress,
      userAgent,
      success: true,
      riskLevel: 'low'
    });

    logger.info(`User logged in: ${user.username} from ${ipAddress}`);
    return { success: true, user, token };
  }

  public async authorizeUser(token: string, requiredPermission: string): Promise<{ authorized: boolean; user?: SecurityUser; message?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = this.users.get(decoded.userId);

      if (!user || !user.isActive) {
        return { authorized: false, message: 'Пользователь не найден или неактивен' };
      }

      const session = this.sessions.get(decoded.sessionId);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return { authorized: false, message: 'Сессия истекла' };
      }

      // Обновляем активность сессии
      session.lastActivity = new Date();
      this.sessions.set(session.id, session);

      // Проверяем разрешения
      const hasPermission = await this.checkPermission(user, requiredPermission);
      
      if (!hasPermission) {
        await this.logAuditEvent({
          userId: user.id,
          action: 'authorization_failed',
          resource: 'auth',
          details: { requiredPermission },
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          success: false,
          riskLevel: 'medium'
        });
        return { authorized: false, message: 'Недостаточно прав доступа' };
      }

      return { authorized: true, user };
    } catch (error) {
      return { authorized: false, message: 'Недействительный токен' };
    }
  }

  // Управление ролями и разрешениями
  public async createRole(roleData: Partial<SecurityRole>): Promise<SecurityRole> {
    const roleId = this.generateId();
    
    const role: SecurityRole = {
      id: roleId,
      name: roleData.name || '',
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystem: roleData.isSystem || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(roleId, role);
    logger.info(`Role created: ${role.name} (${roleId})`);
    return role;
  }

  public async createPermission(permissionData: Partial<SecurityPermission>): Promise<SecurityPermission> {
    const permissionId = this.generateId();
    
    const permission: SecurityPermission = {
      id: permissionId,
      name: permissionData.name || '',
      description: permissionData.description || '',
      resource: permissionData.resource || '',
      action: permissionData.action || '',
      conditions: permissionData.conditions,
      createdAt: new Date()
    };

    this.permissions.set(permissionId, permission);
    logger.info(`Permission created: ${permission.name} (${permissionId})`);
    return permission;
  }

  private async checkPermission(user: SecurityUser, requiredPermission: string): Promise<boolean> {
    // Проверяем прямые разрешения
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // Проверяем разрешения через роли
    for (const roleName of user.roles) {
      const role = Array.from(this.roles.values()).find(r => r.name === roleName);
      if (role && role.permissions.includes(requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  // Защита от угроз
  public async detectThreat(threatData: Partial<SecurityThreat>): Promise<SecurityThreat> {
    const threatId = this.generateId();
    
    const threat: SecurityThreat = {
      id: threatId,
      type: threatData.type || 'suspicious_activity',
      source: threatData.source || '',
      target: threatData.target || '',
      severity: threatData.severity || 'medium',
      status: 'detected',
      description: threatData.description || '',
      evidences: threatData.evidences || [],
      detectedAt: new Date()
    };

    this.threats.set(threatId, threat);

    await this.logAuditEvent({
      action: 'threat_detected',
      resource: 'security',
      details: threat,
      ipAddress: threat.source,
      userAgent: '',
      success: true,
      riskLevel: threat.severity === 'critical' ? 'critical' : 'high'
    });

    this.emit('threatDetected', threat);
    logger.warn(`Security threat detected: ${threat.type} from ${threat.source}`);
    
    // Автоматические меры реагирования
    await this.respondToThreat(threat);
    
    return threat;
  }

  private async respondToThreat(threat: SecurityThreat): Promise<void> {
    switch (threat.type) {
      case 'brute_force':
        this.suspiciousIPs.set(threat.source, {
          blockedUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 час
          reason: 'brute_force_attack'
        });
        break;
        
      case 'sql_injection':
      case 'xss_attempt':
        this.suspiciousIPs.set(threat.source, {
          blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
          reason: 'malicious_activity'
        });
        break;
        
      case 'unauthorized_access':
        // Дополнительная проверка и возможная блокировка аккаунта
        break;
    }
  }

  // Шифрование данных
  public encryptData(data: string, purpose: string = 'general'): string {
    try {
      const cipher = createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Ошибка шифрования данных');
    }
  }

  public decryptData(encryptedData: string, purpose: string = 'general'): string {
    try {
      const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Ошибка расшифровки данных');
    }
  }

  // API ключи
  public async createApiKey(userId: string, name: string, permissions: string[], expiresIn?: number): Promise<SecurityApiKey> {
    const apiKeyId = this.generateId();
    const key = this.generateApiKey();
    
    const apiKey: SecurityApiKey = {
      id: apiKeyId,
      name,
      key,
      permissions,
      isActive: true,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      createdAt: new Date()
    };

    const user = this.users.get(userId);
    if (user) {
      user.apiKeys.push(apiKey);
      this.users.set(userId, user);
    }

    await this.logAuditEvent({
      userId,
      action: 'api_key_created',
      resource: 'api',
      details: { name, permissions },
      ipAddress: '',
      userAgent: '',
      success: true,
      riskLevel: 'low'
    });

    logger.info(`API key created for user ${userId}: ${name}`);
    return apiKey;
  }

  public async validateApiKey(key: string): Promise<{ valid: boolean; user?: SecurityUser; apiKey?: SecurityApiKey }> {
    for (const user of this.users.values()) {
      const apiKey = user.apiKeys.find(ak => ak.key === key && ak.isActive);
      
      if (apiKey) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return { valid: false };
        }

        apiKey.lastUsed = new Date();
        this.users.set(user.id, user);
        
        return { valid: true, user, apiKey };
      }
    }

    return { valid: false };
  }

  // Сессии
  private async createSession(userId: string, token: string, ipAddress: string, userAgent: string): Promise<SecuritySession> {
    const sessionId = this.generateId();
    
    const session: SecuritySession = {
      id: sessionId,
      userId,
      token,
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    
    const user = this.users.get(userId);
    if (user) {
      user.sessions.push(session);
      this.users.set(userId, user);
    }

    return session;
  }

  public async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);

      await this.logAuditEvent({
        userId: session.userId,
        action: 'session_terminated',
        resource: 'auth',
        details: { sessionId },
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        success: true,
        riskLevel: 'low'
      });
    }
  }

  // Аудит безопасности
  private async logAuditEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: SecurityAuditLog = {
      id: this.generateId(),
      ...event,
      timestamp: new Date()
    };

    this.auditLogs.push(auditLog);

    // Ограничиваем размер лога (последние 10000 записей)
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // Отправляем в аналитику для критических событий
    if (auditLog.riskLevel === 'critical' || auditLog.riskLevel === 'high') {
      await analyticsService.trackEvent('security_event', {
        action: auditLog.action,
        riskLevel: auditLog.riskLevel,
        userId: auditLog.userId,
        resource: auditLog.resource
      });
    }
  }

  // Мониторинг безопасности
  private startSecurityMonitoring(): void {
    // Очистка истекших сессий каждые 10 минут
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 10 * 60 * 1000);

    // Анализ подозрительной активности каждые 5 минут
    setInterval(() => {
      this.analyzeSuspiciousActivity();
    }, 5 * 60 * 1000);

    // Очистка заблокированных IP каждый час
    setInterval(() => {
      this.cleanupBlockedIPs();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        session.isActive = false;
        this.sessions.set(sessionId, session);
      }
    }
  }

  private analyzeSuspiciousActivity(): void {
    // Анализ неудачных попыток входа
    const recentFailedLogins = this.auditLogs
      .filter(log => 
        log.action === 'login_failed' && 
        log.timestamp > new Date(Date.now() - 15 * 60 * 1000) // последние 15 минут
      );

    // Группируем по IP адресам
    const ipFailures = new Map<string, number>();
    recentFailedLogins.forEach(log => {
      const count = ipFailures.get(log.ipAddress) || 0;
      ipFailures.set(log.ipAddress, count + 1);
    });

    // Обнаруживаем подозрительные IP
    for (const [ip, count] of ipFailures.entries()) {
      if (count >= 10) { // 10 неудачных попыток за 15 минут
        this.detectThreat({
          type: 'brute_force',
          source: ip,
          target: 'authentication_system',
          severity: 'high',
          description: `Множественные неудачные попытки входа с IP ${ip}: ${count} попыток за 15 минут`
        });
      }
    }
  }

  private cleanupBlockedIPs(): void {
    const now = new Date();
    for (const [ip, blockInfo] of this.suspiciousIPs.entries()) {
      if (blockInfo.blockedUntil < now) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  // Проверка безопасности
  public checkIPBlocked(ipAddress: string): boolean {
    const blockInfo = this.suspiciousIPs.get(ipAddress);
    return blockInfo && blockInfo.blockedUntil > new Date();
  }

  public async validateInput(input: string, type: 'sql' | 'xss' | 'general' = 'general'): Promise<{ valid: boolean; threat?: string }> {
    switch (type) {
      case 'sql':
        if (this.detectSQLInjection(input)) {
          return { valid: false, threat: 'sql_injection' };
        }
        break;
        
      case 'xss':
        if (this.detectXSS(input)) {
          return { valid: false, threat: 'xss_attempt' };
        }
        break;
    }

    return { valid: true };
  }

  private detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
      /('|\"|;|--|\*|\/\*)/,
      /(\b(SCRIPT|IFRAME|OBJECT|EMBED|LINK|META)\b)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*onerror[^>]*>/gi,
      /<svg[^>]*onload[^>]*>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Вспомогательные методы
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateToken(user: SecurityUser): string {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        roles: user.roles 
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
  }

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }

  private initializeDefaults(): void {
    // Создаем системные роли
    this.createRole({
      name: 'admin',
      description: 'Администратор системы',
      permissions: ['*'],
      isSystem: true
    });

    this.createRole({
      name: 'user',
      description: 'Обычный пользователь',
      permissions: ['games:play', 'games:create', 'profile:edit'],
      isSystem: true
    });

    this.createRole({
      name: 'moderator',
      description: 'Модератор',
      permissions: ['games:moderate', 'users:view', 'reports:handle'],
      isSystem: true
    });

    // Создаем базовые разрешения
    const basePermissions = [
      { name: 'games:play', description: 'Играть в игры', resource: 'games', action: 'play' },
      { name: 'games:create', description: 'Создавать игры', resource: 'games', action: 'create' },
      { name: 'games:moderate', description: 'Модерировать игры', resource: 'games', action: 'moderate' },
      { name: 'users:view', description: 'Просматривать пользователей', resource: 'users', action: 'view' },
      { name: 'users:manage', description: 'Управлять пользователями', resource: 'users', action: 'manage' },
      { name: 'profile:edit', description: 'Редактировать профиль', resource: 'profile', action: 'edit' },
      { name: 'analytics:view', description: 'Просматривать аналитику', resource: 'analytics', action: 'view' },
      { name: 'system:admin', description: 'Администрирование системы', resource: 'system', action: 'admin' }
    ];

    basePermissions.forEach(perm => this.createPermission(perm));

    logger.info('Advanced security service initialized with default roles and permissions');
  }

  // Публичные геттеры
  public getUser(userId: string): SecurityUser | null {
    return this.users.get(userId) || null;
  }

  public getRole(roleId: string): SecurityRole | null {
    return this.roles.get(roleId) || null;
  }

  public getPermission(permissionId: string): SecurityPermission | null {
    return this.permissions.get(permissionId) || null;
  }

  public getThreat(threatId: string): SecurityThreat | null {
    return this.threats.get(threatId) || null;
  }

  public getAuditLogs(filters?: any): SecurityAuditLog[] {
    let logs = [...this.auditLogs];
    
    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.riskLevel) {
        logs = logs.filter(log => log.riskLevel === filters.riskLevel);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= new Date(filters.endDate));
      }
    }
    
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getActiveThreats(): SecurityThreat[] {
    return Array.from(this.threats.values())
      .filter(threat => threat.status === 'detected' || threat.status === 'investigating')
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  public getSecurityStats(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentLogs = this.auditLogs.filter(log => log.timestamp >= last24h);
    const weeklyLogs = this.auditLogs.filter(log => log.timestamp >= last7d);

    return {
      users: {
        total: this.users.size,
        active: Array.from(this.users.values()).filter(u => u.isActive).length,
        locked: Array.from(this.users.values()).filter(u => u.lockedUntil && u.lockedUntil > now).length
      },
      sessions: {
        total: this.sessions.size,
        active: Array.from(this.sessions.values()).filter(s => s.isActive && s.expiresAt > now).length
      },
      threats: {
        total: this.threats.size,
        active: this.getActiveThreats().length,
        critical: Array.from(this.threats.values()).filter(t => t.severity === 'critical').length
      },
      activity: {
        last24h: {
          totalEvents: recentLogs.length,
          failedLogins: recentLogs.filter(l => l.action === 'login_failed').length,
          successfulLogins: recentLogs.filter(l => l.action === 'login_success').length,
          highRiskEvents: recentLogs.filter(l => l.riskLevel === 'high' || l.riskLevel === 'critical').length
        },
        last7d: {
          totalEvents: weeklyLogs.length,
          uniqueUsers: new Set(weeklyLogs.map(l => l.userId).filter(Boolean)).size,
          threatDetections: weeklyLogs.filter(l => l.action === 'threat_detected').length
        }
      },
      blockedIPs: this.suspiciousIPs.size
    };
  }
}

export const advancedSecurityService = new AdvancedSecurityService();
export { AdvancedSecurityService }; 