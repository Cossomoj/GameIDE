import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { analyticsService } from './analytics';

export interface LanguageConfig {
  id: string;
  name: string;
  displayName: string;
  version: string;
  fileExtension: string;
  
  // Компилятор/интерпретатор
  runtime: {
    type: 'interpreted' | 'compiled' | 'transpiled';
    executable: string;
    compileCommand?: string;
    runCommand: string;
    buildCommand?: string;
    packageManager?: string;
    dependencies: string[];
  };
  
  // Шаблоны и генерация
  templates: {
    gameTemplate: string;
    entityTemplate: string;
    sceneTemplate: string;
    componentTemplate: string;
    utilsTemplate: string;
    mainTemplate: string;
    configTemplate: string;
  };
  
  // Настройки генерации
  generation: {
    indentation: string;
    lineEnding: string;
    commentStyle: 'line' | 'block' | 'both';
    namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
    classStyle?: 'class' | 'function' | 'prototype';
    moduleSystem?: 'es6' | 'commonjs' | 'amd' | 'namespace' | 'none';
  };
  
  // Возможности языка
  features: {
    objectOriented: boolean;
    functional: boolean;
    typeSafety: 'static' | 'dynamic' | 'optional';
    memoryManagement: 'manual' | 'garbage_collected' | 'reference_counted';
    concurrency: boolean;
    webSupport: boolean;
    mobileSupport: boolean;
    desktopSupport: boolean;
    gameEngines: string[];
  };
  
  // Библиотеки и фреймворки
  libraries: {
    graphics: string[];
    audio: string[];
    input: string[];
    physics: string[];
    ui: string[];
    networking: string[];
    storage: string[];
  };
  
  // Документация
  documentation: {
    officialDocs: string;
    tutorials: string[];
    examples: string[];
    community: string[];
  };
}

export interface CodeGenerationRequest {
  gameConfig: any;
  targetLanguage: string;
  outputFormat: 'single_file' | 'multi_file' | 'project';
  optimizations: {
    minify: boolean;
    obfuscate: boolean;
    bundleAssets: boolean;
    generateDocs: boolean;
    includeTests: boolean;
  };
  customSettings?: Record<string, any>;
}

export interface GeneratedCode {
  id: string;
  language: string;
  gameId: string;
  
  // Файлы
  files: Array<{
    path: string;
    content: string;
    type: 'source' | 'config' | 'asset' | 'documentation' | 'test';
    size: number;
  }>;
  
  // Метаданные
  metadata: {
    generatedAt: Date;
    language: string;
    version: string;
    totalFiles: number;
    totalSize: number;
    dependencies: string[];
    buildInstructions: string[];
    runInstructions: string[];
  };
  
  // Проект
  projectStructure: {
    name: string;
    version: string;
    description: string;
    main: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  
  // Дополнительные файлы
  additionalFiles: {
    readme: string;
    gitignore: string;
    dockerfile?: string;
    ciConfig?: string;
    packageConfig?: string;
  };
}

export interface ConversionJob {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  gameId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  sourceCode: string;
  generatedCode?: GeneratedCode;
  
  errors: Array<{
    type: 'syntax' | 'semantic' | 'runtime' | 'compatibility';
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
  }>;
  
  warnings: string[];
  
  conversionNotes: Array<{
    type: 'feature_missing' | 'manual_fix_required' | 'performance_note' | 'compatibility_note';
    message: string;
    suggestion?: string;
  }>;
}

class MultiLanguageGenerationService extends EventEmitter {
  private languages: Map<string, LanguageConfig> = new Map();
  private generatedCode: Map<string, GeneratedCode> = new Map();
  private conversionJobs: Map<string, ConversionJob> = new Map();

  constructor() {
    super();
    this.initializeLanguages();
  }

  // Генерация кода игры на указанном языке
  public async generateGame(request: CodeGenerationRequest): Promise<GeneratedCode> {
    try {
      const language = this.languages.get(request.targetLanguage);
      if (!language) {
        throw new Error(`Language "${request.targetLanguage}" is not supported`);
      }

      const generatedCode: GeneratedCode = {
        id: this.generateCodeId(),
        language: request.targetLanguage,
        gameId: request.gameConfig.id || 'unknown',
        files: [],
        metadata: {
          generatedAt: new Date(),
          language: request.targetLanguage,
          version: language.version,
          totalFiles: 0,
          totalSize: 0,
          dependencies: [],
          buildInstructions: [],
          runInstructions: []
        },
        projectStructure: {
          name: request.gameConfig.name || 'generated-game',
          version: '1.0.0',
          description: request.gameConfig.description || 'Generated game',
          main: this.getMainFileName(language),
          scripts: {},
          dependencies: {},
          devDependencies: {}
        },
        additionalFiles: {
          readme: '',
          gitignore: ''
        }
      };

      // Генерируем основные файлы игры
      await this.generateGameFiles(request, language, generatedCode);
      
      // Генерируем конфигурационные файлы
      await this.generateConfigFiles(request, language, generatedCode);
      
      // Генерируем дополнительные файлы
      await this.generateAdditionalFiles(request, language, generatedCode);
      
      // Обновляем метаданные
      this.updateMetadata(generatedCode);

      this.generatedCode.set(generatedCode.id, generatedCode);

      // Аналитика
      analyticsService.trackEvent('code_generated', {
        language: request.targetLanguage,
        gameId: request.gameConfig.id,
        filesCount: generatedCode.files.length,
        totalSize: generatedCode.metadata.totalSize
      });

      this.emit('codeGenerated', generatedCode);
      logger.info(`Game code generated for language: ${request.targetLanguage}`);

      return generatedCode;
    } catch (error) {
      logger.error('Error generating game code:', error);
      throw error;
    }
  }

  // Конвертация существующего кода между языками
  public async convertCode(
    sourceCode: string,
    sourceLanguage: string,
    targetLanguage: string,
    gameId: string
  ): Promise<ConversionJob> {
    try {
      const sourceLang = this.languages.get(sourceLanguage);
      const targetLang = this.languages.get(targetLanguage);
      
      if (!sourceLang || !targetLang) {
        throw new Error('Source or target language not supported');
      }

      const job: ConversionJob = {
        id: this.generateJobId(),
        sourceLanguage,
        targetLanguage,
        gameId,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
        sourceCode,
        errors: [],
        warnings: [],
        conversionNotes: []
      };

      this.conversionJobs.set(job.id, job);

      // Запускаем конвертацию в фоне
      this.performConversion(job).catch(error => {
        logger.error('Error in code conversion:', error);
        job.status = 'failed';
        job.errors.push({
          type: 'runtime',
          message: error.message,
          severity: 'error'
        });
      });

      return job;
    } catch (error) {
      logger.error('Error starting code conversion:', error);
      throw error;
    }
  }

  // Получение поддерживаемых языков
  public getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  // Получение конфигурации языка
  public getLanguageConfig(languageId: string): LanguageConfig | null {
    return this.languages.get(languageId) || null;
  }

  // Получение сгенерированного кода
  public getGeneratedCode(codeId: string): GeneratedCode | null {
    return this.generatedCode.get(codeId) || null;
  }

  // Получение статуса конвертации
  public getConversionJob(jobId: string): ConversionJob | null {
    return this.conversionJobs.get(jobId) || null;
  }

