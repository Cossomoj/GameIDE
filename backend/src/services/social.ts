import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { analyticsService } from './analytics';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  level: number;
  xp: number;
  gamesCreated: number;
  achievementsCount: number;
  status: 'online' | 'offline' | 'away' | 'playing';
  lastSeen: Date;
  createdAt: Date;
  preferences: {
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    showActivity: boolean;
    notificationSettings: {
      friendRequests: boolean;
      gameInvites: boolean;
      achievements: boolean;
      comments: boolean;
    };
  };
  profile: {
    bio?: string;
    location?: string;
    website?: string;
    favoriteGenres: string[];
    badges: string[];
  };
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  status: 'pending' | 'accepted' | 'blocked';
  requestedBy: string;
  createdAt: Date;
  acceptedAt?: Date;
  mutualFriends: number;
}

export interface GameInvite {
  id: string;
  gameId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  gameData?: {
    title: string;
    type: string;
    difficulty: string;
    thumbnail?: string;
  };
}

export interface SocialActivity {
  id: string;
  userId: string;
  type: 'game_created' | 'achievement_unlocked' | 'friend_added' | 'game_shared' | 'high_score' | 'level_up';
  content: {
    title: string;
    description: string;
    icon: string;
    data?: any;
  };
  visibility: 'public' | 'friends' | 'private';
  likes: number;
  comments: number;
  createdAt: Date;
  gameId?: string;
  achievementId?: string;
}

export interface SocialComment {
  id: string;
  activityId?: string;
  gameId?: string;
  userId: string;
  content: string;
  likes: number;
  replies: SocialComment[];
  parentId?: string;
  createdAt: Date;
  editedAt?: Date;
}

export interface SocialNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'game_invite' | 'achievement' | 'comment' | 'like' | 'mention';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  actionUrl?: string;
  data?: any;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ShareableContent {
  id: string;
  type: 'game' | 'achievement' | 'score' | 'activity';
  title: string;
  description: string;
  thumbnail?: string;
  url: string;
  metadata: {
    gameType?: string;
    score?: number;
    difficulty?: string;
    completionTime?: number;
  };
  shareCount: number;
  platforms: {
    vk: boolean;
    telegram: boolean;
    twitter: boolean;
    discord: boolean;
  };
}

export interface SocialChallenge {
  id: string;
  createdBy: string;
  gameId: string;
  title: string;
  description: string;
  rules: string[];
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
  leaderboard: Array<{
    userId: string;
    score: number;
    completionTime?: number;
    rank: number;
  }>;
}

class SocialService extends EventEmitter {
  private users: Map<string, User> = new Map();
  private friendships: Map<string, Friendship> = new Map();
  private gameInvites: Map<string, GameInvite> = new Map();
  private activities: Map<string, SocialActivity> = new Map();
  private comments: Map<string, SocialComment> = new Map();
  private notifications: Map<string, SocialNotification[]> = new Map();
  private shareableContent: Map<string, ShareableContent> = new Map();
  private challenges: Map<string, SocialChallenge> = new Map();
  private userSessions: Map<string, { lastActivity: Date; isOnline: boolean }> = new Map();

  constructor() {
    super();
    this.setupCleanupJobs();
    this.initializeDefaultUsers();
  }

