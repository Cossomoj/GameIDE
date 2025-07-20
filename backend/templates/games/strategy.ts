import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class StrategyTemplate extends BaseGameTemplate {
  name = 'strategy';
  genre = 'strategy';
  description = 'Стратегическая игра с управлением ресурсами, строительством и армией';

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
// ${prompt.title} - Strategy Game
class StrategyGame {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = Math.min(window.innerWidth, 1000);
        this.canvas.height = Math.min(window.innerHeight, 700);
        
        // Игровое состояние
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.selectedUnit = null;
        this.selectedBuilding = null;
        this.currentTool = 'select'; // select, build_barracks, build_farm, build_mine
        
        // Ресурсы
        this.resources = {
            wood: 200,
            stone: 100,
            gold: 150,
            food: 50,
            population: 0,
            maxPopulation: 10
        };
        
        // Карта (сетка)
        this.mapWidth = 25;
        this.mapHeight = 18;
        this.tileSize = 40;
        this.map = this.generateMap();
        
        // Камера
        this.camera = { x: 0, y: 0 };
        
        // Юниты
        this.units = [
            { x: 2, y: 2, type: 'worker', hp: 50, maxHp: 50, selected: false, task: null, target: null }
        ];
        
        // Здания
        this.buildings = [
            { x: 1, y: 1, type: 'townhall', hp: 200, maxHp: 200, width: 2, height: 2 }
        ];
        
        // Очереди производства
        this.productionQueues = {
            townhall: [],
            barracks: []
        };
        
        // Таймеры
        this.resourceTimer = 0;
        this.gameTime = 0;
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    generateMap() {
        const map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                let tile = 'grass';
                
                // Добавляем ресурсы случайно
                if (Math.random() < 0.15) {
                    const resourceTypes = ['tree', 'stone', 'gold'];
                    tile = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                }
                
                row.push({ type: tile, resources: tile !== 'grass' ? 100 : 0 });
            }
            map.push(row);
        }
        return map;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'menu') {
                this.startGame();
                return;
            }
            
            if (this.gameState === 'playing') {
                this.handleClick(e);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX - this.canvas.offsetLeft;
            this.mouseY = e.clientY - this.canvas.offsetTop;
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                this.handleKeydown(e.key);
            }
        });
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Проверяем клик по UI
        if (this.handleUIClick(mouseX, mouseY)) {
            return;
        }
        
        // Переводим в координаты карты
        const mapX = Math.floor((mouseX + this.camera.x) / this.tileSize);
        const mapY = Math.floor((mouseY + this.camera.y) / this.tileSize);
        
        if (this.currentTool === 'select') {
            this.handleSelectClick(mapX, mapY);
        } else if (this.currentTool.startsWith('build_')) {
            this.handleBuildClick(mapX, mapY);
        }
    }
    
    handleUIClick(mouseX, mouseY) {
        // Кнопки строительства
        const buttonY = this.canvas.height - 80;
        const buttons = [
            { x: 20, width: 80, action: 'select', text: 'Выбор' },
            { x: 110, width: 80, action: 'build_barracks', text: 'Казармы' },
            { x: 200, width: 80, action: 'build_farm', text: 'Ферма' },
            { x: 290, width: 80, action: 'build_mine', text: 'Шахта' }
        ];
        
        for (const button of buttons) {
            if (mouseX >= button.x && mouseX <= button.x + button.width && 
                mouseY >= buttonY && mouseY <= buttonY + 40) {
                this.currentTool = button.action;
                return true;
            }
        }
        
        // Кнопки производства юнитов
        if (this.selectedBuilding && this.selectedBuilding.type === 'barracks') {
            if (mouseX >= 20 && mouseX <= 100 && mouseY >= 200 && mouseY <= 240) {
                this.produceUnit('soldier');
                return true;
            }
        }
        
        if (this.selectedBuilding && this.selectedBuilding.type === 'townhall') {
            if (mouseX >= 20 && mouseX <= 100 && mouseY >= 200 && mouseY <= 240) {
                this.produceUnit('worker');
                return true;
            }
        }
        
        return false;
    }
    
    handleSelectClick(mapX, mapY) {
        // Сначала ищем юниты
        let found = false;
        this.units.forEach(unit => {
            unit.selected = (unit.x === mapX && unit.y === mapY);
            if (unit.selected) {
                this.selectedUnit = unit;
                this.selectedBuilding = null;
                found = true;
            }
        });
        
        if (!found) {
            // Ищем здания
            this.buildings.forEach(building => {
                if (mapX >= building.x && mapX < building.x + building.width &&
                    mapY >= building.y && mapY < building.y + building.height) {
                    this.selectedBuilding = building;
                    this.selectedUnit = null;
                    found = true;
                }
            });
        }
        
        if (!found) {
            // Если выбран юнит, перемещаем его
            if (this.selectedUnit) {
                this.moveUnit(this.selectedUnit, mapX, mapY);
            }
            this.clearSelection();
        }
    }
    
    handleBuildClick(mapX, mapY) {
        const buildingType = this.currentTool.replace('build_', '');
        this.buildBuilding(buildingType, mapX, mapY);
    }
    
    handleKeydown(key) {
        const cameraSpeed = 20;
        
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.camera.x = Math.max(0, this.camera.x - cameraSpeed);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.camera.x = Math.min(this.mapWidth * this.tileSize - this.canvas.width, this.camera.x + cameraSpeed);
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.camera.y = Math.max(0, this.camera.y - cameraSpeed);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.camera.y = Math.min(this.mapHeight * this.tileSize - this.canvas.height, this.camera.y + cameraSpeed);
                break;
            case 'Escape':
                this.currentTool = 'select';
                this.clearSelection();
                break;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
    }
    
    clearSelection() {
        this.selectedUnit = null;
        this.selectedBuilding = null;
        this.units.forEach(unit => unit.selected = false);
    }
    
    moveUnit(unit, targetX, targetY) {
        if (this.isValidPosition(targetX, targetY)) {
            unit.target = { x: targetX, y: targetY };
            unit.task = 'move';
        }
    }
    
    buildBuilding(type, x, y) {
        const costs = {
            barracks: { wood: 100, stone: 50 },
            farm: { wood: 50, stone: 25 },
            mine: { wood: 75, stone: 100 }
        };
        
        const sizes = {
            barracks: { width: 2, height: 2 },
            farm: { width: 1, height: 1 },
            mine: { width: 1, height: 1 }
        };
        
        const cost = costs[type];
        const size = sizes[type];
        
        if (!cost || !size) return;
        
        // Проверяем ресурсы
        if (this.resources.wood < cost.wood || this.resources.stone < cost.stone) {
            console.log('Недостаточно ресурсов!');
            return;
        }
        
        // Проверяем, свободно ли место
        if (!this.canBuildAt(x, y, size.width, size.height)) {
            console.log('Место занято!');
            return;
        }
        
        // Строим здание
        this.resources.wood -= cost.wood;
        this.resources.stone -= cost.stone;
        
        const building = {
            x, y,
            type,
            hp: 100,
            maxHp: 100,
            width: size.width,
            height: size.height,
            constructionTime: 0,
            isBuilt: false
        };
        
        this.buildings.push(building);
        this.currentTool = 'select';
        
        // Увеличиваем лимит населения для фермы
        if (type === 'farm') {
            this.resources.maxPopulation += 5;
        }
    }
    
    canBuildAt(x, y, width, height) {
        // Проверяем границы карты
        if (x < 0 || y < 0 || x + width > this.mapWidth || y + height > this.mapHeight) {
            return false;
        }
        
        // Проверяем пересечение с другими зданиями
        for (const building of this.buildings) {
            if (!(x >= building.x + building.width || 
                  x + width <= building.x || 
                  y >= building.y + building.height || 
                  y + height <= building.y)) {
                return false;
            }
        }
        
        return true;
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
    }
    
    produceUnit(type) {
        const costs = {
            worker: { food: 50, gold: 25 },
            soldier: { food: 75, gold: 50 }
        };
        
        const cost = costs[type];
        if (!cost) return;
        
        // Проверяем ресурсы и лимит населения
        if (this.resources.food < cost.food || 
            this.resources.gold < cost.gold ||
            this.resources.population >= this.resources.maxPopulation) {
            console.log('Недостаточно ресурсов или лимит населения!');
            return;
        }
        
        // Добавляем в очередь производства
        const building = this.selectedBuilding;
        const queueType = building.type;
        
        if (!this.productionQueues[queueType]) {
            this.productionQueues[queueType] = [];
        }
        
        this.resources.food -= cost.food;
        this.resources.gold -= cost.gold;
        this.resources.population++;
        
        this.productionQueues[queueType].push({
            type,
            timeLeft: type === 'worker' ? 30 : 60, // 0.5 или 1 секунда при 60 FPS
            building
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.gameTime++;
        
        // Обновляем ресурсы
        this.updateResources();
        
        // Обновляем юниты
        this.updateUnits();
        
        // Обновляем производство
        this.updateProduction();
        
        // Обновляем строительство
        this.updateConstruction();
    }
    
    updateResources() {
        this.resourceTimer++;
        
        if (this.resourceTimer >= 60) { // Каждую секунду
            // Добываем ресурсы от рабочих
            this.units.forEach(unit => {
                if (unit.type === 'worker' && unit.task === 'gather') {
                    const tile = this.map[unit.y][unit.x];
                    if (tile.resources > 0) {
                        const amount = 5;
                        tile.resources = Math.max(0, tile.resources - amount);
                        
                        if (tile.type === 'tree') this.resources.wood += amount;
                        else if (tile.type === 'stone') this.resources.stone += amount;
                        else if (tile.type === 'gold') this.resources.gold += amount;
                        
                        if (tile.resources === 0) {
                            tile.type = 'grass';
                        }
                    }
                }
            });
            
            // Еда от ферм
            const farms = this.buildings.filter(b => b.type === 'farm' && b.isBuilt);
            this.resources.food += farms.length * 3;
            
            this.resourceTimer = 0;
        }
    }
    
    updateUnits() {
        this.units.forEach(unit => {
            if (unit.target) {
                // Движение к цели
                const dx = unit.target.x - unit.x;
                const dy = unit.target.y - unit.y;
                
                if (Math.abs(dx) + Math.abs(dy) === 1) {
                    // Достигли цели
                    unit.x = unit.target.x;
                    unit.y = unit.target.y;
                    unit.target = null;
                    
                    // Автоматическая добыча ресурсов для рабочих
                    if (unit.type === 'worker') {
                        const tile = this.map[unit.y][unit.x];
                        if (tile.type !== 'grass' && tile.resources > 0) {
                            unit.task = 'gather';
                        }
                    }
                } else if (Math.abs(dx) + Math.abs(dy) > 0) {
                    // Движемся к цели (простой алгоритм)
                    if (Math.abs(dx) > Math.abs(dy)) {
                        unit.x += dx > 0 ? 1 : -1;
                    } else {
                        unit.y += dy > 0 ? 1 : -1;
                    }
                }
            }
        });
    }
    
    updateProduction() {
        Object.keys(this.productionQueues).forEach(buildingType => {
            const queue = this.productionQueues[buildingType];
            
            if (queue.length > 0) {
                const item = queue[0];
                item.timeLeft--;
                
                if (item.timeLeft <= 0) {
                    // Производство завершено
                    queue.shift();
                    
                    // Размещаем юнита рядом со зданием
                    const spawnPos = this.findSpawnPosition(item.building);
                    if (spawnPos) {
                        const newUnit = {
                            x: spawnPos.x,
                            y: spawnPos.y,
                            type: item.type,
                            hp: item.type === 'worker' ? 50 : 80,
                            maxHp: item.type === 'worker' ? 50 : 80,
                            selected: false,
                            task: null,
                            target: null
                        };
                        this.units.push(newUnit);
                    }
                }
            }
        });
    }
    
    updateConstruction() {
        this.buildings.forEach(building => {
            if (!building.isBuilt) {
                building.constructionTime++;
                if (building.constructionTime >= 180) { // 3 секунды
                    building.isBuilt = true;
                }
            }
        });
    }
    
    findSpawnPosition(building) {
        const positions = [
            { x: building.x - 1, y: building.y },
            { x: building.x + building.width, y: building.y },
            { x: building.x, y: building.y - 1 },
            { x: building.x, y: building.y + building.height }
        ];
        
        for (const pos of positions) {
            if (this.isValidPosition(pos.x, pos.y) && 
                !this.units.some(u => u.x === pos.x && u.y === pos.y)) {
                return pos;
            }
        }
        
        return null;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'playing') {
            this.renderGame();
        }
    }
    
    renderMenu() {
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('${prompt.title}', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите для начала', this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText('WASD - камера, ЛКМ - выбор/действие, ESC - отмена', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    renderGame() {
        // Рендерим карту
        this.renderMap();
        
        // Рендерим здания
        this.renderBuildings();
        
        // Рендерим юниты
        this.renderUnits();
        
        // Рендерим UI
        this.renderUI();
        
        // Рендерим курсор строительства
        if (this.currentTool.startsWith('build_')) {
            this.renderBuildCursor();
        }
    }
    
    renderMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.map[y][x];
                const screenX = x * this.tileSize - this.camera.x;
                const screenY = y * this.tileSize - this.camera.y;
                
                // Пропускаем тайлы вне экрана
                if (screenX < -this.tileSize || screenX > this.canvas.width ||
                    screenY < -this.tileSize || screenY > this.canvas.height) {
                    continue;
                }
                
                // Фон тайла
                this.ctx.fillStyle = '#4CAF50'; // Трава
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                
                // Ресурсы
                if (tile.type === 'tree') {
                    this.ctx.fillStyle = '#2E7D32';
                    this.ctx.fillRect(screenX + 5, screenY + 5, this.tileSize - 10, this.tileSize - 10);
                } else if (tile.type === 'stone') {
                    this.ctx.fillStyle = '#616161';
                    this.ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);
                } else if (tile.type === 'gold') {
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fillRect(screenX + 6, screenY + 6, this.tileSize - 12, this.tileSize - 12);
                }
                
                // Сетка
                this.ctx.strokeStyle = '#81C784';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
            }
        }
    }
    
    renderBuildings() {
        this.buildings.forEach(building => {
            const screenX = building.x * this.tileSize - this.camera.x;
            const screenY = building.y * this.tileSize - this.camera.y;
            const width = building.width * this.tileSize;
            const height = building.height * this.tileSize;
            
            // Цвет в зависимости от типа
            let color = '#795548';
            if (building.type === 'townhall') color = '#FF9800';
            else if (building.type === 'barracks') color = '#F44336';
            else if (building.type === 'farm') color = '#FFEB3B';
            else if (building.type === 'mine') color = '#9E9E9E';
            
            // Затемняем, если строится
            if (!building.isBuilt) {
                color += '80'; // Добавляем прозрачность
            }
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, width, height);
            
            // Рамка для выбранного здания
            if (building === this.selectedBuilding) {
                this.ctx.strokeStyle = '#FFFF00';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(screenX, screenY, width, height);
            }
            
            // Полоска строительства
            if (!building.isBuilt) {
                const progress = building.constructionTime / 180;
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(screenX, screenY - 8, width, 4);
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(screenX, screenY - 8, width * progress, 4);
            }
        });
    }
    
    renderUnits() {
        this.units.forEach(unit => {
            const screenX = unit.x * this.tileSize - this.camera.x + this.tileSize / 4;
            const screenY = unit.y * this.tileSize - this.camera.y + this.tileSize / 4;
            const size = this.tileSize / 2;
            
            // Цвет в зависимости от типа
            let color = '#2196F3';
            if (unit.type === 'worker') color = '#FF9800';
            else if (unit.type === 'soldier') color = '#F44336';
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX, screenY, size, size);
            
            // Рамка для выбранного юнита
            if (unit.selected) {
                this.ctx.strokeStyle = '#FFFF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(screenX - 2, screenY - 2, size + 4, size + 4);
            }
            
            // Полоска здоровья
            if (unit.hp < unit.maxHp) {
                const healthPercent = unit.hp / unit.maxHp;
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(screenX, screenY - 6, size, 3);
                this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#F44336';
                this.ctx.fillRect(screenX, screenY - 6, size * healthPercent, 3);
            }
        });
    }
    
    renderUI() {
        // Панель ресурсов
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, 50);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        
        const resources = [
            \`Дерево: \${this.resources.wood}\`,
            \`Камень: \${this.resources.stone}\`,
            \`Золото: \${this.resources.gold}\`,
            \`Еда: \${this.resources.food}\`,
            \`Население: \${this.resources.population}/\${this.resources.maxPopulation}\`
        ];
        
        resources.forEach((text, index) => {
            this.ctx.fillText(text, 20 + index * 120, 30);
        });
        
        // Панель строительства
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);
        
        const buttons = [
            { x: 20, text: 'Выбор', active: this.currentTool === 'select' },
            { x: 110, text: 'Казармы', active: this.currentTool === 'build_barracks' },
            { x: 200, text: 'Ферма', active: this.currentTool === 'build_farm' },
            { x: 290, text: 'Шахта', active: this.currentTool === 'build_mine' }
        ];
        
        buttons.forEach(button => {
            this.ctx.fillStyle = button.active ? '#4CAF50' : '#666';
            this.ctx.fillRect(button.x, this.canvas.height - 60, 80, 40);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(button.text, button.x + 40, this.canvas.height - 35);
        });
        
        // Панель выбранного объекта
        if (this.selectedUnit || this.selectedBuilding) {
            this.renderSelectionPanel();
        }
    }
    
    renderSelectionPanel() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(20, 100, 200, 200);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        if (this.selectedUnit) {
            this.ctx.fillText(\`Тип: \${this.selectedUnit.type}\`, 30, 125);
            this.ctx.fillText(\`HP: \${Math.ceil(this.selectedUnit.hp)}/\${this.selectedUnit.maxHp}\`, 30, 145);
            this.ctx.fillText(\`Задача: \${this.selectedUnit.task || 'нет'}\`, 30, 165);
        }
        
        if (this.selectedBuilding) {
            this.ctx.fillText(\`Тип: \${this.selectedBuilding.type}\`, 30, 125);
            this.ctx.fillText(\`HP: \${Math.ceil(this.selectedBuilding.hp)}/\${this.selectedBuilding.maxHp}\`, 30, 145);
            
            if (this.selectedBuilding.type === 'barracks' && this.selectedBuilding.isBuilt) {
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(30, 180, 80, 30);
                this.ctx.fillStyle = '#FFF';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Солдат', 70, 200);
            }
            
            if (this.selectedBuilding.type === 'townhall' && this.selectedBuilding.isBuilt) {
                this.ctx.fillStyle = '#FF9800';
                this.ctx.fillRect(30, 180, 80, 30);
                this.ctx.fillStyle = '#FFF';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Рабочий', 70, 200);
            }
            
            // Очередь производства
            const queue = this.productionQueues[this.selectedBuilding.type];
            if (queue && queue.length > 0) {
                this.ctx.fillStyle = '#FFF';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(\`Очередь: \${queue.length}\`, 30, 230);
                this.ctx.fillText(\`Время: \${Math.ceil(queue[0].timeLeft / 60)}с\`, 30, 250);
            }
        }
    }
    
    renderBuildCursor() {
        if (!this.mouseX || !this.mouseY) return;
        
        const mapX = Math.floor((this.mouseX + this.camera.x) / this.tileSize);
        const mapY = Math.floor((this.mouseY + this.camera.y) / this.tileSize);
        
        const screenX = mapX * this.tileSize - this.camera.x;
        const screenY = mapY * this.tileSize - this.camera.y;
        
        const sizes = {
            build_barracks: { width: 2, height: 2 },
            build_farm: { width: 1, height: 1 },
            build_mine: { width: 1, height: 1 }
        };
        
        const size = sizes[this.currentTool];
        if (!size) return;
        
        const canBuild = this.canBuildAt(mapX, mapY, size.width, size.height);
        
        this.ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(screenX, screenY, size.width * this.tileSize, size.height * this.tileSize);
        
        this.ctx.strokeStyle = canBuild ? '#00FF00' : '#FF0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenX, screenY, size.width * this.tileSize, size.height * this.tileSize);
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
    const game = new StrategyGame();
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
    background: #4CAF50;
    cursor: crosshair;
}

/* Strategy специфичные стили */
.strategy-ui {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
}

.resource-panel {
    background: rgba(0, 0, 0, 0.8);
    border-bottom: 2px solid #333;
    padding: 10px;
    display: flex;
    justify-content: space-between;
}

.resource-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: white;
    font-weight: bold;
}

.resource-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
}

.wood-icon { background: #8BC34A; }
.stone-icon { background: #9E9E9E; }
.gold-icon { background: #FFD700; }
.food-icon { background: #FF5722; }

.build-panel {
    background: rgba(0, 0, 0, 0.8);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    display: flex;
    gap: 10px;
}

.build-button {
    background: #666;
    border: 2px solid #888;
    border-radius: 4px;
    color: white;
    padding: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 80px;
    text-align: center;
}

.build-button:hover {
    background: #777;
    border-color: #aaa;
}

.build-button.active {
    background: #4CAF50;
    border-color: #8BC34A;
}

.selection-panel {
    position: fixed;
    top: 100px;
    left: 20px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 15px;
    color: white;
    min-width: 200px;
}

.unit-info, .building-info {
    margin-bottom: 10px;
}

.health-bar-strategy {
    background: #333;
    border: 1px solid #666;
    height: 8px;
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    margin: 5px 0;
}

.health-fill-strategy {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
}

.production-queue {
    background: #333;
    border-radius: 4px;
    padding: 8px;
    margin: 5px 0;
}

.queue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
    border-bottom: 1px solid #555;
}

.queue-item:last-child {
    border-bottom: none;
}

/* Анимации для юнитов */
@keyframes unitMove {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.unit-moving {
    animation: unitMove 0.5s ease-in-out;
}

/* Эффекты для строительства */
@keyframes buildProgress {
    0% { opacity: 0.3; }
    100% { opacity: 1; }
}

.building-constructing {
    animation: buildProgress 2s infinite alternate;
}

/* Подсветка для выбранных объектов */
.selected {
    box-shadow: 0 0 10px #FFFF00;
    border: 2px solid #FFFF00;
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'worker', prompt: `Strategy game worker unit sprite, ${design.artStyle || 'pixel art'} style, medieval peasant with tools, top-down view, 32x32 pixels` },
        { name: 'soldier', prompt: `Strategy game soldier unit sprite, ${design.artStyle || 'pixel art'} style, armored warrior with sword, top-down view, 32x32 pixels` },
        { name: 'townhall', prompt: `Strategy game town hall building sprite, ${design.artStyle || 'pixel art'} style, large medieval castle, top-down view, 64x64 pixels` },
        { name: 'barracks', prompt: `Strategy game barracks building sprite, ${design.artStyle || 'pixel art'} style, military training facility, top-down view, 64x64 pixels` },
        { name: 'farm', prompt: `Strategy game farm building sprite, ${design.artStyle || 'pixel art'} style, agricultural building with fields, top-down view, 32x32 pixels` },
        { name: 'mine', prompt: `Strategy game mine building sprite, ${design.artStyle || 'pixel art'} style, stone quarry entrance, top-down view, 32x32 pixels` },
        { name: 'tree', prompt: `Resource tree sprite for strategy game, ${design.artStyle || 'pixel art'} style, lush green tree, top-down view, 32x32 pixels` },
        { name: 'stone_deposit', prompt: `Stone resource deposit sprite, ${design.artStyle || 'pixel art'} style, gray rocky outcrop, top-down view, 32x32 pixels` },
        { name: 'gold_deposit', prompt: `Gold resource deposit sprite, ${design.artStyle || 'pixel art'} style, golden ore vein, top-down view, 32x32 pixels` }
      ],
      sounds: [
        { name: 'unit_select', prompt: 'Unit selection sound effect, strategy game style, brief acknowledgment beep' },
        { name: 'build_complete', prompt: 'Building construction completion sound, strategy game style, satisfying construction finish' },
        { name: 'resource_gather', prompt: 'Resource gathering sound effect, strategy game style, tools working on materials' },
        { name: 'unit_move', prompt: 'Unit movement acknowledgment sound, strategy game style, brief confirmation' },
        { name: 'building_place', prompt: 'Building placement sound effect, strategy game style, construction start sound' }
      ],
      backgrounds: [
        { name: 'grass_terrain', prompt: `Strategy game terrain background, ${design.artStyle || 'pixel art'} style, green grassland with subtle texture, tileable, top-down view` },
        { name: 'strategic_map', prompt: `Strategy game world map background, ${design.artStyle || 'pixel art'} style, varied terrain with rivers and hills, top-down view` }
      ]
    };
  }
} 