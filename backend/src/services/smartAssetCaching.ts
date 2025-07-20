import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { LoggerService } from './logger';
import { AssetGenerationResult } from '../types';

interface CachedAsset {
  id: string;
  hash: string;
  asset: AssetGenerationResult;
  metadata: {
    prompt: string;
    style: string;
    assetType: string;
    parameters: Record<string, any>;
    qualityScore: number;
    generationTime: number;
    aiModel: string;
    createdAt: Date;
    lastAccessedAt: Date;
    accessCount: number;
    fileSize: number;
  };
  priority: number; // 0-100, based on quality, usage, etc.
  expiresAt: Date | null;
}

interface CacheConfig {
  maxMemoryMB: number;
  maxDiskMB: number;
  defaultTTL: number; // milliseconds
  qualityTTLMultiplier: number; // high quality assets live longer
  enableDiskCache: boolean;
  cacheDirectory: string;
  compressionLevel: number;
  maxAssetSize: number;
  priorityThreshold: number;
}

interface CacheStats {
  memoryUsageMB: number;
  diskUsageMB: number;
  totalCachedAssets: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  diskWrites: number;
  diskReads: number;
  averageQualityScore: number;
  topAssetTypes: Array<{ type: string; count: number }>;
}

interface CacheKey {
  prompt: string;
  style: string;
  assetType: string;
  parameters: Record<string, any>;
  aiModel: string;
}

export class SmartAssetCaching {
  private memoryCache: Map<string, CachedAsset> = new Map();
  private diskCache: Map<string, string> = new Map(); // hash -> file path
  private accessLog: Map<string, number[]> = new Map(); // hash -> timestamps
  private logger: LoggerService;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.logger = new LoggerService();
    this.config = {
      maxMemoryMB: 512,
      maxDiskMB: 2048,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      qualityTTLMultiplier: 2.0,
      enableDiskCache: true,
      cacheDirectory: './cache/assets',
      compressionLevel: 6,
      maxAssetSize: 10 * 1024 * 1024, // 10MB
      priorityThreshold: 50,
      ...config
    };

    this.stats = {
      memoryUsageMB: 0,
      diskUsageMB: 0,
      totalCachedAssets: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      diskWrites: 0,
      diskReads: 0,
      averageQualityScore: 0,
      topAssetTypes: []
    };

