class GameObject {
    // Static cache for fruit-specific data
    static fruitDataCache = {
        grape: [[-7,7],[0,0],[7,7],[-4,-4],[4,-4]],
        watermelon: Array.from({length: 7}, () => ({
            angle: Math.random() * Math.PI*2,
            dist: Math.random() * 10
        })),
        dragonfruit: Array.from({length: 12}, () => ({
            angle: Math.random() * Math.PI*2,
            radius: Math.random() * 20
        })),
        papaya: Array.from({length: 9}, () => ({
            angle: Math.PI/2 + (Math.random()-0.5),
            radius: 7 + Math.random()*5
        })),
        kiwi: Array.from({length: 18}, (_, i) => ({
            angle: i * Math.PI*2/18,
            radius: 10
        }))
    };

    // Static color palette shared across all instances
    static COLORS = {
        apple: { main: '#ff2d2d', stem: '#5a350c', leaf: '#2ecc40' },
        banana: { main: '#ffe135', stem: '#866c09', tip: '#d6b70a' },
        orange: { main: '#ff9500', stem: '#ad6407', leaf: '#aeea00' },
        grape: { main: '#6a1b9a', stem: '#68401a' },
        pineapple: { main: '#ffdd55', stem: '#238b22', skin: '#a9743a', leaves: '#238b22' },
        starfruit: { main: '#ffe659', stem: '#af8508' },
        dragonfruit: { main: '#fc46aa', scales: '#57eb64', dots: '#000000' },
        watermelon: { main: '#fc4c4e', rind: '#188835', seeds: '#222' },
        pomegranate: { main: '#d9032e', stem: '#683214' },
        passionfruit: { main: '#85266d', stem: '#745329' },
        lychee: { main: '#e04947', stem: '#7f3523', skin: '#f8a4a4' },
        papaya: { main: '#ffb23d', stem: '#8d5413', seeds: '#262200' },
        mangosteen: { main: '#491f7e', stem: '#755217', cap: '#94fa7c' },
        kiwi: { main: '#b0de4c', skin: '#725c27', seeds: '#222' },
        persimmon: { main: '#fd6d1f', stem: '#70510e', cap: '#a1ce58' }
    };

    constructor(x, y, type, speedMultiplier, centerX, centerY, size = 1) {
        this.x = x;
        this.y = y;
        this.type = type; // 'flying' or 'tossed' or 'orbital'
        this.size = size; // 1 is normal size, 0.5 is half size, etc.
        this.width = 40 * this.size;
        this.height = 40 * this.size;
        this.baseSpeed = 3; // Reduced from 5 to 3
        this.speedMultiplier = speedMultiplier;
        this.speed = this.baseSpeed * this.speedMultiplier;
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.sliced = false;
        this.particles = [];
        this.breakProgress = 0; // 0 to 1 for breaking animation
        this.breakDirection = Math.random() > 0.5 ? 1 : -1;
        this.pieces = []; // Array to hold smaller pieces
        
        // Randomly select a fruit type
        this.fruitType = Math.floor(Math.random() * 15); // 15 different fruits
        
        // Gravitational properties
        this.centerX = centerX;
        this.centerY = centerY;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.2 * this.speedMultiplier;
        
        // Pre-calculate fruit-specific data
        this.fruitData = this.initializeFruitData();
        
        // Initialize velocity based on position relative to center
        const dx = this.x - this.centerX;
        const dy = this.y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Calculate launch angle towards center with ±20 degree variation
        const targetAngle = angle + Math.PI; // Angle towards center
        const variation = (Math.random() - 0.5) * (Math.PI / 9); // ±20 degrees in radians
        const launchAngle = targetAngle + variation;
        
        // Set initial velocity with some tangential component for elliptical orbit
        const orbitalSpeed = (Math.random() * 2 + 3) * this.speedMultiplier;
        const tangentialFactor = 0.7; // How much of the velocity is tangential vs radial
        this.velocityX = Math.cos(launchAngle) * orbitalSpeed * (1 - tangentialFactor) + 
                        Math.cos(launchAngle + Math.PI/2) * orbitalSpeed * tangentialFactor;
        this.velocityY = Math.sin(launchAngle) * orbitalSpeed * (1 - tangentialFactor) + 
                        Math.sin(launchAngle + Math.PI/2) * orbitalSpeed * tangentialFactor;
        
        this.sliceCount = 0;
        this.maxSlices = 2; // Changed to 2 since we only want one split
        this.fadeProgress = 0; // New property for fade effect
        this.isFading = false; // New property to track if object is fading
        this.isOffscreen = false;
        this.lastSlicedTime = 0;
    }

