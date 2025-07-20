import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class RacingTemplate extends BaseGameTemplate {
  name = 'racing';
  genre = 'racing';
  description = 'Гоночная игра с управлением автомобилем и препятствиями';

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
// ${prompt.title} - Racing Game
class RacingGame {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = Math.min(window.innerWidth, 800);
        this.canvas.height = Math.min(window.innerHeight, 600);
        
        // Игровое состояние
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('racingBestScore') || '0');
        this.speed = 0;
        this.maxSpeed = 12;
        this.acceleration = 0.2;
        this.deceleration = 0.1;
        
        // Игрок (автомобиль)
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 120,
            width: 50,
            height: 80,
            speed: 0,
            color: '#FF4444'
        };
        
        // Дорога
        this.roadWidth = 400;
        this.roadX = (this.canvas.width - this.roadWidth) / 2;
        this.laneWidth = this.roadWidth / 3;
        
        // Полосы движения (0 = левая, 1 = центр, 2 = правая)
        this.currentLane = 1;
        this.targetLane = 1;
        this.laneChangeSpeed = 8;
        
        // Препятствия
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleSpawnRate = 120; // фреймы
        
        // Дорожная разметка
        this.roadMarkings = [];
        this.initRoadMarkings();
        
        // Бонусы
        this.bonuses = [];
        this.bonusTimer = 0;
        
        // Эффекты
        this.particles = [];
        
        // Управление
        this.keys = {};
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (this.gameState === 'menu' && e.key === 'Enter') {
                this.startGame();
            }
            
            if (this.gameState === 'playing') {
                this.handleGameInput(e.key);
            }
            
            if (this.gameState === 'gameOver' && e.key === 'Enter') {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Сенсорное управление
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            if (this.gameState === 'playing') {
                if (touchX < this.canvas.width / 3) {
                    this.changeLane(-1);
                } else if (touchX > this.canvas.width * 2 / 3) {
                    this.changeLane(1);
                }
            }
        });
    }
    
    handleGameInput(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.changeLane(-1);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.changeLane(1);
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.accelerate = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.brake = true;
                break;
        }
    }
    
    changeLane(direction) {
        const newLane = this.targetLane + direction;
        if (newLane >= 0 && newLane <= 2) {
            this.targetLane = newLane;
        }
    }
    
    initRoadMarkings() {
        for (let i = 0; i < 10; i++) {
            this.roadMarkings.push({
                x: this.roadX + this.laneWidth,
                y: i * 80,
                width: 4,
                height: 40
            });
            this.roadMarkings.push({
                x: this.roadX + this.laneWidth * 2,
                y: i * 80,
                width: 4,
                height: 40
            });
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.speed = 0;
        this.obstacles = [];
        this.bonuses = [];
        this.particles = [];
        this.obstacleTimer = 0;
        this.bonusTimer = 0;
        this.currentLane = 1;
        this.targetLane = 1;
        this.player.x = this.roadX + this.laneWidth + this.laneWidth / 2 - this.player.width / 2;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateObstacles();
        this.updateBonuses();
        this.updateRoadMarkings();
        this.updateParticles();
        this.updateScore();
        this.checkCollisions();
        this.spawnObstacles();
        this.spawnBonuses();
    }
    
    updatePlayer() {
        // Ускорение/торможение
        if (this.keys.accelerate || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration);
        } else if (this.keys.brake || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.speed = Math.max(0, this.speed - this.deceleration * 2);
        } else {
            // Автоматическое ускорение
            this.speed = Math.min(this.maxSpeed * 0.7, this.speed + this.acceleration * 0.3);
        }
        
        // Смена полосы
        if (this.currentLane !== this.targetLane) {
            const targetX = this.roadX + this.targetLane * this.laneWidth + this.laneWidth / 2 - this.player.width / 2;
            const diff = targetX - this.player.x;
            
            if (Math.abs(diff) < this.laneChangeSpeed) {
                this.player.x = targetX;
                this.currentLane = this.targetLane;
            } else {
                this.player.x += Math.sign(diff) * this.laneChangeSpeed;
            }
        }
        
        // Генерируем частицы выхлопа
        if (this.speed > 3) {
            this.addExhaustParticle();
        }
    }
    
    updateObstacles() {
        this.obstacles.forEach((obstacle, index) => {
            obstacle.y += this.speed + obstacle.speed;
            
            // Удаляем препятствия, ушедшие за экран
            if (obstacle.y > this.canvas.height) {
                this.obstacles.splice(index, 1);
                this.score += 10; // Очки за пройденное препятствие
            }
        });
    }
    
    updateBonuses() {
        this.bonuses.forEach((bonus, index) => {
            bonus.y += this.speed + 2;
            bonus.rotation += 0.1;
            
            // Удаляем бонусы, ушедшие за экран
            if (bonus.y > this.canvas.height) {
                this.bonuses.splice(index, 1);
            }
        });
    }
    
    updateRoadMarkings() {
        this.roadMarkings.forEach(marking => {
            marking.y += this.speed;
            
            // Переносим разметку наверх, когда она уходит за экран
            if (marking.y > this.canvas.height) {
                marking.y = -40;
            }
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            particle.alpha = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    updateScore() {
        this.score += Math.floor(this.speed);
        
        // Увеличиваем сложность со временем
        this.maxSpeed = 12 + Math.floor(this.score / 1000) * 2;
        this.obstacleSpawnRate = Math.max(60, 120 - Math.floor(this.score / 500) * 10);
    }
    
    spawnObstacles() {
        this.obstacleTimer++;
        
        if (this.obstacleTimer >= this.obstacleSpawnRate) {
            this.obstacleTimer = 0;
            
            // Случайная полоса
            const lane = Math.floor(Math.random() * 3);
            const x = this.roadX + lane * this.laneWidth + this.laneWidth / 2 - 25;
            
            const obstacle = {
                x,
                y: -80,
                width: 50,
                height: 80,
                speed: Math.random() * 2,
                type: Math.random() > 0.7 ? 'truck' : 'car',
                color: \`hsl(\${Math.random() * 360}, 70%, 50%)\`
            };
            
            this.obstacles.push(obstacle);
        }
    }
    
    spawnBonuses() {
        this.bonusTimer++;
        
        if (this.bonusTimer >= 300) { // Каждые 5 секунд
            this.bonusTimer = 0;
            
            if (Math.random() < 0.3) { // 30% шанс
                const lane = Math.floor(Math.random() * 3);
                const x = this.roadX + lane * this.laneWidth + this.laneWidth / 2 - 15;
                
                const bonus = {
                    x,
                    y: -30,
                    width: 30,
                    height: 30,
                    rotation: 0,
                    type: Math.random() > 0.5 ? 'coin' : 'boost',
                    collected: false
                };
                
                this.bonuses.push(bonus);
            }
        }
    }
    
    checkCollisions() {
        // Столкновения с препятствиями
        this.obstacles.forEach(obstacle => {
            if (this.isColliding(this.player, obstacle)) {
                this.crash();
            }
        });
        
        // Сбор бонусов
        this.bonuses.forEach((bonus, index) => {
            if (!bonus.collected && this.isColliding(this.player, bonus)) {
                bonus.collected = true;
                this.collectBonus(bonus);
                this.bonuses.splice(index, 1);
            }
        });
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    collectBonus(bonus) {
        if (bonus.type === 'coin') {
            this.score += 50;
            this.addCoinParticles(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2);
        } else if (bonus.type === 'boost') {
            this.speed = Math.min(this.maxSpeed + 5, this.speed + 3);
            this.addBoostParticles(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2);
        }
    }
    
    addExhaustParticle() {
        if (Math.random() < 0.3) {
            this.particles.push({
                x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
                y: this.player.y + this.player.height,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2 + 1,
                life: 30,
                maxLife: 30,
                alpha: 1,
                color: \`rgb(\${100 + Math.random() * 50}, \${100 + Math.random() * 50}, \${100 + Math.random() * 50})\`,
                size: 3 + Math.random() * 3
            });
        }
    }
    
    addCoinParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 40,
                maxLife: 40,
                alpha: 1,
                color: '#FFD700',
                size: 2 + Math.random() * 2
            });
        }
    }
    
    addBoostParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                alpha: 1,
                color: '#00FFFF',
                size: 2 + Math.random() * 3
            });
        }
    }
    
    crash() {
        this.gameState = 'gameOver';
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('racingBestScore', this.bestScore.toString());
        }
        
        // Добавляем частицы взрыва
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 60,
                maxLife: 60,
                alpha: 1,
                color: \`rgb(\${255}, \${Math.random() * 100}, 0)\`,
                size: 3 + Math.random() * 5
            });
        }
    }
    
    restart() {
        this.startGame();
    }
    
    render() {
        // Очищаем экран
        this.ctx.fillStyle = '#2E7D32'; // Трава по бокам
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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
        this.ctx.fillText('${prompt.title}', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.fillText(\`Лучший результат: \${this.bestScore}\`, this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Enter для начала', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Стрелки/WASD - управление', this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.fillText('Уклоняйтесь от препятствий, собирайте бонусы!', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
    
    renderGame() {
        // Дорога
        this.ctx.fillStyle = '#424242';
        this.ctx.fillRect(this.roadX, 0, this.roadWidth, this.canvas.height);
        
        // Обочины
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(this.roadX - 5, 0, 5, this.canvas.height);
        this.ctx.fillRect(this.roadX + this.roadWidth, 0, 5, this.canvas.height);
        
        // Дорожная разметка
        this.ctx.fillStyle = '#FFFFFF';
        this.roadMarkings.forEach(marking => {
            this.ctx.fillRect(marking.x, marking.y, marking.width, marking.height);
        });
        
        // Препятствия
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Детали автомобиля
            this.ctx.fillStyle = '#333';
            if (obstacle.type === 'truck') {
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 10, obstacle.width - 10, 15);
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 35, obstacle.width - 10, 35);
            } else {
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 15, obstacle.width - 10, 50);
            }
            
            // Окна
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.fillRect(obstacle.x + 10, obstacle.y + 5, obstacle.width - 20, 8);
        });
        
        // Бонусы
        this.bonuses.forEach(bonus => {
            this.ctx.save();
            this.ctx.translate(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2);
            this.ctx.rotate(bonus.rotation);
            
            if (bonus.type === 'coin') {
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillRect(-bonus.width / 2, -bonus.height / 2, bonus.width, bonus.height);
                this.ctx.fillStyle = '#FFA000';
                this.ctx.fillRect(-bonus.width / 2 + 5, -bonus.height / 2 + 5, bonus.width - 10, bonus.height - 10);
            } else if (bonus.type === 'boost') {
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.fillRect(-bonus.width / 2, -bonus.height / 2, bonus.width, bonus.height);
                this.ctx.fillStyle = '#0080FF';
                this.ctx.fillRect(-bonus.width / 2 + 3, -bonus.height / 2 + 3, bonus.width - 6, bonus.height - 6);
            }
            
            this.ctx.restore();
        });
        
        // Игрок
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Детали игрока
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.player.x + 5, this.player.y + 15, this.player.width - 10, 50);
        
        // Окна игрока
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(this.player.x + 10, this.player.y + 65, this.player.width - 20, 8);
        
        // Частицы
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        });
        this.ctx.globalAlpha = 1;
        
        // UI
        this.renderUI();
    }
    
    renderUI() {
        // Спидометр
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 150, 20, 130, 80);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Скорость:', this.canvas.width - 140, 40);
        this.ctx.fillText(\`\${Math.floor(this.speed * 10)} км/ч\`, this.canvas.width - 140, 60);
        this.ctx.fillText(\`Очки: \${this.score}\`, this.canvas.width - 140, 80);
        
        // Индикатор полосы
        const laneIndicatorY = this.canvas.height - 100;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(20, laneIndicatorY, 120, 60);
        
        for (let i = 0; i < 3; i++) {
            this.ctx.fillStyle = i === this.currentLane ? '#4CAF50' : '#666';
            this.ctx.fillRect(30 + i * 30, laneIndicatorY + 20, 20, 20);
        }
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Полоса', 80, laneIndicatorY + 15);
        
        // Мобильные подсказки
        if ('ontouchstart' in window) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, this.canvas.height - 40, this.canvas.width, 40);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Касание слева/справа - смена полосы', this.canvas.width / 2, this.canvas.height - 20);
        }
    }
    
    renderGameOver() {
        // Рендерим игру на фоне
        this.renderGame();
        
        // Накладываем затемнение
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#F44336';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('АВАРИЯ!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(\`Ваш результат: \${this.score}\`, this.canvas.width / 2, this.canvas.height / 2 - 30);
        this.ctx.fillText(\`Лучший результат: \${this.bestScore}\`, this.canvas.width / 2, this.canvas.height / 2);
        
        if (this.score === this.bestScore && this.score > 0) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = '18px Arial';
            this.ctx.fillText('🎉 НОВЫЙ РЕКОРД! 🎉', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Enter для повтора', this.canvas.width / 2, this.canvas.height / 2 + 80);
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
    const game = new RacingGame();
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

/* Racing специфичные стили */
.racing-ui {
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
}

.speedometer {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #FFD700;
    border-radius: 50%;
    width: 120px;
    height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
}

.speed-value {
    font-size: 24px;
    font-weight: bold;
    color: #FFD700;
}

.speed-unit {
    font-size: 12px;
    color: #CCC;
}

.lane-indicator {
    position: fixed;
    bottom: 80px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    color: white;
}

.lane-slot {
    width: 20px;
    height: 20px;
    background: #666;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.lane-slot.active {
    background: #4CAF50;
    box-shadow: 0 0 10px #4CAF50;
}

/* Эффекты частиц */
@keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
    50% { opacity: 1; transform: scale(1) rotate(180deg); }
}

.sparkle {
    animation: sparkle 1s infinite;
}

@keyframes exhaust {
    0% { opacity: 0.8; transform: scale(0.5); }
    100% { opacity: 0; transform: scale(2); }
}

.exhaust-particle {
    animation: exhaust 0.5s ease-out forwards;
}

/* Анимации для бонусов */
@keyframes coinSpin {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
}

.coin-bonus {
    animation: coinSpin 2s linear infinite;
}

@keyframes boostPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
}

.boost-bonus {
    animation: boostPulse 1s ease-in-out infinite;
}

/* Дорожные эффекты */
.road-marking {
    background: white;
    opacity: 0.8;
}

.road-surface {
    background: linear-gradient(180deg, #424242 0%, #383838 50%, #424242 100%);
}

/* Эффекты столкновения */
@keyframes crash {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    75% { transform: rotate(5deg); }
}

.crash-effect {
    animation: crash 0.1s infinite;
}

/* Мобильная адаптация */
@media (max-width: 768px) {
    .speedometer {
        width: 80px;
        height: 80px;
        top: 10px;
        right: 10px;
    }
    
    .speed-value {
        font-size: 16px;
    }
    
    .speed-unit {
        font-size: 10px;
    }
    
    .lane-indicator {
        bottom: 60px;
        left: 10px;
        padding: 5px;
    }
    
    .lane-slot {
        width: 15px;
        height: 15px;
    }
}

/* Эффекты скорости */
.speed-lines {
    position: fixed;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
}

.speed-line {
    position: absolute;
    width: 2px;
    height: 20px;
    background: rgba(255, 255, 255, 0.6);
    animation: speedLine 0.1s linear infinite;
}

@keyframes speedLine {
    0% { transform: translateY(-20px); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(100vh); opacity: 0; }
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'player_car', prompt: `Racing game player car sprite, ${design.artStyle || 'pixel art'} style, sporty red car, top-down view, 50x80 pixels` },
        { name: 'enemy_car', prompt: `Racing game enemy car sprite, ${design.artStyle || 'pixel art'} style, various colored cars, top-down view, 50x80 pixels` },
        { name: 'truck_obstacle', prompt: `Racing game truck obstacle sprite, ${design.artStyle || 'pixel art'} style, large delivery truck, top-down view, 50x80 pixels` },
        { name: 'coin_bonus', prompt: `Racing game coin bonus sprite, ${design.artStyle || 'pixel art'} style, golden coin with shine effect, 30x30 pixels` },
        { name: 'boost_bonus', prompt: `Racing game speed boost bonus sprite, ${design.artStyle || 'pixel art'} style, cyan energy orb with glow, 30x30 pixels` },
        { name: 'road_texture', prompt: `Racing game road texture, ${design.artStyle || 'pixel art'} style, asphalt with lane markings, tileable pattern` },
        { name: 'grass_border', prompt: `Racing game grass border texture, ${design.artStyle || 'pixel art'} style, green grass for roadside, tileable` }
      ],
      sounds: [
        { name: 'engine_rev', prompt: 'Car engine revving sound effect, racing game style, powerful motor acceleration' },
        { name: 'car_crash', prompt: 'Car crash sound effect, racing game style, metal collision and breaking glass' },
        { name: 'coin_collect', prompt: 'Coin collection sound effect, racing game style, positive chime pickup' },
        { name: 'boost_pickup', prompt: 'Speed boost pickup sound effect, racing game style, energetic power-up sound' },
        { name: 'tire_screech', prompt: 'Tire screeching sound effect, racing game style, rubber on asphalt' }
      ],
      backgrounds: [
        { name: 'highway_scenery', prompt: `Racing game highway background, ${design.artStyle || 'pixel art'} style, roadside scenery with trees and buildings` },
        { name: 'racing_track', prompt: `Racing game track background, ${design.artStyle || 'pixel art'} style, professional racing circuit with barriers` }
      ]
    };
  }
} 