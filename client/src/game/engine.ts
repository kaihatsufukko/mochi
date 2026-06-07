/**
 * 橋上怪獣防衛隊 - Bridge Kaiju Defender
 * Neo-16bit style vertical scrolling defense shooter
 * 
 * Design: Modern pixel art revival with particle effects,
 * dark teal background, neon orange/cyan accents
 */

import { audio } from './audio';

// ===== TYPES =====
interface Bullet {
  x: number;
  y: number;
  speed: number;
  damage: number;
  active: boolean;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: 'zombie' | 'runner' | 'shield' | 'boss';
  width: number;
  height: number;
  active: boolean;
  hitFlash: number;
  animFrame: number;
  animTimer: number;
}

interface Gate {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'add_soldier' | 'remove_soldier' | 'power_up';
  value: number;
  label: string;
  active: boolean;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  size: number;
}

interface KaijuState {
  gauge: number;
  maxGauge: number;
  attacking: boolean;
  attackTimer: number;
  attackDuration: number;
  bobOffset: number;
  bobTimer: number;
}

type GameState = 'title' | 'playing' | 'gameover' | 'victory';

interface PlayerState {
  x: number;
  soldiers: number;
  power: number;
  hp: number;
  maxHp: number;
  fireRate: number;
  fireTimer: number;
  speed: number;
}

interface StageConfig {
  duration: number;
  waves: WaveConfig[];
  gates: GateConfig[];
  bossTime: number;
}

interface WaveConfig {
  time: number;
  type: 'zombie' | 'runner' | 'shield' | 'boss';
  count: number;
  interval: number;
}

interface GateConfig {
  time: number;
  leftType: 'add_soldier' | 'remove_soldier' | 'power_up';
  leftValue: number;
  leftLabel: string;
  rightType: 'add_soldier' | 'remove_soldier' | 'power_up';
  rightValue: number;
  rightLabel: string;
}

// ===== CONSTANTS =====
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const PLAYER_Y = GAME_HEIGHT - 80;
const DEFENSE_LINE_Y = GAME_HEIGHT - 50;
const BULLET_SPEED = 8;
const PLAYER_SPEED = 4;

// Colors - Neo 16bit palette
const COLORS = {
  bg: '#0a1628',
  bridge: '#1a2a3a',
  bridgeLight: '#2a3a4a',
  player: '#00e5ff',
  playerGlow: '#00b8d4',
  bullet: '#ffab00',
  bulletGlow: '#ff6d00',
  enemy: '#76ff03',
  enemyDark: '#33691e',
  boss: '#ff1744',
  bossDark: '#b71c1c',
  shield: '#7c4dff',
  runner: '#ffea00',
  gate: '#ffd600',
  gateGood: '#00e676',
  gateBad: '#ff5252',
  gatePower: '#ffab00',
  kaiju: '#ff6d00',
  kaijuGlow: '#ff9100',
  hud: '#e0e0e0',
  hudAccent: '#00e5ff',
  particle: '#ffab00',
  explosion: '#ff6d00',
};

// ===== STAGE DATA =====
const STAGE_1: StageConfig = {
  duration: 120,
  waves: [
    { time: 3, type: 'zombie', count: 5, interval: 0.8 },
    { time: 12, type: 'zombie', count: 8, interval: 0.5 },
    { time: 25, type: 'zombie', count: 10, interval: 0.4 },
    { time: 38, type: 'runner', count: 3, interval: 1.0 },
    { time: 48, type: 'zombie', count: 12, interval: 0.3 },
    { time: 55, type: 'runner', count: 5, interval: 0.6 },
    { time: 65, type: 'zombie', count: 15, interval: 0.25 },
    { time: 72, type: 'shield', count: 3, interval: 1.5 },
    { time: 80, type: 'zombie', count: 20, interval: 0.2 },
    { time: 85, type: 'runner', count: 8, interval: 0.4 },
    { time: 95, type: 'zombie', count: 25, interval: 0.15 },
    { time: 100, type: 'boss', count: 1, interval: 0 },
  ],
  gates: [
    { time: 15, leftType: 'add_soldier', leftValue: 1, leftLabel: '+1 兵士', rightType: 'power_up', rightValue: 1, rightLabel: '攻撃力 UP' },
    { time: 35, leftType: 'add_soldier', leftValue: 2, leftLabel: '+2 兵士', rightType: 'remove_soldier', rightValue: 1, rightLabel: '-1 兵士' },
    { time: 55, leftType: 'power_up', leftValue: 2, leftLabel: '攻撃力 x2', rightType: 'add_soldier', rightValue: 1, rightLabel: '+1 兵士' },
    { time: 75, leftType: 'add_soldier', leftValue: 3, leftLabel: '+3 兵士', rightType: 'power_up', rightValue: 3, rightLabel: '攻撃力 x3' },
  ],
  bossTime: 100,
};

