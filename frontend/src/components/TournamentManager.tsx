import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Award,
  Target,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Medal,
  Crown,
  Swords,
  Timer,
  MapPin,
  Star,
  TrendingUp,
  Filter,
  Search,
  Plus,
  Settings,
  Eye,
  UserPlus,
  UserCheck,
  Zap,
  AlertCircle,
  Info,
  DollarSign,
  Calendar as CalendarIcon,
  ClockIcon
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  gameId: string;
  organizerId: string;
  config: {
    type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';
    maxParticipants: number;
    minParticipants: number;
    registrationStart: Date;
    registrationEnd: Date;
    tournamentStart: Date;
    tournamentEnd?: Date;
    matchDuration: number;
    autoStart: boolean;
    isPublic: boolean;
    allowSpectators: boolean;
  };
  prizes: {
    currency: 'coins' | 'gems' | 'real_money';
    distribution: Array<{ place: number; amount: number }>;
    entryFee?: number;
  };
  status: 'draft' | 'registration' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  participants: Array<{
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    status: string;
    gameStats: {
      level: number;
      rating: number;
      wins: number;
      losses: number;
      winRate: number;
    };
    tournamentResults: {
      finalRank?: number;
      matchesWon: number;
      matchesLost: number;
      totalScore: number;
      prizeWon?: number;
    };
  }>;
  metadata: {
    created: Date;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    estimatedDuration: number;
  };
  stats: {
    totalMatches: number;
    completedMatches: number;
    spectatorCount: number;
    totalPrizePool: number;
  };
}

interface TournamentManagerProps {
  userId: string;
  onTournamentJoined?: (tournament: Tournament) => void;
  onError?: (error: string) => void;
}

