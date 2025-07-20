import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class SimulationTemplate extends BaseGameTemplate {
  name = 'simulation';
  genre = 'simulation';
  description = 'Симуляция с управлением ресурсами, процессами и развитием системы';

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
// ${prompt.title} - Simulation Game
class SimulationGame {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = Math.min(window.innerWidth, 1200);
        this.canvas.height = Math.min(window.innerHeight, 800);
        
        // Игровое состояние
        this.gameState = 'menu'; // menu, playing, paused
        this.gameSpeed = 1; // 1x, 2x, 4x скорость
        this.time = 0;
        this.day = 1;
        
        // Ресурсы
        this.resources = {
            money: 10000,
            energy: 100,
            maxEnergy: 100,
            population: 0,
            maxPopulation: 50,
            happiness: 80,
            environment: 90,
            research: 0,
            experience: 0
        };
        
        // Сетка для размещения объектов
        this.gridSize = 40;
        this.gridWidth = Math.floor(this.canvas.width / this.gridSize);
        this.gridHeight = Math.floor(this.canvas.height / this.gridSize);
        
        // Камера
        this.camera = { x: 0, y: 0 };
        this.cameraSpeed = 5;
        
        // Объекты симуляции
        this.buildings = [];
        this.people = [];
        this.vehicles = [];
        this.effects = [];
        
        // Режим строительства
        this.buildMode = null; // 'house', 'factory', 'park', 'road', etc.
        this.selectedObject = null;
        
        // Статистика
        this.stats = {
            totalBuildings: 0,
            dailyIncome: 0,
            dailyExpenses: 0,
            populationGrowth: 0,
            pollution: 0
        };
        
        // Исследования и улучшения
        this.research = {
            available: ['solar_power', 'recycling', 'automation', 'green_building'],
            completed: [],
            inProgress: null,
            progressTime: 0
        };
        
        // События и задачи
        this.events = [];
        this.tasks = [
            { id: 'build_houses', title: 'Построить 5 домов', target: 5, current: 0, reward: 5000 },
            { id: 'reach_population', title: 'Достичь населения 20', target: 20, current: 0, reward: 3000 }
        ];
        
        // UI
        this.selectedUI = 'main'; // main, buildings, research, stats
        this.notifications = [];
        
        this.setupEventListeners();
        this.initializeMap();
        this.gameLoop();
    }
    
    initializeMap() {
        // Создаем базовые объекты
        this.buildings.push({
            id: 'town_hall',
            type: 'town_hall',
            x: 5,
            y: 5,
            width: 2,
            height: 2,
            level: 1,
            hp: 100,
            maxHp: 100,
            upkeep: 100,
            income: 500,
            population: 0,
            effects: { happiness: 10 }
        });
        
        // Добавляем несколько жителей
        for (let i = 0; i < 5; i++) {
            this.addPerson(200 + i * 50, 200 + Math.random() * 100);
        }
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
        
        // Переводим в координаты мира
        const worldX = Math.floor((mouseX + this.camera.x) / this.gridSize);
        const worldY = Math.floor((mouseY + this.camera.y) / this.gridSize);
        
        if (this.buildMode) {
            this.tryBuild(worldX, worldY);
        } else {
            this.selectObject(worldX, worldY);
        }
    }
    
    handleUIClick(mouseX, mouseY) {
        // Панель инструментов
        const toolbarY = this.canvas.height - 120;
        
        if (mouseY >= toolbarY) {
            const buttonWidth = 80;
            const buttons = [
                { x: 20, action: 'select', text: 'Выбор' },
                { x: 110, action: 'house', text: 'Дом' },
                { x: 200, action: 'factory', text: 'Завод' },
                { x: 290, action: 'park', text: 'Парк' },
                { x: 380, action: 'road', text: 'Дорога' },
                { x: 470, action: 'shop', text: 'Магазин' }
            ];
            
            for (const button of buttons) {
                if (mouseX >= button.x && mouseX <= button.x + buttonWidth) {
                    if (button.action === 'select') {
                        this.buildMode = null;
                    } else {
                        this.buildMode = button.action;
                    }
                    return true;
                }
            }
        }
        
        // Панель скорости
        if (mouseX >= this.canvas.width - 120 && mouseY <= 40) {
            if (mouseX >= this.canvas.width - 120 && mouseX <= this.canvas.width - 80) {
                this.gameSpeed = 1;
            } else if (mouseX >= this.canvas.width - 75 && mouseX <= this.canvas.width - 40) {
                this.gameSpeed = 2;
            } else if (mouseX >= this.canvas.width - 35) {
                this.gameSpeed = 4;
            }
            return true;
        }
        
        // Боковое меню
        if (mouseX <= 200) {
            if (mouseY >= 100 && mouseY <= 140) this.selectedUI = 'main';
            else if (mouseY >= 150 && mouseY <= 190) this.selectedUI = 'buildings';
            else if (mouseY >= 200 && mouseY <= 240) this.selectedUI = 'research';
            else if (mouseY >= 250 && mouseY <= 290) this.selectedUI = 'stats';
            return true;
        }
        
        return false;
    }
    
    handleKeydown(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.camera.x = Math.max(0, this.camera.x - this.cameraSpeed * this.gridSize);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.camera.x = Math.min((this.gridWidth - 20) * this.gridSize, this.camera.x + this.cameraSpeed * this.gridSize);
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.camera.y = Math.max(0, this.camera.y - this.cameraSpeed * this.gridSize);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.camera.y = Math.min((this.gridHeight - 15) * this.gridSize, this.camera.y + this.cameraSpeed * this.gridSize);
                break;
            case 'Escape':
                this.buildMode = null;
                this.selectedObject = null;
                break;
            case ' ':
                this.gameState = this.gameState === 'playing' ? 'paused' : 'playing';
                break;
        }
    }
    
    tryBuild(x, y) {
        const buildingData = this.getBuildingData(this.buildMode);
        if (!buildingData) return;
        
        // Проверяем ресурсы
        if (this.resources.money < buildingData.cost) {
            this.addNotification('Недостаточно денег!', 'error');
            return;
        }
        
        // Проверяем место
        if (!this.canBuildAt(x, y, buildingData.width, buildingData.height)) {
            this.addNotification('Место занято!', 'error');
            return;
        }
        
        // Строим
        this.resources.money -= buildingData.cost;
        
        const building = {
            id: \`\${this.buildMode}_\${Date.now()}\`,
            type: this.buildMode,
            x, y,
            width: buildingData.width,
            height: buildingData.height,
            level: 1,
            hp: buildingData.hp,
            maxHp: buildingData.hp,
            upkeep: buildingData.upkeep,
            income: buildingData.income,
            population: buildingData.population,
            effects: buildingData.effects || {},
            productionTimer: 0
        };
        
        this.buildings.push(building);
        this.stats.totalBuildings++;
        
        this.addNotification(\`\${buildingData.name} построен!\`, 'success');
        this.updateTasks();
        
        // Добавляем жителей для домов
        if (this.buildMode === 'house' && this.resources.population < this.resources.maxPopulation) {
            for (let i = 0; i < building.population; i++) {
                this.addPerson(x * this.gridSize, y * this.gridSize);
            }
        }
    }
    
    getBuildingData(type) {
        const buildings = {
            house: {
                name: 'Дом',
                cost: 1000,
                width: 1,
                height: 1,
                hp: 100,
                upkeep: 50,
                income: 200,
                population: 3,
                effects: { happiness: 5 }
            },
            factory: {
                name: 'Завод',
                cost: 5000,
                width: 2,
                height: 2,
                hp: 200,
                upkeep: 200,
                income: 800,
                population: 0,
                effects: { environment: -10, happiness: -5 }
            },
            park: {
                name: 'Парк',
                cost: 2000,
                width: 2,
                height: 2,
                hp: 50,
                upkeep: 100,
                income: 0,
                population: 0,
                effects: { happiness: 15, environment: 10 }
            },
            shop: {
                name: 'Магазин',
                cost: 3000,
                width: 1,
                height: 1,
                hp: 80,
                upkeep: 150,
                income: 500,
                population: 0,
                effects: { happiness: 8 }
            },
            road: {
                name: 'Дорога',
                cost: 100,
                width: 1,
                height: 1,
                hp: 30,
                upkeep: 10,
                income: 0,
                population: 0,
                effects: {}
            }
        };
        
        return buildings[type];
    }
    
    canBuildAt(x, y, width, height) {
        // Проверяем границы
        if (x < 0 || y < 0 || x + width > this.gridWidth || y + height > this.gridHeight) {
            return false;
        }
        
        // Проверяем пересечения
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
    
    selectObject(x, y) {
        this.selectedObject = null;
        
        for (const building of this.buildings) {
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                this.selectedObject = building;
                break;
            }
        }
    }
    
    addPerson(x, y) {
        if (this.resources.population >= this.resources.maxPopulation) return;
        
        const person = {
            id: \`person_\${Date.now()}_\${Math.random()}\`,
            x: x + Math.random() * 20,
            y: y + Math.random() * 20,
            vx: 0,
            vy: 0,
            target: null,
            state: 'idle', // idle, walking, working, resting
            stateTimer: 0,
            happiness: 50 + Math.random() * 30,
            workplace: null,
            home: null,
            color: \`hsl(\${Math.random() * 360}, 70%, 50%)\`
        };
        
        this.people.push(person);
        this.resources.population++;
        this.resources.maxPopulation = Math.min(this.resources.maxPopulation + 1, this.calculateMaxPopulation());
    }
    
    calculateMaxPopulation() {
        return this.buildings
            .filter(b => b.type === 'house')
            .reduce((sum, house) => sum + house.population, 10);
    }
    
    addNotification(message, type = 'info') {
        this.notifications.push({
            id: Date.now(),
            message,
            type,
            life: 180 // 3 секунды при 60 FPS
        });
        
        // Ограничиваем количество уведомлений
        if (this.notifications.length > 5) {
            this.notifications.shift();
        }
    }
    
    updateTasks() {
        this.tasks.forEach(task => {
            if (task.id === 'build_houses') {
                task.current = this.buildings.filter(b => b.type === 'house').length;
            } else if (task.id === 'reach_population') {
                task.current = this.resources.population;
            }
            
            // Проверяем выполнение
            if (task.current >= task.target && !task.completed) {
                task.completed = true;
                this.resources.money += task.reward;
                this.addNotification(\`Задача выполнена! +\${task.reward} денег\`, 'success');
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Ускорение времени
        for (let speed = 0; speed < this.gameSpeed; speed++) {
            this.updateGameLogic();
        }
    }
    
    updateGameLogic() {
        this.time++;
        
        // Новый день каждые 10 секунд
        if (this.time % 600 === 0) {
            this.day++;
            this.processEndOfDay();
        }
        
        this.updateBuildings();
        this.updatePeople();
        this.updateResources();
        this.updateNotifications();
        this.updateResearch();
        this.updateEffects();
        
        // Случайные события
        if (Math.random() < 0.001) {
            this.triggerRandomEvent();
        }
    }
    
    updateBuildings() {
        this.buildings.forEach(building => {
            building.productionTimer++;
            
            // Производство каждые 5 секунд
            if (building.productionTimer >= 300) {
                building.productionTimer = 0;
                
                if (building.income > 0) {
                    this.resources.money += building.income;
                    this.addEffect(
                        building.x * this.gridSize + building.width * this.gridSize / 2,
                        building.y * this.gridSize,
                        'income',
                        \`+\${building.income}\`
                    );
                }
            }
        });
    }
    
    updatePeople() {
        this.people.forEach(person => {
            person.stateTimer++;
            
            // Простое поведение ИИ
            if (person.state === 'idle' && person.stateTimer > 120) {
                // Ищем место для прогулки
                person.target = {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height
                };
                person.state = 'walking';
                person.stateTimer = 0;
            }
            
            if (person.state === 'walking') {
                if (person.target) {
                    const dx = person.target.x - person.x;
                    const dy = person.target.y - person.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 5) {
                        person.state = 'idle';
                        person.target = null;
                        person.stateTimer = 0;
                    } else {
                        const speed = 0.5;
                        person.x += (dx / distance) * speed;
                        person.y += (dy / distance) * speed;
                    }
                }
            }
            
            // Обновляем счастье
            person.happiness = Math.max(0, Math.min(100, person.happiness + (Math.random() - 0.5) * 0.1));
        });
    }
    
    updateResources() {
        // Ежедневные расходы каждые 60 фреймов (1 секунда)
        if (this.time % 60 === 0) {
            const upkeep = this.buildings.reduce((sum, b) => sum + b.upkeep, 0);
            this.resources.money = Math.max(0, this.resources.money - upkeep / 10); // Деленно на 10 для плавности
            this.stats.dailyExpenses = upkeep;
        }
        
        // Обновляем счастье и экологию
        let totalHappiness = 0;
        let totalEnvironment = 0;
        
        this.buildings.forEach(building => {
            if (building.effects.happiness) totalHappiness += building.effects.happiness;
            if (building.effects.environment) totalEnvironment += building.effects.environment;
        });
        
        this.resources.happiness = Math.max(0, Math.min(100, 50 + totalHappiness));
        this.resources.environment = Math.max(0, Math.min(100, 50 + totalEnvironment));
        
        // Энергия
        if (this.resources.energy < this.resources.maxEnergy) {
            this.resources.energy = Math.min(this.resources.maxEnergy, this.resources.energy + 0.1);
        }
    }
    
    updateNotifications() {
        this.notifications.forEach((notif, index) => {
            notif.life--;
            if (notif.life <= 0) {
                this.notifications.splice(index, 1);
            }
        });
    }
    
    updateResearch() {
        if (this.research.inProgress) {
            this.research.progressTime++;
            
            if (this.research.progressTime >= 1800) { // 30 секунд
                this.completeResearch(this.research.inProgress);
            }
        }
    }
    
    updateEffects() {
        this.effects.forEach((effect, index) => {
            effect.life--;
            effect.alpha = effect.life / effect.maxLife;
            effect.y -= 1;
            
            if (effect.life <= 0) {
                this.effects.splice(index, 1);
            }
        });
    }
    
    completeResearch(researchId) {
        this.research.completed.push(researchId);
        this.research.inProgress = null;
        this.research.progressTime = 0;
        
        const researchData = {
            solar_power: { name: 'Солнечная энергия', effect: 'Снижение расходов на 20%' },
            recycling: { name: 'Переработка', effect: 'Улучшение экологии' },
            automation: { name: 'Автоматизация', effect: 'Увеличение дохода на 30%' },
            green_building: { name: 'Экостроительство', effect: 'Экологичные здания' }
        };
        
        const research = researchData[researchId];
        this.addNotification(\`Исследование завершено: \${research.name}\`, 'success');
    }
    
    addEffect(x, y, type, text) {
        this.effects.push({
            x, y,
            type,
            text,
            life: 60,
            maxLife: 60,
            alpha: 1,
            color: type === 'income' ? '#4CAF50' : '#FFF'
        });
    }
    
    processEndOfDay() {
        this.addNotification(\`День \${this.day} завершен\`, 'info');
        
        // Ежедневная статистика
        this.stats.dailyIncome = this.buildings.reduce((sum, b) => sum + b.income, 0);
        this.stats.populationGrowth = Math.floor(this.resources.population * 0.05);
        
        // Добавляем новых жителей
        for (let i = 0; i < this.stats.populationGrowth; i++) {
            if (this.resources.population < this.resources.maxPopulation) {
                const randomBuilding = this.buildings.find(b => b.type === 'house');
                if (randomBuilding) {
                    this.addPerson(
                        randomBuilding.x * this.gridSize,
                        randomBuilding.y * this.gridSize
                    );
                }
            }
        }
    }
    
    triggerRandomEvent() {
        const events = [
            { 
                title: 'Фестиваль', 
                description: 'В городе проходит фестиваль!', 
                effect: () => { this.resources.happiness += 10; this.resources.money += 1000; }
            },
            { 
                title: 'Экологическая инициатива', 
                description: 'Жители заботятся об экологии', 
                effect: () => { this.resources.environment += 15; }
            },
            { 
                title: 'Инвестиции', 
                description: 'Получены инвестиции в развитие', 
                effect: () => { this.resources.money += 5000; }
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.addNotification(event.title + ': ' + event.description, 'event');
        event.effect();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else {
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
        this.ctx.fillText('Управление: WASD - камера, ЛКМ - действия, Space - пауза', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    renderGame() {
        // Фон (трава)
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сетка
        this.renderGrid();
        
        // Здания
        this.renderBuildings();
        
        // Люди
        this.renderPeople();
        
        // Эффекты
        this.renderEffects();
        
        // UI
        this.renderUI();
        
        // Курсор строительства
        if (this.buildMode) {
            this.renderBuildCursor();
        }
        
        if (this.gameState === 'paused') {
            this.renderPauseOverlay();
        }
    }
    
    renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const startX = -this.camera.x % this.gridSize;
        const startY = -this.camera.y % this.gridSize;
        
        for (let x = startX; x < this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    renderBuildings() {
        this.buildings.forEach(building => {
            const screenX = building.x * this.gridSize - this.camera.x;
            const screenY = building.y * this.gridSize - this.camera.y;
            const width = building.width * this.gridSize;
            const height = building.height * this.gridSize;
            
            // Цвета зданий
            const colors = {
                town_hall: '#FF9800',
                house: '#2196F3',
                factory: '#607D8B',
                park: '#4CAF50',
                shop: '#9C27B0',
                road: '#757575'
            };
            
            this.ctx.fillStyle = colors[building.type] || '#666';
            this.ctx.fillRect(screenX, screenY, width, height);
            
            // Рамка для выбранного здания
            if (building === this.selectedObject) {
                this.ctx.strokeStyle = '#FFFF00';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(screenX, screenY, width, height);
            }
            
            // Детали зданий
            if (building.type === 'house') {
                // Крыша
                this.ctx.fillStyle = '#F44336';
                this.ctx.fillRect(screenX + 5, screenY + 5, width - 10, 15);
                // Дверь
                this.ctx.fillStyle = '#8D6E63';
                this.ctx.fillRect(screenX + width/2 - 5, screenY + height - 15, 10, 15);
            } else if (building.type === 'factory') {
                // Труба
                this.ctx.fillStyle = '#424242';
                this.ctx.fillRect(screenX + width - 15, screenY - 10, 10, 20);
                // Дым
                if (this.time % 20 < 10) {
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                    this.ctx.fillRect(screenX + width - 10, screenY - 25, 5, 15);
                }
            } else if (building.type === 'park') {
                // Деревья
                this.ctx.fillStyle = '#2E7D32';
                this.ctx.beginPath();
                this.ctx.arc(screenX + 15, screenY + 15, 8, 0, Math.PI * 2);
                this.ctx.arc(screenX + width - 15, screenY + 15, 8, 0, Math.PI * 2);
                this.ctx.arc(screenX + 15, screenY + height - 15, 8, 0, Math.PI * 2);
                this.ctx.arc(screenX + width - 15, screenY + height - 15, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Полоска здоровья
            if (building.hp < building.maxHp) {
                const healthPercent = building.hp / building.maxHp;
                this.ctx.fillStyle = '#F44336';
                this.ctx.fillRect(screenX, screenY - 8, width, 4);
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(screenX, screenY - 8, width * healthPercent, 4);
            }
        });
    }
    
    renderPeople() {
        this.people.forEach(person => {
            const screenX = person.x - this.camera.x;
            const screenY = person.y - this.camera.y;
            
            // Пропускаем, если за экраном
            if (screenX < -10 || screenX > this.canvas.width + 10 ||
                screenY < -10 || screenY > this.canvas.height + 10) {
                return;
            }
            
            this.ctx.fillStyle = person.color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Индикатор счастья
            const happinessColor = person.happiness > 70 ? '#4CAF50' : 
                                  person.happiness > 40 ? '#FF9800' : '#F44336';
            this.ctx.fillStyle = happinessColor;
            this.ctx.fillRect(screenX - 2, screenY - 8, 4, 2);
        });
    }
    
    renderEffects() {
        this.effects.forEach(effect => {
            this.ctx.save();
            this.ctx.globalAlpha = effect.alpha;
            this.ctx.fillStyle = effect.color;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                effect.text,
                effect.x - this.camera.x,
                effect.y - this.camera.y
            );
            this.ctx.restore();
        });
    }
    
    renderUI() {
        // Боковая панель
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, 200, this.canvas.height);
        
        // Ресурсы
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        let yPos = 30;
        this.ctx.fillText(\`Деньги: \${Math.floor(this.resources.money)}\`, 10, yPos);
        yPos += 20;
        this.ctx.fillText(\`Население: \${this.resources.population}/\${this.resources.maxPopulation}\`, 10, yPos);
        yPos += 20;
        this.ctx.fillText(\`Счастье: \${Math.floor(this.resources.happiness)}\`, 10, yPos);
        yPos += 20;
        this.ctx.fillText(\`Экология: \${Math.floor(this.resources.environment)}\`, 10, yPos);
        yPos += 20;
        this.ctx.fillText(\`День: \${this.day}\`, 10, yPos);
        
        // Меню разделов
        yPos = 120;
        const sections = ['Главная', 'Здания', 'Исследования', 'Статистика'];
        sections.forEach((section, index) => {
            this.ctx.fillStyle = this.selectedUI === ['main', 'buildings', 'research', 'stats'][index] ? '#4CAF50' : '#666';
            this.ctx.fillRect(10, yPos, 180, 30);
            this.ctx.fillStyle = '#FFF';
            this.ctx.fillText(section, 20, yPos + 20);
            yPos += 40;
        });
        
        // Панель инструментов
        this.renderToolbar();
        
        // Панель скорости
        this.renderSpeedPanel();
        
        // Уведомления
        this.renderNotifications();
        
        // Информация о выбранном объекте
        if (this.selectedObject) {
            this.renderObjectInfo();
        }
    }
    
    renderToolbar() {
        const toolbarY = this.canvas.height - 120;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, toolbarY, this.canvas.width, 120);
        
        const buttons = [
            { x: 20, action: 'select', text: 'Выбор', active: !this.buildMode },
            { x: 110, action: 'house', text: 'Дом', active: this.buildMode === 'house' },
            { x: 200, action: 'factory', text: 'Завод', active: this.buildMode === 'factory' },
            { x: 290, action: 'park', text: 'Парк', active: this.buildMode === 'park' },
            { x: 380, action: 'road', text: 'Дорога', active: this.buildMode === 'road' },
            { x: 470, action: 'shop', text: 'Магазин', active: this.buildMode === 'shop' }
        ];
        
        buttons.forEach(button => {
            this.ctx.fillStyle = button.active ? '#4CAF50' : '#666';
            this.ctx.fillRect(button.x, toolbarY + 20, 80, 60);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(button.text, button.x + 40, toolbarY + 55);
            
            // Цена
            if (button.action !== 'select') {
                const buildingData = this.getBuildingData(button.action);
                if (buildingData) {
                    this.ctx.font = '10px Arial';
                    this.ctx.fillText(\`\${buildingData.cost}\`, button.x + 40, toolbarY + 70);
                }
            }
        });
    }
    
    renderSpeedPanel() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(this.canvas.width - 120, 0, 120, 40);
        
        ['1x', '2x', '4x'].forEach((speed, index) => {
            const active = this.gameSpeed === parseInt(speed);
            this.ctx.fillStyle = active ? '#4CAF50' : '#666';
            this.ctx.fillRect(this.canvas.width - 120 + index * 40, 5, 35, 30);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(speed, this.canvas.width - 102 + index * 40, 23);
        });
    }
    
    renderNotifications() {
        this.notifications.forEach((notif, index) => {
            const y = 300 + index * 40;
            const alpha = notif.life / 180;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            const colors = {
                info: '#2196F3',
                success: '#4CAF50',
                error: '#F44336',
                event: '#FF9800'
            };
            
            this.ctx.fillStyle = colors[notif.type] || '#666';
            this.ctx.fillRect(220, y, 300, 30);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(notif.message, 230, y + 20);
            
            this.ctx.restore();
        });
    }
    
    renderObjectInfo() {
        const obj = this.selectedObject;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(220, 100, 250, 150);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        let yPos = 125;
        this.ctx.fillText(\`Тип: \${obj.type}\`, 230, yPos);
        yPos += 20;
        this.ctx.fillText(\`Уровень: \${obj.level}\`, 230, yPos);
        yPos += 20;
        this.ctx.fillText(\`Здоровье: \${Math.ceil(obj.hp)}/\${obj.maxHp}\`, 230, yPos);
        yPos += 20;
        this.ctx.fillText(\`Доход: \${obj.income}\`, 230, yPos);
        yPos += 20;
        this.ctx.fillText(\`Расходы: \${obj.upkeep}\`, 230, yPos);
        yPos += 20;
        
        if (obj.population > 0) {
            this.ctx.fillText(\`Жители: \${obj.population}\`, 230, yPos);
        }
    }
    
    renderBuildCursor() {
        if (!this.mouseX || !this.mouseY) return;
        
        const buildingData = this.getBuildingData(this.buildMode);
        if (!buildingData) return;
        
        const gridX = Math.floor((this.mouseX + this.camera.x) / this.gridSize);
        const gridY = Math.floor((this.mouseY + this.camera.y) / this.gridSize);
        
        const screenX = gridX * this.gridSize - this.camera.x;
        const screenY = gridY * this.gridSize - this.camera.y;
        
        const canBuild = this.canBuildAt(gridX, gridY, buildingData.width, buildingData.height) &&
                        this.resources.money >= buildingData.cost;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = canBuild ? '#4CAF50' : '#F44336';
        this.ctx.fillRect(
            screenX, 
            screenY, 
            buildingData.width * this.gridSize, 
            buildingData.height * this.gridSize
        );
        this.ctx.restore();
        
        this.ctx.strokeStyle = canBuild ? '#4CAF50' : '#F44336';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            screenX, 
            screenY, 
            buildingData.width * this.gridSize, 
            buildingData.height * this.gridSize
        );
    }
    
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ПАУЗА', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Space для продолжения', this.canvas.width / 2, this.canvas.height / 2 + 40);
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
    const game = new SimulationGame();
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
    cursor: default;
}

/* Simulation специфичные стили */
.simulation-ui {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
}

.resource-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 200px;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px;
    color: white;
    border-right: 2px solid #333;
}

.resource-item {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    padding: 5px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.resource-name {
    font-weight: bold;
}

.resource-value {
    color: #4CAF50;
}

.toolbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 10px;
}

.tool-button {
    width: 80px;
    height: 80px;
    background: #666;
    border: 2px solid #888;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-size: 12px;
}

.tool-button:hover {
    background: #777;
    border-color: #aaa;
}

.tool-button.active {
    background: #4CAF50;
    border-color: #8BC34A;
}

.tool-cost {
    font-size: 10px;
    color: #FFD700;
    margin-top: 4px;
}

.speed-panel {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #333;
    border-radius: 0 0 0 8px;
}

.speed-button {
    width: 40px;
    height: 40px;
    background: #666;
    border: none;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
}

.speed-button:hover {
    background: #777;
}

.speed-button.active {
    background: #4CAF50;
}

.notification {
    position: fixed;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid;
    border-radius: 8px;
    padding: 10px 15px;
    color: white;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
}

.notification.info { border-color: #2196F3; }
.notification.success { border-color: #4CAF50; }
.notification.error { border-color: #F44336; }
.notification.event { border-color: #FF9800; }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.building-info {
    position: fixed;
    top: 100px;
    left: 220px;
    width: 250px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 15px;
    color: white;
}

.building-stat {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
    padding: 4px 0;
    border-bottom: 1px solid #444;
}

.stat-name {
    color: #CCC;
}

.stat-value {
    color: #4CAF50;
    font-weight: bold;
}

/* Эффекты для зданий */
@keyframes buildingConstruction {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
}

.building-constructing {
    animation: buildingConstruction 1s infinite;
}

@keyframes incomeEffect {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-30px); opacity: 0; }
}

.income-effect {
    animation: incomeEffect 1s ease-out;
    color: #4CAF50;
    font-weight: bold;
}

/* Эффекты для людей */
@keyframes personWalk {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.person-walking {
    animation: personWalk 0.5s infinite;
}

/* Индикаторы ресурсов */
.resource-bar {
    width: 100%;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
    margin: 2px 0;
}

.resource-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.resource-fill.money { background: #FFD700; }
.resource-fill.happiness { background: #4CAF50; }
.resource-fill.environment { background: #2196F3; }
.resource-fill.energy { background: #FF9800; }

/* Сетка */
.grid-overlay {
    opacity: 0.1;
    pointer-events: none;
}

/* Анимации курсора строительства */
@keyframes buildCursor {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
}

.build-cursor {
    animation: buildCursor 1s infinite;
}

/* Эффекты частиц */
.particle {
    position: absolute;
    pointer-events: none;
    font-size: 12px;
    font-weight: bold;
    color: #4CAF50;
    animation: particleFloat 1s ease-out forwards;
}

@keyframes particleFloat {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-30px); }
}

/* Мобильная адаптация */
@media (max-width: 768px) {
    .resource-panel {
        width: 150px;
        padding: 10px;
        font-size: 12px;
    }
    
    .toolbar {
        height: 80px;
        padding: 0 10px;
    }
    
    .tool-button {
        width: 60px;
        height: 60px;
        font-size: 10px;
    }
    
    .building-info {
        width: 200px;
        left: 160px;
        font-size: 12px;
    }
    
    .notification {
        right: 10px;
        max-width: 250px;
        font-size: 12px;
    }
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'house_building', prompt: `Simulation game house building sprite, ${design.artStyle || 'pixel art'} style, residential home, top-down view, 40x40 pixels` },
        { name: 'factory_building', prompt: `Simulation game factory building sprite, ${design.artStyle || 'pixel art'} style, industrial facility with chimney, top-down view, 80x80 pixels` },
        { name: 'park_building', prompt: `Simulation game park area sprite, ${design.artStyle || 'pixel art'} style, green space with trees, top-down view, 80x80 pixels` },
        { name: 'shop_building', prompt: `Simulation game shop building sprite, ${design.artStyle || 'pixel art'} style, commercial store, top-down view, 40x40 pixels` },
        { name: 'road_tile', prompt: `Simulation game road tile sprite, ${design.artStyle || 'pixel art'} style, asphalt street, top-down view, 40x40 pixels` },
        { name: 'town_hall', prompt: `Simulation game town hall building sprite, ${design.artStyle || 'pixel art'} style, government building, top-down view, 80x80 pixels` },
        { name: 'citizen', prompt: `Simulation game citizen sprite, ${design.artStyle || 'pixel art'} style, small person figure, top-down view, 8x8 pixels` },
        { name: 'grass_tile', prompt: `Simulation game grass tile texture, ${design.artStyle || 'pixel art'} style, green ground texture, tileable, 40x40 pixels` }
      ],
      sounds: [
        { name: 'building_place', prompt: 'Simulation game building placement sound, construction start, brief positive confirmation' },
        { name: 'cash_register', prompt: 'Simulation game money income sound, cash register ching, brief financial positive' },
        { name: 'notification_chime', prompt: 'Simulation game notification sound, gentle alert chime, brief attention sound' },
        { name: 'level_up', prompt: 'Simulation game achievement sound, progress unlock, positive accomplishment chime' },
        { name: 'error_buzz', prompt: 'Simulation game error sound, negative feedback buzz, brief rejection sound' }
      ],
      backgrounds: [
        { name: 'city_overview', prompt: `Simulation game city overview background, ${design.artStyle || 'pixel art'} style, aerial view of urban landscape` },
        { name: 'countryside', prompt: `Simulation game countryside background, ${design.artStyle || 'pixel art'} style, rural landscape for development` }
      ]
    };
  }
} 