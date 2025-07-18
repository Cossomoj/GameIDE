#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_NAME = `gameide-backup-${TIMESTAMP}`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_NAME);

console.log('🎮 GameIDE Backup Utility');
console.log('==========================');

// Создаем папку для бэкапов
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Создаем папку для текущего бэкапа
fs.mkdirSync(BACKUP_PATH, { recursive: true });

console.log(`📁 Создание бэкапа: ${BACKUP_NAME}`);

try {
  // 1. Бэкап базы данных
  console.log('📊 Бэкап базы данных...');
  const dbBackupPath = path.join(BACKUP_PATH, 'database.sql');
  execSync(`docker-compose exec -T postgres pg_dump -U gameide gameide_db > "${dbBackupPath}"`, {
    stdio: 'inherit'
  });

  // 2. Бэкап Redis данных
  console.log('🗃️  Бэкап Redis...');
  execSync('docker-compose exec redis redis-cli BGSAVE', { stdio: 'inherit' });
  // Копируем файл dump.rdb
  execSync(`docker cp gameide_redis_1:/data/dump.rdb "${path.join(BACKUP_PATH, 'redis-dump.rdb')}"`, {
    stdio: 'inherit'
  });

  // 3. Бэкап сгенерированных игр
  console.log('🎮 Бэкап игр...');
  const gamesBackupPath = path.join(BACKUP_PATH, 'games');
  if (fs.existsSync('./games-output/generated')) {
    execSync(`cp -r ./games-output/generated "${gamesBackupPath}"`, { stdio: 'inherit' });
  }

  // 4. Бэкап загруженных файлов
  console.log('📁 Бэкап загруженных файлов...');
  const uploadsBackupPath = path.join(BACKUP_PATH, 'uploads');
  if (fs.existsSync('./games-output/uploads')) {
    execSync(`cp -r ./games-output/uploads "${uploadsBackupPath}"`, { stdio: 'inherit' });
  }

  // 5. Бэкап конфигурации
  console.log('⚙️  Бэкап конфигурации...');
  const configFiles = ['.env', 'docker-compose.yml', 'package.json'];
  const configBackupPath = path.join(BACKUP_PATH, 'config');
  fs.mkdirSync(configBackupPath, { recursive: true });
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      execSync(`cp "${file}" "${path.join(configBackupPath, file)}"`, { stdio: 'inherit' });
    }
  });

  // 6. Создаем манифест бэкапа
  const manifest = {
    name: BACKUP_NAME,
    created: new Date().toISOString(),
    version: require('../package.json').version,
    components: {
      database: fs.existsSync(dbBackupPath),
      redis: fs.existsSync(path.join(BACKUP_PATH, 'redis-dump.rdb')),
      games: fs.existsSync(gamesBackupPath),
      uploads: fs.existsSync(uploadsBackupPath),
      config: fs.existsSync(configBackupPath)
    },
    size: getFolderSize(BACKUP_PATH)
  };

  fs.writeFileSync(
    path.join(BACKUP_PATH, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // 7. Создаем архив
  console.log('📦 Создание архива...');
  const archivePath = `${BACKUP_PATH}.tar.gz`;
  execSync(`tar -czf "${archivePath}" -C "${BACKUP_DIR}" "${BACKUP_NAME}"`, {
    stdio: 'inherit'
  });

  // Удаляем временную папку
  execSync(`rm -rf "${BACKUP_PATH}"`, { stdio: 'inherit' });

  console.log('✅ Бэкап успешно создан!');
  console.log(`📁 Файл: ${archivePath}`);
  console.log(`📊 Размер: ${(fs.statSync(archivePath).size / 1024 / 1024).toFixed(2)} MB`);

  // Очистка старых бэкапов (оставляем последние 5)
  cleanOldBackups();

} catch (error) {
  console.error('❌ Ошибка создания бэкапа:', error.message);
  process.exit(1);
}

function getFolderSize(folderPath) {
  let totalSize = 0;
  
  function calculateSize(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  
  if (fs.existsSync(folderPath)) {
    calculateSize(folderPath);
  }
  
  return totalSize;
}

function cleanOldBackups() {
  try {
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('gameide-backup-') && file.endsWith('.tar.gz'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        created: fs.statSync(path.join(BACKUP_DIR, file)).birthtime
      }))
      .sort((a, b) => b.created - a.created);

    if (backupFiles.length > 5) {
      console.log('🧹 Очистка старых бэкапов...');
      
      backupFiles.slice(5).forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`🗑️  Удален старый бэкап: ${backup.name}`);
      });
    }
  } catch (error) {
    console.warn('⚠️  Не удалось очистить старые бэкапы:', error.message);
  }
} 