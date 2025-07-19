import { useState, useEffect, useCallback } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'yandex' | 'unknown';
  hasNotificationSupport: boolean;
  hasServiceWorkerSupport: boolean;
  hasWebGLSupport: boolean;
  hasTouchSupport: boolean;
  hasGamepadSupport: boolean;
  isStandalone: boolean;
  pixelRatio: number;
  viewportSize: {
    width: number;
    height: number;
  };
}

export interface MobileSettings {
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  controllerOpacity: number;
  controllerSize: 'small' | 'medium' | 'large';
  controllerPosition: 'bottom' | 'overlay';
  autoRotateEnabled: boolean;
  qualitySettings: 'auto' | 'low' | 'medium' | 'high';
  batteryOptimization: boolean;
}

const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  vibrationEnabled: true,
  soundEnabled: true,
  controllerOpacity: 0.7,
  controllerSize: 'medium',
  controllerPosition: 'bottom',
  autoRotateEnabled: true,
  qualitySettings: 'auto',
  batteryOptimization: true,
};

export const useMobile = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'landscape',
    screenSize: 'lg',
    platform: 'unknown',
    browser: 'unknown',
    hasNotificationSupport: false,
    hasServiceWorkerSupport: false,
    hasWebGLSupport: false,
    hasTouchSupport: false,
    hasGamepadSupport: false,
    isStandalone: false,
    pixelRatio: 1,
    viewportSize: { width: 1920, height: 1080 },
  });

  const [mobileSettings, setMobileSettings] = useState<MobileSettings>(DEFAULT_MOBILE_SETTINGS);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow'>('online');

  // Детекция устройства и возможностей
  const detectDevice = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    // Платформа
    let platform: DeviceInfo['platform'] = 'unknown';
    if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      platform = 'ios';
    } else if (userAgent.includes('android')) {
      platform = 'android';
    } else if (userAgent.includes('windows')) {
      platform = 'windows';
    } else if (userAgent.includes('mac')) {
      platform = 'macos';
    } else if (userAgent.includes('linux')) {
      platform = 'linux';
    }

    // Браузер
    let browser: DeviceInfo['browser'] = 'unknown';
    if (userAgent.includes('yabrowser')) {
      browser = 'yandex';
    } else if (userAgent.includes('chrome')) {
      browser = 'chrome';
    } else if (userAgent.includes('firefox')) {
      browser = 'firefox';
    } else if (userAgent.includes('safari')) {
      browser = 'safari';
    } else if (userAgent.includes('edge')) {
      browser = 'edge';
    }

    // Размер экрана
    let screenSize: DeviceInfo['screenSize'] = 'lg';
    if (width < 640) screenSize = 'xs';
    else if (width < 768) screenSize = 'sm';
    else if (width < 1024) screenSize = 'md';
    else if (width < 1280) screenSize = 'lg';
    else if (width < 1536) screenSize = 'xl';
    else screenSize = '2xl';

    // Тип устройства
    const isMobile = width < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = width >= 768 && width < 1024 && 'ontouchstart' in window;
    const isDesktop = !isMobile && !isTablet;

    // Возможности
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasNotificationSupport = 'Notification' in window;
    const hasServiceWorkerSupport = 'serviceWorker' in navigator;
    const hasGamepadSupport = 'getGamepads' in navigator;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // WebGL поддержка
    let hasWebGLSupport = false;
    try {
      const canvas = document.createElement('canvas');
      hasWebGLSupport = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      hasWebGLSupport = false;
    }

    // Ориентация
    const orientation = height > width ? 'portrait' : 'landscape';

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      orientation,
      screenSize,
      platform,
      browser,
      hasNotificationSupport,
      hasServiceWorkerSupport,
      hasWebGLSupport,
      hasTouchSupport: isTouchDevice,
      hasGamepadSupport,
      isStandalone,
      pixelRatio,
      viewportSize: { width, height },
    });
  }, []);

  // Отслеживание сетевого статуса
  const updateNetworkStatus = useCallback(() => {
    if (!navigator.onLine) {
      setNetworkStatus('offline');
      return;
    }

    // Проверка скорости соединения
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const { effectiveType, downlink } = connection;
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
        setNetworkStatus('slow');
      } else {
        setNetworkStatus('online');
      }
    } else {
      setNetworkStatus('online');
    }
  }, []);

  // Детекция виртуальной клавиатуры
  const detectVirtualKeyboard = useCallback(() => {
    if (!deviceInfo.isMobile) return;

    const initialHeight = window.innerHeight;
    const currentHeight = window.innerHeight;
    const heightDifference = initialHeight - currentHeight;
    
    // Считаем, что клавиатура видна, если высота уменьшилась более чем на 150px
    setIsKeyboardVisible(heightDifference > 150);
  }, [deviceInfo.isMobile]);

  // Вибрация
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!mobileSettings.vibrationEnabled || !navigator.vibrate) return false;
    return navigator.vibrate(pattern);
  }, [mobileSettings.vibrationEnabled]);

  // Полноэкранный режим
  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        return true;
      } catch (error) {
        console.warn('Fullscreen not supported:', error);
        return false;
      }
    }
    return true;
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        return true;
      } catch (error) {
        console.warn('Exit fullscreen failed:', error);
        return false;
      }
    }
    return true;
  }, []);

  // Блокировка ориентации
  const lockOrientation = useCallback(async (orientation: OrientationLockType) => {
    if ('orientation' in screen && 'lock' in screen.orientation) {
      try {
        await screen.orientation.lock(orientation);
        return true;
      } catch (error) {
        console.warn('Orientation lock failed:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Сохранение настроек
  const updateMobileSettings = useCallback((newSettings: Partial<MobileSettings>) => {
    const updatedSettings = { ...mobileSettings, ...newSettings };
    setMobileSettings(updatedSettings);
    localStorage.setItem('gameide-mobile-settings', JSON.stringify(updatedSettings));
  }, [mobileSettings]);

  // Загрузка настроек из localStorage
  const loadMobileSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('gameide-mobile-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMobileSettings({ ...DEFAULT_MOBILE_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load mobile settings:', error);
    }
  }, []);

  // Определение оптимального качества графики
  const getOptimalQuality = useCallback(() => {
    if (mobileSettings.qualitySettings !== 'auto') {
      return mobileSettings.qualitySettings;
    }

    // Автоматическое определение качества
    const { isMobile, pixelRatio, viewportSize } = deviceInfo;
    const totalPixels = viewportSize.width * viewportSize.height * pixelRatio;

    if (isMobile) {
      if (totalPixels > 2000000) return 'medium'; // Высокое разрешение
      return 'low'; // Обычные мобильные устройства
    }

    if (totalPixels > 4000000) return 'high';
    if (totalPixels > 2000000) return 'medium';
    return 'low';
  }, [deviceInfo, mobileSettings.qualitySettings]);

  // Эффекты для инициализации и обновления
  useEffect(() => {
    loadMobileSettings();
    detectDevice();
    updateNetworkStatus();

    const handleResize = () => {
      detectDevice();
      detectVirtualKeyboard();
    };

    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Отслеживание изменений соединения
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [detectDevice, detectVirtualKeyboard, loadMobileSettings, updateNetworkStatus]);

  return {
    deviceInfo,
    mobileSettings,
    isKeyboardVisible,
    networkStatus,
    vibrate,
    enterFullscreen,
    exitFullscreen,
    lockOrientation,
    updateMobileSettings,
    getOptimalQuality,
    // Удобные shortcut-функции
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isDesktop: deviceInfo.isDesktop,
    isTouchDevice: deviceInfo.isTouchDevice,
    isPortrait: deviceInfo.orientation === 'portrait',
    isLandscape: deviceInfo.orientation === 'landscape',
    isStandalone: deviceInfo.isStandalone,
    isOnline: networkStatus === 'online',
    isOffline: networkStatus === 'offline',
    isSlowConnection: networkStatus === 'slow',
  };
}; 