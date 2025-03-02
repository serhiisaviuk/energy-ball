class Flag {
    constructor(x, y, maze) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 30;
        this.maze = maze;
        this.captureProgress = 0;
        this.maxCaptureProgress = 100;
        this.owner = null; // null = neutral, 'player' or 'villain'
        this.captureSpeed = 1; // How fast the capture happens
        this.capturingEntity = null;
        
        // Visual properties
        this.poleWidth = 3;
        this.poleHeight = 30;
        this.flagWidth = 20;
        this.flagHeight = 15;
        
        // Colors
        this.neutralColor = '#DDDDDD';
        this.playerColor = '#33CCFF';
        this.villainColor = '#FF3333';
        
        this.waveOffset = 0;
        this.waveSpeed = 0.1;
    }
    
    update() {
        // Animate flag waving
        this.waveOffset += this.waveSpeed;
        if (this.waveOffset > Math.PI * 2) {
            this.waveOffset = 0;
        }
        
        // Reset capture progress if no one is capturing
        if (!this.capturingEntity) {
            // Slowly revert to neutral if not being captured
            if (this.captureProgress > 0) {
                this.captureProgress -= 0.2;
            } else if (this.captureProgress < 0) {
                this.captureProgress += 0.2;
            }
            
            // Reset owner if progress is close to zero
            if (Math.abs(this.captureProgress) < 0.5) {
                this.captureProgress = 0;
                this.owner = null;
            }
        }
    }
    
    draw(ctx) {
        // Draw flag pole
        ctx.fillStyle = '#8B4513'; // Brown pole
        ctx.fillRect(
            this.x, 
            this.y, 
            this.poleWidth, 
            this.poleHeight
        );
        
        // Determine flag color based on owner/capture progress
        let flagColor;
        if (this.owner === 'player') {
            flagColor = this.playerColor;
        } else if (this.owner === 'villain') {
            flagColor = this.villainColor;
        } else {
            flagColor = this.neutralColor;
        }
        
        // Draw flag with wave effect
        ctx.beginPath();
        const flagX = this.x + this.poleWidth;
        const flagY = this.y + 5;
        
        ctx.moveTo(flagX, flagY);
        
        // Create wave effect in flag
        for (let i = 0; i < this.flagWidth; i++) {
            const waveHeight = Math.sin(this.waveOffset + i * 0.2) * 2;
            ctx.lineTo(
                flagX + i,
                flagY + (i / this.flagWidth) * this.flagHeight + waveHeight
            );
        }
        
        // Complete the flag shape
        ctx.lineTo(flagX + this.flagWidth, flagY + this.flagHeight);
        ctx.lineTo(flagX, flagY + this.flagHeight);
        ctx.closePath();
        
        ctx.fillStyle = flagColor;
        ctx.fill();
        
        // Draw capture progress
        this.drawCaptureProgress(ctx);
    }
    
    drawCaptureProgress(ctx) {
        const progressWidth = 30;
        const progressHeight = 5;
        const progressX = this.x - (progressWidth - this.poleWidth) / 2;
        const progressY = this.y + this.poleHeight + 5;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
        
        // Progress
        const normalizedProgress = Math.abs(this.captureProgress) / this.maxCaptureProgress;
        const fillWidth = progressWidth * normalizedProgress;
        
        // Color based on who's capturing
        ctx.fillStyle = this.captureProgress > 0 ? this.playerColor : this.villainColor;
        
        // Only draw if there's progress
        if (normalizedProgress > 0) {
            if (this.captureProgress > 0) {
                // Player capturing (fill from left)
                ctx.fillRect(progressX, progressY, fillWidth, progressHeight);
            } else {
                // Villain capturing (fill from right)
                ctx.fillRect(progressX + progressWidth - fillWidth, progressY, fillWidth, progressHeight);
            }
        }
    }
    
    startCapture(entity) {
        this.capturingEntity = entity;
    }
    
    stopCapture() {
        this.capturingEntity = null;
    }
    
    continueCapture() {
        if (!this.capturingEntity) return;
        
        if (this.capturingEntity === 'player') {
            // If villains were capturing, reverse progress
            if (this.captureProgress < 0) {
                this.captureProgress += this.captureSpeed * 2;
            } else {
                this.captureProgress += this.captureSpeed;
            }
            
            // Check if capture complete
            if (this.captureProgress >= this.maxCaptureProgress) {
                this.owner = 'player';
                this.captureProgress = this.maxCaptureProgress;
                return true; // Capture complete
            }
        } else if (this.capturingEntity === 'villain') {
            // If player was capturing, reverse progress
            if (this.captureProgress > 0) {
                this.captureProgress -= this.captureSpeed * 2;
            } else {
                this.captureProgress -= this.captureSpeed;
            }
            
            // Check if capture complete
            if (this.captureProgress <= -this.maxCaptureProgress) {
                this.owner = 'villain';
                this.captureProgress = -this.maxCaptureProgress;
                return true; // Capture complete
            }
        }
        return false; // Capture not complete
    }
    
    checkCollision(obj) {
        const captureRadius = 50; // Larger radius for capture zone
        
        // Flag center
        const flagCenterX = this.x + this.poleWidth / 2;
        const flagCenterY = this.y + this.poleHeight / 2;
        
        // Object center
        const objCenterX = obj.x + obj.width / 2;
        const objCenterY = obj.y + obj.height / 2;
        
        // Calculate distance between centers
        const dx = flagCenterX - objCenterX;
        const dy = flagCenterY - objCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < captureRadius;
    }
} 