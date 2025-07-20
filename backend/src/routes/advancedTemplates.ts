import { Router, Request, Response } from 'express';
import { advancedTemplatesService } from '../services/advancedTemplates';
import { logger } from '../services/logger';
import { analyticsService } from '../services/analytics';
import multer from 'multer';
import { join } from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';

const router = Router();

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ШАБЛОНЫ

// GET /api/advanced-templates/templates - получение списка шаблонов
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      category, 
      genre, 
      difficulty, 
      author, 
      tags, 
      sortBy, 
      page, 
      limit 
    } = req.query;

    const filters = {
      category: category as string,
      genre: genre as string,
      difficulty: difficulty as string,
      author: author as string,
      tags: tags ? (tags as string).split(',') : undefined,
      sortBy: sortBy as string
    };

    const templates = await advancedTemplatesService.searchTemplates(
      query as string || '', 
      filters
    );

    // Пагинация
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    await analyticsService.trackEvent('templates_searched', {
      query: query || '',
      resultsCount: templates.length,
      filters
    });

    res.json({
      success: true,
      data: {
        templates: paginatedTemplates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: templates.length,
          pages: Math.ceil(templates.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении шаблонов'
    });
  }
});

// GET /api/advanced-templates/templates/:templateId - получение конкретного шаблона
router.get('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = advancedTemplatesService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Шаблон не найден'
      });
    }

    await analyticsService.trackEvent('template_viewed', {
      templateId,
      name: template.name,
      category: template.category
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении шаблона'
    });
  }
});

// POST /api/advanced-templates/templates - создание нового шаблона
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const templateData = req.body;

    if (!templateData.name) {
      return res.status(400).json({
        success: false,
        error: 'Требуется название шаблона'
      });
    }

    const template = await advancedTemplatesService.createTemplate(templateData);

    await analyticsService.trackEvent('template_created', {
      templateId: template.id,
      name: template.name,
      category: template.category,
      author: template.author
    });

    logger.info(`Template created: ${template.name} (${template.id})`);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании шаблона'
    });
  }
});

// PUT /api/advanced-templates/templates/:templateId - обновление шаблона
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    const template = await advancedTemplatesService.updateTemplate(templateId, updates);

    await analyticsService.trackEvent('template_updated', {
      templateId,
      name: template.name
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении шаблона'
    });
  }
});

// DELETE /api/advanced-templates/templates/:templateId - удаление шаблона
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    await advancedTemplatesService.deleteTemplate(templateId);

    await analyticsService.trackEvent('template_deleted', {
      templateId
    });

    res.json({
      success: true,
      message: 'Шаблон успешно удален'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении шаблона'
    });
  }
});

// POST /api/advanced-templates/templates/:templateId/publish - публикация шаблона
router.post('/templates/:templateId/publish', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const template = await advancedTemplatesService.publishTemplate(templateId);

    await analyticsService.trackEvent('template_published', {
      templateId,
      name: template.name,
      category: template.category
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error publishing template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при публикации шаблона'
    });
  }
});

// КОМПОНЕНТЫ

// GET /api/advanced-templates/components - получение списка компонентов
router.get('/components', async (req: Request, res: Response) => {
  try {
    const { query, type, category } = req.query;

    const filters = {
      type: type as string,
      category: category as string
    };

    const components = await advancedTemplatesService.searchComponents(
      query as string || '',
      filters
    );

    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    logger.error('Error getting components:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении компонентов'
    });
  }
});

// GET /api/advanced-templates/components/:componentId - получение конкретного компонента
router.get('/components/:componentId', async (req: Request, res: Response) => {
  try {
    const { componentId } = req.params;
    const component = advancedTemplatesService.getComponent(componentId);

    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Компонент не найден'
      });
    }

    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    logger.error('Error getting component:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении компонента'
    });
  }
});

// POST /api/advanced-templates/components - создание нового компонента
router.post('/components', async (req: Request, res: Response) => {
  try {
    const componentData = req.body;

    if (!componentData.name || !componentData.type) {
      return res.status(400).json({
        success: false,
        error: 'Требуются название и тип компонента'
      });
    }

    const component = await advancedTemplatesService.createComponent(componentData);

    await analyticsService.trackEvent('component_created', {
      componentId: component.id,
      name: component.name,
      type: component.type
    });

    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    logger.error('Error creating component:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании компонента'
    });
  }
});

