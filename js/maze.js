class Maze {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = [];
        this.obstacles = [];
        
        // Terrain types
        this.TERRAIN_EMPTY = 0;
        this.TERRAIN_FOREST = 1;
        this.TERRAIN_MOUNTAIN = 2;
        this.TERRAIN_WATER = 3;
        
        this.generateTerrain();
    }
    
    generateTerrain() {
        // Initialize grid with empty terrain
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    x,
                    y,
                    terrain: this.TERRAIN_EMPTY,
                    // Randomize terrain slightly to create natural appearance
                    variation: Math.random() * 0.3
                };
            }
        }
        
        // Generate simpler terrain to improve performance
        this.generateSimpleTerrain();
        
        // Create obstacle objects for collision detection
        this.createObstacleObjects();
    }
    
    generateSimpleTerrain() {
        // Create a simpler terrain pattern that's less computationally intensive
        
        // Add some random forests
        const forestCount = Math.floor(this.width * this.height * 0.1); // 10% of cells
        for (let i = 0; i < forestCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            // Create a small forest cluster
            this.grid[y][x].terrain = this.TERRAIN_FOREST;
            
            // Maybe extend it in random directions
            if (x > 0 && Math.random() < 0.5) 
                this.grid[y][x-1].terrain = this.TERRAIN_FOREST;
            if (x < this.width - 1 && Math.random() < 0.5) 
                this.grid[y][x+1].terrain = this.TERRAIN_FOREST;
            if (y > 0 && Math.random() < 0.5) 
                this.grid[y-1][x].terrain = this.TERRAIN_FOREST;
            if (y < this.height - 1 && Math.random() < 0.5) 
                this.grid[y+1][x].terrain = this.TERRAIN_FOREST;
        }
        
        // Add some mountains
        const mountainCount = Math.floor(this.width * this.height * 0.05); // 5% of cells
        for (let i = 0; i < mountainCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            this.grid[y][x].terrain = this.TERRAIN_MOUNTAIN;
        }
        
        // Add some water
        const waterCount = Math.floor(this.width * this.height * 0.05); // 5% of cells
        for (let i = 0; i < waterCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            this.grid[y][x].terrain = this.TERRAIN_WATER;
            
            // Maybe extend it in random directions
            if (x > 0 && Math.random() < 0.3) 
                this.grid[y][x-1].terrain = this.TERRAIN_WATER;
            if (x < this.width - 1 && Math.random() < 0.3) 
                this.grid[y][x+1].terrain = this.TERRAIN_WATER;
            if (y > 0 && Math.random() < 0.3) 
                this.grid[y-1][x].terrain = this.TERRAIN_WATER;
            if (y < this.height - 1 && Math.random() < 0.3) 
                this.grid[y+1][x].terrain = this.TERRAIN_WATER;
        }
        
        // Create some clear paths through the terrain
        this.createSimplePaths();
    }
    
    createSimplePaths() {
        // Create a few horizontal and vertical paths
        const hPathCount = Math.floor(this.height / 4);
        for (let i = 0; i < hPathCount; i++) {
            const y = Math.floor(i * this.height / hPathCount + this.height / (hPathCount * 2));
            
            for (let x = 0; x < this.width; x++) {
                if (Math.random() < 0.8) { // 80% chance of clear path
                    this.grid[y][x].terrain = this.TERRAIN_EMPTY;
                }
            }
        }
        
        const vPathCount = Math.floor(this.width / 4);
        for (let i = 0; i < vPathCount; i++) {
            const x = Math.floor(i * this.width / vPathCount + this.width / (vPathCount * 2));
            
            for (let y = 0; y < this.height; y++) {
                if (Math.random() < 0.8) { // 80% chance of clear path
                    this.grid[y][x].terrain = this.TERRAIN_EMPTY;
                }
            }
        }
    }
    
    createObstacleObjects() {
        this.obstacles = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                
                if (cell.terrain === this.TERRAIN_MOUNTAIN) {
                    // Mountains are completely impassable
                    this.obstacles.push({
                        x: x * this.cellSize,
                        y: y * this.cellSize,
                        width: this.cellSize,
                        height: this.cellSize,
                        type: 'mountain'
                    });
                } else if (cell.terrain === this.TERRAIN_WATER) {
                    // Water is impassable
                    this.obstacles.push({
                        x: x * this.cellSize,
                        y: y * this.cellSize,
                        width: this.cellSize,
                        height: this.cellSize,
                        type: 'water'
                    });
                } else if (cell.terrain === this.TERRAIN_FOREST) {
                    // Forests slow down movement but don't block it completely
                    this.obstacles.push({
                        x: x * this.cellSize,
                        y: y * this.cellSize,
                        width: this.cellSize,
                        height: this.cellSize,
                        type: 'forest'
                    });
                }
            }
        }
    }
    
    draw(ctx) {
        // Draw the terrain - simplified approach to improve performance
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                const cellX = x * this.cellSize;
                const cellY = y * this.cellSize;
                
                switch (cell.terrain) {
                    case this.TERRAIN_EMPTY:
                        // Empty terrain (grass)
                        ctx.fillStyle = `rgb(100, ${150 + cell.variation * 50}, 100)`;
                        ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                        break;
                        
                    case this.TERRAIN_FOREST:
                        // Forest terrain
                        ctx.fillStyle = `rgb(0, ${100 + cell.variation * 50}, 0)`;
                        ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                        
                        // Draw some trees (simplified)
                        ctx.fillStyle = '#004400';
                        const treeSize = this.cellSize / 5;
                        ctx.beginPath();
                        ctx.arc(cellX + this.cellSize/2, cellY + this.cellSize/2, treeSize, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                        
                    case this.TERRAIN_MOUNTAIN:
                        // Mountain terrain
                        ctx.fillStyle = `rgb(${100 + cell.variation * 50}, ${90 + cell.variation * 50}, ${80 + cell.variation * 50})`;
                        ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                        
                        // Draw mountain shape (simplified)
                        ctx.fillStyle = '#555555';
                        ctx.beginPath();
                        ctx.moveTo(cellX, cellY + this.cellSize);
                        ctx.lineTo(cellX + this.cellSize / 2, cellY + this.cellSize / 4);
                        ctx.lineTo(cellX + this.cellSize, cellY + this.cellSize);
                        ctx.closePath();
                        ctx.fill();
                        break;
                        
                    case this.TERRAIN_WATER:
                        // Water terrain
                        ctx.fillStyle = `rgba(0, ${100 + cell.variation * 50}, ${200 + cell.variation * 55}, 0.8)`;
                        ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                        break;
                }
            }
        }
    }
    
    checkCollision(obj) {
        // Add boundary collision check
        if (obj.x < 0 || obj.y < 0 || 
            obj.x + obj.width > this.width * this.cellSize || 
            obj.y + obj.height > this.height * this.cellSize) {
            return true; // Collision with game boundaries
        }
        
        // Rest of the collision detection unchanged
        const startX = Math.floor(obj.x / this.cellSize);
        const startY = Math.floor(obj.y / this.cellSize);
        const endX = Math.floor((obj.x + obj.width) / this.cellSize);
        const endY = Math.floor((obj.y + obj.height) / this.cellSize);
        
        // Only check cells that the object could be touching
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    const cell = this.grid[y][x];
                    const cellX = x * this.cellSize;
                    const cellY = y * this.cellSize;
                    
                    if (cell.terrain === this.TERRAIN_MOUNTAIN) {
                        // Check collision with mountain
                        if (obj.x < cellX + this.cellSize &&
                            obj.x + obj.width > cellX &&
                            obj.y < cellY + this.cellSize &&
                            obj.y + obj.height > cellY) {
                            return true; // Collision with mountain (impassable)
                        }
                    } else if (cell.terrain === this.TERRAIN_WATER) {
                        // Check collision with water
                        if (obj.x < cellX + this.cellSize &&
                            obj.x + obj.width > cellX &&
                            obj.y < cellY + this.cellSize &&
                            obj.y + obj.height > cellY) {
                            return 'water'; // Collision with water (passable for energy balls)
                        }
                    } else if (cell.terrain === this.TERRAIN_FOREST) {
                        // Check collision with forest
                        if (obj.x < cellX + this.cellSize &&
                            obj.x + obj.width > cellX &&
                            obj.y < cellY + this.cellSize &&
                            obj.y + obj.height > cellY) {
                            return 'slow'; // Collision with forest (slowdown)
                        }
                    }
                }
            }
        }
        
        return false; // No collision
    }
    
    getRandomEmptyPosition(objectSize) {
        let attempts = 0;
        const maxAttempts = 100; // Limit attempts to avoid infinite loops
        
        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (this.width * this.cellSize - objectSize));
            const y = Math.floor(Math.random() * (this.height * this.cellSize - objectSize));
            
            const testObj = { x, y, width: objectSize, height: objectSize };
            const collision = this.checkCollision(testObj);
            
            // Only accept positions that are completely empty (not even forests)
            if (collision === false) {
                return { x, y };
            }
            
            attempts++;
        }
        
        // Fallback to a fixed position if all else fails
        return { x: this.cellSize, y: this.cellSize };
    }
    
    getCellTypeAt(x, y) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        // Check if coordinates are within bounds
        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return this.grid[gridY][gridX];
        }
        
        // Return an empty cell if out of bounds
        return { 
            x: gridX, 
            y: gridY, 
            terrain: this.TERRAIN_EMPTY,
            variation: 0
        };
    }
} 