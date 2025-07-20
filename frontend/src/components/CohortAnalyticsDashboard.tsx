import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CompareArrows as CompareIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  cohortAnalyticsService,
  CohortDefinition,
  CohortMetrics,
  CohortInsight,
  CohortComparison,
  CohortHealthScore,
  RetentionForecast
} from '../services/cohortAnalytics';

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
      id={`cohort-tabpanel-${index}`}
      aria-labelledby={`cohort-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CohortAnalyticsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [cohorts, setCohorts] = useState<CohortDefinition[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [cohortMetrics, setCohortMetrics] = useState<CohortMetrics | null>(null);
  const [cohortInsights, setCohortInsights] = useState<CohortInsight[]>([]);
  const [healthScore, setHealthScore] = useState<CohortHealthScore | null>(null);
  const [forecast, setForecast] = useState<RetentionForecast | null>(null);
  const [comparison, setComparison] = useState<CohortComparison | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: '',
    description: '',
    criteria: [{
      type: 'event' as const,
      property: '',
      value: '',
      operator: 'equals' as const
    }],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadCohortData(selectedCohort);
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      const data = await cohortAnalyticsService.getCohorts();
      setCohorts(data);
      if (data.length > 0 && !selectedCohort) {
        setSelectedCohort(data[0].id);
      }
    } catch (err) {
      setError('Failed to load cohorts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCohortData = async (cohortId: string) => {
    try {
      setLoading(true);
      const [metrics, insights, health, forecastData] = await Promise.all([
        cohortAnalyticsService.getCohortMetrics(cohortId),
        cohortAnalyticsService.getCohortInsights(cohortId),
        cohortAnalyticsService.getCohortHealthScore(cohortId),
        cohortAnalyticsService.getRetentionForecast(cohortId, 12)
      ]);
      
      setCohortMetrics(metrics);
      setCohortInsights(insights);
      setHealthScore(health);
      setForecast(forecastData);
    } catch (err) {
      setError('Failed to load cohort data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async () => {
    try {
      setLoading(true);
      const cohort = await cohortAnalyticsService.createCohort(newCohort);
      setCohorts([...cohorts, cohort]);
      setCreateDialogOpen(false);
      setNewCohort({
        name: '',
        description: '',
        criteria: [{
          type: 'event',
          property: '',
          value: '',
          operator: 'equals'
        }],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      });
    } catch (err) {
      setError('Failed to create cohort');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareCohorts = async () => {
    if (selectedForComparison.length < 2) return;
    
    try {
      setLoading(true);
      const comparisonData = await cohortAnalyticsService.compareCohorts(selectedForComparison);
      setComparison(comparisonData);
      setTabValue(4); // Switch to comparison tab
    } catch (err) {
      setError('Failed to compare cohorts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!selectedCohort) return;
    
    try {
      const blob = await cohortAnalyticsService.exportCohortData(selectedCohort);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort-${selectedCohort}-data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedCohort) return;
    
    try {
      setLoading(true);
      await cohortAnalyticsService.recalculateCohortMetrics(selectedCohort);
      await loadCohortData(selectedCohort);
    } catch (err) {
      setError('Failed to recalculate metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#4caf50';
      case 'declining': return '#f44336';
      case 'stable': return '#ff9800';
      default: return '#757575';
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'];

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Cohort Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Cohort</InputLabel>
          <Select
            value={selectedCohort || ''}
            label="Select Cohort"
            onChange={(e) => setSelectedCohort(e.target.value)}
          >
            {cohorts.map((cohort) => (
              <MenuItem key={cohort.id} value={cohort.id}>
                {cohort.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Cohort
        </Button>

        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRecalculate}
          disabled={!selectedCohort}
        >
          Recalculate
        </Button>

        <Button
          startIcon={<DownloadIcon />}
          onClick={handleExportData}
          disabled={!selectedCohort}
        >
          Export Data
        </Button>

        <Button
          startIcon={<CompareIcon />}
          onClick={handleCompareCohorts}
          disabled={selectedForComparison.length < 2}
        >
          Compare ({selectedForComparison.length})
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" icon={<AssessmentIcon />} />
          <Tab label="Retention" icon={<TimelineIcon />} />
          <Tab label="Insights" icon={<InsightsIcon />} />
          <Tab label="Health Score" icon={<TrendingUpIcon />} />
          <Tab label="Comparison" icon={<CompareIcon />} />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Overview */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {cohortMetrics?.totalUsers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  30-Day Retention
                </Typography>
                <Typography variant="h4">
                  {cohortMetrics?.retentionCurve.find(r => r.period === 30)?.percentage.toFixed(1) || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average LTV
                </Typography>
                <Typography variant="h4">
                  ${cohortMetrics?.ltvCurve[cohortMetrics.ltvCurve.length - 1]?.cumulative.toFixed(2) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Session Duration
                </Typography>
                <Typography variant="h4">
                  {Math.round(cohortMetrics?.engagement.averageSessionDuration || 0)}s
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cohort List with Selection */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  All Cohorts
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              selectedForComparison.length > 0 && 
                              selectedForComparison.length < cohorts.length
                            }
                            checked={selectedForComparison.length === cohorts.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedForComparison(cohorts.map(c => c.id));
                              } else {
                                setSelectedForComparison([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Users</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cohorts.map((cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedForComparison.includes(cohort.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForComparison([...selectedForComparison, cohort.id]);
                                } else {
                                  setSelectedForComparison(
                                    selectedForComparison.filter(id => id !== cohort.id)
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>{cohort.name}</TableCell>
                          <TableCell>{cohort.description}</TableCell>
                          <TableCell>
                            {selectedCohort === cohort.id ? cohortMetrics?.totalUsers || '-' : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(cohort.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => setSelectedCohort(cohort.id)}
                              variant={selectedCohort === cohort.id ? 'contained' : 'outlined'}
                            >
                              {selectedCohort === cohort.id ? 'Selected' : 'Select'}
                            </Button>
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

      <TabPanel value={tabValue} index={1}>
        {/* Retention */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Retention Curve
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cohortMetrics?.retentionCurve || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Retention %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  LTV Curve
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cohortMetrics?.ltvCurve || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Cumulative LTV"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {forecast && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Retention Forecast
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={forecast.predictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#ff7300" 
                        strokeWidth={2}
                        name="Predicted"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confidence_upper" 
                        stroke="#ff7300" 
                        strokeDasharray="5 5"
                        name="Upper Bound"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confidence_lower" 
                        stroke="#ff7300" 
                        strokeDasharray="5 5"
                        name="Lower Bound"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Confidence: {(forecast.confidence * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Insights */}
        <Grid container spacing={3}>
          {cohortInsights.map((insight, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {insight.title}
                    </Typography>
                    <Chip 
                      label={insight.impact} 
                      color={getImpactColor(insight.impact) as any}
                      size="small"
                    />
                    <Chip 
                      label={`${(insight.confidence * 100).toFixed(1)}% confident`}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {insight.description}
                  </Typography>
                  {insight.recommendation && (
                    <Alert severity="info">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Health Score */}
        {healthScore && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Overall Health Score
                </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={healthScore.overall * 100}
                      size={80}
                      thickness={4}
                    />
                    <Typography variant="h3" sx={{ ml: 2 }}>
                      {(healthScore.overall * 100).toFixed(0)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Component Scores
                  </Typography>
                  {[
                    { label: 'Retention', value: healthScore.retention },
                    { label: 'LTV', value: healthScore.ltv },
                    { label: 'Engagement', value: healthScore.engagement },
                    { label: 'Growth', value: healthScore.growth }
                  ].map((component) => (
                    <Box key={component.label} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{component.label}</Typography>
                        <Typography variant="body2">
                          {(component.value * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={component.value * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Health Factors
                  </Typography>
                  {healthScore.factors.map((factor, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" sx={{ flexGrow: 1 }}>
                          {factor.factor}
                        </Typography>
                        <Chip 
                          label={factor.trend}
                          size="small"
                          sx={{ 
                            backgroundColor: getTrendColor(factor.trend),
                            color: 'white'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ minWidth: 60 }}>
                          Impact:
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.abs(factor.impact) * 100}
                          sx={{ 
                            flexGrow: 1, 
                            ml: 1,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: factor.impact > 0 ? '#4caf50' : '#f44336'
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ ml: 1, minWidth: 40 }}>
                          {factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* Comparison */}
        {comparison && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Cohort Comparison Results
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h4" color={comparison.metrics.retentionImprovement > 0 ? 'success.main' : 'error.main'}>
                          {comparison.metrics.retentionImprovement > 0 ? '+' : ''}{comparison.metrics.retentionImprovement.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Retention Improvement
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h4" color={comparison.metrics.ltvDifference > 0 ? 'success.main' : 'error.main'}>
                          {comparison.metrics.ltvDifference > 0 ? '+' : ''}${comparison.metrics.ltvDifference.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          LTV Difference
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h4" color={comparison.metrics.engagementDelta > 0 ? 'success.main' : 'error.main'}>
                          {comparison.metrics.engagementDelta > 0 ? '+' : ''}{comparison.metrics.engagementDelta.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Engagement Delta
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Comparison Insights
                  </Typography>
                  {comparison.insights.map((insight, index) => (
                    <Alert 
                      key={index} 
                      severity={insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'info'}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">{insight.title}</Typography>
                      <Typography variant="body2">{insight.description}</Typography>
                      {insight.recommendation && (
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                          Recommendation: {insight.recommendation}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Create Cohort Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Cohort</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cohort Name"
                value={newCohort.name}
                onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newCohort.description}
                onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Criteria
              </Typography>
              {newCohort.criteria.map((criterion, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={criterion.type}
                        label="Type"
                        onChange={(e) => {
                          const newCriteria = [...newCohort.criteria];
                          newCriteria[index].type = e.target.value as any;
                          setNewCohort({ ...newCohort, criteria: newCriteria });
                        }}
                      >
                        <MenuItem value="event">Event</MenuItem>
                        <MenuItem value="property">Property</MenuItem>
                        <MenuItem value="segment">Segment</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Property"
                      value={criterion.property || ''}
                      onChange={(e) => {
                        const newCriteria = [...newCohort.criteria];
                        newCriteria[index].property = e.target.value;
                        setNewCohort({ ...newCohort, criteria: newCriteria });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={criterion.operator}
                        label="Operator"
                        onChange={(e) => {
                          const newCriteria = [...newCohort.criteria];
                          newCriteria[index].operator = e.target.value as any;
                          setNewCohort({ ...newCohort, criteria: newCriteria });
                        }}
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                        <MenuItem value="greater">Greater Than</MenuItem>
                        <MenuItem value="less">Less Than</MenuItem>
                        <MenuItem value="exists">Exists</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Value"
                      value={criterion.value || ''}
                      onChange={(e) => {
                        const newCriteria = [...newCohort.criteria];
                        newCriteria[index].value = e.target.value;
                        setNewCohort({ ...newCohort, criteria: newCriteria });
                      }}
                    />
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCohort}
            variant="contained"
            disabled={!newCohort.name || loading}
          >
            Create Cohort
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CohortAnalyticsDashboard; 