  // Скачивание проекта в виде архива
  public async downloadProject(codeId: string, format: 'zip' | 'tar.gz' = 'zip'): Promise<string> {
    try {
      const code = this.generatedCode.get(codeId);
      if (!code) {
        throw new Error('Generated code not found');
      }

      const projectPath = await this.createProjectDirectory(code);
      const archivePath = await this.createArchive(projectPath, format);
      
      return archivePath;
    } catch (error) {
      logger.error('Error downloading project:', error);
      throw error;
    }
  }

  // Приватные методы

  private async generateGameFiles(
    request: CodeGenerationRequest,
    language: LanguageConfig,
    generatedCode: GeneratedCode
  ): Promise<void> {
    const gameConfig = request.gameConfig;

    // Главный файл игры
    const mainContent = this.generateMainFile(gameConfig, language);
    generatedCode.files.push({
      path: this.getMainFileName(language),
      content: mainContent,
      type: 'source',
      size: Buffer.byteLength(mainContent, 'utf8')
    });

    // Файл игровых сущностей
    const entitiesContent = this.generateEntitiesFile(gameConfig, language);
    generatedCode.files.push({
      path: `entities.${language.fileExtension}`,
      content: entitiesContent,
      type: 'source',
      size: Buffer.byteLength(entitiesContent, 'utf8')
    });

    // Файл игровых сцен
    const scenesContent = this.generateScenesFile(gameConfig, language);
    generatedCode.files.push({
      path: `scenes.${language.fileExtension}`,
      content: scenesContent,
      type: 'source',
      size: Buffer.byteLength(scenesContent, 'utf8')
    });

    // Файл утилит
    const utilsContent = this.generateUtilsFile(gameConfig, language);
    generatedCode.files.push({
      path: `utils.${language.fileExtension}`,
      content: utilsContent,
      type: 'source',
      size: Buffer.byteLength(utilsContent, 'utf8')
    });

    // Конфигурационный файл игры
    const configContent = this.generateGameConfigFile(gameConfig, language);
    generatedCode.files.push({
      path: `config.${language.fileExtension}`,
      content: configContent,
      type: 'config',
      size: Buffer.byteLength(configContent, 'utf8')
    });
  }

  private async generateConfigFiles(
    request: CodeGenerationRequest,
    language: LanguageConfig,
    generatedCode: GeneratedCode
  ): Promise<void> {
    // Package.json для Node.js проектов
    if (language.runtime.packageManager === 'npm') {
      const packageJson = this.generatePackageJson(generatedCode.projectStructure, language);
      generatedCode.files.push({
        path: 'package.json',
        content: packageJson,
        type: 'config',
        size: Buffer.byteLength(packageJson, 'utf8')
      });
    }

    // Requirements.txt для Python
    if (language.id === 'python') {
      const requirements = this.generateRequirementsTxt(language);
      generatedCode.files.push({
        path: 'requirements.txt',
        content: requirements,
        type: 'config',
        size: Buffer.byteLength(requirements, 'utf8')
      });
    }

    // Cargo.toml для Rust
    if (language.id === 'rust') {
      const cargoToml = this.generateCargoToml(generatedCode.projectStructure);
      generatedCode.files.push({
        path: 'Cargo.toml',
        content: cargoToml,
        type: 'config',
        size: Buffer.byteLength(cargoToml, 'utf8')
      });
    }

    // pom.xml для Java
    if (language.id === 'java') {
      const pomXml = this.generatePomXml(generatedCode.projectStructure);
      generatedCode.files.push({
        path: 'pom.xml',
        content: pomXml,
        type: 'config',
        size: Buffer.byteLength(pomXml, 'utf8')
      });
    }

    // .csproj для C#
    if (language.id === 'csharp') {
      const csproj = this.generateCsProj(generatedCode.projectStructure);
      generatedCode.files.push({
        path: `${generatedCode.projectStructure.name}.csproj`,
        content: csproj,
        type: 'config',
        size: Buffer.byteLength(csproj, 'utf8')
      });
    }
  }

  private async generateAdditionalFiles(
    request: CodeGenerationRequest,
    language: LanguageConfig,
    generatedCode: GeneratedCode
  ): Promise<void> {
    // README.md
    const readme = this.generateReadme(generatedCode, language);
    generatedCode.additionalFiles.readme = readme;
    generatedCode.files.push({
      path: 'README.md',
      content: readme,
      type: 'documentation',
      size: Buffer.byteLength(readme, 'utf8')
    });

    // .gitignore
    const gitignore = this.generateGitignore(language);
    generatedCode.additionalFiles.gitignore = gitignore;
    generatedCode.files.push({
      path: '.gitignore',
      content: gitignore,
      type: 'config',
      size: Buffer.byteLength(gitignore, 'utf8')
    });

    // Dockerfile (опционально)
    if (request.optimizations.generateDocs) {
      const dockerfile = this.generateDockerfile(language);
      generatedCode.additionalFiles.dockerfile = dockerfile;
      generatedCode.files.push({
        path: 'Dockerfile',
        content: dockerfile,
        type: 'config',
        size: Buffer.byteLength(dockerfile, 'utf8')
      });
    }

    // Тесты (опционально)
    if (request.optimizations.includeTests) {
      const testsContent = this.generateTestsFile(request.gameConfig, language);
      generatedCode.files.push({
        path: `tests.${language.fileExtension}`,
        content: testsContent,
        type: 'test',
        size: Buffer.byteLength(testsContent, 'utf8')
      });
    }
  }

  private generateMainFile(gameConfig: any, language: LanguageConfig): string {
    const template = language.templates.mainTemplate;
    
    // Простая генерация для демонстрации
    switch (language.id) {
      case 'javascript':
        return this.generateJavaScriptMain(gameConfig);
      case 'python':
        return this.generatePythonMain(gameConfig);
      case 'java':
        return this.generateJavaMain(gameConfig);
      case 'csharp':
        return this.generateCSharpMain(gameConfig);
      case 'typescript':
        return this.generateTypeScriptMain(gameConfig);
      case 'rust':
        return this.generateRustMain(gameConfig);
      case 'go':
        return this.generateGoMain(gameConfig);
      default:
        return `// Generated game code for ${language.displayName}\n// TODO: Implement game logic`;
    }
  }

  private generateJavaScriptMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = ${gameConfig.width || 800};
        this.height = ${gameConfig.height || 600};
        this.entities = [];
        this.scenes = new Map();
        this.currentScene = null;
        this.gameRunning = false;
        
        this.init();
    }
    
    init() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.setupEventListeners();
        this.loadAssets();
        this.createScenes();
        
        console.log('Game initialized: ${gameConfig.name || 'Untitled Game'}');
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    loadAssets() {
        // TODO: Load game assets
    }
    
    createScenes() {
        // Create main menu scene
        this.scenes.set('menu', {
            name: 'Menu',
            entities: [],
            update: () => {},
            render: (ctx) => {
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(0, 0, this.width, this.height);
                
                ctx.fillStyle = 'white';
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('${gameConfig.name || 'Game'}', this.width / 2, this.height / 2 - 50);
                
                ctx.font = '24px Arial';
                ctx.fillText('Click to Start', this.width / 2, this.height / 2 + 50);
            }
        });
        
        // Create game scene
        this.scenes.set('game', {
            name: 'Game',
            entities: [],
            update: () => {
                // Game logic here
            },
            render: (ctx) => {
                ctx.fillStyle = '#34495e';
                ctx.fillRect(0, 0, this.width, this.height);
                
                // Render game entities
                this.entities.forEach(entity => entity.render(ctx));
            }
        });
        
        this.setScene('menu');
    }
    
