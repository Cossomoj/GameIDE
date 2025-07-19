import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { analyticsService } from './analytics';

// Интерфейсы для системы расширенных шаблонов
interface GameTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  genre: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  version: string;
  author: string;
  tags: string[];
  thumbnail: string;
  screenshots: string[];
  
  // Структура шаблона
  structure: TemplateStructure;
  components: TemplateComponent[];
  assets: TemplateAsset[];
  scenes: TemplateScene[];
  config: TemplateConfig;
  
  // Метаданные
  baseTemplate?: string; // ID родительского шаблона
  dependencies: string[];
  requirements: TemplateRequirements;
  
  // Статистика
  usage: {
    downloads: number;
    likes: number;
    rating: number;
    reviews: number;
  };
  
  // Система версий
  isPublic: boolean;
  isVerified: boolean;
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

interface TemplateStructure {
  gameType: 'canvas' | 'webgl' | 'hybrid';
  framework: 'phaser' | 'babylonjs' | 'threejs' | 'custom';
  architecture: 'mvc' | 'ecs' | 'component' | 'mixed';
  
  directories: {
    name: string;
    path: string;
    files: TemplateFile[];
  }[];
  
  entryPoint: string;
  buildConfig: any;
}

interface TemplateComponent {
  id: string;
  name: string;
  type: 'entity' | 'system' | 'behavior' | 'ui' | 'effect' | 'sound' | 'script';
  category: string;
  description: string;
  
  // Код компонента
  code: {
    javascript?: string;
    typescript?: string;
    python?: string;
    csharp?: string;
  };
  
  // Параметры компонента
  properties: ComponentProperty[];
  methods: ComponentMethod[];
  events: ComponentEvent[];
  
  // Зависимости
  dependencies: string[];
  requiredComponents: string[];
  
  // Визуальная настройка
  icon: string;
  color: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  
  // Документация
  documentation: string;
  examples: string[];
  
  isCore: boolean;
  version: string;
}

interface ComponentProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function' | 'color' | 'texture' | 'sound';
  defaultValue: any;
  description: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  group?: string;
}

interface ComponentMethod {
  name: string;
  description: string;
  parameters: ComponentProperty[];
  returnType: string;
  isPublic: boolean;
  isStatic: boolean;
}

interface ComponentEvent {
  name: string;
  description: string;
  parameters: ComponentProperty[];
  bubbles: boolean;
}

interface TemplateAsset {
  id: string;
  name: string;
  type: 'image' | 'sprite' | 'animation' | 'sound' | 'music' | 'font' | 'model' | 'texture' | 'shader';
  category: string;
  description: string;
  
  // Файл ассета
  filename: string;
  path: string;
  size: number;
  format: string;
  
  // Метаданные для разных типов
  metadata: {
    // Для изображений/спрайтов
    width?: number;
    height?: number;
    frames?: number;
    frameRate?: number;
    
    // Для звуков
    duration?: number;
    bitrate?: number;
    channels?: number;
    
    // Для 3D моделей
    vertices?: number;
    polygons?: number;
    materials?: string[];
  };
  
  // Теги для поиска
  tags: string[];
  license: string;
  author: string;
  
  // Предварительный просмотр
  preview: string;
  thumbnail: string;
  
  isBuiltIn: boolean;
  version: string;
  createdAt: Date;
}

interface TemplateScene {
  id: string;
  name: string;
  description: string;
  type: 'menu' | 'gameplay' | 'cutscene' | 'loading' | 'settings' | 'credits';
  
  // Объекты сцены
  gameObjects: GameObject[];
  
  // Настройки сцены
  settings: {
    backgroundColor: string;
    gravity?: { x: number; y: number };
    physics?: boolean;
    lighting?: any;
    camera?: any;
  };
  
  // Скрипты сцены
  scripts: {
    onLoad?: string;
    onStart?: string;
    onUpdate?: string;
    onDestroy?: string;
  };
  
  // Порядок в игре
  order: number;
  isDefault: boolean;
}

interface GameObject {
  id: string;
  name: string;
  type: string;
  
  // Трансформация
  transform: {
    position: { x: number; y: number; z?: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z?: number };
  };
  
  // Компоненты объекта
  components: string[];
  
  // Свойства
  properties: { [key: string]: any };
  
  // Иерархия
  parent?: string;
  children: string[];
  
  // Видимость и активность
  visible: boolean;
  active: boolean;
  
  // Слой и теги
  layer: string;
  tags: string[];
}

interface TemplateConfig {
  // Основные настройки
  title: string;
  description: string;
  version: string;
  
