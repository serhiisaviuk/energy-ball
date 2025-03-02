class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.soundManager = new SoundManager();
        
        this.state = 'menu'; // menu, playing, over
        
        this.villainCount = 3;
        this.soundVolume = 50;
        
        this.villainFiringEnabled = false;
        
        this.gameMode = 'hunt'; // Default mode
        this.stateChangeCallbacks = []; // For cursor help, etc.
        this.baseVillainRespawnDelay = 5000; // 5 seconds as base respawn time
        this.minVillainRespawnDelay = 1500; // 1.5 seconds minimum respawn time
        this.deadVillains = []; // Track villains that need to respawn
        
        this.resizeCanvas();
        this.setupEventListeners();
        
        // Start the game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // Play intro sound
        this.soundManager.play('intro');
        
        this.setupCursorHelper();
    }
    
    setupEventListeners() {
        // Resize canvas when window resizes
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Menu controls
        document.getElementById('villain-count').addEventListener('input', (e) => {
            this.villainCount = parseInt(e.target.value, 10);
            document.getElementById('villain-count-value').textContent = this.villainCount;
        });
        
        document.getElementById('sound-volume').addEventListener('input', (e) => {
            const volume = parseInt(e.target.value, 10);
            this.soundVolume = volume;
            this.soundManager.setVolume(volume);
            document.getElementById('sound-volume-value').textContent = volume + '%';
        });
        
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restart-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.state = 'menu';
            this.showScreen('main-menu');
            this.soundManager.stopAll();
            this.soundManager.play('intro');
        });
        
        document.getElementById('villain-firing').addEventListener('change', (e) => {
            this.villainFiringEnabled = e.target.checked;
            const span = e.target.nextElementSibling;
            span.textContent = e.target.checked ? 'On' : 'Off';
        });
        
        // Add game mode selector
        document.getElementById('game-mode').addEventListener('change', (e) => {
            this.gameMode = e.target.value;
        });
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // If game is already running, adjust the position of objects to ensure
        // they stay within the new boundaries
        if (this.state === 'playing') {
            // Keep player within bounds
            if (this.player) {
                this.player.x = Math.min(Math.max(0, this.player.x), this.canvas.width - this.player.width);
                this.player.y = Math.min(Math.max(0, this.player.y), this.canvas.height - this.player.height);
            }
            
            // Redraw the game elements
            this.render();
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        document.getElementById(screenId).classList.remove('hidden');
    }
    
    startGame() {
        this.state = 'playing';
        this.showScreen('game-screen');
        
        // Stop intro and play gameplay music
        this.soundManager.stop('intro');
        this.soundManager.play('gameplay');
        
        // Clear any dead villains from previous games
        this.deadVillains = [];
        
        // Create maze with even larger cells for better performance
        const cellSize = 50; // Larger size for better performance
        const mazeWidth = Math.floor(this.canvas.width / cellSize);
        const mazeHeight = Math.floor(this.canvas.height / cellSize);
        
        // Limit maze size for performance
        const maxCells = 400; // Maximum number of cells for good performance
        if (mazeWidth * mazeHeight > maxCells) {
            const ratio = Math.sqrt(maxCells / (mazeWidth * mazeHeight));
            mazeWidth = Math.floor(mazeWidth * ratio);
            mazeHeight = Math.floor(mazeHeight * ratio);
        }
        
        this.maze = new Maze(mazeWidth, mazeHeight, cellSize);
        
        // Create player at random position
        const playerPos = this.maze.getRandomEmptyPosition(20);
        this.player = new Player(playerPos.x, playerPos.y, this.maze);
        
        // Create villains
        this.villains = [];
        for (let i = 0; i < this.villainCount; i++) {
            // Make sure villains are not too close to player
            let villainPos;
            let tooClose = true;
            
            while (tooClose) {
                villainPos = this.maze.getRandomEmptyPosition(20);
                
                // Check distance from player
                const dx = villainPos.x - this.player.x;
                const dy = villainPos.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 200) {
                    tooClose = false;
                }
            }
            
            const villain = new Villain(villainPos.x, villainPos.y, this.maze, this.player);
            villain.canFire = this.villainFiringEnabled;
            this.villains.push(villain);
        }
        
        // If flag capture mode, create the flag
        if (this.gameMode === 'capture') {
            // Create the flag in a random position, but not too close to any player
            let flagPos;
            let validPosition = false;
            
            while (!validPosition) {
                flagPos = this.maze.getRandomEmptyPosition(20);
                
                // Check distance from player and villains
                const playerDist = this.calcDistance(flagPos, playerPos);
                
                let minVillainDist = 1000;
                for (const villain of this.villains) {
                    const dist = this.calcDistance(flagPos, { x: villain.x, y: villain.y });
                    minVillainDist = Math.min(minVillainDist, dist);
                }
                
                // Make sure flag is not too close to player or villains
                if (playerDist > 200 && minVillainDist > 200) {
                    validPosition = true;
                }
            }
            
            this.flag = new Flag(flagPos.x, flagPos.y, this.maze);
        }
    }
    
    calcDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        if (this.state !== 'playing') return;
        
        console.log("Game update cycle");
        
        // Update player
        if (this.player) {
            console.log("Calling player.update()");
            this.player.update();
        } else {
            console.log("Player object doesn't exist!");
        }
        
        // Keep player within boundaries
        this.player.x = Math.min(Math.max(0, this.player.x), this.canvas.width - this.player.width);
        this.player.y = Math.min(Math.max(0, this.player.y), this.canvas.height - this.player.height);
        
        // Process villain respawns in flag capture mode
        if (this.gameMode === 'capture') {
            // Update respawn times based on current game state
            this.updateRespawnTimes();
            
            const now = Date.now();
            for (let i = this.deadVillains.length - 1; i >= 0; i--) {
                const deadVillain = this.deadVillains[i];
                if (now - deadVillain.deathTime >= this.villainRespawnDelay) {
                    // Time to respawn this villain
                    this.respawnVillain(deadVillain);
                    this.deadVillains.splice(i, 1);
                    
                    // Update respawn times after a villain respawns
                    this.updateRespawnTimes();
                }
            }
        }
        
        // Update villains
        for (let i = this.villains.length - 1; i >= 0; i--) {
            const villain = this.villains[i];
            const result = villain.update(deltaTime);
            
            // Check if villain caught player or hit player with energy ball
            if (villain.checkCollision(this.player) || result === 'hit-player') {
                this.gameOver(false);
                return;
            }
            
            // If the villain was hit by an energy ball
            if (result === true) {
                this.villains.splice(i, 1);
                this.soundManager.play('kill');
                
                // In flag capture mode, remember this villain for respawning
                if (this.gameMode === 'capture') {
                    this.deadVillains.push({
                        villain: villain,
                        deathTime: Date.now()
                    });
                    
                    // Update respawn times after a villain is killed
                    this.updateRespawnTimes();
                }
            }
        }
        
        // Handle mode-specific logic
        if (this.gameMode === 'hunt') {
            // Hunt mode: win by eliminating all villains
            if (this.villains.length === 0) {
                this.gameOver(true);
            }
        } else if (this.gameMode === 'capture') {
            // Update flag
            this.flag.update();
            
            // Check if player is capturing flag
            if (this.flag.checkCollision(this.player)) {
                this.flag.startCapture('player');
                if (this.flag.continueCapture()) {
                    // Player captured the flag
                    this.gameOver(true);
                }
            } else {
                // Check if any villain is capturing flag
                let villainCapturing = false;
                for (const villain of this.villains) {
                    if (this.flag.checkCollision(villain)) {
                        villainCapturing = true;
                        this.flag.startCapture('villain');
                        if (this.flag.continueCapture()) {
                            // Villain captured the flag
                            this.gameOver(false);
                            return;
                        }
                        break;
                    }
                }
                
                if (!villainCapturing && this.flag.capturingEntity === 'villain') {
                    this.flag.stopCapture();
                }
                
                if (!this.flag.checkCollision(this.player) && this.flag.capturingEntity === 'player') {
                    this.flag.stopCapture();
                }
            }
        }
    }
    
    respawnVillain(deadVillain) {
        // Skip if invalid deadVillain object
        if (!deadVillain || !deadVillain.villain) {
            return;
        }
        
        // Create a new villain at a random position away from player and flag
        let villainPos;
        let validPosition = false;
        
        while (!validPosition) {
            villainPos = this.maze.getRandomEmptyPosition(20);
            
            // Check distance from player
            const playerDist = this.calcDistance(villainPos, { 
                x: this.player.x, 
                y: this.player.y 
            });
            
            // Check distance from flag
            const flagDist = this.flag ? this.calcDistance(villainPos, { 
                x: this.flag.x, 
                y: this.flag.y 
            }) : 1000;
            
            // Ensure it's not too close to player or flag
            if (playerDist > 200 && flagDist > 150) {
                validPosition = true;
            }
        }
        
        // Create new villain with original properties
        const villain = new Villain(villainPos.x, villainPos.y, this.maze, this.player);
        villain.canFire = deadVillain.villain.canFire;
        villain.personalityType = deadVillain.villain.personalityType;
        villain.color = deadVillain.villain.color;
        
        // Add to active villains list
        this.villains.push(villain);
        
        // Visual effect for respawn
        this.createRespawnEffect(villainPos.x, villainPos.y);
    }
    
    createRespawnEffect(x, y) {
        // Add a simple visual effect to notice respawns
        // This could be expanded with actual particles or animations
        const respawnIndicator = {
            x: x,
            y: y,
            radius: 30,
            alpha: 1.0,
            color: '#f00',
            startTime: Date.now()
        };
        
        // We'll use a simple approach here, but you could create a proper
        // particle system for more elaborate effects
        const fadeEffect = () => {
            const elapsed = Date.now() - respawnIndicator.startTime;
            if (elapsed < 1000) {
                this.ctx.globalAlpha = 1 - (elapsed / 1000);
                this.ctx.beginPath();
                this.ctx.arc(
                    respawnIndicator.x + 10, // Center it on villain
                    respawnIndicator.y + 10,
                    respawnIndicator.radius * (elapsed / 500), // Grow then shrink
                    0, Math.PI * 2
                );
                this.ctx.fillStyle = respawnIndicator.color;
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                
                requestAnimationFrame(fadeEffect);
            }
        };
        
        fadeEffect();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state !== 'playing') return;
        
        // Draw maze
        this.maze.draw(this.ctx);
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw villains
        for (const villain of this.villains) {
            villain.draw(this.ctx);
        }
        
        // Draw flag in capture mode
        if (this.gameMode === 'capture' && this.flag) {
            this.flag.draw(this.ctx);
        }
        
        // Draw respawn countdown indicators above dead villains
        if (this.gameMode === 'capture' && this.deadVillains.length > 0) {
            const now = Date.now();
            this.ctx.textAlign = 'center';
            
            for (const deadVillain of this.deadVillains) {
                const timeLeft = Math.ceil((this.villainRespawnDelay - (now - deadVillain.deathTime)) / 1000);
                const lastPos = deadVillain.villain;
                
                if (timeLeft > 0) {
                    // Draw a countdown indicator where the villain died
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(`Respawn: ${timeLeft}s`, lastPos.x + 10, lastPos.y - 10);
                }
            }
            
            // Display current respawn time if in capture mode
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Respawn delay: ${(this.villainRespawnDelay / 1000).toFixed(1)}s`, 
                             this.canvas.width - 10, 20);
        }
        
        // Draw game mode indicator
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        const modeName = this.gameMode === 'hunt' ? 'Hunt Mode' : 'Flag Capture Mode';
        let modeDesc = '';
        
        if (this.gameMode === 'hunt') {
            modeDesc = `Eliminate all ${this.villainCount} villains`;
        } else {
            modeDesc = 'Capture the flag to win!';
        }
        
        this.ctx.fillText(modeName, 10, 20);
        this.ctx.fillText(modeDesc, 10, 40);
    }
    
    gameOver(won) {
        this.state = 'over';
        this.showScreen('game-over');
        
        document.getElementById('game-result').textContent = won ? 'You Win!' : 'Game Over';
        
        // Stop gameplay sound and play win/lose sound
        this.soundManager.stop('gameplay');
        this.soundManager.play(won ? 'win' : 'lose');
    }
    
    setupCursorHelper() {
        const cursorHelper = document.createElement('div');
        cursorHelper.id = 'cursor-helper';
        document.body.appendChild(cursorHelper);
        
        document.getElementById('game-canvas').addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            
            const rect = document.getElementById('game-canvas').getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            cursorHelper.style.left = `${e.clientX}px`;
            cursorHelper.style.top = `${e.clientY}px`;
            cursorHelper.style.display = 'block';
        });
        
        document.addEventListener('mouseout', () => {
            cursorHelper.style.display = 'none';
        });
        
        // Hide the helper when not in game
        this.stateChangeCallbacks.push((state) => {
            if (state !== 'playing') {
                cursorHelper.style.display = 'none';
            }
        });
    }
    
    updateRespawnTimes() {
        if (this.gameMode !== 'capture' || this.deadVillains.length === 0) return;
        
        // Calculate the dynamic respawn time based on active villain count
        const activeVillainCount = this.villains.length;
        const totalVillainCount = activeVillainCount + this.deadVillains.length;
        
        // When all villains are active, use base delay
        // When only one villain is active, use minimum delay
        // Linear interpolation for values in between
        let dynamicDelay;
        
        if (activeVillainCount >= totalVillainCount) {
            dynamicDelay = this.baseVillainRespawnDelay;
        } else if (activeVillainCount <= 1) {
            dynamicDelay = this.minVillainRespawnDelay;
        } else {
            // Calculate percentage of villains active
            const activePercentage = activeVillainCount / totalVillainCount;
            // Linear interpolation between min and max delay
            dynamicDelay = this.minVillainRespawnDelay + 
                (this.baseVillainRespawnDelay - this.minVillainRespawnDelay) * activePercentage;
        }
        
        // Round to nearest 100ms for cleaner numbers
        this.villainRespawnDelay = Math.round(dynamicDelay / 100) * 100;
    }
}

// Initialize game when page is loaded
window.addEventListener('load', () => {
    new Game();
});