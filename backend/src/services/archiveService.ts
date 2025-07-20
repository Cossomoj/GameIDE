import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import yauzl from 'yauzl';
import { LoggerService } from './logger';

export interface ArchiveOptions {
  compression?: 'zip' | 'tar' | 'tar.gz';
  compressionLevel?: number;
  excludePatterns?: string[];
  includeManifest?: boolean;
}

export interface ArchiveManifest {
  name: string;
  version: string;
  created: string;
  creator: string;
  files: Array<{
    path: string;
    size: number;
    hash?: string;
    type: string;
  }>;
  metadata?: Record<string, any>;
}

export class ArchiveService {
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  /**
   * Создает архив из указанной директории
   */
  async createArchive(
    sourceDir: string,
    outputPath: string,
    options: ArchiveOptions = {}
  ): Promise<{ path: string; size: number; manifest?: ArchiveManifest }> {
    const {
      compression = 'zip',
      compressionLevel = 9,
      excludePatterns = [],
      includeManifest = true
    } = options;

    try {
      this.logger.info(`📦 Создание архива: ${sourceDir} -> ${outputPath}`);

      // Убеждаемся что выходная директория существует
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Создаем манифест если требуется
      let manifest: ArchiveManifest | undefined;
      if (includeManifest) {
        manifest = await this.createManifest(sourceDir, excludePatterns);
      }

      const archivePath = await this.createArchiveByType(
        sourceDir,
        outputPath,
        compression,
        compressionLevel,
        excludePatterns,
        manifest
      );

      const stats = await fs.stat(archivePath);

      this.logger.info(`✅ Архив создан: ${archivePath} (${this.formatSize(stats.size)})`);

      return {
        path: archivePath,
        size: stats.size,
        manifest
      };

    } catch (error) {
      this.logger.error('Ошибка создания архива:', error);
      throw error;
    }
  }

  /**
   * Извлекает архив в указанную директорию
   */
  async extractArchive(
    archivePath: string,
    outputDir: string,
    options: { overwrite?: boolean } = {}
  ): Promise<{ extractedFiles: string[]; manifest?: ArchiveManifest }> {
    const { overwrite = false } = options;

    try {
      this.logger.info(`📂 Извлечение архива: ${archivePath} -> ${outputDir}`);

      // Убеждаемся что выходная директория существует
      await fs.mkdir(outputDir, { recursive: true });

      const fileExtension = path.extname(archivePath).toLowerCase();
      let extractedFiles: string[] = [];
      let manifest: ArchiveManifest | undefined;

      if (fileExtension === '.zip') {
        const result = await this.extractZipArchive(archivePath, outputDir, overwrite);
        extractedFiles = result.extractedFiles;
        manifest = result.manifest;
      } else {
        throw new Error(`Неподдерживаемый формат архива: ${fileExtension}`);
      }

      this.logger.info(`✅ Архив извлечен: ${extractedFiles.length} файлов`);

      return { extractedFiles, manifest };

    } catch (error) {
      this.logger.error('Ошибка извлечения архива:', error);
      throw error;
    }
  }