    initializeFruitData() {
        switch(this.fruitType) {
            case 3: // Grape
                return { coords: GameObject.fruitDataCache.grape };
            case 7: // Watermelon
                return { seeds: GameObject.fruitDataCache.watermelon };
            case 6: // Dragonfruit
                return { dots: GameObject.fruitDataCache.dragonfruit };
            case 11: // Papaya
                return { seeds: GameObject.fruitDataCache.papaya };
            case 13: // Kiwi
                return { seeds: GameObject.fruitDataCache.kiwi };
            default:
                return null;
        }
    }

    breakIntoPieces() {
        // If fruit is too small or has reached max slices, start fading
        if (this.size <= 0.25 || this.sliceCount >= this.maxSlices) {
            this.isFading = true; // Start fading instead of creating more pieces
            return [];
        }

        const pieces = [];
        const newSize = this.size * 0.7;
        const spread = 8;
        const baseAngle = Math.random() * Math.PI; // Random starting angle

        // Create exactly 2 pieces
        for (let i = 0; i < 2; i++) {
            const piece = new GameObject(
                this.x,
                this.y,
                this.type,
                this.speedMultiplier,
                this.centerX,
                this.centerY,
                newSize
            );
            piece.fruitType = this.fruitType;
            piece.sliceCount = this.sliceCount + 1;
            const angle = baseAngle + (i * Math.PI); // Second piece goes in opposite direction
            piece.velocityX = this.velocityX + Math.cos(angle) * spread;
            piece.velocityY = this.velocityY + Math.sin(angle) * spread;
            piece.lastSlicedTime = Date.now(); // Set invulnerability window
            pieces.push(piece);
        }

        // Mark this object as sliced to prevent further slicing
        this.sliced = true;
        this.isFading = true;

        return pieces;
    }

    update() {
        // Quick offscreen check
        const margin = 100; // Buffer zone
        this.isOffscreen = (
            this.x < -margin ||
            this.x > this.centerX * 2 + margin ||
            this.y < -margin ||
            this.y > this.centerY * 2 + margin
        );

        if (this.isOffscreen) return;

        if (this.isFading) {
            this.fadeProgress += 0.05;
            if (this.fadeProgress >= 1) {
                this.fadeProgress = 1;
                return;
            }
        } else if (this.sliced) {
            // Continue movement even when sliced
            this.breakProgress += 0.1;
            this.angle += this.breakDirection * 0.2;
            
            // Apply gravity and movement to sliced pieces
            this.velocityY += this.gravity * 0.5; // Reduced gravity for sliced pieces
            this.x += this.velocityX * 0.8; // Continue horizontal movement
            this.y += this.velocityY;
            
            // Add some rotation based on movement
            this.rotationSpeed = (this.velocityX * 0.01) + (Math.random() - 0.5) * 0.1;
        } else {
            // Calculate gravitational force
            const dx = this.centerX - this.x;
            const dy = this.centerY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Stronger gravity when closer to center for more elliptical orbits
            const force = this.gravity / (distance * 0.05);
            
            // Apply gravitational force
            this.velocityX += (dx / distance) * force;
            this.velocityY += (dy / distance) * force;
            
            // Add slight drag to prevent infinite orbits
            this.velocityX *= 0.999;
            this.velocityY *= 0.999;
            
            // Update position
            this.x += this.velocityX;
            this.y += this.velocityY;
            
            // Update rotation
            this.angle += this.rotationSpeed;
        }

        // Update only active particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.fadeProgress >= 1 || this.isOffscreen) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.isFading) {
            ctx.globalAlpha = 1 - this.fadeProgress;
        }

        if (this.sliced) {
            ctx.rotate(this.angle);
            const breakOffset = this.breakProgress * 30 * this.breakDirection;
            
            // Draw first half
            ctx.save();
            ctx.translate(breakOffset, 0);
            this.drawFruit(ctx, this.width, this.height);
            ctx.restore();
            
            // Draw second half
            ctx.save();
            ctx.translate(-breakOffset * 2, 0);
            this.drawFruit(ctx, this.width, this.height);
            ctx.restore();
            
            // Draw slice line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.width/2 + breakOffset, -this.height/2);
            ctx.lineTo(this.width/2 + breakOffset, this.height/2);
            ctx.stroke();
        } else {
            ctx.rotate(this.angle);
            this.drawFruit(ctx, this.width, this.height);
        }
        ctx.restore();

