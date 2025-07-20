import request from 'supertest';
import express from 'express';
import { createApp } from '../../backend/src/app';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Создаем тестовое приложение
    app = await createApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Games API', () => {
    describe('POST /api/games/generate', () => {
      it('should generate a new game successfully', async () => {
        const gameConfig = {
          title: 'Test Game',
          description: 'A test game for integration testing',
          genre: 'platformer',
          difficulty: 'medium',
          aiProvider: 'openai',
          prompt: 'Create a simple platformer game'
        };

        const response = await request(app)
          .post('/api/games/generate')
          .send(gameConfig)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('config');
        expect(response.body.data).toHaveProperty('files');
      });

      it('should validate required fields', async () => {
        const invalidConfig = {
          title: '', // Пустой заголовок
          description: 'Test description'
          // Отсутствуют обязательные поля
        };

        const response = await request(app)
          .post('/api/games/generate')
          .send(invalidConfig)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle invalid AI provider', async () => {
        const configWithInvalidAI = {
          title: 'Test Game',
          description: 'Test description',
          genre: 'platformer',
          difficulty: 'medium',
          aiProvider: 'invalid-provider',
          prompt: 'Create a game'
        };

        const response = await request(app)
          .post('/api/games/generate')
          .send(configWithInvalidAI)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/games', () => {
      it('should return list of games', async () => {
        const response = await request(app)
          .get('/api/games')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/games?page=1&limit=5')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });
    });

    describe('GET /api/games/:id', () => {
      it('should return 404 for non-existent game', async () => {
        const response = await request(app)
          .get('/api/games/non-existent-id')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Analytics API', () => {
    describe('POST /api/analytics/track', () => {
      it('should track an event successfully', async () => {
        const event = {
          sessionId: 'test-session-123',
          userId: 'test-user-456',
          eventType: 'ui',
          eventName: 'button_click',
          properties: {
            button: 'generate_game',
            page: 'home'
          }
        };

        const response = await request(app)
          .post('/api/analytics/track')
          .send(event)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('eventId');
      });

      it('should validate event data', async () => {
        const invalidEvent = {
          sessionId: '',
          userId: '',
          eventType: 'invalid',
          eventName: ''
        };

        const response = await request(app)
          .post('/api/analytics/track')
          .send(invalidEvent)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/analytics/report', () => {
      it('should return analytics report', async () => {
        const response = await request(app)
          .get('/api/analytics/report?period=daily')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data).toHaveProperty('sessions');
        expect(response.body.data).toHaveProperty('events');
        expect(response.body.data).toHaveProperty('users');
      });

      it('should support different time periods', async () => {
        const periods = ['daily', 'weekly', 'monthly'];

        for (const period of periods) {
          const response = await request(app)
            .get(`/api/analytics/report?period=${period}`)
            .expect(200);

          expect(response.body.data.period).toBe(period);
        }
      });
    });

    describe('GET /api/analytics/realtime', () => {
      it('should return realtime analytics data', async () => {
        const response = await request(app)
          .get('/api/analytics/realtime')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('activeSessions');
        expect(response.body.data).toHaveProperty('onlineUsers');
        expect(response.body.data).toHaveProperty('recentEvents');
      });
    });
  });

  describe('Achievements API', () => {
    describe('GET /api/achievements', () => {
      it('should return list of achievements', async () => {
        const response = await request(app)
          .get('/api/achievements')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/achievements/user/:userId', () => {
      it('should return user achievements', async () => {
        const userId = 'test-user-123';
        const response = await request(app)
          .get(`/api/achievements/user/${userId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('achievements');
        expect(response.body.data).toHaveProperty('progress');
      });
    });
  });

  describe('Leaderboards API', () => {
    describe('GET /api/leaderboards', () => {
      it('should return leaderboard data', async () => {
        const response = await request(app)
          .get('/api/leaderboards')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should support different leaderboard types', async () => {
        const types = ['global', 'weekly', 'monthly'];

        for (const type of types) {
          const response = await request(app)
            .get(`/api/leaderboards?type=${type}`)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
        }
      });
    });
  });

  describe('Localization API', () => {
    describe('GET /api/localization/languages', () => {
      it('should return supported languages', async () => {
        const response = await request(app)
          .get('/api/localization/languages')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/localization/translations/:lang', () => {
      it('should return translations for valid language', async () => {
        const response = await request(app)
          .get('/api/localization/translations/en')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('translations');
      });

      it('should return 404 for invalid language', async () => {
        const response = await request(app)
          .get('/api/localization/translations/invalid')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Monetization API', () => {
    describe('GET /api/monetization/plans', () => {
      it('should return subscription plans', async () => {
        const response = await request(app)
          .get('/api/monetization/plans')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/monetization/purchase', () => {
      it('should handle purchase request', async () => {
        const purchaseData = {
          planId: 'premium-monthly',
          paymentMethod: 'yandex_money'
        };

        const response = await request(app)
          .post('/api/monetization/purchase')
          .send(purchaseData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      });

      it('should validate purchase data', async () => {
        const invalidPurchase = {
          planId: '', // Пустой plan ID
          paymentMethod: 'invalid'
        };

        const response = await request(app)
          .post('/api/monetization/purchase')
          .send(invalidPurchase)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/games/generate')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // Делаем много запросов подряд
      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/api/games')
      );

      const responses = await Promise.all(requests);

      // Проверяем, что некоторые запросы были отклонены из-за rate limiting
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS', () => {
    it('should set correct CORS headers', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/games')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
}); 