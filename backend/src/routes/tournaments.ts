import { Router } from 'express';
import { tournamentService } from '../services/tournaments';
import { logger } from '../services/logger';

const router = Router();

// Создание турнира
router.post('/create', async (req, res) => {
  try {
    const { organizerId, tournamentData } = req.body;

    if (!organizerId) {
      return res.status(400).json({
        success: false,
        error: 'Organizer ID is required'
      });
    }

    const tournament = await tournamentService.createTournament(organizerId, tournamentData);

    res.json({
      success: true,
      data: { tournament }
    });
  } catch (error) {
    logger.error('Error creating tournament:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tournament'
    });
  }
});

// Получение списка турниров
router.get('/', async (req, res) => {
  try {
    const { status, gameId, organizerId, isPublic, limit, offset } = req.query;

    const filters = {
      status: status as any,
      gameId: gameId as string,
      organizerId: organizerId as string,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const tournaments = tournamentService.getTournaments(filters);

    res.json({
      success: true,
      data: {
        tournaments,
        total: tournaments.length
      }
    });
  } catch (error) {
    logger.error('Error getting tournaments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournaments'
    });
  }
});

// Получение турнира по ID
router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      data: { tournament }
    });
  } catch (error) {
    logger.error('Error getting tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament'
    });
  }
});

// Регистрация в турнире
router.post('/:tournamentId/register', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { userId, userStats } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const participant = await tournamentService.registerParticipant(
      tournamentId,
      userId,
      userStats || {}
    );

    res.json({
      success: true,
      data: { participant }
    });
  } catch (error) {
    logger.error('Error registering participant:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register participant'
    });
  }
});

// Генерация турнирной сетки
router.post('/:tournamentId/generate-brackets', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const brackets = await tournamentService.generateBrackets(tournamentId);

    res.json({
      success: true,
      data: { brackets }
    });
  } catch (error) {
    logger.error('Error generating brackets:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate brackets'
    });
  }
});

// Запуск матча
router.post('/matches/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await tournamentService.startMatch(matchId);

    res.json({
      success: true,
      data: { match }
    });
  } catch (error) {
    logger.error('Error starting match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start match'
    });
  }
});

// Завершение матча
router.post('/matches/:matchId/complete', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { scores, winner, statistics } = req.body;

    if (!scores || !winner) {
      return res.status(400).json({
        success: false,
        error: 'Scores and winner are required'
      });
    }

    const match = await tournamentService.completeMatch(matchId, {
      scores,
      winner,
      statistics
    });

    res.json({
      success: true,
      data: { match }
    });
  } catch (error) {
    logger.error('Error completing match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete match'
    });
  }
});

// Получение матчей турнира
router.get('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status, bracketId } = req.query;

    // В реальной реализации здесь был бы метод получения матчей турнира
    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    let matches = tournament.matches;

    // Фильтрация
    if (status) {
      matches = matches.filter(m => m.status === status);
    }
    if (bracketId) {
      matches = matches.filter(m => m.bracketId === bracketId);
    }

    res.json({
      success: true,
      data: { matches }
    });
  } catch (error) {
    logger.error('Error getting tournament matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament matches'
    });
  }
});

// Получение участников турнира
router.get('/:tournamentId/participants', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status } = req.query;

    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    let participants = tournament.participants;

    // Фильтрация по статусу
    if (status) {
      participants = participants.filter(p => p.status === status);
    }

    res.json({
      success: true,
      data: { participants }
    });
  } catch (error) {
    logger.error('Error getting tournament participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament participants'
    });
  }
});

// Отмена регистрации
router.delete('/:tournamentId/participants/:participantId', async (req, res) => {
  try {
    const { tournamentId, participantId } = req.params;

    // В реальной реализации здесь был бы метод отмены регистрации
    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    logger.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove participant'
    });
  }
});

// Обновление статуса участника (готовность к матчу)
router.patch('/matches/:matchId/participants/:participantId/ready', async (req, res) => {
  try {
    const { matchId, participantId } = req.params;
    const { ready } = req.body;

    // В реальной реализации здесь было бы обновление статуса готовности
    res.json({
      success: true,
      message: 'Participant ready status updated'
    });
  } catch (error) {
    logger.error('Error updating participant ready status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update participant ready status'
    });
  }
});

// Check-in участника
router.post('/:tournamentId/participants/:participantId/checkin', async (req, res) => {
  try {
    const { tournamentId, participantId } = req.params;

    // В реальной реализации здесь был бы check-in
    res.json({
      success: true,
      message: 'Participant checked in successfully'
    });
  } catch (error) {
    logger.error('Error checking in participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in participant'
    });
  }
});