  // Размеры и отображение
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
    responsive: boolean;
  };
  
  // Производительность
  performance: {
    targetFPS: number;
    maxObjects: number;
    enableDebug: boolean;
    optimizations: string[];
  };
  
  // Настройки ввода
  input: {
    keyboard: boolean;
    mouse: boolean;
    touch: boolean;
    gamepad: boolean;
    customControls: any[];
  };
  
  // Аудио
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    spatialAudio: boolean;
  };
  
  // Локализация
  localization: {
    defaultLanguage: string;
    supportedLanguages: string[];
    autoDetect: boolean;
  };
  
  // Сохранения
  saves: {
    enabled: boolean;
    cloudSync: boolean;
    autoSave: boolean;
    maxSlots: number;
  };
  
  // Аналитика
  analytics: {
    enabled: boolean;
    trackEvents: string[];
    privacyCompliant: boolean;
  };
}

interface TemplateRequirements {
  // Системные требования
  system: {
    minMemory: string;
    minStorage: string;
    minCPU: string;
    gpu?: string;
  };
  
  // Браузерные требования
  browser: {
    minVersions: { [browser: string]: string };
    requiredFeatures: string[];
    optionalFeatures: string[];
  };
  
  // Зависимости
  dependencies: {
    frameworks: string[];
    libraries: string[];
    plugins: string[];
  };
}

interface TemplateFile {
  name: string;
  path: string;
  type: 'code' | 'asset' | 'config' | 'doc';
  content?: string;
  encoding: 'utf8' | 'base64' | 'binary';
  template?: boolean; // Является ли файл шаблоном для генерации
  variables?: { [key: string]: any }; // Переменные для подстановки
}

interface TemplateBuilder {
  id: string;
  name: string;
  template: GameTemplate;
  currentStep: number;
  steps: BuilderStep[];
  configuration: any;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BuilderStep {
  id: string;
  name: string;
  title: string;
  description: string;
  type: 'selection' | 'configuration' | 'customization' | 'preview' | 'generation';
  component: string; // Frontend компонент для отображения
  validation?: any;
  required: boolean;
  order: number;
}

class AdvancedTemplatesService extends EventEmitter {
  private templates: Map<string, GameTemplate> = new Map();
  private components: Map<string, TemplateComponent> = new Map();
  private assets: Map<string, TemplateAsset> = new Map();
  private builders: Map<string, TemplateBuilder> = new Map();

  private readonly templatesDir = join(process.cwd(), 'templates');
  private readonly assetsDir = join(process.cwd(), 'template-assets');
  private readonly componentsDir = join(process.cwd(), 'template-components');

  constructor() {
    super();
    this.initializeSystem();
  }

  // Управление шаблонами
  public async createTemplate(templateData: Partial<GameTemplate>): Promise<GameTemplate> {
    const templateId = this.generateId();
    
    const template: GameTemplate = {
      id: templateId,
      name: templateData.name || 'Новый шаблон',
      description: templateData.description || '',
      category: templateData.category || 'custom',
      genre: templateData.genre || 'arcade',
      difficulty: templateData.difficulty || 'beginner',
      version: templateData.version || '1.0.0',
      author: templateData.author || 'Unknown',
      tags: templateData.tags || [],
      thumbnail: templateData.thumbnail || '',
      screenshots: templateData.screenshots || [],
      
      structure: templateData.structure || this.getDefaultStructure(),
      components: templateData.components || [],
      assets: templateData.assets || [],
      scenes: templateData.scenes || [],
      config: templateData.config || this.getDefaultConfig(),
      
      baseTemplate: templateData.baseTemplate,
      dependencies: templateData.dependencies || [],
      requirements: templateData.requirements || this.getDefaultRequirements(),
      
      usage: {
        downloads: 0,
        likes: 0,
        rating: 0,
        reviews: 0
      },
      
      isPublic: templateData.isPublic ?? false,
      isVerified: false,
      status: 'draft',
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(templateId, template);
    
    await this.saveTemplate(template);
    
    await analyticsService.trackEvent('template_created', {
      templateId,
      name: template.name,
      category: template.category,
      author: template.author
    });

    logger.info(`Template created: ${template.name} (${templateId})`);
    this.emit('templateCreated', template);

    return template;
  }

  public async updateTemplate(templateId: string, updates: Partial<GameTemplate>): Promise<GameTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Шаблон не найден');
    }

    // Обновляем поля
    Object.assign(template, updates, {
      updatedAt: new Date()
    });

    this.templates.set(templateId, template);
    await this.saveTemplate(template);

    await analyticsService.trackEvent('template_updated', {
      templateId,
      name: template.name
    });

    logger.info(`Template updated: ${template.name} (${templateId})`);
    this.emit('templateUpdated', template);

    return template;
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Шаблон не найден');
    }

    // Удаляем файлы шаблона
    const templateDir = join(this.templatesDir, templateId);
    await fs.rmdir(templateDir, { recursive: true }).catch(() => {});

    this.templates.delete(templateId);

    await analyticsService.trackEvent('template_deleted', {
      templateId,
      name: template.name
    });

