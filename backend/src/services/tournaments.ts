import { EventEmitter } from 'events';
import { logger } from './logger';
import { analyticsService } from './analytics';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  gameId: string;
  organizerId: string;
  
  // Конфигурация турнира
  config: {
    type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';
    maxParticipants: number;
    minParticipants: number;
    registrationStart: Date;
    registrationEnd: Date;
    tournamentStart: Date;
    tournamentEnd?: Date;
    matchDuration: number; // минуты
    breakDuration: number; // минуты между матчами
    autoStart: boolean;
    requireApproval: boolean;
    isPublic: boolean;
    allowSpectators: boolean;
    streamingAllowed: boolean;
  };

  // Призы и награды
  prizes: {
    currency: 'coins' | 'gems' | 'real_money';
    distribution: Array<{
      place: number;
      amount: number;
      additionalRewards?: Array<{
        type: 'achievement' | 'badge' | 'item';
        id: string;
        quantity: number;
      }>;
    }>;
    entryFee?: number;
    sponsored?: boolean;
    sponsorInfo?: {
      name: string;
      logo: string;
      url: string;
    };
  };

  // Правила и требования
  rules: {
    eligibility: {
      minLevel?: number;
      maxLevel?: number;
      minRating?: number;
      maxRating?: number;
      regions?: string[];
      bannedUsers?: string[];
      requiredAchievements?: string[];
    };
    gameSettings: {
      difficulty?: string;
      timeLimit?: number;
      specialRules?: string[];
      bannedItems?: string[];
      allowedMods?: string[];
    };
    conduct: {
      language: string[];
      anticheat: boolean;
      recording: boolean;
      pauseAllowed: boolean;
      substituteAllowed: boolean;
    };
  };

  // Состояние турнира
  status: 'draft' | 'registration' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  participants: TournamentParticipant[];
  brackets: TournamentBracket[];
  matches: Match[];
  
  // Метаданные
  metadata: {
    created: Date;
    updated: Date;
    tags: string[];
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    estimatedDuration: number; // минуты
    format: 'online' | 'offline' | 'hybrid';
    platform: string[];
  };

  // Статистика
  stats: {
    totalMatches: number;
    completedMatches: number;
    avgMatchDuration: number;
    spectatorCount: number;
    peakViewers: number;
    totalPrizePool: number;
  };
}

export interface TournamentParticipant {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  
  // Статус участия
  status: 'registered' | 'confirmed' | 'checked_in' | 'active' | 'eliminated' | 'disqualified' | 'withdrew';
  registeredAt: Date;
  confirmedAt?: Date;
  checkedInAt?: Date;
  
  // Игровая информация
  gameStats: {
    level: number;
    rating: number;
    wins: number;
    losses: number;
    winRate: number;
    averageScore: number;
    bestScore: number;
    achievementsCount: number;
  };

  // Настройки участника
  preferences: {
    preferredMatchTime?: string;
    timezone: string;
    notifications: boolean;
    allowSpectators: boolean;
    streamingConsent: boolean;
  };

  // Результаты в турнире
  tournamentResults: {
    currentBracket?: string;
    currentPosition: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    totalScore: number;
    bestPerformance: number;
    eliminatedAt?: Date;
    finalRank?: number;
    prizeWon?: number;
  };
}

export interface TournamentBracket {
  id: string;
  name: string;
  type: 'winner' | 'loser' | 'group' | 'final';
  stage: number;
  participants: string[]; // participant IDs
  matches: string[]; // match IDs
  status: 'pending' | 'in_progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
}

export interface Match {
  id: string;
  tournamentId: string;
  bracketId: string;
  
  // Участники
  participants: Array<{
    participantId: string;
    side: 'home' | 'away' | 'player1' | 'player2';
    ready: boolean;
    connected: boolean;
    score?: number;
    performance?: any;
  }>;

  // Планирование
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration?: number;

