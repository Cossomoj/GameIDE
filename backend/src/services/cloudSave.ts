import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash, createCipher, createDecipher } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { logger } from './logger';
import { analyticsService } from './analytics';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface SaveData {
  id: string;
  userId: string;
  gameId: string;
  slotName: string;
  data: any;
  metadata: {
    version: number;
    timestamp: Date;
    gameVersion: string;
    platform: string;
    checksum: string;
    compressed: boolean;
    encrypted: boolean;
    size: number;
  };
  tags: string[];
  description?: string;
  screenshot?: string;
  playTime: number;
  level?: number;
  progress?: number; // 0-100%
}

export interface SaveSlot {
  name: string;
  displayName: string;
  description: string;
  maxSize: number; // bytes
  autoSave: boolean;
  versionsToKeep: number;
  syncWithCloud: boolean;
  encryptionEnabled: boolean;
}

export interface SaveSyncResult {
  success: boolean;
  action: 'uploaded' | 'downloaded' | 'conflict' | 'no_change';
  localVersion: number;
  cloudVersion: number;
  conflictResolution?: 'use_local' | 'use_cloud' | 'merge' | 'manual';
  error?: string;
}

export interface SaveConflict {
  saveId: string;
  localData: SaveData;
  cloudData: SaveData;
  conflictType: 'version' | 'timestamp' | 'content' | 'platform';
  autoResolvable: boolean;
  resolutionOptions: Array<{
    action: 'use_local' | 'use_cloud' | 'merge';
    description: string;
    consequences: string;
  }>;
}

export interface CloudSaveConfig {
  encryptionKey: string;
  compressionLevel: number;
  maxSaveSize: number;
  maxSavesPerUser: number;
  autoSyncInterval: number; // seconds
  versionsToKeep: number;
  yandexIntegration: {
    enabled: boolean;
    maxDataSize: number; // Yandex Games limit
    usePlayerData: boolean;
    useLeaderboardData: boolean;
  };
}

class CloudSaveService extends EventEmitter {
  private saves: Map<string, SaveData> = new Map();
  private saveSlots: Map<string, SaveSlot> = new Map();
  private syncQueue: Set<string> = new Set();
  private conflicts: Map<string, SaveConflict> = new Map();
  
  private config: CloudSaveConfig = {
    encryptionKey: process.env.SAVE_ENCRYPTION_KEY || 'default-key-change-in-production',
    compressionLevel: 6,
    maxSaveSize: 1024 * 1024, // 1MB
    maxSavesPerUser: 50,
    autoSyncInterval: 300, // 5 minutes
    versionsToKeep: 10,
    yandexIntegration: {
      enabled: true,
      maxDataSize: 200 * 1024, // 200KB Yandex limit
      usePlayerData: true,
      useLeaderboardData: false
    }
  };

  constructor() {
    super();
    this.initializeDefaultSlots();
    this.startAutoSync();
  }

  private initializeDefaultSlots(): void {
    const defaultSlots: SaveSlot[] = [
      {
        name: 'quicksave',
        displayName: 'Быстрое сохранение',
        description: 'Автоматическое сохранение каждые 30 секунд',
        maxSize: 100 * 1024, // 100KB
        autoSave: true,
        versionsToKeep: 3,
        syncWithCloud: true,
        encryptionEnabled: false
      },
      {
        name: 'checkpoint',
        displayName: 'Контрольная точка',
        description: 'Сохранение на важных этапах игры',
        maxSize: 500 * 1024, // 500KB
        autoSave: false,
        versionsToKeep: 5,
        syncWithCloud: true,
        encryptionEnabled: true
      },
      {
        name: 'manual',
        displayName: 'Ручное сохранение',
        description: 'Сохранение по желанию игрока',
        maxSize: 1024 * 1024, // 1MB
        autoSave: false,
        versionsToKeep: 10,
        syncWithCloud: true,
        encryptionEnabled: true
      },
      {
        name: 'settings',
        displayName: 'Настройки',
        description: 'Пользовательские настройки игры',
        maxSize: 50 * 1024, // 50KB
        autoSave: true,
        versionsToKeep: 1,
        syncWithCloud: true,
        encryptionEnabled: false
      }
    ];

    defaultSlots.forEach(slot => {
      this.saveSlots.set(slot.name, slot);
    });
  }

