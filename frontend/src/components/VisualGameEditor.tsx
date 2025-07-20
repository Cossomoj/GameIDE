import React, { useState, useEffect, useRef, useCallback } from 'react';
import visualGameEditorService, {
  VisualGameProject,
  GameComponent,
  PlacedComponent,
  GameScene
} from '../services/visualGameEditor';

interface VisualGameEditorProps {
  projectId?: string;
  onSave?: (project: VisualGameProject) => void;
  onGenerate?: (gameResult: any) => void;
}

const VisualGameEditor: React.FC<VisualGameEditorProps> = ({
  projectId,
  onSave,
  onGenerate
}) => {
  const [project, setProject] = useState<VisualGameProject | null>(null);
  const [components, setComponents] = useState<Record<string, GameComponent[]>>({});
  const [selectedComponent, setSelectedComponent] = useState<PlacedComponent | null>(null);
  const [selectedComponentDef, setSelectedComponentDef] = useState<GameComponent | null>(null);
  const [activeScene, setActiveScene] = useState<GameScene | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<GameComponent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [projectId]);

  // Автосохранение
  useEffect(() => {
    if (project && unsavedChanges) {
      const timer = setTimeout(() => {
        saveProject();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [project, unsavedChanges]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [componentsData, projectData] = await Promise.all([
        visualGameEditorService.getComponentsByCategory(),
        projectId ? visualGameEditorService.loadProject(projectId) : null
      ]);

      setComponents(componentsData);
      
      if (projectData) {
        setProject(projectData);
        setActiveScene(projectData.scenes[0] || null);
      }
    } catch (err) {
      setError(`Ошибка загрузки: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    if (!project) return;

    try {
      await visualGameEditorService.saveProject(project);
      setUnsavedChanges(false);
      onSave?.(project);
    } catch (err) {
      setError(`Ошибка сохранения: ${err.message}`);
    }
  };

  const generateGame = async () => {
    if (!project) return;

    try {
      const gameResult = await visualGameEditorService.generateGameFromProject(project.id);
      onGenerate?.(gameResult);
    } catch (err) {
      setError(`Ошибка генерации: ${err.message}`);
    }
  };

  // Drag and Drop обработчики
  const handleComponentDragStart = useCallback((component: GameComponent, event: React.DragEvent) => {
    setDraggedComponent(component);
    setIsDragging(true);
    isDraggingRef.current = true;
    
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', component.id);
  }, []);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    if (!activeScene) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - canvasOffset.x) / zoom;
    const y = (event.clientY - rect.top - canvasOffset.y) / zoom;

    // Поиск компонента под курсором
    const clickedComponent = activeScene.components.find(comp => {
      const width = comp.width || 50;
      const height = comp.height || 50;
      return x >= comp.x && x <= comp.x + width && 
             y >= comp.y && y <= comp.y + height;
    });

    if (clickedComponent) {
      setSelectedComponent(clickedComponent);
      const componentDef = Object.values(components)
        .flat()
        .find(comp => comp.id === clickedComponent.componentId);
      setSelectedComponentDef(componentDef || null);
    } else {
      setSelectedComponent(null);
      setSelectedComponentDef(null);
    }
  }, [activeScene, components, canvasOffset, zoom]);

  const handleCanvasDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    isDraggingRef.current = false;

    if (!draggedComponent || !activeScene || !project) {
      setDraggedComponent(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, (event.clientX - rect.left - canvasOffset.x) / zoom);
    const y = Math.max(0, (event.clientY - rect.top - canvasOffset.y) / zoom);

    try {
      const placedComponent = await visualGameEditorService.addComponentToScene(
        project.id,
        activeScene.id,
        draggedComponent.id,
        x,
        y
      );

      // Обновляем локальное состояние
      setProject(prev => {
        if (!prev) return prev;
        
        const updatedProject = { ...prev };
        const sceneIndex = updatedProject.scenes.findIndex(s => s.id === activeScene.id);
        if (sceneIndex !== -1) {
          updatedProject.scenes[sceneIndex] = {
            ...updatedProject.scenes[sceneIndex],
            components: [...updatedProject.scenes[sceneIndex].components, placedComponent]
          };
        }
        return updatedProject;
      });

      setActiveScene(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          components: [...prev.components, placedComponent]
        };
      });

      setUnsavedChanges(true);
    } catch (err) {
      setError(`Ошибка добавления компонента: ${err.message}`);
    }

    setDraggedComponent(null);
  }, [draggedComponent, activeScene, project, canvasOffset, zoom]);

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const updateComponentProperties = async (componentId: string, properties: Record<string, any>) => {
    if (!project || !activeScene) return;

    try {
      await visualGameEditorService.updateComponentProperties(
        project.id,
        activeScene.id,
        componentId,
        properties
      );

      // Обновляем локальное состояние
      setActiveScene(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          components: prev.components.map(comp =>
            comp.id === componentId
              ? { ...comp, properties: { ...comp.properties, ...properties } }
              : comp
          )
        };
      });

      if (selectedComponent?.id === componentId) {
        setSelectedComponent(prev => 
          prev ? { ...prev, properties: { ...prev.properties, ...properties } } : prev
        );
      }

      setUnsavedChanges(true);
    } catch (err) {
      setError(`Ошибка обновления свойств: ${err.message}`);
    }
  };

  const deleteComponent = async (componentId: string) => {
    if (!project || !activeScene) return;

    try {
      await visualGameEditorService.removeComponentFromScene(
        project.id,
        activeScene.id,
        componentId
      );

      // Обновляем локальное состояние
      setActiveScene(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          components: prev.components.filter(comp => comp.id !== componentId)
        };
      });

      if (selectedComponent?.id === componentId) {
        setSelectedComponent(null);
        setSelectedComponentDef(null);
      }

      setUnsavedChanges(true);
    } catch (err) {
      setError(`Ошибка удаления компонента: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Проект не найден</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
          {unsavedChanges && (
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              Несохранённые изменения
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={saveProject}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Сохранить
          </button>
          <button
            onClick={generateGame}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Генерировать игру
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Components Panel */}
        <div className="w-64 bg-white shadow-sm border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Компоненты</h3>
            
            {Object.entries(components).map(([category, categoryComponents]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                  {category}
                </h4>
                
                <div className="space-y-2">
                  {categoryComponents.map(component => (
                    <div
                      key={component.id}
                      draggable
                      onDragStart={(e) => handleComponentDragStart(component, e)}
                      className="flex items-center p-2 bg-gray-50 rounded cursor-move hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-lg mr-2">{component.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {component.displayName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {component.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-200">
          {/* Scene Controls */}
          <div className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={activeScene?.id || ''}
                onChange={(e) => {
                  const scene = project.scenes.find(s => s.id === e.target.value);
                  setActiveScene(scene || null);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {project.scenes.map(scene => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                -
              </button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-8">
            {activeScene && (
              <div
                ref={canvasRef}
                className="mx-auto shadow-lg border-2 border-gray-300 bg-white relative cursor-crosshair"
                style={{
                  width: activeScene.width * zoom,
                  height: activeScene.height * zoom,
                  backgroundColor: activeScene.backgroundColor,
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
                }}
                onMouseDown={handleCanvasMouseDown}
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
              >
                {/* Grid */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #ddd 1px, transparent 1px),
                      linear-gradient(to bottom, #ddd 1px, transparent 1px)
                    `,
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                  }}
                />

                {/* Placed Components */}
                {activeScene.components.map(component => {
                  const componentDef = Object.values(components)
                    .flat()
                    .find(comp => comp.id === component.componentId);
                  
                  if (!componentDef) return null;

                  const isSelected = selectedComponent?.id === component.id;
                  const width = (component.width || 50) * zoom;
                  const height = (component.height || 50) * zoom;

                  return (
                    <div
                      key={component.id}
                      className={`absolute border-2 flex items-center justify-center text-xs font-medium select-none ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-400 bg-white hover:border-gray-600'
                      }`}
                      style={{
                        left: component.x * zoom,
                        top: component.y * zoom,
                        width,
                        height,
                        opacity: component.visible ? (component.opacity || 1) : 0.5
                      }}
                    >
                      <span className="text-lg">{componentDef.icon}</span>
                      <span className="ml-1 truncate">
                        {componentDef.displayName}
                      </span>
                      
                      {isSelected && (
                        <button
                          onClick={() => deleteComponent(component.id)}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Drop Indicator */}
                {isDragging && (
                  <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-50 pointer-events-none" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white shadow-sm border-l overflow-y-auto">
          <div className="p-4">
            {selectedComponent && selectedComponentDef ? (
              <>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Свойства: {selectedComponentDef.displayName}
                </h3>
                
                <div className="space-y-4">
                  {/* Position */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Позиция
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={selectedComponent.x}
                        onChange={(e) => updateComponentProperties(selectedComponent.id, {
                          x: Number(e.target.value)
                        })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="X"
                      />
                      <input
                        type="number"
                        value={selectedComponent.y}
                        onChange={(e) => updateComponentProperties(selectedComponent.id, {
                          y: Number(e.target.value)
                        })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Y"
                      />
                    </div>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedComponent.visible}
                        onChange={(e) => updateComponentProperties(selectedComponent.id, {
                          visible: e.target.checked
                        })}
                        className="mr-2"
                      />
                      <span className="text-xs font-medium text-gray-700">Видимый</span>
                    </label>
                  </div>

                  {/* Component Properties */}
                  {selectedComponentDef.properties.map(prop => (
                    <div key={prop.name}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {prop.displayName}
                      </label>
                      
                      {prop.type === 'string' && (
                        <input
                          type="text"
                          value={selectedComponent.properties[prop.name] || prop.defaultValue}
                          onChange={(e) => updateComponentProperties(selectedComponent.id, {
                            [prop.name]: e.target.value
                          })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder={prop.description}
                        />
                      )}
                      
                      {prop.type === 'number' && (
                        <input
                          type="number"
                          value={selectedComponent.properties[prop.name] || prop.defaultValue}
                          onChange={(e) => updateComponentProperties(selectedComponent.id, {
                            [prop.name]: Number(e.target.value)
                          })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          min={prop.min}
                          max={prop.max}
                          step={prop.step}
                        />
                      )}
                      
                      {prop.type === 'boolean' && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedComponent.properties[prop.name] ?? prop.defaultValue}
                            onChange={(e) => updateComponentProperties(selectedComponent.id, {
                              [prop.name]: e.target.checked
                            })}
                            className="mr-2"
                          />
                          <span className="text-xs text-gray-600">{prop.description}</span>
                        </label>
                      )}
                      
                      {prop.type === 'color' && (
                        <input
                          type="color"
                          value={selectedComponent.properties[prop.name] || prop.defaultValue}
                          onChange={(e) => updateComponentProperties(selectedComponent.id, {
                            [prop.name]: e.target.value
                          })}
                          className="w-full h-8 border border-gray-300 rounded"
                        />
                      )}
                      
                      {prop.type === 'select' && (
                        <select
                          value={selectedComponent.properties[prop.name] || prop.defaultValue}
                          onChange={(e) => updateComponentProperties(selectedComponent.id, {
                            [prop.name]: e.target.value
                          })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {prop.options?.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {prop.type === 'range' && (
                        <div>
                          <input
                            type="range"
                            value={selectedComponent.properties[prop.name] || prop.defaultValue}
                            onChange={(e) => updateComponentProperties(selectedComponent.id, {
                              [prop.name]: Number(e.target.value)
                            })}
                            min={prop.min}
                            max={prop.max}
                            step={prop.step}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-600 text-center mt-1">
                            {selectedComponent.properties[prop.name] || prop.defaultValue}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Выберите компонент для редактирования свойств</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualGameEditor; 