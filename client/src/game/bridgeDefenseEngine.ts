import { audio } from './audio';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const PLAYER_Y = 540;
const BRIDGE_LEFT = 34;
const BRIDGE_RIGHT = GAME_WIDTH - 34;
const STAGE_LENGTH_M = 500;
const FORWARD_SPEED_MPS = 12.5;
const PX_PER_METER = 2.2;
const MAX_VISIBLE_SOLDIERS = 100;
const MAX_BULLETS = 100;
const MAX_ENEMIES = 200;
const MAX_PARTICLES = 220;
const GRID_SIZE = 56;

const COLORS = {
  skyTop: '#07152a',
  skyBottom: '#0b2740',
  bridge: '#253044',
  bridgeEdge: '#536079',
  bridgeLine: '#6f7890',
  player: '#65eaff',
  playerDark: '#0c8fa6',
  gun: '#ffe082',
  bullet: '#ffd54f',
  zombie: '#78e65a',
  runner: '#f7ef61',
  tank: '#a56cff',
  boss: '#ff4567',
  bossDark: '#9e1d37',
  good: '#20e6a1',
  bad: '#ff5252',
  upgrade: '#ffbf3d',
  hud: '#ecf7ff',
  muted: 'rgba(236,247,255,0.68)',
  black: 'rgba(2,6,14,0.72)',
};

type GameState = 'title' | 'playing' | 'gameover' | 'victory';
type GateOperation = 'add' | 'subtract' | 'multiply' | 'rate' | 'damage';
type EnemyType = 'zombie' | 'runner' | 'tank';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  active: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  type: EnemyType;
  contactDamage: number;
  active: boolean;
  hitFlash: number;
  wobble: number;
}

interface Gate {
  pairId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  op: GateOperation;
  value: number;
  label: string;
  color: string;
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
  size: number;
  color: string;
  active: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

interface GatePlan {
  distance: number;
  left: Omit<Gate, 'pairId' | 'x' | 'y' | 'width' | 'height' | 'active' | 'passed'>;
  right: Omit<Gate, 'pairId' | 'x' | 'y' | 'width' | 'height' | 'active' | 'passed'>;
}

interface WavePlan {
  distance: number;
  type: EnemyType;
  count: number;
  spread: number;
}

interface BossState {
  active: boolean;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  radius: number;
  attackTimer: number;
  telegraph: number;
  targetX: number;
  hitFlash: number;
}

interface PlayerState {
  x: number;
  targetX: number;
  soldiers: number;
  attackDamage: number;
  shotsPerSecondPerSoldier: number;
  bulletAccumulator: number;
}

const gatePlans: GatePlan[] = [
  {
    distance: 55,
    left: { op: 'add', value: 10, label: '+10', color: COLORS.good },
    right: { op: 'add', value: 6, label: '+6', color: COLORS.good },
  },
  {
    distance: 118,
    left: { op: 'multiply', value: 2, label: '×2', color: COLORS.good },
    right: { op: 'add', value: 18, label: '+18', color: COLORS.good },
  },
  {
    distance: 185,
    left: { op: 'add', value: 12, label: '+12', color: COLORS.good },
    right: { op: 'multiply', value: 3, label: '×3', color: COLORS.good },
  },
  {
    distance: 250,
    left: { op: 'rate', value: 1.2, label: 'RAPID', color: COLORS.upgrade },
    right: { op: 'add', value: 35, label: '+35', color: COLORS.good },
  },
  {
    distance: 318,
    left: { op: 'multiply', value: 2, label: '×2', color: COLORS.good },
    right: { op: 'subtract', value: 10, label: '-10', color: COLORS.bad },
  },
  {
    distance: 390,
    left: { op: 'damage', value: 1.2, label: 'DMG+', color: COLORS.upgrade },
    right: { op: 'add', value: 50, label: '+50', color: COLORS.good },
  },
  {
    distance: 455,
    left: { op: 'subtract', value: 15, label: '-15', color: COLORS.bad },
    right: { op: 'multiply', value: 2, label: '×2', color: COLORS.good },
  },
];

const wavePlans: WavePlan[] = [
  { distance: 28, type: 'zombie', count: 8, spread: 160 },
  { distance: 86, type: 'zombie', count: 14, spread: 210 },
  { distance: 150, type: 'runner', count: 9, spread: 220 },
  { distance: 218, type: 'zombie', count: 20, spread: 240 },
  { distance: 292, type: 'tank', count: 3, spread: 210 },
  { distance: 352, type: 'runner', count: 12, spread: 250 },
  { distance: 420, type: 'zombie', count: 24, spread: 260 },
];

export class BridgeDefenseEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId = 0;
  private lastTime = 0;
  private scale = 1;
  private state: GameState = 'title';
  private elapsed = 0;
  private distance = 0;
  private bridgeScroll = 0;
  private screenShake = 0;
  private hitStop = 0;
  private pairSeq = 1;
  private nextEnemyId = 1;
  private kills = 0;
  private coins = 0;
  private earnedCoins = 0;
  private bestDistance = 0;
  private gateIndex = 0;
  private waveIndex = 0;
  private titleBlink = 0;
  private inputActive = false;