  // Состояние матча
  status: 'scheduled' | 'ready' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'disputed';
  winner?: string; // participant ID
  results: {
    scores: Record<string, number>;
    statistics: Record<string, any>;
    replay?: string; // URL to replay file
    screenshots?: string[];
    logs?: string[];
  };

  // Настройки матча
  config: {
    bestOf: number; // Best of N games
    gameMode: string;
    mapPool?: string[];
    selectedMap?: string;
    timeLimit: number;
    overtimeRules?: any;
    spectatorMode: boolean;
    recordingEnabled: boolean;
  };

  // Модерация
  moderation: {
    referee?: string; // user ID
    disputed: boolean;
    disputeReason?: string;
    resolution?: string;
    penaltiesApplied?: Array<{
      participantId: string;
      type: 'warning' | 'score_penalty' | 'disqualification';
      reason: string;
      timestamp: Date;
    }>;
  };
}

export interface TournamentStats {
  totalTournaments: number;
  activeTournaments: number;
  totalParticipants: number;
  totalMatches: number;
  avgTournamentSize: number;
  avgTournamentDuration: number;
  popularFormats: Record<string, number>;
  prizeDistribution: {
    totalPrizes: number;
    avgPrizePool: number;
    topPrize: number;
  };
}

class TournamentService extends EventEmitter {
  private tournaments: Map<string, Tournament> = new Map();
  private participants: Map<string, TournamentParticipant> = new Map();
  private matches: Map<string, Match> = new Map();
  private activeCheckins: Map<string, Set<string>> = new Map(); // tournamentId -> Set<participantId>

  constructor() {
    super();
    this.startTournamentScheduler();
  }

  // Создание турнира
  public async createTournament(
    organizerId: string,
    tournamentData: Partial<Tournament>
  ): Promise<Tournament> {
    try {
      const tournament: Tournament = {
        id: this.generateTournamentId(),
        name: tournamentData.name || 'Новый турнир',
        description: tournamentData.description || '',
        gameId: tournamentData.gameId || '',
        organizerId,
        
        config: {
          type: 'single_elimination',
          maxParticipants: 16,
          minParticipants: 4,
          registrationStart: new Date(),
          registrationEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 день
          tournamentStart: new Date(Date.now() + 25 * 60 * 60 * 1000), // +25 часов
          matchDuration: 30,
          breakDuration: 10,
          autoStart: true,
          requireApproval: false,
          isPublic: true,
          allowSpectators: true,
          streamingAllowed: true,
          ...tournamentData.config
        },

        prizes: {
          currency: 'coins',
          distribution: [
            { place: 1, amount: 1000 },
            { place: 2, amount: 500 },
            { place: 3, amount: 250 }
          ],
          ...tournamentData.prizes
        },

        rules: {
          eligibility: {},
          gameSettings: {},
          conduct: {
            language: ['ru', 'en'],
            anticheat: true,
            recording: true,
            pauseAllowed: false,
            substituteAllowed: false
          },
          ...tournamentData.rules
        },

        status: 'draft',
        participants: [],
        brackets: [],
        matches: [],

        metadata: {
          created: new Date(),
          updated: new Date(),
          tags: tournamentData.metadata?.tags || [],
          category: tournamentData.metadata?.category || 'general',
          difficulty: tournamentData.metadata?.difficulty || 'intermediate',
          estimatedDuration: this.estimateTournamentDuration(
            tournamentData.config?.maxParticipants || 16,
            tournamentData.config?.type || 'single_elimination',
            tournamentData.config?.matchDuration || 30
          ),
          format: 'online',
          platform: ['web']
        },

        stats: {
          totalMatches: 0,
          completedMatches: 0,
          avgMatchDuration: 0,
          spectatorCount: 0,
          peakViewers: 0,
          totalPrizePool: this.calculateTotalPrizePool(
            tournamentData.prizes?.distribution || []
          )
        }
      };

      this.tournaments.set(tournament.id, tournament);

      // Аналитика
      analyticsService.trackEvent('tournament_created', {
        tournamentId: tournament.id,
        organizerId,
        type: tournament.config.type,
        maxParticipants: tournament.config.maxParticipants,
        prizePool: tournament.stats.totalPrizePool
      });

      this.emit('tournamentCreated', tournament);
      logger.info(`Tournament created: ${tournament.id} by ${organizerId}`);

      return tournament;
    } catch (error) {
      logger.error('Error creating tournament:', error);
      throw error;
    }
  }

