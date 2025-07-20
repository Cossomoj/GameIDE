import express from 'express';
import { VisualGameEditorService } from '../services/visualGameEditor';
import { logger } from '../services/logger';

const router = express.Router();
const visualGameEditorService = new VisualGameEditorService();

/**
 * GET /api/visual-editor/components
 * Получает все доступные компоненты
 */
router.get('/components', async (req, res) => {
  try {
    const category = req.query.category as string;
    
    if (category) {
      const components = await visualGameEditorService.getComponentsByCategory(category);
      res.json({
        success: true,
        components
      });
    } else {
      const components = await visualGameEditorService.getComponents();
      res.json({
        success: true,
        components
      });
    }
  } catch (error) {
    logger.error('Failed to get components', { error });
    res.status(500).json({
      error: 'Failed to get components',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/components/by-category
 * Получает компоненты, сгруппированные по категориям
 */
router.get('/components/by-category', async (req, res) => {
  try {
    const components = await visualGameEditorService.getComponentsByCategory();
    
    res.json({
      success: true,
      componentsByCategory: components,
      totalCategories: Object.keys(components).length,
      totalComponents: Object.values(components).reduce((sum, categoryComponents) => sum + categoryComponents.length, 0)
    });
  } catch (error) {
    logger.error('Failed to get components by category', { error });
    res.status(500).json({
      error: 'Failed to get components by category',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/projects
 * Создает новый проект
 */
router.post('/projects', async (req, res) => {
  try {
    const { name, gameType, description, author } = req.body;

    if (!name || !gameType) {
      return res.status(400).json({
        error: 'Name and game type are required'
      });
    }

    const project = await visualGameEditorService.createProject(name, gameType, description, author);

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logger.error('Failed to create project', { error });
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/projects
 * Получает список всех проектов
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await visualGameEditorService.getProjects();

    res.json({
      success: true,
      projects,
      total: projects.length
    });
  } catch (error) {
    logger.error('Failed to get projects', { error });
    res.status(500).json({
      error: 'Failed to get projects',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/projects/:projectId
 * Загружает проект по ID
 */
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await visualGameEditorService.loadProject(projectId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logger.error('Failed to load project', { error });
    res.status(500).json({
      error: 'Failed to load project',
      details: error.message
    });
  }
});

/**
 * PUT /api/visual-editor/projects/:projectId
 * Сохраняет проект
 */
router.put('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = req.body;

    if (project.id !== projectId) {
      return res.status(400).json({
        error: 'Project ID mismatch'
      });
    }

    await visualGameEditorService.saveProject(project);

    res.json({
      success: true,
      message: 'Project saved successfully'
    });
  } catch (error) {
    logger.error('Failed to save project', { error });
    res.status(500).json({
      error: 'Failed to save project',
      details: error.message
    });
  }
});

/**
 * DELETE /api/visual-editor/projects/:projectId
 * Удаляет проект
 */
router.delete('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    await visualGameEditorService.deleteProject(projectId);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete project', { error });
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/projects/:projectId/duplicate
 * Дублирует проект
 */
router.post('/projects/:projectId/duplicate', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { newName } = req.body;

    const duplicatedProject = await visualGameEditorService.duplicateProject(projectId, newName);

    res.json({
      success: true,
      project: duplicatedProject
    });
  } catch (error) {
    logger.error('Failed to duplicate project', { error });
    res.status(500).json({
      error: 'Failed to duplicate project',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/projects/:projectId/scenes/:sceneId/components
 * Добавляет компонент в сцену
 */
router.post('/projects/:projectId/scenes/:sceneId/components', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { componentId, x, y, properties } = req.body;

    if (!componentId || x === undefined || y === undefined) {
      return res.status(400).json({
        error: 'Component ID, x, and y coordinates are required'
      });
    }

    const placedComponent = await visualGameEditorService.addComponentToScene(
      projectId,
      sceneId,
      componentId,
      x,
      y,
      properties
    );

    res.json({
      success: true,
      component: placedComponent
    });
  } catch (error) {
    logger.error('Failed to add component to scene', { error });
    res.status(500).json({
      error: 'Failed to add component to scene',
      details: error.message
    });
  }
});

/**
 * PUT /api/visual-editor/projects/:projectId/scenes/:sceneId/components/:componentId
 * Обновляет свойства компонента
 */
router.put('/projects/:projectId/scenes/:sceneId/components/:componentId', async (req, res) => {
  try {
    const { projectId, sceneId, componentId } = req.params;
    const { properties } = req.body;

    if (!properties) {
      return res.status(400).json({
        error: 'Properties are required'
      });
    }

    await visualGameEditorService.updateComponentProperties(
      projectId,
      sceneId,
      componentId,
      properties
    );

    res.json({
      success: true,
      message: 'Component properties updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update component properties', { error });
    res.status(500).json({
      error: 'Failed to update component properties',
      details: error.message
    });
  }
});

/**
 * DELETE /api/visual-editor/projects/:projectId/scenes/:sceneId/components/:componentId
 * Удаляет компонент из сцены
 */
router.delete('/projects/:projectId/scenes/:sceneId/components/:componentId', async (req, res) => {
  try {
    const { projectId, sceneId, componentId } = req.params;

    await visualGameEditorService.removeComponentFromScene(projectId, sceneId, componentId);

    res.json({
      success: true,
      message: 'Component removed from scene successfully'
    });
  } catch (error) {
    logger.error('Failed to remove component from scene', { error });
    res.status(500).json({
      error: 'Failed to remove component from scene',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/projects/:projectId/generate
 * Генерирует игру из визуального проекта
 */
router.post('/projects/:projectId/generate', async (req, res) => {
  try {
    const { projectId } = req.params;
    const gameResult = await visualGameEditorService.generateGameFromProject(projectId);

    res.json({
      success: true,
      game: gameResult,
      message: 'Game generated successfully from visual project'
    });
  } catch (error) {
    logger.error('Failed to generate game from project', { error });
    res.status(500).json({
      error: 'Failed to generate game from project',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/projects/:projectId/preview
 * Генерирует превью проекта
 */
router.get('/projects/:projectId/preview', async (req, res) => {
  try {
    const { projectId } = req.params;
    const previewHtml = await visualGameEditorService.generateProjectPreview(projectId);

    res.setHeader('Content-Type', 'text/html');
    res.send(previewHtml);
  } catch (error) {
    logger.error('Failed to generate project preview', { error });
    res.status(500).json({
      error: 'Failed to generate project preview',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/templates
 * Получает доступные шаблоны проектов
 */
router.get('/templates', async (req, res) => {
  try {
    // Базовые шаблоны проектов
    const templates = [
      {
        id: 'platformer-template',
        name: 'Платформер',
        description: 'Классическая платформенная игра с прыжками и препятствиями',
        gameType: 'platformer',
        thumbnail: '/templates/platformer-preview.png',
        components: ['player-sprite', 'platform', 'collectible', 'enemy'],
        features: ['gravity', 'collision', 'animations', 'sound']
      },
      {
        id: 'puzzle-template',
        name: 'Головоломка',
        description: 'Логическая игра с перемещением объектов',
        gameType: 'puzzle',
        thumbnail: '/templates/puzzle-preview.png',
        components: ['puzzle-piece', 'target-zone', 'obstacle', 'button-ui'],
        features: ['drag-drop', 'logic', 'ui', 'levels']
      },
      {
        id: 'arcade-template',
        name: 'Аркада',
        description: 'Быстрая аркадная игра с набором очков',
        gameType: 'arcade',
        thumbnail: '/templates/arcade-preview.png',
        components: ['player-sprite', 'enemy', 'power-up', 'score-ui'],
        features: ['movement', 'spawning', 'score', 'effects']
      },
      {
        id: 'runner-template',
        name: 'Ранер',
        description: 'Бесконечный бег с препятствиями',
        gameType: 'runner',
        thumbnail: '/templates/runner-preview.png',
        components: ['runner-player', 'obstacle', 'background-scrolling', 'ui-hud'],
        features: ['scrolling', 'procedural', 'physics', 'progression']
      }
    ];

    res.json({
      success: true,
      templates,
      total: templates.length
    });
  } catch (error) {
    logger.error('Failed to get templates', { error });
    res.status(500).json({
      error: 'Failed to get templates',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/projects/from-template
 * Создает проект из шаблона
 */
router.post('/projects/from-template', async (req, res) => {
  try {
    const { templateId, name, author } = req.body;

    if (!templateId || !name) {
      return res.status(400).json({
        error: 'Template ID and project name are required'
      });
    }

    // Получаем шаблон (здесь можно расширить функциональность)
    const templateMap = {
      'platformer-template': 'platformer',
      'puzzle-template': 'puzzle',
      'arcade-template': 'arcade',
      'runner-template': 'runner'
    };

    const gameType = templateMap[templateId];
    if (!gameType) {
      return res.status(400).json({
        error: 'Invalid template ID'
      });
    }

    const project = await visualGameEditorService.createProject(
      name,
      gameType,
      `Проект создан из шаблона ${templateId}`,
      author
    );

    res.json({
      success: true,
      project,
      message: 'Project created from template successfully'
    });
  } catch (error) {
    logger.error('Failed to create project from template', { error });
    res.status(500).json({
      error: 'Failed to create project from template',
      details: error.message
    });
  }
});

/**
 * POST /api/visual-editor/export
 * Экспортирует проект в различные форматы
 */
router.post('/export', async (req, res) => {
  try {
    const { projectId, format = 'html5', options = {} } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required'
      });
    }

    const project = await visualGameEditorService.loadProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    let exportResult;

    switch (format) {
      case 'html5':
        // Генерируем HTML5 версию игры
        exportResult = await visualGameEditorService.generateGameFromProject(projectId);
        break;
      
      case 'json':
        // Экспортируем в JSON формате
        exportResult = {
          project,
          exportedAt: new Date(),
          format: 'json'
        };
        break;
      
      default:
        return res.status(400).json({
          error: 'Unsupported export format'
        });
    }

    res.json({
      success: true,
      export: exportResult,
      format,
      projectName: project.name,
      exportedAt: new Date()
    });
  } catch (error) {
    logger.error('Failed to export project', { error });
    res.status(500).json({
      error: 'Failed to export project',
      details: error.message
    });
  }
});

/**
 * GET /api/visual-editor/health
 * Проверяет здоровье визуального редактора
 */
router.get('/health', async (req, res) => {
  try {
    const projects = await visualGameEditorService.getProjects();
    const components = await visualGameEditorService.getComponents();
    
    const health = {
      status: 'healthy',
      projects: {
        total: projects.length,
        recent: projects.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          modified: p.metadata.modified
        }))
      },
      components: {
        total: components.length,
        byType: components.reduce((acc, comp) => {
          acc[comp.type] = (acc[comp.type] || 0) + 1;
          return acc;
        }, {})
      },
      lastCheck: new Date()
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error('Failed to check visual editor health', { error });
    res.status(500).json({
      error: 'Failed to check visual editor health',
      details: error.message
    });
  }
});

export default router; 