// ===== GAME ENGINE CLASS =====
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private lastTime: number = 0;
  private scale: number = 1;

  // Game state
  private state: GameState = 'title';
  private stageTime: number = 0;
  private score: number = 0;
  private enemiesKilled: number = 0;

  // Player
  private player: PlayerState = {
    x: GAME_WIDTH / 2,
    soldiers: 2,
    power: 1,
    hp: 3,
    maxHp: 3,
    fireRate: 0.4,
    fireTimer: 0,
    speed: PLAYER_SPEED,
  };

  // Entities
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private gates: Gate[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Kaiju
  private kaiju: KaijuState = {
    gauge: 0,
    maxGauge: 100,
    attacking: false,
    attackTimer: 0,
    attackDuration: 1.5,
    bobOffset: 0,
    bobTimer: 0,
  };

  // Input
  private keys: Set<string> = new Set();
  private touchX: number | null = null;

  // Stage management
  private stage: StageConfig = STAGE_1;
  private waveIndex: number = 0;
  private gateIndex: number = 0;
  private spawnTimers: { type: string; count: number; interval: number; timer: number }[] = [];

  // Visual
  private screenShake: number = 0;
  private bgScrollY: number = 0;
  private titleBlink: number = 0;
  private kaijuImageLoaded: boolean = false;
  private kaijuImage: HTMLImageElement | null = null;
  private bgImage: HTMLImageElement | null = null;
  private bgImageLoaded: boolean = false;
  private titleBgImage: HTMLImageElement | null = null;
  private titleBgImageLoaded: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    // Load kaiju image
    this.kaijuImage = new Image();
    this.kaijuImage.onload = () => { this.kaijuImageLoaded = true; };
    this.kaijuImage.src = 'https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/BPGgETx4h5Z9YqkYrUPQtf/kaiju-ally-VwUGurT3DbH4agtXTvjhD4.webp';

    // Load background image
    this.bgImage = new Image();
    this.bgImage.onload = () => { this.bgImageLoaded = true; };
    this.bgImage.src = 'https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/BPGgETx4h5Z9YqkYrUPQtf/game-bg-SLEXRi3sVepP8iyQH5HtdP.webp';

    // Load title background
    this.titleBgImage = new Image();
    this.titleBgImage.onload = () => { this.titleBgImageLoaded = true; };
    this.titleBgImage.src = 'https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/BPGgETx4h5Z9YqkYrUPQtf/title-bg-AoDABCpdrHJZngzmE7FeVd.webp';

    this.setupInput();
    this.resize();
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      audio.init();
      if (this.state === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        this.startGame();
      }
      if (this.state === 'playing' && e.key === ' ') {
        this.activateKaiju();
      }
      if ((this.state === 'gameover' || this.state === 'victory') && (e.key === 'Enter' || e.key === ' ')) {
        this.state = 'title';
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    // Touch/mouse controls
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      audio.init();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale;
      const y = (touch.clientY - rect.top) / this.scale;

      if (this.state === 'title') {
        this.startGame();
        return;
      }
      if (this.state === 'gameover' || this.state === 'victory') {
        this.state = 'title';
        return;
      }

      // Check if kaiju button pressed
      if (x > GAME_WIDTH - 80 && y > GAME_HEIGHT - 80) {
        this.activateKaiju();
        return;
      }

      this.touchX = x;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchX = (touch.clientX - rect.left) / this.scale;
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchX = null;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      audio.init();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale;
      const y = (e.clientY - rect.top) / this.scale;

      if (this.state === 'title') {
        this.startGame();
        return;
      }
      if (this.state === 'gameover' || this.state === 'victory') {
        this.state = 'title';
        return;
      }

      if (x > GAME_WIDTH - 80 && y > GAME_HEIGHT - 80) {
        this.activateKaiju();
        return;
      }
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const parentW = parent.clientWidth;
    const parentH = parent.clientHeight;
    const gameAspect = GAME_WIDTH / GAME_HEIGHT;
    const parentAspect = parentW / parentH;

    if (parentAspect > gameAspect) {
      this.scale = parentH / GAME_HEIGHT;
    } else {
      this.scale = parentW / GAME_WIDTH;
    }

    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.canvas.style.width = `${GAME_WIDTH * this.scale}px`;
    this.canvas.style.height = `${GAME_HEIGHT * this.scale}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  private startGame() {
    this.state = 'playing';
    audio.startGame();
    this.stageTime = 0;
    this.score = 0;
    this.enemiesKilled = 0;
    this.waveIndex = 0;
    this.gateIndex = 0;
    this.spawnTimers = [];
    this.bullets = [];
    this.enemies = [];
    this.gates = [];
    this.particles = [];
    this.floatingTexts = [];
    this.player = {
      x: GAME_WIDTH / 2,
      soldiers: 2,
      power: 1,
      hp: 3,
      maxHp: 3,
      fireRate: 0.4,
      fireTimer: 0,
      speed: PLAYER_SPEED,
    };
    this.kaiju = {
      gauge: 0,
      maxGauge: 100,
      attacking: false,
      attackTimer: 0,
      attackDuration: 1.5,
      bobOffset: 0,
      bobTimer: 0,
    };
    this.screenShake = 0;
  }

  private activateKaiju() {
    if (this.kaiju.gauge >= this.kaiju.maxGauge && !this.kaiju.attacking) {
      this.kaiju.attacking = true;
      this.kaiju.attackTimer = 0;
      this.kaiju.gauge = 0;
      this.screenShake = 15;
      audio.kaijuAttack();

      // Damage all enemies on screen
      for (const enemy of this.enemies) {
        if (enemy.active) {
          const damage = 20;
          enemy.hp -= damage;
          enemy.hitFlash = 0.3;
          this.spawnParticles(enemy.x, enemy.y, 10, COLORS.kaiju);
          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          }
        }
      }

      this.addFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2, '火炎放射！', COLORS.kaiju, 32);
    }
  }

  private killEnemy(enemy: Enemy) {
    enemy.active = false;
    this.enemiesKilled++;
    audio.enemyDie();
    const points = enemy.type === 'boss' ? 500 : enemy.type === 'shield' ? 30 : enemy.type === 'runner' ? 20 : 10;
    this.score += points;
    this.kaiju.gauge = Math.min(this.kaiju.gauge + 5, this.kaiju.maxGauge);
    this.spawnParticles(enemy.x, enemy.y, 8, COLORS.explosion);
    this.addFloatingText(enemy.x, enemy.y, `+${points}`, COLORS.particle, 14);
  }

  private spawnParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, size: number = 16) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.5,
      maxLife: 1.5,
      vy: -1.5,
      size,
    });
  }

  // ===== UPDATE =====
  private update(dt: number) {
    if (this.state !== 'playing') {
      this.titleBlink += dt;
      return;
    }

    this.stageTime += dt;
    this.bgScrollY += dt * 30;

    // Update player
    this.updatePlayer(dt);

    // Spawn waves
    this.updateWaves(dt);

    // Spawn gates
    this.updateGateSpawns();

    // Update bullets
    this.updateBullets(dt);

    // Update enemies
    this.updateEnemies(dt);

    // Update gates
    this.updateGates(dt);

    // Update kaiju
    this.updateKaiju(dt);

    // Update particles
    this.updateParticles(dt);

    // Update floating texts
    this.updateFloatingTexts(dt);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dt * 30;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    // Victory check
    if (this.stageTime >= this.stage.duration && this.enemies.filter(e => e.active).length === 0) {
      this.state = 'victory';
      audio.victory();
    }
  }

  private updatePlayer(dt: number) {
    // Movement
    let moveDir = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) moveDir -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) moveDir += 1;

    // Touch movement
    if (this.touchX !== null) {
      const diff = this.touchX - this.player.x;
      if (Math.abs(diff) > 5) {
        moveDir = diff > 0 ? 1 : -1;
      }
    }

    this.player.x += moveDir * this.player.speed;
    this.player.x = Math.max(30, Math.min(GAME_WIDTH - 30, this.player.x));

    // Auto-fire
    this.player.fireTimer -= dt;
    if (this.player.fireTimer <= 0) {
      this.player.fireTimer = this.player.fireRate;
      this.fireBullets();
    }
  }

  private fireBullets() {
    const soldierSpacing = 20;
    const startX = this.player.x - ((this.player.soldiers - 1) * soldierSpacing) / 2;

    for (let i = 0; i < this.player.soldiers; i++) {
      const bx = startX + i * soldierSpacing;
      this.bullets.push({
        x: bx,
        y: PLAYER_Y - 10,
        speed: BULLET_SPEED,
        damage: this.player.power,
        active: true,
      });
      // Muzzle flash particle
      this.spawnParticles(bx, PLAYER_Y - 15, 2, COLORS.bulletGlow);
    }
    audio.shoot();
  }

  private updateWaves(dt: number) {
    // Check for new waves to start
    while (this.waveIndex < this.stage.waves.length) {
      const wave = this.stage.waves[this.waveIndex];
      if (this.stageTime >= wave.time) {
        this.spawnTimers.push({
          type: wave.type,
          count: wave.count,
          interval: wave.interval,
          timer: 0,
        });
        this.waveIndex++;
      } else {
        break;
      }
    }

    // Process spawn timers
    for (let i = this.spawnTimers.length - 1; i >= 0; i--) {
      const timer = this.spawnTimers[i];
      timer.timer -= dt;
      if (timer.timer <= 0 && timer.count > 0) {
        this.spawnEnemy(timer.type as Enemy['type']);
        timer.count--;
        timer.timer = timer.interval;
      }
      if (timer.count <= 0) {
        this.spawnTimers.splice(i, 1);
      }
    }
  }

  private spawnEnemy(type: Enemy['type']) {
    const x = 40 + Math.random() * (GAME_WIDTH - 80);
    let hp = 1, speed = 1, width = 16, height = 16;

    switch (type) {
      case 'zombie':
        hp = 1; speed = 0.6 + Math.random() * 0.3; width = 16; height = 16;
        break;
      case 'runner':
        hp = 1; speed = 1.5 + Math.random() * 0.5; width = 14; height = 14;
        break;
      case 'shield':
        hp = 5; speed = 0.4; width = 20; height = 20;
        break;
      case 'boss':
        hp = 40; speed = 0.3; width = 48; height = 48;
        break;
    }

    this.enemies.push({
      x,
      y: -height,
      hp,
      maxHp: hp,
      speed,
      type,
      width,
      height,
      active: true,
      hitFlash: 0,
      animFrame: 0,
      animTimer: 0,
    });

    if (type === 'boss') {
      this.addFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'WARNING!', COLORS.boss, 28);
      this.screenShake = 10;
      audio.bossWarning();
    }
  }

  private updateGateSpawns() {
    while (this.gateIndex < this.stage.gates.length) {
      const gc = this.stage.gates[this.gateIndex];
      if (this.stageTime >= gc.time) {
        // Spawn left gate
        this.gates.push({
          x: GAME_WIDTH * 0.25,
          y: -40,
          width: 70,
          height: 36,
          type: gc.leftType,
          value: gc.leftValue,
          label: gc.leftLabel,
          active: true,
          passed: false,
        });
        // Spawn right gate
        this.gates.push({
          x: GAME_WIDTH * 0.75,
          y: -40,
          width: 70,
          height: 36,
          type: gc.rightType,
          value: gc.rightValue,
          label: gc.rightLabel,
          active: true,
          passed: false,
        });
        this.gateIndex++;
      } else {
        break;
      }
    }
  }

  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      bullet.y -= bullet.speed;
      if (bullet.y < -10) {
        bullet.active = false;
        continue;
      }

      // Check collision with enemies
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        if (this.checkCollision(bullet.x - 2, bullet.y - 4, 4, 8, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height)) {
          bullet.active = false;
          enemy.hp -= bullet.damage;
          enemy.hitFlash = 0.1;
          this.spawnParticles(bullet.x, bullet.y, 3, COLORS.particle);
          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          }
          break;
        }
      }
    }

    // Cleanup
    this.bullets = this.bullets.filter(b => b.active);
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.y += enemy.speed;
      enemy.animTimer += dt;
      if (enemy.animTimer > 0.2) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % 4;
      }
      if (enemy.hitFlash > 0) enemy.hitFlash -= dt;

      // Reached defense line
      if (enemy.y > DEFENSE_LINE_Y) {
        enemy.active = false;
        this.player.hp--;
        this.screenShake = 8;
        this.spawnParticles(enemy.x, DEFENSE_LINE_Y, 5, COLORS.boss);
        audio.playerHit();
        if (this.player.hp <= 0) {
          this.state = 'gameover';
          audio.gameOver();
        }
      }
    }

    this.enemies = this.enemies.filter(e => e.active);
  }

  private updateGates(dt: number) {
    for (const gate of this.gates) {
      if (!gate.active) continue;
      gate.y += 1.2;

      // Check if player passes through
      if (!gate.passed && gate.y > PLAYER_Y - 20 && gate.y < PLAYER_Y + 20) {
        if (Math.abs(this.player.x - gate.x) < gate.width / 2 + 15) {
          gate.passed = true;
          this.applyGateEffect(gate);
        }
      }

      if (gate.y > GAME_HEIGHT + 50) {
        gate.active = false;
      }
    }

    this.gates = this.gates.filter(g => g.active);
  }

  private applyGateEffect(gate: Gate) {
    switch (gate.type) {
      case 'add_soldier':
        this.player.soldiers = Math.min(this.player.soldiers + gate.value, 7);
        this.addFloatingText(this.player.x, PLAYER_Y - 30, gate.label, COLORS.gateGood, 20);
        this.spawnParticles(this.player.x, PLAYER_Y, 10, COLORS.gateGood);
        audio.gateGood();
        break;
      case 'remove_soldier':
        this.player.soldiers = Math.max(this.player.soldiers - gate.value, 1);
        this.addFloatingText(this.player.x, PLAYER_Y - 30, gate.label, COLORS.gateBad, 20);
        this.screenShake = 5;
        audio.gateBad();
        break;
      case 'power_up':
        this.player.power += gate.value;
        this.addFloatingText(this.player.x, PLAYER_Y - 30, gate.label, COLORS.gatePower, 20);
        this.spawnParticles(this.player.x, PLAYER_Y, 10, COLORS.gatePower);
        audio.gateGood();
        break;
    }
  }

  private updateKaiju(dt: number) {
    this.kaiju.bobTimer += dt * 2;
    this.kaiju.bobOffset = Math.sin(this.kaiju.bobTimer) * 3;

    if (this.kaiju.attacking) {
      this.kaiju.attackTimer += dt;
      // Spawn fire particles during attack
      if (Math.random() < 0.5) {
        this.particles.push({
          x: 50 + Math.random() * 30,
          y: GAME_HEIGHT / 2 + this.kaiju.bobOffset + Math.random() * 100 - 50,
          vx: 3 + Math.random() * 5,
          vy: -1 + Math.random() * 2,
          life: 0.5,
          maxLife: 0.5,
          color: Math.random() > 0.5 ? COLORS.kaiju : COLORS.kaijuGlow,
          size: 4 + Math.random() * 6,
        });
      }
      if (this.kaiju.attackTimer >= this.kaiju.attackDuration) {
        this.kaiju.attacking = false;
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private checkCollision(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  // ===== RENDER =====
  private render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    if (this.state === 'title') {
      this.renderTitle();
    } else if (this.state === 'playing') {
      this.renderGame();
    } else if (this.state === 'gameover') {
      this.renderGame();
      this.renderGameOver();
    } else if (this.state === 'victory') {
      this.renderGame();
      this.renderVictory();
    }

    ctx.restore();
  }

  private renderTitle() {
    const ctx = this.ctx;

    // Title background
    if (this.titleBgImageLoaded && this.titleBgImage) {
      ctx.drawImage(this.titleBgImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Title text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main title with glow
    ctx.shadowColor = COLORS.kaiju;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.fillText('橋上怪獣', GAME_WIDTH / 2, GAME_HEIGHT * 0.35);
    ctx.fillText('防衛隊', GAME_WIDTH / 2, GAME_HEIGHT * 0.35 + 40);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('BRIDGE KAIJU DEFENDER', GAME_WIDTH / 2, GAME_HEIGHT * 0.35 + 80);

    // Blink "Press Start"
    const blink = Math.sin(this.titleBlink * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('PRESS ENTER / TAP', GAME_WIDTH / 2, GAME_HEIGHT * 0.7);
    }

    // Controls info
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('← → : 移動', GAME_WIDTH / 2, GAME_HEIGHT * 0.82);
    ctx.fillText('SPACE : 怪獣必殺技', GAME_WIDTH / 2, GAME_HEIGHT * 0.82 + 20);
    ctx.fillText('射撃は自動', GAME_WIDTH / 2, GAME_HEIGHT * 0.82 + 40);
  }

  private renderGame() {
    const ctx = this.ctx;

    // Background
    if (this.bgImageLoaded && this.bgImage) {
      // Scrolling background
      const scrollOffset = this.bgScrollY % GAME_HEIGHT;
      ctx.drawImage(this.bgImage, 0, scrollOffset - GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT);
      ctx.drawImage(this.bgImage, 0, scrollOffset, GAME_WIDTH, GAME_HEIGHT);
      // Darken for gameplay visibility
      ctx.fillStyle = 'rgba(10, 22, 40, 0.5)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Bridge lines
      this.renderBridge();
    }

    // Defense line
    ctx.strokeStyle = 'rgba(255, 23, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, DEFENSE_LINE_Y);
    ctx.lineTo(GAME_WIDTH, DEFENSE_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Render gates
    this.renderGates();

    // Render enemies
    this.renderEnemies();

    // Render bullets
    this.renderBullets();

    // Render player
    this.renderPlayer();

    // Render kaiju
    this.renderKaiju();

    // Render particles
    this.renderParticles();

    // Render floating texts
    this.renderFloatingTexts();

    // Render HUD
    this.renderHUD();

    // Kaiju attack overlay
    if (this.kaiju.attacking) {
      const alpha = 0.3 * (1 - this.kaiju.attackTimer / this.kaiju.attackDuration);
      ctx.fillStyle = `rgba(255, 109, 0, ${alpha})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Scanline overlay for retro feel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      ctx.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  private renderBridge() {
    const ctx = this.ctx;
    // Simple bridge pattern
    ctx.fillStyle = COLORS.bridge;
    ctx.fillRect(20, 0, GAME_WIDTH - 40, GAME_HEIGHT);

    // Bridge railings
    ctx.fillStyle = COLORS.bridgeLight;
    ctx.fillRect(20, 0, 4, GAME_HEIGHT);
    ctx.fillRect(GAME_WIDTH - 24, 0, 4, GAME_HEIGHT);

    // Bridge tiles
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      const offsetY = (y + this.bgScrollY) % (GAME_HEIGHT + 40) - 40;
      ctx.strokeStyle = 'rgba(42, 58, 74, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, offsetY);
      ctx.lineTo(GAME_WIDTH - 24, offsetY);
      ctx.stroke();
    }
  }

  private renderGates() {
    const ctx = this.ctx;
    for (const gate of this.gates) {
      if (!gate.active || gate.passed) continue;

      let color = COLORS.gate;
      if (gate.type === 'add_soldier') color = COLORS.gateGood;
      else if (gate.type === 'remove_soldier') color = COLORS.gateBad;
      else if (gate.type === 'power_up') color = COLORS.gatePower;

      // Gate background
      ctx.fillStyle = color + '33';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const gx = gate.x - gate.width / 2;
      const gy = gate.y - gate.height / 2;
      ctx.fillRect(gx, gy, gate.width, gate.height);
      ctx.strokeRect(gx, gy, gate.width, gate.height);

      // Gate text
      ctx.fillStyle = color;
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gate.label, gate.x, gate.y);
    }
  }

  private renderEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      let color = COLORS.enemy;
      if (enemy.type === 'runner') color = COLORS.runner;
      else if (enemy.type === 'shield') color = COLORS.shield;
      else if (enemy.type === 'boss') color = COLORS.boss;

      const flash = enemy.hitFlash > 0;

      // Enemy body
      ctx.fillStyle = flash ? '#ffffff' : color;
      const ex = enemy.x - enemy.width / 2;
      const ey = enemy.y - enemy.height / 2;

      if (enemy.type === 'boss') {
        // Boss - larger with details
        ctx.fillRect(ex, ey, enemy.width, enemy.height);
        ctx.fillStyle = flash ? '#ffffff' : COLORS.bossDark;
        ctx.fillRect(ex + 4, ey + 4, enemy.width - 8, enemy.height - 8);
        ctx.fillStyle = flash ? '#ffffff' : color;
        // Eyes
        ctx.fillRect(ex + 12, ey + 10, 8, 8);
        ctx.fillRect(ex + 28, ey + 10, 8, 8);
        // HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(ex, ey - 8, enemy.width, 4);
        ctx.fillStyle = COLORS.boss;
        ctx.fillRect(ex, ey - 8, enemy.width * (enemy.hp / enemy.maxHp), 4);
      } else if (enemy.type === 'shield') {
        // Shield enemy - square with shield
        ctx.fillRect(ex, ey, enemy.width, enemy.height);
        ctx.fillStyle = flash ? '#ffffff' : '#4a148c';
        ctx.fillRect(ex + 2, ey, enemy.width - 4, 6);
      } else {
        // Regular/runner enemy
        const wobble = Math.sin(enemy.animTimer * 10) * 2;
        ctx.fillRect(ex + wobble, ey, enemy.width, enemy.height);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(ex + wobble + 3, ey + 4, 3, 3);
        ctx.fillRect(ex + wobble + enemy.width - 6, ey + 4, 3, 3);
      }
    }
  }

  private renderBullets() {
    const ctx = this.ctx;
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      // Bullet glow
      ctx.fillStyle = COLORS.bulletGlow + '44';
      ctx.fillRect(bullet.x - 4, bullet.y - 6, 8, 12);
      // Bullet core
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(bullet.x - 2, bullet.y - 4, 4, 8);
    }
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const soldierSpacing = 20;
    const startX = this.player.x - ((this.player.soldiers - 1) * soldierSpacing) / 2;

    for (let i = 0; i < this.player.soldiers; i++) {
      const sx = startX + i * soldierSpacing;
      const sy = PLAYER_Y;

      // Soldier glow
      ctx.fillStyle = COLORS.playerGlow + '33';
      ctx.fillRect(sx - 10, sy - 10, 20, 20);

      // Soldier body
      ctx.fillStyle = COLORS.player;
      ctx.fillRect(sx - 6, sy - 8, 12, 16);

      // Head
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 4, sy - 12, 8, 6);

      // Gun
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(sx - 1, sy - 16, 2, 6);
    }
  }

  private renderKaiju() {
    const ctx = this.ctx;
    const kaijuX = -20;
    const kaijuY = GAME_HEIGHT * 0.35 + this.kaiju.bobOffset;
    const kaijuSize = 120;

    if (this.kaijuImageLoaded && this.kaijuImage) {
      ctx.globalAlpha = this.kaiju.attacking ? 0.8 + Math.sin(this.kaiju.attackTimer * 20) * 0.2 : 1;
      ctx.drawImage(this.kaijuImage, kaijuX, kaijuY, kaijuSize, kaijuSize);
      ctx.globalAlpha = 1;
    } else {
      // Fallback pixel kaiju
      ctx.fillStyle = this.kaiju.attacking ? COLORS.kaijuGlow : COLORS.kaiju;
      ctx.fillRect(kaijuX + 20, kaijuY + 20, 60, 80);
      ctx.fillRect(kaijuX + 40, kaijuY, 30, 30);
    }

    // Kaiju gauge indicator near kaiju
    if (this.kaiju.gauge >= this.kaiju.maxGauge) {
      ctx.fillStyle = COLORS.kaijuGlow;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const blinkReady = Math.sin(this.stageTime * 6) > 0;
      if (blinkReady) {
        ctx.fillText('READY!', kaijuX + kaijuSize / 2 + 10, kaijuY - 5);
      }
    }
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  private renderHUD() {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Top bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, 50);

    // Stage & Time
    ctx.fillStyle = COLORS.hud;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('STAGE 1', 8, 6);

    const timeLeft = Math.max(0, Math.ceil(this.stage.duration - this.stageTime));
    ctx.fillStyle = timeLeft < 20 ? COLORS.boss : COLORS.hud;
    ctx.fillText(`TIME: ${timeLeft}s`, GAME_WIDTH - 100, 6);

    // HP
    ctx.fillStyle = COLORS.hud;
    ctx.fillText('HP:', 8, 22);
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? COLORS.boss : '#333';
      ctx.fillRect(35 + i * 14, 22, 10, 10);
    }

    // Soldiers & Power
    ctx.fillStyle = COLORS.hudAccent;
    ctx.fillText(`兵:${this.player.soldiers}`, 8, 38);
    ctx.fillStyle = COLORS.gatePower;
    ctx.fillText(`攻:${this.player.power}`, 70, 38);

    // Score
    ctx.fillStyle = COLORS.hud;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.score}pts`, GAME_WIDTH - 8, 38);

    // Kaiju gauge bar (bottom right)
    const gaugeX = GAME_WIDTH - 90;
    const gaugeY = GAME_HEIGHT - 30;
    const gaugeW = 80;
    const gaugeH = 12;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(gaugeX - 4, gaugeY - 18, gaugeW + 8, gaugeH + 22);

    ctx.fillStyle = COLORS.hud;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KAIJU', gaugeX, gaugeY - 14);

    ctx.fillStyle = '#333';
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
    ctx.fillStyle = this.kaiju.gauge >= this.kaiju.maxGauge ? COLORS.kaijuGlow : COLORS.kaiju;
    ctx.fillRect(gaugeX, gaugeY, gaugeW * (this.kaiju.gauge / this.kaiju.maxGauge), gaugeH);
    ctx.strokeStyle = COLORS.hud;
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // Kaiju button hint
    if (this.kaiju.gauge >= this.kaiju.maxGauge) {
      const blink = Math.sin(this.stageTime * 8) > 0;
      if (blink) {
        ctx.fillStyle = COLORS.kaijuGlow;
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[SPACE]', gaugeX + gaugeW / 2, gaugeY + gaugeH + 4);
      }
    }
  }

  private renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = COLORS.boss;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.boss;
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT * 0.35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.hud;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.score}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.5);
    ctx.fillText(`ENEMIES: ${this.enemiesKilled}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.5 + 25);

    const blink = Math.sin(this.titleBlink * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('PRESS ENTER', GAME_WIDTH / 2, GAME_HEIGHT * 0.7);
    }
  }

  private renderVictory() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = COLORS.gateGood;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.gateGood;
    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.fillText('STAGE CLEAR!', GAME_WIDTH / 2, GAME_HEIGHT * 0.3);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.hud;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.score}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.45);
    ctx.fillText(`ENEMIES: ${this.enemiesKilled}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.45 + 25);
    ctx.fillText(`SOLDIERS: ${this.player.soldiers}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.45 + 50);
    ctx.fillText(`POWER: ${this.player.power}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.45 + 75);

    const blink = Math.sin(this.titleBlink * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('PRESS ENTER', GAME_WIDTH / 2, GAME_HEIGHT * 0.75);
    }
  }

  // ===== GAME LOOP =====
  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private loop = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };
}
