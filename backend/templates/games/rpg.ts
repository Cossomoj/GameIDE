import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class RPGTemplate extends BaseGameTemplate {
  name = 'rpg';
  genre = 'rpg';
  description = 'Ролевая игра с системой развития персонажа, квестами и сражениями';

  public generateCode(prompt: GamePrompt, design: GameDesign): {
    html: string;
    js: string;
    css: string;
  } {
    const html = this.generateHTML(prompt.title, this.generateGameJS(prompt, design), this.generateGameCSS());
    
    return {
      html,
      js: this.generateGameJS(prompt, design),
      css: this.generateGameCSS()
    };
  }

  private generateGameJS(prompt: GamePrompt, design: GameDesign): string {
    return `
// ${prompt.title} - RPG Game
class RPGGame {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = Math.min(window.innerWidth, 800);
        this.canvas.height = Math.min(window.innerHeight, 600);
        
        // Игровое состояние
        this.gameState = 'menu'; // menu, playing, inventory, battle, levelup
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 100;
        
        // Персонаж
        this.player = {
            x: 400,
            y: 300,
            width: 32,
            height: 32,
            speed: 3,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            level: 1,
            experience: 0,
            stats: {
                strength: 10,
                defense: 8,
                magic: 6,
                agility: 7
            },
            inventory: [],
            gold: 50,
            color: '#4CAF50'
        };
        
        // Враги
        this.enemies = [];
        this.spawnTimer = 0;
        
        // НПС и квесты
        this.npcs = [
            {
                x: 100, y: 100, 
                name: 'Старейшина',
                quest: 'Убей 5 врагов',
                questComplete: false,
                reward: { gold: 100, experience: 50 }
            }
        ];
        
        // Предметы на земле
        this.items = [];
        
        // UI элементы
        this.selectedMenuItem = 0;
        this.showInventory = false;
        
        // Инициализация
        this.setupEventListeners();
        this.generateInitialItems();
        this.gameLoop();
    }
    
    setupEventListeners() {
        const keys = {};
        
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            
            if (this.gameState === 'menu') {
                this.handleMenuInput(e.key);
            } else if (this.gameState === 'playing') {
                this.handleGameInput(e.key);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });
        
        this.keys = keys;
    }
    
    handleMenuInput(key) {
        if (key === 'Enter') {
            this.startGame();
        }
    }
    
    handleGameInput(key) {
        if (key === 'i' || key === 'I') {
            this.showInventory = !this.showInventory;
        }
        if (key === 'e' || key === 'E') {
            this.interactWithNearby();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.spawnEnemies();
    }
    
    update() {
        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateEnemies();
            this.updateItems();
            this.checkCollisions();
            this.updateSpawning();
        }
    }
    
    updatePlayer() {
        const player = this.player;
        
        // Движение
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            player.x = Math.max(0, player.x - player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            player.x = Math.min(this.canvas.width - player.width, player.x + player.speed);
        }
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            player.y = Math.max(0, player.y - player.speed);
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            player.y = Math.min(this.canvas.height - player.height, player.y + player.speed);
        }
        
        // Автоматическая регенерация
        if (player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + 0.1);
        }
        if (player.mp < player.maxMp) {
            player.mp = Math.min(player.maxMp, player.mp + 0.2);
        }
    }
    
    updateEnemies() {
        this.enemies.forEach((enemy, index) => {
            // Простая ИИ: движение к игроку
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            }
            
            // Проверка на смерть
            if (enemy.hp <= 0) {
                this.addExperience(enemy.expReward);
                this.player.gold += enemy.goldReward;
                this.dropRandomItem(enemy.x, enemy.y);
                this.enemies.splice(index, 1);
            }
        });
    }
    
    updateItems() {
        // Простая анимация предметов
        this.items.forEach(item => {
            item.animationTime = (item.animationTime || 0) + 0.1;
        });
    }
    
    updateSpawning() {
        this.spawnTimer++;
        if (this.spawnTimer >= 300) { // Каждые 5 секунд
            this.spawnEnemies();
            this.spawnTimer = 0;
        }
    }
    
    spawnEnemies() {
        if (this.enemies.length < 5) {
            const enemy = {
                x: Math.random() * (this.canvas.width - 32),
                y: Math.random() * (this.canvas.height - 32),
                width: 24,
                height: 24,
                speed: 0.5 + Math.random() * 0.5,
                hp: 30 + this.level * 10,
                maxHp: 30 + this.level * 10,
                damage: 5 + this.level * 2,
                expReward: 10 + this.level * 5,
                goldReward: 5 + this.level * 2,
                color: '#FF5722',
                type: 'goblin'
            };
            this.enemies.push(enemy);
        }
    }
    
    checkCollisions() {
        // Игрок vs враги
        this.enemies.forEach(enemy => {
            if (this.isColliding(this.player, enemy)) {
                this.playerTakeDamage(enemy.damage);
                // Отталкивание
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    this.player.x += (dx / distance) * 10;
                    this.player.y += (dy / distance) * 10;
                }
            }
        });
        
        // Игрок vs предметы
        this.items.forEach((item, index) => {
            if (this.isColliding(this.player, item)) {
                this.collectItem(item);
                this.items.splice(index, 1);
            }
        });
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    playerTakeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.player.stats.defense);
        this.player.hp = Math.max(0, this.player.hp - actualDamage);
        
        if (this.player.hp <= 0) {
            this.gameOver();
        }
    }
    
    addExperience(exp) {
        this.player.experience += exp;
        
        while (this.player.experience >= this.experienceToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.player.experience -= this.experienceToNext;
        this.player.level++;
        this.experienceToNext = Math.floor(this.experienceToNext * 1.5);
        
        // Увеличиваем характеристики
        this.player.maxHp += 20;
        this.player.hp = this.player.maxHp;
        this.player.maxMp += 10;
        this.player.mp = this.player.maxMp;
        this.player.stats.strength += 2;
        this.player.stats.defense += 1;
        this.player.stats.magic += 1;
        this.player.stats.agility += 1;
        
        // Показываем уведомление
        console.log(\`Уровень повышен! Теперь уровень \${this.player.level}\`);
    }
    
    collectItem(item) {
        if (item.type === 'gold') {
            this.player.gold += item.value;
        } else if (item.type === 'potion') {
            if (item.effect === 'heal') {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
            } else if (item.effect === 'mana') {
                this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.value);
            }
        } else {
            this.player.inventory.push(item);
        }
    }
    
    dropRandomItem(x, y) {
        const itemTypes = [
            { type: 'gold', value: 5 + Math.random() * 10, color: '#FFD700' },
            { type: 'potion', effect: 'heal', value: 20, color: '#E91E63' },
            { type: 'potion', effect: 'mana', value: 15, color: '#2196F3' }
        ];
        
        if (Math.random() < 0.3) { // 30% шанс дропа
            const item = {...itemTypes[Math.floor(Math.random() * itemTypes.length)]};
            item.x = x;
            item.y = y;
            item.width = 16;
            item.height = 16;
            this.items.push(item);
        }
    }
    
    generateInitialItems() {
        // Размещаем несколько предметов на карте
        for (let i = 0; i < 5; i++) {
            this.dropRandomItem(
                Math.random() * (this.canvas.width - 16),
                Math.random() * (this.canvas.height - 16)
            );
        }
    }
    
    interactWithNearby() {
        // Проверяем НПС поблизости
        this.npcs.forEach(npc => {
            const distance = Math.sqrt(
                (this.player.x - npc.x) ** 2 + (this.player.y - npc.y) ** 2
            );
            
            if (distance < 50) {
                this.talkToNPC(npc);
            }
        });
    }
    
    talkToNPC(npc) {
        if (!npc.questComplete && this.enemies.length === 0) {
            // Выполнен квест
            npc.questComplete = true;
            this.player.gold += npc.reward.gold;
            this.addExperience(npc.reward.experience);
            console.log(\`Квест выполнен! Получено: \${npc.reward.gold} золота и \${npc.reward.experience} опыта\`);
        } else {
            console.log(\`\${npc.name}: \${npc.quest}\`);
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        setTimeout(() => {
            this.restart();
        }, 3000);
    }
    
    restart() {
        // Сброс игры
        this.player.hp = this.player.maxHp;
        this.player.x = 400;
        this.player.y = 300;
        this.enemies = [];
        this.items = [];
        this.generateInitialItems();
        this.gameState = 'playing';
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'playing') {
            this.renderGame();
        } else if (this.gameState === 'gameOver') {
            this.renderGameOver();
        }
    }
    
    renderMenu() {
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('${prompt.title}', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Enter для начала', this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText('WASD/Стрелки - движение, E - взаимодействие, I - инвентарь', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    renderGame() {
        // Фон
        this.ctx.fillStyle = '#2E7D32';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сетка для эффекта карты
        this.ctx.strokeStyle = '#1B5E20';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Предметы
        this.items.forEach(item => {
            this.ctx.fillStyle = item.color;
            const bounce = Math.sin(item.animationTime) * 2;
            this.ctx.fillRect(item.x, item.y + bounce, item.width, item.height);
        });
        
        // НПС
        this.npcs.forEach(npc => {
            this.ctx.fillStyle = npc.questComplete ? '#4CAF50' : '#FF9800';
            this.ctx.fillRect(npc.x, npc.y, 32, 32);
            
            // Имя НПС
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(npc.name, npc.x + 16, npc.y - 5);
            
            // Индикатор квеста
            if (!npc.questComplete) {
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillText('!', npc.x + 16, npc.y + 45);
            }
        });
        
        // Враги
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Полоска здоровья врага
            const healthPercent = enemy.hp / enemy.maxHp;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
            this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercent, 4);
        });
        
        // Игрок
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // UI
        this.renderUI();
        
        if (this.showInventory) {
            this.renderInventory();
        }
    }
    
    renderUI() {
        // Полоска здоровья
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(10, 10, 200, 20);
        const healthPercent = this.player.hp / this.player.maxHp;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
        this.ctx.fillRect(10, 10, 200 * healthPercent, 20);
        
        // Полоска маны
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(10, 35, 200, 15);
        const manaPercent = this.player.mp / this.player.maxMp;
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(10, 35, 200 * manaPercent, 15);
        
        // Опыт
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(10, 55, 200, 10);
        const expPercent = this.player.experience / this.experienceToNext;
        this.ctx.fillStyle = '#9C27B0';
        this.ctx.fillRect(10, 55, 200 * expPercent, 10);
        
        // Текстовая информация
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(\`HP: \${Math.ceil(this.player.hp)}/\${this.player.maxHp}\`, 220, 25);
        this.ctx.fillText(\`MP: \${Math.ceil(this.player.mp)}/\${this.player.maxMp}\`, 220, 45);
        this.ctx.fillText(\`Level: \${this.player.level}\`, 220, 65);
        this.ctx.fillText(\`Gold: \${this.player.gold}\`, 350, 25);
        
        // Подсказки
        this.ctx.font = '12px Arial';
        this.ctx.fillText('I - Инвентарь, E - Взаимодействие', 10, this.canvas.height - 10);
    }
    
    renderInventory() {
        // Фон инвентаря
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#424242';
        const invX = this.canvas.width / 2 - 200;
        const invY = this.canvas.height / 2 - 150;
        this.ctx.fillRect(invX, invY, 400, 300);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Инвентарь', this.canvas.width / 2, invY + 30);
        
        // Характеристики
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        let yPos = invY + 60;
        this.ctx.fillText(\`Сила: \${this.player.stats.strength}\`, invX + 20, yPos);
        this.ctx.fillText(\`Защита: \${this.player.stats.defense}\`, invX + 20, yPos + 20);
        this.ctx.fillText(\`Магия: \${this.player.stats.magic}\`, invX + 20, yPos + 40);
        this.ctx.fillText(\`Ловкость: \${this.player.stats.agility}\`, invX + 20, yPos + 60);
        
        // Предметы
        yPos = invY + 150;
        this.ctx.fillText('Предметы:', invX + 20, yPos);
        this.player.inventory.forEach((item, index) => {
            this.ctx.fillText(\`\${index + 1}. \${item.name || item.type}\`, invX + 40, yPos + 20 + index * 20);
        });
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Нажмите I для закрытия', this.canvas.width / 2, invY + 280);
    }
    
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#F44336';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Перезапуск через 3 секунды...', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры после инициализации Yandex SDK
document.addEventListener('DOMContentLoaded', async () => {
    await window.yandexGames.init();
    const game = new RPGGame();
    window.game = game;
});
`;
  }

  private generateGameCSS(): string {
    return `
body {
    margin: 0;
    padding: 0;
    background: #1a1a1a;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    user-select: none;
}

#game {
    display: block;
    border: 2px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    background: #2E7D32;
}

/* RPG специфичные стили */
.rpg-ui {
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
}

.health-bar {
    background: #333;
    border: 1px solid #666;
    height: 20px;
    width: 200px;
    border-radius: 10px;
    overflow: hidden;
}

.health-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
}

.mana-bar {
    background: #333;
    border: 1px solid #666;
    height: 15px;
    width: 200px;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 5px;
}

.mana-fill {
    height: 100%;
    background: linear-gradient(90deg, #2196F3, #64B5F6);
    transition: width 0.3s ease;
}

.exp-bar {
    background: #333;
    border: 1px solid #666;
    height: 10px;
    width: 200px;
    border-radius: 5px;
    overflow: hidden;
    margin-top: 5px;
}

.exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #9C27B0, #BA68C8);
    transition: width 0.3s ease;
}

/* Эффекты частиц */
@keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
}

.sparkle {
    animation: sparkle 1s infinite;
}

/* Анимации для предметов */
@keyframes itemBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
}

.item-bounce {
    animation: itemBounce 2s infinite ease-in-out;
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'hero', prompt: `RPG hero character sprite, ${design.artStyle || 'pixel art'} style, brave warrior with armor, transparent background, 32x32 pixels` },
        { name: 'goblin', prompt: `Small goblin enemy sprite, ${design.artStyle || 'pixel art'} style, green skin, menacing look, transparent background, 24x24 pixels` },
        { name: 'npc_elder', prompt: `Wise elder NPC sprite, ${design.artStyle || 'pixel art'} style, old man with beard and robes, transparent background, 32x32 pixels` },
        { name: 'health_potion', prompt: `Red health potion item sprite, ${design.artStyle || 'pixel art'} style, glowing effect, transparent background, 16x16 pixels` },
        { name: 'mana_potion', prompt: `Blue mana potion item sprite, ${design.artStyle || 'pixel art'} style, magical glow, transparent background, 16x16 pixels` },
        { name: 'gold_coin', prompt: `Gold coin item sprite, ${design.artStyle || 'pixel art'} style, shiny golden color, transparent background, 16x16 pixels` }
      ],
      sounds: [
        { name: 'sword_hit', prompt: 'Sword hitting enemy sound effect, medieval fantasy style, sharp metallic clash' },
        { name: 'level_up', prompt: 'Character level up sound effect, triumphant magical chime, positive achievement' },
        { name: 'collect_item', prompt: 'Item collection sound effect, positive pickup sound, brief and satisfying' },
        { name: 'quest_complete', prompt: 'Quest completion sound effect, victory fanfare, RPG style accomplishment' },
        { name: 'player_hurt', prompt: 'Player taking damage sound effect, grunt or pain sound, brief negative feedback' }
      ],
      backgrounds: [
        { name: 'grass_field', prompt: `RPG overworld background, ${design.artStyle || 'pixel art'} style, green grass field with scattered trees, top-down view` },
        { name: 'stone_dungeon', prompt: `RPG dungeon background, ${design.artStyle || 'pixel art'} style, dark stone walls and floors, atmospheric lighting` }
      ]
    };
  }
} 