  private keys: Set<string> = new Set();

  private player: PlayerState = {
    x: GAME_WIDTH / 2,
    targetX: GAME_WIDTH / 2,
    soldiers: 8,
    attackDamage: 1,
    shotsPerSecondPerSoldier: 2.4,
    bulletAccumulator: 0,
  };

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private gates: Gate[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private enemyGrid: Map<string, Enemy[]> = new Map();

  private boss: BossState = {
    active: false,
    hp: 120,
    maxHp: 120,
    x: GAME_WIDTH / 2,
    y: 94,
    radius: 42,
    attackTimer: 2.8,
    telegraph: 0,
    targetX: GAME_WIDTH / 2,
    hitFlash: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.coins = Number(window.localStorage.getItem('bridge-defense-coins') ?? '0');
    this.bestDistance = Number(window.localStorage.getItem('bridge-defense-best-distance') ?? '0');
    this.setupInput();
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const scaleX = parent.clientWidth / GAME_WIDTH;
    const scaleY = parent.clientHeight / GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.canvas.style.width = `${Math.floor(GAME_WIDTH * this.scale)}px`;
    this.canvas.style.height = `${Math.floor(GAME_HEIGHT * this.scale)}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('pointerleave', this.handlePointerUp);
  }

  private setupInput() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('pointerleave', this.handlePointerUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.key);
    if (event.key === 'Enter' || event.key === ' ') {
      audio.init();
      if (this.state === 'title') this.startGame();
      else if (this.state === 'gameover' || this.state === 'victory') this.state = 'title';
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key);
  };

  private handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    audio.init();
    const { x } = this.toGamePoint(event.clientX, event.clientY);
    if (this.state === 'title') {
      this.startGame();
      return;
    }
    if (this.state === 'gameover' || this.state === 'victory') {
      this.state = 'title';
      return;
    }
    this.inputActive = true;
    this.player.targetX = this.clampX(x);
  };

  private handlePointerMove = (event: PointerEvent) => {
    const { x } = this.toGamePoint(event.clientX, event.clientY);
    if (this.state === 'playing') {
      this.player.targetX = this.clampX(x);
    }
  };

  private handlePointerUp = () => {
    this.inputActive = false;
  };

  private toGamePoint(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale,
    };
  }

  private startGame() {
    audio.startGame();
    this.state = 'playing';
    this.elapsed = 0;
    this.distance = 0;
    this.bridgeScroll = 0;
    this.screenShake = 0;
    this.hitStop = 0;
    this.kills = 0;
    this.earnedCoins = 0;
    this.gateIndex = 0;
    this.waveIndex = 0;
    this.pairSeq = 1;
    this.nextEnemyId = 1;
    this.bullets = [];
    this.enemies = [];
    this.gates = [];
    this.particles = [];
    this.floatingTexts = [];
    this.enemyGrid.clear();
    this.player = {
      x: GAME_WIDTH / 2,
      targetX: GAME_WIDTH / 2,
      soldiers: 8,
      attackDamage: 1,
      shotsPerSecondPerSoldier: 2.4,
      bulletAccumulator: 0,
    };
    this.boss = {
      active: false,
      hp: 120,
      maxHp: 120,
      x: GAME_WIDTH / 2,
      y: 94,
      radius: 42,
      attackTimer: 2.8,
      telegraph: 0,
      targetX: GAME_WIDTH / 2,
      hitFlash: 0,
    };
    this.addFloatingText(GAME_WIDTH / 2, 210, '左右に動いて有利なゲートへ', COLORS.hud, 14);
  }

  private loop = () => {
    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(rawDt);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(rawDt: number) {
    this.titleBlink += rawDt;
    if (this.state !== 'playing') return;

    if (this.hitStop > 0) {
      this.hitStop -= rawDt;
      this.updateParticles(rawDt);
      this.updateFloatingTexts(rawDt);
      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - rawDt * 28);
      return;
    }

    const dt = rawDt;
    this.elapsed += dt;
    this.distance = Math.min(STAGE_LENGTH_M, this.distance + FORWARD_SPEED_MPS * dt);
    this.bridgeScroll += FORWARD_SPEED_MPS * PX_PER_METER * dt;

    this.updatePlayer(dt);
    this.updateSpawns();
    this.updateGates(dt);
    this.updateEnemies(dt);
    this.buildEnemyGrid();
    this.updateBullets(dt);
    this.updateBoss(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    if (!this.boss.active && this.distance >= STAGE_LENGTH_M) {
      this.spawnBoss();
    }

    if (this.player.soldiers <= 0) {
      this.finishGame(false);
    }

    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 28);
  }

  private updatePlayer(dt: number) {
    let keyboardDirection = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) keyboardDirection -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) keyboardDirection += 1;
    if (keyboardDirection !== 0) {
      this.player.targetX = this.clampX(this.player.targetX + keyboardDirection * 240 * dt);
    }
    const followSpeed = this.inputActive ? 18 : 12;
    this.player.x += (this.player.targetX - this.player.x) * Math.min(1, followSpeed * dt);
    this.player.x = this.clampX(this.player.x);

    const effectiveShooters = Math.min(this.player.soldiers, MAX_VISIBLE_SOLDIERS);
    this.player.bulletAccumulator += effectiveShooters * this.player.shotsPerSecondPerSoldier * dt;
    let shots = Math.floor(this.player.bulletAccumulator);
    if (shots > 0) this.player.bulletAccumulator -= shots;
    shots = Math.min(shots, 12, MAX_BULLETS - this.activeBulletCount());
    for (let i = 0; i < shots; i++) this.fireBullet(i, shots);
  }

  private fireBullet(index: number, total: number) {
    const formation = this.getFormationPositions(Math.min(this.player.soldiers, MAX_VISIBLE_SOLDIERS));
    const source = formation.length > 0 ? formation[index % formation.length] : { x: this.player.x, y: PLAYER_Y };
    const spread = total > 1 ? (index / (total - 1) - 0.5) * 0.5 : 0;
    const bullet: Bullet = {
      x: source.x,
      y: source.y - 17,
      vx: spread,
      vy: -560,
      damage: this.player.attackDamage,
      active: true,
    };
    this.bullets.push(bullet);
    this.spawnParticle(source.x, source.y - 18, COLORS.bullet, 1, 0.15, 0, -40);
    if (Math.random() < 0.2) audio.shoot();
  }

  private updateSpawns() {
    while (this.gateIndex < gatePlans.length && this.distance >= gatePlans[this.gateIndex].distance) {
      this.spawnGatePair(gatePlans[this.gateIndex]);
      this.gateIndex++;
    }
    while (this.waveIndex < wavePlans.length && this.distance >= wavePlans[this.waveIndex].distance) {
      this.spawnWave(wavePlans[this.waveIndex]);
      this.waveIndex++;
    }
  }

  private spawnGatePair(plan: GatePlan) {
    const pairId = this.pairSeq++;
    const y = -52;
    const base = { pairId, y, width: 112, height: 54, active: true, passed: false };
    this.gates.push({ ...base, x: GAME_WIDTH * 0.31, ...plan.left });
    this.gates.push({ ...base, x: GAME_WIDTH * 0.69, ...plan.right });
  }

  private spawnWave(plan: WavePlan) {
    const center = BRIDGE_LEFT + 45 + Math.random() * (BRIDGE_RIGHT - BRIDGE_LEFT - 90);
    for (let i = 0; i < plan.count; i++) {
      if (this.activeEnemyCount() >= MAX_ENEMIES) break;
      const line = i % 8;
      const row = Math.floor(i / 8);
      const x = this.clampX(center + (line - 3.5) * (plan.spread / 8) + (Math.random() - 0.5) * 18);
      const y = -38 - row * 24 - Math.random() * 30;
      this.spawnEnemy(plan.type, x, y);
    }
  }

  private spawnEnemy(type: EnemyType, x: number, y: number) {
    let hp = 1;
    let speed = 26;
    let radius = 9;
    let contactDamage = 1;
    if (type === 'runner') {
      hp = 1;
      speed = 48;
      radius = 8;
    } else if (type === 'tank') {
      hp = 7;
      speed = 17;
      radius = 15;
      contactDamage = 3;
    }
    this.enemies.push({
      id: this.nextEnemyId++,
      x,
      y,
      hp,
      maxHp: hp,
      speed,
      radius,
      type,
      contactDamage,
      active: true,
      hitFlash: 0,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private spawnBoss() {
    this.boss.active = true;
    this.boss.hp = this.boss.maxHp;
    this.boss.attackTimer = 4.5;
    this.boss.telegraph = 0;
    this.screenShake = 12;
    this.addFloatingText(GAME_WIDTH / 2, 170, 'BOSS INCOMING', COLORS.boss, 20);
    audio.bossWarning();
  }

  private updateGates(dt: number) {
    for (const gate of this.gates) {
      if (!gate.active || gate.passed) continue;
      gate.y += FORWARD_SPEED_MPS * PX_PER_METER * dt;
      if (gate.y > PLAYER_Y - 30 && gate.y < PLAYER_Y + 42 && Math.abs(this.player.x - gate.x) < gate.width / 2) {
        this.applyGate(gate);
      }
      if (gate.y > GAME_HEIGHT + 70) gate.active = false;
    }
    this.gates = this.gates.filter((gate) => gate.active);
  }

  private applyGate(gate: Gate) {
    const before = this.player.soldiers;
    gate.passed = true;
    for (const other of this.gates) {
      if (other.pairId === gate.pairId) other.active = false;
    }
    if (gate.op === 'add') {
      this.player.soldiers += gate.value;
      this.addFloatingText(this.player.x, PLAYER_Y - 76, `+${this.player.soldiers - before}`, COLORS.good, 22);
      this.spawnBurst(this.player.x, PLAYER_Y - 20, COLORS.good, 18);
      audio.gateGood();
    } else if (gate.op === 'subtract') {
      this.player.soldiers = Math.max(0, this.player.soldiers - gate.value);
      this.addFloatingText(this.player.x, PLAYER_Y - 76, `-${before - this.player.soldiers}`, COLORS.bad, 22);
      this.screenShake = 6;
      audio.gateBad();
    } else if (gate.op === 'multiply') {
      this.player.soldiers = Math.min(9999, Math.floor(this.player.soldiers * gate.value));
      this.addFloatingText(this.player.x, PLAYER_Y - 76, `×${gate.value}`, COLORS.good, 24);
      this.spawnBurst(this.player.x, PLAYER_Y - 20, COLORS.good, 24);
      audio.gateGood();
    } else if (gate.op === 'rate') {
      this.player.shotsPerSecondPerSoldier = Math.min(4.5, this.player.shotsPerSecondPerSoldier * gate.value);
      this.addFloatingText(this.player.x, PLAYER_Y - 76, 'RAPID UP', COLORS.upgrade, 18);
      this.spawnBurst(this.player.x, PLAYER_Y - 20, COLORS.upgrade, 20);
      audio.gateGood();
    } else if (gate.op === 'damage') {
      this.player.attackDamage = Math.min(4, this.player.attackDamage + gate.value);
      this.addFloatingText(this.player.x, PLAYER_Y - 76, 'DAMAGE UP', COLORS.upgrade, 18);
      this.spawnBurst(this.player.x, PLAYER_Y - 20, COLORS.upgrade, 20);
      audio.gateGood();
    }
    this.player.soldiers = Math.min(9999, Math.floor(this.player.soldiers));
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.y += (FORWARD_SPEED_MPS * PX_PER_METER + enemy.speed) * dt;
      enemy.wobble += dt * 8;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const formationWidth = Math.min(170, 36 + Math.sqrt(this.player.soldiers) * 15);
      const touchesSquad = enemy.y + enemy.radius > PLAYER_Y - 42 && Math.abs(enemy.x - this.player.x) < formationWidth / 2 + enemy.radius;
      if (touchesSquad || enemy.y > GAME_HEIGHT + 20) {
        enemy.active = false;
        this.damageSquad(enemy.contactDamage, enemy.x, enemy.y);
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.active);
  }

  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      bullet.x += bullet.vx;
      bullet.y += bullet.vy * dt;
      if (bullet.y < -18) {
        bullet.active = false;
        continue;
      }
      const enemy = this.findBulletEnemyHit(bullet);
      if (enemy) {
        bullet.active = false;
        this.damageEnemy(enemy, bullet.damage, bullet.x, bullet.y);
        continue;
      }
      if (this.boss.active && this.checkCircleHit(bullet.x, bullet.y, 4, this.boss.x, this.boss.y, this.boss.radius)) {
        bullet.active = false;
        this.boss.hp -= bullet.damage;
        this.boss.hitFlash = 0.08;
        this.spawnParticle(bullet.x, bullet.y, COLORS.boss, 2, 0.18, (Math.random() - 0.5) * 40, -40);
        if (this.boss.hp <= 0) {
          this.killBoss();
        }
      }
    }
    this.bullets = this.bullets.filter((bullet) => bullet.active);
  }

  private buildEnemyGrid() {
    this.enemyGrid.clear();
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const key = this.gridKey(enemy.x, enemy.y);
      const bucket = this.enemyGrid.get(key);
      if (bucket) bucket.push(enemy);
      else this.enemyGrid.set(key, [enemy]);
    }
  }

  private findBulletEnemyHit(bullet: Bullet): Enemy | null {
    const cx = Math.floor(bullet.x / GRID_SIZE);
    const cy = Math.floor(bullet.y / GRID_SIZE);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const bucket = this.enemyGrid.get(`${gx}:${gy}`);
        if (!bucket) continue;
        for (const enemy of bucket) {
          if (enemy.active && this.checkCircleHit(bullet.x, bullet.y, 4, enemy.x, enemy.y, enemy.radius)) return enemy;
        }
      }
    }
    return null;
  }

  private damageEnemy(enemy: Enemy, damage: number, x: number, y: number) {
    enemy.hp -= damage;
    enemy.hitFlash = 0.08;
    this.spawnParticle(x, y, COLORS.bullet, 2, 0.18, (Math.random() - 0.5) * 30, -30);
    if (enemy.hp <= 0) {
      enemy.active = false;
      this.kills++;
      this.earnedCoins += enemy.type === 'tank' ? 3 : enemy.type === 'runner' ? 2 : 1;
      this.spawnBurst(enemy.x, enemy.y, this.enemyColor(enemy.type), enemy.type === 'tank' ? 16 : 8);
      if (this.kills % 25 === 0) this.hitStop = 0.035;
      audio.enemyDie();
    }
  }

  private updateBoss(dt: number) {
    if (!this.boss.active || this.state !== 'playing') return;
    this.boss.y = 94 + Math.sin(this.elapsed * 2) * 4;
    this.boss.hitFlash = Math.max(0, this.boss.hitFlash - dt);
    this.boss.attackTimer -= dt;
    if (this.boss.telegraph > 0) {
      this.boss.telegraph -= dt;
      if (this.boss.telegraph <= 0) {
        const hit = Math.abs(this.player.x - this.boss.targetX) < 44;
        if (hit) this.damageSquad(Math.max(2, Math.ceil(this.player.soldiers * 0.06)), this.player.x, PLAYER_Y - 20);
        this.screenShake = 6;
        this.spawnBurst(this.boss.targetX, PLAYER_Y - 35, COLORS.boss, 22);
        this.boss.attackTimer = 5.2;
      }
    } else if (this.boss.attackTimer <= 0) {
      this.boss.targetX = this.clampX(56 + Math.random() * (GAME_WIDTH - 112));
      this.boss.telegraph = 1.45;
      this.addFloatingText(this.boss.targetX, PLAYER_Y - 110, 'DANGER', COLORS.boss, 14);
    }
  }

  private killBoss() {
    this.boss.active = false;
    this.kills++;
    this.earnedCoins += 80 + Math.floor(this.player.soldiers * 0.4);
    this.spawnBurst(this.boss.x, this.boss.y, COLORS.boss, 60);
    this.finishGame(true);
  }

  private damageSquad(amount: number, x: number, y: number) {
    const before = this.player.soldiers;
    this.player.soldiers = Math.max(0, this.player.soldiers - amount);
    const actual = before - this.player.soldiers;
    if (actual > 0) {
      this.addFloatingText(x, y - 16, `-${actual}`, COLORS.bad, 18);
      this.spawnBurst(x, y, COLORS.bad, 12);
      this.screenShake = Math.max(this.screenShake, 6);
      audio.playerHit();
    }
  }

  private finishGame(victory: boolean) {
    if (this.state !== 'playing') return;
    this.state = victory ? 'victory' : 'gameover';
    if (victory) audio.victory();
    else audio.gameOver();
    const distanceBonus = Math.floor(this.distance / 12);
    const survivorBonus = victory ? Math.floor(this.player.soldiers * 0.35) : 0;
    this.earnedCoins += distanceBonus + survivorBonus;
    this.coins += this.earnedCoins;
    this.bestDistance = Math.max(this.bestDistance, Math.floor(this.distance));
    window.localStorage.setItem('bridge-defense-coins', String(this.coins));
    window.localStorage.setItem('bridge-defense-best-distance', String(this.bestDistance));
  }

  private activeBulletCount() {
    return this.bullets.reduce((sum, bullet) => sum + (bullet.active ? 1 : 0), 0);
  }

  private activeEnemyCount() {
    return this.enemies.reduce((sum, enemy) => sum + (enemy.active ? 1 : 0), 0);
  }

  private clampX(x: number) {
    return Math.max(BRIDGE_LEFT + 18, Math.min(BRIDGE_RIGHT - 18, x));
  }

  private gridKey(x: number, y: number) {
    return `${Math.floor(x / GRID_SIZE)}:${Math.floor(y / GRID_SIZE)}`;
  }

  private checkCircleHit(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const radius = r1 + r2;
    return dx * dx + dy * dy <= radius * radius;
  }

  private getFormationPositions(count: number) {
    const positions: { x: number; y: number }[] = [];
    if (count <= 0) return positions;
    const visible = Math.min(count, MAX_VISIBLE_SOLDIERS);
    const cols = Math.min(12, Math.ceil(Math.sqrt(visible * 1.6)));
    const rows = Math.ceil(visible / cols);
    const spacingX = Math.max(8, Math.min(16, 140 / Math.max(1, cols)));
    const spacingY = Math.max(8, Math.min(14, 88 / Math.max(1, rows)));
    for (let i = 0; i < visible; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rowCount = Math.min(cols, visible - row * cols);
      const offsetX = (col - (rowCount - 1) / 2) * spacingX;
      const fan = (row - rows / 2) * 2.3;
      positions.push({
        x: this.clampX(this.player.x + offsetX + fan * Math.sign(offsetX || 1)),
        y: PLAYER_Y + row * spacingY - rows * spacingY * 0.38,
      });
    }
    return positions;
  }

  private spawnParticle(x: number, y: number, color: string, size: number, life: number, vx: number, vy: number) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ x, y, vx, vy, life, maxLife: life, size, color, active: true });
  }

  private spawnBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      this.spawnParticle(x, y, color, 2 + Math.random() * 4, 0.3 + Math.random() * 0.45, Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, size: number) {
    this.floatingTexts.push({ x, y, vy: -34, life: 1.25, maxLife: 1.25, text, color, size });
  }

  private updateParticles(dt: number) {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 160 * dt;
      particle.life -= dt;
      if (particle.life <= 0) particle.active = false;
    }
    this.particles = this.particles.filter((particle) => particle.active);
  }

  private updateFloatingTexts(dt: number) {
    for (const text of this.floatingTexts) {
      text.y += text.vy * dt;
      text.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);
  }

  private enemyColor(type: EnemyType) {
    if (type === 'runner') return COLORS.runner;
    if (type === 'tank') return COLORS.tank;
    return COLORS.zombie;
  }

  private render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
    }
    this.renderBackground();
    if (this.state === 'title') this.renderTitle();
    else {
      this.renderGates();
      this.renderEnemies();
      this.renderBoss();
      this.renderBullets();
      this.renderPlayer();
      this.renderParticles();
      this.renderFloatingTexts();
      this.renderHUD();
      if (this.state === 'gameover') this.renderResult(false);
      if (this.state === 'victory') this.renderResult(true);
    }
    ctx.restore();
  }

  private renderBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, 28, GAME_HEIGHT);
    ctx.fillRect(GAME_WIDTH - 28, 0, 28, GAME_HEIGHT);

    ctx.fillStyle = COLORS.bridge;
    ctx.fillRect(BRIDGE_LEFT, 0, BRIDGE_RIGHT - BRIDGE_LEFT, GAME_HEIGHT);
    ctx.fillStyle = COLORS.bridgeEdge;
    ctx.fillRect(BRIDGE_LEFT, 0, 7, GAME_HEIGHT);
    ctx.fillRect(BRIDGE_RIGHT - 7, 0, 7, GAME_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let y = -48; y < GAME_HEIGHT + 48; y += 48) {
      const yy = (y + this.bridgeScroll) % 48;
      ctx.beginPath();
      ctx.moveTo(BRIDGE_LEFT + 8, yy);
      ctx.lineTo(BRIDGE_RIGHT - 8, yy);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(236,247,255,0.12)';
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, 0);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderTitle() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.good;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.fillText('BRIDGE', GAME_WIDTH / 2, 190);
    ctx.fillText('DEFENSE', GAME_WIDTH / 2, 226);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('数の暴力 vs 数の暴力', GAME_WIDTH / 2, 260);

    this.renderSampleGate(GAME_WIDTH / 2 - 70, 336, '+10', COLORS.good);
    this.renderSampleGate(GAME_WIDTH / 2 + 70, 336, '+6', COLORS.good);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('ドラッグ / マウス移動で有利なゲートへ', GAME_WIDTH / 2, 418);
    ctx.fillText('兵士は自動射撃。0人で敗北。', GAME_WIDTH / 2, 442);

    if (Math.sin(this.titleBlink * 4) > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('TAP / ENTER TO START', GAME_WIDTH / 2, 510);
    }
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`COINS ${this.coins} / BEST ${this.bestDistance}m`, GAME_WIDTH / 2, 574);
  }

  private renderSampleGate(x: number, y: number, label: string, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color + '2e';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillRect(x - 42, y - 34, 84, 68);
    ctx.strokeRect(x - 42, y - 34, 84, 68);
    ctx.fillStyle = color;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }

  private renderGates() {
    const ctx = this.ctx;
    for (const gate of this.gates) {
      if (!gate.active || gate.passed) continue;
      const x = gate.x - gate.width / 2;
      const y = gate.y - gate.height / 2;
      ctx.fillStyle = gate.color + '31';
      ctx.strokeStyle = gate.color;
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, gate.width, gate.height);
      ctx.strokeRect(x, y, gate.width, gate.height);
      ctx.strokeStyle = gate.color + '88';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 8);
      ctx.lineTo(x + 8, y + gate.height + 8);
      ctx.moveTo(x + gate.width - 8, y - 8);
      ctx.lineTo(x + gate.width - 8, y + gate.height + 8);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 25px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = gate.color;
      ctx.shadowBlur = 12;
      ctx.fillText(gate.label, gate.x, gate.y + 1);
      ctx.shadowBlur = 0;
    }
  }

  private renderEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const color = enemy.hitFlash > 0 ? '#ffffff' : this.enemyColor(enemy.type);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      const wobble = Math.sin(enemy.wobble) * 1.7;
      if (enemy.type === 'tank') {
        ctx.beginPath();
        ctx.roundRect(enemy.x - enemy.radius + wobble, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#24103f';
        ctx.fillRect(enemy.x - 9 + wobble, enemy.y - 17, 18, 5);
        this.renderSmallHp(enemy.x - 17, enemy.y - 24, 34, enemy.hp / enemy.maxHp, COLORS.tank);
      } else {
        ctx.beginPath();
        ctx.arc(enemy.x + wobble, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#06100b';
        ctx.fillRect(enemy.x - 5 + wobble, enemy.y - 3, 3, 3);
        ctx.fillRect(enemy.x + 3 + wobble, enemy.y - 3, 3, 3);
      }
    }
  }

  private renderBoss() {
    if (!this.boss.active) return;
    const ctx = this.ctx;
    if (this.boss.telegraph > 0) {
      const alpha = 0.2 + Math.sin(this.elapsed * 18) * 0.12;
      ctx.fillStyle = `rgba(255,69,103,${alpha})`;
      ctx.beginPath();
      ctx.arc(this.boss.targetX, PLAYER_Y - 12, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.boss;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const flash = this.boss.hitFlash > 0;
    ctx.save();
    ctx.translate(this.boss.x, this.boss.y);
    ctx.fillStyle = flash ? '#ffffff' : COLORS.boss;
    ctx.strokeStyle = COLORS.bossDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(44, -12);
    ctx.lineTo(31, 44);
    ctx.lineTo(-31, 44);
    ctx.lineTo(-44, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.bossDark;
    ctx.fillRect(-24, -10, 15, 8);
    ctx.fillRect(9, -10, 15, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-20, -8, 6, 4);
    ctx.fillRect(14, -8, 6, 4);
    ctx.restore();
    this.renderBossHp();
  }

  private renderBullets() {
    const ctx = this.ctx;
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      ctx.fillStyle = 'rgba(255,213,79,0.32)';
      ctx.fillRect(bullet.x - 3, bullet.y - 9, 6, 15);
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(bullet.x - 1.5, bullet.y - 8, 3, 12);
    }
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const positions = this.getFormationPositions(Math.min(this.player.soldiers, MAX_VISIBLE_SOLDIERS));
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      ctx.fillStyle = 'rgba(101,234,255,0.18)';
      ctx.fillRect(p.x - 6, p.y - 9, 12, 18);
      ctx.fillStyle = COLORS.playerDark;
      ctx.fillRect(p.x - 4, p.y - 6, 8, 12);
      ctx.fillStyle = COLORS.player;
      ctx.fillRect(p.x - 4, p.y - 10, 8, 6);
      ctx.fillStyle = COLORS.gun;
      ctx.fillRect(p.x - 1, p.y - 16, 2, 8);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(String(this.player.soldiers), this.player.x, PLAYER_Y - 76);
    ctx.shadowBlur = 0;
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      if (!particle.active) continue;
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const text of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
      ctx.fillStyle = text.color;
      ctx.font = `bold ${text.size}px system-ui, sans-serif`;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private renderHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(0, 0, GAME_WIDTH, 62);
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`SQUAD ${this.player.soldiers}`, 10, 8);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`KILL ${this.kills}`, 10, 30);
    ctx.fillText(`COIN ${this.coins + this.earnedCoins}`, 96, 30);

    const progress = Math.min(1, this.distance / STAGE_LENGTH_M);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(178, 13, 168, 12);
    ctx.fillStyle = this.boss.active ? COLORS.boss : COLORS.good;
    ctx.fillRect(178, 13, 168 * progress, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.52)';
    ctx.strokeRect(178, 13, 168, 12);
    ctx.fillStyle = COLORS.hud;
    ctx.textAlign = 'right';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${Math.floor(this.distance)} / ${STAGE_LENGTH_M}m`, 346, 31);

    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`DMG ${this.player.attackDamage.toFixed(1)}  RATE ${this.player.shotsPerSecondPerSoldier.toFixed(1)}/s`, GAME_WIDTH / 2, 49);
  }

  private renderBossHp() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(48, 72, 264, 14);
    ctx.fillStyle = COLORS.boss;
    ctx.fillRect(50, 74, 260 * Math.max(0, this.boss.hp / this.boss.maxHp), 10);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 72, 264, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS HP ${Math.max(0, Math.ceil(this.boss.hp))}`, GAME_WIDTH / 2, 88);
  }

  private renderSmallHp(x: number, y: number, w: number, ratio: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, ratio), 4);
  }

  private renderResult(victory: boolean) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = victory ? COLORS.good : COLORS.bad;
    ctx.shadowBlur = 16;
    ctx.fillStyle = victory ? COLORS.good : COLORS.bad;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(victory ? 'STAGE CLEAR' : 'GAME OVER', GAME_WIDTH / 2, 180);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.hud;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`到達距離 ${Math.floor(this.distance)}m`, GAME_WIDTH / 2, 248);
    ctx.fillText(`撃破数 ${this.kills}`, GAME_WIDTH / 2, 280);
    ctx.fillText(`獲得コイン ${this.earnedCoins}`, GAME_WIDTH / 2, 312);
    ctx.fillText(`残存部隊 ${this.player.soldiers}`, GAME_WIDTH / 2, 344);
    if (Math.sin(this.titleBlink * 4) > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('TAP / ENTER でリトライ', GAME_WIDTH / 2, 448);
    }
  }
}
