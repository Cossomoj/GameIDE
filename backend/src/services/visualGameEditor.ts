import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';
import { GameGenerationService } from './gameGeneration';

interface GameComponent {
  id: string;
  type: 'sprite' | 'background' | 'ui' | 'sound' | 'physics' | 'animation' | 'logic';
  category: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  properties: ComponentProperty[];
  defaultValues: Record<string, any>;
  dependencies: string[];
  template: string;
  preview?: string;
}

interface ComponentProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'image' | 'sound' | 'select' | 'range';
  description: string;
  required: boolean;
  defaultValue: any;
  options?: string[] | { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

interface GameScene {
  id: string;
  name: string;
  type: 'menu' | 'gameplay' | 'pause' | 'gameover' | 'settings';
  width: number;
  height: number;
  backgroundColor: string;
  components: PlacedComponent[];
  layers: SceneLayer[];
  physics?: PhysicsConfig;
  camera?: CameraConfig;
}

interface PlacedComponent {
  id: string;
  componentId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  visible: boolean;
  locked: boolean;
  properties: Record<string, any>;
  animations?: ComponentAnimation[];
  interactions?: ComponentInteraction[];
}

interface SceneLayer {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  components: string[]; // IDs компонентов
}

interface ComponentAnimation {
  id: string;
  name: string;
  type: 'move' | 'rotate' | 'scale' | 'fade' | 'custom';
  duration: number;
  delay?: number;
  loop?: boolean;
  easing?: string;
  keyframes: AnimationKeyframe[];
}

interface AnimationKeyframe {
  time: number; // 0-1
  properties: Record<string, any>;
}

interface ComponentInteraction {
  id: string;
  trigger: 'click' | 'hover' | 'collision' | 'timer' | 'keypress' | 'custom';
  condition?: string;
  actions: InteractionAction[];
}

interface InteractionAction {
  type: 'move' | 'animate' | 'sound' | 'changeScene' | 'showDialog' | 'custom';
  parameters: Record<string, any>;
}

interface PhysicsConfig {
  enabled: boolean;
  gravity: { x: number; y: number };
  bounceFactors: { x: number; y: number };
  friction: number;
}

interface CameraConfig {
  x: number;
  y: number;
  zoom: number;
  follow?: string; // ID компонента для следования
}

interface VisualGameProject {
  id: string;
  name: string;
  description: string;
  gameType: string;
  thumbnail?: string;
  scenes: GameScene[];
  globalSettings: {
    resolution: { width: number; height: number };
    fps: number;
    audio: boolean;
    physics: boolean;
    responsive: boolean;
  };
  assets: ProjectAsset[];
  metadata: {
    created: Date;
    modified: Date;
    version: string;
    author?: string;
    tags: string[];
  };
}

interface ProjectAsset {
  id: string;
  name: string;
  type: 'image' | 'sound' | 'font' | 'data';
  url: string;
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number; // для звуков
}

export class VisualGameEditorService {
  private projectsDir: string;
  private componentsDir: string;
  private templatesDir: string;
  private gameGeneration: GameGenerationService;
  private componentRegistry: Map<string, GameComponent> = new Map();

  constructor() {
    this.projectsDir = path.join(process.cwd(), 'data', 'visual-editor', 'projects');
    this.componentsDir = path.join(process.cwd(), 'data', 'visual-editor', 'components');
    this.templatesDir = path.join(process.cwd(), 'data', 'visual-editor', 'templates');
    this.gameGeneration = new GameGenerationService();
    this.initializeDirectories();
    this.loadComponents();
  }

  private async initializeDirectories(): Promise<void> {
    await fs.mkdir(this.projectsDir, { recursive: true });
    await fs.mkdir(this.componentsDir, { recursive: true });
    await fs.mkdir(this.templatesDir, { recursive: true });
  }

  /**
   * Загружает компоненты из файловой системы
   */
  private async loadComponents(): Promise<void> {
    try {
      // Создаем стандартные компоненты, если их нет
      await this.createDefaultComponents();

      const componentFiles = await fs.readdir(this.componentsDir);
      
      for (const file of componentFiles) {
        if (file.endsWith('.json')) {
          const componentPath = path.join(this.componentsDir, file);
          const content = await fs.readFile(componentPath, 'utf-8');
          const component: GameComponent = JSON.parse(content);
          this.componentRegistry.set(component.id, component);
        }
      }

      logger.info('Components loaded', { count: this.componentRegistry.size });
    } catch (error) {
      logger.error('Failed to load components', { error });
    }
  }

  /**
   * Создает стандартные компоненты
   */
  private async createDefaultComponents(): Promise<void> {
    const defaultComponents: GameComponent[] = [
      {
        id: 'player-sprite',
        type: 'sprite',
        category: 'Characters',
        name: 'player-sprite',
        displayName: 'Игрок',
        description: 'Основной персонаж игры',
        icon: '🕹️',
        properties: [
          {
            name: 'sprite',
            displayName: 'Спрайт',
            type: 'image',
            description: 'Изображение персонажа',
            required: true,
            defaultValue: '/assets/player.png'
          },
          {
            name: 'speed',
            displayName: 'Скорость',
            type: 'range',
            description: 'Скорость движения персонажа',
            required: true,
            defaultValue: 100,
            min: 10,
            max: 500,
            step: 10
          },
          {
            name: 'health',
            displayName: 'Здоровье',
            type: 'number',
            description: 'Количество жизней',
            required: true,
            defaultValue: 100
          }
        ],
        defaultValues: {
          sprite: '/assets/player.png',
          speed: 100,
          health: 100
        },
        dependencies: [],
        template: `
          class Player extends Sprite {
            constructor(x, y) {
              super('{{sprite}}', x, y);
              this.speed = {{speed}};
              this.health = {{health}};
              this.setupControls();
            }
            
            setupControls() {
              // Управление игроком
            }
          }
        `
      },
      {
        id: 'background-image',
        type: 'background',
        category: 'Environment',
        name: 'background-image',
        displayName: 'Фон',
        description: 'Фоновое изображение сцены',
        icon: '🖼️',
        properties: [
          {
            name: 'image',
            displayName: 'Изображение',
            type: 'image',
            description: 'Фоновое изображение',
            required: true,
            defaultValue: '/assets/background.jpg'
          },
          {
            name: 'repeat',
            displayName: 'Повторение',
            type: 'select',
            description: 'Способ повторения фона',
            required: true,
            defaultValue: 'no-repeat',
            options: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y']
          },
          {
            name: 'parallax',
            displayName: 'Параллакс',
            type: 'boolean',
            description: 'Включить эффект параллакса',
            required: false,
            defaultValue: false
          }
        ],
        defaultValues: {
          image: '/assets/background.jpg',
          repeat: 'no-repeat',
          parallax: false
        },
        dependencies: [],
        template: `
          class Background extends GameObject {
            constructor() {
              super();
              this.image = '{{image}}';
              this.repeat = '{{repeat}}';
              this.parallax = {{parallax}};
            }
          }
        `
      },
      {
        id: 'button-ui',
        type: 'ui',
        category: 'Interface',
        name: 'button-ui',
        displayName: 'Кнопка',
        description: 'Интерактивная кнопка интерфейса',
        icon: '🔘',
        properties: [
          {
            name: 'text',
            displayName: 'Текст',
            type: 'string',
            description: 'Текст на кнопке',
            required: true,
            defaultValue: 'Кнопка'
          },
          {
            name: 'color',
            displayName: 'Цвет',
            type: 'color',
            description: 'Цвет кнопки',
            required: true,
            defaultValue: '#007bff'
          },
          {
            name: 'size',
            displayName: 'Размер',
            type: 'select',
            description: 'Размер кнопки',
            required: true,
            defaultValue: 'medium',
            options: ['small', 'medium', 'large']
          }
        ],
        defaultValues: {
          text: 'Кнопка',
          color: '#007bff',
          size: 'medium'
        },
        dependencies: [],
        template: `
          class Button extends UIElement {
            constructor(x, y, text, color, size) {
              super(x, y);
              this.text = '{{text}}';
              this.color = '{{color}}';
              this.size = '{{size}}';
              this.onClick = null;
            }
          }
        `
      }
    ];

    for (const component of defaultComponents) {
      const componentPath = path.join(this.componentsDir, `${component.id}.json`);
      try {
        await fs.access(componentPath);
        // Файл существует, пропускаем
      } catch {
        // Файл не существует, создаем
        await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
      }
    }
  }

  /**
   * Получает все доступные компоненты
   */
  async getComponents(): Promise<GameComponent[]> {
    return Array.from(this.componentRegistry.values());
  }

  /**
   * Получает компоненты по категории
   */
  async getComponentsByCategory(category?: string): Promise<Record<string, GameComponent[]>> {
    const components = Array.from(this.componentRegistry.values());
    
    if (category) {
      return { [category]: components.filter(c => c.category === category) };
    }

    const grouped = components.reduce((acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = [];
      }
      acc[component.category].push(component);
      return acc;
    }, {} as Record<string, GameComponent[]>);

    return grouped;
  }

  /**
   * Создает новый проект
   */
  async createProject(
    name: string, 
    gameType: string, 
    description?: string,
    author?: string
  ): Promise<VisualGameProject> {
    const project: VisualGameProject = {
      id: `project_${Date.now()}`,
      name,
      description: description || '',
      gameType,
      scenes: [this.createDefaultScene()],
      globalSettings: {
        resolution: { width: 800, height: 600 },
        fps: 60,
        audio: true,
        physics: false,
        responsive: true
      },
      assets: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
        author,
        tags: []
      }
    };

    await this.saveProject(project);
    return project;
  }

  /**
   * Создает сцену по умолчанию
   */
  private createDefaultScene(): GameScene {
    return {
      id: `scene_${Date.now()}`,
      name: 'Main Scene',
      type: 'gameplay',
      width: 800,
      height: 600,
      backgroundColor: '#87CEEB',
      components: [],
      layers: [
        {
          id: 'background',
          name: 'Background',
          zIndex: 0,
          visible: true,
          locked: false,
          components: []
        },
        {
          id: 'gameplay',
          name: 'Gameplay',
          zIndex: 100,
          visible: true,
          locked: false,
          components: []
        },
        {
          id: 'ui',
          name: 'UI',
          zIndex: 200,
          visible: true,
          locked: false,
          components: []
        }
      ]
    };
  }

  /**
   * Сохраняет проект
   */
  async saveProject(project: VisualGameProject): Promise<void> {
    project.metadata.modified = new Date();
    const projectPath = path.join(this.projectsDir, `${project.id}.json`);
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    logger.info('Project saved', { projectId: project.id });
  }

  /**
   * Загружает проект
   */
  async loadProject(projectId: string): Promise<VisualGameProject | null> {
    try {
      const projectPath = path.join(this.projectsDir, `${projectId}.json`);
      const content = await fs.readFile(projectPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to load project', { projectId, error });
      return null;
    }
  }

  /**
   * Получает список всех проектов
   */
  async getProjects(): Promise<VisualGameProject[]> {
    try {
      const files = await fs.readdir(this.projectsDir);
      const projects: VisualGameProject[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const projectId = file.replace('.json', '');
          const project = await this.loadProject(projectId);
          if (project) {
            projects.push(project);
          }
        }
      }

      return projects.sort((a, b) => 
        new Date(b.metadata.modified).getTime() - new Date(a.metadata.modified).getTime()
      );
    } catch (error) {
      logger.error('Failed to get projects', { error });
      return [];
    }
  }

  /**
   * Добавляет компонент в сцену
   */
  async addComponentToScene(
    projectId: string,
    sceneId: string,
    componentId: string,
    x: number,
    y: number,
    properties?: Record<string, any>
  ): Promise<PlacedComponent> {
    const project = await this.loadProject(projectId);
    if (!project) throw new Error('Project not found');

    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new Error('Scene not found');

    const component = this.componentRegistry.get(componentId);
    if (!component) throw new Error('Component not found');

    const placedComponent: PlacedComponent = {
      id: `placed_${Date.now()}`,
      componentId,
      x,
      y,
      visible: true,
      locked: false,
      properties: { ...component.defaultValues, ...properties }
    };

    scene.components.push(placedComponent);
    
    // Добавляем в соответствующий слой
    const targetLayer = scene.layers.find(l => 
      (component.type === 'background' && l.name === 'Background') ||
      (component.type === 'ui' && l.name === 'UI') ||
      l.name === 'Gameplay'
    );
    
    if (targetLayer) {
      targetLayer.components.push(placedComponent.id);
    }

    await this.saveProject(project);
    return placedComponent;
  }

  /**
   * Обновляет свойства компонента
   */
  async updateComponentProperties(
    projectId: string,
    sceneId: string,
    componentId: string,
    properties: Record<string, any>
  ): Promise<void> {
    const project = await this.loadProject(projectId);
    if (!project) throw new Error('Project not found');

    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new Error('Scene not found');

    const component = scene.components.find(c => c.id === componentId);
    if (!component) throw new Error('Component not found');

    component.properties = { ...component.properties, ...properties };
    await this.saveProject(project);
  }

  /**
   * Удаляет компонент из сцены
   */
  async removeComponentFromScene(
    projectId: string,
    sceneId: string,
    componentId: string
  ): Promise<void> {
    const project = await this.loadProject(projectId);
    if (!project) throw new Error('Project not found');

    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new Error('Scene not found');

    // Удаляем из компонентов сцены
    scene.components = scene.components.filter(c => c.id !== componentId);

    // Удаляем из всех слоев
    scene.layers.forEach(layer => {
      layer.components = layer.components.filter(id => id !== componentId);
    });

    await this.saveProject(project);
  }

  /**
   * Генерирует код игры из проекта
   */
  async generateGameFromProject(projectId: string): Promise<any> {
    const project = await this.loadProject(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Преобразуем визуальный проект в конфигурацию для генерации
      const gameConfig = this.convertProjectToGameConfig(project);
      
      // Используем существующую систему генерации игр
      const result = await this.gameGeneration.generateGame(gameConfig);
      
      logger.info('Game generated from visual project', { projectId });
      return result;
    } catch (error) {
      logger.error('Failed to generate game from project', { projectId, error });
      throw error;
    }
  }

  /**
   * Преобразует визуальный проект в конфигурацию для генерации
   */
  private convertProjectToGameConfig(project: VisualGameProject): any {
    const mainScene = project.scenes.find(s => s.type === 'gameplay') || project.scenes[0];
    
    const gameConfig = {
      gameType: project.gameType,
      name: project.name,
      description: project.description,
      settings: project.globalSettings,
      scenes: project.scenes.map(scene => ({
        name: scene.name,
        type: scene.type,
        background: scene.backgroundColor,
        entities: scene.components.map(comp => {
          const componentDef = this.componentRegistry.get(comp.componentId);
          return {
            type: componentDef?.type || 'sprite',
            position: { x: comp.x, y: comp.y },
            properties: comp.properties,
            template: componentDef?.template
          };
        })
      })),
      assets: project.assets
    };

    return gameConfig;
  }

  /**
   * Создает превью проекта
   */
  async generateProjectPreview(projectId: string): Promise<string> {
    const project = await this.loadProject(projectId);
    if (!project) throw new Error('Project not found');

    // Генерируем упрощенную HTML-превью
    const mainScene = project.scenes.find(s => s.type === 'gameplay') || project.scenes[0];
    
    const previewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${project.name} - Preview</title>
        <style>
          body { margin: 0; padding: 20px; background: #f0f0f0; }
          .scene { 
            width: ${mainScene.width}px; 
            height: ${mainScene.height}px; 
            background: ${mainScene.backgroundColor}; 
            position: relative; 
            border: 2px solid #ccc;
            margin: 0 auto;
          }
          .component { position: absolute; }
        </style>
      </head>
      <body>
        <h2>${project.name}</h2>
        <div class="scene">
          ${mainScene.components.map(comp => {
            const componentDef = this.componentRegistry.get(comp.componentId);
            return `<div class="component" style="left: ${comp.x}px; top: ${comp.y}px;">
              ${componentDef?.displayName || 'Component'}
            </div>`;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    return previewHtml;
  }

  /**
   * Удаляет проект
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const projectPath = path.join(this.projectsDir, `${projectId}.json`);
      await fs.unlink(projectPath);
      logger.info('Project deleted', { projectId });
    } catch (error) {
      logger.error('Failed to delete project', { projectId, error });
      throw error;
    }
  }

  /**
   * Дублирует проект
   */
  async duplicateProject(projectId: string, newName?: string): Promise<VisualGameProject> {
    const originalProject = await this.loadProject(projectId);
    if (!originalProject) throw new Error('Project not found');

    const duplicatedProject: VisualGameProject = {
      ...originalProject,
      id: `project_${Date.now()}`,
      name: newName || `${originalProject.name} (Copy)`,
      metadata: {
        ...originalProject.metadata,
        created: new Date(),
        modified: new Date()
      }
    };

    await this.saveProject(duplicatedProject);
    return duplicatedProject;
  }
} 