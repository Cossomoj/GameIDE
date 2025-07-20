import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class FightingTemplate extends BaseGameTemplate {
  name = 'fighting';
  genre = 'fighting';
  description = 'Файтинг с боевой системой, комбо-атаками и специальными приемами';

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
// ${prompt.title} - Fighting Game
class FightingGame {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = Math.min(window.innerWidth, 900);
        this.canvas.height = Math.min(window.innerHeight, 600);
        
        // Игровое состояние
        this.gameState = 'menu'; // menu, fighting, roundEnd, gameOver
        this.round = 1;
        this.maxRounds = 3;
        this.player1Wins = 0;
        this.player2Wins = 0;
        
        // Физика
        this.gravity = 0.8;
        this.groundY = this.canvas.height - 100;
        
        // Игроки
        this.player1 = this.createPlayer(1, 150, this.groundY);
        this.player2 = this.createPlayer(2, this.canvas.width - 250, this.groundY);
        
        // Атаки и эффекты
        this.attacks = [];
        this.effects = [];
        
        // UI
        this.roundTimer = 60; // секунды
        this.frameTimer = 0;
        
        // Комбо система
        this.combos = {
            1: [], // история нажатий для игрока 1
            2: []  // история нажатий для игрока 2
        };
        this.comboTimeLimit = 60; // фреймы
        
        // Управление
        this.keys = {};
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    createPlayer(playerNum, x, y) {
        return {
            id: playerNum,
            x, y,
            width: 80,
            height: 120,
            vx: 0,
            vy: 0,
            onGround: true,
            facing: playerNum === 1 ? 1 : -1, // 1 = право, -1 = лево
            
            // Боевые характеристики
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            
            // Состояние
            state: 'idle', // idle, walking, jumping, attacking, blocking, stunned, ko
            stateTimer: 0,
            invulnerable: 0,
            
            // Движение
            speed: 4,
            jumpPower: -15,
            
            // Боевые параметры
            damage: 10,
            blockReduction: 0.3,
            
            // Анимация
            animFrame: 0,
            animTimer: 0,
            
            // Цвет (временно)
            color: playerNum === 1 ? '#4CAF50' : '#F44336'
        };
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (this.gameState === 'menu' && e.key === 'Enter') {
                this.startGame();
            }
            
            if (this.gameState === 'fighting') {
                this.handleFightingInput(e.key, true);
            }
            
            if (this.gameState === 'roundEnd' && e.key === 'Enter') {
                this.nextRound();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.handleFightingInput(e.key, false);
        });
    }
    
    handleFightingInput(key, pressed) {
        if (!pressed) return;
        
        // Игрок 1 (WASD + дополнительные клавиши)
        if (key === 'a' || key === 'A') this.addComboInput(1, 'left');
        if (key === 'd' || key === 'D') this.addComboInput(1, 'right');
        if (key === 'w' || key === 'W') this.addComboInput(1, 'up');
        if (key === 's' || key === 'S') this.addComboInput(1, 'down');
        if (key === 'q' || key === 'Q') this.addComboInput(1, 'punch');
        if (key === 'e' || key === 'E') this.addComboInput(1, 'kick');
        if (key === 'r' || key === 'R') this.addComboInput(1, 'special');
        
        // Игрок 2 (стрелки + дополнительные клавиши)
        if (key === 'ArrowLeft') this.addComboInput(2, 'left');
        if (key === 'ArrowRight') this.addComboInput(2, 'right');
        if (key === 'ArrowUp') this.addComboInput(2, 'up');
        if (key === 'ArrowDown') this.addComboInput(2, 'down');
        if (key === 'u' || key === 'U') this.addComboInput(2, 'punch');
        if (key === 'i' || key === 'I') this.addComboInput(2, 'kick');
        if (key === 'o' || key === 'O') this.addComboInput(2, 'special');
    }
    
    addComboInput(playerId, input) {
        const combo = this.combos[playerId];
        combo.push({ input, time: this.frameTimer });
        
        // Удаляем старые входы
        const cutoffTime = this.frameTimer - this.comboTimeLimit;
        this.combos[playerId] = combo.filter(c => c.time > cutoffTime);
        
        // Проверяем комбо
        this.checkCombos(playerId);
        
        // Выполняем базовые действия
        this.executeBasicAction(playerId, input);
    }
    
    checkCombos(playerId) {
        const combo = this.combos[playerId].map(c => c.input);
        const player = playerId === 1 ? this.player1 : this.player2;
        
        // Определенные комбо (последние N входов)
        const last3 = combo.slice(-3);
        const last4 = combo.slice(-4);
        
        // Файерболл: down, right, punch
        if (last3.join(',') === 'down,right,punch') {
            this.executeSpecialMove(player, 'fireball');
            this.combos[playerId] = []; // Очищаем комбо
        }
        
        // Драгон панч: right, down, right, punch
        if (last4.join(',') === 'right,down,right,punch') {
            this.executeSpecialMove(player, 'dragon_punch');
            this.combos[playerId] = [];
        }
        
        // Ураганный удар: down, left, kick
        if (last3.join(',') === 'down,left,kick') {
            this.executeSpecialMove(player, 'hurricane_kick');
            this.combos[playerId] = [];
        }
        
        // Комбо атака: punch, punch, kick
        if (last3.join(',') === 'punch,punch,kick') {
            this.executeSpecialMove(player, 'combo_attack');
            this.combos[playerId] = [];
        }
    }
    
    executeBasicAction(playerId, input) {
        const player = playerId === 1 ? this.player1 : this.player2;
        
        if (player.state === 'stunned' || player.state === 'ko') return;
        
        switch(input) {
            case 'left':
                if (player.state === 'idle' || player.state === 'walking') {
                    player.vx = -player.speed;
                    player.facing = -1;
                    player.state = 'walking';
                }
                break;
                
            case 'right':
                if (player.state === 'idle' || player.state === 'walking') {
                    player.vx = player.speed;
                    player.facing = 1;
                    player.state = 'walking';
                }
                break;
                
            case 'up':
                if (player.onGround && (player.state === 'idle' || player.state === 'walking')) {
                    player.vy = player.jumpPower;
                    player.onGround = false;
                    player.state = 'jumping';
                }
                break;
                
            case 'down':
                if (player.state === 'idle' || player.state === 'walking') {
                    player.state = 'blocking';
                    player.stateTimer = 30;
                }
                break;
                
            case 'punch':
                if (player.state === 'idle' || player.state === 'walking') {
                    this.executeAttack(player, 'punch');
                }
                break;
                
            case 'kick':
                if (player.state === 'idle' || player.state === 'walking') {
                    this.executeAttack(player, 'kick');
                }
                break;
                
            case 'special':
                if (player.mp >= 25 && (player.state === 'idle' || player.state === 'walking')) {
                    this.executeSpecialMove(player, 'energy_blast');
                    player.mp -= 25;
                }
                break;
        }
    }
    
    executeAttack(player, type) {
        player.state = 'attacking';
        player.stateTimer = type === 'punch' ? 20 : 25;
        
        const attackData = {
            x: player.x + (player.facing > 0 ? player.width : -40),
            y: player.y + 30,
            width: 40,
            height: 40,
            damage: type === 'punch' ? player.damage : player.damage * 1.2,
            owner: player.id,
            type: type,
            duration: 10,
            knockback: type === 'kick' ? 8 : 4
        };
        
        this.attacks.push(attackData);
        this.addEffect(attackData.x, attackData.y, 'hit', '#FFD700');
    }
    
    executeSpecialMove(player, moveType) {
        if (player.mp < 10) return;
        
        player.state = 'attacking';
        player.mp -= 10;
        
        switch(moveType) {
            case 'fireball':
                player.stateTimer = 30;
                this.createProjectile(player, 'fireball');
                break;
                
            case 'dragon_punch':
                player.stateTimer = 40;
                player.vy = -10; // Подброс вверх
                this.attacks.push({
                    x: player.x,
                    y: player.y - 20,
                    width: player.width,
                    height: 60,
                    damage: player.damage * 2,
                    owner: player.id,
                    type: 'dragon_punch',
                    duration: 20,
                    knockback: 15
                });
                this.addEffect(player.x, player.y, 'explosion', '#FF4444');
                break;
                
            case 'hurricane_kick':
                player.stateTimer = 35;
                player.vx = player.facing * 8; // Рывок вперед
                this.attacks.push({
                    x: player.x + player.facing * 20,
                    y: player.y,
                    width: 60,
                    height: player.height,
                    damage: player.damage * 1.5,
                    owner: player.id,
                    type: 'hurricane_kick',
                    duration: 15,
                    knockback: 12
                });
                this.addEffect(player.x, player.y + 50, 'whirlwind', '#00FFFF');
                break;
                
            case 'combo_attack':
                player.stateTimer = 45;
                this.executeComboSequence(player);
                break;
                
            case 'energy_blast':
                player.stateTimer = 25;
                this.createProjectile(player, 'energy_blast');
                break;
        }
    }
    
    executeComboSequence(player) {
        // Серия из 3 атак с задержкой
        setTimeout(() => this.executeAttack(player, 'punch'), 0);
        setTimeout(() => this.executeAttack(player, 'punch'), 200);
        setTimeout(() => this.executeAttack(player, 'kick'), 400);
    }
    
    createProjectile(player, type) {
        const projectile = {
            x: player.x + (player.facing > 0 ? player.width : 0),
            y: player.y + 40,
            width: 30,
            height: 20,
            vx: player.facing * (type === 'fireball' ? 8 : 6),
            vy: 0,
            damage: type === 'fireball' ? player.damage * 1.5 : player.damage * 1.2,
            owner: player.id,
            type: type,
            life: 120,
            color: type === 'fireball' ? '#FF6600' : '#00FFFF'
        };
        
        this.attacks.push(projectile);
        this.addEffect(projectile.x, projectile.y, 'projectile_launch', projectile.color);
    }
    
    addEffect(x, y, type, color) {
        const effect = {
            x, y,
            type,
            color,
            life: 30,
            maxLife: 30,
            size: 1,
            alpha: 1
        };
        
        this.effects.push(effect);
    }
    
    startGame() {
        this.gameState = 'fighting';
        this.round = 1;
        this.player1Wins = 0;
        this.player2Wins = 0;
        this.resetRound();
    }
    
    resetRound() {
        this.roundTimer = 60;
        this.frameTimer = 0;
        
        // Сброс игроков
        this.player1 = this.createPlayer(1, 150, this.groundY);
        this.player2 = this.createPlayer(2, this.canvas.width - 250, this.groundY);
        
        // Очистка атак и эффектов
        this.attacks = [];
        this.effects = [];
        this.combos = { 1: [], 2: [] };
    }
    
    nextRound() {
        if (this.player1Wins >= 2 || this.player2Wins >= 2 || this.round >= this.maxRounds) {
            this.gameState = 'gameOver';
        } else {
            this.round++;
            this.gameState = 'fighting';
            this.resetRound();
        }
    }
    
    update() {
        if (this.gameState !== 'fighting') return;
        
        this.frameTimer++;
        
        // Обновляем таймер раунда
        if (this.frameTimer % 60 === 0) {
            this.roundTimer--;
            if (this.roundTimer <= 0) {
                this.endRound('time');
            }
        }
        
        this.updatePlayers();
        this.updateAttacks();
        this.updateEffects();
        this.checkCollisions();
        this.updatePlayerStates();
    }
    
    updatePlayers() {
        [this.player1, this.player2].forEach(player => {
            // Применяем гравитацию
            if (!player.onGround) {
                player.vy += this.gravity;
            }
            
            // Обновляем позицию
            player.x += player.vx;
            player.y += player.vy;
            
            // Проверяем землю
            if (player.y >= this.groundY) {
                player.y = this.groundY;
                player.vy = 0;
                player.onGround = true;
                if (player.state === 'jumping') {
                    player.state = 'idle';
                }
            }
            
            // Ограничения по экрану
            player.x = Math.max(0, Math.min(this.canvas.width - player.width, player.x));
            
            // Замедление
            player.vx *= 0.8;
            
            // Регенерация маны
            if (player.mp < player.maxMp) {
                player.mp = Math.min(player.maxMp, player.mp + 0.1);
            }
            
            // Уменьшаем таймеры
            if (player.stateTimer > 0) {
                player.stateTimer--;
                if (player.stateTimer === 0 && player.state !== 'ko') {
                    player.state = 'idle';
                }
            }
            
            if (player.invulnerable > 0) {
                player.invulnerable--;
            }
        });
    }
    
    updateAttacks() {
        this.attacks.forEach((attack, index) => {
            if (attack.vx !== undefined) {
                // Снаряд
                attack.x += attack.vx;
                attack.y += attack.vy;
                attack.life--;
                
                if (attack.life <= 0 || attack.x < 0 || attack.x > this.canvas.width) {
                    this.attacks.splice(index, 1);
                }
            } else {
                // Обычная атака
                attack.duration--;
                if (attack.duration <= 0) {
                    this.attacks.splice(index, 1);
                }
            }
        });
    }
    
    updateEffects() {
        this.effects.forEach((effect, index) => {
            effect.life--;
            effect.alpha = effect.life / effect.maxLife;
            effect.size += 0.1;
            
            if (effect.life <= 0) {
                this.effects.splice(index, 1);
            }
        });
    }
    
    checkCollisions() {
        this.attacks.forEach(attack => {
            const target = attack.owner === 1 ? this.player2 : this.player1;
            
            if (target.invulnerable > 0 || target.state === 'ko') return;
            
            if (this.isColliding(attack, target)) {
                this.hitPlayer(target, attack);
            }
        });
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    hitPlayer(player, attack) {
        let damage = attack.damage;
        
        // Блокирование
        if (player.state === 'blocking') {
            damage *= player.blockReduction;
            this.addEffect(player.x, player.y, 'block', '#FFFF00');
        } else {
            // Откидывание
            const knockbackDir = attack.owner === 1 ? 1 : -1;
            player.vx += knockbackDir * (attack.knockback || 5);
            
            // Оглушение
            player.state = 'stunned';
            player.stateTimer = 15;
            
            this.addEffect(player.x, player.y, 'hit', '#FF0000');
        }
        
        player.hp = Math.max(0, player.hp - damage);
        player.invulnerable = 30;
        
        // Удаляем атаку
        const index = this.attacks.indexOf(attack);
        if (index > -1) {
            this.attacks.splice(index, 1);
        }
        
        // Проверяем на KO
        if (player.hp <= 0) {
            player.state = 'ko';
            this.endRound('ko');
        }
    }
    
    updatePlayerStates() {
        [this.player1, this.player2].forEach(player => {
            // Автоматический переход в idle, если не нажаты клавиши движения
            if (player.state === 'walking') {
                const isMoving = (player.id === 1 && (this.keys['a'] || this.keys['A'] || this.keys['d'] || this.keys['D'])) ||
                                (player.id === 2 && (this.keys['ArrowLeft'] || this.keys['ArrowRight']));
                
                if (!isMoving) {
                    player.state = 'idle';
                }
            }
            
            // Автоматически повернуться к противнику
            const opponent = player.id === 1 ? this.player2 : this.player1;
            if (player.state === 'idle' && Math.abs(player.x - opponent.x) > 50) {
                player.facing = player.x < opponent.x ? 1 : -1;
            }
        });
    }
    
    endRound(reason) {
        this.gameState = 'roundEnd';
        
        if (reason === 'ko') {
            if (this.player1.hp <= 0) {
                this.player2Wins++;
            } else {
                this.player1Wins++;
            }
        } else if (reason === 'time') {
            // Победа по очкам (больше HP)
            if (this.player1.hp > this.player2.hp) {
                this.player1Wins++;
            } else if (this.player2.hp > this.player1.hp) {
                this.player2Wins++;
            }
        }
    }
    
    render() {
        // Фон
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Земля
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.groundY + 120, this.canvas.width, this.canvas.height - this.groundY - 120);
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'fighting') {
            this.renderFight();
        } else if (this.gameState === 'roundEnd') {
            this.renderRoundEnd();
        } else if (this.gameState === 'gameOver') {
            this.renderGameOver();
        }
    }
    
    renderMenu() {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('${prompt.title}', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Enter для начала', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Игрок 1: WASD движение, Q удар, E пинок, R спецприем', this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText('Игрок 2: Стрелки движение, U удар, I пинок, O спецприем', this.canvas.width / 2, this.canvas.height / 2 + 45);
        this.ctx.fillText('Комбо: ↓→Q (файерболл), →↓→Q (драгон панч), ↓←I (ураган)', this.canvas.width / 2, this.canvas.height / 2 + 70);
    }
    
    renderFight() {
        // Игроки
        this.renderPlayer(this.player1);
        this.renderPlayer(this.player2);
        
        // Атаки
        this.renderAttacks();
        
        // Эффекты
        this.renderEffects();
        
        // UI
        this.renderFightUI();
    }
    
    renderPlayer(player) {
        this.ctx.save();
        
        // Мигание при неуязвимости
        if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Основное тело
        this.ctx.fillStyle = player.color;
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Лицо
        this.ctx.fillStyle = '#FFDBAC';
        this.ctx.fillRect(player.x + 15, player.y + 10, 50, 30);
        
        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(player.x + 25, player.y + 20, 5, 5);
        this.ctx.fillRect(player.x + 50, player.y + 20, 5, 5);
        
        // Руки
        this.ctx.fillStyle = player.color;
        if (player.state === 'attacking') {
            // Атакующая поза
            this.ctx.fillRect(player.x + (player.facing > 0 ? 70 : -20), player.y + 30, 20, 40);
        } else {
            this.ctx.fillRect(player.x + 15, player.y + 40, 15, 50);
            this.ctx.fillRect(player.x + 50, player.y + 40, 15, 50);
        }
        
        // Ноги
        this.ctx.fillRect(player.x + 20, player.y + 90, 15, 30);
        this.ctx.fillRect(player.x + 45, player.y + 90, 15, 30);
        
        // Индикатор состояния
        if (player.state === 'blocking') {
            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        }
        
        this.ctx.restore();
    }
    
    renderAttacks() {
        this.attacks.forEach(attack => {
            if (attack.vx !== undefined) {
                // Снаряд
                this.ctx.fillStyle = attack.color;
                this.ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
                
                // Эффект свечения
                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillStyle = attack.color;
                this.ctx.fillRect(attack.x - 5, attack.y - 5, attack.width + 10, attack.height + 10);
                this.ctx.restore();
            } else {
                // Зона атаки (отладка)
                this.ctx.save();
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
                this.ctx.restore();
            }
        });
    }
    
    renderEffects() {
        this.effects.forEach(effect => {
            this.ctx.save();
            this.ctx.globalAlpha = effect.alpha;
            this.ctx.fillStyle = effect.color;
            
            if (effect.type === 'hit' || effect.type === 'block') {
                const size = 20 * effect.size;
                this.ctx.fillRect(effect.x - size/2, effect.y - size/2, size, size);
            } else if (effect.type === 'explosion') {
                const size = 30 * effect.size;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    renderFightUI() {
        // Полоски здоровья
        this.renderHealthBar(this.player1, 50, 30);
        this.renderHealthBar(this.player2, this.canvas.width - 350, 30);
        
        // Полоски маны
        this.renderManaBar(this.player1, 50, 70);
        this.renderManaBar(this.player2, this.canvas.width - 350, 70);
        
        // Таймер
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.roundTimer.toString(), this.canvas.width / 2, 50);
        
        // Раунд
        this.ctx.font = '16px Arial';
        this.ctx.fillText(\`Раунд \${this.round}\`, this.canvas.width / 2, 80);
        
        // Счет побед
        this.ctx.fillText(\`\${this.player1Wins} - \${this.player2Wins}\`, this.canvas.width / 2, 100);
        
        // Комбо подсказки
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Комбо: ↓→Q, →↓→Q, ↓←I, QQI', 10, this.canvas.height - 30);
    }
    
    renderHealthBar(player, x, y) {
        const width = 300;
        const height = 20;
        const healthPercent = player.hp / player.maxHp;
        
        // Фон
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y, width, height);
        
        // Здоровье
        this.ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : 
                           healthPercent > 0.3 ? '#FF9800' : '#F44336';
        this.ctx.fillRect(x, y, width * healthPercent, height);
        
        // Рамка
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Текст
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(\`P\${player.id}: \${Math.ceil(player.hp)}/\${player.maxHp}\`, x + width/2, y + 15);
    }
    
    renderManaBar(player, x, y) {
        const width = 300;
        const height = 10;
        const manaPercent = player.mp / player.maxMp;
        
        // Фон
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y, width, height);
        
        // Мана
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(x, y, width * manaPercent, height);
        
        // Рамка
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    renderRoundEnd() {
        this.renderFight();
        
        // Накладываем затемнение
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        
        if (this.player1.hp <= 0) {
            this.ctx.fillText('ИГРОК 2 ПОБЕЖДАЕТ!', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.player2.hp <= 0) {
            this.ctx.fillText('ИГРОК 1 ПОБЕЖДАЕТ!', this.canvas.width / 2, this.canvas.height / 2);
        } else {
            this.ctx.fillText('ВРЕМЯ ВЫШЛО!', this.canvas.width / 2, this.canvas.height / 2 - 30);
            const winner = this.player1.hp > this.player2.hp ? 'ИГРОК 1' : 'ИГРОК 2';
            this.ctx.fillText(\`\${winner} ПОБЕЖДАЕТ!\`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите Enter для продолжения', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }
    
    renderGameOver() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        
        const finalWinner = this.player1Wins > this.player2Wins ? 'ИГРОК 1' : 'ИГРОК 2';
        this.ctx.fillText(\`\${finalWinner} ВЫИГРЫВАЕТ МАТЧ!\`, this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(\`Финальный счет: \${this.player1Wins} - \${this.player2Wins}\`, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Обновите страницу для новой игры', this.canvas.width / 2, this.canvas.height / 2 + 50);
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
    const game = new FightingGame();
    window.game = game;
});
`;
  }

  private generateGameCSS(): string {
    return `
body {
    margin: 0;
    padding: 0;
    background: #0f0f23;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    user-select: none;
}

#game {
    display: block;
    border: 2px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    background: #1a1a2e;
}

/* Fighting специфичные стили */
.fighting-ui {
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
}

.health-bar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 20px;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
}

.player-health {
    width: 300px;
    height: 30px;
    background: #333;
    border: 2px solid #666;
    border-radius: 15px;
    overflow: hidden;
    position: relative;
}

.health-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
    border-radius: 13px;
}

.health-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.mana-bar {
    width: 300px;
    height: 15px;
    background: #333;
    border: 1px solid #666;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 5px;
}

.mana-fill {
    height: 100%;
    background: linear-gradient(90deg, #2196F3, #64B5F6);
    transition: width 0.3s ease;
    border-radius: 7px;
}

.round-timer {
    text-align: center;
    color: white;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
}

.round-info {
    text-align: center;
    color: #FFD700;
    font-size: 16px;
    margin-top: 5px;
}

.combo-display {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #666;
    border-radius: 8px;
    padding: 10px;
    color: white;
    font-size: 12px;
    max-width: 300px;
}

.combo-hint {
    margin: 2px 0;
    color: #FFD700;
}

/* Эффекты боя */
@keyframes hitFlash {
    0%, 100% { background: transparent; }
    50% { background: rgba(255, 0, 0, 0.3); }
}

.hit-effect {
    animation: hitFlash 0.2s ease-in-out;
}

@keyframes blockSpark {
    0% { opacity: 1; transform: scale(0) rotate(0deg); }
    100% { opacity: 0; transform: scale(2) rotate(360deg); }
}

.block-effect {
    animation: blockSpark 0.3s ease-out;
}

@keyframes comboCounter {
    0% { transform: scale(1); color: white; }
    50% { transform: scale(1.5); color: #FFD700; }
    100% { transform: scale(1); color: white; }
}

.combo-counter {
    animation: comboCounter 0.5s ease-in-out;
}

/* Анимации персонажей */
@keyframes attackAnimation {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(10px); }
}

.player-attacking {
    animation: attackAnimation 0.2s ease-in-out;
}

@keyframes stunAnimation {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-2deg); }
    75% { transform: rotate(2deg); }
}

.player-stunned {
    animation: stunAnimation 0.1s infinite;
}

@keyframes koAnimation {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(90deg) scale(0.8); }
}

.player-ko {
    animation: koAnimation 0.5s ease-out forwards;
}

/* Эффекты спецприемов */
@keyframes fireball {
    0% { opacity: 1; transform: scale(1) rotate(0deg); }
    100% { opacity: 0.8; transform: scale(1.1) rotate(360deg); }
}

.fireball-effect {
    animation: fireball 0.1s infinite;
}

@keyframes dragonPunch {
    0% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.2); }
    100% { transform: translateY(0) scale(1); }
}

.dragon-punch-effect {
    animation: dragonPunch 0.4s ease-in-out;
}

/* UI отзывчивости */
@media (max-width: 768px) {
    .health-bar-container {
        padding: 10px;
    }
    
    .player-health {
        width: 200px;
        height: 20px;
    }
    
    .health-text {
        font-size: 10px;
    }
    
    .mana-bar {
        width: 200px;
        height: 10px;
    }
    
    .round-timer {
        font-size: 18px;
    }
    
    .combo-display {
        bottom: 10px;
        left: 10px;
        padding: 5px;
        font-size: 10px;
        max-width: 200px;
    }
}

/* Эффекты частиц */
.particle {
    position: absolute;
    pointer-events: none;
    border-radius: 50%;
}

@keyframes particleFade {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0); }
}

.particle-fade {
    animation: particleFade 0.5s ease-out forwards;
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { name: 'fighter1', prompt: `Fighting game character sprite, ${design.artStyle || 'pixel art'} style, martial artist in gi, multiple animation frames, 80x120 pixels` },
        { name: 'fighter2', prompt: `Fighting game character sprite, ${design.artStyle || 'pixel art'} style, different martial artist, contrasting design, 80x120 pixels` },
        { name: 'fireball', prompt: `Fighting game fireball projectile sprite, ${design.artStyle || 'pixel art'} style, orange energy ball with flames, 30x20 pixels` },
        { name: 'energy_blast', prompt: `Fighting game energy blast sprite, ${design.artStyle || 'pixel art'} style, blue energy projectile, 30x20 pixels` },
        { name: 'hit_effect', prompt: `Fighting game hit effect sprite, ${design.artStyle || 'pixel art'} style, impact burst with sparks, 40x40 pixels` },
        { name: 'block_effect', prompt: `Fighting game block effect sprite, ${design.artStyle || 'pixel art'} style, defensive barrier glow, 40x40 pixels` },
        { name: 'fighting_stage', prompt: `Fighting game stage background, ${design.artStyle || 'pixel art'} style, martial arts dojo or arena setting` }
      ],
      sounds: [
        { name: 'punch_hit', prompt: 'Fighting game punch impact sound, martial arts style, sharp physical hit' },
        { name: 'kick_hit', prompt: 'Fighting game kick impact sound, martial arts style, powerful strike' },
        { name: 'block_sound', prompt: 'Fighting game block sound effect, defensive impact, brief metallic clang' },
        { name: 'fireball_cast', prompt: 'Fighting game fireball casting sound, magical energy charging and release' },
        { name: 'special_move', prompt: 'Fighting game special move sound, dramatic power technique activation' },
        { name: 'ko_sound', prompt: 'Fighting game knockout sound, dramatic defeat impact' },
        { name: 'round_start', prompt: 'Fighting game round start bell, tournament style announcement' }
      ],
      backgrounds: [
        { name: 'dojo_background', prompt: `Fighting game dojo background, ${design.artStyle || 'pixel art'} style, traditional martial arts training hall` },
        { name: 'tournament_arena', prompt: `Fighting game tournament arena background, ${design.artStyle || 'pixel art'} style, competitive fighting venue` }
      ]
    };
  }
} 