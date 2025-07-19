import React, { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { useLocalization } from '../contexts/LocalizationContext';

interface MobileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSettings: React.FC<MobileSettingsProps> = ({ isOpen, onClose }) => {
  const { 
    mobileSettings, 
    updateMobileSettings, 
    deviceInfo,
    vibrate,
    getOptimalQuality,
    enterFullscreen,
    lockOrientation 
  } = useMobile();
  const { t } = useLocalization();

  const [isTestingVibration, setIsTestingVibration] = useState(false);

  if (!isOpen) return null;

  const handleVibrationTest = async () => {
    if (isTestingVibration) return;
    
    setIsTestingVibration(true);
    vibrate([100, 50, 100, 50, 200]);
    
    setTimeout(() => {
      setIsTestingVibration(false);
    }, 1000);
  };

  const handleFullscreenToggle = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await enterFullscreen();
    }
  };

  const handleOrientationLock = async (orientation: OrientationLockType) => {
    await lockOrientation(orientation);
  };

  const getOpacityValue = (opacity: number) => {
    return Math.round(opacity * 100);
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return t('settings.mobile.controllerSize.small');
      case 'medium': return t('settings.mobile.controllerSize.medium');
      case 'large': return t('settings.mobile.controllerSize.large');
      default: return size;
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'auto': return t('settings.mobile.quality.auto');
      case 'low': return t('settings.mobile.quality.low');
      case 'medium': return t('settings.mobile.quality.medium');
      case 'high': return t('settings.mobile.quality.high');
      default: return quality;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📱 {t('settings.mobile.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Device Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ℹ️ {t('settings.mobile.deviceInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t('settings.mobile.deviceType')}:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {deviceInfo.isMobile ? '📱 Mobile' : deviceInfo.isTablet ? '📱 Tablet' : '💻 Desktop'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t('settings.mobile.orientation')}:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {deviceInfo.orientation === 'portrait' ? '📱 Portrait' : '📱 Landscape'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t('settings.mobile.screenSize')}:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {deviceInfo.viewportSize.width}×{deviceInfo.viewportSize.height}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t('settings.mobile.platform')}:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {deviceInfo.platform === 'ios' ? '🍎 iOS' : 
                 deviceInfo.platform === 'android' ? '🤖 Android' : 
                 `💻 ${deviceInfo.platform}`}
              </p>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🎮 {t('settings.mobile.gameControls')}
          </h3>
          
          {/* Controller Opacity */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.mobile.controllerOpacity')}: {getOpacityValue(mobileSettings.controllerOpacity)}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={getOpacityValue(mobileSettings.controllerOpacity)}
              onChange={(e) => updateMobileSettings({ 
                controllerOpacity: parseInt(e.target.value) / 100 
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Controller Size */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.mobile.controllerSize.title')}
            </label>
            <select
              value={mobileSettings.controllerSize}
              onChange={(e) => updateMobileSettings({ 
                controllerSize: e.target.value as 'small' | 'medium' | 'large' 
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="small">{getSizeLabel('small')}</option>
              <option value="medium">{getSizeLabel('medium')}</option>
              <option value="large">{getSizeLabel('large')}</option>
            </select>
          </div>

          {/* Controller Position */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.mobile.controllerPosition')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateMobileSettings({ controllerPosition: 'bottom' })}
                className={`flex-1 p-2 rounded-lg border transition-colors ${
                  mobileSettings.controllerPosition === 'bottom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                }`}
              >
                ⬇️ {t('settings.mobile.position.bottom')}
              </button>
              <button
                onClick={() => updateMobileSettings({ controllerPosition: 'overlay' })}
                className={`flex-1 p-2 rounded-lg border transition-colors ${
                  mobileSettings.controllerPosition === 'overlay'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                }`}
              >
                🔄 {t('settings.mobile.position.overlay')}
              </button>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ {t('settings.mobile.performance')}
          </h3>
          
          {/* Quality Settings */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.mobile.quality.title')}
              {mobileSettings.qualitySettings === 'auto' && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                  ({getQualityLabel(getOptimalQuality())})
                </span>
              )}
            </label>
            <select
              value={mobileSettings.qualitySettings}
              onChange={(e) => updateMobileSettings({ 
                qualitySettings: e.target.value as 'auto' | 'low' | 'medium' | 'high' 
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="auto">{getQualityLabel('auto')}</option>
              <option value="low">{getQualityLabel('low')}</option>
              <option value="medium">{getQualityLabel('medium')}</option>
              <option value="high">{getQualityLabel('high')}</option>
            </select>
          </div>

          {/* Battery Optimization */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔋 {t('settings.mobile.batteryOptimization')}
            </span>
            <button
              onClick={() => updateMobileSettings({ 
                batteryOptimization: !mobileSettings.batteryOptimization 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mobileSettings.batteryOptimization ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mobileSettings.batteryOptimization ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Accessibility */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ♿ {t('settings.mobile.accessibility')}
          </h3>
          
          {/* Vibration */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📳 {t('settings.mobile.vibration')}
              </span>
              {deviceInfo.platform !== 'ios' && (
                <button
                  onClick={handleVibrationTest}
                  disabled={isTestingVibration}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {isTestingVibration ? '📳' : t('settings.mobile.test')}
                </button>
              )}
            </div>
            <button
              onClick={() => updateMobileSettings({ 
                vibrationEnabled: !mobileSettings.vibrationEnabled 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mobileSettings.vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mobileSettings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔊 {t('settings.mobile.sound')}
            </span>
            <button
              onClick={() => updateMobileSettings({ 
                soundEnabled: !mobileSettings.soundEnabled 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mobileSettings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mobileSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto Rotate */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔄 {t('settings.mobile.autoRotate')}
            </span>
            <button
              onClick={() => updateMobileSettings({ 
                autoRotateEnabled: !mobileSettings.autoRotateEnabled 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mobileSettings.autoRotateEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mobileSettings.autoRotateEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🛠️ {t('settings.mobile.actions')}
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Fullscreen */}
            <button
              onClick={handleFullscreenToggle}
              className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <span>🔲</span>
              <span>
                {document.fullscreenElement 
                  ? t('settings.mobile.exitFullscreen') 
                  : t('settings.mobile.enterFullscreen')
                }
              </span>
            </button>

            {/* Orientation Lock */}
            {deviceInfo.platform === 'android' || deviceInfo.platform === 'ios' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOrientationLock('portrait-primary')}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <span>📱</span>
                  <span>{t('settings.mobile.lockPortrait')}</span>
                </button>
                <button
                  onClick={() => handleOrientationLock('landscape-primary')}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <span>📱</span>
                  <span>{t('settings.mobile.lockLandscape')}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSettings; 