  /**
   * Создает архив для игры
   */
  async createGameArchive(
    gameDir: string,
    gameName: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const sanitizedName = gameName.replace(/[^a-zA-Z0-9а-яё\s]/gi, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const archiveName = `${sanitizedName}_${timestamp}.zip`;
    const outputPath = path.join(path.dirname(gameDir), archiveName);

    const result = await this.createArchive(gameDir, outputPath, {
      compression: 'zip',
      compressionLevel: 9,
      includeManifest: true,
      excludePatterns: ['*.log', '*.tmp', 'node_modules/**', '.git/**']
    });

    return result.path;
  }

  /**
   * Создает архив для шаблона
   */
  async createTemplateArchive(
    templateData: any,
    additionalFiles: Record<string, string> = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Основной файл шаблона
      archive.append(JSON.stringify(templateData, null, 2), { name: 'template.json' });

      // Дополнительные файлы
      Object.entries(additionalFiles).forEach(([fileName, content]) => {
        archive.append(content, { name: fileName });
      });

      // README
      const readme = this.generateTemplateReadme(templateData);
      archive.append(readme, { name: 'README.md' });

      // Манифест
      const manifest: ArchiveManifest = {
        name: templateData.name || 'Template',
        version: templateData.version || '1.0.0',
        created: new Date().toISOString(),
        creator: 'GameIDE Advanced Templates',
        files: [
          { path: 'template.json', size: 0, type: 'application/json' },
          { path: 'README.md', size: 0, type: 'text/markdown' },
          ...Object.keys(additionalFiles).map(fileName => ({
            path: fileName,
            size: 0,
            type: this.getFileType(fileName)
          }))
        ]
      };

      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      archive.finalize();
    });
  }

  // Приватные методы

  private async createArchiveByType(
    sourceDir: string,
    outputPath: string,
    compression: string,
    compressionLevel: number,
    excludePatterns: string[],
    manifest?: ArchiveManifest
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver(compression === 'tar.gz' ? 'tar' : compression, {
        zlib: { level: compressionLevel },
        gzip: compression === 'tar.gz'
      });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);

      // Добавляем файлы из директории
      archive.glob('**/*', {
        cwd: sourceDir,
        ignore: excludePatterns
      });

      // Добавляем манифест если требуется
      if (manifest) {
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      }

      archive.finalize();
    });
  }

  private async extractZipArchive(
    archivePath: string,
    outputDir: string,
    overwrite: boolean
  ): Promise<{ extractedFiles: string[]; manifest?: ArchiveManifest }> {
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        const extractedFiles: string[] = [];
        let manifest: ArchiveManifest | undefined;

        zipfile!.readEntry();

        zipfile!.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Это директория
            zipfile!.readEntry();
            return;
          }

          const outputPath = path.join(outputDir, entry.fileName);

          // Проверяем на перезапись
          if (!overwrite && require('fs').existsSync(outputPath)) {
            this.logger.warn(`Файл существует, пропускаем: ${entry.fileName}`);
            zipfile!.readEntry();
            return;
          }

          // Создаем директорию если не существует
          const dir = path.dirname(outputPath);
          require('fs').mkdirSync(dir, { recursive: true });

          zipfile!.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const writeStream = require('fs').createWriteStream(outputPath);

            writeStream.on('close', () => {
              extractedFiles.push(entry.fileName);

              // Проверяем манифест
              if (entry.fileName === 'manifest.json') {
                try {
                  const content = require('fs').readFileSync(outputPath, 'utf8');
                  manifest = JSON.parse(content);
                } catch (error) {
                  this.logger.warn('Не удалось прочитать манифест');
                }
              }

              zipfile!.readEntry();
            });

            readStream!.pipe(writeStream);
          });
        });

        zipfile!.on('end', () => {
          resolve({ extractedFiles, manifest });
        });
      });
    });
  }

  private async createManifest(
    sourceDir: string,
    excludePatterns: string[]
  ): Promise<ArchiveManifest> {
    const files: ArchiveManifest['files'] = [];

    const walkDir = async (dir: string, basePath = '') => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);

        // Проверяем исключения
        if (excludePatterns.some(pattern => 
          relativePath.includes(pattern.replace('**/', '').replace('*', ''))
        )) {
          continue;
        }

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await walkDir(fullPath, relativePath);
        } else {
          files.push({
            path: relativePath,
            size: stats.size,
            type: this.getFileType(relativePath)
          });
        }
      }
    };

    await walkDir(sourceDir);

    return {
      name: path.basename(sourceDir),
      version: '1.0.0',
      created: new Date().toISOString(),
      creator: 'GameIDE Archive Service',
      files
    };
  }

  private generateTemplateReadme(templateData: any): string {
    return `# ${templateData.name || 'Template'}

${templateData.description || 'Шаблон для создания игр'}

## Информация о шаблоне

- **Версия**: ${templateData.version || '1.0.0'}
- **Категория**: ${templateData.category || 'Общая'}
- **Теги**: ${templateData.tags ? templateData.tags.join(', ') : 'Не указаны'}
- **Создан**: ${templateData.createdAt || new Date().toISOString()}

## Структура архива

- \`template.json\` - Основные данные шаблона
- \`manifest.json\` - Манифест архива
- \`README.md\` - Данное описание

## Использование

1. Распакуйте архив
2. Откройте \`template.json\` для просмотра конфигурации
3. Импортируйте шаблон в GameIDE

## Примечания

${templateData.notes || 'Дополнительные примечания отсутствуют'}

---

Создано с помощью GameIDE Archive Service
`;
  }

  private getFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const typeMap: Record<string, string> = {
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    };

    return typeMap[ext] || 'application/octet-stream';
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const archiveService = new ArchiveService(); 