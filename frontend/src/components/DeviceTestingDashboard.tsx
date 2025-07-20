import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

interface DeviceProfile {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  viewport: { width: number; height: number };
  popular?: boolean;
}

interface DeviceTestResult {
  deviceProfile: DeviceProfile;
  testStartTime: string;
  testEndTime: string;
  duration: number;
  success: boolean;
  performance: {
    averageFps: number;
    memoryUsage: number;
    loadTime: number;
    errorCount: number;
  };
  compatibility: {
    rendering: boolean;
    input: boolean;
    audio: boolean;
    fullscreen: boolean;
  };
  errors: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

interface DeviceTestReport {
  suiteId: string;
  gameId: string;
  executionId: string;
  startTime: string;
  endTime: string;
  summary: {
    totalDevices: number;
    passedDevices: number;
    failedDevices: number;
    averageScore: number;
  };
  results: DeviceTestResult[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'performance' | 'compatibility' | 'ux';
    message: string;
    devices: string[];
  }>;
}

const DeviceTestingDashboard: React.FC = () => {
  const [deviceProfiles, setDeviceProfiles] = useState<DeviceProfile[]>([]);
  const [testReports, setTestReports] = useState<DeviceTestReport[]>([]);
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quick-test');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Form state для создания тестов
  const [gameId, setGameId] = useState('');
  const [gamePath, setGamePath] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
    setupEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Загружаем профили устройств
      const devicesResponse = await fetch('/api/device-testing/device-profiles');
      const devicesData = await devicesResponse.json();
      if (devicesData.success) {
        setDeviceProfiles(devicesData.data);
        // Выбираем популярные устройства по умолчанию
        setSelectedDevices(devicesData.data.filter((d: DeviceProfile) => d.popular).map((d: DeviceProfile) => d.id));
      }

      // Загружаем последние отчеты
      const reportsResponse = await fetch('/api/device-testing/reports?limit=10');
      const reportsData = await reportsResponse.json();
      if (reportsData.success) {
        setTestReports(reportsData.data);
      }

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupEventSource = () => {
    const eventSource = new EventSource('/api/device-testing/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'suite-started':
            setIsTestingInProgress(true);
            setCurrentTest({
              ...data.data,
              status: 'running',
              completedDevices: 0
            });
            break;
          case 'device-testing':
            setCurrentTest((prev: any) => prev ? {
              ...prev,
              currentDevice: data.data.device
            } : null);
            break;
          case 'device-completed':
            setCurrentTest((prev: any) => prev ? {
              ...prev,
              completedDevices: (prev.completedDevices || 0) + 1
            } : null);
            break;
          case 'suite-completed':
            setIsTestingInProgress(false);
            setCurrentTest(null);
            // Перезагружаем отчеты
            loadReports();
            break;
        }
      } catch (error) {
        console.error('Ошибка обработки SSE события:', error);
      }
    };
  };

  const loadReports = async () => {
    try {
      const response = await fetch('/api/device-testing/reports?limit=10');
      const data = await response.json();
      if (data.success) {
        setTestReports(data.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки отчетов:', error);
    }
  };

  const runQuickTest = async () => {
    if (!gameId || !gamePath) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      setIsTestingInProgress(true);
      
      const response = await fetch('/api/device-testing/quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, gamePath })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Быстрое тестирование запущено');
      } else {
        console.error('❌ Ошибка запуска тестирования:', data.error);
        setIsTestingInProgress(false);
      }
    } catch (error) {
      console.error('Ошибка запуска тестирования:', error);
      setIsTestingInProgress(false);
    }
  };

  const createCustomTestSuite = async () => {
    if (!gameId || !gamePath || selectedDevices.length === 0) {
      alert('Заполните все поля и выберите устройства');
      return;
    }

    try {
      // Создаем тестовый набор
      const suiteResponse = await fetch('/api/device-testing/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          gamePath,
          devices: deviceProfiles.filter(d => selectedDevices.includes(d.id))
        })
      });

      const suiteData = await suiteResponse.json();
      if (!suiteData.success) {
        throw new Error(suiteData.error);
      }

      // Запускаем тестирование
      const executeResponse = await fetch(`/api/device-testing/suites/${suiteData.data.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamePath })
      });

      const executeData = await executeResponse.json();
      if (executeData.success) {
        setIsTestingInProgress(true);
        console.log('✅ Кастомное тестирование запущено');
      }
    } catch (error) {
      console.error('Ошибка создания тестового набора:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Device Testing</h1>
          <p className="text-gray-600">Автоматическое тестирование игр на различных устройствах</p>
        </div>

        <Button onClick={loadReports} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Current Test Progress */}
      {isTestingInProgress && currentTest && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="w-5 h-5 mr-2 text-blue-500" />
              Тестирование в процессе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Игра: {currentTest.gameId}</span>
                <span>Устройств: {currentTest.completedDevices || 0} / {currentTest.deviceCount}</span>
              </div>
              <Progress 
                value={((currentTest.completedDevices || 0) / currentTest.deviceCount) * 100} 
                className="w-full"
              />
              {currentTest.currentDevice && (
                <div className="text-sm text-gray-600">
                  Сейчас тестируется: {currentTest.currentDevice}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-test">Быстрый тест</TabsTrigger>
          <TabsTrigger value="custom-test">Настраиваемый тест</TabsTrigger>
          <TabsTrigger value="reports">Отчеты</TabsTrigger>
          <TabsTrigger value="devices">Устройства</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Быстрое тестирование</CardTitle>
              <p className="text-gray-600">Протестируйте игру на популярных устройствах</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">ID игры *</label>
                <Input
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="my-awesome-game"
                  disabled={isTestingInProgress}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Путь к игре *</label>
                <Input
                  value={gamePath}
                  onChange={(e) => setGamePath(e.target.value)}
                  placeholder="/path/to/game"
                  disabled={isTestingInProgress}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Устройства для тестирования:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {deviceProfiles.filter(d => d.popular).map(device => (
                    <div key={device.id} className="flex items-center">
                      {getDeviceIcon(device.type)}
                      <span className="ml-2">{device.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={runQuickTest}
                disabled={isTestingInProgress || !gameId || !gamePath}
                className="w-full"
              >
                {isTestingInProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Тестирование...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Запустить быстрый тест
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настраиваемое тестирование</CardTitle>
              <p className="text-gray-600">Выберите конкретные устройства для тестирования</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ID игры *</label>
                  <Input
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="my-awesome-game"
                    disabled={isTestingInProgress}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Путь к игре *</label>
                  <Input
                    value={gamePath}
                    onChange={(e) => setGamePath(e.target.value)}
                    placeholder="/path/to/game"
                    disabled={isTestingInProgress}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Выберите устройства:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {deviceProfiles.map(device => (
                    <label key={device.id} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevices(prev => [...prev, device.id]);
                          } else {
                            setSelectedDevices(prev => prev.filter(id => id !== device.id));
                          }
                        }}
                        disabled={isTestingInProgress}
                      />
                      {getDeviceIcon(device.type)}
                      <span className="text-sm">{device.name}</span>
                      {device.popular && (
                        <Badge variant="secondary" className="text-xs">популярное</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <Button 
                onClick={createCustomTestSuite}
                disabled={isTestingInProgress || !gameId || !gamePath || selectedDevices.length === 0}
                className="w-full"
              >
                {isTestingInProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Тестирование...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Запустить тестирование ({selectedDevices.length} устройств)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {testReports.length > 0 ? (
            <div className="space-y-4">
              {testReports.map((report) => (
                <Card key={report.executionId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{report.gameId}</span>
                      <Badge className={`${getScoreBadgeColor(report.summary.averageScore)} text-white`}>
                        {report.summary.averageScore}%
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {new Date(report.startTime).toLocaleString()} • 
                      {report.summary.totalDevices} устройств • 
                      {report.summary.passedDevices} успешно
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(report.summary.averageScore)}`}>
                          {report.summary.averageScore}%
                        </div>
                        <div className="text-sm text-gray-600">Общий балл</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {report.summary.passedDevices}
                        </div>
                        <div className="text-sm text-gray-600">Успешно</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {report.summary.failedDevices}
                        </div>
                        <div className="text-sm text-gray-600">Неудачно</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {report.summary.totalDevices}
                        </div>
                        <div className="text-sm text-gray-600">Всего</div>
                      </div>
                    </div>

                    {/* Device Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {report.results.map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            {getDeviceIcon(result.deviceProfile.type)}
                            <span className="ml-2 text-sm">{result.deviceProfile.name}</span>
                          </div>
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* High Priority Recommendations */}
                    {report.recommendations.filter(r => r.priority === 'high').length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Критические рекомендации:</h4>
                        {report.recommendations.filter(r => r.priority === 'high').map((rec, index) => (
                          <Alert key={index} className="mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>{rec.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Пока нет отчетов о тестировании</p>
              <p className="text-sm mt-1">Запустите первый тест для получения данных</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deviceProfiles.map((device) => (
              <Card key={device.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    {getDeviceIcon(device.type)}
                    <span className="ml-2">{device.name}</span>
                    {device.popular && (
                      <Badge variant="secondary" className="ml-auto">популярное</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Тип:</span>
                      <span className="capitalize">{device.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ОС:</span>
                      <span className="uppercase">{device.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Браузер:</span>
                      <span className="capitalize">{device.browser}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Разрешение:</span>
                      <span>{device.viewport.width}×{device.viewport.height}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeviceTestingDashboard; 