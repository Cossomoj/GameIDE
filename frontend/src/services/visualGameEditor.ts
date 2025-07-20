import { api } from './api';

export interface GameComponent {
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

export interface ComponentProperty {
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

export interface GameScene {
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

export interface PlacedComponent {
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

export interface SceneLayer {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  components: string[];
}

export interface ComponentAnimation {
  id: string;
  name: string;
  type: 'move' | 'rotate' | 'scale' | 'fade' | 'custom';
  duration: number;
  delay?: number;
  loop?: boolean;
  easing?: string;
  keyframes: AnimationKeyframe[];
}

export interface AnimationKeyframe {
  time: number;
  properties: Record<string, any>;
}

export interface ComponentInteraction {
  id: string;
  trigger: 'click' | 'hover' | 'collision' | 'timer' | 'keypress' | 'custom';
  condition?: string;
  actions: InteractionAction[];
}

export interface InteractionAction {
  type: 'move' | 'animate' | 'sound' | 'changeScene' | 'showDialog' | 'custom';
  parameters: Record<string, any>;
}

export interface PhysicsConfig {
  enabled: boolean;
  gravity: { x: number; y: number };
  bounceFactors: { x: number; y: number };
  friction: number;
}

export interface CameraConfig {
  x: number;
  y: number;
  zoom: number;
  follow?: string;
}

export interface VisualGameProject {
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

export interface ProjectAsset {
  id: string;
  name: string;
  type: 'image' | 'sound' | 'font' | 'data';
  url: string;
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  gameType: string;
  thumbnail: string;
  components: string[];
  features: string[];
}

class VisualGameEditorService {
  /**
   * Получает все доступные компоненты
   */
  async getComponents(category?: string): Promise<GameComponent[]> {
    const response = await api.get('/visual-editor/components', {
      params: category ? { category } : {}
    });
    return response.data.components;
  }

  /**
   * Получает компоненты, сгруппированные по категориям
   */
  async getComponentsByCategory(): Promise<Record<string, GameComponent[]>> {
    const response = await api.get('/visual-editor/components/by-category');
    return response.data.componentsByCategory;
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
    const response = await api.post('/visual-editor/projects', {
      name,
      gameType,
      description,
      author
    });
    return response.data.project;
  }

  /**
   * Получает список всех проектов
   */
  async getProjects(): Promise<VisualGameProject[]> {
    const response = await api.get('/visual-editor/projects');
    return response.data.projects;
  }

  /**
   * Загружает проект по ID
   */
  async loadProject(projectId: string): Promise<VisualGameProject> {
    const response = await api.get(`/visual-editor/projects/${projectId}`);
    return response.data.project;
  }

  /**
   * Сохраняет проект
   */
  async saveProject(project: VisualGameProject): Promise<void> {
    await api.put(`/visual-editor/projects/${project.id}`, project);
  }