    this.initializeCache();
    this.startCleanupTimer();
  }

  /**
   * Инициализация кеша
   */
  private async initializeCache(): Promise<void> {
    try {
      if (this.config.enableDiskCache) {
        await fs.mkdir(this.config.cacheDirectory, { recursive: true });
        await this.loadDiskCacheIndex();
      }
      this.logger.info('📦 Smart Asset Cache initialized', {
        memoryLimit: this.config.maxMemoryMB + 'MB',
        diskLimit: this.config.diskMB + 'MB',
        cacheDir: this.config.cacheDirectory
      });
    } catch (error) {
      this.logger.error('Failed to initialize asset cache:', error);
    }
  }

  /**
   * Генерация хеша для ключа кеша
   */
  private generateCacheHash(key: CacheKey): string {
    const normalizedKey = {
      ...key,
      parameters: this.normalizeParameters(key.parameters)
    };
    
    const keyString = JSON.stringify(normalizedKey, Object.keys(normalizedKey).sort());
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Нормализация параметров для consistent hashing
   */
  private normalizeParameters(params: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'number') {
        // Round numbers to avoid floating point precision issues
        normalized[key] = Math.round(value * 1000) / 1000;
      } else if (typeof value === 'string') {
        normalized[key] = value.trim().toLowerCase();
      } else if (typeof value === 'object' && value !== null) {
        normalized[key] = this.normalizeParameters(value);
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Поиск ассета в кеше
   */
  public async getCachedAsset(key: CacheKey): Promise<AssetGenerationResult | null> {
    const hash = this.generateCacheHash(key);
    
    // Сначала проверяем memory cache
    let cachedAsset = this.memoryCache.get(hash);
    
    if (cachedAsset) {
      // Проверяем не истек ли срок
      if (this.isExpired(cachedAsset)) {
        await this.removeFromCache(hash);
        this.stats.missRate++;
        return null;
      }
      
      // Обновляем статистику доступа
      this.updateAccessStats(cachedAsset);
      this.stats.hitRate++;
      
      this.logger.info(`🎯 Cache HIT (memory): ${key.assetType} - quality ${cachedAsset.metadata.qualityScore}`);
      return cachedAsset.asset;
    }
    
    // Проверяем disk cache
    if (this.config.enableDiskCache && this.diskCache.has(hash)) {
      try {
        cachedAsset = await this.loadFromDisk(hash);
        if (cachedAsset && !this.isExpired(cachedAsset)) {
          // Загружаем в memory cache если место есть
          if (this.canFitInMemory(cachedAsset)) {
            this.memoryCache.set(hash, cachedAsset);
          }
          
          this.updateAccessStats(cachedAsset);
          this.stats.hitRate++;
          this.stats.diskReads++;
          
          this.logger.info(`🎯 Cache HIT (disk): ${key.assetType} - quality ${cachedAsset.metadata.qualityScore}`);
          return cachedAsset.asset;
        }
      } catch (error) {
        this.logger.warn('Failed to load asset from disk cache:', error);
        this.diskCache.delete(hash);
      }
    }
    
    this.stats.missRate++;
    this.logger.info(`❌ Cache MISS: ${key.assetType} - ${key.style}`);
    return null;
  }

  /**
   * Сохранение ассета в кеш
   */
  public async cacheAsset(
    key: CacheKey, 
    asset: AssetGenerationResult, 
    qualityScore: number = 50,
    generationTime: number = 0
  ): Promise<void> {
    const hash = this.generateCacheHash(key);
    
    const cachedAsset: CachedAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hash,
      asset,
      metadata: {
        prompt: key.prompt,
        style: key.style,
        assetType: key.assetType,
        parameters: key.parameters,
        qualityScore,
        generationTime,
        aiModel: key.aiModel,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        fileSize: asset.data.length
      },
      priority: this.calculatePriority(qualityScore, asset.data.length, key.assetType),
      expiresAt: this.calculateExpirationTime(qualityScore)
    };

    // Проверяем размер ассета
    if (asset.data.length > this.config.maxAssetSize) {
      this.logger.warn(`Asset too large for cache: ${asset.data.length} bytes`);
      return;
    }

    // Освобождаем место в memory cache если нужно
    await this.ensureMemorySpace(cachedAsset.metadata.fileSize);
    
    // Сохраняем в memory cache
    this.memoryCache.set(hash, cachedAsset);
    this.updateMemoryStats();
    
    // Сохраняем на диск если включено
    if (this.config.enableDiskCache && this.shouldCacheToDisk(cachedAsset)) {
      await this.saveToDisk(hash, cachedAsset);
    }
    
    this.stats.totalCachedAssets++;
    this.updateQualityStats();
    
    this.logger.info(`💾 Cached asset: ${key.assetType} - quality ${qualityScore}, priority ${cachedAsset.priority}`);
  }

  /**
   * Расчет приоритета ассета
   */
  private calculatePriority(qualityScore: number, fileSize: number, assetType: string): number {
    let priority = qualityScore; // Base on quality (0-100)
    
    // Бонус за тип ассета
    const typeMultipliers = {
      'sprite': 1.2,
      'background': 1.0,
      'ui': 1.1,
      'sound': 0.9
    };
    priority *= typeMultipliers[assetType as keyof typeof typeMultipliers] || 1.0;
    
    // Штраф за большой размер
    const sizeMB = fileSize / (1024 * 1024);
    if (sizeMB > 1) {
      priority *= Math.max(0.5, 1 - (sizeMB - 1) * 0.1);
    }
    
    return Math.min(100, Math.max(0, priority));
  }

  /**
   * Расчет времени истечения на основе качества
   */
  private calculateExpirationTime(qualityScore: number): Date {
    const baseTTL = this.config.defaultTTL;
    const qualityMultiplier = 1 + (qualityScore / 100) * (this.config.qualityTTLMultiplier - 1);
    const adjustedTTL = baseTTL * qualityMultiplier;
    
    return new Date(Date.now() + adjustedTTL);
  }

  /**
   * Проверка истечения срока
   */
  private isExpired(cachedAsset: CachedAsset): boolean {
    return cachedAsset.expiresAt !== null && cachedAsset.expiresAt < new Date();
  }

  /**
   * Обновление статистики доступа
   */
  private updateAccessStats(cachedAsset: CachedAsset): void {
    cachedAsset.metadata.lastAccessedAt = new Date();
    cachedAsset.metadata.accessCount++;
    
    // Обновляем priority на основе частоты использования
    const accessFactor = Math.min(2.0, 1 + cachedAsset.metadata.accessCount * 0.1);
    cachedAsset.priority = Math.min(100, cachedAsset.priority * accessFactor);
    
    // Логируем доступы для анализа паттернов
    const now = Date.now();
    if (!this.accessLog.has(cachedAsset.hash)) {
      this.accessLog.set(cachedAsset.hash, []);
    }
    this.accessLog.get(cachedAsset.hash)!.push(now);
    
    // Ограничиваем историю доступов
    const accesses = this.accessLog.get(cachedAsset.hash)!;
    const hourAgo = now - 60 * 60 * 1000;
    this.accessLog.set(cachedAsset.hash, accesses.filter(t => t > hourAgo));
  }

  /**
   * Проверка можно ли загрузить в память
   */
  private canFitInMemory(cachedAsset: CachedAsset): boolean {
    const newSizeMB = this.stats.memoryUsageMB + (cachedAsset.metadata.fileSize / (1024 * 1024));
    return newSizeMB <= this.config.maxMemoryMB;
  }

  /**
   * Освобождение места в памяти
   */
  private async ensureMemorySpace(requiredBytes: number): Promise<void> {
    const requiredMB = requiredBytes / (1024 * 1024);
    const availableMB = this.config.maxMemoryMB - this.stats.memoryUsageMB;
    
    if (requiredMB <= availableMB) {
      return; // Достаточно места
    }
    
    const toFreeMB = requiredMB - availableMB + 50; // +50MB buffer
    await this.evictLRUAssets(toFreeMB);
  }

  /**
   * Удаление наименее используемых ассетов (LRU)
   */
  private async evictLRUAssets(targetMB: number): Promise<void> {
    const assets = Array.from(this.memoryCache.values());
    
    // Сортируем по приоритету и времени последнего доступа
    assets.sort((a, b) => {
      const priorityDiff = a.priority - b.priority;
      if (Math.abs(priorityDiff) > 10) {
        return priorityDiff;
      }
      return a.metadata.lastAccessedAt.getTime() - b.metadata.lastAccessedAt.getTime();
    });
    
    let freedMB = 0;
    const evicted = [];
    
    for (const asset of assets) {
      if (freedMB >= targetMB) break;
      
      // Сохраняем на диск перед удалением из памяти (если высокое качество)
      if (this.config.enableDiskCache && asset.metadata.qualityScore >= this.config.priorityThreshold) {
        await this.saveToDisk(asset.hash, asset);
      }
      
      this.memoryCache.delete(asset.hash);
      freedMB += asset.metadata.fileSize / (1024 * 1024);
      evicted.push(asset.metadata.assetType);
      this.stats.evictions++;
    }
    
    this.updateMemoryStats();
    this.logger.info(`🗑️  Evicted ${evicted.length} assets (${freedMB.toFixed(1)}MB): ${evicted.join(', ')}`);
  }

  /**
   * Проверка нужно ли кешировать на диск
   */
  private shouldCacheToDisk(cachedAsset: CachedAsset): boolean {
    return cachedAsset.metadata.qualityScore >= this.config.priorityThreshold ||
           cachedAsset.metadata.accessCount > 2;
  }

  /**
   * Сохранение на диск
   */
  private async saveToDisk(hash: string, cachedAsset: CachedAsset): Promise<void> {
    try {
      const filename = `${hash}.cache`;
      const filepath = path.join(this.config.cacheDirectory, filename);
      
      const cacheData = {
        metadata: cachedAsset.metadata,
        priority: cachedAsset.priority,
        expiresAt: cachedAsset.expiresAt,
        assetData: cachedAsset.asset.data.toString('base64'),
        assetMetadata: cachedAsset.asset.metadata
      };
      
      await fs.writeFile(filepath, JSON.stringify(cacheData));
      this.diskCache.set(hash, filepath);
      this.stats.diskWrites++;
      
      await this.updateDiskStats();
      
    } catch (error) {
      this.logger.error('Failed to save asset to disk:', error);
    }
  }

  /**
   * Загрузка с диска
   */
  private async loadFromDisk(hash: string): Promise<CachedAsset | null> {
    try {
      const filepath = this.diskCache.get(hash);
      if (!filepath) return null;
      
      const data = await fs.readFile(filepath, 'utf8');
      const cacheData = JSON.parse(data);
      
      const cachedAsset: CachedAsset = {
        id: `disk_${Date.now()}`,
        hash,
        asset: {
          type: cacheData.assetMetadata?.type || 'image',
          data: Buffer.from(cacheData.assetData, 'base64'),
          metadata: cacheData.assetMetadata
        },
        metadata: {
          ...cacheData.metadata,
          createdAt: new Date(cacheData.metadata.createdAt),
          lastAccessedAt: new Date(cacheData.metadata.lastAccessedAt)
        },
        priority: cacheData.priority,
        expiresAt: cacheData.expiresAt ? new Date(cacheData.expiresAt) : null
      };
      
      return cachedAsset;
      
    } catch (error) {
      this.logger.warn('Failed to load asset from disk:', error);
      return null;
    }
  }

  /**
   * Удаление из кеша
   */
  private async removeFromCache(hash: string): Promise<void> {
    // Удаляем из памяти
    this.memoryCache.delete(hash);
    
    // Удаляем с диска
    if (this.diskCache.has(hash)) {
      try {
        const filepath = this.diskCache.get(hash)!;
        await fs.unlink(filepath);
        this.diskCache.delete(hash);
      } catch (error) {
        this.logger.warn('Failed to delete cached file:', error);
      }
    }
    
    // Удаляем из логов доступа
    this.accessLog.delete(hash);
    
    this.updateMemoryStats();
    await this.updateDiskStats();
  }

  /**
   * Загрузка индекса дискового кеша
   */
  private async loadDiskCacheIndex(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.cacheDirectory);
      const cacheFiles = files.filter(f => f.endsWith('.cache'));
      
      for (const file of cacheFiles) {
        const hash = file.replace('.cache', '');
        const filepath = path.join(this.config.cacheDirectory, file);
        this.diskCache.set(hash, filepath);
      }
      
      this.logger.info(`📂 Loaded ${cacheFiles.length} cached assets from disk`);
      await this.updateDiskStats();
      
    } catch (error) {
      this.logger.warn('Failed to load disk cache index:', error);
    }
  }

  /**
   * Обновление статистики памяти
   */
  private updateMemoryStats(): void {
    const totalBytes = Array.from(this.memoryCache.values())
      .reduce((sum, asset) => sum + asset.metadata.fileSize, 0);
    
    this.stats.memoryUsageMB = totalBytes / (1024 * 1024);
    this.stats.totalCachedAssets = this.memoryCache.size + this.diskCache.size;
  }

  /**
   * Обновление статистики диска
   */
  private async updateDiskStats(): Promise<void> {
    try {
      let totalBytes = 0;
      for (const filepath of this.diskCache.values()) {
        try {
          const stat = await fs.stat(filepath);
          totalBytes += stat.size;
        } catch (error) {
          // Файл был удален, убираем из индекса
          const hash = Array.from(this.diskCache.entries())
            .find(([_, path]) => path === filepath)?.[0];
          if (hash) {
            this.diskCache.delete(hash);
          }
        }
      }
      this.stats.diskUsageMB = totalBytes / (1024 * 1024);
    } catch (error) {
      this.logger.warn('Failed to update disk stats:', error);
    }
  }

  /**
   * Обновление статистики качества
   */
  private updateQualityStats(): void {
    const assets = Array.from(this.memoryCache.values());
    if (assets.length === 0) {
      this.stats.averageQualityScore = 0;
      return;
    }
    
    const totalQuality = assets.reduce((sum, asset) => sum + asset.metadata.qualityScore, 0);
    this.stats.averageQualityScore = totalQuality / assets.length;
    
    // Подсчет топ типов ассетов
    const typeCounts = new Map<string, number>();
    assets.forEach(asset => {
      const type = asset.metadata.assetType;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    
    this.stats.topAssetTypes = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Запуск таймера очистки
   */
  private startCleanupTimer(): void {
    // Очистка каждые 30 минут
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30 * 60 * 1000);
  }

  /**
   * Периодическая очистка кеша
   */
  private async performCleanup(): Promise<void> {
    const startTime = Date.now();
    let cleaned = 0;
    
    // Удаляем истекшие ассеты
    for (const [hash, asset] of this.memoryCache.entries()) {
      if (this.isExpired(asset)) {
        await this.removeFromCache(hash);
        cleaned++;
      }
    }
    
    // Очищаем неиспользуемые логи доступа
    const hourAgo = Date.now() - 60 * 60 * 1000;
    for (const [hash, timestamps] of this.accessLog.entries()) {
      const recentAccesses = timestamps.filter(t => t > hourAgo);
      if (recentAccesses.length === 0) {
        this.accessLog.delete(hash);
      } else {
        this.accessLog.set(hash, recentAccesses);
      }
    }
    
    this.updateMemoryStats();
    await this.updateDiskStats();
    this.updateQualityStats();
    
    const duration = Date.now() - startTime;
    this.logger.info(`🧹 Cache cleanup completed: ${cleaned} expired assets removed in ${duration}ms`);
  }

  /**
   * Получение статистики кеша
   */
  public getCacheStats(): CacheStats {
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (this.stats.hitRate / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.stats.missRate / totalRequests) * 100 : 0
    };
  }

  /**
   * Предварительный прогрев кеша
   */
  public async warmupCache(commonAssets: Array<{ key: CacheKey; asset: AssetGenerationResult; quality: number }>): Promise<void> {
    this.logger.info(`🔥 Warming up cache with ${commonAssets.length} common assets...`);
    
    for (const { key, asset, quality } of commonAssets) {
      await this.cacheAsset(key, asset, quality);
    }
    
    this.logger.info('🔥 Cache warmup completed');
  }

  /**
   * Очистка всего кеша
   */
  public async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.accessLog.clear();
    
    if (this.config.enableDiskCache) {
      try {
        const files = await fs.readdir(this.config.cacheDirectory);
        const cacheFiles = files.filter(f => f.endsWith('.cache'));
        
        await Promise.all(cacheFiles.map(file => 
          fs.unlink(path.join(this.config.cacheDirectory, file))
        ));
        
        this.diskCache.clear();
      } catch (error) {
        this.logger.error('Failed to clear disk cache:', error);
      }
    }
    
    // Reset stats
    this.stats = {
      memoryUsageMB: 0,
      diskUsageMB: 0,
      totalCachedAssets: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      diskWrites: 0,
      diskReads: 0,
      averageQualityScore: 0,
      topAssetTypes: []
    };
    
    this.logger.info('🗑️  Cache cleared completely');
  }

  /**
   * Анализ паттернов доступа
   */
  public analyzeAccessPatterns(): {
    mostAccessedAssets: Array<{ hash: string; accessCount: number; assetType: string }>;
    hotAssets: Array<{ hash: string; accessesPerHour: number; assetType: string }>;
    cacheEfficiency: number;
  } {
    const assets = Array.from(this.memoryCache.values());
    
    // Самые часто используемые ассеты
    const mostAccessed = assets
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, 10)
      .map(asset => ({
        hash: asset.hash,
        accessCount: asset.metadata.accessCount,
        assetType: asset.metadata.assetType
      }));
    
    // "Горячие" ассеты (много доступов за последний час)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const hotAssets = assets
      .map(asset => {
        const recentAccesses = this.accessLog.get(asset.hash)?.filter(t => t > hourAgo) || [];
        return {
          hash: asset.hash,
          accessesPerHour: recentAccesses.length,
          assetType: asset.metadata.assetType
        };
      })
      .filter(item => item.accessesPerHour > 0)
      .sort((a, b) => b.accessesPerHour - a.accessesPerHour)
      .slice(0, 10);
    
    // Эффективность кеша
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    const cacheEfficiency = totalRequests > 0 ? (this.stats.hitRate / totalRequests) * 100 : 0;
    
    return {
      mostAccessedAssets: mostAccessed,
      hotAssets,
      cacheEfficiency
    };
  }

  /**
   * Остановка сервиса
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    await this.performCleanup();
    this.logger.info('🔌 Smart Asset Cache shutdown completed');
  }
} 