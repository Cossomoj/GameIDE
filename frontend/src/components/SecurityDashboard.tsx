import React, { useState, useEffect, useMemo } from 'react';
import { Shield, AlertTriangle, Users, Eye, Key, Lock, Unlock, Ban, CheckCircle, XCircle, Clock, Activity, Globe, Smartphone, Monitor, Search, Filter, Download, RefreshCw, Settings, Bell, FileText, BarChart3, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

interface SecurityUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  twoFactorEnabled: boolean;
  createdAt: Date;
}

interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'sql_injection' | 'xss_attempt' | 'csrf_attempt' | 'suspicious_activity' | 'unauthorized_access';
  source: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'mitigated' | 'resolved';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

interface AuditLog {
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

interface SecurityStats {
  users: {
    total: number;
    active: number;
    locked: number;
  };
  sessions: {
    total: number;
    active: number;
  };
  threats: {
    total: number;
    active: number;
    critical: number;
  };
  activity: {
    last24h: {
      totalEvents: number;
      failedLogins: number;
      successfulLogins: number;
      highRiskEvents: number;
    };
    last7d: {
      totalEvents: number;
      uniqueUsers: number;
      threatDetections: number;
    };
  };
  blockedIPs: number;
}

interface SecurityDashboardProps {
  onThreatDetected?: (threat: SecurityThreat) => void;
  onUserAction?: (action: string, userId: string) => void;
  onError?: (error: string) => void;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  onThreatDetected,
  onUserAction,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'users' | 'audit' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Данные
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Фильтры и поиск
  const [threatFilter, setThreatFilter] = useState({
    severity: '',
    type: '',
    status: ''
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState({
    action: '',
    riskLevel: '',
    timeRange: '24h'
  });

  // Модальные окна
  const [showThreatDetails, setShowThreatDetails] = useState<SecurityThreat | null>(null);
  const [showUserDetails, setShowUserDetails] = useState<SecurityUser | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Автообновление каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadThreats(),
        loadAuditLogs()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
      onError?.('Ошибка при загрузке данных безопасности');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadStats(),
        loadThreats(),
        loadAuditLogs()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/security/stats');
      const result = await response.json();
      if (result.success) {
        setSecurityStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadThreats = async () => {
    try {
      const params = new URLSearchParams();
      if (threatFilter.severity) params.append('severity', threatFilter.severity);
      if (threatFilter.type) params.append('type', threatFilter.type);
      if (threatFilter.status) params.append('status', threatFilter.status);
      
      const response = await fetch(`/api/security/threats?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setThreats(result.data);
      }
    } catch (error) {
      console.error('Error loading threats:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilter.action) params.append('action', auditFilter.action);
      if (auditFilter.riskLevel) params.append('riskLevel', auditFilter.riskLevel);
      if (auditFilter.timeRange === '24h') {
        params.append('startDate', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      } else if (auditFilter.timeRange === '7d') {
        params.append('startDate', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      }
      params.append('limit', '100');

      const response = await fetch(`/api/security/audit-logs?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setAuditLogs(result.data.logs);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const handleResolveThreat = async (threatId: string) => {
    try {
      const response = await fetch(`/api/security/threats/${threatId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution: 'manual_review',
          notes: 'Resolved manually from dashboard'
        }),
      });

      const result = await response.json();
      if (result.success) {
        loadThreats();
        setShowThreatDetails(null);
      } else {
        onError?.(result.error || 'Ошибка при разрешении угрозы');
      }
    } catch (error) {
      console.error('Error resolving threat:', error);
      onError?.('Ошибка при разрешении угрозы');
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      // Здесь должен быть вызов API для блокировки пользователя
      onUserAction?.('block', userId);
      alert('Пользователь заблокирован');
    } catch (error) {
      console.error('Error blocking user:', error);
      onError?.('Ошибка при блокировке пользователя');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'detected': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'investigating': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'mitigated': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredThreats = useMemo(() => {
    return threats.filter(threat => {
      if (threatFilter.severity && threat.severity !== threatFilter.severity) return false;
      if (threatFilter.type && threat.type !== threatFilter.type) return false;
      if (threatFilter.status && threat.status !== threatFilter.status) return false;
      return true;
    });
  }, [threats, threatFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditFilter.action && !log.action.includes(auditFilter.action)) return false;
      if (auditFilter.riskLevel && log.riskLevel !== auditFilter.riskLevel) return false;
      return true;
    });
  }, [auditLogs, auditFilter]);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и управление */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Shield className="w-6 h-6 text-blue-500 mr-2" />
              Панель безопасности
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-0 overflow-x-auto">
          {[
            { id: 'overview', name: 'Обзор', icon: '📊' },
            { id: 'threats', name: 'Угрозы', icon: '⚠️' },
            { id: 'users', name: 'Пользователи', icon: '👥' },
            { id: 'audit', name: 'Аудит', icon: '📋' },
            { id: 'settings', name: 'Настройки', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Обзор */}
        {activeTab === 'overview' && securityStats && (
          <div className="space-y-6">
            {/* Ключевые метрики */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Активные пользователи</p>
                    <p className="text-2xl font-bold text-blue-900">{securityStats.users.active}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Из {securityStats.users.total} всего
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Активные сессии</p>
                    <p className="text-2xl font-bold text-green-900">{securityStats.sessions.active}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2 text-xs text-green-600">
                  Из {securityStats.sessions.total} всего
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-medium">Активные угрозы</p>
                    <p className="text-2xl font-bold text-red-900">{securityStats.threats.active}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="mt-2 text-xs text-red-600">
                  {securityStats.threats.critical} критических
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Заблокированные IP</p>
                    <p className="text-2xl font-bold text-purple-900">{securityStats.blockedIPs}</p>
                  </div>
                  <Ban className="w-8 h-8 text-purple-500" />
                </div>
                <div className="mt-2 text-xs text-purple-600">
                  Автоматически
                </div>
              </div>
            </div>

            {/* Активность за 24 часа */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Активность за 24 часа</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{securityStats.activity.last24h.totalEvents}</div>
                  <div className="text-sm text-gray-600">Всего событий</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{securityStats.activity.last24h.successfulLogins}</div>
                  <div className="text-sm text-gray-600">Успешных входов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{securityStats.activity.last24h.failedLogins}</div>
                  <div className="text-sm text-gray-600">Неудачных входов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{securityStats.activity.last24h.highRiskEvents}</div>
                  <div className="text-sm text-gray-600">Событий высокого риска</div>
                </div>
              </div>
            </div>

            {/* Недавние угрозы */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Недавние угрозы</h3>
              {threats.slice(0, 5).length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Угроз не обнаружено
                </div>
              ) : (
                <div className="space-y-3">
                  {threats.slice(0, 5).map(threat => (
                    <div
                      key={threat.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(threat.status)}
                        <div>
                          <div className="font-medium text-gray-900">{threat.description}</div>
                          <div className="text-sm text-gray-500">
                            {threat.source} • {new Date(threat.detectedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(threat.severity)}`}>
                        {threat.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Угрозы */}
        {activeTab === 'threats' && (
          <div className="space-y-6">
            {/* Фильтры */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={threatFilter.severity}
                  onChange={(e) => setThreatFilter({ ...threatFilter, severity: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все уровни</option>
                  <option value="critical">Критический</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>

                <select
                  value={threatFilter.type}
                  onChange={(e) => setThreatFilter({ ...threatFilter, type: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все типы</option>
                  <option value="brute_force">Брутфорс</option>
                  <option value="sql_injection">SQL инъекция</option>
                  <option value="xss_attempt">XSS атака</option>
                  <option value="suspicious_activity">Подозрительная активность</option>
                </select>

                <select
                  value={threatFilter.status}
                  onChange={(e) => setThreatFilter({ ...threatFilter, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все статусы</option>
                  <option value="detected">Обнаружено</option>
                  <option value="investigating">Расследуется</option>
                  <option value="mitigated">Предотвращено</option>
                  <option value="resolved">Разрешено</option>
                </select>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={loadThreats}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Применить фильтры
                </button>
                <span className="text-sm text-gray-500">
                  Найдено: {filteredThreats.length} угроз
                </span>
              </div>
            </div>

            {/* Список угроз */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredThreats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Угроз не найдено
                </div>
              ) : (
                filteredThreats.map(threat => (
                  <div
                    key={threat.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(threat.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{threat.description}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(threat.severity)}`}>
                              {threat.severity}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Источник:</span> {threat.source}
                            </div>
                            <div>
                              <span className="font-medium">Цель:</span> {threat.target}
                            </div>
                            <div>
                              <span className="font-medium">Обнаружено:</span> {new Date(threat.detectedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowThreatDetails(threat)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Подробнее
                        </button>
                        {threat.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolveThreat(threat.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Разрешить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Пользователи */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Поиск */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Список пользователей */}
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Пользователи не найдены
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center">
                            {user.username}
                            {user.isActive ? (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 ml-2" />
                            )}
                            {user.twoFactorEnabled && (
                              <Lock className="w-4 h-4 text-blue-500 ml-1" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-xs text-gray-500">
                            Роли: {user.roles.join(', ')} • 
                            Неудачных попыток: {user.failedLoginAttempts} •
                            Последний вход: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Никогда'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowUserDetails(user)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Подробнее
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={() => handleBlockUser(user.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Заблокировать
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Разблокировать
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Аудит */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Фильтры */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={auditFilter.action}
                  onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все действия</option>
                  <option value="login">Вход</option>
                  <option value="logout">Выход</option>
                  <option value="user_created">Создание пользователя</option>
                  <option value="threat_detected">Обнаружение угрозы</option>
                </select>

                <select
                  value={auditFilter.riskLevel}
                  onChange={(e) => setAuditFilter({ ...auditFilter, riskLevel: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все уровни риска</option>
                  <option value="critical">Критический</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>

                <select
                  value={auditFilter.timeRange}
                  onChange={(e) => setAuditFilter({ ...auditFilter, timeRange: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="24h">Последние 24 часа</option>
                  <option value="7d">Последние 7 дней</option>
                  <option value="30d">Последние 30 дней</option>
                </select>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={loadAuditLogs}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Применить фильтры
                </button>
                <span className="text-sm text-gray-500">
                  Найдено: {filteredAuditLogs.length} записей
                </span>
              </div>
            </div>

            {/* Журнал аудита */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Время
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действие
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP адрес
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Риск
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.userId || 'Система'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRiskLevelIcon(log.riskLevel)}
                            <span className="ml-2 text-sm text-gray-900">{log.riskLevel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки безопасности</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Автоматическая блокировка IP</h4>
                    <p className="text-sm text-gray-500">Блокировать IP адреса при подозрительной активности</p>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Включено
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Двухфакторная аутентификация</h4>
                    <p className="text-sm text-gray-500">Требовать 2FA для всех новых пользователей</p>
                  </div>
                  <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                    Отключено
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Мониторинг в реальном времени</h4>
                    <p className="text-sm text-gray-500">Отслеживать подозрительную активность в реальном времени</p>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Включено
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Уведомления о безопасности</h4>
                    <p className="text-sm text-gray-500">Отправлять уведомления о критических событиях</p>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Включено
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно деталей угрозы */}
      {showThreatDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Детали угрозы</h3>
              <button
                onClick={() => setShowThreatDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Тип</label>
                  <div className="mt-1 text-sm text-gray-900">{showThreatDetails.type}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Уровень</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(showThreatDetails.severity)}`}>
                    {showThreatDetails.severity}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Описание</label>
                <div className="mt-1 text-sm text-gray-900">{showThreatDetails.description}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Источник</label>
                  <div className="mt-1 text-sm text-gray-900">{showThreatDetails.source}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Цель</label>
                  <div className="mt-1 text-sm text-gray-900">{showThreatDetails.target}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Обнаружено</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(showThreatDetails.detectedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(showThreatDetails.status)}
                    <span className="ml-2 text-sm text-gray-900">{showThreatDetails.status}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowThreatDetails(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
              >
                Закрыть
              </button>
              {showThreatDetails.status !== 'resolved' && (
                <button
                  onClick={() => handleResolveThreat(showThreatDetails.id)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Разрешить угрозу
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей пользователя */}
      {showUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Детали пользователя</h3>
              <button
                onClick={() => setShowUserDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Имя пользователя</label>
                <div className="mt-1 text-sm text-gray-900">{showUserDetails.username}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">{showUserDetails.email}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Роли</label>
                <div className="mt-1 text-sm text-gray-900">{showUserDetails.roles.join(', ')}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <div className="mt-1 flex items-center">
                    {showUserDetails.isActive ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mr-2" />
                    )}
                    <span className="text-sm text-gray-900">
                      {showUserDetails.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">2FA</label>
                  <div className="mt-1 flex items-center">
                    {showUserDetails.twoFactorEnabled ? (
                      <Lock className="w-4 h-4 text-blue-500 mr-2" />
                    ) : (
                      <Unlock className="w-4 h-4 text-gray-500 mr-2" />
                    )}
                    <span className="text-sm text-gray-900">
                      {showUserDetails.twoFactorEnabled ? 'Включена' : 'Отключена'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Последний вход</label>
                <div className="mt-1 text-sm text-gray-900">
                  {showUserDetails.lastLogin ? 
                    new Date(showUserDetails.lastLogin).toLocaleString() : 
                    'Никогда'
                  }
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Неудачных попыток входа</label>
                <div className="mt-1 text-sm text-gray-900">{showUserDetails.failedLoginAttempts}</div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowUserDetails(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
              >
                Закрыть
              </button>
              <button
                onClick={() => handleBlockUser(showUserDetails.id)}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  showUserDetails.isActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {showUserDetails.isActive ? 'Заблокировать' : 'Разблокировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard; 