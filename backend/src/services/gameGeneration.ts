import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import config from '@/config';
import { LoggerService } from './logger';
import { DeepSeekService } from './ai/deepseek';
import { OpenAIService } from './ai/openai';
import { YandexValidator } from './validator';
import { BuildService } from './build';
import { templateManager } from '../../templates/games';
import { 
  GenerationRequest, 
  GameDesign, 
  BuildResult, 
  AssetRequirement,
  FileStructure 
} from '@/types';
import { GenerationError } from '@/middleware/errorHandler';

export type ProgressCallback = (step: string, progress: number, logs?: string[]) => void;

export class GameGenerationPipeline {
  private logger: LoggerService;
  private deepseek: DeepSeekService;
  private openai: OpenAIService;
  private validator: YandexValidator;
  private buildService: BuildService;

  constructor() {
    this.logger = new LoggerService();
    this.deepseek = new DeepSeekService();
    this.openai = new OpenAIService();
    this.validator = new YandexValidator();
    this.buildService = new BuildService();
  }

  public async execute(
    request: GenerationRequest,
    onProgress: ProgressCallback
  ): Promise<BuildResult> {
    const gameId = request.id;
    const startTime = Date.now();

    try {
      this.logger.generationStart(gameId, request.prompt);

      // 1. Анализ и обогащение промпта (5%)
      onProgress('Анализ промпта', 5, ['Анализируем требования к игре...']);
      const enrichedPrompt = await this.enrichPrompt(request.prompt);

      // 2. Генерация Game Design Document (15%)
      onProgress('Создание дизайна игры', 15, ['Генерируем концепцию и механики...']);
      const gameDesign = await this.generateGameDesign(enrichedPrompt);

      // 3. Создание структуры проекта (25%)
      onProgress('Создание структуры проекта', 25, ['Создаем файловую структуру...']);
      const projectStructure = await this.createProjectStructure(gameDesign);

      // 4. Генерация кода игры (50%)
      onProgress('Генерация кода', 50, ['Создаем код игры с помощью AI...']);
      const gameCode = await this.generateGameCode(gameDesign);

      // 5. Генерация ассетов (70%)
      onProgress('Генерация ассетов', 70, ['Создаем графику и звуки...']);
      const assets = await this.generateAssets(gameDesign);

      // 6. Интеграция Yandex SDK (80%)
      onProgress('Интеграция Yandex SDK', 80, ['Добавляем интеграцию с платформой...']);
      const integratedCode = await this.integrateYandexSDK(gameCode, gameDesign);

      // 7. Сборка проекта (90%)
      onProgress('Сборка проекта', 90, ['Собираем финальную версию игры...']);
      const buildResult = await this.buildProject(
        gameId,
        projectStructure,
        integratedCode,
        assets,
        gameDesign
      );

      // 8. Валидация (95%)
      onProgress('Валидация', 95, ['Проверяем соответствие требованиям...']);
      await this.validateGame(buildResult);

      // 9. Создание архива (100%)
      onProgress('Создание архива', 100, ['Упаковываем игру для скачивания...']);
      const finalResult = await this.createGameArchive(buildResult);

      const duration = Date.now() - startTime;
      this.logger.generationComplete(gameId, duration, finalResult.size);

      return finalResult;

    } catch (error) {
      this.logger.generationError(gameId, 'pipeline', error);
      throw new GenerationError(
        `Ошибка генерации игры: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'pipeline',
        error
      );
    }
  }

  private async enrichPrompt(prompt: any): Promise<any> {
    // Добавляем дополнительную информацию к промпту
    return {
      ...prompt,
      targetPlatform: 'yandex_games',
      technicalRequirements: {
        maxSize: config.yandexGames.maxSize,
        targetSize: config.yandexGames.targetSize,
        supportedFormats: config.yandexGames.supportedFormats,
        sdkVersion: config.yandexGames.requiredSDKVersion,
      },
    };
  }

  private async generateGameDesign(prompt: any): Promise<GameDesign> {
    try {
      const response = await this.deepseek.generateGameDesign(
        `Создай игру "${prompt.title}" в жанре "${prompt.genre}": ${prompt.description}`
      );

      // Парсим JSON ответ
      const designJson = this.extractJsonFromResponse(response.content);
      
      if (!designJson) {
        throw new Error('Не удалось извлечь JSON из ответа AI');
      }

      return designJson as GameDesign;
      
    } catch (error) {
      throw new GenerationError('Ошибка генерации дизайна игры', 'game_design', error);
    }
  }

  private async createProjectStructure(gameDesign: GameDesign): Promise<FileStructure> {
    const structure: FileStructure = {
      'index.html': '',
      'game.js': '',
      'style.css': '',
      'manifest.json': '',
      'assets/': {
        'sprites/': {},
        'backgrounds/': {},
        'ui/': {},
        'sounds/': {},
      },
      'src/': {
        'scenes/': {},
        'objects/': {},
        'utils/': {},
      },
    };

    return structure;
  }

  private async generateGameCode(gameDesign: GameDesign): Promise<{ [filename: string]: string }> {
    const code: { [filename: string]: string } = {};

    try {
      // Проверяем, есть ли шаблон для данного жанра
      const template = templateManager.getTemplate(gameDesign.genre);
      
      if (template) {
        // Используем шаблон для генерации игры
        this.logger.logInfo('generation', `Используем шаблон для жанра: ${gameDesign.genre}`);
        
        const gamePrompt = {
          title: gameDesign.title,
          genre: gameDesign.genre,
          description: gameDesign.description,
          artStyle: gameDesign.artStyle,
          targetAudience: gameDesign.targetAudience,
          monetization: gameDesign.monetization
        };

        const templateResult = template.generateCode(gamePrompt, gameDesign);
        
        code['index.html'] = templateResult.html;
        code['game.js'] = templateResult.js;
        code['style.css'] = templateResult.css;
        
      } else {
        // Fallback к генерации через AI
        this.logger.logWarn('generation', `Шаблон для жанра ${gameDesign.genre} не найден, используем AI генерацию`);
        
        // Генерируем основной HTML файл
        code['index.html'] = await this.generateHTML(gameDesign);

        // Генерируем основной JavaScript файл
        const mainJsResponse = await this.deepseek.generateCode(
          `Создай основной JavaScript файл для игры "${gameDesign.title}" с использованием Phaser 3`,
          this.getMainJSSystemPrompt()
        );
        code['game.js'] = mainJsResponse.content;

        // Генерируем CSS
        code['style.css'] = await this.generateCSS(gameDesign);
      }

      // Генерируем manifest.json (всегда одинаковый)
      code['manifest.json'] = await this.generateManifest(gameDesign);

      return code;

    } catch (error) {
      throw new GenerationError('Ошибка генерации кода игры', 'code_generation', error);
    }
  }

  private async generateAssets(gameDesign: GameDesign): Promise<{ [path: string]: Buffer }> {
    const assets: { [path: string]: Buffer } = {};

    try {
      // Проверяем, есть ли шаблон для генерации ассетов
      const templateAssets = templateManager.generateAssets(gameDesign.genre, gameDesign);
      
      if (templateAssets) {
        this.logger.logInfo('generation', `Используем шаблон ассетов для жанра: ${gameDesign.genre}`);
        
        // Генерируем спрайты из шаблона
        for (const spriteReq of templateAssets.sprites) {
          try {
            const result = await this.openai.generateSprite(
              spriteReq.prompt,
              gameDesign.artStyle || 'pixel art',
              { width: 32, height: 32 }
            );
            assets[`assets/sprites/${spriteReq.name}.png`] = result.data;
          } catch (error) {
            this.logger.logWarn('generation', `Ошибка генерации спрайта ${spriteReq.name}: ${error.message}`);
          }
        }

        // Генерируем фоны из шаблона
        for (const backgroundReq of templateAssets.backgrounds) {
          try {
            const result = await this.openai.generateBackground(
              backgroundReq.prompt,
              gameDesign.artStyle || 'pixel art'
            );
            assets[`assets/backgrounds/${backgroundReq.name}.png`] = result.data;
          } catch (error) {
            this.logger.logWarn('generation', `Ошибка генерации фона ${backgroundReq.name}: ${error.message}`);
          }
        }

        // Генерируем звуки из шаблона
        for (const soundReq of templateAssets.sounds) {
          try {
            const result = await this.openai.generateSound(
              soundReq.prompt,
              1000
            );
            assets[`assets/sounds/${soundReq.name}.wav`] = result.data;
          } catch (error) {
            this.logger.logWarn('generation', `Ошибка генерации звука ${soundReq.name}: ${error.message}`);
          }
        }
        
      } else {
        // Fallback к генерации через стандартные ассеты
        this.logger.logWarn('generation', `Шаблон ассетов для жанра ${gameDesign.genre} не найден, используем стандартную генерацию`);
        
        // Генерируем спрайты
        for (const asset of gameDesign.assets.filter(a => a.type === 'sprite')) {
          const result = await this.openai.generateSprite(
            asset.description,
            asset.style,
            asset.dimensions
          );
          assets[`assets/sprites/${asset.name}.png`] = result.data;
        }

        // Генерируем фоны
        for (const asset of gameDesign.assets.filter(a => a.type === 'background')) {
          const result = await this.openai.generateBackground(
            asset.description,
            asset.style
          );
          assets[`assets/backgrounds/${asset.name}.png`] = result.data;
        }

        // Генерируем UI элементы
        for (const asset of gameDesign.assets.filter(a => a.type === 'ui')) {
          const result = await this.openai.generateUIElement(
            asset.name,
            asset.style,
            asset.description
          );
          assets[`assets/ui/${asset.name}.png`] = result.data;
        }

        // Генерируем звуки
        for (const asset of gameDesign.assets.filter(a => a.type === 'sound')) {
          const result = await this.openai.generateSound(
            asset.description,
            asset.duration || 1000
          );
          assets[`assets/sounds/${asset.name}.wav`] = result.data;
        }
      }

      return assets;

    } catch (error) {
      throw new GenerationError('Ошибка генерации ассетов', 'asset_generation', error);
    }
  }

  private async integrateYandexSDK(
    gameCode: { [filename: string]: string },
    gameDesign: GameDesign
  ): Promise<{ [filename: string]: string }> {
    try {
      // Импортируем YandexSDKIntegrator
      const { YandexSDKIntegrator } = await import('../yandex-sdk/integration');

      // Создаем конфигурацию SDK на основе дизайна игры
      const sdkConfig = YandexSDKIntegrator.createSDKConfig(gameDesign);

      // Интегрируем SDK в код игры
      gameCode['index.html'] = YandexSDKIntegrator.integrateIntoGame(
        gameCode['index.html'],
        sdkConfig
      );

      this.logger.logInfo('integration', `Интеграция Yandex SDK завершена с конфигурацией: ${JSON.stringify(sdkConfig)}`);

      return gameCode;

    } catch (error) {
      throw new GenerationError('Ошибка интеграции Yandex SDK', 'sdk_integration', error);
    }
  }

  private async buildProject(
    gameId: string,
    structure: FileStructure,
    code: { [filename: string]: string },
    assets: { [path: string]: Buffer },
    gameDesign: GameDesign
  ): Promise<BuildResult> {
    try {
      return await this.buildService.build({
        gameId,
        structure,
        code,
        assets,
        gameDesign,
        outputPath: path.join(config.generation.outputPath, gameId),
      });
    } catch (error) {
      throw new GenerationError('Ошибка сборки проекта', 'build', error);
    }
  }

  private async validateGame(buildResult: BuildResult): Promise<void> {
    try {
      const validation = await this.validator.validateGame(buildResult.outputPath);
      
      if (!validation.isValid) {
        const errors = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Игра не прошла валидацию: ${errors}`);
      }
    } catch (error) {
      throw new GenerationError('Ошибка валидации игры', 'validation', error);
    }
  }

  private async createGameArchive(buildResult: BuildResult): Promise<BuildResult> {
    try {
      const archivePath = `${buildResult.outputPath}.zip`;
      
      await new Promise<void>((resolve, reject) => {
        const output = require('fs').createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(buildResult.outputPath, false);
        archive.finalize();
      });

      const stats = await fs.stat(archivePath);

      return {
        ...buildResult,
        outputPath: archivePath,
        size: stats.size,
      };

    } catch (error) {
      throw new GenerationError('Ошибка создания архива', 'archive', error);
    }
  }

  // Вспомогательные методы для генерации базовых файлов

  private async generateHTML(gameDesign: GameDesign): Promise<string> {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gameDesign.title}</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://yandex.ru/games/sdk/v2"></script>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
