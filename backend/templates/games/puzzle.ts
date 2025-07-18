import { BaseGameTemplate } from './base';
import { GamePrompt, GameDesign } from '../../src/types';

export class PuzzleTemplate extends BaseGameTemplate {
  name = 'puzzle';
  genre = 'puzzle';
  description = 'Головоломка типа "три в ряд" с комбинациями и каскадами';

  generateCode(prompt: GamePrompt, design: GameDesign) {
    const js = this.generateJavaScript(prompt, design);
    const css = this.generateCSS();
    const html = this.generateHTML(prompt.title, js, css);

    return { html, js, css };
  }

  private generateJavaScript(prompt: GamePrompt, design: GameDesign): string {
    return `
${this.generateYandexGamesSDK()}
${this.generateBaseSounds()}

// Главный класс игры-головоломки
class PuzzleGame {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.moves = 30;
        this.target = 1000;
        this.gameStarted = false;
        this.gameOver = false;
        this.grid = [];
        this.gridSize = 8;
        this.colors = 6; // Количество разных цветов
        this.isProcessing = false;
        
        // Настройки игры
        this.config = {
            tileSize: 64,
            matchScore: 50,
            cascadeBonus: 10,
            comboMultiplier: 1.5,
            specialTileScore: 200
        };
    }

    addReward() {
        // Награда за просмотр рекламы - дополнительные ходы
        this.moves += 5;
        this.updateUI();
    }

    updateScore(points) {
        this.score += points;
        this.updateUI();
        
        // Проверяем достижение цели
        if (this.score >= this.target) {
            this.nextLevel();
        }
        
        // Сохраняем результат в Yandex Games
        if (window.yandexSDK && window.yandexSDK.initialized) {
            window.yandexSDK.saveScore(this.score);
        }
    }

    nextLevel() {
        this.level++;
        this.moves = Math.max(20, 30 - this.level);
        this.target = Math.floor(this.target * 1.5);
        this.colors = Math.min(8, this.colors + (this.level % 3 === 0 ? 1 : 0));
        
        // Генерируем новое поле
        this.generateGrid();
        this.updateUI();
    }

    generateGrid() {
        this.grid = [];
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = this.getRandomColor();
            }
        }
        
        // Убираем начальные совпадения
        this.removeInitialMatches();
    }

    getRandomColor() {
        return Phaser.Math.Between(0, this.colors - 1);
    }

    removeInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    if (this.hasMatchAt(row, col)) {
                        this.grid[row][col] = this.getRandomColor();
                        hasMatches = true;
                    }
                }
            }
        }
    }

    hasMatchAt(row, col) {
        const color = this.grid[row][col];
        
        // Проверяем горизонтальное совпадение
        if (col >= 2 && 
            this.grid[row][col - 1] === color && 
            this.grid[row][col - 2] === color) {
            return true;
        }
        
        // Проверяем вертикальное совпадение
        if (row >= 2 && 
            this.grid[row - 1][col] === color && 
            this.grid[row - 2][col] === color) {
            return true;
        }
        
        return false;
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        const movesElement = document.getElementById('moves-value');
        if (movesElement) {
            movesElement.textContent = this.moves;
        }
        const targetElement = document.getElementById('target-value');
        if (targetElement) {
            targetElement.textContent = this.target;
        }
        const levelElement = document.getElementById('level-value');
        if (levelElement) {
            levelElement.textContent = this.level;
        }
    }

    gameEnd() {
        this.gameOver = true;
        
        // Показываем межстраничную рекламу при окончании игры
        if (window.yandexSDK && window.yandexSDK.initialized) {
            window.yandexSDK.showInterstitialAd();
        }
    }
}

// Главная сцена игры
class PuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PuzzleScene' });
    }

    preload() {
        this.createTileSprites();
        
        // Инициализируем звуковой менеджер
        this.soundManager = new SoundManager(this);
        this.soundManager.preload();
    }

    createTileSprites() {
        // Создаем цветные плитки
        const colors = [
            0xFF0000, // Красный
            0x00FF00, // Зеленый
            0x0000FF, // Синий
            0xFFFF00, // Желтый
            0xFF00FF, // Пурпурный
            0x00FFFF, // Голубой
            0xFF8000, // Оранжевый
            0x8000FF  // Фиолетовый
        ];

        colors.forEach((color, index) => {
            this.add.graphics()
                .fillStyle(color)
                .fillRoundedRect(0, 0, 60, 60, 8)
                .lineStyle(2, 0xFFFFFF)
                .strokeRoundedRect(0, 0, 60, 60, 8)
                .generateTexture(\`tile\${index}\`, 60, 60);
        });

        // Плитка для выделения
        this.add.graphics()
            .lineStyle(4, 0xFFFF00)
            .strokeRoundedRect(0, 0, 64, 64, 8)
            .generateTexture('selected', 64, 64);

        // Фон
        this.add.graphics()
            .fillGradientStyle(0x2C3E50, 0x3498DB, 0x9B59B6, 0xE74C3C)
            .fillRect(0, 0, 800, 600)
            .generateTexture('background', 800, 600);

        // Фон для сетки
        this.add.graphics()
            .fillStyle(0x34495E, 0.8)
            .fillRoundedRect(0, 0, 520, 520, 12)
            .lineStyle(3, 0xFFFFFF, 0.3)
            .strokeRoundedRect(0, 0, 520, 520, 12)
            .generateTexture('grid_bg', 520, 520);
    }

    create() {
        // Фон
        this.add.image(400, 300, 'background');

        // Фон сетки
        this.add.image(400, 300, 'grid_bg');

        // Инициализируем игру
        window.gameInstance.generateGrid();
        
        // Создаем сетку плиток
        this.createTileGrid();
        
        // Настраиваем взаимодействие
        this.setupInput();

        // Инициализируем звуки
        this.soundManager.create();

        // Создаем UI
        this.createUI();

        // Запускаем проверку совпадений
        this.time.delayedCall(500, () => {
            this.processMatches();
        });
    }

    createTileGrid() {
        this.tiles = [];
        this.selectedTile = null;
        
        const startX = 400 - (window.gameInstance.gridSize * 64) / 2 + 32;
        const startY = 300 - (window.gameInstance.gridSize * 64) / 2 + 32;

        for (let row = 0; row < window.gameInstance.gridSize; row++) {
            this.tiles[row] = [];
            for (let col = 0; col < window.gameInstance.gridSize; col++) {
                const x = startX + col * 64;
                const y = startY + row * 64;
                const color = window.gameInstance.grid[row][col];
                
                const tile = this.add.sprite(x, y, \`tile\${color}\`);
                tile.setInteractive();
                tile.row = row;
                tile.col = col;
                tile.color = color;
                
                this.tiles[row][col] = tile;
            }
        }
    }

    setupInput() {
        this.input.on('gameobjectdown', (pointer, gameObject) => {
            if (window.gameInstance.isProcessing || window.gameInstance.gameOver) return;
            
            this.selectTile(gameObject);
        });
    }

    selectTile(tile) {
        if (this.selectedTile === null) {
            // Выбираем первую плитку
            this.selectedTile = tile;
            this.highlightTile(tile);
        } else if (this.selectedTile === tile) {
            // Отменяем выбор
            this.clearSelection();
        } else if (this.areAdjacent(this.selectedTile, tile)) {
            // Меняем местами соседние плитки
            this.swapTiles(this.selectedTile, tile);
            this.clearSelection();
        } else {
            // Выбираем новую плитку
            this.clearSelection();
            this.selectedTile = tile;
            this.highlightTile(tile);
        }
    }

    highlightTile(tile) {
        if (this.selectionSprite) {
            this.selectionSprite.destroy();
        }
        
        this.selectionSprite = this.add.sprite(tile.x, tile.y, 'selected');
    }

    clearSelection() {
        this.selectedTile = null;
        if (this.selectionSprite) {
            this.selectionSprite.destroy();
            this.selectionSprite = null;
        }
    }

    areAdjacent(tile1, tile2) {
        const rowDiff = Math.abs(tile1.row - tile2.row);
        const colDiff = Math.abs(tile1.col - tile2.col);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    swapTiles(tile1, tile2) {
        if (window.gameInstance.moves <= 0) return;

        window.gameInstance.isProcessing = true;
        
        // Меняем данные в сетке
        const tempColor = window.gameInstance.grid[tile1.row][tile1.col];
        window.gameInstance.grid[tile1.row][tile1.col] = window.gameInstance.grid[tile2.row][tile2.col];
        window.gameInstance.grid[tile2.row][tile2.col] = tempColor;

        // Анимация обмена
        this.tweens.add({
            targets: tile1,
            x: tile2.x,
            y: tile2.y,
            duration: 300,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: tile2,
            x: tile1.x,
            y: tile1.y,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                // Обновляем позиции и цвета
                this.updateTilePositions(tile1, tile2);
                
                // Проверяем совпадения
                if (this.hasMatches()) {
                    window.gameInstance.moves--;
                    window.gameInstance.updateUI();
                    this.processMatches();
                } else {
                    // Возвращаем плитки обратно
                    this.revertSwap(tile1, tile2);
                }
            }
        });
    }

    updateTilePositions(tile1, tile2) {
        // Обмениваем позиции в массиве
        const tempRow = tile1.row;
        const tempCol = tile1.col;
        
        tile1.row = tile2.row;
        tile1.col = tile2.col;
        tile2.row = tempRow;
        tile2.col = tempCol;
        
        this.tiles[tile1.row][tile1.col] = tile1;
        this.tiles[tile2.row][tile2.col] = tile2;
        
        // Обновляем цвета
        tile1.color = window.gameInstance.grid[tile1.row][tile1.col];
        tile2.color = window.gameInstance.grid[tile2.row][tile2.col];
        
        tile1.setTexture(\`tile\${tile1.color}\`);
        tile2.setTexture(\`tile\${tile2.color}\`);
    }

    revertSwap(tile1, tile2) {
        // Возвращаем данные обратно
        const tempColor = window.gameInstance.grid[tile1.row][tile1.col];
        window.gameInstance.grid[tile1.row][tile1.col] = window.gameInstance.grid[tile2.row][tile2.col];
        window.gameInstance.grid[tile2.row][tile2.col] = tempColor;

        // Анимация возврата
        this.tweens.add({
            targets: tile1,
            x: tile2.x,
            y: tile2.y,
            duration: 200
        });

        this.tweens.add({
            targets: tile2,
            x: tile1.x,
            y: tile1.y,
            duration: 200,
            onComplete: () => {
                this.updateTilePositions(tile1, tile2);
                window.gameInstance.isProcessing = false;
            }
        });
    }

    hasMatches() {
        for (let row = 0; row < window.gameInstance.gridSize; row++) {
            for (let col = 0; col < window.gameInstance.gridSize; col++) {
                if (this.getMatchLength(row, col, 'horizontal') >= 3 ||
                    this.getMatchLength(row, col, 'vertical') >= 3) {
                    return true;
                }
            }
        }
        return false;
    }

    getMatchLength(startRow, startCol, direction) {
        const color = window.gameInstance.grid[startRow][startCol];
        let length = 1;
        
        const deltaRow = direction === 'vertical' ? 1 : 0;
        const deltaCol = direction === 'horizontal' ? 1 : 0;
        
        let row = startRow + deltaRow;
        let col = startCol + deltaCol;
        
        while (row < window.gameInstance.gridSize && 
               col < window.gameInstance.gridSize && 
               window.gameInstance.grid[row][col] === color) {
            length++;
            row += deltaRow;
            col += deltaCol;
        }
        
        return length;
    }

    processMatches() {
        const matches = this.findAllMatches();
        
        if (matches.length === 0) {
            window.gameInstance.isProcessing = false;
            this.checkGameEnd();
            return;
        }

        // Удаляем совпавшие плитки
        this.removeMatches(matches);
        
        // Добавляем очки
        const points = matches.length * window.gameInstance.config.matchScore;
        window.gameInstance.updateScore(points);
        
        this.soundManager.play('coin');
        
        // Роняем плитки
        this.time.delayedCall(300, () => {
            this.dropTiles();
        });
    }

    findAllMatches() {
        const matches = [];
        const processed = new Set();
        
        for (let row = 0; row < window.gameInstance.gridSize; row++) {
            for (let col = 0; col < window.gameInstance.gridSize; col++) {
                const key = \`\${row}-\${col}\`;
                if (processed.has(key)) continue;
                
                const horizontalMatch = this.getMatch(row, col, 'horizontal');
                const verticalMatch = this.getMatch(row, col, 'vertical');
                
                if (horizontalMatch.length >= 3) {
                    matches.push(...horizontalMatch);
                    horizontalMatch.forEach(pos => processed.add(\`\${pos.row}-\${pos.col}\`));
                }
                
                if (verticalMatch.length >= 3) {
                    matches.push(...verticalMatch);
                    verticalMatch.forEach(pos => processed.add(\`\${pos.row}-\${pos.col}\`));
                }
            }
        }
        
        return matches;
    }

    getMatch(startRow, startCol, direction) {
        const color = window.gameInstance.grid[startRow][startCol];
        const match = [{ row: startRow, col: startCol }];
        
        const deltaRow = direction === 'vertical' ? 1 : 0;
        const deltaCol = direction === 'horizontal' ? 1 : 0;
        
        let row = startRow + deltaRow;
        let col = startCol + deltaCol;
        
        while (row < window.gameInstance.gridSize && 
               col < window.gameInstance.gridSize && 
               window.gameInstance.grid[row][col] === color) {
            match.push({ row, col });
            row += deltaRow;
            col += deltaCol;
        }
        
        return match;
    }

    removeMatches(matches) {
        matches.forEach(({ row, col }) => {
            window.gameInstance.grid[row][col] = -1; // Помечаем как пустую
            
            const tile = this.tiles[row][col];
            if (tile) {
                // Анимация исчезновения
                this.tweens.add({
                    targets: tile,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => {
                        tile.setVisible(false);
                    }
                });
            }
        });
    }

    dropTiles() {
        let hasDropped = false;
        
        for (let col = 0; col < window.gameInstance.gridSize; col++) {
            for (let row = window.gameInstance.gridSize - 1; row >= 0; row--) {
                if (window.gameInstance.grid[row][col] === -1) {
                    // Ищем плитку выше для падения
                    for (let newRow = row - 1; newRow >= 0; newRow--) {
                        if (window.gameInstance.grid[newRow][col] !== -1) {
                            // Роняем плитку
                            window.gameInstance.grid[row][col] = window.gameInstance.grid[newRow][col];
                            window.gameInstance.grid[newRow][col] = -1;
                            
                            const tile = this.tiles[newRow][col];
                            tile.row = row;
                            this.tiles[row][col] = tile;
                            this.tiles[newRow][col] = null;
                            
                            // Анимация падения
                            const startY = 300 - (window.gameInstance.gridSize * 64) / 2 + 32;
                            const targetY = startY + row * 64;
                            
                            this.tweens.add({
                                targets: tile,
                                y: targetY,
                                duration: 300,
                                ease: 'Bounce.easeOut'
                            });
                            
                            hasDropped = true;
                            break;
                        }
                    }
                }
            }
        }

        // Заполняем пустые места сверху
        this.fillEmptySpaces();
        
        // Продолжаем проверку совпадений
        this.time.delayedCall(400, () => {
            this.processMatches();
        });
    }

    fillEmptySpaces() {
        const startX = 400 - (window.gameInstance.gridSize * 64) / 2 + 32;
        const startY = 300 - (window.gameInstance.gridSize * 64) / 2 + 32;
        
        for (let col = 0; col < window.gameInstance.gridSize; col++) {
            for (let row = 0; row < window.gameInstance.gridSize; row++) {
                if (window.gameInstance.grid[row][col] === -1) {
                    const color = window.gameInstance.getRandomColor();
                    window.gameInstance.grid[row][col] = color;
                    
                    const x = startX + col * 64;
                    const y = startY + row * 64;
                    
                    const tile = this.add.sprite(x, y - 200, \`tile\${color}\`);
                    tile.setInteractive();
                    tile.row = row;
                    tile.col = col;
                    tile.color = color;
                    tile.setScale(0);
                    
                    this.tiles[row][col] = tile;
                    
                    // Анимация появления
                    this.tweens.add({
                        targets: tile,
                        y: y,
                        scaleX: 1,
                        scaleY: 1,
                        alpha: 1,
                        duration: 300,
                        ease: 'Back.easeOut'
                    });
                }
            }
        }
    }

    checkGameEnd() {
        if (window.gameInstance.moves <= 0 && window.gameInstance.score < window.gameInstance.target) {
            this.gameOver();
        }
    }

    createUI() {
        // Панель информации
        const uiPanel = this.add.graphics();
        uiPanel.fillStyle(0x2C3E50, 0.9);
        uiPanel.fillRoundedRect(50, 50, 200, 120, 8);
        
        // Цель
        this.add.text(70, 70, 'Цель:', { fontSize: '16px', fill: '#ECF0F1', fontWeight: 'bold' });
        this.targetText = this.add.text(70, 90, \`\${window.gameInstance.target}\`, { fontSize: '20px', fill: '#F39C12', fontWeight: 'bold' });
        
        // Ходы
        this.add.text(70, 120, 'Ходы:', { fontSize: '16px', fill: '#ECF0F1', fontWeight: 'bold' });
        this.movesText = this.add.text(70, 140, \`\${window.gameInstance.moves}\`, { fontSize: '20px', fill: '#E74C3C', fontWeight: 'bold' });
        
        // Обновляем UI регулярно
        this.time.addEvent({
            delay: 100,
            callback: this.updateUIDisplay,
            callbackScope: this,
            loop: true
        });
    }

    updateUIDisplay() {
        if (this.targetText) {
            this.targetText.setText(window.gameInstance.target);
        }
        if (this.movesText) {
            this.movesText.setText(window.gameInstance.moves);
            this.movesText.setTint(window.gameInstance.moves <= 5 ? 0xFF0000 : 0xFFFFFF);
        }
    }

    gameOver() {
        window.gameInstance.gameEnd();
        
        const gameOverBg = this.add.rectangle(400, 300, 500, 300, 0x000000, 0.9);
        
        const gameOverText = this.add.text(400, 220, 'ИГРА ОКОНЧЕНА', {
            fontSize: '36px',
            fill: '#E74C3C',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const finalScoreText = this.add.text(400, 270, \`Счёт: \${window.gameInstance.score}\`, {
            fontSize: '24px',
            fill: '#ECF0F1',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const restartText = this.add.text(400, 320, 'Нажмите ПРОБЕЛ для перезапуска', {
            fontSize: '16px',
            fill: '#95A5A6'
        }).setOrigin(0.5);

        // Кнопка для просмотра рекламы
        const adButton = this.add.text(400, 360, 'Реклама (+5 ходов)', {
            fontSize: '16px',
            fill: '#27AE60',
            backgroundColor: '#2C3E50',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        adButton.on('pointerdown', () => {
            if (window.yandexSDK && window.yandexSDK.initialized) {
                window.yandexSDK.showRewardedAd();
            }
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.restartGame();
        });
    }

    restartGame() {
        window.gameInstance = new PuzzleGame();
        window.gameInstance.updateUI();
        this.scene.restart();
    }
}

// Конфигурация игры
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#2C3E50',
    scene: PuzzleScene
};

// Инициализация
window.addEventListener('load', async () => {
    // Инициализируем Yandex SDK
    await window.yandexSDK.init();
    
    // Создаем экземпляр игры
    window.gameInstance = new PuzzleGame();
    window.gameInstance.updateUI();
    
    // Добавляем дополнительные UI элементы
    const uiOverlay = document.getElementById('ui-overlay');
    uiOverlay.innerHTML = \`
        <div>Очки: <span id="score-value">0</span></div>
        <div>Ходы: <span id="moves-value">30</span></div>
        <div>Цель: <span id="target-value">1000</span></div>
        <div>Уровень: <span id="level-value">1</span></div>
    \`;
    
    // Запускаем игру
    const game = new Phaser.Game(config);
    window.game = game;
});
`;
  }

