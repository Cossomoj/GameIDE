import { GameTemplate } from './base';
import { PlatformerTemplate } from './platformer';
import { ArcadeTemplate } from './arcade';
import { PuzzleTemplate } from './puzzle';
import { GamePrompt, GameDesign } from '../../src/types';

export class GameTemplateManager {
  private templates: Map<string, GameTemplate>;

  constructor() {
    this.templates = new Map();
    this.registerTemplates();
  }

  private registerTemplates(): void {
    // Регистрируем все доступные шаблоны
    const platformer = new PlatformerTemplate();
    const arcade = new ArcadeTemplate();
    const puzzle = new PuzzleTemplate();

    this.templates.set(platformer.genre, platformer);
    this.templates.set(arcade.genre, arcade);
    this.templates.set(puzzle.genre, puzzle);
  }

  public getTemplate(genre: string): GameTemplate | null {
    return this.templates.get(genre) || null;
  }

  public getSupportedGenres(): string[] {
    return Array.from(this.templates.keys());
  }

  public getTemplateInfo(genre: string): { name: string; description: string } | null {
    const template = this.templates.get(genre);
    if (!template) return null;

    return {
      name: template.name,
      description: template.description
    };
  }

  public generateGame(prompt: GamePrompt, design: GameDesign): {
    html: string;
    js: string;
    css: string;
  } | null {
    const template = this.getTemplate(prompt.genre);
    if (!template) {
      throw new Error(`Неподдерживаемый жанр: ${prompt.genre}`);
    }

    try {
      return template.generateCode(prompt, design);
    } catch (error) {
      throw new Error(`Ошибка генерации игры: ${error.message}`);
    }
  }

  public generateAssets(genre: string, design: GameDesign): {
    sprites: { name: string; prompt: string }[];
    sounds: { name: string; prompt: string }[];
    backgrounds: { name: string; prompt: string }[];
  } | null {
    const template = this.getTemplate(genre);
    if (!template || !template.generateAssets) return null;

    try {
      return template.generateAssets(design);
    } catch (error) {
      throw new Error(`Ошибка генерации ассетов: ${error.message}`);
    }
  }

  public validateGenre(genre: string): boolean {
    return this.templates.has(genre);
  }

  public getAllTemplates(): Array<{
    genre: string;
    name: string;
    description: string;
  }> {
    return Array.from(this.templates.entries()).map(([genre, template]) => ({
      genre,
      name: template.name,
      description: template.description
    }));
  }
}

// Создаем глобальный экземпляр менеджера
export const templateManager = new GameTemplateManager();

// Экспортируем типы и классы
export { GameTemplate } from './base';
export { PlatformerTemplate } from './platformer';
export { ArcadeTemplate } from './arcade';
export { PuzzleTemplate } from './puzzle'; 