    logger.info(`Template deleted: ${template.name} (${templateId})`);
    this.emit('templateDeleted', template);
  }

  public async publishTemplate(templateId: string): Promise<GameTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Шаблон не найден');
    }

    // Валидация перед публикацией
    await this.validateTemplate(template);

    template.status = 'published';
    template.publishedAt = new Date();
    template.updatedAt = new Date();

    this.templates.set(templateId, template);
    await this.saveTemplate(template);

    await analyticsService.trackEvent('template_published', {
      templateId,
      name: template.name,
      category: template.category
    });

    logger.info(`Template published: ${template.name} (${templateId})`);
    this.emit('templatePublished', template);

    return template;
  }

  // Система компонентов
  public async createComponent(componentData: Partial<TemplateComponent>): Promise<TemplateComponent> {
    const componentId = this.generateId();
    
    const component: TemplateComponent = {
      id: componentId,
      name: componentData.name || 'Новый компонент',
      type: componentData.type || 'entity',
      category: componentData.category || 'custom',
      description: componentData.description || '',
      
      code: componentData.code || {},
      properties: componentData.properties || [],
      methods: componentData.methods || [],
      events: componentData.events || [],
      
      dependencies: componentData.dependencies || [],
      requiredComponents: componentData.requiredComponents || [],
      
      icon: componentData.icon || '🧩',
      color: componentData.color || '#3B82F6',
      position: componentData.position,
      size: componentData.size,
      
      documentation: componentData.documentation || '',
      examples: componentData.examples || [],
      
      isCore: componentData.isCore || false,
      version: componentData.version || '1.0.0'
    };

    this.components.set(componentId, component);
    await this.saveComponent(component);

    await analyticsService.trackEvent('component_created', {
      componentId,
      name: component.name,
      type: component.type
    });

    logger.info(`Component created: ${component.name} (${componentId})`);
    this.emit('componentCreated', component);

    return component;
  }

  public async generateComponentCode(component: TemplateComponent, language: string): Promise<string> {
    switch (language) {
      case 'javascript':
        return this.generateJavaScriptComponent(component);
      case 'typescript':
        return this.generateTypeScriptComponent(component);
      case 'python':
        return this.generatePythonComponent(component);
      default:
        return component.code.javascript || '// Component code not available';
    }
  }

  // Система ассетов
  public async addAsset(assetData: Partial<TemplateAsset>, fileBuffer?: Buffer): Promise<TemplateAsset> {
    const assetId = this.generateId();
    
    const asset: TemplateAsset = {
      id: assetId,
      name: assetData.name || 'Новый ассет',
      type: assetData.type || 'image',
      category: assetData.category || 'custom',
      description: assetData.description || '',
      
      filename: assetData.filename || `asset_${assetId}`,
      path: assetData.path || '',
      size: assetData.size || 0,
      format: assetData.format || '',
      
      metadata: assetData.metadata || {},
      tags: assetData.tags || [],
      license: assetData.license || 'Unknown',
      author: assetData.author || 'Unknown',
      
      preview: assetData.preview || '',
      thumbnail: assetData.thumbnail || '',
      
      isBuiltIn: assetData.isBuiltIn || false,
      version: assetData.version || '1.0.0',
      createdAt: new Date()
    };

    // Сохраняем файл ассета
    if (fileBuffer) {
      const assetPath = join(this.assetsDir, asset.type, asset.filename);
      await fs.mkdir(join(this.assetsDir, asset.type), { recursive: true });
      await fs.writeFile(assetPath, fileBuffer);
      asset.path = assetPath;
      asset.size = fileBuffer.length;
    }

    this.assets.set(assetId, asset);
    await this.saveAsset(asset);

    await analyticsService.trackEvent('asset_added', {
      assetId,
      name: asset.name,
      type: asset.type,
      size: asset.size
    });

    logger.info(`Asset added: ${asset.name} (${assetId})`);
    this.emit('assetAdded', asset);

    return asset;
  }

  // Конструктор шаблонов
  public async createBuilder(templateId: string, userId: string): Promise<TemplateBuilder> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Шаблон не найден');
    }

    const builderId = this.generateId();
    
    const builder: TemplateBuilder = {
      id: builderId,
      name: `Builder for ${template.name}`,
      template: JSON.parse(JSON.stringify(template)), // Глубокая копия
      currentStep: 0,
      steps: this.generateBuilderSteps(template),
      configuration: {},
      preview: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.builders.set(builderId, builder);

    await analyticsService.trackEvent('builder_created', {
      builderId,
      templateId,
      userId
    });

    logger.info(`Template builder created: ${builderId} for template ${templateId}`);
    this.emit('builderCreated', builder);

    return builder;
  }

  public async updateBuilderStep(builderId: string, stepId: string, configuration: any): Promise<TemplateBuilder> {
    const builder = this.builders.get(builderId);
    if (!builder) {
      throw new Error('Конструктор не найден');
    }

    // Обновляем конфигурацию
    builder.configuration[stepId] = configuration;
    builder.updatedAt = new Date();

    // Генерируем предварительный просмотр
    builder.preview = await this.generatePreview(builder);

    this.builders.set(builderId, builder);

    this.emit('builderUpdated', builder);
    return builder;
  }

  public async generateGame(builderId: string): Promise<{ gameId: string; files: TemplateFile[]; preview: string }> {
    const builder = this.builders.get(builderId);
    if (!builder) {
      throw new Error('Конструктор не найден');
    }

    const gameId = this.generateId();
    
    // Генерируем файлы игры на основе шаблона и конфигурации
    const files = await this.generateGameFiles(builder.template, builder.configuration);
    
    // Создаем превью
    const preview = await this.generateGamePreview(builder.template, builder.configuration);

    await analyticsService.trackEvent('game_generated', {
      builderId,
      gameId,
      templateId: builder.template.id,
      filesCount: files.length
    });

    logger.info(`Game generated: ${gameId} from builder ${builderId}`);
    
    return { gameId, files, preview };
  }

  // Поиск и фильтрация
  public async searchTemplates(query: string, filters?: any): Promise<GameTemplate[]> {
    let results = Array.from(this.templates.values());

    // Фильтр по статусу (только опубликованные для обычных пользователей)
    results = results.filter(template => template.status === 'published' || template.isPublic);

    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        template.category.toLowerCase().includes(searchTerm) ||
        template.genre.toLowerCase().includes(searchTerm)
      );
    }

    if (filters) {
      if (filters.category) {
        results = results.filter(template => template.category === filters.category);
      }
      if (filters.genre) {
        results = results.filter(template => template.genre === filters.genre);
      }
      if (filters.difficulty) {
        results = results.filter(template => template.difficulty === filters.difficulty);
      }
      if (filters.author) {
        results = results.filter(template => template.author === filters.author);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(template => 
          filters.tags.some((tag: string) => template.tags.includes(tag))
        );
      }
    }

    // Сортировка
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'name':
          results.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'rating':
          results.sort((a, b) => b.usage.rating - a.usage.rating);
          break;
        case 'downloads':
          results.sort((a, b) => b.usage.downloads - a.usage.downloads);
          break;
        case 'date':
          results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
        case 'updated':
          results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          break;
      }
    }

    return results;
  }

  public async searchComponents(query: string, filters?: any): Promise<TemplateComponent[]> {
    let results = Array.from(this.components.values());

    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(component =>
        component.name.toLowerCase().includes(searchTerm) ||
        component.description.toLowerCase().includes(searchTerm) ||
        component.category.toLowerCase().includes(searchTerm)
      );
    }

    if (filters) {
      if (filters.type) {
        results = results.filter(component => component.type === filters.type);
      }
      if (filters.category) {
        results = results.filter(component => component.category === filters.category);
      }
    }

    return results;
  }

  public async searchAssets(query: string, filters?: any): Promise<TemplateAsset[]> {
    let results = Array.from(this.assets.values());

    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm) ||
        asset.description.toLowerCase().includes(searchTerm) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (filters) {
      if (filters.type) {
        results = results.filter(asset => asset.type === filters.type);
      }
      if (filters.category) {
        results = results.filter(asset => asset.category === filters.category);
      }
    }

    return results;
  }

  // Валидация и проверка
  private async validateTemplate(template: GameTemplate): Promise<void> {
    // Базовая валидация
    if (!template.name || template.name.trim().length === 0) {
      throw new Error('Название шаблона не может быть пустым');
    }

    if (!template.structure.entryPoint) {
      throw new Error('Не указана точка входа в игру');
    }

    // Проверка зависимостей
    for (const depId of template.dependencies) {
      const dependency = this.templates.get(depId);
      if (!dependency || dependency.status !== 'published') {
        throw new Error(`Зависимость не найдена или не опубликована: ${depId}`);
      }
    }

    // Проверка компонентов
    for (const component of template.components) {
      if (!this.components.has(component.id)) {
        throw new Error(`Компонент не найден: ${component.id}`);
      }
    }

    logger.info(`Template validation passed: ${template.name}`);
  }

  // Генерация кода компонентов
  private generateJavaScriptComponent(component: TemplateComponent): string {
    const className = this.toPascalCase(component.name);
    
    let code = `/**\n * ${component.description}\n */\n`;
    code += `class ${className} {\n`;
    
    // Конструктор
    code += `  constructor(options = {}) {\n`;
    for (const prop of component.properties) {
      code += `    this.${prop.name} = options.${prop.name} ?? ${JSON.stringify(prop.defaultValue)};\n`;
    }
    code += `  }\n\n`;
    
    // Методы
    for (const method of component.methods) {
      const params = method.parameters.map(p => p.name).join(', ');
      code += `  ${method.name}(${params}) {\n`;
      code += `    // ${method.description}\n`;
      code += `    // TODO: Implement method logic\n`;
      code += `  }\n\n`;
    }
    
    code += `}\n\n`;
    code += `export default ${className};\n`;
    
    return code;
  }

  private generateTypeScriptComponent(component: TemplateComponent): string {
    const className = this.toPascalCase(component.name);
    
    let code = `/**\n * ${component.description}\n */\n`;
    
    // Интерфейс для опций
    code += `interface ${className}Options {\n`;
    for (const prop of component.properties) {
      const optional = !prop.required ? '?' : '';
      code += `  ${prop.name}${optional}: ${this.getTypeScriptType(prop.type)};\n`;
    }
    code += `}\n\n`;
    
    // Класс
    code += `export class ${className} {\n`;
    
    // Свойства
    for (const prop of component.properties) {
      code += `  public ${prop.name}: ${this.getTypeScriptType(prop.type)};\n`;
    }
    code += `\n`;
    
    // Конструктор
    code += `  constructor(options: Partial<${className}Options> = {}) {\n`;
    for (const prop of component.properties) {
      code += `    this.${prop.name} = options.${prop.name} ?? ${JSON.stringify(prop.defaultValue)};\n`;
    }
    code += `  }\n\n`;
    
    // Методы
    for (const method of component.methods) {
      const params = method.parameters.map(p => 
        `${p.name}: ${this.getTypeScriptType(p.type)}`
      ).join(', ');
      code += `  public ${method.name}(${params}): ${method.returnType} {\n`;
      code += `    // ${method.description}\n`;
      code += `    // TODO: Implement method logic\n`;
      code += `  }\n\n`;
    }
    
    code += `}\n\n`;
    code += `export default ${className};\n`;
    
    return code;
  }

  private generatePythonComponent(component: TemplateComponent): string {
    const className = this.toPascalCase(component.name);
    
    let code = `"""${component.description}"""\n\n`;
    code += `class ${className}:\n`;
    code += `    """${component.description}"""\n\n`;
    
    // Конструктор
    code += `    def __init__(self, **options):\n`;
    for (const prop of component.properties) {
      const defaultValue = this.toPythonValue(prop.defaultValue);
      code += `        self.${prop.name} = options.get('${prop.name}', ${defaultValue})\n`;
    }
    code += `\n`;
    
    // Методы
    for (const method of component.methods) {
      const params = method.parameters.map(p => p.name).join(', ');
      code += `    def ${method.name}(self${params ? ', ' + params : ''}):\n`;
      code += `        """${method.description}"""\n`;
      code += `        # TODO: Implement method logic\n`;
      code += `        pass\n\n`;
    }
    
    return code;
  }

  // Генерация файлов игры
  private async generateGameFiles(template: GameTemplate, configuration: any): Promise<TemplateFile[]> {
    const files: TemplateFile[] = [];
    
    // Генерируем основные файлы структуры
    for (const directory of template.structure.directories) {
      for (const file of directory.files) {
        let content = file.content || '';
        
        // Подставляем переменные если файл является шаблоном
        if (file.template && file.variables) {
          content = this.processTemplate(content, {
            ...file.variables,
            ...configuration,
            template: template.config
          });
        }
        
        files.push({
          name: file.name,
          path: join(directory.path, file.name),
          type: file.type,
          content,
          encoding: file.encoding,
          template: file.template,
          variables: file.variables
        });
      }
    }
    
    // Генерируем файлы компонентов
    for (const component of template.components) {
      const componentCode = await this.generateComponentCode(component, 'javascript');
      files.push({
        name: `${component.name}.js`,
        path: `components/${component.name}.js`,
        type: 'code',
        content: componentCode,
        encoding: 'utf8'
      });
    }
    
    // Копируем ассеты
    for (const asset of template.assets) {
      if (asset.path) {
        const assetContent = await fs.readFile(asset.path);
        files.push({
          name: asset.filename,
          path: `assets/${asset.type}/${asset.filename}`,
          type: 'asset',
          content: assetContent.toString('base64'),
          encoding: 'base64'
        });
      }
    }
    
    // Генерируем конфигурационные файлы
    files.push({
      name: 'game.config.json',
      path: 'game.config.json',
      type: 'config',
      content: JSON.stringify(template.config, null, 2),
      encoding: 'utf8'
    });
    
    return files;
  }

  // Вспомогательные методы
  private generateBuilderSteps(template: GameTemplate): BuilderStep[] {
    const steps: BuilderStep[] = [
      {
        id: 'basic-settings',
        name: 'basicSettings',
        title: 'Основные настройки',
        description: 'Настройте название, описание и основные параметры игры',
        type: 'configuration',
        component: 'BasicSettingsStep',
        required: true,
        order: 1
      },
      {
        id: 'game-mechanics',
        name: 'gameMechanics',
        title: 'Игровая механика',
        description: 'Выберите и настройте игровые механики',
        type: 'selection',
        component: 'GameMechanicsStep',
        required: true,
        order: 2
      },
      {
        id: 'visual-style',
        name: 'visualStyle',
        title: 'Визуальный стиль',
        description: 'Настройте внешний вид и стиль игры',
        type: 'customization',
        component: 'VisualStyleStep',
        required: false,
        order: 3
      },
      {
        id: 'audio-settings',
        name: 'audioSettings',
        title: 'Аудио настройки',
        description: 'Настройте звуки и музыку',
        type: 'customization',
        component: 'AudioSettingsStep',
        required: false,
        order: 4
      },
      {
        id: 'preview',
        name: 'preview',
        title: 'Предварительный просмотр',
        description: 'Посмотрите как будет выглядеть ваша игра',
        type: 'preview',
        component: 'PreviewStep',
        required: false,
        order: 5
      },
      {
        id: 'generation',
        name: 'generation',
        title: 'Генерация',
        description: 'Создайте финальную версию игры',
        type: 'generation',
        component: 'GenerationStep',
        required: true,
        order: 6
      }
    ];

    return steps;
  }

  private async generatePreview(builder: TemplateBuilder): Promise<string> {
    // Генерируем HTML превью на основе конфигурации
    const config = builder.configuration;
    const template = builder.template;
    
    let preview = `
      <div class="game-preview">
        <h3>${config.basicSettings?.title || template.name}</h3>
        <div class="game-canvas" style="width: ${template.config.dimensions.width}px; height: ${template.config.dimensions.height}px;">
          <!-- Game preview content -->
        </div>
      </div>
    `;
    
    return preview;
  }

  private async generateGamePreview(template: GameTemplate, configuration: any): Promise<string> {
    // Генерируем более детальный превью готовой игры
    return `
      <div class="generated-game">
        <h2>${configuration.basicSettings?.title || template.name}</h2>
        <div class="game-container">
          <!-- Generated game content -->
        </div>
      </div>
    `;
  }

  private processTemplate(template: string, variables: any): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  private getDefaultStructure(): TemplateStructure {
    return {
      gameType: 'canvas',
      framework: 'phaser',
      architecture: 'component',
      directories: [
        {
          name: 'src',
          path: 'src',
          files: [
            {
              name: 'main.js',
              path: 'src/main.js',
              type: 'code',
              content: '// Main game file',
              encoding: 'utf8',
              template: true
            }
          ]
        }
      ],
      entryPoint: 'src/main.js',
      buildConfig: {}
    };
  }

  private getDefaultConfig(): TemplateConfig {
    return {
      title: 'New Game',
      description: 'A new game created with GameIDE',
      version: '1.0.0',
      dimensions: {
        width: 800,
        height: 600,
        aspectRatio: '4:3',
        responsive: true
      },
      performance: {
        targetFPS: 60,
        maxObjects: 1000,
        enableDebug: false,
        optimizations: ['sprite-batching', 'object-pooling']
      },
      input: {
        keyboard: true,
        mouse: true,
        touch: true,
        gamepad: false,
        customControls: []
      },
      audio: {
        masterVolume: 1.0,
        musicVolume: 0.7,
        sfxVolume: 0.8,
        spatialAudio: false
      },
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ru'],
        autoDetect: true
      },
      saves: {
        enabled: true,
        cloudSync: false,
        autoSave: true,
        maxSlots: 3
      },
      analytics: {
        enabled: false,
        trackEvents: ['game_start', 'game_end', 'level_complete'],
        privacyCompliant: true
      }
    };
  }

  private getDefaultRequirements(): TemplateRequirements {
    return {
      system: {
        minMemory: '512MB',
        minStorage: '50MB',
        minCPU: '1GHz'
      },
      browser: {
        minVersions: {
          chrome: '70',
          firefox: '65',
          safari: '12',
          edge: '79'
        },
        requiredFeatures: ['canvas', 'webgl'],
        optionalFeatures: ['webaudio', 'gamepad']
      },
      dependencies: {
        frameworks: [],
        libraries: [],
        plugins: []
      }
    };
  }

  private getTypeScriptType(type: string): string {
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'object';
      case 'function': return 'Function';
      case 'color': return 'string';
      case 'texture': return 'string';
      case 'sound': return 'string';
      default: return 'any';
    }
  }

  private toPythonValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    } else if (value === null) {
      return 'None';
    } else if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    return JSON.stringify(value);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async saveTemplate(template: GameTemplate): Promise<void> {
    const templateDir = join(this.templatesDir, template.id);
    await fs.mkdir(templateDir, { recursive: true });
    
    const templatePath = join(templateDir, 'template.json');
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
  }

  private async saveComponent(component: TemplateComponent): Promise<void> {
    const componentPath = join(this.componentsDir, `${component.id}.json`);
    await fs.mkdir(this.componentsDir, { recursive: true });
    await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
  }

  private async saveAsset(asset: TemplateAsset): Promise<void> {
    const assetPath = join(this.assetsDir, 'registry', `${asset.id}.json`);
    await fs.mkdir(join(this.assetsDir, 'registry'), { recursive: true });
    await fs.writeFile(assetPath, JSON.stringify(asset, null, 2));
  }

  private async initializeSystem(): Promise<void> {
    try {
      // Создаем необходимые директории
      await Promise.all([
        fs.mkdir(this.templatesDir, { recursive: true }),
        fs.mkdir(this.assetsDir, { recursive: true }),
        fs.mkdir(this.componentsDir, { recursive: true })
      ]);

      // Загружаем существующие данные
      await this.loadExistingData();

      // Создаем базовые шаблоны и компоненты
      await this.createDefaultTemplates();
      await this.createDefaultComponents();
      await this.createDefaultAssets();

      logger.info('Advanced templates system initialized');
    } catch (error) {
      logger.error('Error initializing templates system:', error);
    }
  }

  private async loadExistingData(): Promise<void> {
    // Загружаем шаблоны
    try {
      const templateDirs = await fs.readdir(this.templatesDir);
      for (const dir of templateDirs) {
        try {
          const templatePath = join(this.templatesDir, dir, 'template.json');
          const templateData = await fs.readFile(templatePath, 'utf8');
          const template: GameTemplate = JSON.parse(templateData);
          this.templates.set(template.id, template);
        } catch (error) {
          // Пропускаем поврежденные файлы
        }
      }
    } catch (error) {
      // Директория не существует
    }

    // Загружаем компоненты
    try {
      const componentFiles = await fs.readdir(this.componentsDir);
      for (const file of componentFiles) {
        if (file.endsWith('.json')) {
          try {
            const componentPath = join(this.componentsDir, file);
            const componentData = await fs.readFile(componentPath, 'utf8');
            const component: TemplateComponent = JSON.parse(componentData);
            this.components.set(component.id, component);
          } catch (error) {
            // Пропускаем поврежденные файлы
          }
        }
      }
    } catch (error) {
      // Директория не существует
    }

    // Загружаем ассеты
    try {
      const registryDir = join(this.assetsDir, 'registry');
      const assetFiles = await fs.readdir(registryDir);
      for (const file of assetFiles) {
        if (file.endsWith('.json')) {
          try {
            const assetPath = join(registryDir, file);
            const assetData = await fs.readFile(assetPath, 'utf8');
            const asset: TemplateAsset = JSON.parse(assetData);
            this.assets.set(asset.id, asset);
          } catch (error) {
            // Пропускаем поврежденные файлы
          }
        }
      }
    } catch (error) {
      // Директория не существует
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    if (this.templates.size > 0) return; // Уже есть шаблоны

    // Создаем базовые шаблоны для разных жанров
    const defaultTemplates = [
      {
        name: 'Простая аркада',
        description: 'Базовый шаблон для аркадной игры с движением и счетом',
        category: 'arcade',
        genre: 'arcade',
        difficulty: 'beginner' as const,
        author: 'GameIDE Team',
        tags: ['arcade', 'beginner', 'simple']
      },
      {
        name: 'Платформер 2D',
        description: 'Шаблон для создания 2D платформера с физикой и врагами',
        category: 'platformer',
        genre: 'platformer',
        difficulty: 'intermediate' as const,
        author: 'GameIDE Team',
        tags: ['platformer', '2d', 'physics']
      },
      {
        name: 'Головоломка',
        description: 'Шаблон для логических игр и головоломок',
        category: 'puzzle',
        genre: 'puzzle',
        difficulty: 'beginner' as const,
        author: 'GameIDE Team',
        tags: ['puzzle', 'logic', 'casual']
      }
    ];

    for (const templateData of defaultTemplates) {
      await this.createTemplate(templateData);
    }
  }

  private async createDefaultComponents(): Promise<void> {
    if (this.components.size > 0) return; // Уже есть компоненты

    // Создаем базовые компоненты
    const defaultComponents = [
      {
        name: 'Player Controller',
        type: 'entity' as const,
        category: 'player',
        description: 'Компонент для управления игроком',
        properties: [
          { name: 'speed', type: 'number' as const, defaultValue: 100, description: 'Скорость движения', required: true },
          { name: 'jumpHeight', type: 'number' as const, defaultValue: 200, description: 'Высота прыжка', required: false }
        ],
        methods: [
          { name: 'move', description: 'Движение игрока', parameters: [], returnType: 'void', isPublic: true, isStatic: false },
          { name: 'jump', description: 'Прыжок игрока', parameters: [], returnType: 'void', isPublic: true, isStatic: false }
        ],
        isCore: true
      },
      {
        name: 'Score Manager',
        type: 'system' as const,
        category: 'ui',
        description: 'Система управления очками',
        properties: [
          { name: 'currentScore', type: 'number' as const, defaultValue: 0, description: 'Текущий счет', required: true },
          { name: 'highScore', type: 'number' as const, defaultValue: 0, description: 'Рекорд', required: true }
        ],
        methods: [
          { name: 'addScore', description: 'Добавить очки', parameters: [{ name: 'points', type: 'number' as const, defaultValue: 1, description: 'Количество очков', required: true }], returnType: 'void', isPublic: true, isStatic: false },
          { name: 'resetScore', description: 'Сбросить счет', parameters: [], returnType: 'void', isPublic: true, isStatic: false }
        ],
        isCore: true
      }
    ];

    for (const componentData of defaultComponents) {
      await this.createComponent(componentData);
    }
  }

  private async createDefaultAssets(): Promise<void> {
    if (this.assets.size > 0) return; // Уже есть ассеты

    // Создаем записи для базовых ассетов (без реальных файлов)
    const defaultAssets = [
      {
        name: 'Player Sprite',
        type: 'sprite' as const,
        category: 'characters',
        description: 'Базовый спрайт игрока',
        filename: 'player.png',
        format: 'png',
        metadata: { width: 32, height: 32, frames: 4 },
        tags: ['player', 'character', 'sprite'],
        license: 'CC0',
        author: 'GameIDE Team',
        isBuiltIn: true
      },
      {
        name: 'Jump Sound',
        type: 'sound' as const,
        category: 'sfx',
        description: 'Звук прыжка',
        filename: 'jump.wav',
        format: 'wav',
        metadata: { duration: 0.5, bitrate: 44100, channels: 1 },
        tags: ['jump', 'sfx', 'player'],
        license: 'CC0',
        author: 'GameIDE Team',
        isBuiltIn: true
      }
    ];

    for (const assetData of defaultAssets) {
      await this.addAsset(assetData);
    }
  }

  // Публичные геттеры
  public getTemplate(templateId: string): GameTemplate | null {
    return this.templates.get(templateId) || null;
  }

  public getAllTemplates(): GameTemplate[] {
    return Array.from(this.templates.values());
  }

  public getComponent(componentId: string): TemplateComponent | null {
    return this.components.get(componentId) || null;
  }

  public getAllComponents(): TemplateComponent[] {
    return Array.from(this.components.values());
  }

  public getAsset(assetId: string): TemplateAsset | null {
    return this.assets.get(assetId) || null;
  }

  public getAllAssets(): TemplateAsset[] {
    return Array.from(this.assets.values());
  }

  public getBuilder(builderId: string): TemplateBuilder | null {
    return this.builders.get(builderId) || null;
  }

  public getStats(): any {
    const templates = Array.from(this.templates.values());
    const components = Array.from(this.components.values());
    const assets = Array.from(this.assets.values());

    return {
      templates: {
        total: templates.length,
        published: templates.filter(t => t.status === 'published').length,
        draft: templates.filter(t => t.status === 'draft').length,
        byCategory: this.getTemplatesByCategory(),
        byDifficulty: this.getTemplatesByDifficulty()
      },
      components: {
        total: components.length,
        core: components.filter(c => c.isCore).length,
        byType: this.getComponentsByType(),
        byCategory: this.getComponentsByCategory()
      },
      assets: {
        total: assets.length,
        builtIn: assets.filter(a => a.isBuiltIn).length,
        byType: this.getAssetsByType(),
        totalSize: assets.reduce((total, asset) => total + asset.size, 0)
      },
      builders: {
        active: this.builders.size
      }
    };
  }

  private getTemplatesByCategory(): { [category: string]: number } {
    const categories = new Map<string, number>();
    for (const template of this.templates.values()) {
      const count = categories.get(template.category) || 0;
      categories.set(template.category, count + 1);
    }
    return Object.fromEntries(categories);
  }

  private getTemplatesByDifficulty(): { [difficulty: string]: number } {
    const difficulties = new Map<string, number>();
    for (const template of this.templates.values()) {
      const count = difficulties.get(template.difficulty) || 0;
      difficulties.set(template.difficulty, count + 1);
    }
    return Object.fromEntries(difficulties);
  }

  private getComponentsByType(): { [type: string]: number } {
    const types = new Map<string, number>();
    for (const component of this.components.values()) {
      const count = types.get(component.type) || 0;
      types.set(component.type, count + 1);
    }
    return Object.fromEntries(types);
  }

  private getComponentsByCategory(): { [category: string]: number } {
    const categories = new Map<string, number>();
    for (const component of this.components.values()) {
      const count = categories.get(component.category) || 0;
      categories.set(component.category, count + 1);
    }
    return Object.fromEntries(categories);
  }

  private getAssetsByType(): { [type: string]: number } {
    const types = new Map<string, number>();
    for (const asset of this.assets.values()) {
      const count = types.get(asset.type) || 0;
      types.set(asset.type, count + 1);
    }
    return Object.fromEntries(types);
  }
}

export const advancedTemplatesService = new AdvancedTemplatesService();
export { AdvancedTemplatesService }; 