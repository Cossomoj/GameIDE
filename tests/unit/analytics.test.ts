import { AnalyticsService } from '../../backend/src/services/analytics';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track a new event successfully', () => {
      const event = {
        sessionId: 'test-session-1',
        userId: 'user-123',
        eventType: 'game' as const,
        eventName: 'game_started',
        properties: { gameId: 'test-game' }
      };

      const eventId = analyticsService.trackEvent(event);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should create session if it does not exist', () => {
      const event = {
        sessionId: 'new-session',
        userId: 'user-456',
        eventType: 'ui' as const,
        eventName: 'button_click',
        properties: { button: 'generate' }
      };

      const eventId = analyticsService.trackEvent(event);

      expect(eventId).toBeDefined();
      
      // Проверяем, что сессия была создана
      const report = analyticsService.generateReport('daily', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(report.sessions.total).toBe(1);
    });

    it('should handle invalid event data gracefully', () => {
      const invalidEvent = {
        sessionId: '',
        userId: '',
        eventType: 'invalid' as any,
        eventName: '',
        properties: {}
      };

      expect(() => {
        analyticsService.trackEvent(invalidEvent);
      }).not.toThrow();
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      // Добавляем тестовые данные
      analyticsService.trackEvent({
        sessionId: 'session-1',
        userId: 'user-1',
        eventType: 'game',
        eventName: 'game_created',
        properties: {}
      });

      analyticsService.trackEvent({
        sessionId: 'session-1',
        userId: 'user-1',
        eventType: 'game',
        eventName: 'game_completed',
        properties: { score: 1000 }
      });
    });

    it('should generate daily report with correct structure', () => {
      const report = analyticsService.generateReport('daily', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(report).toHaveProperty('period', 'daily');
      expect(report).toHaveProperty('timeframe');
      expect(report).toHaveProperty('sessions');
      expect(report).toHaveProperty('events');
      expect(report).toHaveProperty('users');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('charts');
    });

    it('should calculate correct session metrics', () => {
      const report = analyticsService.generateReport('daily', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(report.sessions.total).toBeGreaterThan(0);
      expect(report.sessions.unique).toBeGreaterThan(0);
      expect(report.sessions.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty timeframe correctly', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const report = analyticsService.generateReport('daily', {
        start: futureDate,
        end: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000)
      });

      expect(report.sessions.total).toBe(0);
      expect(report.events.total).toBe(0);
      expect(report.users.total).toBe(0);
    });
  });

  describe('getRealtimeData', () => {
    it('should return realtime analytics data', () => {
      // Добавляем активную сессию
      analyticsService.trackEvent({
        sessionId: 'active-session',
        userId: 'active-user',
        eventType: 'ui',
        eventName: 'page_view',
        properties: { page: 'home' }
      });

      const realtimeData = analyticsService.getRealtimeData();

      expect(realtimeData).toHaveProperty('activeSessions');
      expect(realtimeData).toHaveProperty('onlineUsers');
      expect(realtimeData).toHaveProperty('recentEvents');
      expect(realtimeData).toHaveProperty('currentMetrics');
      expect(realtimeData).toHaveProperty('timestamp');

      expect(realtimeData.activeSessions).toBeGreaterThanOrEqual(0);
      expect(realtimeData.onlineUsers).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(realtimeData.recentEvents)).toBe(true);
    });
  });

  describe('getUserJourney', () => {
    it('should return user journey data', () => {
      const userId = 'journey-user';
      
      // Создаем последовательность событий
      analyticsService.trackEvent({
        sessionId: 'journey-session',
        userId,
        eventType: 'ui',
        eventName: 'page_view',
        properties: { page: 'home' }
      });

      analyticsService.trackEvent({
        sessionId: 'journey-session',
        userId,
        eventType: 'ui',
        eventName: 'button_click',
        properties: { button: 'create_game' }
      });

      const journey = analyticsService.getUserJourney(userId);

      expect(journey).toHaveProperty('userId', userId);
      expect(journey).toHaveProperty('sessions');
      expect(journey).toHaveProperty('totalEvents');
      expect(journey).toHaveProperty('firstVisit');
      expect(journey).toHaveProperty('lastActivity');
      expect(journey).toHaveProperty('conversionEvents');

      expect(Array.isArray(journey.sessions)).toBe(true);
      expect(journey.totalEvents).toBeGreaterThan(0);
    });

    it('should handle non-existent user', () => {
      const journey = analyticsService.getUserJourney('non-existent-user');

      expect(journey.userId).toBe('non-existent-user');
      expect(journey.sessions).toHaveLength(0);
      expect(journey.totalEvents).toBe(0);
    });
  });

  describe('updateSession', () => {
    it('should update existing session', () => {
      const sessionId = 'update-session';
      
      // Создаем сессию
      analyticsService.trackEvent({
        sessionId,
        userId: 'update-user',
        eventType: 'ui',
        eventName: 'session_start',
        properties: {}
      });

      // Обновляем сессию
      analyticsService.updateSession(sessionId, {
        duration: 1800, // 30 минут
        platform: 'web',
        language: 'ru',
        events: 5
      });

      // Проверяем, что обновление произошло
      const report = analyticsService.generateReport('daily', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(report.sessions.total).toBeGreaterThan(0);
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => {
        analyticsService.updateSession('non-existent-session', {
          duration: 1000
        });
      }).not.toThrow();
    });
  });
}); 