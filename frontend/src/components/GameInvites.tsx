import React, { useState, useEffect } from 'react';
import { 
  GamepadIcon, 
  Users, 
  Trophy, 
  Clock, 
  Calendar, 
  Send, 
  Check, 
  X, 
  Star,
  Gift,
  Zap,
  Target,
  Crown,
  Medal
} from 'lucide-react';

interface GameInvite {
  id: string;
  gameId: string;
  fromUserId: string;
  toUserId: string;
  fromUser: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  gameData: {
    title: string;
    type: string;
    difficulty: string;
    thumbnail?: string;
  };
}

interface Tournament {
  id: string;
  title: string;
  description: string;
  gameId: string;
  gameType: string;
  createdBy: string;
  organizer: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  participants: string[];
  maxParticipants?: number;
  startDate: Date;
  endDate: Date;
  prize?: {
    type: 'xp' | 'badge' | 'item';
    value: string | number;
    description: string;
  };
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  rules: string[];
  leaderboard?: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
  }>;
}

interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  challenger: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  gameId: string;
  gameTitle: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: Date;
  expiresAt: Date;
  results?: {
    challengerScore: number;
    challengedScore: number;
    winner: string;
  };
}

const GameInvites: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invites' | 'tournaments' | 'challenges'>('invites');
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invitesRes, tournamentsRes, challengesRes] = await Promise.all([
        fetch('/api/social/game-invites'),
        fetch('/api/social/tournaments'),
        fetch('/api/social/challenges')
      ]);

      const [invitesData, tournamentsData, challengesData] = await Promise.all([
        invitesRes.json(),
        tournamentsRes.json(),
        challengesRes.json()
      ]);

      setInvites(invitesData.invites || []);
      setTournaments(tournamentsData.tournaments || []);
      setChallenges(challengesData.challenges || []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/social/game-invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });

      if (response.ok) {
        const data = await response.json();
        setInvites(prev => prev.map(invite => 
          invite.id === inviteId 
            ? { ...invite, status: accept ? 'accepted' : 'declined' }
            : invite
        ));

        if (accept && data.gameUrl) {
          window.open(data.gameUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Ошибка ответа на приглашение:', error);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/social/tournaments/${tournamentId}/join`, {
        method: 'POST'
      });

      if (response.ok) {
        setTournaments(prev => prev.map(tournament => 
          tournament.id === tournamentId 
            ? { ...tournament, participants: [...tournament.participants, 'current_user_id'] }
            : tournament
        ));
      }
    } catch (error) {
      console.error('Ошибка участия в турнире:', error);
    }
  };

  const respondToChallenge = async (challengeId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/social/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });

      if (response.ok) {
        const data = await response.json();
        setChallenges(prev => prev.map(challenge => 
          challenge.id === challengeId 
            ? { ...challenge, status: accept ? 'accepted' : 'declined' }
            : challenge
        ));

        if (accept && data.gameUrl) {
          window.open(data.gameUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Ошибка ответа на вызов:', error);
    }
  };

  const formatTimeLeft = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Истек';
    
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    if (diffDays > 0) return `${diffDays} дн`;
    if (diffHours > 0) return `${diffHours} ч`;
    return `${diffMins} мин`;
  };

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case 'xp': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'badge': return <Medal className="w-4 h-4 text-purple-500" />;
      case 'item': return <Gift className="w-4 h-4 text-blue-500" />;
      default: return <Trophy className="w-4 h-4 text-gold-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и табы */}
      <div className="border-b border-gray-200">
        <div className="flex justify-between items-center p-6">
          <h2 className="text-xl font-semibold text-gray-900">Игровые активности</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{invites.filter(i => i.status === 'pending').length} приглашений</span>
            <span>{tournaments.filter(t => t.status === 'active').length} турниров</span>
            <span>{challenges.filter(c => c.status === 'pending').length} вызовов</span>
          </div>
        </div>
        
        <div className="flex space-x-0">
          {[
            { key: 'invites', label: 'Приглашения', icon: GamepadIcon, count: invites.filter(i => i.status === 'pending').length },
            { key: 'tournaments', label: 'Турниры', icon: Trophy, count: tournaments.filter(t => t.status === 'active').length },
            { key: 'challenges', label: 'Вызовы', icon: Target, count: challenges.filter(c => c.status === 'pending').length }
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors relative ${
                activeTab === key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {count > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Содержимое табов */}
      <div className="p-6">
        {/* Игровые приглашения */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            {invites.length === 0 ? (
              <div className="text-center py-12">
                <GamepadIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет игровых приглашений
                </h3>
                <p className="text-gray-500">
                  Здесь будут отображаться приглашения в игры от друзей
                </p>
              </div>
            ) : (
              invites.map((invite) => (
                <div key={invite.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Аватар */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {invite.fromUser.avatar ? (
                          <img 
                            src={invite.fromUser.avatar} 
                            alt={invite.fromUser.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          invite.fromUser.username.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Содержимое */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{invite.fromUser.displayName}</span>
                          <span className="text-gray-500">пригласил вас в игру</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invite.status)}`}>
                            {invite.status === 'pending' && 'Ожидает'}
                            {invite.status === 'accepted' && 'Принято'}
                            {invite.status === 'declined' && 'Отклонено'}
                            {invite.status === 'expired' && 'Истекло'}
                          </span>
                        </div>

                        {/* Информация об игре */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-3">
                            {invite.gameData.thumbnail ? (
                              <img 
                                src={invite.gameData.thumbnail} 
                                alt={invite.gameData.title}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                                <GamepadIcon className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium text-gray-900">{invite.gameData.title}</h4>
                              <div className="text-sm text-gray-500">
                                {invite.gameData.type} • Сложность: {invite.gameData.difficulty}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Сообщение */}
                        {invite.message && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                            <p className="text-sm text-blue-800">"{invite.message}"</p>
                          </div>
                        )}

                        {/* Время */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Истекает через {formatTimeLeft(invite.expiresAt)}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(invite.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Действия */}
                    {invite.status === 'pending' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => respondToInvite(invite.id, true)}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Принять</span>
                        </button>
                        <button
                          onClick={() => respondToInvite(invite.id, false)}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Отклонить</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Турниры */}
        {activeTab === 'tournaments' && (
          <div className="space-y-4">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет активных турниров
                </h3>
                <p className="text-gray-500">
                  Турниры появятся здесь, когда их создадут другие игроки
                </p>
              </div>
            ) : (
              tournaments.map((tournament) => (
                <div key={tournament.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Заголовок */}
                      <div className="flex items-center space-x-3 mb-3">
                        <Crown className="w-6 h-6 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{tournament.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                          {tournament.status === 'upcoming' && 'Скоро'}
                          {tournament.status === 'active' && 'Активен'}
                          {tournament.status === 'completed' && 'Завершен'}
                          {tournament.status === 'cancelled' && 'Отменен'}
                        </span>
                      </div>

                      {/* Описание */}
                      <p className="text-gray-600 mb-4">{tournament.description}</p>

                      {/* Информация о турнире */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <GamepadIcon className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">Игра</span>
                          </div>
                          <span className="text-gray-900">{tournament.gameType}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <Users className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-700">Участники</span>
                          </div>
                          <span className="text-gray-900">
                            {tournament.participants.length}
                            {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
                          </span>
                        </div>
                      </div>

                      {/* Время проведения */}
                      <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Начало: {new Date(tournament.startDate).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Конец: {new Date(tournament.endDate).toLocaleString('ru-RU')}</span>
                        </div>
                      </div>

                      {/* Приз */}
                      {tournament.prize && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-2">
                            {getPrizeIcon(tournament.prize.type)}
                            <span className="font-medium text-yellow-800">Приз:</span>
                            <span className="text-yellow-700">{tournament.prize.description}</span>
                          </div>
                        </div>
                      )}

                      {/* Организатор */}
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>Организатор:</span>
                        <span className="font-medium">{tournament.organizer.displayName}</span>
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="ml-6">
                      {tournament.status === 'upcoming' && !tournament.participants.includes('current_user_id') && (
                        <button
                          onClick={() => joinTournament(tournament.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Trophy className="w-4 h-4" />
                          <span>Участвовать</span>
                        </button>
                      )}
                      {tournament.participants.includes('current_user_id') && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                          <Check className="w-4 h-4" />
                          <span>Участвую</span>
                        </div>
                      )}
                      {tournament.status === 'active' && (
                        <button className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                          <Star className="w-4 h-4" />
                          <span>Играть</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Таблица лидеров */}
                  {tournament.leaderboard && tournament.leaderboard.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Таблица лидеров</h4>
                      <div className="space-y-2">
                        {tournament.leaderboard.slice(0, 5).map((entry, index) => (
                          <div key={entry.userId} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                index === 2 ? 'bg-yellow-700 text-white' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {entry.rank}
                              </div>
                              <span className="font-medium">{entry.username}</span>
                            </div>
                            <span className="font-semibold text-blue-600">{entry.score.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Вызовы */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет активных вызовов
                </h3>
                <p className="text-gray-500">
                  Бросьте вызов друзьям или примите их вызовы
                </p>
              </div>
            ) : (
              challenges.map((challenge) => (
                <div key={challenge.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Аватар */}
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {challenge.challenger.avatar ? (
                          <img 
                            src={challenge.challenger.avatar} 
                            alt={challenge.challenger.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          challenge.challenger.username.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Содержимое */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{challenge.challenger.displayName}</span>
                          <span className="text-gray-500">бросил вам вызов</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(challenge.status)}`}>
                            {challenge.status === 'pending' && 'Ожидает'}
                            {challenge.status === 'accepted' && 'Принят'}
                            {challenge.status === 'declined' && 'Отклонен'}
                            {challenge.status === 'completed' && 'Завершен'}
                          </span>
                        </div>

                        {/* Игра */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <Target className="w-5 h-5 text-red-500" />
                            <span className="font-medium text-red-800">Дуэль в игре: {challenge.gameTitle}</span>
                          </div>
                        </div>

                        {/* Сообщение */}
                        {challenge.message && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700">"{challenge.message}"</p>
                          </div>
                        )}

                        {/* Результаты */}
                        {challenge.results && challenge.status === 'completed' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-green-600">Ваш результат:</span>
                                <span className="ml-2 font-semibold text-green-800">{challenge.results.challengedScore}</span>
                              </div>
                              <div>
                                <span className="text-sm text-green-600">Результат {challenge.challenger.displayName}:</span>
                                <span className="ml-2 font-semibold text-green-800">{challenge.results.challengerScore}</span>
                              </div>
                              <div className="text-center">
                                {challenge.results.winner === 'current_user_id' ? (
                                  <div className="flex items-center space-x-1 text-yellow-600">
                                    <Crown className="w-4 h-4" />
                                    <span className="font-semibold">Победа!</span>
                                  </div>
                                ) : (
                                  <span className="text-red-600 font-semibold">Поражение</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Время */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Истекает через {formatTimeLeft(challenge.expiresAt)}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(challenge.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Действия */}
                    {challenge.status === 'pending' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => respondToChallenge(challenge.id, true)}
                          className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          <Target className="w-4 h-4" />
                          <span>Принять вызов</span>
                        </button>
                        <button
                          onClick={() => respondToChallenge(challenge.id, false)}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Отклонить</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInvites; 