// GET /api/advanced-templates/components/:componentId/code - генерация кода компонента
router.get('/components/:componentId/code', async (req: Request, res: Response) => {
  try {
    const { componentId } = req.params;
    const { language } = req.query;

    const component = advancedTemplatesService.getComponent(componentId);
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Компонент не найден'
      });
    }

    const code = await advancedTemplatesService.generateComponentCode(
      component,
      language as string || 'javascript'
    );

    res.json({
      success: true,
      data: {
        code,
        language: language || 'javascript'
      }
    });
  } catch (error) {
    logger.error('Error generating component code:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при генерации кода компонента'
    });
  }
});

// АССЕТЫ

// GET /api/advanced-templates/assets - получение списка ассетов
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const { query, type, category } = req.query;

    const filters = {
      type: type as string,
      category: category as string
    };

    const assets = await advancedTemplatesService.searchAssets(
      query as string || '',
      filters
    );

    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    logger.error('Error getting assets:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении ассетов'
    });
  }
});

// GET /api/advanced-templates/assets/:assetId - получение конкретного ассета
router.get('/assets/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const asset = advancedTemplatesService.getAsset(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Ассет не найден'
      });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    logger.error('Error getting asset:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении ассета'
    });
  }
});

// POST /api/advanced-templates/assets - добавление нового ассета
router.post('/assets', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const assetData = JSON.parse(req.body.data || '{}');
    const file = req.file;

    if (!assetData.name || !assetData.type) {
      return res.status(400).json({
        success: false,
        error: 'Требуются название и тип ассета'
      });
    }

    const asset = await advancedTemplatesService.addAsset(assetData, file?.buffer);

    await analyticsService.trackEvent('asset_added', {
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      size: asset.size
    });

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    logger.error('Error adding asset:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении ассета'
    });
  }
});

// КОНСТРУКТОР ШАБЛОНОВ

// POST /api/advanced-templates/builder - создание нового конструктора
router.post('/builder', async (req: Request, res: Response) => {
  try {
    const { templateId, userId } = req.body;

    if (!templateId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Требуются templateId и userId'
      });
    }

    const builder = await advancedTemplatesService.createBuilder(templateId, userId);

    await analyticsService.trackEvent('builder_created', {
      builderId: builder.id,
      templateId,
      userId
    });

    res.json({
      success: true,
      data: builder
    });
  } catch (error) {
    logger.error('Error creating builder:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании конструктора'
    });
  }
});

// GET /api/advanced-templates/builder/:builderId - получение конструктора
router.get('/builder/:builderId', async (req: Request, res: Response) => {
  try {
    const { builderId } = req.params;
    const builder = advancedTemplatesService.getBuilder(builderId);

    if (!builder) {
      return res.status(404).json({
        success: false,
        error: 'Конструктор не найден'
      });
    }

    res.json({
      success: true,
      data: builder
    });
  } catch (error) {
    logger.error('Error getting builder:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении конструктора'
    });
  }
});

// PUT /api/advanced-templates/builder/:builderId/step - обновление шага конструктора
router.put('/builder/:builderId/step', async (req: Request, res: Response) => {
  try {
    const { builderId } = req.params;
    const { stepId, configuration } = req.body;

    if (!stepId || !configuration) {
      return res.status(400).json({
        success: false,
        error: 'Требуются stepId и configuration'
      });
    }

    const builder = await advancedTemplatesService.updateBuilderStep(
      builderId,
      stepId,
      configuration
    );

    await analyticsService.trackEvent('builder_step_updated', {
      builderId,
      stepId,
      configurationKeys: Object.keys(configuration)
    });

    res.json({
      success: true,
      data: builder
    });
  } catch (error) {
    logger.error('Error updating builder step:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении шага конструктора'
    });
  }
});

// POST /api/advanced-templates/builder/:builderId/generate - генерация игры
router.post('/builder/:builderId/generate', async (req: Request, res: Response) => {
  try {
    const { builderId } = req.params;

    const result = await advancedTemplatesService.generateGame(builderId);

    await analyticsService.trackEvent('game_generated_from_builder', {
      builderId,
      gameId: result.gameId,
      filesCount: result.files.length
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error generating game:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при генерации игры'
    });
  }
});

// СТАТИСТИКА И КАТЕГОРИИ

// GET /api/advanced-templates/categories - получение категорий
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const stats = advancedTemplatesService.getStats();
    
    const categories = {
      templates: Object.keys(stats.templates.byCategory),
      components: Object.keys(stats.components.byCategory),
      assets: Object.keys(stats.assets.byType)
    };

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении категорий'
    });
  }
});

// GET /api/advanced-templates/stats - получение статистики
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = advancedTemplatesService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении статистики'
    });
  }
});

// РЕКОМЕНДАЦИИ

// GET /api/advanced-templates/recommendations - получение рекомендаций
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { userId, category, difficulty, limit } = req.query;

    // Простая система рекомендаций
    const filters = {
      category: category as string,
      difficulty: difficulty as string,
      sortBy: 'rating'
    };

    const templates = await advancedTemplatesService.searchTemplates('', filters);
    const recommendations = templates.slice(0, parseInt(limit as string) || 5);

    await analyticsService.trackEvent('recommendations_viewed', {
      userId: userId as string,
      count: recommendations.length,
      category,
      difficulty
    });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении рекомендаций'
    });
  }
});

// ЭКСПОРТ И ИМПОРТ

// GET /api/advanced-templates/:templateId/export - Экспорт шаблона
router.get('/:templateId/export', [
  param('templateId').isUUID(),
  query('format').optional().isIn(['json', 'zip'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { templateId } = req.params;
    const { format } = req.query as { format?: 'json' | 'zip' };

    const template = await advancedTemplatesService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    let exportData;
    let contentType;
    let fileName;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(template, null, 2);
        contentType = 'application/json';
        fileName = `template-${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        break;
        
      case 'zip':
        // Создаем ZIP архив с файлами шаблона
        const archivePath = await createTemplateZip(template);
        
        // Читаем созданный архив
        const archiveBuffer = await fs.readFile(archivePath);
        
        // Очищаем временный файл
        await fs.unlink(archivePath).catch(() => {});
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="template-${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip"`);
        return res.send(archiveBuffer);
        
      default:
        exportData = JSON.stringify(template, null, 2);
        contentType = 'application/json';
        fileName = `template-${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    }

    await analyticsService.trackEvent('template_exported', {
      templateId,
      format: format || 'json'
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(exportData);
    
  } catch (error) {
    logger.error('Error exporting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export template'
    });
  }
});

// Функция создания ZIP архива шаблона
async function createTemplateZip(template: any): Promise<string> {
  const tempDir = join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const archivePath = join(tempDir, `template-${template.id}.zip`);
  
  return new Promise<string>((resolve, reject) => {
    const output = require('fs').createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      logger.info(`✅ Архив шаблона создан: ${archivePath} (${archive.pointer()} bytes)`);
      resolve(archivePath);
    });
    
    archive.on('error', reject);
    
    archive.pipe(output);
    
    // Добавляем основной файл шаблона
    archive.append(JSON.stringify(template, null, 2), { name: 'template.json' });
    
    // Добавляем README с описанием
    const readme = generateTemplateReadme(template);
    archive.append(readme, { name: 'README.md' });
    
    // Если есть файлы в шаблоне, добавляем их
    if (template.files && Array.isArray(template.files)) {
      template.files.forEach((file: any, index: number) => {
        const fileName = file.name || `file${index + 1}.${file.type || 'txt'}`;
        const fileContent = file.content || `// ${file.description || 'Template file'}`;
        archive.append(fileContent, { name: `files/${fileName}` });
      });
    }
    
    // Добавляем конфигурационные файлы если есть
    if (template.config) {
      archive.append(JSON.stringify(template.config, null, 2), { name: 'config.json' });
    }
    
    // Добавляем примеры использования
    if (template.examples) {
      template.examples.forEach((example: any, index: number) => {
        const exampleContent = typeof example === 'string' ? example : JSON.stringify(example, null, 2);
        archive.append(exampleContent, { name: `examples/example${index + 1}.json` });
      });
    }
    
    archive.finalize();
  });
}

// Генерация README для шаблона
function generateTemplateReadme(template: any): string {
  return `# ${template.name}

${template.description || 'Шаблон для создания игр'}

## Информация о шаблоне

- **Версия**: ${template.version || '1.0.0'}
- **Категория**: ${template.category || 'Общая'}
- **Теги**: ${template.tags ? template.tags.join(', ') : 'Не указаны'}
- **Создан**: ${template.createdAt || 'Неизвестно'}

## Файлы

${template.files ? template.files.map((file: any, index: number) => 
  `- \`${file.name || `file${index + 1}`}\` - ${file.description || 'Файл шаблона'}`
).join('\n') : 'Файлы отсутствуют'}

## Использование

1. Распакуйте архив
2. Откройте \`template.json\` для просмотра конфигурации
3. Изучите файлы в папке \`files/\`
4. При наличии - посмотрите примеры в папке \`examples/\`

## Примечания

${template.notes || 'Дополнительные примечания отсутствуют'}

---

Сгенерировано GameIDE Advanced Templates System
`;
}

