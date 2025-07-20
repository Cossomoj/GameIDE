import { api } from './api';

export interface CohortDefinition {
  id: string;
  name: string;
  description: string;
  criteria: {
    type: 'event' | 'property' | 'segment';
    property?: string;
    value?: any;
    operator?: 'equals' | 'contains' | 'greater' | 'less' | 'exists';
    dateRange?: {
      start: Date;
      end: Date;
    };
  }[];
  dateRange: {
    start: Date;
    end: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CohortUser {
  userId: string;
  joinedAt: Date;
  metadata: Record<string, any>;
}

export interface RetentionData {
  period: number;
  users: number;
  percentage: number;
}

export interface LTVData {
  period: number;
  value: number;
  cumulative: number;
}

export interface EngagementMetrics {
  averageSessionsPerUser: number;
  averageSessionDuration: number;
  averageEventsPerSession: number;
  topEvents: Array<{
    eventName: string;
    count: number;
    uniqueUsers: number;
  }>;
}

export interface ConversionFunnel {
  step: string;
  users: number;
  percentage: number;
  dropoffRate?: number;
}

export interface CohortMetrics {
  cohortId: string;
  totalUsers: number;
  retentionCurve: RetentionData[];
  ltvCurve: LTVData[];
  engagement: EngagementMetrics;
  conversionFunnels: Record<string, ConversionFunnel[]>;
}

export interface CohortInsight {
  type: 'retention' | 'ltv' | 'engagement' | 'conversion' | 'behavior';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
  confidence: number;
}

export interface CohortComparison {
  cohorts: string[];
  metrics: {
    retentionImprovement: number;
    ltvDifference: number;
    engagementDelta: number;
  };
  insights: CohortInsight[];
}

export interface CohortHealthScore {
  overall: number;
  retention: number;
  ltv: number;
  engagement: number;
  growth: number;
  factors: Array<{
    factor: string;
    impact: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

export interface RetentionForecast {
  cohortId: string;
  forecastPeriods: number;
  confidence: number;
  predictions: Array<{
    period: number;
    predicted: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
  factors: Array<{
    factor: string;
    importance: number;
  }>;
}

class CohortAnalyticsService {
  async createCohort(definition: Omit<CohortDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<CohortDefinition> {
    const response = await api.post('/api/cohort-analytics/cohorts', definition);
    return response.data;
  }

  async getCohorts(): Promise<CohortDefinition[]> {
    const response = await api.get('/api/cohort-analytics/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string): Promise<CohortDefinition> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}`);
    return response.data;
  }

  async updateCohort(cohortId: string, updates: Partial<CohortDefinition>): Promise<CohortDefinition> {
    const response = await api.put(`/api/cohort-analytics/cohorts/${cohortId}`, updates);
    return response.data;
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await api.delete(`/api/cohort-analytics/cohorts/${cohortId}`);
  }

  async getCohortMetrics(cohortId: string): Promise<CohortMetrics> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/metrics`);
    return response.data;
  }

  async recalculateCohortMetrics(cohortId: string): Promise<CohortMetrics> {
    const response = await api.post(`/api/cohort-analytics/cohorts/${cohortId}/recalculate`);
    return response.data;
  }

  async compareCohorts(cohortIds: string[]): Promise<CohortComparison> {
    const response = await api.post('/api/cohort-analytics/compare', { cohortIds });
    return response.data;
  }

  async getCohortInsights(cohortId: string): Promise<CohortInsight[]> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/insights`);
    return response.data;
  }

  async getCohortHealthScore(cohortId: string): Promise<CohortHealthScore> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/health`);
    return response.data;
  }

  async getRetentionForecast(cohortId: string, periods: number): Promise<RetentionForecast> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/forecast`, {
      params: { periods }
    });
    return response.data;
  }

  async exportCohortData(cohortId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async getCohortUsers(cohortId: string, page: number = 1, limit: number = 100): Promise<{
    users: CohortUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/api/cohort-analytics/cohorts/${cohortId}/users`, {
      params: { page, limit }
    });
    return response.data;
  }

  async trackUserEvent(userId: string, eventName: string, properties: Record<string, any> = {}): Promise<void> {
    await api.post('/api/cohort-analytics/events', {
      userId,
      eventName,
      properties,
      timestamp: new Date()
    });
  }

  async getUserCohorts(userId: string): Promise<CohortDefinition[]> {
    const response = await api.get(`/api/cohort-analytics/users/${userId}/cohorts`);
    return response.data;
  }
}

export const cohortAnalyticsService = new CohortAnalyticsService(); 