import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4, Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Player } from "./Player";
import { Projectile } from "./Projectile";
import { Enemy } from "./Enemy";
import { InputManager } from "./InputManager";
import { ENEMIES } from "../data/enemies";
import {
  GAME_WIDTH, GAME_HEIGHT, BASE_FIRE_RATE, PLAYER_MAX_HP,
  WAVE_ENEMY_BASE, WAVE_ENEMY_SCALE, BOSS_WAVE_INTERVAL, PLAYER_SIZE
} from "./constants";

export interface GameCallbacks {
  onWaveStart: (wave: number) => void;
  onWaveComplete: (wave: number) => void;
  onEnemyKilled: (xp: number, gold: number) => void;
  onPlayerDamaged: (hp: number, maxHp: number) => void;
  onPlayerDied: () => void;
  onScoreUpdate: (score: number) => void;
}

export class GameWorld {
  private engine: Engine;
  private scene: Scene;
  private player: Player;
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private input: InputManager;
  private callbacks: GameCallbacks;
  private fireCooldown = 0;
  private currentWave = 1;
  private enemiesRemaining = 0;
  private enemiesSpawned = 0;
  private enemiesPerWave = 0;
  private spawnTimer = 0;
  private score = 0;
  private running = false;
  private gameOver = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.18, 0.21, 1); // dark teal

    // Camera (orthographic top-down)
    const camera = new FreeCamera("cam", new Vector3(0, 15, 0), this.scene);
    camera.setTarget(Vector3.Zero());
    camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    const aspect = canvas.height / canvas.width;
    camera.orthoLeft = -GAME_WIDTH / 2;
    camera.orthoRight = GAME_WIDTH / 2;
    camera.orthoTop = (GAME_WIDTH * aspect) / 2;
    camera.orthoBottom = -(GAME_WIDTH * aspect) / 2;

    // Lighting
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;
    light.diffuse = new Color3(0.8, 1, 0.9);

    // Ground
    const ground = MeshBuilder.CreateGround("ground", { width: GAME_WIDTH, height: GAME_HEIGHT * 2 }, this.scene);
    const groundMat = new StandardMaterial("groundMat", this.scene);
    groundMat.diffuseColor = new Color3(0.06, 0.12, 0.14);
    groundMat.specularColor = Color3.Black();
    ground.material = groundMat;
    ground.position.y = -0.1;

    // Road lines
    for (let i = -2; i <= 2; i += 2) {
      const line = MeshBuilder.CreateBox("line" + i, { width: 0.08, height: 0.01, depth: GAME_HEIGHT * 2 }, this.scene);
      const lineMat = new StandardMaterial("lineMat" + i, this.scene);
      lineMat.diffuseColor = new Color3(0.15, 0.3, 0.2);
      lineMat.emissiveColor = new Color3(0.05, 0.15, 0.08);
      line.material = lineMat;
      line.position.x = i;
    }

    // Input
    this.input = new InputManager(canvas);

    // Player
    this.player = new Player(this.scene, this.input, PLAYER_MAX_HP);
  }

  start(wave: number = 1) {
    this.currentWave = wave;
    this.score = 0;
    this.gameOver = false;
    this.running = true;
    this.startWave();
    this.engine.runRenderLoop(() => this.gameLoop());
  }

  private startWave() {
    const isBoss = this.currentWave % BOSS_WAVE_INTERVAL === 0;
    this.enemiesPerWave = isBoss ? 1 : WAVE_ENEMY_BASE + (this.currentWave - 1) * WAVE_ENEMY_SCALE;
    this.enemiesSpawned = 0;
    this.enemiesRemaining = this.enemiesPerWave;
    this.spawnTimer = 0;
    this.callbacks.onWaveStart(this.currentWave);
  }

  private gameLoop() {
    if (!this.running || this.gameOver) return;
    const dt = this.engine.getDeltaTime() / 1000;

    // Player update
    this.player.update(dt);

    // Auto-fire
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 1 / BASE_FIRE_RATE;
      const pos = this.player.getPosition().clone();
      pos.z += PLAYER_SIZE;
      this.projectiles.push(new Projectile(this.scene, pos, 10));
    }

    // Projectile update
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (!p.active) {
        p.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // Enemy spawning
    if (this.enemiesSpawned < this.enemiesPerWave) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnTimer = 0.8 - Math.min(0.5, this.currentWave * 0.03);
      }
    }

    // Enemy update
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (!e.active) {
        e.dispose();
        this.enemies.splice(i, 1);
        continue;
      }
      // Check collision with player
      const dist = Vector3.Distance(e.mesh.position, this.player.mesh.position);
      if (dist < (e.def.size + PLAYER_SIZE) * 0.5) {
        const dead = this.player.takeDamage(e.damage);
        this.callbacks.onPlayerDamaged(this.player.hp, this.player.maxHp);
        e.active = false;
        e.dispose();
        this.enemies.splice(i, 1);
        this.enemiesRemaining--;
        if (dead) {
          this.gameOver = true;
          this.callbacks.onPlayerDied();
          return;
        }
      }
    }

    // Collision: bullets vs enemies
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const p = this.projectiles[pi];
      if (!p.active) continue;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e.active) continue;
        const dist = Vector3.Distance(p.mesh.position, e.mesh.position);
        if (dist < e.def.size * 0.6) {
          p.active = true;
          const killed = e.takeDamage(p.damage);
          p.active = false;
          p.dispose();
          this.projectiles.splice(pi, 1);
          if (killed) {
            this.score += e.def.xpReward;
            this.callbacks.onEnemyKilled(e.def.xpReward, e.def.goldReward);
            this.callbacks.onScoreUpdate(this.score);
            e.dispose();
            this.enemies.splice(ei, 1);
            this.enemiesRemaining--;
          }
          break;
        }
      }
    }

    // Check wave complete
    if (this.enemiesRemaining <= 0 && this.enemiesSpawned >= this.enemiesPerWave) {
      this.callbacks.onWaveComplete(this.currentWave);
      this.currentWave++;
      this.startWave();
    }

    this.scene.render();
  }

  private spawnEnemy() {
    const isBoss = this.currentWave % BOSS_WAVE_INTERVAL === 0;
    let def;
    if (isBoss) {
      def = ENEMIES.find(e => e.type === 'boss')!;
    } else {
      const rand = Math.random();
      if (rand < 0.6) def = ENEMIES.find(e => e.type === 'basic')!;
      else if (rand < 0.85) def = ENEMIES.find(e => e.type === 'fast')!;
      else def = ENEMIES.find(e => e.type === 'tank')!;
    }
    // Scale HP with wave
    const scaledDef = { ...def, hp: Math.floor(def.hp * (1 + (this.currentWave - 1) * 0.1)) };
    const x = (Math.random() - 0.5) * (GAME_WIDTH - 2);
    const z = GAME_HEIGHT / 2 + 1;
    this.enemies.push(new Enemy(this.scene, scaledDef, x, z));
    this.enemiesSpawned++;
  }

  stop() {
    this.running = false;
    this.engine.stopRenderLoop();
  }

  resize() {
    this.engine.resize();
  }

  dispose() {
    this.stop();
    this.input.dispose();
    for (const p of this.projectiles) p.dispose();
    for (const e of this.enemies) e.dispose();
    this.player.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  getScore(): number { return this.score; }
  getCurrentWave(): number { return this.currentWave; }
  getPlayerHp(): number { return this.player.hp; }
  getPlayerMaxHp(): number { return this.player.maxHp; }
}