  // Инициализация пользователей по умолчанию
  private initializeDefaultUsers(): void {
    const defaultUsers: Partial<User>[] = [
      {
        id: 'demo-user-1',
        username: 'gamemaster',
        displayName: 'Мастер Игр',
        level: 15,
        xp: 12500,
        gamesCreated: 45,
        achievementsCount: 32,
        status: 'online',
        profile: {
          bio: 'Создаю крутые игры уже 3 года! Люблю аркады и головоломки.',
          favoriteGenres: ['Аркада', 'Головоломки', 'Стратегия'],
          badges: ['Первопроходец', 'Творец', 'Мастер']
        }
      },
      {
        id: 'demo-user-2',
        username: 'puzzlelover',
        displayName: 'Любитель Головоломок',
        level: 8,
        xp: 6200,
        gamesCreated: 12,
        achievementsCount: 18,
        status: 'away',
        profile: {
          bio: 'Обожаю сложные головоломки и логические игры.',
          favoriteGenres: ['Головоломки', 'Логические'],
          badges: ['Мыслитель', 'Настойчивый']
        }
      },
      {
        id: 'demo-user-3',
        username: 'speedrunner',
        displayName: 'Спидраннер',
        level: 22,
        xp: 28000,
        gamesCreated: 8,
        achievementsCount: 56,
        status: 'playing',
        profile: {
          bio: 'Прохожу игры на рекордное время. Лучший результат: 2:34 в платформере!',
          favoriteGenres: ['Платформеры', 'Аркада'],
          badges: ['Скорость', 'Рекордсмен', 'Чемпион']
        }
      }
    ];

    defaultUsers.forEach(userData => {
      const user: User = {
        id: userData.id!,
        username: userData.username!,
        displayName: userData.displayName!,
        avatar: undefined,
        level: userData.level!,
        xp: userData.xp!,
        gamesCreated: userData.gamesCreated!,
        achievementsCount: userData.achievementsCount!,
        status: userData.status!,
        lastSeen: new Date(),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Случайная дата в прошлом году
        preferences: {
          showOnlineStatus: true,
          allowFriendRequests: true,
          showActivity: true,
          notificationSettings: {
            friendRequests: true,
            gameInvites: true,
            achievements: true,
            comments: true
          }
        },
        profile: userData.profile!
      };

      this.users.set(user.id, user);
      this.userSessions.set(user.id, {
        lastActivity: new Date(),
        isOnline: user.status === 'online'
      });
    });

    // Создаем дружбу между пользователями
    this.createFriendship('demo-user-1', 'demo-user-2', 'demo-user-1');
    this.createFriendship('demo-user-1', 'demo-user-3', 'demo-user-3');

    // Создаем активности
    this.createDefaultActivities();
    this.createDefaultChallenge();
  }

  // Создание активностей по умолчанию
  private createDefaultActivities(): void {
    const activities: Partial<SocialActivity>[] = [
      {
        userId: 'demo-user-1',
        type: 'game_created',
        content: {
          title: 'Создал новую игру',
          description: 'Космический платформер "Звездный путь"',
          icon: '🚀',
          data: { gameType: 'platformer', difficulty: 'medium' }
        },
        visibility: 'public',
        likes: 12,
        comments: 3,
        gameId: 'space-platformer-1'
      },
      {
        userId: 'demo-user-2',
        type: 'achievement_unlocked',
        content: {
          title: 'Разблокировал достижение',
          description: 'Решил 100 головоломок',
          icon: '🧩',
          data: { achievementName: 'Мастер головоломок' }
        },
        visibility: 'friends',
        likes: 8,
        comments: 1,
        achievementId: 'puzzle-master'
      },
      {
        userId: 'demo-user-3',
        type: 'high_score',
        content: {
          title: 'Новый рекорд!',
          description: 'Установил рекорд в игре "Быстрые пальцы" - 2:34',
          icon: '⚡',
          data: { score: 154, time: 154000 }
        },
        visibility: 'public',
        likes: 24,
        comments: 7,
        gameId: 'fast-fingers-1'
      }
    ];

    activities.forEach(activityData => {
      const activity: SocialActivity = {
        id: uuidv4(),
        userId: activityData.userId!,
        type: activityData.type!,
        content: activityData.content!,
        visibility: activityData.visibility!,
        likes: activityData.likes!,
        comments: activityData.comments!,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Случайная дата на прошлой неделе
        gameId: activityData.gameId,
        achievementId: activityData.achievementId
      };

      this.activities.set(activity.id, activity);
    });
  }

  // Создание вызова по умолчанию
  private createDefaultChallenge(): void {
    const challenge: SocialChallenge = {
      id: uuidv4(),
      createdBy: 'demo-user-1',
      gameId: 'weekly-puzzle',
      title: 'Еженедельный вызов головоломок',
      description: 'Соревнование на лучшее время решения головоломки недели',
      rules: [
        'Решите головоломку как можно быстрее',
        'Максимум 3 попытки',
        'Запрещено использование подсказок'
      ],
      participants: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
      maxParticipants: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Через неделю
      prize: {
        type: 'xp',
        value: 1000,
        description: '1000 очков опыта победителю'
      },
      status: 'active',
      leaderboard: [
        { userId: 'demo-user-3', score: 2340, completionTime: 154000, rank: 1 },
        { userId: 'demo-user-1', score: 2200, completionTime: 167000, rank: 2 },
        { userId: 'demo-user-2', score: 2100, completionTime: 189000, rank: 3 }
      ]
    };

    this.challenges.set(challenge.id, challenge);
  }