  // Регистрация в турнире
  public async registerParticipant(
    tournamentId: string,
    userId: string,
    userStats: any
  ): Promise<TournamentParticipant> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Проверки
      if (tournament.status !== 'registration') {
        throw new Error('Registration is not open');
      }

      if (tournament.participants.length >= tournament.config.maxParticipants) {
        throw new Error('Tournament is full');
      }

      const now = new Date();
      if (now < tournament.config.registrationStart || now > tournament.config.registrationEnd) {
        throw new Error('Registration period has ended');
      }

      // Проверка eligibility
      if (!this.checkEligibility(tournament, userStats)) {
        throw new Error('User does not meet tournament requirements');
      }

      // Проверка на дублирование
      const existingParticipant = tournament.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        throw new Error('User already registered');
      }

      const participant: TournamentParticipant = {
        id: this.generateParticipantId(),
        userId,
        username: userStats.username || `User${userId}`,
        avatar: userStats.avatar,
        
        status: tournament.config.requireApproval ? 'registered' : 'confirmed',
        registeredAt: now,
        confirmedAt: tournament.config.requireApproval ? undefined : now,

        gameStats: {
          level: userStats.level || 1,
          rating: userStats.rating || 1000,
          wins: userStats.wins || 0,
          losses: userStats.losses || 0,
          winRate: userStats.winRate || 0,
          averageScore: userStats.averageScore || 0,
          bestScore: userStats.bestScore || 0,
          achievementsCount: userStats.achievementsCount || 0
        },

        preferences: {
          timezone: userStats.timezone || 'UTC',
          notifications: true,
          allowSpectators: true,
          streamingConsent: false
        },

        tournamentResults: {
          currentPosition: tournament.participants.length + 1,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          totalScore: 0,
          bestPerformance: 0
        }
      };

      tournament.participants.push(participant);
      this.participants.set(participant.id, participant);

      // Проверяем, можно ли начать турнир
      if (tournament.config.autoStart && 
          tournament.participants.length >= tournament.config.minParticipants) {
        await this.checkTournamentStart(tournament);
      }

      // Аналитика
      analyticsService.trackEvent('tournament_registered', {
        tournamentId,
        userId,
        participantCount: tournament.participants.length
      });

      this.emit('participantRegistered', { tournament, participant });
      logger.info(`User ${userId} registered for tournament ${tournamentId}`);

      return participant;
    } catch (error) {
      logger.error('Error registering participant:', error);
      throw error;
    }
  }

  // Создание турнирной сетки
  public async generateBrackets(tournamentId: string): Promise<TournamentBracket[]> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const confirmedParticipants = tournament.participants.filter(p => 
        p.status === 'confirmed' || p.status === 'checked_in'
      );

      let brackets: TournamentBracket[] = [];

      switch (tournament.config.type) {
        case 'single_elimination':
          brackets = this.generateSingleEliminationBrackets(confirmedParticipants);
          break;
        case 'double_elimination':
          brackets = this.generateDoubleEliminationBrackets(confirmedParticipants);
          break;
        case 'round_robin':
          brackets = this.generateRoundRobinBrackets(confirmedParticipants);
          break;
        case 'swiss':
          brackets = this.generateSwissBrackets(confirmedParticipants);
          break;
      }

      tournament.brackets = brackets;

      // Создание матчей для первого раунда
      await this.generateMatches(tournament, brackets[0]);

      this.emit('bracketsGenerated', { tournament, brackets });
      logger.info(`Brackets generated for tournament ${tournamentId}`);

      return brackets;
    } catch (error) {
      logger.error('Error generating brackets:', error);
      throw error;
    }
  }

  // Запуск матча
  public async startMatch(matchId: string): Promise<Match> {
    try {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'ready') {
        throw new Error('Match is not ready to start');
      }

      // Проверяем готовность участников
      const allReady = match.participants.every(p => p.ready && p.connected);
      if (!allReady) {
        throw new Error('Not all participants are ready');
      }

      match.status = 'in_progress';
      match.actualStartTime = new Date();

      // Аналитика
      analyticsService.trackEvent('match_started', {
        matchId,
        tournamentId: match.tournamentId,
        participants: match.participants.map(p => p.participantId)
      });

      this.emit('matchStarted', match);
      logger.info(`Match started: ${matchId}`);

      return match;
    } catch (error) {
      logger.error('Error starting match:', error);
      throw error;
    }
  }

  // Завершение матча
  public async completeMatch(
    matchId: string, 
    results: { scores: Record<string, number>; winner: string; statistics?: any }
  ): Promise<Match> {
    try {
      const match = this.matches.get(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'in_progress') {
        throw new Error('Match is not in progress');
      }

      match.status = 'completed';
      match.actualEndTime = new Date();
      match.duration = match.actualEndTime.getTime() - (match.actualStartTime?.getTime() || 0);
      match.winner = results.winner;
      match.results = {
        scores: results.scores,
        statistics: results.statistics || {},
        replay: '', // TODO: генерация replay
        screenshots: [],
        logs: []
      };

      // Обновление статистики участников
      for (const participant of match.participants) {
        const tournamentParticipant = this.participants.get(participant.participantId);
        if (tournamentParticipant) {
          tournamentParticipant.tournamentResults.matchesPlayed++;
          if (participant.participantId === results.winner) {
            tournamentParticipant.tournamentResults.matchesWon++;
          } else {
            tournamentParticipant.tournamentResults.matchesLost++;
          }
          tournamentParticipant.tournamentResults.totalScore += (results.scores[participant.participantId] || 0);
        }
      }

      // Проверяем, нужно ли продвинуть турнир
      const tournament = this.tournaments.get(match.tournamentId);
      if (tournament) {
        await this.advanceTournament(tournament, match);
      }

      // Аналитика
      analyticsService.trackEvent('match_completed', {
        matchId,
        tournamentId: match.tournamentId,
        winner: results.winner,
        duration: match.duration,
        scores: results.scores
      });

      this.emit('matchCompleted', match);
      logger.info(`Match completed: ${matchId}, winner: ${results.winner}`);

      return match;
    } catch (error) {
      logger.error('Error completing match:', error);
      throw error;
    }
  }

  // Получение турниров
  public getTournaments(filters?: {
    status?: Tournament['status'];
    gameId?: string;
    organizerId?: string;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Tournament[] {
    let tournaments = Array.from(this.tournaments.values());

    if (filters) {
      if (filters.status) {
        tournaments = tournaments.filter(t => t.status === filters.status);
      }
      if (filters.gameId) {
        tournaments = tournaments.filter(t => t.gameId === filters.gameId);
      }
      if (filters.organizerId) {
        tournaments = tournaments.filter(t => t.organizerId === filters.organizerId);
      }
      if (filters.isPublic !== undefined) {
        tournaments = tournaments.filter(t => t.config.isPublic === filters.isPublic);
      }
    }

    // Сортировка по дате создания (новые первыми)
    tournaments.sort((a, b) => b.metadata.created.getTime() - a.metadata.created.getTime());

    // Пагинация
    if (filters?.offset) {
      tournaments = tournaments.slice(filters.offset);
    }
    if (filters?.limit) {
      tournaments = tournaments.slice(0, filters.limit);
    }

    return tournaments;
  }

  // Получение статистики
  public getStats(): TournamentStats {
    const tournaments = Array.from(this.tournaments.values());
    const matches = Array.from(this.matches.values());

    const totalParticipants = tournaments.reduce((sum, t) => sum + t.participants.length, 0);
    const avgTournamentSize = tournaments.length > 0 ? totalParticipants / tournaments.length : 0;

    const completedTournaments = tournaments.filter(t => t.status === 'completed');
    const avgDuration = completedTournaments.length > 0 
      ? completedTournaments.reduce((sum, t) => {
          const duration = (t.metadata.updated.getTime() - t.metadata.created.getTime()) / (1000 * 60);
          return sum + duration;
        }, 0) / completedTournaments.length
      : 0;

    const formatCounts: Record<string, number> = {};
    tournaments.forEach(t => {
      formatCounts[t.config.type] = (formatCounts[t.config.type] || 0) + 1;
    });

    const totalPrizes = tournaments.reduce((sum, t) => sum + t.stats.totalPrizePool, 0);
    const avgPrizePool = tournaments.length > 0 ? totalPrizes / tournaments.length : 0;
    const topPrize = Math.max(...tournaments.map(t => t.stats.totalPrizePool), 0);

    return {
      totalTournaments: tournaments.length,
      activeTournaments: tournaments.filter(t => 
        ['registration', 'ready', 'in_progress'].includes(t.status)
      ).length,
      totalParticipants,
      totalMatches: matches.length,
      avgTournamentSize,
      avgTournamentDuration: avgDuration,
      popularFormats: formatCounts,
      prizeDistribution: {
        totalPrizes,
        avgPrizePool,
        topPrize
      }
    };
  }

  // Приватные методы

  private checkEligibility(tournament: Tournament, userStats: any): boolean {
    const { eligibility } = tournament.rules;

    if (eligibility.minLevel && userStats.level < eligibility.minLevel) return false;
    if (eligibility.maxLevel && userStats.level > eligibility.maxLevel) return false;
    if (eligibility.minRating && userStats.rating < eligibility.minRating) return false;
    if (eligibility.maxRating && userStats.rating > eligibility.maxRating) return false;
    if (eligibility.bannedUsers?.includes(userStats.userId)) return false;

    return true;
  }

  private generateSingleEliminationBrackets(participants: TournamentParticipant[]): TournamentBracket[] {
    const brackets: TournamentBracket[] = [];
    
    // Главная сетка
    const mainBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Main Bracket',
      type: 'winner',
      stage: 1,
      participants: participants.map(p => p.id),
      matches: [],
      status: 'pending'
    };

    brackets.push(mainBracket);
    return brackets;
  }

  private generateDoubleEliminationBrackets(participants: TournamentParticipant[]): TournamentBracket[] {
    const brackets: TournamentBracket[] = [];
    
    // Основная сетка (winner bracket)
    const winnerBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Winner Bracket',
      type: 'winner',
      stage: 1,
      participants: participants.map(p => p.id),
      matches: [],
      status: 'pending'
    };

    // Сетка проигравших (loser bracket)
    const loserBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Loser Bracket',
      type: 'loser',
      stage: 1,
      participants: [],
      matches: [],
      status: 'pending'
    };

    // Финальная сетка
    const finalBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Grand Final',
      type: 'final',
      stage: 1,
      participants: [],
      matches: [],
      status: 'pending'
    };

    brackets.push(winnerBracket, loserBracket, finalBracket);
    return brackets;
  }

  private generateRoundRobinBrackets(participants: TournamentParticipant[]): TournamentBracket[] {
    const brackets: TournamentBracket[] = [];
    
    const roundRobinBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Round Robin',
      type: 'group',
      stage: 1,
      participants: participants.map(p => p.id),
      matches: [],
      status: 'pending'
    };

    brackets.push(roundRobinBracket);
    return brackets;
  }

  private generateSwissBrackets(participants: TournamentParticipant[]): TournamentBracket[] {
    const brackets: TournamentBracket[] = [];
    
    const swissBracket: TournamentBracket = {
      id: this.generateBracketId(),
      name: 'Swiss System',
      type: 'group',
      stage: 1,
      participants: participants.map(p => p.id),
      matches: [],
      status: 'pending'
    };

    brackets.push(swissBracket);
    return brackets;
  }

  private async generateMatches(tournament: Tournament, bracket: TournamentBracket): Promise<void> {
    const participants = bracket.participants;
    const matches: Match[] = [];

    // Простое создание матчей 1vs1 для первого раунда
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        const match: Match = {
          id: this.generateMatchId(),
          tournamentId: tournament.id,
          bracketId: bracket.id,
          
          participants: [
            {
              participantId: participants[i],
              side: 'player1',
              ready: false,
              connected: false
            },
            {
              participantId: participants[i + 1],
              side: 'player2',
              ready: false,
              connected: false
            }
          ],

          scheduledTime: new Date(tournament.config.tournamentStart.getTime() + matches.length * tournament.config.breakDuration * 60 * 1000),
          status: 'scheduled',

          results: {
            scores: {},
            statistics: {}
          },

          config: {
            bestOf: 1,
            gameMode: 'standard',
            timeLimit: tournament.config.matchDuration,
            spectatorMode: tournament.config.allowSpectators,
            recordingEnabled: true
          },

          moderation: {
            disputed: false
          }
        };

        matches.push(match);
        this.matches.set(match.id, match);
        bracket.matches.push(match.id);
      }
    }

    tournament.stats.totalMatches += matches.length;
  }

  private async checkTournamentStart(tournament: Tournament): Promise<void> {
    const now = new Date();
    
    if (now >= tournament.config.tournamentStart && 
        tournament.participants.length >= tournament.config.minParticipants &&
        tournament.status === 'registration') {
      
      tournament.status = 'ready';
      
      // Генерируем сетку
      await this.generateBrackets(tournament.id);
      
      tournament.status = 'in_progress';
      
      this.emit('tournamentStarted', tournament);
      logger.info(`Tournament started: ${tournament.id}`);
    }
  }

  private async advanceTournament(tournament: Tournament, completedMatch: Match): Promise<void> {
    // Логика продвижения турнира зависит от типа
    // Здесь упрощенная версия для single elimination

    const bracket = tournament.brackets.find(b => b.id === completedMatch.bracketId);
    if (!bracket) return;

    const bracketMatches = bracket.matches.map(mId => this.matches.get(mId)).filter(Boolean) as Match[];
    const completedMatches = bracketMatches.filter(m => m.status === 'completed');

    // Проверяем, завершены ли все матчи в этом раунде
    if (completedMatches.length === bracketMatches.length) {
      // Все матчи раунда завершены, можно генерировать следующий раунд
      const winners = completedMatches.map(m => m.winner!);
      
      if (winners.length === 1) {
        // Турнир завершен
        tournament.status = 'completed';
        
        // Определяем финальные места
        this.calculateFinalRankings(tournament);
        
        // Выдаем призы
        await this.distributePrizes(tournament);
        
        this.emit('tournamentCompleted', tournament);
        logger.info(`Tournament completed: ${tournament.id}`);
      } else {
        // Создаем следующий раунд
        await this.createNextRound(tournament, bracket, winners);
      }
    }
  }

  private async createNextRound(tournament: Tournament, bracket: TournamentBracket, winners: string[]): Promise<void> {
    // Создание матчей следующего раунда
    const nextRoundMatches: Match[] = [];

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        const match: Match = {
          id: this.generateMatchId(),
          tournamentId: tournament.id,
          bracketId: bracket.id,
          
          participants: [
            {
              participantId: winners[i],
              side: 'player1',
              ready: false,
              connected: false
            },
            {
              participantId: winners[i + 1],
              side: 'player2',
              ready: false,
              connected: false
            }
          ],

          scheduledTime: new Date(Date.now() + tournament.config.breakDuration * 60 * 1000),
          status: 'scheduled',

          results: {
            scores: {},
            statistics: {}
          },

          config: {
            bestOf: 1,
            gameMode: 'standard',
            timeLimit: tournament.config.matchDuration,
            spectatorMode: tournament.config.allowSpectators,
            recordingEnabled: true
          },

          moderation: {
            disputed: false
          }
        };

        nextRoundMatches.push(match);
        this.matches.set(match.id, match);
        bracket.matches.push(match.id);
      }
    }

    tournament.stats.totalMatches += nextRoundMatches.length;
  }

  private calculateFinalRankings(tournament: Tournament): void {
    // Простое ранжирование по количеству побед
    const participants = tournament.participants.sort((a, b) => {
      const aWins = a.tournamentResults.matchesWon;
      const bWins = b.tournamentResults.matchesWon;
      const aScore = a.tournamentResults.totalScore;
      const bScore = b.tournamentResults.totalScore;
      
      if (aWins !== bWins) return bWins - aWins;
      return bScore - aScore;
    });

    participants.forEach((participant, index) => {
      participant.tournamentResults.finalRank = index + 1;
    });
  }

  private async distributePrizes(tournament: Tournament): Promise<void> {
    for (const prizeConfig of tournament.prizes.distribution) {
      const participant = tournament.participants.find(p => 
        p.tournamentResults.finalRank === prizeConfig.place
      );
      
      if (participant) {
        participant.tournamentResults.prizeWon = prizeConfig.amount;
        
        // Здесь была бы интеграция с системой экономики
        // await economyService.addCurrency(participant.userId, tournament.prizes.currency, prizeConfig.amount);
        
        this.emit('prizeAwarded', {
          tournamentId: tournament.id,
          participantId: participant.id,
          place: prizeConfig.place,
          amount: prizeConfig.amount,
          currency: tournament.prizes.currency
        });
      }
    }
  }

  private startTournamentScheduler(): void {
    // Проверка турниров каждую минуту
    setInterval(() => {
      this.checkScheduledTournaments();
    }, 60 * 1000);
  }

  private checkScheduledTournaments(): void {
    const now = new Date();
    
    for (const tournament of this.tournaments.values()) {
      // Проверяем начало регистрации
      if (tournament.status === 'draft' && now >= tournament.config.registrationStart) {
        tournament.status = 'registration';
        this.emit('registrationOpened', tournament);
      }
      
      // Проверяем окончание регистрации
      if (tournament.status === 'registration' && now >= tournament.config.registrationEnd) {
        if (tournament.participants.length >= tournament.config.minParticipants) {
          tournament.status = 'ready';
          this.emit('registrationClosed', tournament);
        } else {
          tournament.status = 'cancelled';
          this.emit('tournamentCancelled', { tournament, reason: 'insufficient_participants' });
        }
      }
      
      // Проверяем автоматический старт
      if (tournament.status === 'ready' && 
          tournament.config.autoStart && 
          now >= tournament.config.tournamentStart) {
        this.checkTournamentStart(tournament);
      }
    }
  }

  private estimateTournamentDuration(participants: number, type: string, matchDuration: number): number {
    let totalMatches = 0;
    
    switch (type) {
      case 'single_elimination':
        totalMatches = participants - 1;
        break;
      case 'double_elimination':
        totalMatches = (participants - 1) * 2;
        break;
      case 'round_robin':
        totalMatches = (participants * (participants - 1)) / 2;
        break;
      case 'swiss':
        totalMatches = participants * Math.ceil(Math.log2(participants));
        break;
    }
    
    return totalMatches * matchDuration; // минуты
  }

  private calculateTotalPrizePool(distribution: Array<{place: number; amount: number}>): number {
    return distribution.reduce((sum, prize) => sum + prize.amount, 0);
  }

  private generateTournamentId(): string {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBracketId(): string {
    return `bracket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const tournamentService = new TournamentService();
export { TournamentService }; 