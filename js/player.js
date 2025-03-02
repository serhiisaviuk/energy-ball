class Player {
    constructor(x, y, maze) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 3;
        this.maze = maze;
        
        // Movement state
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Aiming direction - controlled ONLY by mouse
        this.directionX = 1;
        this.directionY = 0;
        
        // Energy balls
        this.energyBalls = [];
        this.lastFireTime = Date.now(); // Set to current time for initial cooldown
        this.fireCooldown = 250; // Cooldown between shots
        this.initialCooldown = 2000; // 2-second initial cooldown
        this.gameStartTime = Date.now(); // Store game start time
        
        // Dash ability
        this.isDashing = false;
        this.dashSpeed = 8; // Higher speed during dash
        this.dashDuration = 300; // How long the dash lasts in ms
        this.dashCooldown = 1500; // Cooldown between dashes
        this.lastDashTime = 0;
        this.dashDirection = { x: 0, y: 0 }; // Direction of the dash
        
        // Add a keys object for tracking key states
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false
        };
        
        this.setupInputHandlers();
    }
    
    setupInputHandlers() {
        // Global key tracking
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            // Update our keys object
            if (key in this.keys) {
                this.keys[key] = true;
                console.log("Key down:", key, this.keys);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
                console.log("Key up:", key, this.keys);
            }
        });
        
        // Mouse controls aim direction ONLY
        document.addEventListener('mousemove', (e) => {
            const rect = document.getElementById('game-canvas').getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            // Calculate direction vector
            const dx = canvasX - centerX;
            const dy = canvasY - centerY;
            
            // Normalize direction
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                this.directionX = dx / length;
                this.directionY = dy / length;
            }
        });
        
        // Add click handler for firing
        document.getElementById('game-canvas').addEventListener('click', () => {
            this.fireEnergyBall();
        });
    }
    
    update() {
        // Update movement flags based on keys
        this.moveUp = this.keys.w;
        this.moveDown = this.keys.s;
        this.moveLeft = this.keys.a;
        this.moveRight = this.keys.d;
        
        // Try to dash if space is pressed and wasn't pressed last frame
        if (this.keys.space && !this.wasSpacePressed) {
            this.dash();
        }
        this.wasSpacePressed = this.keys.space;
        
        // Debug movement state
        console.log("Movement state:", { 
            up: this.moveUp, 
            down: this.moveDown, 
            left: this.moveLeft, 
            right: this.moveRight
        });
        
        let dx = 0;
        let dy = 0;
        
        // Handle regular movement or dash
        if (this.isDashing) {
            // Use dash direction and speed
            dx = this.dashDirection.x * this.dashSpeed;
            dy = this.dashDirection.y * this.dashSpeed;
        } else {
            // Normal movement
            if (this.moveUp) dy -= this.speed;
            if (this.moveDown) dy += this.speed;
            if (this.moveLeft) dx -= this.speed;
            if (this.moveRight) dx += this.speed;
            
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx = (dx / length) * this.speed;
                dy = (dy / length) * this.speed;
            }
        }
        
        // Debug movement - add this to check if keys are being registered
        if (dx !== 0 || dy !== 0) {
            console.log(`Moving: dx=${dx}, dy=${dy}`);
        }
        
        // Simplify collision detection temporarily to get movement working
        const nextX = this.x + dx;
        const nextY = this.y + dy;
        
        // Basic boundary check
        if (nextX >= 0 && nextX + this.width <= this.maze.width * this.maze.cellSize) {
            this.x = nextX;
        }
        
        if (nextY >= 0 && nextY + this.height <= this.maze.height * this.maze.cellSize) {
            this.y = nextY;
        }
        
        // Update energy balls
        for (let i = this.energyBalls.length - 1; i >= 0; i--) {
            this.energyBalls[i].update();
            
            // Remove inactive energy balls
            if (!this.energyBalls[i].active) {
                this.energyBalls.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        // Draw player with yellow-orange color, brighter if dashing
        ctx.fillStyle = this.isDashing ? "#FFD700" : "#FFA500"; // Brighter gold when dashing
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw a brighter center to add some depth
        const innerWidth = this.width * 0.6;
        const innerHeight = this.height * 0.6;
        const innerX = this.x + (this.width - innerWidth) / 2;
        const innerY = this.y + (this.height - innerHeight) / 2;
        ctx.fillStyle = this.isDashing ? "#FFFFCC" : "#FFCC00"; // Even brighter when dashing
        ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
        
        // Draw motion trail when dashing
        if (this.isDashing) {
            const trailLength = 3;
            for (let i = 1; i <= trailLength; i++) {
                const alpha = 0.7 - (i / trailLength * 0.6);
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.fillRect(
                    this.x - this.dashDirection.x * i * 5,
                    this.y - this.dashDirection.y * i * 5,
                    this.width,
                    this.height
                );
            }
        }
        
        // Draw direction indicator
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + this.directionX * this.width,
            centerY + this.directionY * this.height
        );
        ctx.strokeStyle = "#FF4500"; // Red-orange
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw cooldown meter
        this.drawCooldownMeter(ctx);
        
        // Draw dash cooldown meter
        this.drawDashCooldownMeter(ctx);
        
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
        const meterY = this.y - meterHeight - 2; // Above the player
        
        // Draw meter background
        ctx.fillStyle = "#444";
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
        
        // Determine which cooldown is active
        let fillRatio = 1; // Default to full (can fire)
        let fillColor = "#33cc33"; // Green (ready to fire)
        
        // Check if in initial cooldown
        if (now - this.gameStartTime < this.initialCooldown) {
            fillRatio = (now - this.gameStartTime) / this.initialCooldown;
            fillColor = "#ff9900"; // Orange (initial cooldown)
        } 
        // Check if in regular cooldown
        else if (now - this.lastFireTime < this.fireCooldown) {
            fillRatio = (now - this.lastFireTime) / this.fireCooldown;
            fillColor = "#3399ff"; // Blue (regular cooldown)
        }
        
        // Draw filled portion of meter
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX, meterY, meterWidth * fillRatio, meterHeight);
        
        // Add text indicator
        if (fillRatio < 1) {
            ctx.fillStyle = "#fff";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Cooldown", this.x + this.width / 2, meterY - 2);
        }
    }
    
    drawDashCooldownMeter(ctx) {
        const now = Date.now();
        const meterWidth = this.width * 1.5;
        const meterHeight = 4;
        const meterX = this.x + (this.width - meterWidth) / 2;
        const meterY = this.y + this.height + 2; // Below the player
        
        // Draw meter background
        ctx.fillStyle = "#444";
        ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
        
        // Determine dash cooldown status
        let fillRatio = 1; // Default to full (can dash)
        let fillColor = "#FFCC00"; // Yellow (ready to dash)
        
        if (this.isDashing) {
            // Show remaining dash duration
            fillRatio = 1 - ((now - this.lastDashTime) / this.dashDuration);
            fillColor = "#FF4500"; // Orange-red (dashing)
        } else if (now - this.lastDashTime < this.dashCooldown) {
            // Show remaining cooldown
            fillRatio = (now - this.lastDashTime) / this.dashCooldown;
            fillColor = "#888888"; // Gray (cooldown)
        }
        
        // Draw filled portion of meter
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX, meterY, meterWidth * fillRatio, meterHeight);
        
        // Add text indicator
        ctx.fillStyle = "#fff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Dash", this.x + this.width / 2, meterY + meterHeight + 8);
    }
    
    fireEnergyBall() {
        const now = Date.now();
        
        // Check for both the regular cooldown and the initial 2-second cooldown
        if (now - this.lastFireTime < this.fireCooldown || 
            now - this.gameStartTime < this.initialCooldown) {
            return; // Still in cooldown
        }
        
        this.lastFireTime = now;
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        this.energyBalls.push(new EnergyBall(
            centerX,
            centerY,
            this.directionX,
            this.directionY,
            this.maze
        ));
    }
    
    dash() {
        const now = Date.now();
        
        // Check if dash is on cooldown
        if (now - this.lastDashTime < this.dashCooldown) {
            return;
        }
        
        // Start dash
        this.isDashing = true;
        this.lastDashTime = now;
        
        // Store current movement direction for dash
        let dx = 0;
        let dy = 0;
        
        if (this.moveUp) dy -= 1;
        if (this.moveDown) dy += 1;
        if (this.moveLeft) dx -= 1;
        if (this.moveRight) dx += 1;
        
        // If no movement keys are pressed, dash in the direction player is facing
        if (dx === 0 && dy === 0) {
            dx = this.directionX;
            dy = this.directionY;
        } else {
            // Normalize the direction
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
        }
        
        this.dashDirection = { x: dx, y: dy };
        
        // End dash after duration
        setTimeout(() => {
            this.isDashing = false;
        }, this.dashDuration);
    }
    
    checkCollision(obj) {
        return (
            this.x < obj.x + obj.width &&
            this.x + this.width > obj.x &&
            this.y < obj.y + obj.height &&
            this.y + this.height > obj.y
        );
    }
} 