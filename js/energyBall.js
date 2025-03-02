class EnergyBall {
    constructor(x, y, directionX, directionY, maze) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.directionX = directionX;
        this.directionY = directionY;
        this.speed = 5;
        this.active = true;
        this.maze = maze;
        this.color = "#0ff"; // Default color (cyan for player)
        this.isVillainBall = false;
    }
    
    update() {
        if (!this.active) return;
        
        // Store previous position
        const prevX = this.x;
        const prevY = this.y;
        
        // Update position
        this.x += this.directionX * this.speed;
        this.y += this.directionY * this.speed;
        
        // Simplified collision check - only check a few points along the path
        // This is more efficient than checking the entire maze
        const checkPoints = 2; // Reduce number of checks
        
        for (let i = 0; i <= checkPoints; i++) {
            const t = i / checkPoints;
            const checkX = prevX + (this.x - prevX) * t;
            const checkY = prevY + (this.y - prevY) * t;
            
            // Check collision with bounds
            if (checkX < 0 || checkY < 0 || 
                checkX > this.maze.width * this.maze.cellSize || 
                checkY > this.maze.height * this.maze.cellSize) {
                this.active = false;
                return;
            }
            
            // Get collision result with maze obstacles
            const collisionResult = this.maze.checkCollision({
                x: checkX - this.radius,
                y: checkY - this.radius,
                width: this.radius * 2,
                height: this.radius * 2
            });
            
            // Only deactivate the energy ball for true collisions (mountains and boundaries)
            // Let it pass through water ('water') and forests ('slow')
            if (collisionResult === true) {
                this.active = false;
                return;
            }
            // Water and forest collisions are ignored, allowing the ball to pass
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius,
            this.x, this.y, this.radius * 2
        );
        
        if (this.isVillainBall) {
            gradient.addColorStop(0, "rgba(255, 0, 0, 0.5)");
            gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
        } else {
            gradient.addColorStop(0, "rgba(0, 255, 255, 0.5)");
            gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    checkCollision(obj) {
        if (!this.active) return false;
        
        // Simple circle-rectangle collision
        const circleDistanceX = Math.abs(this.x - (obj.x + obj.width / 2));
        const circleDistanceY = Math.abs(this.y - (obj.y + obj.height / 2));

        if (circleDistanceX > (obj.width / 2 + this.radius)) return false;
        if (circleDistanceY > (obj.height / 2 + this.radius)) return false;

        if (circleDistanceX <= (obj.width / 2)) return true;
        if (circleDistanceY <= (obj.height / 2)) return true;

        const cornerDistance = Math.pow(circleDistanceX - obj.width / 2, 2) +
                             Math.pow(circleDistanceY - obj.height / 2, 2);

        return (cornerDistance <= Math.pow(this.radius, 2));
    }
} 