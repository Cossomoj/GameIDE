const CACHE_NAME = 'gameide-v1.0.0';
const STATIC_CACHE_NAME = 'gameide-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'gameide-dynamic-v1.0.0';

// Критические ресурсы для кеширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/src/main.tsx',
  '/src/App.tsx',
  // Добавить другие критические файлы по мере необходимости
];

// Ресурсы для кеширования при первом запросе
const CACHE_FIRST_PATTERNS = [
  /\/icons\//,
  /\/fonts\//,
  /\/images\//,
  /\.(png|jpg|jpeg|gif|svg|webp)$/,
  /\.(woff|woff2|ttf|eot)$/,
];

// Сетевые запросы с fallback
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/ws/,
  /\/localization\//,
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Удаление старых кешей
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('gameide-')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Взятие контроля над всеми страницами
      self.clients.claim()
    ])
  );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Игнорируем нон-HTTP запросы
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Игнорируем WebSocket соединения
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // API запросы: сеть первая, кеш как fallback
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request);
    }
    
    // Статические ресурсы: кеш первый
    if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await cacheFirst(request);
    }
    
    // HTML страницы: сеть первая с кешем
    if (request.destination === 'document') {
      return await networkFirst(request, true);
    }
    
    // JS/CSS: кеш первый с обновлением в фоне
    if (request.destination === 'script' || request.destination === 'style') {
      return await staleWhileRevalidate(request);
    }
    
    // По умолчанию: сеть первая
    return await networkFirst(request);
    
  } catch (error) {
    console.error('Request handling failed:', error);
    return await handleOffline(request);
  }
}

// Стратегия: кеш первый
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return await handleOffline(request);
  }
}

// Стратегия: сеть первая
async function networkFirst(request, useOfflinePage = false) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кешируем успешные ответы
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (useOfflinePage) {
      return await handleOffline(request);
    }
    
    throw error;
  }
}

// Стратегия: устаревший контент при обновлении
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Обновляем кеш в фоне
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Игнорируем ошибки сети для фонового обновления
  });
  
  // Возвращаем кешированную версию если есть, иначе ждем сеть
  return cachedResponse || fetchPromise;
}

// Обработка офлайн ситуаций
async function handleOffline(request) {
  const url = new URL(request.url);
  
  // HTML страницы - показываем офлайн страницу
  if (request.destination === 'document') {
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback к главной странице
    const indexResponse = await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
  }
  
  // Изображения - показываем плейсхолдер
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e5e7eb"/><text x="100" y="100" text-anchor="middle" dy=".35em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Offline</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // API запросы - возвращаем кешированные данные или ошибку
  if (url.pathname.startsWith('/api/')) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No network connection available',
        cached: false 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  return new Response('Offline', { 
    status: 503, 
    statusText: 'Service Unavailable' 
  });
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      if (payload && payload.urls) {
        cacheUrls(payload.urls);
      }
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Кеширование URL-ов по запросу
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    await cache.addAll(urls);
    console.log('URLs cached successfully:', urls);
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

// Очистка всех кешей
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

// Получение статуса кеша
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      status[cacheName] = {
        size: keys.length,
        urls: keys.map(request => request.url)
      };
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return { error: error.message };
  }
}

// Периодическая очистка старых кешей
setInterval(async () => {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    
    // Удаляем записи старше 7 дней
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime();
          if (responseDate < oneWeekAgo) {
            await cache.delete(request);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}, 24 * 60 * 60 * 1000); // Каждые 24 часа 