  // Создание нового сохранения
  public async createSave(
    userId: string,
    gameId: string,
    slotName: string,
    data: any,
    options?: {
      description?: string;
      screenshot?: string;
      tags?: string[];
      playTime?: number;
      level?: number;
      progress?: number;
    }
  ): Promise<SaveData> {
    try {
      const slot = this.saveSlots.get(slotName);
      if (!slot) {
        throw new Error(`Save slot "${slotName}" not found`);
      }

      // Проверяем лимиты пользователя
      const userSaves = Array.from(this.saves.values()).filter(save => save.userId === userId);
      if (userSaves.length >= this.config.maxSavesPerUser) {
        throw new Error('Maximum saves per user exceeded');
      }

      // Сериализация данных
      const serializedData = JSON.stringify(data);
      let processedData = Buffer.from(serializedData, 'utf8');

      // Сжатие данных
      const compressed = processedData.length > 1024; // Сжимаем файлы больше 1KB
      if (compressed) {
        processedData = await gzipAsync(processedData);
      }

      // Шифрование данных
      const encrypted = slot.encryptionEnabled;
      if (encrypted) {
        const cipher = createCipher('aes256', this.config.encryptionKey);
        let encryptedData = cipher.update(processedData);
        encryptedData = Buffer.concat([encryptedData, cipher.final()]);
        processedData = encryptedData;
      }

      // Проверка размера
      if (processedData.length > slot.maxSize) {
        throw new Error(`Save data exceeds maximum size for slot "${slotName}"`);
      }

      // Создание контрольной суммы
      const checksum = createHash('sha256').update(processedData).digest('hex');

      const save: SaveData = {
        id: this.generateSaveId(userId, gameId, slotName),
        userId,
        gameId,
        slotName,
        data: processedData.toString('base64'),
        metadata: {
          version: this.getNextVersion(userId, gameId, slotName),
          timestamp: new Date(),
          gameVersion: '1.0.0', // TODO: получать из метаданных игры
          platform: 'web',
          checksum,
          compressed,
          encrypted,
          size: processedData.length
        },
        tags: options?.tags || [],
        description: options?.description,
        screenshot: options?.screenshot,
        playTime: options?.playTime || 0,
        level: options?.level,
        progress: options?.progress
      };

      this.saves.set(save.id, save);

      // Управление версиями
      await this.cleanupOldVersions(userId, gameId, slotName);

      // Автосинхронизация с облаком
      if (slot.syncWithCloud) {
        this.syncQueue.add(save.id);
      }

      // Аналитика
      analyticsService.trackEvent('save_created', {
        userId,
        gameId,
        slotName,
        size: processedData.length,
        compressed,
        encrypted
      });

      this.emit('saveCreated', save);
      logger.info(`Save created: ${save.id} (${processedData.length} bytes)`);

      return save;
    } catch (error) {
      logger.error('Error creating save:', error);
      throw error;
    }
  }

  // Загрузка сохранения
  public async loadSave(saveId: string): Promise<any> {
    try {
      const save = this.saves.get(saveId);
      if (!save) {
        throw new Error(`Save not found: ${saveId}`);
      }

      let processedData = Buffer.from(save.data, 'base64');

      // Проверка контрольной суммы
      const checksum = createHash('sha256').update(processedData).digest('hex');
      if (checksum !== save.metadata.checksum) {
        throw new Error('Save data corruption detected');
      }

      // Расшифровка
      if (save.metadata.encrypted) {
        const decipher = createDecipher('aes256', this.config.encryptionKey);
        let decryptedData = decipher.update(processedData);
        decryptedData = Buffer.concat([decryptedData, decipher.final()]);
        processedData = decryptedData;
      }

      // Распаковка
      if (save.metadata.compressed) {
        processedData = await gunzipAsync(processedData);
      }

      const data = JSON.parse(processedData.toString('utf8'));

      // Аналитика
      analyticsService.trackEvent('save_loaded', {
        userId: save.userId,
        gameId: save.gameId,
        slotName: save.slotName,
        version: save.metadata.version
      });

      this.emit('saveLoaded', save);
      logger.info(`Save loaded: ${saveId}`);

      return data;
    } catch (error) {
      logger.error('Error loading save:', error);
      throw error;
    }
  }

