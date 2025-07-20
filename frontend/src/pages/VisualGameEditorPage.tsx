import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import VisualGameEditor from '../components/VisualGameEditor';
import visualGameEditorService, {
  VisualGameProject,
  ProjectTemplate
} from '../services/visualGameEditor';

const VisualGameEditorPage: React.FC = () => {
  const [view, setView] = useState<'projects' | 'editor' | 'create'>('projects');
  const [projects, setProjects] = useState<VisualGameProject[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Форма создания проекта
  const [newProject, setNewProject] = useState({
    name: '',
    gameType: 'platformer',
    description: '',
    author: '',
    template: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsData, templatesData] = await Promise.all([
        visualGameEditorService.getProjects(),
        visualGameEditorService.getTemplates()
      ]);
      setProjects(projectsData);
      setTemplates(templatesData);
    } catch (err) {
      setError(`Ошибка загрузки: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    try {
      setIsLoading(true);

      let project: VisualGameProject;

      if (newProject.template) {
        project = await visualGameEditorService.createProjectFromTemplate(
          newProject.template,
          newProject.name,
          newProject.author
        );
      } else {
        project = await visualGameEditorService.createProject(
          newProject.name,
          newProject.gameType,
          newProject.description,
          newProject.author
        );
      }

      setProjects(prev => [project, ...prev]);
      setSelectedProject(project.id);
      setView('editor');
      
      // Сброс формы
      setNewProject({
        name: '',
        gameType: 'platformer',
        description: '',
        author: '',
        template: ''
      });
    } catch (err) {
      setError(`Ошибка создания проекта: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openProject = (projectId: string) => {
    setSelectedProject(projectId);
    setView('editor');
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return;

    try {
      await visualGameEditorService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (selectedProject === projectId) {
        setSelectedProject(null);
        setView('projects');
      }
    } catch (err) {
      setError(`Ошибка удаления проекта: ${err.message}`);
    }
  };

  const duplicateProject = async (projectId: string) => {
    try {
      const originalProject = projects.find(p => p.id === projectId);
      const newName = prompt('Название нового проекта:', originalProject ? `${originalProject.name} (Copy)` : 'Copy');
      
      if (!newName) return;

      const duplicatedProject = await visualGameEditorService.duplicateProject(projectId, newName);
      setProjects(prev => [duplicatedProject, ...prev]);
    } catch (err) {
      setError(`Ошибка дублирования проекта: ${err.message}`);
    }
  };

  const handleProjectSave = (project: VisualGameProject) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const handleGameGenerate = (gameResult: any) => {
    // Здесь можно добавить логику для отображения результата генерации
    console.log('Game generated:', gameResult);
    alert('Игра успешно сгенерирована!');
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  if (isLoading && projects.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Режим редактора
  if (view === 'editor' && selectedProject) {
    return (
      <div className="h-screen">
        <VisualGameEditor
          projectId={selectedProject}
          onSave={handleProjectSave}
          onGenerate={handleGameGenerate}
        />
        {/* Кнопка возврата */}
        <button
          onClick={() => setView('projects')}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 shadow-lg"
        >
          ← Назад к проектам
        </button>
      </div>
    );
  }

  // Основная страница
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <span className="block sm:inline">{error}</span>
            <button 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Визуальный редактор игр
          </h1>
          <p className="text-gray-600">
            Создавайте игры с помощью drag-and-drop интерфейса
          </p>
        </div>

        {/* Заголовок с кнопками */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setView('projects')}
              className={`px-4 py-2 rounded font-medium ${
                view === 'projects'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Мои проекты ({projects.length})
            </button>
          </div>
          
          <button
            onClick={() => setView('create')}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            + Создать проект
          </button>
        </div>

        {/* Создание проекта */}
        {view === 'create' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Создание нового проекта</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название проекта *
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Моя игра"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип игры
                  </label>
                  <select
                    value={newProject.gameType}
                    onChange={(e) => setNewProject(prev => ({ ...prev, gameType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="platformer">Платформер</option>
                    <option value="puzzle">Головоломка</option>
                    <option value="arcade">Аркада</option>
                    <option value="runner">Раннер</option>
                    <option value="rpg">RPG</option>
                    <option value="strategy">Стратегия</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Автор
                  </label>
                  <input
                    type="text"
                    value={newProject.author}
                    onChange={(e) => setNewProject(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Краткое описание игры"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Шаблон (необязательно)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="template"
                      value=""
                      checked={newProject.template === ''}
                      onChange={(e) => setNewProject(prev => ({ ...prev, template: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Пустой проект</span>
                  </label>
                  
                  {templates.map(template => (
                    <label key={template.id} className="flex items-start">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={newProject.template === template.id}
                        onChange={(e) => setNewProject(prev => ({ ...prev, template: e.target.value }))}
                        className="mr-2 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-600">{template.description}</div>
                        <div className="text-xs text-blue-600">
                          Компоненты: {template.components.slice(0, 3).join(', ')}
                          {template.components.length > 3 && ` +${template.components.length - 3}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setView('projects')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.name.trim() || isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Создание...' : 'Создать проект'}
              </button>
            </div>
          </div>
        )}

        {/* Список проектов */}
        {view === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div key={project.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {project.description || 'Без описания'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Тип: {project.gameType}</span>
                        <span>Сцен: {project.scenes.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    <div>Создан: {formatDate(project.metadata.created)}</div>
                    <div>Изменен: {formatDate(project.metadata.modified)}</div>
                    {project.metadata.author && (
                      <div>Автор: {project.metadata.author}</div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openProject(project.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Открыть
                    </button>
                    <button
                      onClick={() => duplicateProject(project.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                      title="Дублировать"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {projects.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎮</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет созданных проектов
                </h3>
                <p className="text-gray-600 mb-4">
                  Создайте свой первый игровой проект с помощью визуального редактора
                </p>
                <button
                  onClick={() => setView('create')}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Создать первый проект
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VisualGameEditorPage; 