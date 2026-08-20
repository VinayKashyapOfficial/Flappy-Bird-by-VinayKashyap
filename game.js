/**
 * Flappy Bird Arcade Edition - Game Engine
 * Fully responsive fullscreen PC & mobile adaptation
 */

// --- Game Configuration & Settings ---
const CONFIG = {
    baseHeight: 640,
    groundHeight: 90,
    birdRadius: 15,
    difficulties: {
        casual: {
            gravity: 0.28,
            jumpImpulse: -6.5,
            pipeSpeed: 2.0,
            pipeGap: 165,
            pipeSpawnInterval: 120
        },
        classic: {
            gravity: 0.35,
            jumpImpulse: -7.5,
            pipeSpeed: 2.5,
            pipeGap: 135,
            pipeSpawnInterval: 100
        },
        hard: {
            gravity: 0.42,
            jumpImpulse: -8.2,
            pipeSpeed: 3.1,
            pipeGap: 115,
            pipeSpawnInterval: 85
        }
    }
};

// --- Game States ---
const GameState = {
    START: 'START',
    GET_READY: 'GET_READY',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
    PAUSED: 'PAUSED'
};

// --- Bird Skins Definition ---
const SKINS = {
    gold: {
        body: '#f6b93b',
        bodyDark: '#e58e26',
        belly: '#fad390',
        wing: '#f39c12',
        beak: '#e55039',
        eye: '#ffffff',
        pupil: '#2c3e50',
        glow: 'rgba(246, 185, 59, 0.4)',
        particle: '#f6b93b'
    },
    cyber: {
        body: '#00d2d3',
        bodyDark: '#01a3a4',
        belly: '#54a0ff',
        wing: '#5f27cd',
        beak: '#ff9ff3',
        eye: '#ff6b6b',
        pupil: '#ffffff',
        glow: 'rgba(0, 210, 211, 0.6)',
        particle: '#00d2d3'
    },
    crimson: {
        body: '#ee5253',
        bodyDark: '#c0392b',
        belly: '#ff9f43',
        wing: '#ff6b6b',
        beak: '#feca57',
        eye: '#ffffff',
        pupil: '#222f3e',
        glow: 'rgba(238, 82, 83, 0.5)',
        particle: '#ee5253'
    },
    bat: {
        body: '#34495e',
        bodyDark: '#2c3e50',
        belly: '#7f8c8d',
        wing: '#1e272e',
        beak: '#e74c3c',
        eye: '#e74c3c',
        pupil: '#ffffff',
        glow: 'rgba(149, 165, 166, 0.4)',
        particle: '#7f8c8d'
    }
};

