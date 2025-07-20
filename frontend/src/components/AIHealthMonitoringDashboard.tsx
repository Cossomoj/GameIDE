import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  Settings
} from 'lucide-react';

interface AIServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastCheck: string;
  metrics: {
    requestsPerMinute: number;
    successRate: number;
    averageResponseTime: number;
    tokensPerSecond: number;
    queueLength: number;
  };
  errors: Array<{
    timestamp: string;
    error: string;
    context?: any;
  }>;
}

interface AIHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  services: AIServiceHealth[];
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
  failoverStatus: {
    isActive: boolean;
    activeService: string;
    backupServices: string[];
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  resolved: boolean;
}

const AIHealthMonitoringDashboard: React.FC = () => {
  const [healthReport, setHealthReport] = useState<AIHealthReport | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Загружаем initial data
    fetchInitialData();
    
    // Устанавливаем SSE соединение
    setupEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Загружаем health report
      const healthResponse = await fetch('/api/health-monitoring/report');
      const healthData = await healthResponse.json();
      if (healthData.success) {
        setHealthReport(healthData.data);
      }

      // Загружаем alerts
      const alertsResponse = await fetch('/api/health-monitoring/alerts');
      const alertsData = await alertsResponse.json();
      if (alertsData.success) {
        setAlerts(alertsData.data);
      }

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupEventSource = () => {
    const eventSource = new EventSource('/api/health-monitoring/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('✅ Подключение к мониторингу установлено');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'initial':
            setHealthReport(data.data);
            break;
          case 'health-update':
            setHealthReport(data.data);
            break;
          case 'alert':
            setAlerts(prev => [data.data, ...prev.slice(0, 49)]);
            break;
          case 'failover':
            // Показываем уведомление о failover
            console.warn('🔄 Failover активирован:', data.data);
            break;
          case 'ping':
            // Keep-alive ping
            break;
        }
      } catch (error) {
        console.error('Ошибка обработки SSE события:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error('❌ Ошибка подключения к мониторингу');
      
      // Переподключение через 5 секунд
      setTimeout(() => {
        setupEventSource();
      }, 5000);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      case 'critical': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleForceFailover = async (targetService: string) => {
    try {
      const response = await fetch(`/api/health-monitoring/failover/${targetService}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Принудительное переключение пользователем' })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('✅ Failover выполнен:', data.message);
      } else {
        console.error('❌ Ошибка failover:', data.error);
      }
    } catch (error) {
      console.error('Ошибка выполнения failover:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/health-monitoring/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ));
      }
    } catch (error) {
      console.error('Ошибка разрешения alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Загрузка мониторинга...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Health Monitoring</h1>
          <p className="text-gray-600">Мониторинг здоровья AI сервисов в реальном времени</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Подключено' : 'Отключено'}
          </span>
          <Button 
            onClick={fetchInitialData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(healthReport.overallStatus)}
              <span className="ml-2">Общий статус системы</span>
              <Badge 
                className={`ml-auto ${getStatusColor(healthReport.overallStatus)} text-white`}
              >
                {healthReport.overallStatus.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {healthReport.summary.healthyServices}
                </div>
                <div className="text-sm text-gray-600">Здоровых</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {healthReport.summary.degradedServices}
                </div>
                <div className="text-sm text-gray-600">Деградированных</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {healthReport.summary.unhealthyServices}
                </div>
                <div className="text-sm text-gray-600">Проблемных</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {healthReport.summary.totalServices}
                </div>
                <div className="text-sm text-gray-600">Всего</div>
              </div>
            </div>

            {/* Failover Status */}
            {healthReport.failoverStatus.isActive && (
              <Alert className="mt-4">
                <Zap className="w-4 h-4" />
                <AlertDescription>
                  <strong>Failover активен:</strong> Используется сервис {healthReport.failoverStatus.activeService}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="services">Сервисы</TabsTrigger>
          <TabsTrigger value="alerts">Уведомления</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {healthReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthReport.services.map((service) => (
                <Card key={service.serviceName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="capitalize">{service.serviceName}</span>
                      {getStatusIcon(service.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Время отклика:</span>
                        <span className="text-sm font-medium">{service.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Успешность:</span>
                        <span className="text-sm font-medium">{service.metrics.successRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ошибки:</span>
                        <span className="text-sm font-medium">{service.errorRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Uptime:</span>
                        <span className="text-sm font-medium">{service.uptime}%</span>
                      </div>
                    </div>

                    {service.status !== 'healthy' && (
                      <Button
                        onClick={() => handleForceFailover(service.serviceName)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                      >
                        Переключиться на этот сервис
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {healthReport && (
            <div className="space-y-4">
              {healthReport.services.map((service) => (
                <Card key={service.serviceName}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{service.serviceName}</span>
                      <Badge className={`${getStatusColor(service.status)} text-white`}>
                        {service.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Время отклика</div>
                        <div className="text-lg font-semibold">{service.responseTime}ms</div>
                        <Progress value={Math.min(100, (service.responseTime / 1000) * 100)} className="mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Успешность</div>
                        <div className="text-lg font-semibold">{service.metrics.successRate}%</div>
                        <Progress value={service.metrics.successRate} className="mt-1" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Токены/сек</div>
                        <div className="text-lg font-semibold">{service.metrics.tokensPerSecond}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Очередь</div>
                        <div className="text-lg font-semibold">{service.metrics.queueLength}</div>
                      </div>
                    </div>

                    {service.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Последние ошибки:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {service.errors.slice(0, 3).map((error, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                              <div className="font-medium">{new Date(error.timestamp).toLocaleTimeString()}</div>
                              <div>{error.error}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-2">
            {alerts.filter(alert => !alert.resolved).map((alert) => (
              <Alert key={alert.id} className={`
                ${alert.severity === 'critical' ? 'border-red-500 bg-red-50' : ''}
                ${alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
                ${alert.severity === 'info' ? 'border-blue-500 bg-blue-50' : ''}
              `}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Bell className="w-4 h-4 mr-2" />
                      <Badge variant="secondary" className="mr-2">
                        {alert.severity}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {alert.service} • {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <AlertDescription className="mt-1">
                      {alert.message}
                    </AlertDescription>
                  </div>
                  <Button
                    onClick={() => resolveAlert(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Закрыть
                  </Button>
                </div>
              </Alert>
            ))}
            
            {alerts.filter(alert => !alert.resolved).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Нет активных уведомлений</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {healthReport && healthReport.recommendations.length > 0 ? (
            <div className="space-y-3">
              {healthReport.recommendations.map((rec, index) => (
                <Card key={index} className={`
                  ${rec.priority === 'high' ? 'border-red-200 bg-red-50' : ''}
                  ${rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : ''}
                  ${rec.priority === 'low' ? 'border-green-200 bg-green-50' : ''}
                `}>
                  <CardContent className="pt-4">
                    <div className="flex items-start">
                      <Badge 
                        variant="secondary" 
                        className={`mr-3 ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{rec.message}</p>
                        <p className="text-sm text-gray-600 mt-1">{rec.action}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Система работает оптимально</p>
              <p className="text-sm mt-1">Рекомендаций нет</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIHealthMonitoringDashboard; 