import * as fs from 'fs';
import * as path from 'path';

/**
 * Утилита для обновления файла .env
 */
export class EnvWriter {
  private envPath: string;

  constructor(envPath: string = '.env') {
    this.envPath = path.resolve(envPath);
  }

  /**
   * Обновляет переменную окружения в файле .env
   */
  async updateEnvVariable(key: string, value: string): Promise<void> {
    try {
      let envContent = '';
      
      // Читаем существующий файл .env если он есть
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Разбиваем на строки
      const lines = envContent.split('\n');
      
      // Ищем строку с нужной переменной
      const keyPattern = new RegExp(`^${key}=`);
      let keyFound = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (keyPattern.test(lines[i].trim())) {
          // Обновляем существующую переменную
          lines[i] = `${key}=${value}`;
          keyFound = true;
          break;
        }
      }
      
      // Если переменная не найдена, добавляем в конец
      if (!keyFound) {
        lines.push(`${key}=${value}`);
      }
      
      // Записываем обратно в файл
      const newContent = lines.join('\n');
      fs.writeFileSync(this.envPath, newContent, 'utf8');
      
      console.log(`✅ Переменная ${key} обновлена в файле .env`);
      
    } catch (error) {
      console.error(`❌ Ошибка обновления .env файла:`, error);
      throw error;
    }
  }

  /**
   * Обновляет несколько переменных одновременно
   */
  async updateEnvVariables(variables: Record<string, string>): Promise<void> {
    try {
      let envContent = '';
      
      // Читаем существующий файл .env если он есть
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Разбиваем на строки
      const lines = envContent.split('\n');
      const updatedKeys = new Set<string>();
      
      // Обновляем существующие переменные
      for (let i = 0; i < lines.length; i++) {
        for (const [key, value] of Object.entries(variables)) {
          const keyPattern = new RegExp(`^${key}=`);
          if (keyPattern.test(lines[i].trim())) {
            lines[i] = `${key}=${value}`;
            updatedKeys.add(key);
          }
        }
      }
      
      // Добавляем новые переменные
      for (const [key, value] of Object.entries(variables)) {
        if (!updatedKeys.has(key)) {
          lines.push(`${key}=${value}`);
        }
      }
      
      // Записываем обратно в файл
      const newContent = lines.join('\n');
      fs.writeFileSync(this.envPath, newContent, 'utf8');
      
      console.log(`✅ Обновлено ${Object.keys(variables).length} переменных в файле .env`);
      
    } catch (error) {
      console.error(`❌ Ошибка обновления .env файла:`, error);
      throw error;
    }
  }
} 