</head>
<body>
    <div id="game-container"></div>
    <script src="src/yandex-integration.js"></script>
    <script src="src/scenes/MainMenu.js"></script>
    <script src="src/scenes/GameScene.js"></script>
    <script src="src/scenes/GameOver.js"></script>
    <script src="game.js"></script>
</body>
</html>`;
  }

  private async generateCSS(gameDesign: GameDesign): Promise<string> {
    return `body {
    margin: 0;
    padding: 0;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: Arial, sans-serif;
}

#game-container {
    max-width: 100vw;
    max-height: 100vh;
}

canvas {
    display: block;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}`;
  }

  private async generateManifest(gameDesign: GameDesign): Promise<string> {
    const manifest = {
      name: gameDesign.title,
      version: "1.0.0",
      description: gameDesign.description,
      author: "AI Game Generator",
      files: [
        "index.html",
        "game.js",
        "style.css"
      ],
      requirements: {
        yandexSDK: config.yandexGames.requiredSDKVersion
      }
    };

    return JSON.stringify(manifest, null, 2);
  }

  private getMainJSSystemPrompt(): string {
    return `
Создай основной JavaScript файл для Phaser 3 игры.

Требования:
1. Используй Phaser 3.70+
2. Настрой конфигурацию игры для Yandex Games
3. Инициализируй все сцены
4. Добавь адаптивность для мобильных устройств
5. Включи базовую интеграцию с Yandex SDK
6. Оптимизируй для производительности

Структура:
- Конфигурация Phaser
- Инициализация игры
- Обработчики событий
- Утилиты
`;
  }



  private extractJsonFromResponse(content: string): any {
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // Если не найден в блоке кода, пытаемся парсить весь ответ
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn('Не удалось извлечь JSON из ответа AI:', { content, error });
      return null;
    }
  }
} 