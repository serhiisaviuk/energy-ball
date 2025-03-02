class Villain {
    constructor(x, y, maze, player) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.baseSpeed = 2;
        this.speed = this.baseSpeed; // Will be modified by terrain
        this.maze = maze;
        this.player = player;
        
        // Pathfinding
        this.path = [];
        this.pathUpdateInterval = 600; // ms
        this.lastPathUpdate = 0;
        this.pathNodes = [];
        this.previousPlayerPos = { x: -1, y: -1 };
        
        // Movement
        this.lastMoveTime = 0;
        this.stuckFrames = 0;
        this.lastPosition = { x: this.x, y: this.y };
        
        // Add a bit of randomness to each villain
        this.personalityType = Math.floor(Math.random() * 3); // 0: aggressive, 1: cautious, 2: flanking
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.color = `hsl(${(Math.random() * 20) + 0}, 80%, 50%)`; // Red with slight variation
        
        this.canFire = false; // Will be set by game based on menu option
        this.energyBalls = [];
        this.lastFireTime = Date.now(); // Set to current time
        this.fireCooldown = 2000; // 2 seconds between shots
        this.initialCooldown = 2000; // 2-second initial cooldown
        this.gameStartTime = Date.now(); // Store game start time
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        // Check if the player has moved significantly since last path update
        const playerMoved = Math.abs(this.previousPlayerPos.x - this.player.x) > 50 || 
                           Math.abs(this.previousPlayerPos.y - this.player.y) > 50;
        
        // Update path if needed
        if (now - this.lastPathUpdate > this.pathUpdateInterval || 
            this.path.length === 0 || playerMoved || this.stuckFrames > 30) {
            this.findPathToPlayer();
            this.lastPathUpdate = now;
            this.stuckFrames = 0;
            
            // Store current player position
            this.previousPlayerPos = { x: this.player.x, y: this.player.y };
            
            // Update personality offsets
            if (this.personalityType === 2) { // Flanking behavior
                const angle = Math.atan2(
                    this.player.y - this.y,
                    this.player.x - this.x
                ) + (Math.PI / 2); // Perpendicular to player direction
                
                const offset = 100 + Math.random() * 150;
                this.targetOffsetX = Math.cos(angle) * offset;
                this.targetOffsetY = Math.sin(angle) * offset;
            } else if (this.personalityType === 1) { // Cautious
                const angle = Math.random() * Math.PI * 2;
                const offset = 50 + Math.random() * 50;
                this.targetOffsetX = Math.cos(angle) * offset;
                this.targetOffsetY = Math.sin(angle) * offset;
            } else {
                // Aggressive - no offset
                this.targetOffsetX = 0;
                this.targetOffsetY = 0;
            }
        }
        
        // Follow the path
        if (this.path.length > 0) {
            const nextPoint = this.path[0];
            
            // Calculate direction to next point
            let dx = nextPoint.x - this.x;
            let dy = nextPoint.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Reached this point, move to next
            if (distance < this.speed) {
                this.path.shift();
                if (this.path.length === 0) return;
            } else {
                // Normalize direction
                dx = (dx / distance) * this.speed;
                dy = (dy / distance) * this.speed;
                
                // Check terrain at future position to adjust speed
                const nextX = this.x + dx;
                const nextY = this.y + dy;
                const terrainType = this.maze.checkCollision({
                    x: nextX,
                    y: nextY,
                    width: this.width,
                    height: this.height
                });
                
                if (terrainType === 'slow') {
                    // Forest terrain - slow down
                    dx *= 0.6;
                    dy *= 0.6;
                }
                
                // Try to move in both directions at once
                const newPos = { x: this.x + dx, y: this.y + dy };
                
                const collision = this.maze.checkCollision({
                    x: newPos.x,
                    y: newPos.y,
                    width: this.width,
                    height: this.height
                });
                
                if (collision !== true) { // true means full collision
                    this.x = newPos.x;
                    this.y = newPos.y;
                } else {
                    // Attempt to move in X direction only
                    const newPosX = { x: this.x + dx, y: this.y };
                    const collisionX = this.maze.checkCollision({
                        x: newPosX.x,
                        y: newPosX.y,
                        width: this.width,
                        height: this.height
                    });
                    
                    if (collisionX !== true) {
                        this.x = newPosX.x;
                    }
                    
                    // Attempt to move in Y direction only
                    const newPosY = { x: this.x, y: this.y + dy };
                    const collisionY = this.maze.checkCollision({
                        x: newPosY.x,
                        y: newPosY.y,
                        width: this.width,
                        height: this.height
                    });
                    
                    if (collisionY !== true) {
                        this.y = newPosY.y;
                    }
                }
            }
            
            // Check if stuck
            if (Math.abs(this.x - this.lastPosition.x) < 0.5 && 
                Math.abs(this.y - this.lastPosition.y) < 0.5) {
                this.stuckFrames++;
            } else {
                this.stuckFrames = 0;
            }
            
            // Store last position for stuck detection
            this.lastPosition = { x: this.x, y: this.y };
        }
        
        // Fire at player if enabled and cooldowns have passed
        if (this.canFire && 
            now - this.lastFireTime > this.fireCooldown && 
            now - this.gameStartTime > this.initialCooldown) {
            
            // Only fire if there's a clear line of sight to the player
            if (this.hasLineOfSightToPlayer()) {
                this.fireEnergyBall();
                this.lastFireTime = now;
            }
        }
        
        // Update energy balls
        for (let i = this.energyBalls.length - 1; i >= 0; i--) {
            this.energyBalls[i].update();
            
            // Remove inactive energy balls
            if (!this.energyBalls[i].active) {
                this.energyBalls.splice(i, 1);
            }
            
            // Check collision with player
            else if (this.energyBalls[i].checkCollision(this.player)) {
                this.energyBalls[i].active = false;
                this.energyBalls.splice(i, 1);
                return 'hit-player'; // Signal that player was hit
            }
        }
        
        // Check for collision with player's energy balls
        for (const ball of this.player.energyBalls) {
            if (ball.active && ball.checkCollision(this)) {
                ball.active = false;
                // Signal that this villain should be removed
                return true; // Return true to indicate this villain was hit
            }
        }
        return false; // Not hit by energy ball and player not hit
    }
    
    findPathToPlayer() {
        // Simplified pathfinding - head in general direction of player
        // with some randomness to avoid obstacles
        
        // Reset path
        this.path = [];
        
        // Direction to player
        const dirX = this.player.x - this.x;
        const dirY = this.player.y - this.y;
        
        // Normalize direction
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);
        
        if (distance > 0) {
            const normX = dirX / distance;
            const normY = dirY / distance;
            
            // Apply personality offsets
            let targetX = this.player.x + this.targetOffsetX;
            let targetY = this.player.y + this.targetOffsetY;
            
            // Add some intermediate points to help navigate around obstacles
            const pointCount = 2 + Math.floor(Math.random() * 3);
            const stepDistance = distance / (pointCount + 1);
            
            for (let i = 1; i <= pointCount; i++) {
                const t = i / (pointCount + 1);
                
                // Add some randomness to path
                const randomOffsetX = (Math.random() * 2 - 1) * 30;
                const randomOffsetY = (Math.random() * 2 - 1) * 30;
                
                const pointX = this.x + dirX * t + randomOffsetX;
                const pointY = this.y + dirY * t + randomOffsetY;
                
                this.path.push({ x: pointX, y: pointY });
            }
            
            // Final point is the target
            this.path.push({ x: targetX, y: targetY });
        }
    }
    
    isBlocked(gridX, gridY) {
        // Convert grid coordinates back to world coordinates
        const cellSize = this.maze.cellSize / 2;
        const worldX = gridX * cellSize;
        const worldY = gridY * cellSize;
        
        // Check collision with smaller test object
        const testSize = Math.min(this.width, this.height) * 0.8;
        return this.maze.checkCollision({
            x: worldX - testSize / 2,
            y: worldY - testSize / 2,
            width: testSize,
            height: testSize
        });
    }
    
    heuristic(x1, y1, x2, y2) {
        // Manhattan distance as heuristic
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    reconstructPath(cameFrom, current, cellSize) {
        const path = [];
        let currentNode = current;
        
        while (cameFrom.has(currentNode.id)) {
            // Convert grid coordinates to world coordinates
            path.unshift({
                x: currentNode.x * cellSize + cellSize / 2,
                y: currentNode.y * cellSize + cellSize / 2
            });
            
            currentNode = cameFrom.get(currentNode.id);
        }
        
        // Smooth the path
        return this.smoothPath(path);
    }
    
    smoothPath(path) {
        if (path.length <= 2) return path;
        
        const smoothed = [path[0]];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = smoothed[smoothed.length - 1];
            const current = path[i];
            const next = path[i + 1];
            
            // Check if we can skip this point by seeing if there's a straight path
            // from prev to next without hitting walls
            const dx1 = current.x - prev.x;
            const dy1 = current.y - prev.y;
            const dx2 = next.x - current.x;
            const dy2 = next.y - current.y;
            
            // If directions are very similar, we can potentially skip this point
            const dot = dx1 * dx2 + dy1 * dy2;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            if (len1 > 0 && len2 > 0) {
                const cosAngle = dot / (len1 * len2);
                
                // Check if angle is small enough to skip
                if (cosAngle > 0.7) {
                    // Check if direct path is clear
                    const testObj = {
                        x: 0, y: 0,
                        width: this.width * 0.8,
                        height: this.height * 0.8
                    };
                    
                    let blocked = false;
                    const steps = 5; // Number of points to check along direct path
                    
                    for (let j = 1; j <= steps; j++) {
                        const t = j / steps;
                        const testX = prev.x + (next.x - prev.x) * t;
                        const testY = prev.y + (next.y - prev.y) * t;
                        
                        testObj.x = testX - testObj.width / 2;
                        testObj.y = testY - testObj.height / 2;
                        
                        if (this.maze.checkCollision(testObj) === true) {
                            blocked = true;
                            break;
                        }
                    }
                    
                    if (!blocked) {
                        continue; // Skip this point
                    }
                }
            }
            
            smoothed.push(current);
        }
        
        smoothed.push(path[path.length - 1]);
        return smoothed;
    }
    
    draw(ctx) {
        // Draw the villain
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add eyes to show facing direction
        const lookAtDir = {
            x: this.player.x - this.x,
            y: this.player.y - this.y
        };
        
        const len = Math.sqrt(lookAtDir.x * lookAtDir.x + lookAtDir.y * lookAtDir.y);
        if (len > 0) {
            lookAtDir.x /= len;
            lookAtDir.y /= len;
        }
        
        const eyeOffset = this.width / 5;
        const eyeSize = this.width / 6;
        
        // Left eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2 - eyeOffset,
            this.y + this.height / 3,
            eyeSize,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2 + eyeOffset,
            this.y + this.height / 3,
            eyeSize,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Eye pupils (looking at player)
        ctx.fillStyle = 'black';
        const pupilSize = eyeSize / 2;
        const pupilOffset = eyeSize / 2;
        
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2 - eyeOffset + lookAtDir.x * pupilOffset,
            this.y + this.height / 3 + lookAtDir.y * pupilOffset,
            pupilSize,
            0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
            this.x + this.width / 2 + eyeOffset + lookAtDir.x * pupilOffset,
            this.y + this.height / 3 + lookAtDir.y * pupilOffset,
            pupilSize,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw snarling mouth
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 4, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width * 3/4, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height * 0.8);
        ctx.closePath();
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Draw cooldown meter if villain can fire
        if (this.canFire) {
            this.drawCooldownMeter(ctx);
        }
        
        // Draw energy balls
        for (const ball of this.energyBalls) {
            ball.draw(ctx);
        }
    }
    
    drawCooldownMeter(ctx) {
        const now = Date.now();
        const meterWidth = this.width * 1.5;
        const meterHeight = 4;
        const meterX = this.x + (this.width - meterWidth) / 2;
        const meterY = this.y - meterHeight - 2; // Above the villain
        
        // Draw meter background
        ctx.fillStyle = "#444";
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
        
        // Determine which cooldown is active
        let fillRatio = 1; // Default to full (can fire)
        let fillColor = "#cc3333"; // Red (ready to fire)
        
        // Check if in initial cooldown
        if (now - this.gameStartTime < this.initialCooldown) {
            fillRatio = (now - this.gameStartTime) / this.initialCooldown;
            fillColor = "#ff9900"; // Orange (initial cooldown)
        } 
        // Check if in regular cooldown
        else if (now - this.lastFireTime < this.fireCooldown) {
            fillRatio = (now - this.lastFireTime) / this.fireCooldown;
            fillColor = "#884444"; // Dark red (regular cooldown)
        }
        
        // Draw filled portion of meter
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX, meterY, meterWidth * fillRatio, meterHeight);
    }
    
    checkCollision(obj) {
        return (
            this.x < obj.x + obj.width &&
            this.x + this.width > obj.x &&
            this.y < obj.y + obj.height &&
            this.y + this.height > obj.y
        );
    }
    
    hasLineOfSightToPlayer() {
        // Simple line of sight check - see if there's a clear path to player
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        const endX = this.player.x + this.player.width / 2;
        const endY = this.player.y + this.player.height / 2;
        
        // Check a few points along the line
        const steps = 10;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // Check if this point hits a wall
            if (this.maze.checkCollision({
                x: x - 2,
                y: y - 2,
                width: 4,
                height: 4
            }) === true) {
                return false;
            }
        }
        
        return true;
    }
    
    fireEnergyBall() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Calculate direction to player
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        const dx = playerCenterX - centerX;
        const dy = playerCenterY - centerY;
        
        // Normalize direction
        const length = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / length;
        const dirY = dy / length;
        
        // Create energy ball with different color for villains
        const ball = new EnergyBall(centerX, centerY, dirX, dirY, this.maze);
        ball.color = "#ff0000"; // Red energy balls for villains
        ball.isVillainBall = true;
        
        this.energyBalls.push(ball);
    }
} 