  // Настройка задач очистки
  private setupCleanupJobs(): void {
    // Очистка просроченных приглашений каждый час
    setInterval(() => {
      this.cleanupExpiredInvites();
    }, 60 * 60 * 1000);

    // Обновление статуса пользователей каждые 5 минут
    setInterval(() => {
      this.updateUserStatuses();
    }, 5 * 60 * 1000);

    // Очистка старых уведомлений каждые 24 часа
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);
  }

  // Управление пользователями

  // Создание/обновление пользователя
  createOrUpdateUser(userData: Partial<User>): User {
    const userId = userData.id || uuidv4();
    const existingUser = this.users.get(userId);
    
    const user: User = {
      id: userId,
      username: userData.username || existingUser?.username || `user_${userId.slice(0, 8)}`,
      displayName: userData.displayName || existingUser?.displayName || `Пользователь ${userId.slice(0, 8)}`,
      avatar: userData.avatar || existingUser?.avatar,
      email: userData.email || existingUser?.email,
      level: userData.level || existingUser?.level || 1,
      xp: userData.xp || existingUser?.xp || 0,
      gamesCreated: userData.gamesCreated || existingUser?.gamesCreated || 0,
      achievementsCount: userData.achievementsCount || existingUser?.achievementsCount || 0,
      status: userData.status || existingUser?.status || 'offline',
      lastSeen: new Date(),
      createdAt: existingUser?.createdAt || new Date(),
      preferences: {
        ...existingUser?.preferences,
        ...userData.preferences
      } || {
        showOnlineStatus: true,
        allowFriendRequests: true,
        showActivity: true,
        notificationSettings: {
          friendRequests: true,
          gameInvites: true,
          achievements: true,
          comments: true
        }
      },
      profile: {
        ...existingUser?.profile,
        ...userData.profile
      } || {
        favoriteGenres: [],
        badges: []
      }
    };

    this.users.set(userId, user);
    this.userSessions.set(userId, {
      lastActivity: new Date(),
      isOnline: user.status === 'online'
    });

    this.emit('user-updated', user);
    return user;
  }

  // Получение пользователя
  getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  // Поиск пользователей
  searchUsers(query: string, limit: number = 20): User[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.displayName.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);
  }

  // Обновление статуса пользователя
  updateUserStatus(userId: string, status: User['status']): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.status = status;
    user.lastSeen = new Date();

    const session = this.userSessions.get(userId);
    if (session) {
      session.isOnline = status === 'online';
      session.lastActivity = new Date();
    }

    this.emit('user-status-changed', { userId, status });
    return true;
  }

  // Система друзей

  // Отправка запроса в друзья
  sendFriendRequest(fromUserId: string, toUserId: string): string | null {
    if (fromUserId === toUserId) return null;

    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);
    
    if (!fromUser || !toUser) return null;
    if (!toUser.preferences.allowFriendRequests) return null;

    // Проверяем, нет ли уже дружбы или запроса
    const existingFriendship = this.findFriendship(fromUserId, toUserId);
    if (existingFriendship) return null;

    const friendshipId = uuidv4();
    const friendship: Friendship = {
      id: friendshipId,
      userId1: fromUserId,
      userId2: toUserId,
      status: 'pending',
      requestedBy: fromUserId,
      createdAt: new Date(),
      mutualFriends: this.getMutualFriendsCount(fromUserId, toUserId)
    };

    this.friendships.set(friendshipId, friendship);

    // Создаем уведомление
    this.createNotification(toUserId, {
      type: 'friend_request',
      title: 'Новый запрос в друзья',
      message: `${fromUser.displayName} хочет добавить вас в друзья`,
      icon: '👤',
      data: { fromUserId, friendshipId }
    });

    this.emit('friend-request-sent', { friendship, fromUser, toUser });

    // Отслеживаем в аналитике
    analyticsService.trackEvent({
      eventType: 'social',
      eventName: 'friend_request_sent',
      userId: fromUserId,
      properties: { targetUserId: toUserId }
    });

    return friendshipId;
  }

  // Принятие запроса в друзья
  acceptFriendRequest(friendshipId: string, userId: string): boolean {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship || friendship.status !== 'pending') return false;
    if (friendship.userId2 !== userId) return false;

    friendship.status = 'accepted';
    friendship.acceptedAt = new Date();

    const fromUser = this.users.get(friendship.userId1);
    const toUser = this.users.get(friendship.userId2);

    if (fromUser && toUser) {
      // Создаем уведомления
      this.createNotification(friendship.userId1, {
        type: 'friend_accepted',
        title: 'Запрос принят',
        message: `${toUser.displayName} принял ваш запрос в друзья`,
        icon: '✅',
        data: { friendUserId: friendship.userId2 }
      });

      // Создаем активности
      this.createActivity(friendship.userId1, {
        type: 'friend_added',
        content: {
          title: 'Новый друг',
          description: `Теперь дружит с ${toUser.displayName}`,
          icon: '👥'
        },
        visibility: 'friends'
      });

      this.createActivity(friendship.userId2, {
        type: 'friend_added',
        content: {
          title: 'Новый друг',
          description: `Теперь дружит с ${fromUser.displayName}`,
          icon: '👥'
        },
        visibility: 'friends'
      });
    }

    this.emit('friend-request-accepted', { friendship, fromUser, toUser });

    // Отслеживаем в аналитике
    analyticsService.trackEvent({
      eventType: 'social',
      eventName: 'friend_request_accepted',
      userId,
      properties: { friendUserId: friendship.userId1 }
    });

    return true;
  }

  // Отклонение запроса в друзья
  declineFriendRequest(friendshipId: string, userId: string): boolean {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship || friendship.status !== 'pending') return false;
    if (friendship.userId2 !== userId) return false;

    this.friendships.delete(friendshipId);
    this.emit('friend-request-declined', { friendship });

    return true;
  }

  // Создание дружбы (для демо-данных)
  private createFriendship(userId1: string, userId2: string, requestedBy: string): void {
    const friendshipId = uuidv4();
    const friendship: Friendship = {
      id: friendshipId,
      userId1,
      userId2,
      status: 'accepted',
      requestedBy,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000),
      mutualFriends: 0
    };

    this.friendships.set(friendshipId, friendship);
  }

  // Поиск дружбы
  private findFriendship(userId1: string, userId2: string): Friendship | null {
    for (const friendship of this.friendships.values()) {
      if ((friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
          (friendship.userId1 === userId2 && friendship.userId2 === userId1)) {
        return friendship;
      }
    }
    return null;
  }

  // Получение друзей пользователя
  getUserFriends(userId: string): Array<{ user: User; friendship: Friendship }> {
    const friends: Array<{ user: User; friendship: Friendship }> = [];

    for (const friendship of this.friendships.values()) {
      if (friendship.status !== 'accepted') continue;

      let friendUserId: string | null = null;
      if (friendship.userId1 === userId) {
        friendUserId = friendship.userId2;
      } else if (friendship.userId2 === userId) {
        friendUserId = friendship.userId1;
      }

      if (friendUserId) {
        const friendUser = this.users.get(friendUserId);
        if (friendUser) {
          friends.push({ user: friendUser, friendship });
        }
      }
    }

    return friends.sort((a, b) => {
      // Сортируем: онлайн друзья вверху
      if (a.user.status === 'online' && b.user.status !== 'online') return -1;
      if (b.user.status === 'online' && a.user.status !== 'online') return 1;
      return b.friendship.acceptedAt!.getTime() - a.friendship.acceptedAt!.getTime();
    });
  }

  // Получение взаимных друзей
  private getMutualFriendsCount(userId1: string, userId2: string): number {
    const user1Friends = this.getUserFriends(userId1).map(f => f.user.id);
    const user2Friends = this.getUserFriends(userId2).map(f => f.user.id);
    
    return user1Friends.filter(id => user2Friends.includes(id)).length;
  }

  // Приглашения в игры

  // Отправка приглашения в игру
  sendGameInvite(fromUserId: string, toUserId: string, gameId: string, message?: string): string | null {
    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);
    
    if (!fromUser || !toUser) return null;
    if (!toUser.preferences.notificationSettings.gameInvites) return null;

    const inviteId = uuidv4();
    const invite: GameInvite = {
      id: inviteId,
      gameId,
      fromUserId,
      toUserId,
      message,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
      gameData: {
        title: 'Крутая игра',
        type: 'аркада',
        difficulty: 'средняя'
      }
    };

    this.gameInvites.set(inviteId, invite);

    // Создаем уведомление
    this.createNotification(toUserId, {
      type: 'game_invite',
      title: 'Приглашение в игру',
      message: `${fromUser.displayName} приглашает вас поиграть в ${invite.gameData?.title}`,
      icon: '🎮',
      data: { inviteId, gameId, fromUserId },
      expiresAt: invite.expiresAt
    });

    this.emit('game-invite-sent', { invite, fromUser, toUser });

    // Отслеживаем в аналитике
    analyticsService.trackEvent({
      eventType: 'social',
      eventName: 'game_invite_sent',
      userId: fromUserId,
      properties: { targetUserId: toUserId, gameId }
    });

    return inviteId;
  }

  // Принятие приглашения в игру
  acceptGameInvite(inviteId: string, userId: string): boolean {
    const invite = this.gameInvites.get(inviteId);
    if (!invite || invite.status !== 'pending') return false;
    if (invite.toUserId !== userId) return false;
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      return false;
    }

    invite.status = 'accepted';

    const fromUser = this.users.get(invite.fromUserId);
    if (fromUser) {
      this.createNotification(invite.fromUserId, {
        type: 'game_invite',
        title: 'Приглашение принято',
        message: `${this.users.get(userId)?.displayName} принял приглашение в игру`,
        icon: '✅',
        data: { gameId: invite.gameId }
      });
    }

    this.emit('game-invite-accepted', { invite });
    return true;
  }

  // Социальные активности

  // Создание активности
  createActivity(userId: string, activityData: Partial<SocialActivity>): string {
    const activityId = uuidv4();
    const activity: SocialActivity = {
      id: activityId,
      userId,
      type: activityData.type || 'game_created',
      content: activityData.content || { title: '', description: '', icon: '🎮' },
      visibility: activityData.visibility || 'public',
      likes: 0,
      comments: 0,
      createdAt: new Date(),
      gameId: activityData.gameId,
      achievementId: activityData.achievementId
    };

    this.activities.set(activityId, activity);
    this.emit('activity-created', activity);

    // Отслеживаем в аналитике
    analyticsService.trackEvent({
      eventType: 'social',
      eventName: 'activity_created',
      userId,
      properties: { activityType: activity.type, visibility: activity.visibility }
    });

    return activityId;
  }

  // Получение ленты активности
  getActivityFeed(userId: string, limit: number = 20): SocialActivity[] {
    const userFriends = this.getUserFriends(userId).map(f => f.user.id);
    const allowedUserIds = [userId, ...userFriends];

    return Array.from(this.activities.values())
      .filter(activity => {
        // Показываем только активности пользователя и его друзей
        if (!allowedUserIds.includes(activity.userId)) return false;
        
        // Проверяем видимость
        if (activity.visibility === 'private') return activity.userId === userId;
        if (activity.visibility === 'friends') {
          return activity.userId === userId || userFriends.includes(activity.userId);
        }
        
        return true; // public
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Лайк активности
  likeActivity(activityId: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    activity.likes += 1;
    
    // Создаем уведомление автору (если лайкает не сам автор)
    if (activity.userId !== userId) {
      const user = this.users.get(userId);
      if (user) {
        this.createNotification(activity.userId, {
          type: 'like',
          title: 'Новый лайк',
          message: `${user.displayName} лайкнул вашу активность`,
          icon: '❤️',
          data: { activityId, likedBy: userId }
        });
      }
    }

    this.emit('activity-liked', { activityId, userId, activity });
    return true;
  }

  // Комментарии

  // Добавление комментария
  addComment(data: {
    activityId?: string;
    gameId?: string;
    userId: string;
    content: string;
    parentId?: string;
  }): string {
    const commentId = uuidv4();
    const comment: SocialComment = {
      id: commentId,
      activityId: data.activityId,
      gameId: data.gameId,
      userId: data.userId,
      content: data.content,
      likes: 0,
      replies: [],
      parentId: data.parentId,
      createdAt: new Date()
    };

    this.comments.set(commentId, comment);

    // Обновляем счетчик комментариев активности
    if (data.activityId) {
      const activity = this.activities.get(data.activityId);
      if (activity) {
        activity.comments += 1;
        
        // Создаем уведомление автору активности
        if (activity.userId !== data.userId) {
          const user = this.users.get(data.userId);
          if (user) {
            this.createNotification(activity.userId, {
              type: 'comment',
              title: 'Новый комментарий',
              message: `${user.displayName} прокомментировал вашу активность`,
              icon: '💬',
              data: { activityId: data.activityId, commentId }
            });
          }
        }
      }
    }

    // Если это ответ на комментарий, добавляем в replies
    if (data.parentId) {
      const parentComment = this.comments.get(data.parentId);
      if (parentComment) {
        parentComment.replies.push(comment);
      }
    }

    this.emit('comment-added', comment);
    return commentId;
  }

  // Получение комментариев
  getComments(activityId?: string, gameId?: string): SocialComment[] {
    return Array.from(this.comments.values())
      .filter(comment => {
        if (activityId) return comment.activityId === activityId && !comment.parentId;
        if (gameId) return comment.gameId === gameId && !comment.parentId;
        return false;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Sharing контент

  // Создание контента для sharing
  createShareableContent(data: Partial<ShareableContent>): string {
    const shareId = uuidv4();
    const content: ShareableContent = {
      id: shareId,
      type: data.type || 'game',
      title: data.title || '',
      description: data.description || '',
      thumbnail: data.thumbnail,
      url: data.url || '',
      metadata: data.metadata || {},
      shareCount: 0,
      platforms: data.platforms || {
        vk: true,
        telegram: true,
        twitter: true,
        discord: true
      }
    };

    this.shareableContent.set(shareId, content);
    return shareId;
  }

  // Получение sharing URL
  getShareUrl(shareId: string, platform: string): string {
    const content = this.shareableContent.get(shareId);
    if (!content) return '';

    const baseUrl = 'https://gameide.example.com';
    const shareUrl = `${baseUrl}/share/${shareId}`;
    const text = encodeURIComponent(`${content.title} - ${content.description}`);

    switch (platform) {
      case 'vk':
        return `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${text}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`;
      case 'discord':
        return shareUrl; // Для Discord просто возвращаем URL
      default:
        return shareUrl;
    }
  }

  // Отслеживание sharing
  trackShare(shareId: string, platform: string, userId?: string): void {
    const content = this.shareableContent.get(shareId);
    if (content) {
      content.shareCount += 1;
      
      // Отслеживаем в аналитике
      analyticsService.trackEvent({
        eventType: 'social',
        eventName: 'content_shared',
        userId,
        properties: { 
          shareId, 
          platform, 
          contentType: content.type,
          shareCount: content.shareCount
        }
      });
    }
  }

  // Социальные вызовы

  // Создание вызова
  createChallenge(creatorId: string, challengeData: Partial<SocialChallenge>): string {
    const challengeId = uuidv4();
    const challenge: SocialChallenge = {
      id: challengeId,
      createdBy: creatorId,
      gameId: challengeData.gameId || '',
      title: challengeData.title || '',
      description: challengeData.description || '',
      rules: challengeData.rules || [],
      participants: [creatorId],
      maxParticipants: challengeData.maxParticipants,
      startDate: challengeData.startDate || new Date(),
      endDate: challengeData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      prize: challengeData.prize,
      status: 'upcoming',
      leaderboard: []
    };

    this.challenges.set(challengeId, challenge);

    // Создаем активность
    this.createActivity(creatorId, {
      type: 'game_created',
      content: {
        title: 'Создал вызов',
        description: challenge.title,
        icon: '🏆'
      },
      visibility: 'public',
      gameId: challenge.gameId
    });

    this.emit('challenge-created', challenge);
    return challengeId;
  }

  // Участие в вызове
  joinChallenge(challengeId: string, userId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    if (challenge.participants.includes(userId)) return false;
    if (challenge.maxParticipants && challenge.participants.length >= challenge.maxParticipants) return false;
    if (challenge.status !== 'upcoming' && challenge.status !== 'active') return false;

    challenge.participants.push(userId);
    this.emit('challenge-joined', { challenge, userId });
    return true;
  }

  // Уведомления

  // Создание уведомления
  createNotification(userId: string, notificationData: Partial<SocialNotification>): string {
    const user = this.users.get(userId);
    if (!user) return '';

    // Проверяем настройки уведомлений
    const settings = user.preferences.notificationSettings;
    if (notificationData.type === 'friend_request' && !settings.friendRequests) return '';
    if (notificationData.type === 'game_invite' && !settings.gameInvites) return '';
    if (notificationData.type === 'achievement' && !settings.achievements) return '';
    if (notificationData.type === 'comment' && !settings.comments) return '';

    const notificationId = uuidv4();
    const notification: SocialNotification = {
      id: notificationId,
      userId,
      type: notificationData.type || 'achievement',
      title: notificationData.title || '',
      message: notificationData.message || '',
      icon: notificationData.icon || '🔔',
      read: false,
      actionUrl: notificationData.actionUrl,
      data: notificationData.data,
      createdAt: new Date(),
      expiresAt: notificationData.expiresAt
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification); // Добавляем в начало
    this.notifications.set(userId, userNotifications);

    this.emit('notification-created', { userId, notification });
    return notificationId;
  }

  // Получение уведомлений пользователя
  getUserNotifications(userId: string, limit: number = 20): SocialNotification[] {
    const notifications = this.notifications.get(userId) || [];
    return notifications
      .filter(n => !n.expiresAt || n.expiresAt > new Date())
      .slice(0, limit);
  }

  // Отметка уведомления как прочитанного
  markNotificationAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      return true;
    }
    
    return false;
  }

  // Очистка данных

  // Очистка просроченных приглашений
  private cleanupExpiredInvites(): void {
    const now = new Date();
    let cleanedCount = 0;

    this.gameInvites.forEach((invite, id) => {
      if (invite.expiresAt < now && invite.status === 'pending') {
        invite.status = 'expired';
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.info(`Social: Marked ${cleanedCount} game invites as expired`);
    }
  }

  // Обновление статусов пользователей
  private updateUserStatuses(): void {
    const inactiveThreshold = 15 * 60 * 1000; // 15 минут
    const now = new Date();

    this.userSessions.forEach((session, userId) => {
      if (session.isOnline && (now.getTime() - session.lastActivity.getTime()) > inactiveThreshold) {
        this.updateUserStatus(userId, 'away');
      }
    });
  }

  // Очистка старых уведомлений
  private cleanupOldNotifications(): void {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 дней
    const cutoffDate = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    this.notifications.forEach((notifications, userId) => {
      const filtered = notifications.filter(n => n.createdAt >= cutoffDate);
      if (filtered.length !== notifications.length) {
        cleanedCount += notifications.length - filtered.length;
        this.notifications.set(userId, filtered);
      }
    });

    if (cleanedCount > 0) {
      logger.info(`Social: Cleaned up ${cleanedCount} old notifications`);
    }
  }

  // API методы

  // Получение статистики пользователя
  getUserStats(userId: string): {
    friendsCount: number;
    activitiesCount: number;
    likesReceived: number;
    commentsReceived: number;
    gamesShared: number;
    challengesParticipated: number;
  } {
    const friendsCount = this.getUserFriends(userId).length;
    const userActivities = Array.from(this.activities.values()).filter(a => a.userId === userId);
    const activitiesCount = userActivities.length;
    const likesReceived = userActivities.reduce((sum, a) => sum + a.likes, 0);
    const commentsReceived = userActivities.reduce((sum, a) => sum + a.comments, 0);
    const gamesShared = Array.from(this.shareableContent.values()).reduce((sum, content) => {
      return sum + content.shareCount;
    }, 0);
    const challengesParticipated = Array.from(this.challenges.values())
      .filter(c => c.participants.includes(userId)).length;

    return {
      friendsCount,
      activitiesCount,
      likesReceived,
      commentsReceived,
      gamesShared,
      challengesParticipated
    };
  }

  // Получение популярных пользователей
  getPopularUsers(limit: number = 10): User[] {
    return Array.from(this.users.values())
      .map(user => ({
        user,
        score: user.level * 10 + user.achievementsCount * 5 + user.gamesCreated * 3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.user);
  }

  // Получение активных вызовов
  getActiveChallenges(): SocialChallenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.status === 'active' || c.status === 'upcoming')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  // Получение всех данных пользователя
  getAllUserData(userId: string): {
    user: User | null;
    friends: Array<{ user: User; friendship: Friendship }>;
    activities: SocialActivity[];
    notifications: SocialNotification[];
    stats: any;
  } {
    return {
      user: this.getUser(userId),
      friends: this.getUserFriends(userId),
      activities: this.getActivityFeed(userId),
      notifications: this.getUserNotifications(userId),
      stats: this.getUserStats(userId)
    };
  }
}

export const socialService = new SocialService();
export default socialService; 