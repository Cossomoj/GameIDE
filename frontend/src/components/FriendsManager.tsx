import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  MessageCircle, 
  GamepadIcon,
  Check,
  X,
  MoreHorizontal,
  UserCheck,
  Mail,
  Clock,
  Globe
} from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  level: number;
  gamesCreated: number;
  status: 'online' | 'offline' | 'away' | 'playing';
  lastSeen: Date;
  mutualFriends: number;
  currentGame?: string;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser: {
    username: string;
    displayName: string;
    avatar?: string;
    level: number;
    gamesCreated: number;
  };
  createdAt: Date;
  status: 'pending' | 'accepted' | 'declined';
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  level: number;
  gamesCreated: number;
  friendshipStatus: 'none' | 'pending' | 'friends' | 'blocked';
  mutualFriends: number;
}

const FriendsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/social/friends');
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/social/friend-requests');
      const data = await response.json();
      setFriendRequests(data.requests || []);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearchLoading(true);
      const response = await fetch(`/api/social/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/social/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId })
      });

      if (response.ok) {
        setSearchResults(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, friendshipStatus: 'pending' }
            : user
        ));
      }
    } catch (error) {
      console.error('Ошибка отправки заявки:', error);
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/social/friend-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });

      if (response.ok) {
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
        if (accept) {
          fetchFriends(); // Обновляем список друзей
        }
      }
    } catch (error) {
      console.error('Ошибка ответа на заявку:', error);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm('Вы уверены, что хотите удалить друга?')) return;

    try {
      const response = await fetch(`/api/social/friends/${friendId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFriends(prev => prev.filter(friend => friend.id !== friendId));
      }
    } catch (error) {
      console.error('Ошибка удаления друга:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'playing': return 'bg-blue-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'В сети';
      case 'playing': return 'Играет';
      case 'away': return 'Отошел';
      default: return 'Не в сети';
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и табы */}
      <div className="border-b border-gray-200">
        <div className="flex justify-between items-center p-6">
          <h2 className="text-xl font-semibold text-gray-900">Социальная сеть</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{friends.length} друзей</span>
            {friendRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {friendRequests.length}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-0">
          {[
            { key: 'friends', label: 'Друзья', icon: Users },
            { key: 'requests', label: 'Заявки', icon: UserPlus, count: friendRequests.length },
            { key: 'search', label: 'Поиск', icon: Search }
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
              {count && count > 0 && (
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
        {/* Список друзей */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Загрузка...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  У вас пока нет друзей
                </h3>
                <p className="text-gray-500 mb-4">
                  Найдите друзей через поиск или отправьте им приглашения
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Найти друзей
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {friend.avatar ? (
                          <img 
                            src={friend.avatar} 
                            alt={friend.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">{friend.displayName}</h4>
                        <span className="text-gray-500">@{friend.username}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{getStatusText(friend.status)}</span>
                        {friend.status === 'playing' && friend.currentGame && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <GamepadIcon className="w-3 h-3" />
                              <span>{friend.currentGame}</span>
                            </span>
                          </>
                        )}
                        {friend.status === 'offline' && (
                          <>
                            <span>•</span>
                            <span>{formatLastSeen(friend.lastSeen)}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Уровень {friend.level} • {friend.gamesCreated} игр • {friend.mutualFriends} общих друзей
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      title="Отправить сообщение"
                      className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      title="Пригласить в игру"
                      className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <GamepadIcon className="w-4 h-4" />
                    </button>
                    <div className="relative group">
                      <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => removeFriend(friend.id)}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
                        >
                          <UserMinus className="w-4 h-4" />
                          <span>Удалить из друзей</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Заявки в друзья */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет новых заявок
                </h3>
                <p className="text-gray-500">
                  Здесь будут отображаться заявки в друзья
                </p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.fromUser.avatar ? (
                        <img 
                          src={request.fromUser.avatar} 
                          alt={request.fromUser.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        request.fromUser.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">{request.fromUser.displayName}</h4>
                        <span className="text-gray-500">@{request.fromUser.username}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Уровень {request.fromUser.level} • {request.fromUser.gamesCreated} игр
                      </div>
                      <div className="text-xs text-gray-400 flex items-center space-x-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatLastSeen(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => respondToFriendRequest(request.id, true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Принять</span>
                    </button>
                    <button
                      onClick={() => respondToFriendRequest(request.id, false)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Отклонить</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Поиск пользователей */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Поле поиска */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск пользователей по имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Результаты поиска */}
            {searchLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Поиск...</p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Найдите новых друзей
                </h3>
                <p className="text-gray-500">
                  Введите имя пользователя для поиска
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Пользователи не найдены
                </h3>
                <p className="text-gray-500">
                  Попробуйте изменить запрос
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{user.displayName}</h4>
                          <span className="text-gray-500">@{user.username}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Уровень {user.level} • {user.gamesCreated} игр
                        </div>
                        {user.mutualFriends > 0 && (
                          <div className="text-xs text-blue-600">
                            {user.mutualFriends} общих друзей
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {user.friendshipStatus === 'none' && (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Добавить в друзья</span>
                        </button>
                      )}
                      {user.friendshipStatus === 'pending' && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                          <Clock className="w-4 h-4" />
                          <span>Заявка отправлена</span>
                        </div>
                      )}
                      {user.friendshipStatus === 'friends' && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                          <UserCheck className="w-4 h-4" />
                          <span>Уже друзья</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsManager; 