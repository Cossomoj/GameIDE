import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ShoppingCart, Heart, Star, Download, Play, Eye, User, Calendar, DollarSign, Tag, Gift, Trophy, Gamepad2, Monitor, Smartphone, Globe, Shield, CheckCircle, AlertCircle, Clock, Plus, Minus, ExternalLink, Share, BookOpen, Settings, Zap, Award } from 'lucide-react';

interface GameStoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  screenshots: string[];
  pricing: {
    type: 'free' | 'paid' | 'freemium' | 'subscription' | 'in-app-purchases';
    basePrice: number;
    currency: string;
    discount?: number;
  };
  rating: {
    average: number;
    count: number;
  };
  developer: {
    id: string;
    name: string;
    verified: boolean;
  };
  stats: {
    downloads: number;
    plays: number;
    views: number;
  };
  technical: {
    platforms: string[];
    languages: string[];
    fileSize: number;
    requirements: any;
  };
  moderation: {
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    moderatorNotes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface GameReview {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  helpful: number;
  unhelpful: number;
  createdAt: Date;
}

interface GameStoreManagerProps {
  userId: string;
  onGameSelected?: (game: GameStoreItem) => void;
  onPurchase?: (gameId: string, purchase: any) => void;
  onError?: (error: string) => void;
}

const GameStoreManager: React.FC<GameStoreManagerProps> = ({
  userId,
  onGameSelected,
  onPurchase,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'details' | 'wishlist' | 'purchases' | 'reviews'>('browse');
  const [games, setGames] = useState<GameStoreItem[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameStoreItem | null>(null);
  const [gameReviews, setGameReviews] = useState<GameReview[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<GameStoreItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Поиск и фильтрация
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPricing, setSelectedPricing] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');

  // Детали игры
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: ''
  });

  const categories = [
    'Все категории', 'Аркады', 'Головоломки', 'Платформеры', 
    'Стратегии', 'Экшен', 'Приключения', 'Симуляторы', 'Гонки'
  ];

  const pricingTypes = [
    'Все типы', 'Бесплатные', 'Платные', 'Freemium', 
    'Подписка', 'Внутриигровые покупки'
  ];

  useEffect(() => {
    loadGames();
    loadWishlist();
    loadPurchases();
    loadRecommendations();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadGameReviews(selectedGame.id);
    }
  }, [selectedGame]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game-store/search?' + new URLSearchParams({
        query: searchQuery,
        category: selectedCategory === 'Все категории' ? '' : selectedCategory,
        pricingType: selectedPricing === 'Все типы' ? '' : selectedPricing,
        priceMin: priceRange[0].toString(),
        priceMax: priceRange[1].toString(),
        rating: minRating.toString(),
        sortBy,
        sortOrder,
        page: '1',
        limit: '20'
      }));

      const result = await response.json();
      if (result.success) {
        setGames(result.data.games || []);
      } else {
        onError?.(result.error || 'Ошибка при загрузке игр');
      }
    } catch (error) {
      console.error('Error loading games:', error);
      onError?.('Ошибка при загрузке игр');
    } finally {
      setLoading(false);
    }
  };

  const loadGameReviews = async (gameId: string) => {
    try {
      const response = await fetch(`/api/game-store/reviews/${gameId}`);
      const result = await response.json();
      if (result.success) {
        setGameReviews(result.data || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const response = await fetch(`/api/game-store/wishlist/${userId}`);
      const result = await response.json();
      if (result.success && result.data.games) {
        setWishlist(result.data.games);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadPurchases = () => {
    // Загрузка покупок из localStorage (симуляция)
    const savedPurchases = localStorage.getItem(`purchases_${userId}`);
    if (savedPurchases) {
      setPurchases(JSON.parse(savedPurchases));
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/game-store/recommendations/${userId}?limit=6`);
      const result = await response.json();
      if (result.success) {
        setRecommendations(result.data || []);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleGameClick = (game: GameStoreItem) => {
    setSelectedGame(game);
    setActiveTab('details');
    onGameSelected?.(game);
  };

  const handlePurchase = async (gameId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/game-store/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          userId,
          paymentMethod: 'credit_card'
        }),
      });

      const result = await response.json();
      if (result.success) {
        const newPurchases = [...purchases, gameId];
        setPurchases(newPurchases);
        localStorage.setItem(`purchases_${userId}`, JSON.stringify(newPurchases));
        
        setShowPurchaseModal(false);
        onPurchase?.(gameId, result.data);
        alert('Игра успешно приобретена!');
      } else {
        onError?.(result.error || 'Ошибка при покупке');
      }
    } catch (error) {
      console.error('Error purchasing game:', error);
      onError?.('Ошибка при покупке игры');
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistToggle = async (gameId: string) => {
    const isInWishlist = wishlist.includes(gameId);
    
    try {
      const response = await fetch('/api/game-store/wishlist', {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameId
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (isInWishlist) {
          setWishlist(wishlist.filter(id => id !== gameId));
        } else {
          setWishlist([...wishlist, gameId]);
        }
      } else {
        onError?.(result.error || 'Ошибка при обновлении списка желаний');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      onError?.('Ошибка при обновлении списка желаний');
    }
  };

  const handleAddReview = async () => {
    if (!selectedGame || !newReview.title || !newReview.content) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/game-store/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: selectedGame.id,
          userId,
          userName: `User ${userId}`,
          rating: newReview.rating,
          title: newReview.title,
          content: newReview.content
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNewReview({ rating: 5, title: '', content: '' });
        setShowReviewModal(false);
        loadGameReviews(selectedGame.id);
        alert('Отзыв успешно добавлен!');
      } else {
        onError?.(result.error || 'Ошибка при добавлении отзыва');
      }
    } catch (error) {
      console.error('Error adding review:', error);
      onError?.('Ошибка при добавлении отзыва');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteReview = async (reviewId: string, helpful: boolean) => {
    try {
      const response = await fetch(`/api/game-store/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          helpful
        }),
      });

      if (response.ok) {
        loadGameReviews(selectedGame!.id);
      }
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const formatPrice = (pricing: GameStoreItem['pricing']) => {
    if (pricing.type === 'free') return 'Бесплатно';
    if (pricing.discount) {
      const discountedPrice = pricing.basePrice * (1 - pricing.discount / 100);
      return (
        <>
          <span className="line-through text-gray-500">{pricing.basePrice} {pricing.currency}</span>
          <span className="text-red-600 font-bold ml-2">{discountedPrice.toFixed(2)} {pricing.currency}</span>
        </>
      );
    }
    return `${pricing.basePrice} ${pricing.currency}`;
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      if (selectedCategory && selectedCategory !== 'Все категории' && game.category !== selectedCategory) {
        return false;
      }
      if (selectedPricing && selectedPricing !== 'Все типы' && game.pricing.type !== selectedPricing.toLowerCase()) {
        return false;
      }
      if (game.rating.average < minRating) {
        return false;
      }
      return true;
    });
  }, [games, selectedCategory, selectedPricing, minRating]);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Заголовок и вкладки */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="w-6 h-6 text-blue-500 mr-2" />
              Магазин игр
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {filteredGames.length} игр
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-0 overflow-x-auto">
          {[
            { id: 'browse', name: 'Обзор', icon: '🎮' },
            { id: 'details', name: 'Детали', icon: '📋' },
            { id: 'wishlist', name: 'Желания', icon: '❤️' },
            { id: 'purchases', name: 'Покупки', icon: '🛒' },
            { id: 'reviews', name: 'Отзывы', icon: '⭐' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Обзор игр */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Поиск и фильтры */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Поиск игр..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <select
                  value={selectedPricing}
                  onChange={(e) => setSelectedPricing(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {pricingTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={loadGames}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Поиск...' : 'Найти игры'}
                </button>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Сортировка:</span>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [by, order] = e.target.value.split('-');
                        setSortBy(by);
                        setSortOrder(order);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="rating-desc">Рейтинг ↓</option>
                      <option value="rating-asc">Рейтинг ↑</option>
                      <option value="downloads-desc">Скачивания ↓</option>
                      <option value="price-asc">Цена ↑</option>
                      <option value="price-desc">Цена ↓</option>
                      <option value="date-desc">Новые</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Список игр */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map(game => (
                  <div
                    key={game.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleGameClick(game)}
                  >
                    <div className="aspect-video bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-gray-400" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{game.title}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWishlistToggle(game.id);
                          }}
                          className={`p-1 rounded-full ${
                            wishlist.includes(game.id)
                              ? 'text-red-500 bg-red-50'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${wishlist.includes(game.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">{game.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {renderStars(game.rating.average, 'sm')}
                          <span className="text-sm text-gray-500">({game.rating.count})</span>
                        </div>
                        <span className="text-sm text-blue-600">{game.category}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">
                          {formatPrice(game.pricing)}
                        </div>
                        
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Download className="w-4 h-4" />
                          <span>{game.stats.downloads.toLocaleString()}</span>
                        </div>
                      </div>

                      {purchases.includes(game.id) && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-700">Приобретено</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Рекомендации */}
            {recommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 text-yellow-500 mr-2" />
                  Рекомендуем для вас
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.slice(0, 3).map(game => (
                    <div
                      key={game.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleGameClick(game)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Gamepad2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{game.title}</h4>
                          <div className="flex items-center mt-1">
                            {renderStars(game.rating.average, 'sm')}
                            <span className="text-sm text-gray-500 ml-1">({game.rating.count})</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {formatPrice(game.pricing)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Детали игры */}
        {activeTab === 'details' && selectedGame && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Основная информация */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <div className="aspect-video bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                    <Gamepad2 className="w-24 h-24 text-gray-400" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedGame.title}</h1>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center">
                      {renderStars(selectedGame.rating.average)}
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedGame.rating.average.toFixed(1)} ({selectedGame.rating.count} отзывов)
                      </span>
                    </div>
                    <span className="text-blue-600 font-medium">{selectedGame.category}</span>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">{selectedGame.description}</p>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Download className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {selectedGame.stats.downloads.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Скачиваний</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Play className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {selectedGame.stats.plays.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Запусков</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Eye className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {selectedGame.stats.views.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Просмотров</div>
                  </div>
                </div>

                {/* Технические характеристики */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Технические характеристики</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Платформы:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedGame.technical.platforms.map(platform => (
                          <span
                            key={platform}
                            className="bg-white px-2 py-1 rounded border text-xs"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Языки:</span>
                      <div className="mt-1 text-gray-900">
                        {selectedGame.technical.languages.join(', ')}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Размер файла:</span>
                      <div className="mt-1 text-gray-900">
                        {(selectedGame.technical.fileSize / 1024 / 1024).toFixed(1)} МБ
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Боковая панель */}
              <div className="space-y-4">
                {/* Цена и покупка */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    {formatPrice(selectedGame.pricing)}
                  </div>
                  
                  {purchases.includes(selectedGame.id) ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span className="text-green-700 font-medium">Уже приобретено</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPurchaseModal(true)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-3 flex items-center justify-center"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {selectedGame.pricing.type === 'free' ? 'Скачать' : 'Купить'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleWishlistToggle(selectedGame.id)}
                    className={`w-full py-2 px-4 rounded-lg border transition-colors flex items-center justify-center ${
                      wishlist.includes(selectedGame.id)
                        ? 'border-red-500 text-red-500 bg-red-50'
                        : 'border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${wishlist.includes(selectedGame.id) ? 'fill-current' : ''}`} />
                    {wishlist.includes(selectedGame.id) ? 'В избранном' : 'В избранное'}
                  </button>
                </div>

                {/* Информация о разработчике */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Разработчик</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {selectedGame.developer.name}
                        {selectedGame.developer.verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500 ml-1" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Разработчик</div>
                    </div>
                  </div>
                </div>

                {/* Быстрые действия */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Действия</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="w-full text-left py-2 px-3 rounded hover:bg-gray-50 flex items-center"
                    >
                      <Star className="w-4 h-4 text-gray-400 mr-3" />
                      Написать отзыв
                    </button>
                    
                    <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-50 flex items-center">
                      <Share className="w-4 h-4 text-gray-400 mr-3" />
                      Поделиться
                    </button>
                    
                    <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-50 flex items-center">
                      <AlertCircle className="w-4 h-4 text-gray-400 mr-3" />
                      Пожаловаться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Список желаний */}
        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Список желаний</h3>
              <span className="text-sm text-gray-500">{wishlist.length} игр</span>
            </div>
            
            {wishlist.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Ваш список желаний пуст</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="text-blue-600 hover:text-blue-700 mt-2"
                >
                  Найти игры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.filter(game => wishlist.includes(game.id)).map(game => (
                  <div
                    key={game.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-10 h-10 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{game.title}</h4>
                        <div className="flex items-center mb-2">
                          {renderStars(game.rating.average, 'sm')}
                          <span className="text-sm text-gray-500 ml-1">({game.rating.count})</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          {formatPrice(game.pricing)}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleGameClick(game)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Подробнее
                          </button>
                          <button
                            onClick={() => handleWishlistToggle(game.id)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Покупки */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Мои покупки</h3>
              <span className="text-sm text-gray-500">{purchases.length} игр</span>
            </div>
            
            {purchases.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">У вас пока нет покупок</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="text-blue-600 hover:text-blue-700 mt-2"
                >
                  Перейти в магазин
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {games.filter(game => purchases.includes(game.id)).map(game => (
                  <div
                    key={game.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                          <Gamepad2 className="w-8 h-8 text-gray-400" />
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900">{game.title}</h4>
                          <div className="flex items-center mt-1">
                            {renderStars(game.rating.average, 'sm')}
                            <span className="text-sm text-gray-500 ml-1">({game.rating.count})</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{game.category}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleGameClick(game)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Играть
                        </button>
                        
                        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
                          <Download className="w-4 h-4 mr-2" />
                          Скачать
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Отзывы */}
        {activeTab === 'reviews' && selectedGame && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Отзывы о {selectedGame.title}
              </h3>
              <button
                onClick={() => setShowReviewModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить отзыв
              </button>
            </div>
            
            {gameReviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Пока нет отзывов</p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="text-blue-600 hover:text-blue-700 mt-2"
                >
                  Написать первый отзыв
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {gameReviews.map(review => (
                  <div
                    key={review.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center">
                            {review.userName}
                            {review.verified && (
                              <CheckCircle className="w-4 h-4 text-blue-500 ml-1" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating, 'sm')}
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                    <p className="text-gray-700 mb-3">{review.content}</p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <button
                        onClick={() => handleVoteReview(review.id, true)}
                        className="flex items-center space-x-1 text-gray-500 hover:text-green-600"
                      >
                        <span>👍</span>
                        <span>Полезно ({review.helpful})</span>
                      </button>
                      
                      <button
                        onClick={() => handleVoteReview(review.id, false)}
                        className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
                      >
                        <span>👎</span>
                        <span>Не полезно ({review.unhelpful})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно покупки */}
      {showPurchaseModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Покупка игры
            </h3>
            
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedGame.title}</h4>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(selectedGame.pricing)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => handlePurchase(selectedGame.id)}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Покупка...' : 'Купить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно отзыва */}
      {showReviewModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Написать отзыв
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Рейтинг
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        } hover:text-yellow-400`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Краткое описание отзыва"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Отзыв
                </label>
                <textarea
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Поделитесь своим мнением об игре"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddReview}
                disabled={loading || !newReview.title || !newReview.content}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Отправка...' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameStoreManager; 