const TournamentManager: React.FC<TournamentManagerProps> = ({
  userId,
  onTournamentJoined,
  onError
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-tournaments' | 'create' | 'leaderboard'>('browse');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setTournaments(data.data.tournaments.map((t: any) => ({
          ...t,
          config: {
            ...t.config,
            registrationStart: new Date(t.config.registrationStart),
            registrationEnd: new Date(t.config.registrationEnd),
            tournamentStart: new Date(t.config.tournamentStart),
            tournamentEnd: t.config.tournamentEnd ? new Date(t.config.tournamentEnd) : undefined
          },
          metadata: {
            ...t.metadata,
            created: new Date(t.metadata.created)
          }
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки турниров:', error);
      onError?.('Не удалось загрузить турниры');
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userStats: {
            username: `User${userId}`,
            level: 10,
            rating: 1200,
            wins: 15,
            losses: 5,
            winRate: 75,
            timezone: 'UTC+3'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTournaments(); // Обновляем список
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (tournament) {
          onTournamentJoined?.(tournament);
        }
      } else {
        onError?.(data.error || 'Не удалось зарегистрироваться в турнире');
      }
    } catch (error) {
      console.error('Ошибка регистрации в турнире:', error);
      onError?.('Ошибка регистрации в турнире');
    }
  };

  const createTournament = async (tournamentData: any) => {
    try {
      const response = await fetch('/api/tournaments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: userId,
          tournamentData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTournaments();
        setShowCreateForm(false);
        setActiveTab('my-tournaments');
      } else {
        onError?.(data.error || 'Не удалось создать турнир');
      }
    } catch (error) {
      console.error('Ошибка создания турнира:', error);
      onError?.('Ошибка создания турнира');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  const getTournamentStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'text-blue-600 bg-blue-100';
      case 'ready': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTournamentTypeIcon = (type: string) => {
    switch (type) {
      case 'single_elimination': return <Target className="w-4 h-4" />;
      case 'double_elimination': return <Swords className="w-4 h-4" />;
      case 'round_robin': return <Trophy className="w-4 h-4" />;
      case 'swiss': return <Medal className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-orange-600 bg-orange-100';
      case 'pro': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = searchQuery === '' || 
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournament.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    const matchesDifficulty = difficultyFilter === 'all' || tournament.metadata.difficulty === difficultyFilter;
    const matchesType = typeFilter === 'all' || tournament.config.type === typeFilter;

    return matchesSearch && matchesStatus && matchesDifficulty && matchesType;
  });

  const myTournaments = tournaments.filter(tournament => 
    tournament.organizerId === userId || 
    tournament.participants.some(p => p.userId === userId)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка турниров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trophy className="w-7 h-7 text-yellow-500 mr-3" />
              Турниры и соревнования
            </h2>
            <p className="text-gray-600 mt-1">
              Участвуйте в турнирах и соревнуйтесь с другими игроками
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Создать турнир</span>
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{tournaments.length}</div>
                <div className="text-sm text-blue-700">Всего турниров</div>
              </div>
              <Trophy className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {tournaments.filter(t => ['registration', 'ready', 'in_progress'].includes(t.status)).length}
                </div>
                <div className="text-sm text-green-700">Активные турниры</div>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {tournaments.reduce((sum, t) => sum + t.participants.length, 0)}
                </div>
                <div className="text-sm text-purple-700">Участников</div>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {tournaments.reduce((sum, t) => sum + t.stats.totalPrizePool, 0)}
                </div>
                <div className="text-sm text-yellow-700">Общий призовой фонд</div>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0">
            {[
              { key: 'browse', label: 'Обзор турниров', icon: Eye },
              { key: 'my-tournaments', label: 'Мои турниры', icon: UserCheck },
              { key: 'create', label: 'Создать турнир', icon: Plus },
              { key: 'leaderboard', label: 'Рейтинг', icon: Crown }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Содержимое табов */}
        <div className="p-6">
          {/* Обзор турниров */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* Фильтры */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Поиск турниров..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 w-full"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">Все статусы</option>
                  <option value="registration">Регистрация</option>
                  <option value="ready">Готов к началу</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершен</option>
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">Любая сложность</option>
                  <option value="beginner">Новичок</option>
                  <option value="intermediate">Средний</option>
                  <option value="advanced">Продвинутый</option>
                  <option value="pro">Профессионал</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">Все типы</option>
                  <option value="single_elimination">На выбывание</option>
                  <option value="double_elimination">Двойное выбывание</option>
                  <option value="round_robin">Круговая система</option>
                  <option value="swiss">Швейцарская система</option>
                </select>
              </div>

              {/* Список турниров */}
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Турниры не найдены
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Попробуйте изменить критерии поиска или создайте новый турнир
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Создать турнир
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTournaments.map((tournament) => (
                    <div key={tournament.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      {/* Заголовок турнира */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{tournament.name}</h3>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{tournament.description}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {getTournamentTypeIcon(tournament.config.type)}
                          <span className={`text-xs px-2 py-1 rounded-full ${getTournamentStatusColor(tournament.status)}`}>
                            {tournament.status}
                          </span>
                        </div>
                      </div>

                      {/* Метаданные */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>{tournament.participants.length}/{tournament.config.maxParticipants}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(tournament.metadata.difficulty)}`}>
                            {tournament.metadata.difficulty}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(tournament.metadata.estimatedDuration)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{tournament.stats.totalPrizePool}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Начало: {formatDate(tournament.config.tournamentStart)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Призы */}
                      {tournament.prizes.distribution.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-1">Призы:</div>
                          <div className="flex items-center space-x-2">
                            {tournament.prizes.distribution.slice(0, 3).map((prize, index) => (
                              <div key={prize.place} className="flex items-center space-x-1 text-xs">
                                {index === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                                {index === 1 && <Medal className="w-3 h-3 text-gray-400" />}
                                {index === 2 && <Medal className="w-3 h-3 text-orange-400" />}
                                <span>{prize.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Теги */}
                      {tournament.metadata.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {tournament.metadata.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Действия */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedTournament(tournament)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Подробнее
                        </button>
                        
                        {tournament.status === 'registration' && 
                         !tournament.participants.some(p => p.userId === userId) && (
                          <button
                            onClick={() => joinTournament(tournament.id)}
                            className="flex-1 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                          >
                            Участвовать
                          </button>
                        )}

                        {tournament.participants.some(p => p.userId === userId) && (
                          <div className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg text-center">
                            Зарегистрирован
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Мои турниры */}
          {activeTab === 'my-tournaments' && (
            <div className="space-y-4">
              {myTournaments.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    У вас пока нет турниров
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Создайте свой турнир или зарегистрируйтесь в существующем
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Обзор турниров
                    </button>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                    >
                      Создать турнир
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {myTournaments.map((tournament) => {
                    const isOrganizer = tournament.organizerId === userId;
                    const participant = tournament.participants.find(p => p.userId === userId);
                    
                    return (
                      <div key={tournament.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{tournament.name}</h3>
                              {isOrganizer && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Организатор
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded ${getTournamentStatusColor(tournament.status)}`}>
                                {tournament.status}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm">{tournament.description}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-sm">
                            <div className="text-gray-500">Участники</div>
                            <div className="font-medium">{tournament.participants.length}/{tournament.config.maxParticipants}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">Призовой фонд</div>
                            <div className="font-medium">{tournament.stats.totalPrizePool}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">Начало</div>
                            <div className="font-medium">{formatDate(tournament.config.tournamentStart)}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-500">Длительность</div>
                            <div className="font-medium">{formatDuration(tournament.metadata.estimatedDuration)}</div>
                          </div>
                        </div>

                        {participant && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Ваши результаты</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500">Место</div>
                                <div className="font-medium">
                                  {participant.tournamentResults.finalRank || 'В процессе'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Победы</div>
                                <div className="font-medium">{participant.tournamentResults.matchesWon}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Поражения</div>
                                <div className="font-medium">{participant.tournamentResults.matchesLost}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Приз</div>
                                <div className="font-medium">
                                  {participant.tournamentResults.prizeWon || '0'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setSelectedTournament(tournament)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Подробнее
                          </button>
                          
                          {isOrganizer && tournament.status === 'draft' && (
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                              Настроить
                            </button>
                          )}
                          
                          {tournament.status === 'in_progress' && (
                            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                              Играть
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Создание турнира */}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <TournamentCreateForm
                onSubmit={createTournament}
                onCancel={() => setActiveTab('browse')}
              />
            </div>
          )}

          {/* Рейтинг */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Crown className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Рейтинг игроков
                </h3>
                <p className="text-gray-500">
                  Лучшие игроки по результатам турниров
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Диалог подробностей турнира */}
      {selectedTournament && (
        <TournamentDetailsModal
          tournament={selectedTournament}
          currentUserId={userId}
          onClose={() => setSelectedTournament(null)}
          onJoin={() => joinTournament(selectedTournament.id)}
        />
      )}

      {/* Форма создания турнира */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TournamentCreateForm
              onSubmit={createTournament}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент формы создания турнира
const TournamentCreateForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameId: 'game1',
    type: 'single_elimination',
    maxParticipants: 16,
    minParticipants: 4,
    registrationDuration: 24, // часы
    tournamentDelay: 1, // часы после окончания регистрации
    matchDuration: 30,
    isPublic: true,
    allowSpectators: true,
    prizePool: 1000,
    entryFee: 0,
    difficulty: 'intermediate',
    tags: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date();
    const registrationEnd = new Date(now.getTime() + formData.registrationDuration * 60 * 60 * 1000);
    const tournamentStart = new Date(registrationEnd.getTime() + formData.tournamentDelay * 60 * 60 * 1000);

    const tournamentData = {
      name: formData.name,
      description: formData.description,
      gameId: formData.gameId,
      config: {
        type: formData.type,
        maxParticipants: formData.maxParticipants,
        minParticipants: formData.minParticipants,
        registrationStart: now,
        registrationEnd,
        tournamentStart,
        matchDuration: formData.matchDuration,
        autoStart: true,
        requireApproval: false,
        isPublic: formData.isPublic,
        allowSpectators: formData.allowSpectators,
        streamingAllowed: true
      },
      prizes: {
        currency: 'coins',
        distribution: [
          { place: 1, amount: Math.floor(formData.prizePool * 0.5) },
          { place: 2, amount: Math.floor(formData.prizePool * 0.3) },
          { place: 3, amount: Math.floor(formData.prizePool * 0.2) }
        ],
        entryFee: formData.entryFee
      },
      metadata: {
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        difficulty: formData.difficulty,
        category: 'competitive'
      }
    };

    onSubmit(tournamentData);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать новый турнир</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название турнира
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            placeholder="Введите название турнира"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            rows={3}
            placeholder="Опишите турнир..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип турнира
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="single_elimination">На выбывание</option>
              <option value="double_elimination">Двойное выбывание</option>
              <option value="round_robin">Круговая система</option>
              <option value="swiss">Швейцарская система</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сложность
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="beginner">Новичок</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
              <option value="pro">Профессионал</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Максимум участников
            </label>
            <select
              value={formData.maxParticipants}
              onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value={64}>64</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Минимум участников
            </label>
            <input
              type="number"
              min={2}
              max={formData.maxParticipants}
              value={formData.minParticipants}
              onChange={(e) => setFormData(prev => ({ ...prev, minParticipants: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Призовой фонд
            </label>
            <input
              type="number"
              min={0}
              value={formData.prizePool}
              onChange={(e) => setFormData(prev => ({ ...prev, prizePool: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Входной взнос
            </label>
            <input
              type="number"
              min={0}
              value={formData.entryFee}
              onChange={(e) => setFormData(prev => ({ ...prev, entryFee: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Теги (через запятую)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            placeholder="например: competitive, fast-paced, beginner-friendly"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="w-4 h-4 text-yellow-600"
            />
            <span className="ml-2 text-sm text-gray-700">Публичный турнир</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.allowSpectators}
              onChange={(e) => setFormData(prev => ({ ...prev, allowSpectators: e.target.checked }))}
              className="w-4 h-4 text-yellow-600"
            />
            <span className="ml-2 text-sm text-gray-700">Разрешить зрителей</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Создать турнир
          </button>
        </div>
      </form>
    </div>
  );
};

// Компонент модального окна с подробностями турнира
const TournamentDetailsModal: React.FC<{
  tournament: Tournament;
  currentUserId: string;
  onClose: () => void;
  onJoin: () => void;
}> = ({ tournament, currentUserId, onClose, onJoin }) => {
  const isRegistered = tournament.participants.some(p => p.userId === currentUserId);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tournament.name}</h3>
              <p className="text-gray-600">{tournament.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Информация о турнире */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Информация о турнире</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Тип:</span>
                  <span>{tournament.config.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Участники:</span>
                  <span>{tournament.participants.length}/{tournament.config.maxParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Сложность:</span>
                  <span>{tournament.metadata.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Призовой фонд:</span>
                  <span>{tournament.stats.totalPrizePool}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Длительность матча:</span>
                  <span>{tournament.config.matchDuration} мин</span>
                </div>
              </div>
            </div>

            {/* Расписание */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Расписание</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Регистрация до:</span>
                  <span>{new Intl.DateTimeFormat('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(tournament.config.registrationEnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Начало турнира:</span>
                  <span>{new Intl.DateTimeFormat('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(tournament.config.tournamentStart)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Примерная длительность:</span>
                  <span>{Math.floor(tournament.metadata.estimatedDuration / 60)}ч {tournament.metadata.estimatedDuration % 60}м</span>
                </div>
              </div>
            </div>
          </div>

          {/* Призы */}
          {tournament.prizes.distribution.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Призы</h4>
              <div className="grid grid-cols-3 gap-4">
                {tournament.prizes.distribution.slice(0, 3).map((prize, index) => (
                  <div key={prize.place} className="text-center p-4 border rounded-lg">
                    <div className="flex justify-center mb-2">
                      {index === 0 && <Crown className="w-8 h-8 text-yellow-500" />}
                      {index === 1 && <Medal className="w-8 h-8 text-gray-400" />}
                      {index === 2 && <Medal className="w-8 h-8 text-orange-400" />}
                    </div>
                    <div className="font-semibold">{prize.place}-е место</div>
                    <div className="text-lg font-bold text-yellow-600">{prize.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Участники */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              Участники ({tournament.participants.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {tournament.participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {participant.avatar ? (
                      <img src={participant.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <span className="text-xs font-medium">{participant.username[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{participant.username}</div>
                    <div className="text-xs text-gray-500">
                      Уровень {participant.gameStats.level} • Рейтинг {participant.gameStats.rating}
                    </div>
                  </div>
                  {participant.userId === currentUserId && (
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Это вы
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Теги */}
          {tournament.metadata.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Теги</h4>
              <div className="flex flex-wrap gap-2">
                {tournament.metadata.tags.map(tag => (
                  <span key={tag} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Закрыть
            </button>
            
            {tournament.status === 'registration' && !isRegistered && (
              <button
                onClick={onJoin}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Участвовать в турнире
              </button>
            )}

            {isRegistered && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                Вы зарегистрированы
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentManager; 