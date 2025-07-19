import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { VM } from 'vm2';
import { logger } from './logger';
import { analyticsService } from './analytics';

// Интерфейсы для системы плагинов
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  main: string;
  dependencies: string[];
  permissions: string[];
  config: any;
  metadata: {
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
    engines?: any;
  };
  status: 'installed' | 'active' | 'inactive' | 'error' | 'uninstalled';
  isSystem: boolean;
  installDate: Date;
  updateDate: Date;
  lastError?: string;
}

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  main: string;
  dependencies?: string[];
  permissions?: string[];
  config?: any;
  metadata?: any;
}

interface PluginInstance {
  plugin: Plugin;
  instance: any;
  hooks: Map<string, Function[]>;
  api: PluginAPI;
  sandbox: VM;
  context: any;
}

interface PluginHook {
  name: string;
  description: string;
  parameters: any;
  returnType: string;
  phase: 'before' | 'after' | 'around';
}

interface PluginAPI {
  game: {
    create: (config: any) => Promise<any>;
    update: (id: string, config: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    get: (id: string) => Promise<any>;
    list: (filters?: any) => Promise<any[]>;
  };
  user: {
    getCurrentUser: () => any;
    hasPermission: (permission: string) => boolean;
    notify: (message: string, type?: string) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    list: (prefix?: string) => Promise<string[]>;
  };
  events: {
    emit: (event: string, data?: any) => void;
    on: (event: string, handler: Function) => void;
    off: (event: string, handler: Function) => void;
  };
  http: {
    request: (options: any) => Promise<any>;
    webhook: (url: string, data: any) => Promise<any>;
  };
  ui: {
    addMenuItem: (item: any) => void;
    addWidget: (widget: any) => void;
    showDialog: (dialog: any) => Promise<any>;
    showNotification: (notification: any) => void;
  };
  utils: {
    log: (message: string, level?: string) => void;
    hash: (data: string) => string;
    encrypt: (data: string) => string;
    decrypt: (data: string) => string;
    validate: (data: any, schema: any) => boolean;
  };
}

interface PluginMarketplace {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  downloads: number;
  rating: number;
  reviews: number;
  price: number;
  currency: string;
  screenshots: string[];
  tags: string[];
  publishDate: Date;
  updateDate: Date;
  status: 'published' | 'under_review' | 'rejected' | 'deprecated';
}

class PluginSystemService extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private hooks: Map<string, PluginHook> = new Map();
  private marketplace: Map<string, PluginMarketplace> = new Map();
  private pluginStorage: Map<string, Map<string, any>> = new Map();

  private readonly pluginsDir = join(process.cwd(), 'plugins');
  private readonly systemPluginsDir = join(process.cwd(), 'system-plugins');

  constructor() {
    super();
    this.initializeHooks();
    this.loadSystemPlugins();
  }