  private generateCSS(): string {
    return this.generateBaseCSS() + `
/* Дополнительные стили для головоломки */
#ui-overlay {
    background: rgba(44, 62, 80, 0.95);
    border-radius: 10px;
    padding: 15px;
    border: 2px solid rgba(52, 152, 219, 0.5);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

#ui-overlay div {
    color: #ECF0F1;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    margin-bottom: 8px;
    font-size: 16px;
}

.puzzle-hint {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(236, 240, 241, 0.8);
    font-size: 14px;
    text-align: center;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

@media (max-width: 768px) {
    #ui-overlay {
        font-size: 14px;
        padding: 10px;
    }
    
    .puzzle-hint {
        bottom: 10px;
        font-size: 12px;
    }
}

.match-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #F39C12;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    pointer-events: none;
    z-index: 1000;
}

.combo-text {
    color: #E74C3C;
    font-size: 28px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}
`;
  }

  generateAssets(design: GameDesign) {
    return {
      sprites: [
        { 
          name: 'tile_red', 
          prompt: `Pixel art puzzle game tile, red color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        },
        { 
          name: 'tile_green', 
          prompt: `Pixel art puzzle game tile, green color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        },
        { 
          name: 'tile_blue', 
          prompt: `Pixel art puzzle game tile, blue color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        },
        { 
          name: 'tile_yellow', 
          prompt: `Pixel art puzzle game tile, yellow color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        },
        { 
          name: 'tile_purple', 
          prompt: `Pixel art puzzle game tile, purple color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        },
        { 
          name: 'tile_orange', 
          prompt: `Pixel art puzzle game tile, orange color, ${design.artStyle} style, gem or candy appearance, shiny and colorful, transparent background, 64x64 pixels` 
        }
      ],
      sounds: [
        { name: 'match', prompt: 'Puzzle match sound, satisfying pop or chime, pleasant tone' },
        { name: 'cascade', prompt: 'Cascade combo sound, ascending musical notes, rewarding' },
        { name: 'move', prompt: 'Tile movement sound, soft whoosh or click' },
        { name: 'special', prompt: 'Special tile activation sound, magical sparkle or explosion' }
      ],
      backgrounds: [
        { 
          name: 'background', 
          prompt: `Puzzle game background, ${design.theme} theme, ${design.artStyle} style, magical or mystical atmosphere, soft gradients, enchanting colors` 
        }
      ]
    };
  }
} 