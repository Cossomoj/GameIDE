import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { LoggerService } from './logger';
import { EnhancedWebSocketService } from './enhancedWebSocket';
import { GenerationPersistenceService, GenerationState } from './generationPersistence';
import express from 'express';
import { createWriteStream } from 'fs';

interface PreviewConfig {
  enabled: boolean;
  updateInterval: number; // Интервал обновления в мс
  maxPreviewSize: number; // Максимальный размер превью в байтах
  supportedFormats: string[];
  compression: boolean;
  realTimeUpdates: boolean;
  thumbnailGeneration: boolean;
}

interface PreviewState {
  generationId: string;
  status: 'initializing' | 'generating' | 'ready' | 'error';
  progress: number;
  currentStep: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  lastUpdate: Date;
  error?: string;
  metadata: PreviewMetadata;
}

interface PreviewMetadata {
  gameType: string;
  theme: string;
  genre: string;
  estimatedCompleteTime?: number;
  fileCount: number;
  totalSize: number;
  screenshots: Screenshot[];
  interactiveElements: InteractiveElement[];
  codeSnippets: CodeSnippet[];
}

interface Screenshot {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  timestamp: Date;
  stepName: string;
}

interface InteractiveElement {
  id: string;
  type: 'button' | 'input' | 'canvas' | 'menu';
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  interactive: boolean;
}

interface CodeSnippet {
  id: string;
  fileName: string;
  language: string;
  content: string;
  description: string;
  stepName: string;
  highlighted: boolean;
}

interface LivePreviewFrame {
  id: string;
  generationId: string;
  frameNumber: number;
  timestamp: Date;
  stepName: string;
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  assets: PreviewAsset[];
  interactionPoints: InteractionPoint[];
}

interface PreviewAsset {
  name: string;
  type: 'image' | 'audio' | 'font' | 'data';
  url: string;
  size: number;
  base64?: string; // Для небольших ассетов
}

interface InteractionPoint {
  x: number;
  y: number;
  type: 'click' | 'hover' | 'input';
  description: string;
  action?: string;
}

export class GenerationPreviewService extends EventEmitter {
  private logger: LoggerService;
  private wsService?: EnhancedWebSocketService;
  private persistenceService: GenerationPersistenceService;
  
  // Конфигурация
  private config: PreviewConfig = {
    enabled: true,
    updateInterval: 2000, // 2 секунды
    maxPreviewSize: 5 * 1024 * 1024, // 5MB
    supportedFormats: ['.html', '.css', '.js', '.json', '.png', '.jpg', '.gif', '.svg'],
    compression: true,
    realTimeUpdates: true,
    thumbnailGeneration: true
  };

  // Состояние превью
  private previews = new Map<string, PreviewState>();
  private liveFrames = new Map<string, LivePreviewFrame[]>();
  private previewTimers = new Map<string, NodeJS.Timeout>();
  
  // Кэш ассетов
  private assetCache = new Map<string, Buffer>();
  
  // Счетчики и статистика
  private stats = {
    totalPreviews: 0,
    activePreviews: 0,
    generatedFrames: 0,
    cachedAssets: 0,
    previewRequests: 0,
    errors: 0
  };

  // Express приложение для сервинга превью
  private previewApp: express.Application;
  private previewPort: number;

  constructor(
    persistenceService: GenerationPersistenceService,
    wsService?: EnhancedWebSocketService
  ) {
    super();
    
    this.logger = LoggerService.getInstance();
    this.persistenceService = persistenceService;
    this.wsService = wsService;
    this.previewPort = parseInt(process.env.PREVIEW_PORT || '3002');
    
    this.previewApp = express();
    this.initializePreviewServer();
    this.setupEventListeners();
    
    this.logger.info('🎬 Сервис превью генерации инициализирован');
  }

  /**
   * Инициализация сервера превью
   */
  private initializePreviewServer(): void {
    // Middleware для CORS
    this.previewApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // Сервинг статических файлов превью
    this.previewApp.use('/preview', express.static(join(process.cwd(), 'preview-output')));
    
    // API эндпоинты
    this.setupPreviewAPIEndpoints();
    
    // Запуск сервера
    this.previewApp.listen(this.previewPort, () => {
      this.logger.info(`🌐 Сервер превью запущен на порту ${this.previewPort}`);
    });
  }