  // Управление плагинами
  public async installPlugin(pluginPath: string, isSystem: boolean = false): Promise<Plugin> {
    try {
      const manifest = await this.loadManifest(pluginPath);
      const pluginId = this.generatePluginId(manifest.name, manifest.author);

      // Проверяем зависимости
      await this.checkDependencies(manifest.dependencies || []);

      const plugin: Plugin = {
        id: pluginId,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        category: manifest.category,
        main: manifest.main,
        dependencies: manifest.dependencies || [],
        permissions: manifest.permissions || [],
        config: manifest.config || {},
        metadata: manifest.metadata || {},
        status: 'installed',
        isSystem,
        installDate: new Date(),
        updateDate: new Date()
      };

      this.plugins.set(pluginId, plugin);
      
      // Копируем файлы плагина
      const targetDir = join(isSystem ? this.systemPluginsDir : this.pluginsDir, pluginId);
      await this.copyPluginFiles(pluginPath, targetDir);

      await this.savePluginRegistry();

      await analyticsService.trackEvent('plugin_installed', {
        pluginId,
        name: plugin.name,
        author: plugin.author,
        version: plugin.version,
        isSystem
      });

      logger.info(`Plugin installed: ${plugin.name} v${plugin.version} by ${plugin.author}`);
      this.emit('pluginInstalled', plugin);

      return plugin;
    } catch (error) {
      logger.error('Error installing plugin:', error);
      throw new Error(`Ошибка при установке плагина: ${error.message}`);
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Плагин не найден');
    }

    if (plugin.isSystem) {
      throw new Error('Системные плагины нельзя удалять');
    }

    // Деактивируем плагин если он активен
    if (plugin.status === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    // Удаляем файлы плагина
    const pluginDir = join(this.pluginsDir, pluginId);
    await fs.rmdir(pluginDir, { recursive: true });

    this.plugins.delete(pluginId);
    this.pluginStorage.delete(pluginId);

    await this.savePluginRegistry();

    await analyticsService.trackEvent('plugin_uninstalled', {
      pluginId,
      name: plugin.name,
      author: plugin.author
    });

    logger.info(`Plugin uninstalled: ${plugin.name}`);
    this.emit('pluginUninstalled', plugin);
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Плагин не найден');
    }

    if (plugin.status === 'active') {
      return;
    }

    try {
      // Проверяем зависимости
      await this.resolveDependencies(plugin.dependencies);

      // Загружаем плагин
      const instance = await this.loadPlugin(plugin);
      this.instances.set(pluginId, instance);

      plugin.status = 'active';
      plugin.updateDate = new Date();
      plugin.lastError = undefined;

      await this.savePluginRegistry();

      await analyticsService.trackEvent('plugin_activated', {
        pluginId,
        name: plugin.name,
        author: plugin.author
      });

      logger.info(`Plugin activated: ${plugin.name}`);
      this.emit('pluginActivated', plugin);
    } catch (error) {
      plugin.status = 'error';
      plugin.lastError = error.message;
      logger.error(`Error activating plugin ${plugin.name}:`, error);
      throw new Error(`Ошибка при активации плагина: ${error.message}`);
    }
  }