        // Draw only active particles
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
    }

    drawFruit(ctx, width, height) {
        switch(this.fruitType) {
            case 0: this.drawApple(ctx, width, height); break;
            case 1: this.drawBanana(ctx, width, height); break;
            case 2: this.drawOrange(ctx, width, height); break;
            case 3: this.drawGrape(ctx, width, height); break;
            case 4: this.drawPineapple(ctx, width, height); break;
            case 5: this.drawStarfruit(ctx, width, height); break;
            case 6: this.drawDragonfruit(ctx, width, height); break;
            case 7: this.drawWatermelon(ctx, width, height); break;
            case 8: this.drawPomegranate(ctx, width, height); break;
            case 9: this.drawPassionfruit(ctx, width, height); break;
            case 10: this.drawLychee(ctx, width, height); break;
            case 11: this.drawPapaya(ctx, width, height); break;
            case 12: this.drawMangosteen(ctx, width, height); break;
            case 13: this.drawKiwi(ctx, width, height); break;
            case 14: this.drawPersimmon(ctx, width, height); break;
        }
    }

    drawApple(ctx, width, height) {
        const c = GameObject.COLORS.apple;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI*2);
        ctx.bezierCurveTo(width*0.3, height*0.5, -width*0.3, height*0.5, 0, height*0.35);
        ctx.fill();

        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -height/2.1);
        ctx.bezierCurveTo(5, -height/2.3, 8, -height/2, 0, -height/2 + 10);
        ctx.stroke();

        ctx.fillStyle = c.leaf;
        ctx.save();
        ctx.translate(width/7, -height/2.4);
        ctx.rotate(-Math.PI/8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.restore();
    }

    drawBanana(ctx, width, height) {
        const c = GameObject.COLORS.banana;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.moveTo(-width/2, height/8);
        ctx.bezierCurveTo(
            -width/3, -height/2, width/2, -height/2, width/2, height/8
        );
        ctx.bezierCurveTo(
            width/3, height/1.7, -width/3, height/1.7, -width/2, height/8
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = c.tip;
        ctx.beginPath();
        ctx.arc(-width/2+2, height/8, 4, 0, Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width/2, height/8);
        ctx.lineTo(width/2+5, height/8-5);
        ctx.stroke();
        ctx.restore();
    }

    drawOrange(ctx, width, height) {
        const c = GameObject.COLORS.orange;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = '#fff9a5';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, width/2.2, i * Math.PI/3, (i+0.5)*Math.PI/3);
            ctx.stroke();
        }
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2-8);
        ctx.stroke();
        ctx.fillStyle = c.leaf;
        ctx.beginPath();
        ctx.ellipse(-width/7, -height/2.1, 7, 3, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    drawGrape(ctx, width, height) {
        const c = GameObject.COLORS.grape;
        ctx.save();
        const grapes = this.fruitData.coords;
        grapes.forEach(([gx, gy]) => {
            ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
            ctx.beginPath();
            ctx.arc(gx, gy, width/6, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2-10);
        ctx.stroke();
        ctx.restore();
    }

    drawPineapple(ctx, width, height) {
        const c = GameObject.COLORS.pineapple;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2.3, height/2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = c.skin;
        ctx.lineWidth = 1.5;
        for (let i = -width/2.3; i < width/2.3; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, -height/2);
            ctx.lineTo(i, height/2);
            ctx.stroke();
        }
        for (let j = -height/2; j < height/2; j += 8) {
            ctx.beginPath();
            ctx.moveTo(-width/2.3, j);
            ctx.lineTo(width/2.3, j);
            ctx.stroke();
        }
        // Leaves
        ctx.save();
        ctx.translate(0, -height/2);
        ctx.fillStyle = c.leaves;
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((i-2.5)*Math.PI/8);
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(0,-17-Math.random()*6);
            ctx.lineTo(7,0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
        ctx.restore();
    }

    drawStarfruit(ctx, width, height) {
        const c = GameObject.COLORS.starfruit;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI/2;
            const x = Math.cos(angle) * width/2;
            const y = Math.sin(angle) * height/2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2 - 10);
        ctx.stroke();
        ctx.restore();
    }

    drawDragonfruit(ctx, width, height) {
        const c = GameObject.COLORS.dragonfruit;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = c.scales;
        for (let i = 0; i < 6; i++) {
            ctx.save();
            const angle = (i * Math.PI * 2) / 6;
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(width/3, 0, 7, 2, angle, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = c.dots;
        this.fruitData.dots.forEach(({angle, radius}) => {
            ctx.beginPath();
            ctx.arc(Math.cos(angle)*radius, Math.sin(angle)*radius, 1, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawWatermelon(ctx, width, height) {
        const c = GameObject.COLORS.watermelon;
        ctx.save();
        ctx.fillStyle = c.rind;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2-5, height/2-5, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = c.seeds;
        this.fruitData.seeds.forEach(({angle, dist}) => {
            ctx.beginPath();
            ctx.ellipse(Math.cos(angle)*dist, Math.sin(angle)*dist, 2, 4, angle, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawPomegranate(ctx, width, height) {
        const c = GameObject.COLORS.pomegranate;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI*2);
        ctx.fill();
        // "Crown"
        ctx.fillStyle = c.stem;
        ctx.save();
        ctx.translate(0, -height/2+2);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.sin(i*1.257)*7, -Math.cos(i*1.257)*6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.restore();
    }

    drawPassionfruit(ctx, width, height) {
        const c = GameObject.COLORS.passionfruit;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2 - 8);
        ctx.stroke();
        ctx.restore();
    }

    drawLychee(ctx, width, height) {
        const c = GameObject.COLORS.lychee;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI*2);
        ctx.fill();
        // Spiky skin
        ctx.strokeStyle = c.skin;
        for (let i = 0; i < 18; i++) {
            const a = i*Math.PI*2/18;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*(width/2-2), Math.sin(a)*(height/2-2));
            ctx.lineTo(Math.cos(a)*(width/2+2), Math.sin(a)*(height/2+2));
            ctx.stroke();
        }
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2 - 8);
        ctx.stroke();
        ctx.restore();
    }

    drawPapaya(ctx, width, height) {
        const c = GameObject.COLORS.papaya;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = c.seeds;
        this.fruitData.seeds.forEach(({angle, radius}) => {
            ctx.beginPath();
            ctx.arc(Math.cos(angle)*radius, Math.sin(angle)*radius, 1.4, 0, Math.PI*2);
            ctx.fill();
        });

        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2 - 10);
        ctx.stroke();
        ctx.restore();
    }

    drawMangosteen(ctx, width, height) {
        const c = GameObject.COLORS.mangosteen;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = c.cap;
        ctx.beginPath();
        ctx.arc(0, -height/2 + 7, width/4, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2 + 2);
        ctx.lineTo(0, -height/2 - 6);
        ctx.stroke();
        ctx.restore();
    }

    drawKiwi(ctx, width, height) {
        const c = GameObject.COLORS.kiwi;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2.3, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = c.skin;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = c.seeds;
        this.fruitData.seeds.forEach(({angle, radius}) => {
            ctx.beginPath();
            ctx.arc(Math.cos(angle)*radius, Math.sin(angle)*radius, 1, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawPersimmon(ctx, width, height) {
        const c = GameObject.COLORS.persimmon;
        ctx.save();
        ctx.fillStyle = this.sliced ? c.main + '80' : c.main;
        ctx.beginPath();
        ctx.ellipse(0, 0, width/2, height/2.4, 0, 0, Math.PI*2);
        ctx.fill();
        // Cap
        ctx.fillStyle = c.cap;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i*Math.PI/2);
            ctx.beginPath();
            ctx.ellipse(0, -height/2.5, 8, 3, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
        ctx.strokeStyle = c.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2.3);
        ctx.lineTo(0, -height/2.3 - 7);
        ctx.stroke();
        ctx.restore();
    }

    createSliceParticles() {
        // Create more particles for a more dramatic effect
        const particleCount = 20;
        const baseSpeed = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = Math.random() * baseSpeed + 2;
            const size = Math.random() * 4 + 2;
            
            // Create particles with initial velocity based on the fruit's current velocity
            const vx = this.velocityX * 0.5 + Math.cos(angle) * speed;
            const vy = this.velocityY * 0.5 + Math.sin(angle) * speed;
            
            this.particles.push(new Particle(
                this.x,
                this.y,
                vx,
                vy,
                this.getFruitColor() // Get the appropriate color for the fruit type
            ));
        }
    }

    getFruitColor() {
        // Get the main color for the current fruit type
        const fruitTypes = ['apple', 'banana', 'orange', 'grape', 'pineapple', 
                          'starfruit', 'dragonfruit', 'watermelon', 'pomegranate', 
                          'passionfruit', 'lychee', 'papaya', 'mangosteen', 
                          'kiwi', 'persimmon'];
        const fruitName = fruitTypes[this.fruitType];
        return GameObject.COLORS[fruitName].main;
    }
}

class Particle {
    constructor(x, y, vx, vy, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1;
        this.size = Math.random() * 4 + 2; // Varied particle sizes
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Add gravity to particles
        this.life -= 0.02;
        this.rotation += this.rotationSpeed;
        this.size *= 0.98; // Particles shrink over time
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color.replace(')', `, ${this.life})`).replace('rgb', 'rgba');
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class SlashEffect {
    constructor(startX, startY, endX, endY) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.life = 1;
        this.width = 8;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create particles along the slash line
        const numParticles = Math.floor(length / 10);
        for (let i = 0; i < numParticles; i++) {
            const t = i / numParticles;
            const x = this.startX + dx * t;
            const y = this.startY + dy * t;
            
            // Add some randomness to particle positions
            const offset = (Math.random() - 0.5) * 10;
            const perpX = Math.cos(angle + Math.PI/2) * offset;
            const perpY = Math.sin(angle + Math.PI/2) * offset;
            
            this.particles.push({
                x: x + perpX,
                y: y + perpY,
                size: Math.random() * 4 + 2,
                life: 1,
                speed: Math.random() * 2 + 1,
                angle: angle + (Math.random() - 0.5) * Math.PI/4
            });
        }
    }

    update() {
        this.life -= 0.05;
        this.particles.forEach(p => {
            p.life -= 0.05;
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.size *= 0.95;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        // Draw the main slash line
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.life * 0.8})`;
        ctx.lineWidth = this.width * this.life;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.endX, this.endY);
        ctx.stroke();

        // Draw particles
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioContext.suspend(); // Start suspended until user interaction
    }

    resume() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    createSwishSound() {
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                const t = i / sampleRate;
                // Create a whooshing sound with frequency sweep
                const freq = 2000 - (t / duration) * 1500; // Sweep from 2000Hz to 500Hz
                const pan = channel === 0 ? -0.5 : 0.5; // Stereo separation
                data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-4 * t) * 0.3;
            }
        }
        
        return buffer;
    }

    createSquishSound() {
        const duration = 0.15;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                const t = i / sampleRate;
                // Create a squishy sound with noise and frequency modulation
                const noise = (Math.random() * 2 - 1) * 0.5;
                const freq = 800 + Math.sin(t * 50) * 200; // Modulated frequency
                const envelope = Math.exp(-8 * t); // Quick decay
                data[i] = (noise + Math.sin(2 * Math.PI * freq * t)) * envelope * 0.4;
            }
        }
        
        return buffer;
    }

    playSwish() {
        this.resume();
        const source = this.audioContext.createBufferSource();
        source.buffer = this.createSwishSound();
        
        // Add stereo panning
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.5; // Random pan position
        
        // Add subtle reverb
        const reverb = this.audioContext.createConvolver();
        const reverbBuffer = this.audioContext.createBuffer(2, this.audioContext.sampleRate * 0.3, this.audioContext.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = reverbBuffer.getChannelData(channel);
            for (let i = 0; i < reverbBuffer.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.audioContext.sampleRate * 0.1));
            }
        }
        reverb.buffer = reverbBuffer;
        
        // Connect nodes
        source.connect(panner);
        panner.connect(reverb);
        reverb.connect(this.audioContext.destination);
        
        source.start();
    }

    playSquish() {
        this.resume();
        const source = this.audioContext.createBufferSource();
        source.buffer = this.createSquishSound();
        
        // Add stereo panning
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.3; // Less panning for squish
        
        // Add subtle reverb
        const reverb = this.audioContext.createConvolver();
        const reverbBuffer = this.audioContext.createBuffer(2, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = reverbBuffer.getChannelData(channel);
            for (let i = 0; i < reverbBuffer.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.audioContext.sampleRate * 0.05));
            }
        }
        reverb.buffer = reverbBuffer;
        
        // Connect nodes
        source.connect(panner);
        panner.connect(reverb);
        reverb.connect(this.audioContext.destination);
        
        source.start();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.objects = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 1500; // Base spawn interval of 1.5 seconds
        this.minSpawnInterval = 1000; // Minimum 1 second between spawns
        this.maxSpawnInterval = 2000; // Maximum 2 seconds between spawns
        this.touchStart = null;
        this.gameStartTime = Date.now();
        this.speedMultiplier = 1;
        this.lastDifficultyIncrease = Date.now();
        this.difficultyIncreaseInterval = 60000;
        this.slashEffects = [];
        
        // Initialize sound manager
        this.soundManager = new SoundManager();
        
        // Center point properties
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.lastCenterMove = Date.now();
        this.centerMoveInterval = 30000;
        
        this.lastBackgroundChange = Date.now();
        this.backgroundColors = [
            '#ffb6c1', // Light pink
            '#ffc0cb', // Pink
            '#ff69b4', // Hot pink
            '#ff1493', // Deep pink
            '#db7093', // Pale violet red
            '#ff69b4', // Hot pink
            '#ffb6c1', // Light pink
            '#ffc0cb'  // Pink
        ];
        this.currentColorIndex = 0;
        
        this.resize();
        this.setupEventListeners();
        this.gameLoop();
    }

    resize() {
        const vw = window.innerWidth,
              vh = window.innerHeight,
              dpr = window.devicePixelRatio || 1;

        // Set buffer resolution
        this.canvas.width = vw * dpr;
        this.canvas.height = vh * dpr;

        // Make the CSS size match
        this.canvas.style.width = `${vw}px`;
        this.canvas.style.height = `${vh}px`;

        // Scale the drawing context back to CSS space
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        // Update center point in CSS-pixel space
        this.updateCenterPoint();
    }

    updateCenterPoint() {
        // Calculate the middle 25% of the screen in CSS-pixel space
        const marginX = this.canvas.width * 0.375;
        const marginY = this.canvas.height * 0.375;
        
        // Ensure center point is within the middle 25% of the screen
        this.centerX = marginX + Math.random() * (this.canvas.width - 2 * marginX);
        this.centerY = marginY + Math.random() * (this.canvas.height - 2 * marginY);
        
        // Log center point for debugging
        console.log('Center point updated:', {
            centerX: this.centerX,
            centerY: this.centerY,
            screenWidth: this.canvas.width,
            screenHeight: this.canvas.height,
            marginX,
            marginY,
            dpr: window.devicePixelRatio
        });
    }

    setupEventListeners() {
        // Handle both resize and orientation change events
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            // Small delay to ensure new dimensions are available
            setTimeout(() => this.resize(), 100);
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const rawX = e.touches[0].clientX;
            const rawY = e.touches[0].clientY;

            // Map to CSS-pixel space
            const x = (rawX - rect.left);
            const y = (rawY - rect.top);

            this.touchStart = { x, y };
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchStart) return;

            const rect = this.canvas.getBoundingClientRect();
            const rawX = e.touches[0].clientX;
            const rawY = e.touches[0].clientY;

            // Map to CSS-pixel space
            const x = (rawX - rect.left);
            const y = (rawY - rect.top);
            
            // Create slash effect for every swipe
            this.slashEffects.push(new SlashEffect(
                this.touchStart.x,
                this.touchStart.y,
                x,
                y
            ));

            this.checkSlice(
                this.touchStart.x,
                this.touchStart.y,
                x,
                y
            );

            // Update touch start for continuous swipes
            this.touchStart = { x, y };
        });

        this.canvas.addEventListener('touchend', () => {
            this.touchStart = null;
        });

        // Mouse events for desktop testing
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.touchStart = { x, y };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.touchStart) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Create slash effect for every swipe
            this.slashEffects.push(new SlashEffect(
                this.touchStart.x,
                this.touchStart.y,
                x,
                y
            ));

            this.checkSlice(
                this.touchStart.x,
                this.touchStart.y,
                x,
                y
            );

            // Update touch start for continuous swipes
            this.touchStart = { x, y };
        });

        this.canvas.addEventListener('mouseup', () => {
            this.touchStart = null;
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    spawnObject() {
        const now = Date.now();
        if (now - this.lastSpawnTime < this.spawnInterval) return;
        
        this.lastSpawnTime = now;
        // Randomize next spawn time between 3-5 seconds
        this.spawnInterval = this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
        
        // Spawn objects from the edges
        let x, y;
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        // Add some randomness to spawn position along the edge
        const edgeVariation = 0.3; // 30% variation from center of edge
        
        switch(side) {
            case 0: // top
                x = this.canvas.width * (0.5 + (Math.random() - 0.5) * edgeVariation);
                y = -50;
                break;
            case 1: // right
                x = this.canvas.width + 50;
                y = this.canvas.height * (0.5 + (Math.random() - 0.5) * edgeVariation);
                break;
            case 2: // bottom
                x = this.canvas.width * (0.5 + (Math.random() - 0.5) * edgeVariation);
                y = this.canvas.height + 50;
                break;
            case 3: // left
                x = -50;
                y = this.canvas.height * (0.5 + (Math.random() - 0.5) * edgeVariation);
                break;
        }
        
        this.objects.push(new GameObject(x, y, 'orbital', this.speedMultiplier, this.centerX, this.centerY));
    }

    checkSlice(startX, startY, endX, endY) {
        let sliced = false;
        const newObjects = [];
        
        // Play swish sound for the slice motion
        this.soundManager.playSwish();
        
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (!obj.sliced && Date.now() - obj.lastSlicedTime > 200 && this.lineIntersectsObject(startX, startY, endX, endY, obj)) {
                obj.createSliceParticles();
                
                // Create smaller pieces
                const pieces = obj.breakIntoPieces();
                if (pieces && pieces.length > 0) {
                    newObjects.push(...pieces);
                }
                
                // Play squish sound when fruit is hit
                this.soundManager.playSquish();
                sliced = true;
                break;
            }
        }
        
        // Add new pieces to objects array
        if (newObjects.length > 0) {
            this.objects.push(...newObjects);
        }
        
        return sliced;
    }

    lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        const left = rx;
        const right = rx + rw;
        const top = ry;
        const bottom = ry + rh;

        // Check if line intersects with any of the rectangle's edges
        return this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
               this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top);
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
        if (denominator === 0) return false;

        const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
        const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    lineIntersectsObject(x1, y1, x2, y2, obj) {
        const rx = obj.x - obj.width/2;
        const ry = obj.y - obj.height/2;
        const rw = obj.width;
        const rh = obj.height;
        return this.lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh);
    }

    update() {
        // Update center point periodically
        const currentTime = Date.now();
        if (currentTime - this.lastCenterMove >= this.centerMoveInterval) {
            this.updateCenterPoint();
            this.lastCenterMove = currentTime;
        }

        // Update difficulty
        if (currentTime - this.lastDifficultyIncrease >= this.difficultyIncreaseInterval) {
            this.speedMultiplier += 0.2;
            this.lastDifficultyIncrease = currentTime;
            // Don't decrease spawn interval below minimum
            this.minSpawnInterval = Math.max(800, this.minSpawnInterval - 50); // Won't go below 0.8 seconds
            this.maxSpawnInterval = Math.max(1500, this.maxSpawnInterval - 50); // Won't go below 1.5 seconds
        }

        // Update background color every minute
        if (currentTime - this.lastBackgroundChange >= 60000) { // 60000ms = 1 minute
            this.currentColorIndex = (this.currentColorIndex + 1) % this.backgroundColors.length;
            this.lastBackgroundChange = currentTime;
        }

        this.spawnObject();
        
        // Update objects
        this.objects = this.objects.filter(obj => {
            if (obj.isFading && obj.fadeProgress >= 1) {
                return false;
            }
            obj.update();
            return !obj.isOffscreen;
        });

        // Update slash effects
        this.slashEffects = this.slashEffects.filter(effect => {
            effect.update();
            return effect.life > 0;
        });
    }

    draw() {
        // Clear canvas with current background color
        this.ctx.fillStyle = this.backgroundColors[this.currentColorIndex];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw objects
        this.objects.forEach(obj => obj.draw(this.ctx));
        
        // Draw slash effects
        this.slashEffects.forEach(effect => effect.draw(this.ctx));
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads with a delay to ensure proper initialization
window.addEventListener('load', () => setTimeout(() => new Game(), 100)); 