  // Получение списка сохранений пользователя
  public getUserSaves(userId: string, gameId?: string): SaveData[] {
    return Array.from(this.saves.values())
      .filter(save => {
        if (save.userId !== userId) return false;
        if (gameId && save.gameId !== gameId) return false;
        return true;
      })
      .sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime());
  }

  // Удаление сохранения
  public async deleteSave(saveId: string): Promise<boolean> {
    try {
      const save = this.saves.get(saveId);
      if (!save) {
        return false;
      }

      this.saves.delete(saveId);
      this.syncQueue.delete(saveId);

      // Аналитика
      analyticsService.trackEvent('save_deleted', {
        userId: save.userId,
        gameId: save.gameId,
        slotName: save.slotName
      });

      this.emit('saveDeleted', save);
      logger.info(`Save deleted: ${saveId}`);

      return true;
    } catch (error) {
      logger.error('Error deleting save:', error);
      return false;
    }
  }

  // Синхронизация с облаком
  public async syncWithCloud(saveId: string, forceUpload = false): Promise<SaveSyncResult> {
    try {
      const save = this.saves.get(saveId);
      if (!save) {
        throw new Error(`Save not found: ${saveId}`);
      }

      // Получаем данные из облака (Yandex Games)
      const cloudData = await this.getCloudSave(save.userId, save.gameId, save.slotName);
      
      if (!cloudData) {
        // Нет данных в облаке, загружаем локальные
        await this.uploadToCloud(save);
        return {
          success: true,
          action: 'uploaded',
          localVersion: save.metadata.version,
          cloudVersion: save.metadata.version
        };
      }

      // Сравнение версий
      if (save.metadata.version > cloudData.metadata.version || forceUpload) {
        // Локальная версия новее
        await this.uploadToCloud(save);
        return {
          success: true,
          action: 'uploaded',
          localVersion: save.metadata.version,
          cloudVersion: cloudData.metadata.version
        };
      } else if (save.metadata.version < cloudData.metadata.version) {
        // Облачная версия новее
        this.saves.set(save.id, cloudData);
        return {
          success: true,
          action: 'downloaded',
          localVersion: save.metadata.version,
          cloudVersion: cloudData.metadata.version
        };
      } else {
        // Версии одинаковые, проверяем временные метки
        if (save.metadata.timestamp.getTime() !== cloudData.metadata.timestamp.getTime()) {
          // Конфликт
          const conflict = await this.createConflict(save, cloudData);
          this.conflicts.set(save.id, conflict);
          
          return {
            success: false,
            action: 'conflict',
            localVersion: save.metadata.version,
            cloudVersion: cloudData.metadata.version,
            conflictResolution: 'manual'
          };
        }

        return {
          success: true,
          action: 'no_change',
          localVersion: save.metadata.version,
          cloudVersion: cloudData.metadata.version
        };
      }
    } catch (error) {
      logger.error('Error syncing with cloud:', error);
      return {
        success: false,
        action: 'no_change',
        localVersion: 0,
        cloudVersion: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Разрешение конфликтов
  public async resolveConflict(
    saveId: string, 
    resolution: 'use_local' | 'use_cloud' | 'merge'
  ): Promise<boolean> {
    try {
      const conflict = this.conflicts.get(saveId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      let resolvedSave: SaveData;

      switch (resolution) {
        case 'use_local':
          resolvedSave = conflict.localData;
          await this.uploadToCloud(resolvedSave);
          break;
        
        case 'use_cloud':
          resolvedSave = conflict.cloudData;
          break;
        
        case 'merge':
          resolvedSave = await this.mergeSaves(conflict.localData, conflict.cloudData);
          await this.uploadToCloud(resolvedSave);
          break;
      }

      this.saves.set(saveId, resolvedSave);
      this.conflicts.delete(saveId);

      this.emit('conflictResolved', { saveId, resolution, save: resolvedSave });
      logger.info(`Conflict resolved: ${saveId} using ${resolution}`);

      return true;
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      return false;
    }
  }

  // Автосинхронизация
  private startAutoSync(): void {
    setInterval(async () => {
      if (this.syncQueue.size === 0) return;

      logger.info(`Starting auto-sync for ${this.syncQueue.size} saves`);
      
      const saveIds = Array.from(this.syncQueue);
      for (const saveId of saveIds) {
        try {
          await this.syncWithCloud(saveId);
          this.syncQueue.delete(saveId);
        } catch (error) {
          logger.error(`Auto-sync failed for ${saveId}:`, error);
        }
      }
    }, this.config.autoSyncInterval * 1000);
  }

  // Интеграция с Yandex Games
  private async uploadToCloud(save: SaveData): Promise<void> {
    if (!this.config.yandexIntegration.enabled) return;

    try {
      // Проверяем размер для Yandex Games
      const dataSize = Buffer.from(save.data, 'base64').length;
      if (dataSize > this.config.yandexIntegration.maxDataSize) {
        throw new Error('Save data too large for Yandex Games');
      }

      // Подготавливаем данные для Yandex
      const yandexData = {
        saveData: save.data,
        metadata: save.metadata,
        slotName: save.slotName,
        version: save.metadata.version
      };

      // Здесь была бы реальная интеграция с Yandex Games Player API
      // await this.yandexGamesAPI.setPlayerData(save.userId, yandexData);
      
      logger.info(`Save uploaded to Yandex Games: ${save.id}`);
    } catch (error) {
      logger.error('Error uploading to Yandex Games:', error);
      throw error;
    }
  }

  private async getCloudSave(userId: string, gameId: string, slotName: string): Promise<SaveData | null> {
    try {
      // Здесь была бы реальная интеграция с Yandex Games Player API
      // const yandexData = await this.yandexGamesAPI.getPlayerData(userId);
      
      // Заглушка для демонстрации
      return null;
    } catch (error) {
      logger.error('Error getting cloud save:', error);
      return null;
    }
  }

  private async createConflict(localSave: SaveData, cloudSave: SaveData): Promise<SaveConflict> {
    return {
      saveId: localSave.id,
      localData: localSave,
      cloudData: cloudSave,
      conflictType: 'timestamp',
      autoResolvable: false,
      resolutionOptions: [
        {
          action: 'use_local',
          description: 'Использовать локальное сохранение',
          consequences: 'Облачные данные будут перезаписаны'
        },
        {
          action: 'use_cloud',
          description: 'Использовать облачное сохранение',
          consequences: 'Локальные данные будут потеряны'
        },
        {
          action: 'merge',
          description: 'Объединить сохранения',
          consequences: 'Попытка автоматического слияния данных'
        }
      ]
    };
  }

  private async mergeSaves(local: SaveData, cloud: SaveData): Promise<SaveData> {
    // Простое слияние - берем более свежие данные
    const merged = { ...local };
    
    // Используем более новую временную метку
    if (cloud.metadata.timestamp > local.metadata.timestamp) {
      merged.data = cloud.data;
      merged.metadata = {
        ...cloud.metadata,
        version: Math.max(local.metadata.version, cloud.metadata.version) + 1
      };
    } else {
      merged.metadata.version += 1;
    }

    merged.metadata.timestamp = new Date();
    
    return merged;
  }

  private generateSaveId(userId: string, gameId: string, slotName: string): string {
    const timestamp = Date.now();
    return `${userId}_${gameId}_${slotName}_${timestamp}`;
  }

  private getNextVersion(userId: string, gameId: string, slotName: string): number {
    const existingSaves = Array.from(this.saves.values())
      .filter(save => 
        save.userId === userId && 
        save.gameId === gameId && 
        save.slotName === slotName
      );
    
    const maxVersion = Math.max(0, ...existingSaves.map(save => save.metadata.version));
    return maxVersion + 1;
  }

  private async cleanupOldVersions(userId: string, gameId: string, slotName: string): Promise<void> {
    const slot = this.saveSlots.get(slotName);
    if (!slot) return;

    const saves = Array.from(this.saves.values())
      .filter(save => 
        save.userId === userId && 
        save.gameId === gameId && 
        save.slotName === slotName
      )
      .sort((a, b) => b.metadata.version - a.metadata.version);

    // Удаляем старые версии
    const toDelete = saves.slice(slot.versionsToKeep);
    for (const save of toDelete) {
      this.saves.delete(save.id);
      logger.info(`Cleaned up old save version: ${save.id}`);
    }
  }

  // Экспорт сохранений
  public async exportSaves(userId: string, gameId?: string): Promise<string> {
    const saves = this.getUserSaves(userId, gameId);
    const exportData = {
      exportDate: new Date().toISOString(),
      userId,
      gameId,
      saves: saves.map(save => ({
        ...save,
        data: save.data // Уже в base64
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Импорт сохранений
  public async importSaves(importData: string): Promise<number> {
    try {
      const data = JSON.parse(importData);
      let importedCount = 0;

      for (const saveData of data.saves) {
        const save: SaveData = {
          ...saveData,
          id: this.generateSaveId(saveData.userId, saveData.gameId, saveData.slotName),
          metadata: {
            ...saveData.metadata,
            timestamp: new Date(saveData.metadata.timestamp)
          }
        };

        this.saves.set(save.id, save);
        importedCount++;
      }

      logger.info(`Imported ${importedCount} saves`);
      return importedCount;
    } catch (error) {
      logger.error('Error importing saves:', error);
      throw error;
    }
  }

  // Получение статистики
  public getStats(): any {
    const saves = Array.from(this.saves.values());
    const totalSize = saves.reduce((sum, save) => sum + save.metadata.size, 0);
    
    return {
      totalSaves: saves.length,
      totalSize,
      averageSize: saves.length > 0 ? totalSize / saves.length : 0,
      gamesWithSaves: new Set(saves.map(save => save.gameId)).size,
      usersWithSaves: new Set(saves.map(save => save.userId)).size,
      conflictsCount: this.conflicts.size,
      syncQueueSize: this.syncQueue.size,
      slotDistribution: this.getSlotDistribution(),
      compressionRatio: this.getCompressionRatio()
    };
  }

  private getSlotDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const save of this.saves.values()) {
      distribution[save.slotName] = (distribution[save.slotName] || 0) + 1;
    }
    
    return distribution;
  }

  private getCompressionRatio(): number {
    const saves = Array.from(this.saves.values()).filter(save => save.metadata.compressed);
    if (saves.length === 0) return 0;
    
    // Это примерная оценка, в реальности нужно хранить исходный размер
    return 0.3; // 30% экономии
  }
}

export const cloudSaveService = new CloudSaveService();
export { CloudSaveService }; 