  /**
   * Удаляет проект
   */
  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/visual-editor/projects/${projectId}`);
  }

  /**
   * Дублирует проект
   */
  async duplicateProject(projectId: string, newName?: string): Promise<VisualGameProject> {
    const response = await api.post(`/visual-editor/projects/${projectId}/duplicate`, {
      newName
    });
    return response.data.project;
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
    const response = await api.post(
      `/visual-editor/projects/${projectId}/scenes/${sceneId}/components`,
      {
        componentId,
        x,
        y,
        properties
      }
    );
    return response.data.component;
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
    await api.put(
      `/visual-editor/projects/${projectId}/scenes/${sceneId}/components/${componentId}`,
      { properties }
    );
  }

  /**
   * Удаляет компонент из сцены
   */
  async removeComponentFromScene(
    projectId: string,
    sceneId: string,
    componentId: string
  ): Promise<void> {
    await api.delete(
      `/visual-editor/projects/${projectId}/scenes/${sceneId}/components/${componentId}`
    );
  }

  /**
   * Генерирует игру из проекта
   */
  async generateGameFromProject(projectId: string): Promise<any> {
    const response = await api.post(`/visual-editor/projects/${projectId}/generate`);
    return response.data.game;
  }

  /**
   * Получает превью проекта
   */
  async getProjectPreview(projectId: string): Promise<string> {
    const response = await api.get(`/visual-editor/projects/${projectId}/preview`, {
      responseType: 'text'
    });
    return response.data;
  }

  /**
   * Получает доступные шаблоны
   */
  async getTemplates(): Promise<ProjectTemplate[]> {
    const response = await api.get('/visual-editor/templates');
    return response.data.templates;
  }

  /**
   * Создает проект из шаблона
   */
  async createProjectFromTemplate(
    templateId: string,
    name: string,
    author?: string
  ): Promise<VisualGameProject> {
    const response = await api.post('/visual-editor/projects/from-template', {
      templateId,
      name,
      author
    });
    return response.data.project;
  }

  /**
   * Экспортирует проект
   */
  async exportProject(
    projectId: string,
    format: 'html5' | 'json' = 'html5',
    options?: Record<string, any>
  ): Promise<any> {
    const response = await api.post('/visual-editor/export', {
      projectId,
      format,
      options
    });
    return response.data.export;
  }

  /**
   * Проверяет здоровье редактора
   */
  async getHealth(): Promise<any> {
    const response = await api.get('/visual-editor/health');
    return response.data.health;
  }

  /**
   * Валидирует проект
   */
  validateProject(project: VisualGameProject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.name.trim()) {
      errors.push('Название проекта не может быть пустым');
    }

    if (!project.gameType) {
      errors.push('Тип игры должен быть указан');
    }

    if (project.scenes.length === 0) {
      errors.push('Проект должен содержать как минимум одну сцену');
    }

    project.scenes.forEach((scene, index) => {
      if (!scene.name.trim()) {
        errors.push(`Сцена ${index + 1} должна иметь название`);
      }

      if (scene.width <= 0 || scene.height <= 0) {
        errors.push(`Сцена "${scene.name}" должна иметь положительные размеры`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Форматирует размер файла
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Форматирует дату
   */
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('ru-RU');
  }

  /**
   * Генерирует уникальный ID
   */
  generateId(prefix = 'item'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Клонирует объект
   */
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Проверяет, можно ли разместить компонент в указанной позиции
   */
  canPlaceComponent(
    scene: GameScene,
    x: number,
    y: number,
    width = 50,
    height = 50,
    excludeId?: string
  ): boolean {
    const newBounds = {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height
    };

    return !scene.components
      .filter(comp => comp.id !== excludeId && comp.visible)
      .some(comp => {
        const compWidth = comp.width || 50;
        const compHeight = comp.height || 50;
        const compBounds = {
          left: comp.x,
          top: comp.y,
          right: comp.x + compWidth,
          bottom: comp.y + compHeight
        };

        return !(
          newBounds.right <= compBounds.left ||
          newBounds.left >= compBounds.right ||
          newBounds.bottom <= compBounds.top ||
          newBounds.top >= compBounds.bottom
        );
      });
  }

  /**
   * Находит ближайшую свободную позицию
   */
  findNearestFreePosition(
    scene: GameScene,
    preferredX: number,
    preferredY: number,
    width = 50,
    height = 50
  ): { x: number; y: number } {
    const gridSize = 10;
    const maxAttempts = 100;
    let attempts = 0;
    let radius = 0;

    while (attempts < maxAttempts) {
      for (let angle = 0; angle < 360; angle += 45) {
        const x = Math.round((preferredX + radius * Math.cos(angle * Math.PI / 180)) / gridSize) * gridSize;
        const y = Math.round((preferredY + radius * Math.sin(angle * Math.PI / 180)) / gridSize) * gridSize;

        if (x >= 0 && y >= 0 && x + width <= scene.width && y + height <= scene.height) {
          if (this.canPlaceComponent(scene, x, y, width, height)) {
            return { x, y };
          }
        }
      }
      
      radius += gridSize;
      attempts++;
    }

    // Если не удалось найти свободное место, возвращаем исходную позицию
    return { x: preferredX, y: preferredY };
  }
}

export const visualGameEditorService = new VisualGameEditorService();
export default visualGameEditorService; 