    setScene(sceneName) {
        this.currentScene = this.scenes.get(sceneName);
    }
    
    handleKeyDown(event) {
        // Handle key press
    }
    
    handleKeyUp(event) {
        // Handle key release
    }
    
    handleClick(event) {
        if (this.currentScene === this.scenes.get('menu')) {
            this.startGame();
        }
    }
    
    startGame() {
        this.setScene('game');
        this.gameRunning = true;
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.currentScene) {
            this.currentScene.update();
        }
        
        this.entities.forEach(entity => entity.update());
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (this.currentScene) {
            this.currentScene.render(this.ctx);
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Game();
});
`;
  }

  private generatePythonMain(gameConfig: any): string {
    return `"""
Generated Game: ${gameConfig.name || 'Untitled Game'}
Generated on: ${new Date().toISOString()}
"""

import pygame
import sys
from typing import List, Dict, Any

class Game:
    def __init__(self):
        pygame.init()
        
        self.width = ${gameConfig.width || 800}
        self.height = ${gameConfig.height || 600}
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("${gameConfig.name || 'Game'}")
        
        self.clock = pygame.time.Clock()
        self.running = True
        self.entities = []
        self.scenes = {}
        self.current_scene = None
        
        self.init()
    
    def init(self):
        """Initialize game components"""
        self.load_assets()
        self.create_scenes()
        self.set_scene('menu')
        
        print(f"Game initialized: ${gameConfig.name || 'Untitled Game'}")
    
    def load_assets(self):
        """Load game assets"""
        # TODO: Load sprites, sounds, etc.
        pass
    
    def create_scenes(self):
        """Create game scenes"""
        self.scenes['menu'] = {
            'name': 'Menu',
            'entities': [],
            'update': self.update_menu,
            'render': self.render_menu
        }
        
        self.scenes['game'] = {
            'name': 'Game',
            'entities': [],
            'update': self.update_game,
            'render': self.render_game
        }
    
    def set_scene(self, scene_name: str):
        """Set current scene"""
        self.current_scene = self.scenes.get(scene_name)
    
    def update_menu(self):
        """Update menu scene"""
        pass
    
    def render_menu(self):
        """Render menu scene"""
        self.screen.fill((44, 62, 80))  # Dark blue background
        
        font_large = pygame.font.Font(None, 72)
        font_small = pygame.font.Font(None, 36)
        
        title_text = font_large.render("${gameConfig.name || 'Game'}", True, (255, 255, 255))
        title_rect = title_text.get_rect(center=(self.width // 2, self.height // 2 - 50))
        self.screen.blit(title_text, title_rect)
        
        start_text = font_small.render("Press SPACE to Start", True, (255, 255, 255))
        start_rect = start_text.get_rect(center=(self.width // 2, self.height // 2 + 50))
        self.screen.blit(start_text, start_rect)
    
    def update_game(self):
        """Update game scene"""
        for entity in self.entities:
            entity.update()
    
    def render_game(self):
        """Render game scene"""
        self.screen.fill((52, 73, 94))  # Darker background
        
        for entity in self.entities:
            entity.render(self.screen)
    
    def handle_events(self):
        """Handle pygame events"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and self.current_scene == self.scenes['menu']:
                    self.start_game()
    
    def start_game(self):
        """Start the game"""
        self.set_scene('game')
    
    def update(self):
        """Update game state"""
        if self.current_scene:
            self.current_scene['update']()
    
    def render(self):
        """Render game"""
        if self.current_scene:
            self.current_scene['render']()
        
        pygame.display.flip()
    
    def run(self):
        """Main game loop"""
        while self.running:
            self.handle_events()
            self.update()
            self.render()
            self.clock.tick(60)  # 60 FPS
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()
`;
  }

  private generateTypeScriptMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    update(): void;
    render(ctx: CanvasRenderingContext2D): void;
}

interface Scene {
    name: string;
    entities: Entity[];
    update(): void;
    render(ctx: CanvasRenderingContext2D): void;
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = ${gameConfig.width || 800};
    private height: number = ${gameConfig.height || 600};
    private entities: Entity[] = [];
    private scenes: Map<string, Scene> = new Map();
    private currentScene: Scene | null = null;
    private gameRunning: boolean = false;
    
    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.init();
    }
    
    private init(): void {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.setupEventListeners();
        this.loadAssets();
        this.createScenes();
        
        console.log('Game initialized: ${gameConfig.name || 'Untitled Game'}');
    }
    
    private setupEventListeners(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e: KeyboardEvent) => this.handleKeyUp(e));
        this.canvas.addEventListener('click', (e: MouseEvent) => this.handleClick(e));
    }
    
    private loadAssets(): void {
        // TODO: Load game assets
    }
    
    private createScenes(): void {
        // Create main menu scene
        this.scenes.set('menu', {
            name: 'Menu',
            entities: [],
            update: () => {},
            render: (ctx: CanvasRenderingContext2D) => {
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(0, 0, this.width, this.height);
                
                ctx.fillStyle = 'white';
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('${gameConfig.name || 'Game'}', this.width / 2, this.height / 2 - 50);
                
                ctx.font = '24px Arial';
                ctx.fillText('Click to Start', this.width / 2, this.height / 2 + 50);
            }
        });
        
        // Create game scene
        this.scenes.set('game', {
            name: 'Game',
            entities: [],
            update: () => {
                // Game logic here
            },
            render: (ctx: CanvasRenderingContext2D) => {
                ctx.fillStyle = '#34495e';
                ctx.fillRect(0, 0, this.width, this.height);
                
                // Render game entities
                this.entities.forEach(entity => entity.render(ctx));
            }
        });
        
        this.setScene('menu');
    }
    
    public setScene(sceneName: string): void {
        this.currentScene = this.scenes.get(sceneName) || null;
    }
    
    private handleKeyDown(event: KeyboardEvent): void {
        // Handle key press
    }
    
    private handleKeyUp(event: KeyboardEvent): void {
        // Handle key release
    }
    
    private handleClick(event: MouseEvent): void {
        if (this.currentScene === this.scenes.get('menu')) {
            this.startGame();
        }
    }
    
    public startGame(): void {
        this.setScene('game');
        this.gameRunning = true;
        this.gameLoop();
    }
    
    private gameLoop(): void {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    private update(): void {
        if (this.currentScene) {
            this.currentScene.update();
        }
        
        this.entities.forEach(entity => entity.update());
    }
    
    private render(): void {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (this.currentScene) {
            this.currentScene.render(this.ctx);
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Game();
});
`;
  }

  private generateJavaMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Game extends JPanel implements ActionListener, KeyListener {
    private static final int WIDTH = ${gameConfig.width || 800};
    private static final int HEIGHT = ${gameConfig.height || 600};
    private static final int FPS = 60;
    
    private Timer gameTimer;
    private List<Entity> entities;
    private Map<String, Scene> scenes;
    private Scene currentScene;
    private boolean gameRunning = false;
    
    public Game() {
        this.entities = new ArrayList<>();
        this.scenes = new HashMap<>();
        
        initializeGame();
    }
    
    private void initializeGame() {
        setPreferredSize(new Dimension(WIDTH, HEIGHT));
        setBackground(Color.BLACK);
        setFocusable(true);
        addKeyListener(this);
        
        loadAssets();
        createScenes();
        setScene("menu");
        
        gameTimer = new Timer(1000 / FPS, this);
        gameTimer.start();
        
        System.out.println("Game initialized: ${gameConfig.name || 'Untitled Game'}");
    }
    
    private void loadAssets() {
        // TODO: Load game assets
    }
    
    private void createScenes() {
        // Create menu scene
        scenes.put("menu", new Scene("Menu") {
            @Override
            public void update() {
                // Menu update logic
            }
            
            @Override
            public void render(Graphics2D g2d) {
                g2d.setColor(new Color(44, 62, 80));
                g2d.fillRect(0, 0, WIDTH, HEIGHT);
                
                g2d.setColor(Color.WHITE);
                g2d.setFont(new Font("Arial", Font.BOLD, 48));
                FontMetrics fm = g2d.getFontMetrics();
                String title = "${gameConfig.name || 'Game'}";
                int x = (WIDTH - fm.stringWidth(title)) / 2;
                g2d.drawString(title, x, HEIGHT / 2 - 25);
                
                g2d.setFont(new Font("Arial", Font.PLAIN, 24));
                fm = g2d.getFontMetrics();
                String subtitle = "Press SPACE to Start";
                x = (WIDTH - fm.stringWidth(subtitle)) / 2;
                g2d.drawString(subtitle, x, HEIGHT / 2 + 25);
            }
        });
        
        // Create game scene
        scenes.put("game", new Scene("Game") {
            @Override
            public void update() {
                entities.forEach(Entity::update);
            }
            
            @Override
            public void render(Graphics2D g2d) {
                g2d.setColor(new Color(52, 73, 94));
                g2d.fillRect(0, 0, WIDTH, HEIGHT);
                
                entities.forEach(entity -> entity.render(g2d));
            }
        });
    }
    
    public void setScene(String sceneName) {
        currentScene = scenes.get(sceneName);
    }
    
    public void startGame() {
        setScene("game");
        gameRunning = true;
    }
    
    @Override
    public void actionPerformed(ActionEvent e) {
        update();
        repaint();
    }
    
    private void update() {
        if (currentScene != null) {
            currentScene.update();
        }
    }
    
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2d = (Graphics2D) g;
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        if (currentScene != null) {
            currentScene.render(g2d);
        }
    }
    
    @Override
    public void keyPressed(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.VK_SPACE && currentScene == scenes.get("menu")) {
            startGame();
        }
    }
    
    @Override
    public void keyReleased(KeyEvent e) {}
    
    @Override
    public void keyTyped(KeyEvent e) {}
    
    // Abstract classes and interfaces
    abstract class Scene {
        protected String name;
        
        public Scene(String name) {
            this.name = name;
        }
        
        public abstract void update();
        public abstract void render(Graphics2D g2d);
    }
    
    abstract class Entity {
        protected int x, y, width, height;
        
        public Entity(int x, int y, int width, int height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        
        public abstract void update();
        public abstract void render(Graphics2D g2d);
    }
    
    public static void main(String[] args) {
        JFrame frame = new JFrame("${gameConfig.name || 'Game'}");
        Game game = new Game();
        
        frame.add(game);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setResizable(false);
        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }
}
`;
  }

  private generateCSharpMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace GeneratedGame
{
    public partial class Game : Form
    {
        private const int WIDTH = ${gameConfig.width || 800};
        private const int HEIGHT = ${gameConfig.height || 600};
        private const int FPS = 60;
        
        private Timer gameTimer;
        private List<Entity> entities;
        private Dictionary<string, Scene> scenes;
        private Scene currentScene;
        private bool gameRunning = false;
        
        public Game()
        {
            entities = new List<Entity>();
            scenes = new Dictionary<string, Scene>();
            
            InitializeGame();
        }
        
        private void InitializeGame()
        {
            this.Text = "${gameConfig.name || 'Game'}";
            this.Size = new Size(WIDTH + 16, HEIGHT + 39);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.DoubleBuffered = true;
            
            this.KeyPreview = true;
            this.KeyDown += OnKeyDown;
            this.Paint += OnPaint;
            
            LoadAssets();
            CreateScenes();
            SetScene("menu");
            
            gameTimer = new Timer();
            gameTimer.Interval = 1000 / FPS;
            gameTimer.Tick += GameTimer_Tick;
            gameTimer.Start();
            
            Console.WriteLine("Game initialized: ${gameConfig.name || 'Untitled Game'}");
        }
        
        private void LoadAssets()
        {
            // TODO: Load game assets
        }
        
        private void CreateScenes()
        {
            // Create menu scene
            scenes["menu"] = new MenuScene();
            
            // Create game scene
            scenes["game"] = new GameScene(entities);
        }
        
        public void SetScene(string sceneName)
        {
            if (scenes.ContainsKey(sceneName))
            {
                currentScene = scenes[sceneName];
            }
        }
        
        public void StartGame()
        {
            SetScene("game");
            gameRunning = true;
        }
        
        private void GameTimer_Tick(object sender, EventArgs e)
        {
            Update();
            Invalidate();
        }
        
        private void Update()
        {
            currentScene?.Update();
        }
        
        private void OnPaint(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            
            currentScene?.Render(g);
        }
        
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Space && currentScene == scenes["menu"])
            {
                StartGame();
            }
        }
        
        // Scene classes
        private class MenuScene : Scene
        {
            public override void Update()
            {
                // Menu update logic
            }
            
            public override void Render(Graphics g)
            {
                g.Clear(Color.FromArgb(44, 62, 80));
                
                using (Font titleFont = new Font("Arial", 48, FontStyle.Bold))
                using (Font subtitleFont = new Font("Arial", 24))
                using (Brush whiteBrush = new SolidBrush(Color.White))
                {
                    string title = "${gameConfig.name || 'Game'}";
                    SizeF titleSize = g.MeasureString(title, titleFont);
                    g.DrawString(title, titleFont, whiteBrush, 
                        (WIDTH - titleSize.Width) / 2, HEIGHT / 2 - 50);
                    
                    string subtitle = "Press SPACE to Start";
                    SizeF subtitleSize = g.MeasureString(subtitle, subtitleFont);
                    g.DrawString(subtitle, subtitleFont, whiteBrush, 
                        (WIDTH - subtitleSize.Width) / 2, HEIGHT / 2 + 50);
                }
            }
        }
        
        private class GameScene : Scene
        {
            private List<Entity> entities;
            
            public GameScene(List<Entity> entities)
            {
                this.entities = entities;
            }
            
            public override void Update()
            {
                foreach (var entity in entities)
                {
                    entity.Update();
                }
            }
            
            public override void Render(Graphics g)
            {
                g.Clear(Color.FromArgb(52, 73, 94));
                
                foreach (var entity in entities)
                {
                    entity.Render(g);
                }
            }
        }
        
        // Abstract classes
        public abstract class Scene
        {
            public abstract void Update();
            public abstract void Render(Graphics g);
        }
        
        public abstract class Entity
        {
            public int X { get; set; }
            public int Y { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            
            public Entity(int x, int y, int width, int height)
            {
                X = x;
                Y = y;
                Width = width;
                Height = height;
            }
            
            public abstract void Update();
            public abstract void Render(Graphics g);
        }
        
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Game());
        }
    }
}
`;
  }

  private generateRustMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

use std::collections::HashMap;

// Simple game framework using macroquad
use macroquad::prelude::*;

#[derive(Debug, Clone)]
pub struct Entity {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Entity {
    pub fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self { x, y, width, height }
    }
    
    pub fn update(&mut self) {
        // Entity update logic
    }
    
    pub fn render(&self) {
        draw_rectangle(self.x, self.y, self.width, self.height, WHITE);
    }
}

pub trait Scene {
    fn update(&mut self);
    fn render(&self);
}

pub struct MenuScene {
    title: String,
}

impl MenuScene {
    pub fn new(title: String) -> Self {
        Self { title }
    }
}

impl Scene for MenuScene {
    fn update(&mut self) {
        // Menu update logic
    }
    
    fn render(&self) {
        clear_background(Color::from_rgba(44, 62, 80, 255));
        
        let title_size = 48.0;
        let subtitle_size = 24.0;
        
        let title_dims = measure_text(&self.title, None, title_size as u16, 1.0);
        draw_text(
            &self.title,
            (screen_width() - title_dims.width) / 2.0,
            screen_height() / 2.0 - 25.0,
            title_size,
            WHITE,
        );
        
        let subtitle = "Press SPACE to Start";
        let subtitle_dims = measure_text(subtitle, None, subtitle_size as u16, 1.0);
        draw_text(
            subtitle,
            (screen_width() - subtitle_dims.width) / 2.0,
            screen_height() / 2.0 + 25.0,
            subtitle_size,
            WHITE,
        );
    }
}

pub struct GameScene {
    entities: Vec<Entity>,
}

impl GameScene {
    pub fn new() -> Self {
        Self {
            entities: Vec::new(),
        }
    }
}

impl Scene for GameScene {
    fn update(&mut self) {
        for entity in &mut self.entities {
            entity.update();
        }
    }
    
    fn render(&self) {
        clear_background(Color::from_rgba(52, 73, 94, 255));
        
        for entity in &self.entities {
            entity.render();
        }
    }
}

pub struct Game {
    scenes: HashMap<String, Box<dyn Scene>>,
    current_scene: String,
    game_running: bool,
}

impl Game {
    pub fn new() -> Self {
        let mut game = Self {
            scenes: HashMap::new(),
            current_scene: String::from("menu"),
            game_running: false,
        };
        
        game.init();
        game
    }
    
    fn init(&mut self) {
        // Create scenes
        self.scenes.insert(
            "menu".to_string(),
            Box::new(MenuScene::new("${gameConfig.name || 'Game'}".to_string())),
        );
        self.scenes.insert(
            "game".to_string(),
            Box::new(GameScene::new()),
        );
        
        println!("Game initialized: ${gameConfig.name || 'Untitled Game'}");
    }
    
    pub fn set_scene(&mut self, scene_name: &str) {
        if self.scenes.contains_key(scene_name) {
            self.current_scene = scene_name.to_string();
        }
    }
    
    pub fn start_game(&mut self) {
        self.set_scene("game");
        self.game_running = true;
    }
    
    pub fn handle_input(&mut self) {
        if is_key_pressed(KeyCode::Space) && self.current_scene == "menu" {
            self.start_game();
        }
    }
    
    pub fn update(&mut self) {
        self.handle_input();
        
        if let Some(scene) = self.scenes.get_mut(&self.current_scene) {
            scene.update();
        }
    }
    
    pub fn render(&self) {
        if let Some(scene) = self.scenes.get(&self.current_scene) {
            scene.render();
        }
    }
}

#[macroquad::main("${gameConfig.name || 'Game'}")]
async fn main() {
    request_new_screen_size(${gameConfig.width || 800.0}, ${gameConfig.height || 600.0});
    
    let mut game = Game::new();
    
    loop {
        game.update();
        game.render();
        
        next_frame().await
    }
}
`;
  }

  private generateGoMain(gameConfig: any): string {
    return `// Generated Game: ${gameConfig.name || 'Untitled Game'}
// Generated on: ${new Date().toISOString()}

package main

import (
    "fmt"
    "image/color"
    "log"
    
    "github.com/hajimehoshi/ebiten/v2"
    "github.com/hajimehoshi/ebiten/v2/ebitenutil"
    "github.com/hajimehoshi/ebiten/v2/text"
    "golang.org/x/image/font/basicfont"
)

const (
    ScreenWidth  = ${gameConfig.width || 800}
    ScreenHeight = ${gameConfig.height || 600}
)

type Entity struct {
    X, Y          float64
    Width, Height float64
}

func (e *Entity) Update() {
    // Entity update logic
}

func (e *Entity) Draw(screen *ebiten.Image) {
    ebitenutil.DrawRect(screen, e.X, e.Y, e.Width, e.Height, color.White)
}

type Scene interface {
    Update() error
    Draw(screen *ebiten.Image)
}

type MenuScene struct {
    title string
}

func NewMenuScene(title string) *MenuScene {
    return &MenuScene{title: title}
}

func (s *MenuScene) Update() error {
    return nil
}

func (s *MenuScene) Draw(screen *ebiten.Image) {
    screen.Fill(color.RGBA{44, 62, 80, 255})
    
    // Draw title
    titleX := ScreenWidth/2 - len(s.title)*6
    text.Draw(screen, s.title, basicfont.Face7x13, titleX, ScreenHeight/2-25, color.White)
    
    // Draw subtitle
    subtitle := "Press SPACE to Start"
    subtitleX := ScreenWidth/2 - len(subtitle)*3
    text.Draw(screen, subtitle, basicfont.Face7x13, subtitleX, ScreenHeight/2+25, color.White)
}

type GameScene struct {
    entities []*Entity
}

func NewGameScene() *GameScene {
    return &GameScene{
        entities: make([]*Entity, 0),
    }
}

func (s *GameScene) Update() error {
    for _, entity := range s.entities {
        entity.Update()
    }
    return nil
}

func (s *GameScene) Draw(screen *ebiten.Image) {
    screen.Fill(color.RGBA{52, 73, 94, 255})
    
    for _, entity := range s.entities {
        entity.Draw(screen)
    }
}

type Game struct {
    scenes       map[string]Scene
    currentScene string
    gameRunning  bool
}

func NewGame() *Game {
    g := &Game{
        scenes:       make(map[string]Scene),
        currentScene: "menu",
        gameRunning:  false,
    }
    
    g.init()
    return g
}

func (g *Game) init() {
    // Create scenes
    g.scenes["menu"] = NewMenuScene("${gameConfig.name || 'Game'}")
    g.scenes["game"] = NewGameScene()
    
    fmt.Println("Game initialized: ${gameConfig.name || 'Untitled Game'}")
}

func (g *Game) SetScene(sceneName string) {
    if _, exists := g.scenes[sceneName]; exists {
        g.currentScene = sceneName
    }
}

func (g *Game) StartGame() {
    g.SetScene("game")
    g.gameRunning = true
}

func (g *Game) handleInput() {
    if ebiten.IsKeyPressed(ebiten.KeySpace) && g.currentScene == "menu" {
        g.StartGame()
    }
}

func (g *Game) Update() error {
    g.handleInput()
    
    if scene, exists := g.scenes[g.currentScene]; exists {
        return scene.Update()
    }
    
    return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
    if scene, exists := g.scenes[g.currentScene]; exists {
        scene.Draw(screen)
    }
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (screenWidth, screenHeight int) {
    return ScreenWidth, ScreenHeight
}

func main() {
    ebiten.SetWindowSize(ScreenWidth, ScreenHeight)
    ebiten.SetWindowTitle("${gameConfig.name || 'Game'}")
    
    game := NewGame()
    
    if err := ebiten.RunGame(game); err != nil {
        log.Fatal(err)
    }
}
`;
  }

  // Продолжение следует с методами для генерации других файлов...
  private generateEntitiesFile(gameConfig: any, language: LanguageConfig): string {
    // Генерация файла с игровыми сущностями
    return `// Generated entities for ${language.displayName}\n// TODO: Implement game entities`;
  }

  private generateScenesFile(gameConfig: any, language: LanguageConfig): string {
    // Генерация файла со сценами
    return `// Generated scenes for ${language.displayName}\n// TODO: Implement game scenes`;
  }

  private generateUtilsFile(gameConfig: any, language: LanguageConfig): string {
    // Генерация утилит
    return `// Generated utilities for ${language.displayName}\n// TODO: Implement utility functions`;
  }

  private generateGameConfigFile(gameConfig: any, language: LanguageConfig): string {
    // Генерация конфигурационного файла
    switch (language.id) {
      case 'javascript':
      case 'typescript':
        return `export const gameConfig = ${JSON.stringify(gameConfig, null, 2)};`;
      case 'python':
        return `# Game configuration\nGAME_CONFIG = ${JSON.stringify(gameConfig, null, 2).replace(/"/g, "'")}`;
      case 'java':
        return `public class GameConfig {\n    // TODO: Implement configuration\n}`;
      case 'csharp':
        return `public static class GameConfig {\n    // TODO: Implement configuration\n}`;
      default:
        return `// Game configuration\n// TODO: Implement configuration`;
    }
  }

  private generateTestsFile(gameConfig: any, language: LanguageConfig): string {
    // Генерация тестов
    switch (language.id) {
      case 'javascript':
        return `// Jest tests for ${gameConfig.name || 'Game'}\ndescribe('Game', () => {\n    test('should initialize', () => {\n        // TODO: Add tests\n    });\n});`;
      case 'python':
        return `# pytest tests for ${gameConfig.name || 'Game'}\nimport unittest\n\nclass TestGame(unittest.TestCase):\n    def test_init(self):\n        # TODO: Add tests\n        pass`;
      case 'java':
        return `// JUnit tests for ${gameConfig.name || 'Game'}\nimport org.junit.Test;\n\npublic class GameTest {\n    @Test\n    public void testInit() {\n        // TODO: Add tests\n    }\n}`;
      default:
        return `// Tests for ${gameConfig.name || 'Game'}\n// TODO: Implement tests`;
    }
  }

  private generatePackageJson(projectStructure: any, language: LanguageConfig): string {
    const packageJson = {
      name: projectStructure.name,
      version: projectStructure.version,
      description: projectStructure.description,
      main: projectStructure.main,
      scripts: {
        start: "node " + projectStructure.main,
        build: "echo 'Build not configured'",
        test: "echo 'Tests not configured'"
      },
      dependencies: {},
      devDependencies: {}
    };
    
    return JSON.stringify(packageJson, null, 2);
  }

  private generateRequirementsTxt(language: LanguageConfig): string {
    return "# Python dependencies\npygame>=2.0.0\n# Add more dependencies as needed";
  }

  private generateCargoToml(projectStructure: any): string {
    return `[package]
name = "${projectStructure.name}"
version = "${projectStructure.version}"
edition = "2021"

[dependencies]
macroquad = "0.3"
`;
  }

  private generatePomXml(projectStructure: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.generated</groupId>
    <artifactId>${projectStructure.name}</artifactId>
    <version>${projectStructure.version}</version>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
    
    <dependencies>
        <!-- Add dependencies here -->
    </dependencies>
</project>
`;
  }

  private generateCsProj(projectStructure: any): string {
    return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net6.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <AssemblyName>${projectStructure.name}</AssemblyName>
  </PropertyGroup>
</Project>
`;
  }

  private generateReadme(generatedCode: GeneratedCode, language: LanguageConfig): string {
    return `# ${generatedCode.projectStructure.name}

${generatedCode.projectStructure.description}

## Generated Information
- **Language:** ${language.displayName}
- **Generated on:** ${generatedCode.metadata.generatedAt.toISOString()}
- **Total files:** ${generatedCode.metadata.totalFiles}

## How to Run

${this.getRunInstructions(language)}

## Dependencies

${generatedCode.metadata.dependencies.length > 0 ? 
  generatedCode.metadata.dependencies.map(dep => `- ${dep}`).join('\n') : 
  'No external dependencies required.'}

## File Structure

\`\`\`
${generatedCode.files.map(file => file.path).join('\n')}
\`\`\`

## Generated with AI Game Generator

This project was automatically generated using the AI Game Generator system.
`;
  }

  private generateGitignore(language: LanguageConfig): string {
    switch (language.id) {
      case 'javascript':
      case 'typescript':
        return `node_modules/
dist/
*.log
.env
.DS_Store
`;
      case 'python':
        return `__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.tox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
`;
      case 'java':
        return `*.class
*.jar
*.war
*.ear
*.nar
hs_err_pid*
target/
.m2/
.gradle/
build/
!gradle/wrapper/gradle-wrapper.jar
.gradletasknamecache
`;
      case 'csharp':
        return `bin/
obj/
*.user
*.suo
*.userosscache
*.sln.docstates
.vs/
packages/
*.nupkg
*.snupkg
project.lock.json
project.fragment.lock.json
artifacts/
`;
      case 'rust':
        return `target/
Cargo.lock
**/*.rs.bk
*.pdb
`;
      case 'go':
        return `# Binaries for programs and plugins
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary, built with \`go test -c\`
*.test

# Output of the go coverage tool
*.out

# Dependency directories
vendor/

# Go workspace file
go.work
`;
      default:
        return `# Generated files
*.log
.DS_Store
`;
    }
  }

  private generateDockerfile(language: LanguageConfig): string {
    switch (language.id) {
      case 'javascript':
      case 'typescript':
        return `FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
      case 'python':
        return `FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
`;
      case 'java':
        return `FROM openjdk:11-jre-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
`;
      case 'go':
        return `FROM golang:1.19-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
CMD ["./main"]
`;
      default:
        return `# Dockerfile for ${language.displayName}
# TODO: Implement Dockerfile
`;
    }
  }

  private getRunInstructions(language: LanguageConfig): string {
    switch (language.id) {
      case 'javascript':
        return `1. Make sure you have Node.js installed
2. Run: \`npm install\` (if dependencies are needed)
3. Run: \`node ${this.getMainFileName(language)}\``;
      case 'typescript':
        return `1. Make sure you have Node.js and TypeScript installed
2. Run: \`npm install\`
3. Run: \`npx tsc\` to compile
4. Run: \`node ${this.getMainFileName(language).replace('.ts', '.js')}\``;
      case 'python':
        return `1. Make sure you have Python 3.7+ installed
2. Install dependencies: \`pip install -r requirements.txt\`
3. Run: \`python ${this.getMainFileName(language)}\``;
      case 'java':
        return `1. Make sure you have Java 11+ installed
2. Compile: \`javac *.java\`
3. Run: \`java Game\`

Or with Maven:
1. Run: \`mvn compile exec:java\``;
      case 'csharp':
        return `1. Make sure you have .NET 6+ installed
2. Run: \`dotnet build\`
3. Run: \`dotnet run\``;
      case 'rust':
        return `1. Make sure you have Rust installed
2. Run: \`cargo build\`
3. Run: \`cargo run\``;
      case 'go':
        return `1. Make sure you have Go 1.19+ installed
2. Install dependencies: \`go mod tidy\`
3. Run: \`go run main.go\``;
      default:
        return `Check the ${language.displayName} documentation for running instructions.`;
    }
  }

  private getMainFileName(language: LanguageConfig): string {
    switch (language.id) {
      case 'javascript': return 'main.js';
      case 'typescript': return 'main.ts';
      case 'python': return 'main.py';
      case 'java': return 'Game.java';
      case 'csharp': return 'Game.cs';
      case 'rust': return 'main.rs';
      case 'go': return 'main.go';
      default: return `main.${language.fileExtension}`;
    }
  }

  private async performConversion(job: ConversionJob): Promise<void> {
    job.status = 'processing';
    job.progress = 10;

    try {
      // Имитация процесса конвертации
      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        job.progress = i * 10;
      }

      // Генерируем код на целевом языке
      const gameConfig = { name: 'Converted Game', width: 800, height: 600 };
      const generatedCode = await this.generateGame({
        gameConfig,
        targetLanguage: job.targetLanguage,
        outputFormat: 'multi_file',
        optimizations: {
          minify: false,
          obfuscate: false,
          bundleAssets: false,
          generateDocs: true,
          includeTests: false
        }
      });

      job.generatedCode = generatedCode;
      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();
      job.duration = job.endTime.getTime() - job.startTime.getTime();

      // Добавляем предупреждения о различиях языков
      job.warnings.push(`Code converted from ${job.sourceLanguage} to ${job.targetLanguage}`);
      job.conversionNotes.push({
        type: 'manual_fix_required',
        message: 'Manual review of converted code is recommended',
        suggestion: 'Check language-specific features and syntax'
      });

      this.emit('conversionCompleted', job);
      logger.info(`Code conversion completed: ${job.id}`);

    } catch (error) {
      job.status = 'failed';
      job.errors.push({
        type: 'runtime',
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      });
    }
  }

  private async createProjectDirectory(code: GeneratedCode): Promise<string> {
    const projectPath = join(process.cwd(), 'temp', code.id);
    
    // Создаем директорию проекта
    await fs.mkdir(projectPath, { recursive: true });
    
    // Записываем все файлы
    for (const file of code.files) {
      const filePath = join(projectPath, file.path);
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      
      if (dir !== projectPath) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      await fs.writeFile(filePath, file.content);
    }
    
    return projectPath;
  }

  private async createArchive(projectPath: string, format: 'zip' | 'tar.gz'): Promise<string> {
    // В реальной реализации здесь была бы генерация архива
    const archivePath = `${projectPath}.${format}`;
    // TODO: Implement actual archiving
    return archivePath;
  }

  private updateMetadata(generatedCode: GeneratedCode): void {
    generatedCode.metadata.totalFiles = generatedCode.files.length;
    generatedCode.metadata.totalSize = generatedCode.files.reduce((sum, file) => sum + file.size, 0);
    
    // Обновляем инструкции
    const language = this.languages.get(generatedCode.language);
    if (language) {
      generatedCode.metadata.buildInstructions = this.getBuildInstructions(language);
      generatedCode.metadata.runInstructions = this.getRunInstructions(language).split('\n');
    }
  }

  private getBuildInstructions(language: LanguageConfig): string[] {
    switch (language.id) {
      case 'java':
        return ['javac *.java', 'Or: mvn compile'];
      case 'csharp':
        return ['dotnet build'];
      case 'rust':
        return ['cargo build'];
      case 'go':
        return ['go build'];
      case 'typescript':
        return ['npx tsc'];
      default:
        return [];
    }
  }

  private initializeLanguages(): void {
    // JavaScript
    this.languages.set('javascript', {
      id: 'javascript',
      name: 'javascript',
      displayName: 'JavaScript',
      version: 'ES2020',
      fileExtension: 'js',
      runtime: {
        type: 'interpreted',
        executable: 'node',
        runCommand: 'node main.js',
        packageManager: 'npm',
        dependencies: []
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '  ',
        lineEnding: '\n',
        commentStyle: 'line',
        namingConvention: 'camelCase',
        classStyle: 'class',
        moduleSystem: 'es6'
      },
      features: {
        objectOriented: true,
        functional: true,
        typeSafety: 'dynamic',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['Phaser', 'Three.js', 'PixiJS', 'Babylon.js']
      },
      libraries: {
        graphics: ['Canvas API', 'WebGL', 'Three.js', 'PixiJS'],
        audio: ['Web Audio API', 'Howler.js'],
        input: ['DOM Events', 'Gamepad API'],
        physics: ['Matter.js', 'Cannon.js', 'Ammo.js'],
        ui: ['React', 'Vue', 'Vanilla JS'],
        networking: ['WebSockets', 'Fetch API', 'Socket.io'],
        storage: ['localStorage', 'IndexedDB', 'WebSQL']
      },
      documentation: {
        officialDocs: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // Python
    this.languages.set('python', {
      id: 'python',
      name: 'python',
      displayName: 'Python',
      version: '3.9+',
      fileExtension: 'py',
      runtime: {
        type: 'interpreted',
        executable: 'python',
        runCommand: 'python main.py',
        packageManager: 'pip',
        dependencies: ['pygame']
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '    ',
        lineEnding: '\n',
        commentStyle: 'line',
        namingConvention: 'snake_case',
        classStyle: 'class'
      },
      features: {
        objectOriented: true,
        functional: true,
        typeSafety: 'dynamic',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['Pygame', 'Panda3D', 'Arcade', 'Pyglet']
      },
      libraries: {
        graphics: ['Pygame', 'Panda3D', 'Arcade', 'Pyglet'],
        audio: ['Pygame.mixer', 'PyAudio'],
        input: ['Pygame.event', 'Keyboard'],
        physics: ['Pymunk', 'PyBox2D'],
        ui: ['Tkinter', 'PyQt', 'Kivy'],
        networking: ['Requests', 'Socket', 'Twisted'],
        storage: ['SQLite', 'Pickle', 'JSON']
      },
      documentation: {
        officialDocs: 'https://docs.python.org/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // TypeScript
    this.languages.set('typescript', {
      id: 'typescript',
      name: 'typescript',
      displayName: 'TypeScript',
      version: '4.9+',
      fileExtension: 'ts',
      runtime: {
        type: 'transpiled',
        executable: 'node',
        runCommand: 'node main.js',
        buildCommand: 'npx tsc',
        packageManager: 'npm',
        dependencies: ['typescript']
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '  ',
        lineEnding: '\n',
        commentStyle: 'line',
        namingConvention: 'camelCase',
        classStyle: 'class',
        moduleSystem: 'es6'
      },
      features: {
        objectOriented: true,
        functional: true,
        typeSafety: 'static',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['Phaser', 'Three.js', 'PixiJS', 'Babylon.js']
      },
      libraries: {
        graphics: ['Canvas API', 'WebGL', 'Three.js', 'PixiJS'],
        audio: ['Web Audio API', 'Howler.js'],
        input: ['DOM Events', 'Gamepad API'],
        physics: ['Matter.js', 'Cannon.js', 'Ammo.js'],
        ui: ['React', 'Vue', 'Angular'],
        networking: ['WebSockets', 'Fetch API', 'Socket.io'],
        storage: ['localStorage', 'IndexedDB']
      },
      documentation: {
        officialDocs: 'https://www.typescriptlang.org/docs/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // Java
    this.languages.set('java', {
      id: 'java',
      name: 'java',
      displayName: 'Java',
      version: '11+',
      fileExtension: 'java',
      runtime: {
        type: 'compiled',
        executable: 'java',
        compileCommand: 'javac *.java',
        runCommand: 'java Game',
        buildCommand: 'mvn compile',
        packageManager: 'maven',
        dependencies: []
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '    ',
        lineEnding: '\n',
        commentStyle: 'both',
        namingConvention: 'camelCase',
        classStyle: 'class'
      },
      features: {
        objectOriented: true,
        functional: true,
        typeSafety: 'static',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['LibGDX', 'LWJGL', 'jMonkeyEngine']
      },
      libraries: {
        graphics: ['Swing', 'JavaFX', 'LWJGL', 'LibGDX'],
        audio: ['Java Sound API', 'OpenAL'],
        input: ['AWT Events', 'LWJGL Input'],
        physics: ['JBox2D', 'Bullet Physics'],
        ui: ['Swing', 'JavaFX'],
        networking: ['Java.net', 'Netty'],
        storage: ['JDBC', 'JPA', 'File I/O']
      },
      documentation: {
        officialDocs: 'https://docs.oracle.com/en/java/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // C#
    this.languages.set('csharp', {
      id: 'csharp',
      name: 'csharp',
      displayName: 'C#',
      version: '.NET 6+',
      fileExtension: 'cs',
      runtime: {
        type: 'compiled',
        executable: 'dotnet',
        buildCommand: 'dotnet build',
        runCommand: 'dotnet run',
        packageManager: 'nuget',
        dependencies: []
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '    ',
        lineEnding: '\n',
        commentStyle: 'both',
        namingConvention: 'PascalCase',
        classStyle: 'class'
      },
      features: {
        objectOriented: true,
        functional: true,
        typeSafety: 'static',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['Unity', 'MonoGame', 'Godot']
      },
      libraries: {
        graphics: ['WinForms', 'WPF', 'MonoGame', 'Unity'],
        audio: ['.NET Audio', 'FMOD', 'OpenAL'],
        input: ['Windows Forms Events', 'Unity Input'],
        physics: ['Unity Physics', 'Bullet Sharp'],
        ui: ['WinForms', 'WPF', 'Unity UI'],
        networking: ['System.Net', 'SignalR'],
        storage: ['Entity Framework', 'System.IO']
      },
      documentation: {
        officialDocs: 'https://docs.microsoft.com/en-us/dotnet/csharp/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // Rust
    this.languages.set('rust', {
      id: 'rust',
      name: 'rust',
      displayName: 'Rust',
      version: '1.65+',
      fileExtension: 'rs',
      runtime: {
        type: 'compiled',
        executable: 'cargo',
        buildCommand: 'cargo build',
        runCommand: 'cargo run',
        packageManager: 'cargo',
        dependencies: ['macroquad']
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '    ',
        lineEnding: '\n',
        commentStyle: 'line',
        namingConvention: 'snake_case',
        classStyle: 'function'
      },
      features: {
        objectOriented: false,
        functional: true,
        typeSafety: 'static',
        memoryManagement: 'manual',
        concurrency: true,
        webSupport: true,
        mobileSupport: false,
        desktopSupport: true,
        gameEngines: ['Bevy', 'Amethyst', 'Macroquad', 'Piston']
      },
      libraries: {
        graphics: ['Macroquad', 'Bevy', 'wgpu', 'glow'],
        audio: ['Rodio', 'Bevy Audio'],
        input: ['Winit', 'Bevy Input'],
        physics: ['Rapier', 'nphysics'],
        ui: ['Egui', 'Conrod', 'Iced'],
        networking: ['Tokio', 'async-std'],
        storage: ['serde', 'rusqlite']
      },
      documentation: {
        officialDocs: 'https://doc.rust-lang.org/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    // Go
    this.languages.set('go', {
      id: 'go',
      name: 'go',
      displayName: 'Go',
      version: '1.19+',
      fileExtension: 'go',
      runtime: {
        type: 'compiled',
        executable: 'go',
        buildCommand: 'go build',
        runCommand: 'go run main.go',
        packageManager: 'go mod',
        dependencies: ['github.com/hajimehoshi/ebiten/v2']
      },
      templates: {
        gameTemplate: '',
        entityTemplate: '',
        sceneTemplate: '',
        componentTemplate: '',
        utilsTemplate: '',
        mainTemplate: '',
        configTemplate: ''
      },
      generation: {
        indentation: '\t',
        lineEnding: '\n',
        commentStyle: 'line',
        namingConvention: 'camelCase',
        classStyle: 'function'
      },
      features: {
        objectOriented: false,
        functional: true,
        typeSafety: 'static',
        memoryManagement: 'garbage_collected',
        concurrency: true,
        webSupport: true,
        mobileSupport: true,
        desktopSupport: true,
        gameEngines: ['Ebiten', 'Engo', 'Oak']
      },
      libraries: {
        graphics: ['Ebiten', 'OpenGL', 'Vulkan'],
        audio: ['Ebiten Audio', 'Beep'],
        input: ['Ebiten Input'],
        physics: ['Chipmunk-Go'],
        ui: ['Fyne', 'Wails'],
        networking: ['net/http', 'gorilla/websocket'],
        storage: ['database/sql', 'encoding/json']
      },
      documentation: {
        officialDocs: 'https://golang.org/doc/',
        tutorials: [],
        examples: [],
        community: []
      }
    });

    logger.info(`Initialized ${this.languages.size} programming languages`);
  }

  private generateCodeId(): string {
    return `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Получение статистики
  public getStats(): {
    supportedLanguages: number;
    totalGenerations: number;
    totalConversions: number;
    popularLanguages: Record<string, number>;
    conversionSuccess: number;
  } {
    const generations = Array.from(this.generatedCode.values());
    const conversions = Array.from(this.conversionJobs.values());

    const languageCount: Record<string, number> = {};
    generations.forEach(gen => {
      languageCount[gen.language] = (languageCount[gen.language] || 0) + 1;
    });

    const successfulConversions = conversions.filter(job => job.status === 'completed').length;

    return {
      supportedLanguages: this.languages.size,
      totalGenerations: generations.length,
      totalConversions: conversions.length,
      popularLanguages: languageCount,
      conversionSuccess: conversions.length > 0 ? (successfulConversions / conversions.length) * 100 : 0
    };
  }
}

export const multiLanguageGenerationService = new MultiLanguageGenerationService();
export { MultiLanguageGenerationService }; 