// --- Main Game Class ---
class FlappyGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = GameState.START;
        this.difficulty = 'classic';
        this.currentSkin = 'gold';
        
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappy_best_score') || '0', 10);
        
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;
        
        this.worldWidth = 380;
        this.worldHeight = CONFIG.baseHeight;
        this.scale = 1;

        // Entities
        this.bird = null;
        this.pipes = [];
        this.particles = [];
        this.popups = [];
        this.clouds = [];
        this.buildings = [];
        
        this.groundOffset = 0;
        this.frameCount = 0;
        this.prevTimestamp = 0;
        this.previousState = null;

        // UI DOM references
        this.dom = {
            hudScore: document.getElementById('hud-score'),
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            getReadyHint: document.getElementById('get-ready-hint'),
            finalScore: document.getElementById('final-score'),
            bestScore: document.getElementById('best-score'),
            startBestScore: document.getElementById('start-best-score'),
            medalIcon: document.getElementById('medal-icon'),
            medalName: document.getElementById('medal-name'),
            btnStart: document.getElementById('btn-start-game'),
            btnRestart: document.getElementById('btn-restart'),
            btnMenu: document.getElementById('btn-menu'),
            btnResume: document.getElementById('btn-resume'),
            btnPauseMenu: document.getElementById('btn-pause-menu'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            btnSound: document.getElementById('btn-sound'),
            btnMusic: document.getElementById('btn-music'),
            btnPause: document.getElementById('btn-pause'),
            skinBtns: document.querySelectorAll('.skin-btn'),
            diffBtns: document.querySelectorAll('.diff-btn')
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.initScenery();
        this.resetGame();
        this.updateBestScoreDisplay();
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });

        // Kick off requestAnimationFrame loop
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const clientWidth = rect.width > 0 ? rect.width : (window.innerWidth || 380);
        const clientHeight = rect.height > 0 ? rect.height : (window.innerHeight || 640);

        this.canvas.width = clientWidth * dpr;
        this.canvas.height = clientHeight * dpr;

        this.worldHeight = CONFIG.baseHeight;
        this.worldWidth = Math.max(360, (clientWidth / clientHeight) * this.worldHeight);

        this.scale = (this.canvas.height / this.worldHeight);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

        this.initScenery();
    }

    initScenery() {
        // Generate distant clouds distributed across width
        this.clouds = [];
        const cloudCount = Math.max(3, Math.floor(this.worldWidth / 110));
        for (let i = 0; i < cloudCount; i++) {
            this.clouds.push({
                x: (i * (this.worldWidth / cloudCount)) + (Math.random() * 40),
                y: 35 + Math.random() * 110,
                scale: 0.6 + Math.random() * 0.5,
                speed: 0.2 + Math.random() * 0.25
            });
        }

        // Generate city skyline silhouettes
        this.buildings = [];
        let currX = 0;
        while (currX < this.worldWidth + 120) {
            const width = 30 + Math.random() * 36;
            const height = 45 + Math.random() * 80;
            this.buildings.push({
                x: currX,
                width: width,
                height: height,
                windows: Math.random() > 0.3
            });
            currX += width + (Math.random() * 10);
        }
    }

    setupEventListeners() {
        // Jump triggers
        const triggerJump = (e) => {
            if (e) e.preventDefault();
            this.handlePlayerAction();
        };

        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                triggerJump(e);
            } else if (e.code === 'KeyP' || e.code === 'Escape') {
                this.togglePause();
            } else if (e.code === 'KeyF') {
                this.toggleFullscreen();
            }
        });

        // Touch & Click inputs
        this.canvas.addEventListener('pointerdown', (e) => {
            triggerJump(e);
        });

        // UI Buttons
        this.dom.btnStart.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.setGameState(GameState.GET_READY);
        });

        this.dom.btnRestart.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.resetGame();
            this.setGameState(GameState.GET_READY);
        });

        this.dom.btnMenu.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.resetGame();
            this.setGameState(GameState.START);
        });

        this.dom.btnResume.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.togglePause();
        });

        this.dom.btnPauseMenu.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.resetGame();
            this.setGameState(GameState.START);
        });

        this.dom.btnPause.addEventListener('click', () => {
            this.togglePause();
        });

        if (this.dom.btnFullscreen) {
            this.dom.btnFullscreen.addEventListener('click', () => {
                this.toggleFullscreen();
                window.soundEngine.playClick();
            });
        }

        document.addEventListener('fullscreenchange', () => {
            if (this.dom.btnFullscreen) {
                this.dom.btnFullscreen.textContent = document.fullscreenElement ? '🗗' : '⛶';
            }
            setTimeout(() => this.setupCanvas(), 100);
        });

        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.soundEngine.toggleSound();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
            window.soundEngine.playClick();
        });

        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.soundEngine.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🎼';
            window.soundEngine.playClick();
        });

        // Skin Selector Buttons
        this.dom.skinBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skin = btn.dataset.skin;
                if (skin && SKINS[skin]) {
                    this.currentSkin = skin;
                    this.dom.skinBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    window.soundEngine.playClick();
                }
            });
        });

        // Difficulty Buttons
        this.dom.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const diff = btn.dataset.diff;
                if (diff && CONFIG.difficulties[diff]) {
                    this.difficulty = diff;
                    this.dom.diffBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    window.soundEngine.playClick();
                }
            });
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    handlePlayerAction() {
        if (this.state === GameState.START) {
            this.setGameState(GameState.GET_READY);
            window.soundEngine.playClick();
        } else if (this.state === GameState.GET_READY) {
            this.setGameState(GameState.PLAYING);
            this.bird.flap();
        } else if (this.state === GameState.PLAYING) {
            this.bird.flap();
        } else if (this.state === GameState.GAME_OVER) {
            if (this.gameOverTime && Date.now() - this.gameOverTime > 400) {
                this.resetGame();
                this.setGameState(GameState.GET_READY);
            }
        }
    }

    setGameState(newState) {
        this.state = newState;

        this.dom.startScreen.classList.toggle('active', newState === GameState.START);
        this.dom.getReadyHint.classList.toggle('active', newState === GameState.GET_READY);
        this.dom.gameOverScreen.classList.toggle('active', newState === GameState.GAME_OVER);
        this.dom.pauseScreen.classList.toggle('active', newState === GameState.PAUSED);

        if (newState === GameState.PLAYING) {
            window.soundEngine.startBGM();
        } else if (newState === GameState.GAME_OVER) {
            this.gameOverTime = Date.now();
            this.handleGameOver();
        }
    }

    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.previousState = GameState.PLAYING;
            this.setGameState(GameState.PAUSED);
        } else if (this.state === GameState.PAUSED) {
            this.setGameState(this.previousState || GameState.PLAYING);
        }
    }

    resetGame() {
        const diffConfig = CONFIG.difficulties[this.difficulty];
        const birdX = Math.min(this.worldWidth * 0.25, 200);
        this.bird = new Bird(birdX, this.worldHeight * 0.44, diffConfig);
        this.pipes = [];
        this.particles = [];
        this.popups = [];
        this.score = 0;
        this.frameCount = 0;
        this.shakeTimer = 0;
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        this.dom.hudScore.textContent = this.score;
        this.dom.hudScore.classList.remove('score-pop');
        void this.dom.hudScore.offsetWidth;
        this.dom.hudScore.classList.add('score-pop');
    }

    updateBestScoreDisplay() {
        this.dom.startBestScore.textContent = this.bestScore;
        this.dom.bestScore.textContent = this.bestScore;
    }

    handleGameOver() {
        window.soundEngine.playHit();
        setTimeout(() => window.soundEngine.playDie(), 120);

        this.shakeTimer = 18;
        this.shakeMagnitude = 8;

        for (let i = 0; i < 22; i++) {
            this.particles.push(new Particle(
                this.bird.x,
                this.bird.y,
                SKINS[this.currentSkin].particle,
                'explosion'
            ));
        }

        const isNewBest = this.score > this.bestScore;
        if (isNewBest) {
            this.bestScore = this.score;
            localStorage.setItem('flappy_best_score', this.bestScore.toString());
            this.updateBestScoreDisplay();
        }

        this.dom.finalScore.textContent = this.score;
        this.dom.bestScore.textContent = this.bestScore;

        let medal = { icon: '🌱', name: 'Rookie' };
        if (this.score >= 50) {
            medal = { icon: '💎', name: 'Platinum Master' };
            window.soundEngine.playMedal();
        } else if (this.score >= 25) {
            medal = { icon: '🥇', name: 'Gold Champion' };
            window.soundEngine.playMedal();
        } else if (this.score >= 10) {
            medal = { icon: '🥈', name: 'Silver Ace' };
            window.soundEngine.playMedal();
        } else if (this.score >= 5) {
            medal = { icon: '🥉', name: 'Bronze Flyer' };
        }

        this.dom.medalIcon.textContent = medal.icon;
        this.dom.medalName.textContent = medal.name;
    }

    spawnPipe() {
        const diffConfig = CONFIG.difficulties[this.difficulty];
        const minTop = 60;
        const maxTop = this.worldHeight - CONFIG.groundHeight - diffConfig.pipeGap - 60;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop)) + minTop;

        this.pipes.push(new PipePair(
            this.worldWidth + 30,
            topHeight,
            diffConfig.pipeGap,
            diffConfig.pipeSpeed,
            this.worldHeight
        ));
    }

    gameLoop(timestamp) {
        if (!this.prevTimestamp) this.prevTimestamp = timestamp;
        const deltaTime = Math.min((timestamp - this.prevTimestamp) / 1000, 0.1);
        this.prevTimestamp = timestamp;

        if (this.state !== GameState.PAUSED) {
            this.update(deltaTime);
        }
        
        this.render();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(deltaTime) {
        const diffConfig = CONFIG.difficulties[this.difficulty];
        this.frameCount++;

        if (this.shakeTimer > 0) {
            this.shakeTimer--;
        }

        // Update Scenery
        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x < -100) c.x = this.worldWidth + 60;
        });

        if (this.state === GameState.PLAYING || this.state === GameState.GET_READY || this.state === GameState.START) {
            this.groundOffset = (this.groundOffset + (this.state === GameState.PLAYING ? diffConfig.pipeSpeed : 1.2)) % 24;
        }

        // Update Bird
        if (this.bird) {
            this.bird.update(this.state);
        }

        // Update Gameplay
        if (this.state === GameState.PLAYING) {
            if (this.frameCount % diffConfig.pipeSpawnInterval === 0) {
                this.spawnPipe();
            }

            for (let i = this.pipes.length - 1; i >= 0; i--) {
                const pipe = this.pipes[i];
                pipe.update();

                // Check Score
                if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                    pipe.passed = true;
                    this.score++;
                    this.updateScoreDisplay();
                    window.soundEngine.playScore();

                    for (let s = 0; s < 8; s++) {
                        this.particles.push(new Particle(
                            pipe.x + pipe.width / 2,
                            pipe.gapY + pipe.gap / 2,
                            '#f9ca24',
                            'sparkle'
                        ));
                    }
                    this.popups.push(new ScorePopup(this.bird.x, this.bird.y - 15, '+1'));
                }

                // Check Collision with pipes
                if (pipe.collidesWith(this.bird, this.worldHeight)) {
                    this.setGameState(GameState.GAME_OVER);
                    return;
                }

                // Remove off-screen pipes
                if (pipe.x + pipe.width < -60) {
                    this.pipes.splice(i, 1);
                }
            }

            // Check Ground / Ceiling Collision
            const floorY = this.worldHeight - CONFIG.groundHeight;
            if (this.bird.y + this.bird.radius >= floorY) {
                this.bird.y = floorY - this.bird.radius;
                this.setGameState(GameState.GAME_OVER);
                return;
            }
            if (this.bird.y - this.bird.radius <= 0) {
                this.bird.y = this.bird.radius;
                this.bird.vy = 0;
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Score Popups
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const pop = this.popups[i];
            pop.update();
            if (pop.life <= 0) this.popups.splice(i, 1);
        }
    }

    render() {
        this.ctx.save();

        if (this.shakeTimer > 0) {
            const rx = (Math.random() - 0.5) * this.shakeMagnitude;
            const ry = (Math.random() - 0.5) * this.shakeMagnitude;
            this.ctx.translate(rx, ry);
        }

        // 1. Sky Gradient
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.worldHeight - CONFIG.groundHeight);
        skyGrad.addColorStop(0, '#4ec0ca');
        skyGrad.addColorStop(0.65, '#8be4ea');
        skyGrad.addColorStop(1, '#d5f5f6');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

        // 2. Sun
        this.ctx.fillStyle = 'rgba(255, 255, 230, 0.85)';
        this.ctx.beginPath();
        this.ctx.arc(this.worldWidth - 80, 70, 32, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.beginPath();
        this.ctx.arc(this.worldWidth - 80, 70, 48, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Parallax Clouds
        this.drawClouds();

        // 4. Distant Skyline
        this.drawBuildings();

        // 5. Pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx, this.worldHeight));

        // 6. Particles Behind Bird
        this.particles.forEach(p => p.draw(this.ctx));

        // 7. Bird
        if (this.bird) {
            this.bird.draw(this.ctx, SKINS[this.currentSkin]);
        }

        // 8. Ground
        this.drawGround();

        // 9. Popups
        this.popups.forEach(pop => pop.draw(this.ctx));

        this.ctx.restore();
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        this.clouds.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.scale(c.scale, c.scale);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 22, 0, Math.PI * 2);
            this.ctx.arc(20, -8, 26, 0, Math.PI * 2);
            this.ctx.arc(42, 0, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawBuildings() {
        const groundY = this.worldHeight - CONFIG.groundHeight;
        this.ctx.fillStyle = 'rgba(84, 160, 255, 0.35)';
        this.buildings.forEach(b => {
            this.ctx.fillRect(b.x, groundY - b.height, b.width, b.height);
            if (b.windows) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                for (let wy = groundY - b.height + 10; wy < groundY - 10; wy += 12) {
                    for (let wx = b.x + 6; wx < b.x + b.width - 6; wx += 8) {
                        this.ctx.fillRect(wx, wy, 3, 5);
                    }
                }
                this.ctx.fillStyle = 'rgba(84, 160, 255, 0.35)';
            }
        });
    }

    drawGround() {
        const gy = this.worldHeight - CONFIG.groundHeight;
        
        // Ground base
        this.ctx.fillStyle = '#ded895';
        this.ctx.fillRect(0, gy, this.worldWidth, CONFIG.groundHeight);

        // Grass top strip
        this.ctx.fillStyle = '#73bf2e';
        this.ctx.fillRect(0, gy, this.worldWidth, 14);

        // Grass dark border
        this.ctx.fillStyle = '#558d22';
        this.ctx.fillRect(0, gy + 12, this.worldWidth, 3);

        // Diagonal ground texture stripes
        this.ctx.fillStyle = '#c8bc71';
        this.ctx.save();
        this.ctx.beginPath();
        for (let x = -24 + this.groundOffset; x < this.worldWidth + 24; x += 20) {
            this.ctx.moveTo(x, gy + 16);
            this.ctx.lineTo(x + 12, gy + CONFIG.groundHeight);
            this.ctx.lineTo(x + 18, gy + CONFIG.groundHeight);
            this.ctx.lineTo(x + 6, gy + 16);
        }
        this.ctx.fill();
        this.ctx.restore();
    }
}