// POST /api/advanced-templates/import - импорт шаблона
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { format } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Требуется файл для импорта'
      });
    }

    let templateData;
    
    // Проверяем тип файла
    if (file.mimetype === 'application/zip' || file.originalname?.endsWith('.zip')) {
      // Импорт из ZIP архива
      templateData = await importTemplateFromZip(file.buffer);
    } else {
      // Импорт из JSON файла
      try {
        const fileContent = file.buffer.toString('utf8');
        templateData = JSON.parse(fileContent);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Неверный формат файла'
        });
      }
    }

    // Очищаем ID чтобы создать новый шаблон
    delete templateData.id;
    templateData.status = 'draft';
    templateData.name = `${templateData.name} (Imported)`;

    const template = await advancedTemplatesService.createTemplate(templateData);

    await analyticsService.trackEvent('template_imported', {
      templateId: template.id,
      originalName: templateData.name,
      format: format || (file.mimetype === 'application/zip' ? 'zip' : 'json')
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error importing template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при импорте шаблона'
    });
  }
});

// Функция импорта шаблона из ZIP архива
async function importTemplateFromZip(zipBuffer: Buffer): Promise<any> {
  const yauzl = require('yauzl');
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err: any, zipfile: any) => {
      if (err) {
        reject(new Error('Ошибка чтения ZIP архива'));
        return;
      }

      let templateData: any = null;
      const files: any[] = [];
      const examples: any[] = [];
      let config: any = null;
      let processedEntries = 0;
      let totalEntries = 0;

      // Подсчитываем общее количество файлов
      zipfile.on('entry', () => totalEntries++);
      zipfile.readEntry();

      // Перезапускаем для обработки
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) {
          reject(new Error('Ошибка повторного чтения ZIP архива'));
          return;
        }

        zipfile.on('entry', (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            // Это папка
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err: any, readStream: any) => {
            if (err) {
              reject(err);
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readStream.on('end', () => {
              const content = Buffer.concat(chunks).toString('utf8');
              
              // Обрабатываем файлы по имени
              const fileName = path.basename(entry.fileName);
              const dirName = path.dirname(entry.fileName);

              if (fileName === 'template.json') {
                try {
                  templateData = JSON.parse(content);
                } catch (error) {
                  reject(new Error('Неверный формат template.json'));
                  return;
                }
              } else if (fileName === 'config.json') {
                try {
                  config = JSON.parse(content);
                } catch (error) {
                  logger.warn('Неверный формат config.json, пропускаем');
                }
              } else if (dirName.includes('files')) {
                files.push({
                  name: fileName,
                  content: content,
                  type: path.extname(fileName).slice(1) || 'txt',
                  description: `Импортированный файл: ${fileName}`
                });
              } else if (dirName.includes('examples')) {
                try {
                  const exampleData = JSON.parse(content);
                  examples.push(exampleData);
                } catch (error) {
                  // Если не JSON, добавляем как текст
                  examples.push({
                    name: fileName,
                    content: content
                  });
                }
              }

              processedEntries++;
              
              // Когда все файлы обработаны
              if (processedEntries === totalEntries) {
                if (!templateData) {
                  reject(new Error('template.json не найден в архиве'));
                  return;
                }

                // Дополняем templateData импортированными данными
                if (files.length > 0) {
                  templateData.files = files;
                }
                if (examples.length > 0) {
                  templateData.examples = examples;
                }
                if (config) {
                  templateData.config = { ...templateData.config, ...config };
                }

                resolve(templateData);
              } else {
                zipfile.readEntry();
              }
            });
          });
        });

        zipfile.on('end', () => {
          if (processedEntries === 0) {
            reject(new Error('Архив пуст'));
          }
        });

        zipfile.readEntry();
      });
    });
  });
}

// ВАЛИДАЦИЯ

// POST /api/advanced-templates/validate - валидация шаблона
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { templateData } = req.body;

    if (!templateData) {
      return res.status(400).json({
        success: false,
        error: 'Требуются данные шаблона'
      });
    }

    // Создаем временный шаблон для валидации
    const tempTemplate = {
      ...templateData,
      id: 'temp-validation',
      status: 'draft'
    };

    try {
      // Валидация через попытку создания (но без сохранения)
      await advancedTemplatesService.createTemplate(tempTemplate);
      
      res.json({
        success: true,
        data: {
          valid: true,
          message: 'Шаблон прошел валидацию'
        }
      });
    } catch (validationError) {
      res.json({
        success: true,
        data: {
          valid: false,
          errors: [validationError.message]
        }
      });
    }
  } catch (error) {
    logger.error('Error validating template:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при валидации шаблона'
    });
  }
});

export default router; 