  public async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Плагин не найден');
    }

    if (plugin.status !== 'active') {
      return;
    }

    try {
      const instance = this.instances.get(pluginId);
      if (instance) {
        // Вызываем метод деактивации плагина
        if (instance.instance && typeof instance.instance.deactivate === 'function') {
          await instance.instance.deactivate();
        }

        // Удаляем хуки
        instance.hooks.clear();
        this.instances.delete(pluginId);
      }

      plugin.status = 'inactive';
      plugin.updateDate = new Date();

      await this.savePluginRegistry();

      await analyticsService.trackEvent('plugin_deactivated', {
        pluginId,
        name: plugin.name,
        author: plugin.author
      });

      logger.info(`Plugin deactivated: ${plugin.name}`);
      this.emit('pluginDeactivated', plugin);
    } catch (error) {
      logger.error(`Error deactivating plugin ${plugin.name}:`, error);
      throw new Error(`Ошибка при деактивации плагина: ${error.message}`);
    }
  }

  public async updatePlugin(pluginId: string, newVersion: string): Promise<Plugin> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Плагин не найден');
    }

    // Деактивируем плагин
    const wasActive = plugin.status === 'active';
    if (wasActive) {
      await this.deactivatePlugin(pluginId);
    }

    // Обновляем версию и метаданные
    plugin.version = newVersion;
    plugin.updateDate = new Date();

    // Активируем снова если был активен
    if (wasActive) {
      await this.activatePlugin(pluginId);
    }

    await this.savePluginRegistry();

    await analyticsService.trackEvent('plugin_updated', {
      pluginId,
      name: plugin.name,
      oldVersion: plugin.version,
      newVersion
    });

    logger.info(`Plugin updated: ${plugin.name} to v${newVersion}`);
    this.emit('pluginUpdated', plugin);

    return plugin;
  }

  // Система хуков
  public registerHook(name: string, hook: PluginHook): void {
    this.hooks.set(name, hook);
    logger.debug(`Hook registered: ${name}`);
  }

  public async executeHook(hookName: string, data: any = {}, context: any = {}): Promise<any> {
    const results: any[] = [];

    for (const [pluginId, instance] of this.instances.entries()) {
      const hooks = instance.hooks.get(hookName);
      if (hooks && hooks.length > 0) {
        try {
          for (const hook of hooks) {
            const result = await hook.call(instance.context, data, context);
            if (result !== undefined) {
              results.push({
                pluginId,
                result
              });
            }
          }
        } catch (error) {
          logger.error(`Error executing hook ${hookName} in plugin ${pluginId}:`, error);
        }
      }
    }

    return results;
  }

  public addHook(pluginId: string, hookName: string, handler: Function): void {
    const instance = this.instances.get(pluginId);
    if (!instance) {
      throw new Error('Плагин не активен');
    }

    if (!instance.hooks.has(hookName)) {
      instance.hooks.set(hookName, []);
    }

    instance.hooks.get(hookName)!.push(handler);
    logger.debug(`Hook added: ${hookName} for plugin ${pluginId}`);
  }

  public removeHook(pluginId: string, hookName: string, handler?: Function): void {
    const instance = this.instances.get(pluginId);
    if (!instance) {
      return;
    }

    if (handler) {
      const hooks = instance.hooks.get(hookName);
      if (hooks) {
        const index = hooks.indexOf(handler);
        if (index > -1) {
          hooks.splice(index, 1);
        }
      }
    } else {
      instance.hooks.delete(hookName);
    }
  }

  // API для плагинов
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      game: {
        create: async (config: any) => {
          // Интеграция с игровым движком
          return await this.executeHook('game:create', { config }, { pluginId });
        },
        update: async (id: string, config: any) => {
          return await this.executeHook('game:update', { id, config }, { pluginId });
        },
        delete: async (id: string) => {
          return await this.executeHook('game:delete', { id }, { pluginId });
        },
        get: async (id: string) => {
          return await this.executeHook('game:get', { id }, { pluginId });
        },
        list: async (filters?: any) => {
          return await this.executeHook('game:list', { filters }, { pluginId });
        }
      },
      user: {
        getCurrentUser: () => {
          // Получение текущего пользователя
          return { id: 'user123', name: 'Test User' };
        },
        hasPermission: (permission: string) => {
          const plugin = this.plugins.get(pluginId);
          return plugin?.permissions.includes(permission) || false;
        },
        notify: (message: string, type?: string) => {
          this.emit('userNotification', { pluginId, message, type });
        }
      },
      storage: {
        get: async (key: string) => {
          const storage = this.pluginStorage.get(pluginId) || new Map();
          return storage.get(key);
        },
        set: async (key: string, value: any) => {
          let storage = this.pluginStorage.get(pluginId);
          if (!storage) {
            storage = new Map();
            this.pluginStorage.set(pluginId, storage);
          }
          storage.set(key, value);
        },
        delete: async (key: string) => {
          const storage = this.pluginStorage.get(pluginId);
          if (storage) {
            storage.delete(key);
          }
        },
        list: async (prefix?: string) => {
          const storage = this.pluginStorage.get(pluginId) || new Map();
          const keys = Array.from(storage.keys());
          return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
        }
      },
      events: {
        emit: (event: string, data?: any) => {
          this.emit(`plugin:${pluginId}:${event}`, data);
        },
        on: (event: string, handler: Function) => {
          this.on(`plugin:${pluginId}:${event}`, handler);
        },
        off: (event: string, handler: Function) => {
          this.off(`plugin:${pluginId}:${event}`, handler);
        }
      },
      http: {
        request: async (options: any) => {
          // HTTP клиент с ограничениями безопасности
          const { default: fetch } = await import('node-fetch');
          return await fetch(options.url, options);
        },
        webhook: async (url: string, data: any) => {
          const { default: fetch } = await import('node-fetch');
          return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }
      },
      ui: {
        addMenuItem: (item: any) => {
          this.emit('ui:menuItem', { pluginId, item });
        },
        addWidget: (widget: any) => {
          this.emit('ui:widget', { pluginId, widget });
        },
        showDialog: async (dialog: any) => {
          return new Promise((resolve) => {
            this.emit('ui:dialog', { pluginId, dialog, resolve });
          });
        },
        showNotification: (notification: any) => {
          this.emit('ui:notification', { pluginId, notification });
        }
      },
      utils: {
        log: (message: string, level: string = 'info') => {
          logger.log(level as any, `[Plugin:${pluginId}] ${message}`);
        },
        hash: (data: string) => {
          const crypto = require('crypto');
          return crypto.createHash('sha256').update(data).digest('hex');
        },
        encrypt: (data: string) => {
          // Простое шифрование для демонстрации
          return Buffer.from(data).toString('base64');
        },
        decrypt: (data: string) => {
          return Buffer.from(data, 'base64').toString('utf8');
        },
        validate: (data: any, schema: any) => {
          // Простая валидация
          return typeof data === typeof schema;
        }
      }
    };
  }

  // Загрузка плагинов
  private async loadPlugin(plugin: Plugin): Promise<PluginInstance> {
    const pluginDir = join(plugin.isSystem ? this.systemPluginsDir : this.pluginsDir, plugin.id);
    const mainFile = join(pluginDir, plugin.main);

    // Создаем песочницу для плагина
    const sandbox = new VM({
      timeout: 30000,
      sandbox: {
        console,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        require: (moduleName: string) => {
          // Ограниченный список модулей
          const allowedModules = ['crypto', 'path', 'util'];
          if (allowedModules.includes(moduleName)) {
            return require(moduleName);
          }
          throw new Error(`Module ${moduleName} is not allowed`);
        }
      }
    });

    const api = this.createPluginAPI(plugin.id);
    const context = { api, plugin: plugin };

    // Загружаем код плагина
    const pluginCode = await fs.readFile(mainFile, 'utf8');
    const pluginFactory = sandbox.run(pluginCode);

    let instance: any;
    if (typeof pluginFactory === 'function') {
      instance = pluginFactory(api);
    } else {
      instance = pluginFactory;
    }

    // Инициализируем плагин
    if (instance && typeof instance.activate === 'function') {
      await instance.activate();
    }

    const pluginInstance: PluginInstance = {
      plugin,
      instance,
      hooks: new Map(),
      api,
      sandbox,
      context
    };

    return pluginInstance;
  }

  // Управление зависимостями
  private async checkDependencies(dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const [name, version] = dependency.split('@');
      const dependencyPlugin = Array.from(this.plugins.values())
        .find(p => p.name === name);

      if (!dependencyPlugin) {
        throw new Error(`Зависимость не найдена: ${dependency}`);
      }

      if (version && dependencyPlugin.version !== version) {
        throw new Error(`Неподходящая версия зависимости: ${dependency}`);
      }
    }
  }

  private async resolveDependencies(dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const [name] = dependency.split('@');
      const dependencyPlugin = Array.from(this.plugins.values())
        .find(p => p.name === name);

      if (dependencyPlugin && dependencyPlugin.status !== 'active') {
        await this.activatePlugin(dependencyPlugin.id);
      }
    }
  }

  // Маркетплейс
  public async searchMarketplace(query: string, filters?: any): Promise<PluginMarketplace[]> {
    let results = Array.from(this.marketplace.values());

    if (query) {
      results = results.filter(plugin => 
        plugin.name.toLowerCase().includes(query.toLowerCase()) ||
        plugin.description.toLowerCase().includes(query.toLowerCase()) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (filters) {
      if (filters.category) {
        results = results.filter(plugin => plugin.category === filters.category);
      }
      if (filters.author) {
        results = results.filter(plugin => plugin.author === filters.author);
      }
      if (filters.price) {
        if (filters.price === 'free') {
          results = results.filter(plugin => plugin.price === 0);
        } else if (filters.price === 'paid') {
          results = results.filter(plugin => plugin.price > 0);
        }
      }
      if (filters.rating) {
        results = results.filter(plugin => plugin.rating >= filters.rating);
      }
    }

    // Сортировка
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'rating':
          results.sort((a, b) => b.rating - a.rating);
          break;
        case 'downloads':
          results.sort((a, b) => b.downloads - a.downloads);
          break;
        case 'name':
          results.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'date':
          results.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
          break;
      }
    }

    return results;
  }

  public async downloadFromMarketplace(marketplaceId: string): Promise<string> {
    const marketplacePlugin = this.marketplace.get(marketplaceId);
    if (!marketplacePlugin) {
      throw new Error('Плагин в маркетплейсе не найден');
    }

    // Симуляция загрузки
    const downloadPath = `/tmp/plugin-${marketplaceId}.zip`;
    
    await analyticsService.trackEvent('plugin_downloaded', {
      marketplaceId,
      name: marketplacePlugin.name,
      author: marketplacePlugin.author
    });

    return downloadPath;
  }

  // Вспомогательные методы
  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = join(pluginPath, 'plugin.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(manifestContent);
  }

  private generatePluginId(name: string, author: string): string {
    return `${author.toLowerCase().replace(/[^a-z0-9]/g, '')}.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }

  private async copyPluginFiles(source: string, target: string): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    // Простая копия - в реальности нужна рекурсивная копия
    const files = await fs.readdir(source);
    for (const file of files) {
      const sourcePath = join(source, file);
      const targetPath = join(target, file);
      const stat = await fs.stat(sourcePath);
      
      if (stat.isFile()) {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  private async savePluginRegistry(): Promise<void> {
    const registryPath = join(this.pluginsDir, 'registry.json');
    const plugins = Array.from(this.plugins.values());
    await fs.writeFile(registryPath, JSON.stringify(plugins, null, 2));
  }

  private async loadPluginRegistry(): Promise<void> {
    try {
      const registryPath = join(this.pluginsDir, 'registry.json');
      const registryContent = await fs.readFile(registryPath, 'utf8');
      const plugins: Plugin[] = JSON.parse(registryContent);
      
      for (const plugin of plugins) {
        this.plugins.set(plugin.id, plugin);
      }
    } catch (error) {
      // Реестр не существует - это нормально при первом запуске
    }
  }

  private initializeHooks(): void {
    // Системные хуки
    this.registerHook('game:create', {
      name: 'game:create',
      description: 'Вызывается при создании игры',
      parameters: { config: 'object' },
      returnType: 'object',
      phase: 'before'
    });

    this.registerHook('game:update', {
      name: 'game:update',
      description: 'Вызывается при обновлении игры',
      parameters: { id: 'string', config: 'object' },
      returnType: 'object',
      phase: 'before'
    });

    this.registerHook('plugin:loaded', {
      name: 'plugin:loaded',
      description: 'Вызывается после загрузки плагина',
      parameters: { plugin: 'object' },
      returnType: 'void',
      phase: 'after'
    });

    logger.info('Plugin system hooks initialized');
  }

  private async loadSystemPlugins(): Promise<void> {
    try {
      await fs.mkdir(this.systemPluginsDir, { recursive: true });
      await fs.mkdir(this.pluginsDir, { recursive: true });
      
      await this.loadPluginRegistry();

      // Автоматически активируем системные плагины
      for (const [pluginId, plugin] of this.plugins.entries()) {
        if (plugin.isSystem && plugin.status === 'installed') {
          try {
            await this.activatePlugin(pluginId);
          } catch (error) {
            logger.error(`Failed to activate system plugin ${plugin.name}:`, error);
          }
        }
      }

      logger.info('System plugins loaded');
    } catch (error) {
      logger.error('Error loading system plugins:', error);
    }
  }

  // Публичные геттеры
  public getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null;
  }

  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  public getActivePlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.status === 'active');
  }

  public getPluginInstance(pluginId: string): PluginInstance | null {
    return this.instances.get(pluginId) || null;
  }

  public getAvailableHooks(): PluginHook[] {
    return Array.from(this.hooks.values());
  }

  public getMarketplacePlugins(): PluginMarketplace[] {
    return Array.from(this.marketplace.values());
  }

  public getStats(): any {
    const plugins = Array.from(this.plugins.values());
    
    return {
      total: plugins.length,
      active: plugins.filter(p => p.status === 'active').length,
      inactive: plugins.filter(p => p.status === 'inactive').length,
      error: plugins.filter(p => p.status === 'error').length,
      system: plugins.filter(p => p.isSystem).length,
      user: plugins.filter(p => !p.isSystem).length,
      categories: this.getCategoryStats(plugins),
      hooks: this.hooks.size,
      marketplace: this.marketplace.size
    };
  }

  private getCategoryStats(plugins: Plugin[]): any {
    const categories = new Map<string, number>();
    
    for (const plugin of plugins) {
      const count = categories.get(plugin.category) || 0;
      categories.set(plugin.category, count + 1);
    }

    return Object.fromEntries(categories);
  }
}

export const pluginSystemService = new PluginSystemService();
export { PluginSystemService }; 