// --- Bird Entity ---
class Bird {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.radius = CONFIG.birdRadius;
        this.config = config;
        this.angle = 0;
        this.wingTimer = 0;
        this.wingOffset = 0;
    }

    flap() {
        this.vy = this.config.jumpImpulse;
        window.soundEngine.playFlap();

        if (window.gameInstance) {
            for (let i = 0; i < 3; i++) {
                window.gameInstance.particles.push(new Particle(
                    this.x - 10,
                    this.y + 4,
                    SKINS[window.gameInstance.currentSkin].particle,
                    'feather'
                ));
            }
        }
    }

    update(state) {
        this.wingTimer += 0.22;
        this.wingOffset = Math.sin(this.wingTimer) * 5;

        if (state === GameState.PLAYING) {
            this.vy += this.config.gravity;
            this.y += this.vy;

            const targetAngle = Math.min(Math.PI / 2.2, Math.max(-Math.PI / 5, this.vy * 0.08));
            this.angle += (targetAngle - this.angle) * 0.2;
        } else if (state === GameState.GET_READY || state === GameState.START) {
            this.y += Math.sin(this.wingTimer * 0.8) * 0.8;
            this.angle = 0;
            this.vy = 0;
        }
    }

    draw(ctx, skin) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.shadowColor = skin.glow;
        ctx.shadowBlur = 10;

        // 1. Bird Body
        ctx.fillStyle = skin.body;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius + 3, this.radius - 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body shading/highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = skin.bodyDark;
        ctx.beginPath();
        ctx.ellipse(0, 4, this.radius, this.radius - 6, 0, 0, Math.PI);
        ctx.fill();

        // Belly
        ctx.fillStyle = skin.belly;
        ctx.beginPath();
        ctx.ellipse(-3, 3, this.radius - 4, this.radius - 6, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Bird Wing
        ctx.fillStyle = skin.wing;
        ctx.beginPath();
        ctx.ellipse(-6, 1 + this.wingOffset, 7, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = skin.bodyDark;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. Eye
        ctx.fillStyle = skin.eye;
        ctx.beginPath();
        ctx.arc(6, -5, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222f3e';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = skin.pupil;
        ctx.beginPath();
        ctx.arc(7.5, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8.5, -6.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Beak
        ctx.fillStyle = skin.beak;
        ctx.beginPath();
        ctx.moveTo(9, -2);
        ctx.lineTo(19, 1);
        ctx.lineTo(9, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#b33928';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

// --- Pipe Pair Entity ---
class PipePair {
    constructor(x, topHeight, gap, speed, worldHeight = 640) {
        this.x = x;
        this.topHeight = topHeight;
        this.gap = gap;
        this.speed = speed;
        this.width = 54;
        this.capHeight = 24;
        this.capOverhang = 4;
        this.passed = false;
        this.gapY = topHeight;
        this.worldHeight = worldHeight;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx, worldHeight) {
        const wh = worldHeight || this.worldHeight || 640;
        const bottomY = this.topHeight + this.gap;
        const groundY = wh - CONFIG.groundHeight;
        const bottomHeight = groundY - bottomY;

        this.drawPipe(ctx, this.x, 0, this.width, this.topHeight, true);
        this.drawPipe(ctx, this.x, bottomY, this.width, bottomHeight, false);
    }

    drawPipe(ctx, x, y, width, height, isTop) {
        if (height <= 0) return;

        ctx.save();

        const pipeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
        pipeGrad.addColorStop(0, '#559c2a');
        pipeGrad.addColorStop(0.2, '#73bf2e');
        pipeGrad.addColorStop(0.5, '#a4e857');
        pipeGrad.addColorStop(0.8, '#73bf2e');
        pipeGrad.addColorStop(1, '#3d721e');

        ctx.fillStyle = pipeGrad;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#2b5214';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, width, height);

        const capX = x - this.capOverhang;
        const capW = width + this.capOverhang * 2;
        const capY = isTop ? y + height - this.capHeight : y;

        const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
        capGrad.addColorStop(0, '#559c2a');
        capGrad.addColorStop(0.25, '#73bf2e');
        capGrad.addColorStop(0.5, '#b9f46e');
        capGrad.addColorStop(0.8, '#73bf2e');
        capGrad.addColorStop(1, '#2b5214');

        ctx.fillStyle = capGrad;
        ctx.fillRect(capX, capY, capW, this.capHeight);
        ctx.strokeRect(capX, capY, capW, this.capHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 8, y, 5, height);
        ctx.fillRect(capX + 8, capY, 6, this.capHeight);

        ctx.restore();
    }

    collidesWith(bird, worldHeight) {
        const wh = worldHeight || this.worldHeight || 640;
        const bx = bird.x;
        const by = bird.y;
        const r = bird.radius - 2;

        const topBox = {
            x: this.x - this.capOverhang,
            y: 0,
            w: this.width + this.capOverhang * 2,
            h: this.topHeight
        };

        const bottomBox = {
            x: this.x - this.capOverhang,
            y: this.topHeight + this.gap,
            w: this.width + this.capOverhang * 2,
            h: wh - (this.topHeight + this.gap)
        };

        return this.circleRectCollision(bx, by, r, topBox) ||
               this.circleRectCollision(bx, by, r, bottomBox);
    }

    circleRectCollision(cx, cy, radius, rect) {
        const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) < (radius * radius);
    }
}

// --- Particle Entity ---
class Particle {
    constructor(x, y, color, type = 'sparkle') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.life = 1.0;

        if (type === 'feather') {
            this.vx = (Math.random() - 0.7) * 2;
            this.vy = (Math.random() - 0.2) * 2.5;
            this.size = Math.random() * 4 + 3;
            this.decay = Math.random() * 0.04 + 0.03;
        } else if (type === 'explosion') {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 5 + 1.5;
            this.vx = Math.cos(angle) * spd;
            this.vy = Math.sin(angle) * spd;
            this.size = Math.random() * 5 + 3;
            this.decay = Math.random() * 0.03 + 0.02;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 0.8;
            this.vx = Math.cos(angle) * spd;
            this.vy = Math.sin(angle) * spd;
            this.size = Math.random() * 4 + 2;
            this.decay = Math.random() * 0.04 + 0.03;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Floating Score Popup Entity ---
class ScorePopup {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.life = 1.0;
    }

    update() {
        this.y -= 1.2;
        this.life -= 0.025;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = 'bold 20px Fredoka, sans-serif';
        ctx.fillStyle = '#f9ca24';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Instantiate Game on Page Load
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new FlappyGame();
});
