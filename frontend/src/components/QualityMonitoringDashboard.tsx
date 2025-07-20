import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Cloud as CloudIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  qualityMonitoringService,
  QualityMetric,
  QualityAlert,
  QualityTrend,
  MonitoringStats,
  DashboardData
} from '../services/qualityMonitoring';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quality-tabpanel-${index}`}
      aria-labelledby={`quality-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const QualityMonitoringDashboard: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<QualityMetric[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<QualityAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [timeWindow, setTimeWindow] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [thresholds, setThresholds] = useState({
    critical: 30,
    high: 50,
    medium: 70,
    low: 85
  });

  // WebSocket event handlers
  const handleMetric = useCallback((metric: QualityMetric) => {
    setRecentMetrics(prev => [metric, ...prev.slice(0, 49)]);
  }, []);

  const handleAlert = useCallback((alert: QualityAlert) => {
    setRecentAlerts(prev => [alert, ...prev.slice(0, 19)]);
  }, []);

  const handleStatsUpdate = useCallback((stats: MonitoringStats) => {
    if (dashboardData) {
      setDashboardData(prev => prev ? {
        ...prev,
        stats: { ...stats, uptime: Date.now() - stats.uptime.getTime() }
      } : null);
    }
  }, [dashboardData]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (!connected) {
      setError('Потеряно соединение с сервером мониторинга');
    } else {
      setError(null);
    }
  }, []);

  useEffect(() => {
    // Подписываемся на события WebSocket
    qualityMonitoringService.addEventListener('metric', handleMetric);
    qualityMonitoringService.addEventListener('alert', handleAlert);
    qualityMonitoringService.addEventListener('stats', handleStatsUpdate);
    qualityMonitoringService.addEventListener('connected', () => handleConnectionChange(true));
    qualityMonitoringService.addEventListener('disconnected', () => handleConnectionChange(false));

    // Подписываемся на мониторинг
    qualityMonitoringService.subscribeToMonitoring({
      userId: 'dashboard-user',
      subscriptions: ['all']
    });

    setIsMonitoring(true);

    // Загружаем начальные данные
    loadDashboardData();

    return () => {
      qualityMonitoringService.removeEventListener('metric', handleMetric);
      qualityMonitoringService.removeEventListener('alert', handleAlert);
      qualityMonitoringService.removeEventListener('stats', handleStatsUpdate);
      qualityMonitoringService.unsubscribeFromMonitoring();
    };
  }, [handleMetric, handleAlert, handleStatsUpdate, handleConnectionChange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000); // Обновляем каждые 30 секунд

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [data, alerts] = await Promise.all([
        qualityMonitoringService.getDashboardData(timeWindow),
        qualityMonitoringService.getAlerts({ limit: 20 })
      ]);

      setDashboardData(data);
      setRecentAlerts(alerts.alerts);

      // Запрашиваем текущие метрики через WebSocket
      qualityMonitoringService.getCurrentMetrics();

    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
      setError('Ошибка загрузки данных мониторинга');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeWindowChange = (newTimeWindow: string) => {
    setTimeWindow(newTimeWindow);
    // Загружаем данные для нового временного окна
    setTimeout(() => loadDashboardData(), 100);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleSimulateData = async () => {
    try {
      await qualityMonitoringService.simulateMetrics(10, 'asset_generation');
      setTimeout(() => loadDashboardData(), 1000);
    } catch (error) {
      console.error('Ошибка симуляции данных:', error);
    }
  };

  const handleUpdateThresholds = async () => {
    try {
      await qualityMonitoringService.setQualityThresholds(thresholds);
    } catch (error) {
      console.error('Ошибка обновления порогов:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#757575';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'good': return <CheckCircleIcon sx={{ color: '#8bc34a' }} />;
      case 'warning': return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'critical': return <ErrorIcon sx={{ color: '#f44336' }} />;
      default: return <RemoveIcon sx={{ color: '#757575' }} />;
    }
  };

  const formatTrendChange = (change: number) => {
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUpIcon : change < 0 ? TrendingDownIcon : RemoveIcon;
    const color = isPositive ? '#4caf50' : change < 0 ? '#f44336' : '#757575';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color }}>
        <Icon sx={{ fontSize: 16, mr: 0.5 }} />
        <Typography variant="body2" sx={{ color }}>
          {isPositive ? '+' : ''}{change}%
        </Typography>
      </Box>
    );
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'];

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>
            📊 Quality Monitoring Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge color={isConnected ? 'success' : 'error'} variant="dot">
              <Chip 
                icon={<CloudIcon />} 
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                size="small"
              />
            </Badge>
            <Chip 
              icon={isMonitoring ? <PlayArrowIcon /> : <PauseIcon />}
              label={isMonitoring ? 'Monitoring' : 'Paused'}
              color={isMonitoring ? 'primary' : 'default'}
              size="small"
            />
            {dashboardData && (
              <Chip 
                icon={getHealthStatusIcon(dashboardData.healthStatus)}
                label={`Health: ${dashboardData.healthStatus}`}
                sx={{ backgroundColor: getHealthStatusColor(dashboardData.healthStatus), color: 'white' }}
                size="small"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Window</InputLabel>
            <Select
              value={timeWindow}
              label="Time Window"
              onChange={(e) => handleTimeWindowChange(e.target.value)}
            >
              <MenuItem value="5m">5 минут</MenuItem>
              <MenuItem value="15m">15 минут</MenuItem>
              <MenuItem value="1h">1 час</MenuItem>
              <MenuItem value="6h">6 часов</MenuItem>
              <MenuItem value="24h">24 часа</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto Refresh"
          />

          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>

          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={handleSimulateData}
            size="small"
          >
            Simulate
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography color="textSecondary" variant="body2">
                    Average Quality
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: qualityMonitoringService.getQualityColor(dashboardData.stats.averageQuality) }}>
                  {dashboardData.stats.averageQuality}/100
                </Typography>
                {dashboardData.trends.qualityChange !== 0 && formatTrendChange(dashboardData.trends.qualityChange)}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MemoryIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography color="textSecondary" variant="body2">
                    Total Metrics
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats.totalMetrics.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {dashboardData.trends.generationCount} in {timeWindow}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography color="textSecondary" variant="body2">
                    Alerts Generated
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats.alertsGenerated}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {recentAlerts.length} recent
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimelineIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography color="textSecondary" variant="body2">
                    Uptime
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {qualityMonitoringService.formatUptime(dashboardData.stats.uptime)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {dashboardData.stats.activeSessions} active sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" icon={<SpeedIcon />} />
          <Tab label="Quality Trends" icon={<TimelineIcon />} />
          <Tab label="Alerts" icon={<WarningIcon />} />
          <Tab label="Metrics" icon={<MemoryIcon />} />
          <Tab label="Settings" icon={<SettingsIcon />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Overview */}
        <Grid container spacing={3}>
          {/* Quality Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quality Trend ({timeWindow})
                </Typography>
                {dashboardData && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[
                      { time: '00:00', quality: dashboardData.trends.averageQuality - 10 },
                      { time: '06:00', quality: dashboardData.trends.averageQuality - 5 },
                      { time: '12:00', quality: dashboardData.trends.averageQuality },
                      { time: '18:00', quality: dashboardData.trends.averageQuality + 3 },
                      { time: '24:00', quality: dashboardData.trends.averageQuality + 1 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="quality" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Issues */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Top Issues ({timeWindow})
                </Typography>
                {dashboardData && dashboardData.trends.topIssues.length > 0 ? (
                  <List>
                    {dashboardData.trends.topIssues.slice(0, 5).map((issue, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip 
                            label={issue.percentage + '%'} 
                            size="small" 
                            color="error"
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={issue.issue}
                          secondary={`${issue.count} occurrences`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">
                    No issues found in this time window
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Alerts */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Recent Alerts
                </Typography>
                {recentAlerts.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Severity</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Message</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentAlerts.slice(0, 10).map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <Chip 
                                label={alert.severity}
                                size="small"
                                sx={{ 
                                  backgroundColor: qualityMonitoringService.getAlertColor(alert.severity),
                                  color: 'white'
                                }}
                              />
                            </TableCell>
                            <TableCell>{alert.type}</TableCell>
                            <TableCell>{alert.message}</TableCell>
                            <TableCell>
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Tooltip title={alert.suggestedActions.join(', ')}>
                                <IconButton size="small">
                                  <SettingsIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="textSecondary">
                    No recent alerts
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Quality Trends */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quality Distribution by Type
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Game Generation', value: 35, color: '#8884d8' },
                        { name: 'Asset Generation', value: 45, color: '#82ca9d' },
                        { name: 'Code Quality', value: 15, color: '#ffc658' },
                        { name: 'Performance', value: 5, color: '#ff7300' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quality Scores by AI Model
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { model: 'OpenAI', quality: 78, count: 120 },
                    { model: 'DeepSeek', quality: 82, count: 95 },
                    { model: 'Claude', quality: 75, count: 65 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="quality" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quality Timeline
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={[
                    { time: '00:00', game: 75, asset: 80, code: 70, performance: 85 },
                    { time: '04:00', game: 78, asset: 82, code: 72, performance: 88 },
                    { time: '08:00', game: 82, asset: 85, code: 75, performance: 90 },
                    { time: '12:00', game: 80, asset: 83, code: 73, performance: 87 },
                    { time: '16:00', game: 85, asset: 88, code: 78, performance: 92 },
                    { time: '20:00', game: 83, asset: 86, code: 76, performance: 89 },
                    { time: '24:00', game: 81, asset: 84, code: 74, performance: 86 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="game" stroke="#8884d8" strokeWidth={2} name="Game Generation" />
                    <Line type="monotone" dataKey="asset" stroke="#82ca9d" strokeWidth={2} name="Asset Generation" />
                    <Line type="monotone" dataKey="code" stroke="#ffc658" strokeWidth={2} name="Code Quality" />
                    <Line type="monotone" dataKey="performance" stroke="#ff7300" strokeWidth={2} name="Performance" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Alerts */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Alert History and Management
                </Typography>
                
                {recentAlerts.map((alert) => (
                  <Accordion key={alert.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Chip 
                          label={alert.severity}
                          size="small"
                          sx={{ 
                            backgroundColor: qualityMonitoringService.getAlertColor(alert.severity),
                            color: 'white',
                            mr: 2
                          }}
                        />
                        <Typography sx={{ flexGrow: 1 }}>{alert.message}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(alert.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Quality Metrics:
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            <Typography variant="body2">
                              Overall Score: {alert.metric.qualityScore}/100
                            </Typography>
                            <Typography variant="body2">
                              Generation Time: {qualityMonitoringService.formatDuration(alert.metric.metadata.generationTime)}
                            </Typography>
                            <Typography variant="body2">
                              AI Model: {alert.metric.metadata.aiModel}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Suggested Actions:
                          </Typography>
                          <List sx={{ pl: 2 }}>
                            {alert.suggestedActions.map((action, index) => (
                              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                                <ListItemText primary={action} />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Metrics */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Recent Quality Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>AI Model</TableCell>
                        <TableCell>Generation Time</TableCell>
                        <TableCell>Issues</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentMetrics.slice(0, 20).map((metric) => (
                        <TableRow key={metric.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: 8 }}>
                                {qualityMonitoringService.getMetricIcon(metric.type)}
                              </span>
                              {metric.type}
                              {metric.subType && (
                                <Chip label={metric.subType} size="small" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography 
                                sx={{ 
                                  color: qualityMonitoringService.getQualityColor(metric.qualityScore),
                                  fontWeight: 'bold'
                                }}
                              >
                                {metric.qualityScore}
                              </Typography>
                              <Typography variant="body2" sx={{ ml: 0.5 }}>
                                /100
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{metric.metadata.aiModel}</TableCell>
                          <TableCell>
                            {qualityMonitoringService.formatDuration(metric.metadata.generationTime)}
                          </TableCell>
                          <TableCell>
                            {metric.details.issues.length > 0 ? (
                              <Tooltip title={metric.details.issues.join(', ')}>
                                <Chip 
                                  label={`${metric.details.issues.length} issues`}
                                  size="small"
                                  color="warning"
                                />
                              </Tooltip>
                            ) : (
                              <Chip label="No issues" size="small" color="success" />
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Quality Thresholds
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Critical Threshold"
                    type="number"
                    value={thresholds.critical}
                    onChange={(e) => setThresholds({ ...thresholds, critical: Number(e.target.value) })}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                  <TextField
                    label="High Threshold"
                    type="number"
                    value={thresholds.high}
                    onChange={(e) => setThresholds({ ...thresholds, high: Number(e.target.value) })}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                  <TextField
                    label="Medium Threshold"
                    type="number"
                    value={thresholds.medium}
                    onChange={(e) => setThresholds({ ...thresholds, medium: Number(e.target.value) })}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                  <TextField
                    label="Low Threshold"
                    type="number"
                    value={thresholds.low}
                    onChange={(e) => setThresholds({ ...thresholds, low: Number(e.target.value) })}
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                  <Button variant="contained" onClick={handleUpdateThresholds}>
                    Update Thresholds
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  System Status
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {isConnected ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary="WebSocket Connection"
                      secondary={isConnected ? 'Connected' : 'Disconnected'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {isMonitoring ? <PlayArrowIcon color="primary" /> : <PauseIcon color="default" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Monitoring Status"
                      secondary={isMonitoring ? 'Active' : 'Paused'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <MemoryIcon color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Metrics Cached"
                      secondary={`${recentMetrics.length} recent metrics`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <RefreshIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Auto Refresh"
                      secondary={autoRefresh ? 'Enabled (30s)' : 'Disabled'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default QualityMonitoringDashboard; 