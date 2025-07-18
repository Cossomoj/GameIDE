#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

console.log('🎮 GameIDE Restore Utility');
console.log('===========================');

// Ищем доступные бэкапы
const backupFiles = getAvailableBackups();

if (backupFiles.length === 0) {
  console.log('❌ Не найдено доступных бэкапов в папке:', BACKUP_DIR);
  process.exit(1);
}

console.log('📋 Доступные бэкапы:');
backupFiles.forEach((backup, index) => {
  console.log(`  ${index + 1}. ${backup.name} (${backup.sizeFormatted}, ${backup.dateFormatted})`);
});

// Интерактивный выбор бэкапа
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n🔢 Выберите номер бэкапа для восстановления: ', (answer) => {
  const selectedIndex = parseInt(answer) - 1;
  
  if (selectedIndex < 0 || selectedIndex >= backupFiles.length) {
    console.log('❌ Неверный номер бэкапа');
    rl.close();
    process.exit(1);
  }

  const selectedBackup = backupFiles[selectedIndex];
  
  console.log(`\n⚠️  ВНИМАНИЕ: Это действие перезапишет текущие данные!`);
  console.log(`Выбранный бэкап: ${selectedBackup.name}`);
  
  rl.question('\n❓ Продолжить восстановление? (yes/no): ', (confirm) => {
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Восстановление отменено');
      rl.close();
      process.exit(0);
    }
    
    rl.close();
    performRestore(selectedBackup);
  });
});

function getAvailableBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('gameide-backup-') && file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          date: stats.birthtime,
          dateFormatted: stats.birthtime.toLocaleString('ru-RU')
        };
      })
      .sort((a, b) => b.date - a.date);
  } catch (error) {
    return [];
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function performRestore(backup) {
  const tempDir = path.join(BACKUP_DIR, 'temp-restore');
  
  try {
    console.log('\n🚀 Начинаем восстановление...');
    
    // 1. Останавливаем сервисы
    console.log('🛑 Остановка сервисов...');
    execSync('docker-compose down', { stdio: 'inherit' });
    
    // 2. Распаковываем бэкап
    console.log('📦 Распаковка бэкапа...');
    if (fs.existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    execSync(`tar -xzf "${backup.path}" -C "${tempDir}"`, { stdio: 'inherit' });
    
    const extractedDir = path.join(tempDir, backup.name.replace('.tar.gz', ''));
    
    // 3. Читаем манифест
    const manifestPath = path.join(extractedDir, 'manifest.json');
    let manifest = {};
    
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`📋 Восстанавливаем бэкап версии ${manifest.version} от ${manifest.created}`);
    }
    
    // 4. Восстанавливаем игры
    if (manifest.components?.games && fs.existsSync(path.join(extractedDir, 'games'))) {
      console.log('🎮 Восстановление игр...');
      if (!fs.existsSync('./games-output')) {
        fs.mkdirSync('./games-output', { recursive: true });
      }
      if (fs.existsSync('./games-output/generated')) {
        execSync('rm -rf ./games-output/generated', { stdio: 'inherit' });
      }
      execSync(`cp -r "${path.join(extractedDir, 'games')}" "./games-output/generated"`, { stdio: 'inherit' });
    }
    
    // 5. Восстанавливаем загруженные файлы
    if (manifest.components?.uploads && fs.existsSync(path.join(extractedDir, 'uploads'))) {
      console.log('📁 Восстановление загруженных файлов...');
      if (!fs.existsSync('./games-output')) {
        fs.mkdirSync('./games-output', { recursive: true });
      }
      if (fs.existsSync('./games-output/uploads')) {
        execSync('rm -rf ./games-output/uploads', { stdio: 'inherit' });
      }
      execSync(`cp -r "${path.join(extractedDir, 'uploads')}" "./games-output/uploads"`, { stdio: 'inherit' });
    }
    
    // 6. Запускаем сервисы для восстановления БД
    console.log('🚀 Запуск сервисов для восстановления БД...');
    execSync('docker-compose up -d postgres redis', { stdio: 'inherit' });
    
    // Ждем запуска
    console.log('⏳ Ожидание запуска сервисов...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 7. Восстанавливаем базу данных
    if (manifest.components?.database && fs.existsSync(path.join(extractedDir, 'database.sql'))) {
      console.log('📊 Восстановление базы данных...');
      
      // Очищаем БД
      execSync('docker-compose exec -T postgres psql -U gameide -d gameide_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"', {
        stdio: 'inherit'
      });
      
      // Восстанавливаем из дампа
      execSync(`docker-compose exec -T postgres psql -U gameide -d gameide_db < "${path.join(extractedDir, 'database.sql')}"`, {
        stdio: 'inherit'
      });
    }
    
    // 8. Восстанавливаем Redis
    if (manifest.components?.redis && fs.existsSync(path.join(extractedDir, 'redis-dump.rdb'))) {
      console.log('🗃️  Восстановление Redis...');
      
      // Останавливаем Redis
      execSync('docker-compose stop redis', { stdio: 'inherit' });
      
      // Копируем дамп
      execSync(`docker cp "${path.join(extractedDir, 'redis-dump.rdb')}" gameide_redis_1:/data/dump.rdb`, {
        stdio: 'inherit'
      });
      
      // Запускаем Redis
      execSync('docker-compose start redis', { stdio: 'inherit' });
    }
    
    // 9. Восстанавливаем конфигурацию (опционально)
    if (manifest.components?.config && fs.existsSync(path.join(extractedDir, 'config'))) {
      console.log('⚙️  Найдена конфигурация в бэкапе');
      console.log('   (восстановление конфигурации пропущено для безопасности)');
    }
    
    // 10. Запускаем все сервисы
    console.log('🚀 Запуск всех сервисов...');
    execSync('docker-compose up -d', { stdio: 'inherit' });
    
    // Очищаем временные файлы
    execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
    
    console.log('\n✅ Восстановление завершено успешно!');
    console.log('🌐 Веб-интерфейс: http://localhost:5173');
    console.log('🔗 API: http://localhost:3000');
    console.log('\n⏳ Дождитесь полного запуска всех сервисов...');
    
  } catch (error) {
    console.error('\n❌ Ошибка восстановления:', error.message);
    
    // Пытаемся запустить сервисы в любом случае
    try {
      console.log('🔄 Попытка запуска сервисов...');
      execSync('docker-compose up -d', { stdio: 'inherit' });
    } catch (startError) {
      console.error('❌ Не удалось запустить сервисы:', startError.message);
    }
    
    // Очищаем временные файлы
    if (fs.existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
    }
    
    process.exit(1);
  }
} 