// Получение турнирной сетки
router.get('/:tournamentId/brackets', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      data: { brackets: tournament.brackets }
    });
  } catch (error) {
    logger.error('Error getting tournament brackets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament brackets'
    });
  }
});

// Получение лидерборда турнира
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Сортируем участников по результатам
    const leaderboard = tournament.participants
      .sort((a, b) => {
        const aWins = a.tournamentResults.matchesWon;
        const bWins = b.tournamentResults.matchesWon;
        const aScore = a.tournamentResults.totalScore;
        const bScore = b.tournamentResults.totalScore;
        
        if (aWins !== bWins) return bWins - aWins;
        return bScore - aScore;
      })
      .map((participant, index) => ({
        rank: index + 1,
        participant: {
          id: participant.id,
          username: participant.username,
          avatar: participant.avatar
        },
        stats: participant.tournamentResults,
        gameStats: participant.gameStats
      }));

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    logger.error('Error getting tournament leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament leaderboard'
    });
  }
});

// Спор по матчу
router.post('/matches/:matchId/dispute', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason, evidence } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Dispute reason is required'
      });
    }

    // В реальной реализации здесь было бы создание спора
    res.json({
      success: true,
      message: 'Dispute created successfully'
    });
  } catch (error) {
    logger.error('Error creating match dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create match dispute'
    });
  }
});

// Получение статистики турниров
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = tournamentService.getStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting tournament stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament stats'
    });
  }
});

// Поиск турниров
router.get('/search', async (req, res) => {
  try {
    const { query, gameId, status, difficulty, prizeMin, prizeMax } = req.query;

    let tournaments = tournamentService.getTournaments();

    // Фильтрация по поисковому запросу
    if (query) {
      const searchTerm = (query as string).toLowerCase();
      tournaments = tournaments.filter(t => 
        t.name.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm) ||
        t.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Дополнительные фильтры
    if (gameId) {
      tournaments = tournaments.filter(t => t.gameId === gameId);
    }
    if (status) {
      tournaments = tournaments.filter(t => t.status === status);
    }
    if (difficulty) {
      tournaments = tournaments.filter(t => t.metadata.difficulty === difficulty);
    }
    if (prizeMin) {
      tournaments = tournaments.filter(t => t.stats.totalPrizePool >= parseInt(prizeMin as string));
    }
    if (prizeMax) {
      tournaments = tournaments.filter(t => t.stats.totalPrizePool <= parseInt(prizeMax as string));
    }

    res.json({
      success: true,
      data: {
        tournaments,
        total: tournaments.length
      }
    });
  } catch (error) {
    logger.error('Error searching tournaments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tournaments'
    });
  }
});

// Топ турниров
router.get('/featured/top', async (req, res) => {
  try {
    const { category = 'popular', limit = 10 } = req.query;

    let tournaments = tournamentService.getTournaments();

    // Сортировка по категории
    switch (category) {
      case 'popular':
        tournaments.sort((a, b) => b.participants.length - a.participants.length);
        break;
      case 'prize':
        tournaments.sort((a, b) => b.stats.totalPrizePool - a.stats.totalPrizePool);
        break;
      case 'recent':
        tournaments.sort((a, b) => b.metadata.created.getTime() - a.metadata.created.getTime());
        break;
      case 'upcoming':
        tournaments = tournaments.filter(t => t.status === 'registration' || t.status === 'ready');
        tournaments.sort((a, b) => a.config.tournamentStart.getTime() - b.config.tournamentStart.getTime());
        break;
    }

    const featuredTournaments = tournaments.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: { tournaments: featuredTournaments }
    });
  } catch (error) {
    logger.error('Error getting featured tournaments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get featured tournaments'
    });
  }
});

// Экспорт результатов турнира
router.get('/:tournamentId/export', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { format = 'json' } = req.query;

    const tournaments = tournamentService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    const exportData = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        participants: tournament.participants.length,
        matches: tournament.matches.length
      },
      participants: tournament.participants.map(p => ({
        username: p.username,
        finalRank: p.tournamentResults.finalRank,
        matchesWon: p.tournamentResults.matchesWon,
        matchesLost: p.tournamentResults.matchesLost,
        totalScore: p.tournamentResults.totalScore,
        prizeWon: p.tournamentResults.prizeWon
      })),
      matches: tournament.matches.map(m => ({
        participants: m.participants.map(p => p.participantId),
        winner: m.winner,
        scores: m.results.scores,
        duration: m.duration
      })),
      exportDate: new Date().toISOString()
    };

    if (format === 'csv') {
      // В реальной реализации здесь была бы конвертация в CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tournament_${tournamentId}.csv"`);
      res.send('CSV export not implemented');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tournament_${tournamentId}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    logger.error('Error exporting tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export tournament'
    });
  }
});

export default router; 