  /**
   * Настройка API эндпоинтов
   */
  private setupPreviewAPIEndpoints(): void {
    // Получение состояния превью
    this.previewApp.get('/api/preview/:generationId/status', (req, res) => {
      const { generationId } = req.params;
      const preview = this.previews.get(generationId);
      
      if (preview) {
        res.json(preview);
      } else {
        res.status(404).json({ error: 'Preview not found' });
      }
    });

    // Получение живых фреймов
    this.previewApp.get('/api/preview/:generationId/frames', (req, res) => {
      const { generationId } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      
      const frames = this.liveFrames.get(generationId) || [];
      const paginatedFrames = frames
        .slice(parseInt(offset as string))
        .slice(0, parseInt(limit as string));
      
      res.json({
        frames: paginatedFrames,
        total: frames.length,
        hasMore: frames.length > parseInt(offset as string) + parseInt(limit as string)
      });
    });

    // Получение последнего фрейма
    this.previewApp.get('/api/preview/:generationId/latest', (req, res) => {
      const { generationId } = req.params;
      const frames = this.liveFrames.get(generationId) || [];
      
      if (frames.length > 0) {
        res.json(frames[frames.length - 1]);
      } else {
        res.status(404).json({ error: 'No frames available' });
      }
    });

    // Полный превью игры
    this.previewApp.get('/api/preview/:generationId/full', async (req, res) => {
      try {
        const { generationId } = req.params;
        const fullPreview = await this.generateFullPreview(generationId);
        res.json(fullPreview);
      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Интерактивный превью
    this.previewApp.get('/preview/:generationId/interactive', (req, res) => {
      const { generationId } = req.params;
      const html = this.generateInteractivePreviewHTML(generationId);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // WebSocket для live обновлений (если включен)
    if (this.config.realTimeUpdates && this.wsService) {
      this.previewApp.get('/api/preview/:generationId/subscribe', (req, res) => {
        const { generationId } = req.params;
        res.json({
          websocketUrl: `ws://localhost:${process.env.PORT || 3001}`,
          subscribeEvent: 'preview:subscribe',
          subscribeData: { generationId }
        });
      });
    }
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    // Подписываемся на события генерации
    this.persistenceService.on('generation_created', (generation: GenerationState) => {
      this.initializePreview(generation);
    });

    this.persistenceService.on('generation_updated', (generation: GenerationState) => {
      this.updatePreview(generation);
    });

    this.persistenceService.on('generation_progress', (data: any) => {
      this.updatePreviewProgress(data.generationId, data.progress, data.currentStep);
    });

    this.persistenceService.on('generation_completed', (generation: GenerationState) => {
      this.finalizePreview(generation);
    });

    this.persistenceService.on('generation_failed', (generation: GenerationState) => {
      this.handlePreviewError(generation.id, generation.error || 'Generation failed');
    });

    // WebSocket события для live превью
    if (this.wsService) {
      this.wsService.on('client_connected', (data) => {
        // Клиент может подписаться на превью
      });
    }
  }

  /**
   * Инициализация превью для новой генерации
   */
  async initializePreview(generation: GenerationState): Promise<void> {
    if (!this.config.enabled) return;

    const previewState: PreviewState = {
      generationId: generation.id,
      status: 'initializing',
      progress: 0,
      currentStep: generation.currentStep,
      lastUpdate: new Date(),
      metadata: {
        gameType: generation.gameType,
        theme: generation.config.theme,
        genre: generation.config.genre,
        fileCount: 0,
        totalSize: 0,
        screenshots: [],
        interactiveElements: [],
        codeSnippets: []
      }
    };

    this.previews.set(generation.id, previewState);
    this.liveFrames.set(generation.id, []);
    this.stats.totalPreviews++;
    this.stats.activePreviews++;

    // Создаем директорию для превью
    const previewDir = join(process.cwd(), 'preview-output', generation.id);
    await fs.mkdir(previewDir, { recursive: true });

    // Создаем начальный фрейм
    await this.createInitialFrame(generation);

    // Запускаем таймер обновлений
    this.startPreviewUpdates(generation.id);

    this.logger.info(`🎬 Превью инициализировано для генерации ${generation.id}`);
    this.emit('preview_initialized', { generationId: generation.id, previewState });

    // Уведомляем WebSocket клиентов
    if (this.wsService) {
      this.wsService.broadcastToGame(generation.id, 'preview:initialized', previewState);
    }
  }

  /**
   * Создание начального фрейма
   */
  private async createInitialFrame(generation: GenerationState): Promise<void> {
    const frame: LivePreviewFrame = {
      id: `frame_${Date.now()}_0`,
      generationId: generation.id,
      frameNumber: 0,
      timestamp: new Date(),
      stepName: 'initialization',
      htmlContent: this.generatePlaceholderHTML(generation),
      cssContent: this.generatePlaceholderCSS(generation),
      jsContent: this.generatePlaceholderJS(generation),
      assets: [],
      interactionPoints: []
    };

    const frames = this.liveFrames.get(generation.id) || [];
    frames.push(frame);
    this.liveFrames.set(generation.id, frames);
    this.stats.generatedFrames++;

    // Сохраняем фрейм в файл
    await this.saveFrameToFile(frame);

    this.emit('frame_created', frame);
  }

  /**
   * Запуск периодических обновлений превью
   */
  private startPreviewUpdates(generationId: string): void {
    const timer = setInterval(async () => {
      await this.updatePreviewFromGeneration(generationId);
    }, this.config.updateInterval);

    this.previewTimers.set(generationId, timer);
  }

  /**
   * Остановка обновлений превью
   */
  private stopPreviewUpdates(generationId: string): void {
    const timer = this.previewTimers.get(generationId);
    if (timer) {
      clearInterval(timer);
      this.previewTimers.delete(generationId);
    }
  }

  /**
   * Обновление превью из состояния генерации
   */
  private async updatePreviewFromGeneration(generationId: string): Promise<void> {
    try {
      const generation = await this.persistenceService.getGeneration(generationId);
      if (!generation) return;

      const preview = this.previews.get(generationId);
      if (!preview) return;

      // Проверяем, есть ли промежуточные результаты
      const tempDir = join(process.cwd(), 'temp', generationId);
      const outputDir = join(process.cwd(), 'games-output', generationId);
      
      let sourceDir = tempDir;
      try {
        await fs.access(tempDir);
      } catch {
        try {
          await fs.access(outputDir);
          sourceDir = outputDir;
        } catch {
          return; // Нет файлов для превью
        }
      }

      // Создаем новый фрейм с текущим состоянием
      await this.createFrameFromDirectory(generationId, sourceDir, generation.currentStep);

      // Обновляем метаданные
      await this.updatePreviewMetadata(generationId, sourceDir);

    } catch (error) {
      this.logger.error(`❌ Ошибка обновления превью для ${generationId}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Создание фрейма из директории
   */
  private async createFrameFromDirectory(
    generationId: string,
    sourceDir: string,
    stepName: string
  ): Promise<void> {
    const frames = this.liveFrames.get(generationId) || [];
    const frameNumber = frames.length;

    const frame: LivePreviewFrame = {
      id: `frame_${Date.now()}_${frameNumber}`,
      generationId,
      frameNumber,
      timestamp: new Date(),
      stepName,
      assets: [],
      interactionPoints: []
    };

    try {
      // Читаем HTML, CSS, JS файлы
      const htmlPath = join(sourceDir, 'index.html');
      const cssPath = join(sourceDir, 'style.css');
      const jsPath = join(sourceDir, 'script.js');

      try {
        frame.htmlContent = await fs.readFile(htmlPath, 'utf-8');
      } catch {
        frame.htmlContent = this.generatePlaceholderHTML();
      }

      try {
        frame.cssContent = await fs.readFile(cssPath, 'utf-8');
      } catch {
        frame.cssContent = this.generatePlaceholderCSS();
      }

      try {
        frame.jsContent = await fs.readFile(jsPath, 'utf-8');
      } catch {
        frame.jsContent = this.generatePlaceholderJS();
      }

      // Собираем ассеты
      frame.assets = await this.collectAssetsFromDirectory(sourceDir);

      // Анализируем интерактивные элементы
      frame.interactionPoints = this.analyzeInteractionPoints(frame.htmlContent || '');

      frames.push(frame);
      this.liveFrames.set(generationId, frames);
      this.stats.generatedFrames++;

      // Сохраняем фрейм
      await this.saveFrameToFile(frame);

      this.emit('frame_created', frame);

      // Уведомляем WebSocket клиентов
      if (this.wsService) {
        this.wsService.broadcastToGame(generationId, 'preview:frame_updated', {
          generationId,
          frameNumber,
          stepName,
          timestamp: frame.timestamp
        });
      }

    } catch (error) {
      this.logger.error('❌ Ошибка создания фрейма:', error);
      this.stats.errors++;
    }
  }

  /**
   * Сбор ассетов из директории
   */
  private async collectAssetsFromDirectory(sourceDir: string): Promise<PreviewAsset[]> {
    const assets: PreviewAsset[] = [];
    
    try {
      const files = await this.getAllFiles(sourceDir);
      
      for (const file of files) {
        const ext = extname(file);
        if (!this.config.supportedFormats.includes(ext)) continue;

        const stat = await fs.stat(file);
        if (stat.size > this.config.maxPreviewSize) continue;

        const relativePath = file.replace(sourceDir, '');
        const assetType = this.getAssetType(ext);
        
        const asset: PreviewAsset = {
          name: relativePath,
          type: assetType,
          url: `/preview/${file.replace(process.cwd(), '')}`,
          size: stat.size
        };

        // Для небольших изображений создаем base64
        if (assetType === 'image' && stat.size < 50 * 1024) { // < 50KB
          try {
            const buffer = await fs.readFile(file);
            asset.base64 = `data:image/${ext.substring(1)};base64,${buffer.toString('base64')}`;
            this.assetCache.set(file, buffer);
            this.stats.cachedAssets++;
          } catch {
            // Игнорируем ошибки чтения
          }
        }

        assets.push(asset);
      }
    } catch (error) {
      this.logger.error('❌ Ошибка сбора ассетов:', error);
    }

    return assets;
  }

  /**
   * Анализ интерактивных точек
   */
  private analyzeInteractionPoints(htmlContent: string): InteractionPoint[] {
    const points: InteractionPoint[] = [];
    
    // Простой анализ HTML для поиска интерактивных элементов
    const buttonRegex = /<button[^>]*>([^<]*)<\/button>/gi;
    const inputRegex = /<input[^>]*>/gi;
    const canvasRegex = /<canvas[^>]*>/gi;

    let match;

    // Кнопки
    while ((match = buttonRegex.exec(htmlContent)) !== null) {
      points.push({
        x: Math.random() * 800, // Примерные координаты
        y: Math.random() * 600,
        type: 'click',
        description: `Button: ${match[1] || 'Unknown'}`,
        action: 'click'
      });
    }

    // Поля ввода
    while ((match = inputRegex.exec(htmlContent)) !== null) {
      points.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        type: 'input',
        description: 'Input field',
        action: 'focus'
      });
    }

    // Canvas элементы
    while ((match = canvasRegex.exec(htmlContent)) !== null) {
      points.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        type: 'click',
        description: 'Game canvas',
        action: 'interact'
      });
    }

    return points;
  }

  /**
   * Обновление метаданных превью
   */
  private async updatePreviewMetadata(generationId: string, sourceDir: string): Promise<void> {
    const preview = this.previews.get(generationId);
    if (!preview) return;

    try {
      const files = await this.getAllFiles(sourceDir);
      let totalSize = 0;

      for (const file of files) {
        const stat = await fs.stat(file);
        totalSize += stat.size;
      }

      preview.metadata.fileCount = files.length;
      preview.metadata.totalSize = totalSize;
      preview.lastUpdate = new Date();

      // Обновляем code snippets
      await this.updateCodeSnippets(generationId, sourceDir);

    } catch (error) {
      this.logger.error('❌ Ошибка обновления метаданных:', error);
    }
  }

  /**
   * Обновление фрагментов кода
   */
  private async updateCodeSnippets(generationId: string, sourceDir: string): Promise<void> {
    const preview = this.previews.get(generationId);
    if (!preview) return;

    const codeSnippets: CodeSnippet[] = [];

    const codeFiles = [
      { path: 'index.html', language: 'html' },
      { path: 'style.css', language: 'css' },
      { path: 'script.js', language: 'javascript' },
      { path: 'game.js', language: 'javascript' }
    ];

    for (const { path, language } of codeFiles) {
      const filePath = join(sourceDir, path);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        codeSnippets.push({
          id: `snippet_${path}`,
          fileName: path,
          language,
          content: this.truncateCode(content, 500), // Ограничиваем размер
          description: `Generated ${language} code`,
          stepName: preview.currentStep,
          highlighted: true
        });
      } catch {
        // Файл не существует, продолжаем
      }
    }

    preview.metadata.codeSnippets = codeSnippets;
  }

  /**
   * Сохранение фрейма в файл
   */
  private async saveFrameToFile(frame: LivePreviewFrame): Promise<void> {
    const frameDir = join(process.cwd(), 'preview-output', frame.generationId, 'frames');
    await fs.mkdir(frameDir, { recursive: true });

    const framePath = join(frameDir, `frame_${frame.frameNumber}.json`);
    await fs.writeFile(framePath, JSON.stringify(frame, null, 2));

    // Создаем HTML файл для просмотра фрейма
    const htmlPath = join(frameDir, `frame_${frame.frameNumber}.html`);
    const htmlContent = this.generateFrameHTML(frame);
    await fs.writeFile(htmlPath, htmlContent);
  }

  /**
   * Генерация HTML для фрейма
   */
  private generateFrameHTML(frame: LivePreviewFrame): string {
    const assets = frame.assets.map(asset => {
      if (asset.type === 'image' && asset.base64) {
        return `<!-- ${asset.name}: embedded as base64 -->`;
      }
      return `<!-- Asset: ${asset.name} (${asset.type}) -->`;
    }).join('\n  ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Frame ${frame.frameNumber} - ${frame.stepName}</title>
  <style>
    /* Frame metadata */
    .preview-info {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
    }
    
    .interaction-point {
      position: absolute;
      width: 20px;
      height: 20px;
      background: rgba(255, 0, 0, 0.5);
      border: 2px solid red;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9999;
    }
    
    ${frame.cssContent || ''}
  </style>
</head>
<body>
  <div class="preview-info">
    <div>Frame: ${frame.frameNumber}</div>
    <div>Step: ${frame.stepName}</div>
    <div>Time: ${frame.timestamp.toLocaleTimeString()}</div>
    <div>Assets: ${frame.assets.length}</div>
    <div>Interactions: ${frame.interactionPoints.length}</div>
  </div>
  
  ${frame.interactionPoints.map((point, index) => `
    <div class="interaction-point" 
         style="left: ${point.x}px; top: ${point.y}px;"
         title="${point.description}"
         data-action="${point.action}"
         onclick="alert('Interaction: ${point.description}')">
    </div>
  `).join('')}
  
  ${frame.htmlContent || '<div>Generating content...</div>'}
  
  <!-- Assets -->
  ${assets}
  
  <script>
    // Frame metadata
    window.previewFrame = ${JSON.stringify(frame, null, 2)};
    
    // Original JS content
    ${frame.jsContent || '// Generating scripts...'}
    
    // Preview enhancements
    console.log('Preview frame loaded:', window.previewFrame);
    
    // Add interaction handlers
    document.querySelectorAll('.interaction-point').forEach(point => {
      point.addEventListener('mouseover', function() {
        this.style.background = 'rgba(255, 0, 0, 0.8)';
      });
      
      point.addEventListener('mouseout', function() {
        this.style.background = 'rgba(255, 0, 0, 0.5)';
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Генерация полного превью
   */
  private async generateFullPreview(generationId: string): Promise<any> {
    this.stats.previewRequests++;
    
    const preview = this.previews.get(generationId);
    const frames = this.liveFrames.get(generationId) || [];
    
    if (!preview) {
      throw new Error('Preview not found');
    }

    const generation = await this.persistenceService.getGeneration(generationId);
    
    return {
      generation: {
        id: generation?.id,
        status: generation?.status,
        progress: generation?.progress,
        currentStep: generation?.currentStep
      },
      preview,
      frames: frames.map(frame => ({
        id: frame.id,
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        stepName: frame.stepName,
        url: `/preview/${generationId}/frames/frame_${frame.frameNumber}.html`,
        interactionCount: frame.interactionPoints.length,
        assetCount: frame.assets.length
      })),
      stats: {
        totalFrames: frames.length,
        lastUpdate: preview.lastUpdate,
        fileCount: preview.metadata.fileCount,
        totalSize: preview.metadata.totalSize
      }
    };
  }

  /**
   * Генерация интерактивного HTML для превью
   */
  private generateInteractivePreviewHTML(generationId: string): string {
    const preview = this.previews.get(generationId);
    const frames = this.liveFrames.get(generationId) || [];
    const latestFrame = frames[frames.length - 1];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Preview - Generation ${generationId}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0f0f0;
      display: flex;
      height: 100vh;
    }
    
    .sidebar {
      width: 300px;
      background: #2c3e50;
      color: white;
      padding: 20px;
      overflow-y: auto;
    }
    
    .preview-container {
      flex: 1;
      background: white;
      margin: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    }
    
    .preview-header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: #34495e;
      color: white;
      border-radius: 10px 10px 0 0;
    }
    
    .preview-content {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .status-generating { background: #f39c12; }
    .status-ready { background: #27ae60; }
    .status-error { background: #e74c3c; }
    
    .frame-list {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 20px;
    }
    
    .frame-item {
      padding: 10px;
      margin: 5px 0;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .frame-item:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .frame-item.active {
      background: #3498db;
    }
    
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress-fill {
      height: 100%;
      background: #27ae60;
      transition: width 0.3s ease;
    }
    
    .metadata {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <h2>🎮 Live Preview</h2>
    
    <div class="status">
      <span class="status-indicator status-${preview?.status || 'generating'}"></span>
      <span>Status: ${preview?.status || 'Unknown'}</span>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${preview?.progress || 0}%"></div>
    </div>
    
    <div class="metadata">
      <div>Progress: ${preview?.progress || 0}%</div>
      <div>Step: ${preview?.currentStep || 'Unknown'}</div>
      <div>Theme: ${preview?.metadata.theme || 'Unknown'}</div>
      <div>Genre: ${preview?.metadata.genre || 'Unknown'}</div>
      <div>Files: ${preview?.metadata.fileCount || 0}</div>
      <div>Size: ${this.formatBytes(preview?.metadata.totalSize || 0)}</div>
    </div>
    
    <h3>📽️ Frames (${frames.length})</h3>
    <div class="frame-list" id="frameList">
      ${frames.map((frame, index) => `
        <div class="frame-item ${index === frames.length - 1 ? 'active' : ''}" 
             onclick="loadFrame(${frame.frameNumber})" 
             data-frame="${frame.frameNumber}">
          <div style="font-weight: bold;">Frame ${frame.frameNumber}</div>
          <div style="font-size: 11px; opacity: 0.7;">${frame.stepName}</div>
          <div style="font-size: 10px; opacity: 0.5;">${frame.timestamp.toLocaleTimeString()}</div>
        </div>
      `).join('')}
    </div>
    
    <button onclick="refreshPreview()" style="width: 100%; padding: 10px; margin-top: 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
      🔄 Refresh
    </button>
  </div>
  
  <div class="preview-container">
    <div class="preview-header">
      <h2>Game Preview</h2>
      <span id="currentFrame">Frame ${latestFrame?.frameNumber || 0} - ${latestFrame?.stepName || 'Loading'}</span>
    </div>
    <div class="preview-content">
      <iframe class="preview-iframe" 
              id="previewFrame"
              src="/api/preview/${generationId}/frames/frame_${latestFrame?.frameNumber || 0}.html">
      </iframe>
    </div>
  </div>
  
  <script>
    let currentFrameNumber = ${latestFrame?.frameNumber || 0};
    let autoRefresh = true;
    
    function loadFrame(frameNumber) {
      currentFrameNumber = frameNumber;
      document.getElementById('previewFrame').src = \`/api/preview/${generationId}/frames/frame_\${frameNumber}.html\`;
      document.getElementById('currentFrame').textContent = \`Frame \${frameNumber}\`;
      
      // Update active frame in list
      document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.frame) === frameNumber) {
          item.classList.add('active');
        }
      });
    }
    
    function refreshPreview() {
      location.reload();
    }
    
    // Auto-refresh every 5 seconds if generation is active
    if (autoRefresh && '${preview?.status}' === 'generating') {
      setInterval(refreshPreview, 5000);
    }
    
    // WebSocket connection for live updates (if available)
    ${this.wsService ? `
    try {
      const ws = new WebSocket('ws://localhost:${process.env.PORT || 3001}');
      
      ws.onopen = function() {
        console.log('Connected to live preview WebSocket');
        ws.send(JSON.stringify({
          event: 'preview:subscribe',
          data: { generationId: '${generationId}' }
        }));
      };
      
      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.event === 'preview:frame_updated' && data.generationId === '${generationId}') {
          console.log('New frame available:', data.frameNumber);
          if (autoRefresh) {
            setTimeout(refreshPreview, 1000);
          }
        }
      };
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
    ` : '// WebSocket not available'}
  </script>
</body>
</html>`;
  }

  /**
   * Обновление превью
   */
  async updatePreview(generation: GenerationState): Promise<void> {
    const preview = this.previews.get(generation.id);
    if (!preview) return;

    preview.status = generation.status === 'in_progress' ? 'generating' : 
                    generation.status === 'completed' ? 'ready' : 
                    generation.status === 'failed' ? 'error' : preview.status;
    
    preview.progress = generation.progress;
    preview.currentStep = generation.currentStep;
    preview.lastUpdate = new Date();

    this.emit('preview_updated', { generationId: generation.id, preview });
  }

  /**
   * Обновление прогресса превью
   */
  async updatePreviewProgress(generationId: string, progress: number, currentStep: string): Promise<void> {
    const preview = this.previews.get(generationId);
    if (!preview) return;

    preview.progress = progress;
    preview.currentStep = currentStep;
    preview.lastUpdate = new Date();

    if (this.wsService) {
      this.wsService.broadcastToGame(generationId, 'preview:progress', {
        generationId,
        progress,
        currentStep,
        timestamp: new Date()
      });
    }
  }

  /**
   * Финализация превью
   */
  async finalizePreview(generation: GenerationState): Promise<void> {
    const preview = this.previews.get(generation.id);
    if (!preview) return;

    preview.status = 'ready';
    preview.progress = 100;
    preview.lastUpdate = new Date();

    // Создаем финальный фрейм с результатами
    if (generation.results) {
      const outputDir = join(process.cwd(), 'games-output', generation.id);
      await this.createFrameFromDirectory(generation.id, outputDir, 'completed');
    }

    // Генерируем thumbnail
    if (this.config.thumbnailGeneration) {
      await this.generateThumbnail(generation.id);
    }

    this.stopPreviewUpdates(generation.id);
    this.stats.activePreviews--;

    this.logger.info(`✅ Превью финализировано для генерации ${generation.id}`);
    this.emit('preview_finalized', { generationId: generation.id, preview });

    if (this.wsService) {
      this.wsService.broadcastToGame(generation.id, 'preview:completed', preview);
    }
  }

  /**
   * Обработка ошибки превью
   */
  async handlePreviewError(generationId: string, error: string): Promise<void> {
    const preview = this.previews.get(generationId);
    if (!preview) return;

    preview.status = 'error';
    preview.error = error;
    preview.lastUpdate = new Date();

    this.stopPreviewUpdates(generationId);
    this.stats.activePreviews--;
    this.stats.errors++;

    this.emit('preview_error', { generationId, error });

    if (this.wsService) {
      this.wsService.broadcastToGame(generationId, 'preview:error', { error });
    }
  }

  /**
   * Генерация thumbnail
   */
  private async generateThumbnail(generationId: string): Promise<void> {
    // Простая реализация - создание SVG превью
    const preview = this.previews.get(generationId);
    if (!preview) return;

    const thumbnailSvg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <rect x="20" y="20" width="260" height="140" fill="#fff" stroke="#ddd" stroke-width="2" rx="5"/>
        <text x="150" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
          ${preview.metadata.theme}
        </text>
        <text x="150" y="75" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
          ${preview.metadata.genre}
        </text>
        <text x="150" y="100" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
          ${preview.metadata.fileCount} files
        </text>
        <text x="150" y="115" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
          ${this.formatBytes(preview.metadata.totalSize)}
        </text>
        <rect x="50" y="130" width="200" height="10" fill="#eee" rx="5"/>
        <rect x="50" y="130" width="${(preview.progress / 100) * 200}" height="10" fill="#27ae60" rx="5"/>
        <text x="150" y="170" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">
          ${preview.status.toUpperCase()}
        </text>
      </svg>
    `;

    const thumbnailPath = join(process.cwd(), 'preview-output', generationId, 'thumbnail.svg');
    await fs.writeFile(thumbnailPath, thumbnailSvg);

    preview.thumbnailUrl = `/preview/${generationId}/thumbnail.svg`;
  }

  // Вспомогательные методы

  private generatePlaceholderHTML(generation?: GenerationState): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${generation ? `${generation.config.theme} ${generation.config.genre}` : 'Game'} - Generating...</title>
</head>
<body>
  <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
    <div style="text-align: center;">
      <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <h2>Generating Game...</h2>
      <p>${generation ? `Theme: ${generation.config.theme}` : 'Loading configuration...'}</p>
      <p>${generation ? `Genre: ${generation.config.genre}` : ''}</p>
    </div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</body>
</html>`;
  }

  private generatePlaceholderCSS(generation?: GenerationState): string {
    return `/* Generated CSS for ${generation ? generation.config.theme : 'Game'} */
body {
  margin: 0;
  padding: 0;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.game-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading {
  color: white;
  text-align: center;
}`;
  }

  private generatePlaceholderJS(generation?: GenerationState): string {
    return `// Generated JavaScript for ${generation ? generation.config.theme : 'Game'}
console.log('Game initialization...');

// Game configuration
const gameConfig = ${generation ? JSON.stringify(generation.config, null, 2) : '{}'};

// Placeholder game logic
class Game {
  constructor() {
    this.initialized = false;
    this.theme = gameConfig.theme || 'default';
    this.genre = gameConfig.genre || 'casual';
  }
  
  init() {
    console.log(\`Initializing \${this.theme} \${this.genre} game...\`);
    this.initialized = true;
  }
  
  update() {
    // Game loop placeholder
  }
  
  render() {
    // Rendering placeholder
  }
}

// Initialize game when ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
  console.log('Game ready!');
});`;
  }

  private getAssetType(extension: string): 'image' | 'audio' | 'font' | 'data' {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
    const audioExts = ['.mp3', '.ogg', '.wav', '.m4a', '.flac'];
    const fontExts = ['.woff', '.woff2', '.ttf', '.otf'];
    
    if (imageExts.includes(extension)) return 'image';
    if (audioExts.includes(extension)) return 'audio';
    if (fontExts.includes(extension)) return 'font';
    return 'data';
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Директория не существует или недоступна
    }
    
    return files;
  }

  private truncateCode(code: string, maxLength: number): string {
    if (code.length <= maxLength) return code;
    return code.substring(0, maxLength) + '\n// ... (truncated)';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Получение статистики сервиса
   */
  getStats() {
    return {
      ...this.stats,
      activePreviews: this.previews.size,
      cachedAssets: this.assetCache.size,
      activeTimers: this.previewTimers.size
    };
  }

  /**
   * Очистка завершенных превью
   */
  cleanup(): void {
    for (const [generationId, preview] of this.previews) {
      if (preview.status === 'ready' || preview.status === 'error') {
        const daysSinceUpdate = (Date.now() - preview.lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 7) { // Удаляем превью старше 7 дней
          this.previews.delete(generationId);
          this.liveFrames.delete(generationId);
          this.stopPreviewUpdates(generationId);
        }
      }
    }

    // Очистка кэша ассетов
    if (this.assetCache.size > 1000) { // Лимит кэша
      this.assetCache.clear();
      this.stats.cachedAssets = 0;
    }
  }
}

// Singleton экземпляр
export const generationPreview = new GenerationPreviewService(
  require('./generationPersistence').generationPersistence
);

export default generationPreview; 