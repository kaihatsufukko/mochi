// Last Z — エンジン統合 + ステージ進行
import * as THREE from 'three';
import { COLORS, GAME } from './game/constants.js';
import { LEVEL } from './game/level.js';
import { EventBus } from './core/events.js';
import { DragInput } from './core/input.js';
import { ChaseCamera, fitFrame } from './core/camera.js';
import { audio } from './audio/AudioManager.js';
import { initDebugPanel } from './ui/DebugPanel.js';
import { HUD } from './ui/HUD.js';
import { Squad } from './game/squad.js';
import { Bullets } from './game/bullets.js';
import { Zombies } from './game/zombies.js';
import { Horde } from './game/horde.js';
import { Gates } from './game/gates.js';
import { Obstacles } from './game/obstacles.js';
import { Boss } from './game/boss.js';

const frame = document.getElementById('frame');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
frame.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 38, 76);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(4, 12, 6);
scene.add(sun);

// ---- 橋 ----
{
  const len = LEVEL.startZ - LEVEL.endZ + 80;
  const midZ = (LEVEL.startZ + LEVEL.endZ) / 2 - 20;
  // 橋は単色フラットなので Basic (ライティング計算を省き大画面フィルを軽く)
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(GAME.bridgeHalfWidth * 2, 0.6, len),
    new THREE.MeshBasicMaterial({ color: COLORS.bridge })
  );
  deck.position.set(0, -0.3, midZ);
  scene.add(deck);
  const edgeMat = new THREE.MeshBasicMaterial({ color: COLORS.bridgeEdge });
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, len), edgeMat);
    rail.position.set(sx * (GAME.bridgeHalfWidth + 0.18), 0.25, midZ);
    scene.add(rail);
  }
  // 距離感を出す横筋 (1ドローコールに統合)
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x7c848f });
  const stripeGeo = new THREE.BoxGeometry(GAME.bridgeHalfWidth * 2, 0.02, 0.3);
  const nStripes = Math.ceil((LEVEL.startZ - LEVEL.endZ + 40) / 10);
  const stripes = new THREE.InstancedMesh(stripeGeo, stripeMat, nStripes);
  const sm = new THREE.Matrix4();
  for (let i = 0; i < nStripes; i++) {
    sm.makeTranslation(0, 0.011, LEVEL.startZ - i * 10);
    stripes.setMatrixAt(i, sm);
  }
  scene.add(stripes);
}

const events = new EventBus();
const hud = new HUD(frame);
initDebugPanel(frame, audio);
const chase = new ChaseCamera();
const input = new DragInput(frame);

const ctx = {
  playerX: 0,
  playerZ: LEVEL.startZ,
  phase: 'ready',
  audio, hud, events,
  level: LEVEL,
  scene,
  camera: chase.camera,
  squad: null,
  targets: [],
  worldToScreen(v) {
    const p = _wts.copy(v).project(chase.camera);
    return { x: (p.x * 0.5 + 0.5) * frame.clientWidth, y: (-p.y * 0.5 + 0.5) * frame.clientHeight };
  },
};
const _wts = new THREE.Vector3();

ctx.squad = new Squad(scene, ctx);
const bullets = new Bullets(scene, ctx);
const zombies = new Zombies(scene, ctx);
const horde = new Horde(scene, ctx);
const gates = new Gates(scene, ctx);
const obstacles = new Obstacles(scene, ctx);
const boss = new Boss(scene, ctx);

// ---- ステージ進行 ----
let bossOpenTimer = -1;   // boss_break 後の演出待ち
let ended = false;
let hordeStarted = false;

events.on('squadZero', () => {
  if (ended) return;
  ended = true;
  ctx.phase = 'gameover';
  audio.play('game_over');
  hud.banner('GAME OVER', 'over');
  hud.showRestart(() => location.reload());
});

events.on('bossDead', () => {
  bossOpenTimer = 2.0; // 2秒演出後に道が開く
});

function checkProgress(dt) {
  // 大群帯への接近を検知したら先制的に解像度を下げる (ソフトウェアレンダラのみ)。
  // 戦闘開始と同時の切替はスパイクを生むため手前で済ませる。
  // ボス撃破直後の軽い区間で切り替える (重い終盤区間・大群戦の最中に切替スパイクを出さない)
  if (!hordeStarted && isSoftwareGL && renderScale > 0.4 && ctx.playerZ <= LEVEL.hordeZ + 76) {
    renderScale = 0.4;
    applyRenderScale();
    scaleCooldown = 2.5;
  }
  if (ctx.phase === 'run') {
    if (boss.alive && ctx.playerZ <= LEVEL.bossZ + 14) {
      ctx.phase = 'boss';
      hud.showBoss(true);
      hud.setBossHp(boss.hp, GAME.bossHp);
      boss.activate();
    } else if (!hordeStarted && ctx.playerZ <= LEVEL.hordeZ + 16) {
      hordeStarted = true;
      ctx.phase = 'horde';
      // 大群戦は霧を少し奥へ引き、迫り来る大群の圧を見せる (全個体は45u以内)
      scene.fog.near = 48;
      scene.fog.far = 88;
      audio.play('horde_start');
      hud.banner('HORDE!', 'warn');
      horde.activate();
    }
  } else if (ctx.phase === 'boss') {
    if (bossOpenTimer > 0) {
      bossOpenTimer -= dt;
      if (bossOpenTimer <= 0) {
        hud.showBoss(false);
        ctx.phase = 'run';
      }
    }
  } else if (ctx.phase === 'horde') {
    if (!ended && horde.activated && horde.aliveCount() === 0) {
      ended = true;
      ctx.phase = 'clear';
      audio.play('stage_clear');
      hud.banner('STAGE CLEAR!', 'clear');
      hud.showRestart(() => location.reload());
    }
  }
}

// ---- メインループ ----
let timeScale = 1;
let last = performance.now();
const fpsBuf = [];
let fpsAvg = 60;

// 動的解像度: fps が落ちたら内部解像度を段階的に下げる (HUD数字はDOMなので常に鮮明)。
// SwiftShader 等のソフトウェアレンダラでも 55fps を維持するための標準的な適応品質制御。
const isSoftwareGL = (() => {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    return /swiftshader|llvmpipe|software/i.test(String(name));
  } catch { return false; }
})();
let renderScale = isSoftwareGL ? 0.6 : 1;
let scaleCooldown = 0;
function applyRenderScale() {
  const basePR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(basePR * renderScale);
}
function adaptQuality(dt) {
  scaleCooldown -= dt;
  if (scaleCooldown > 0 || fpsBuf.length < 45) return;
  if (fpsAvg < 57 && renderScale > 0.35) {
    renderScale = Math.max(0.35, renderScale - 0.2);
    applyRenderScale();
    scaleCooldown = 1.2;
  } else if (fpsAvg > 59.7 && renderScale < 1) {
    renderScale = Math.min(1, renderScale + 0.05);
    applyRenderScale();
    scaleCooldown = 5.0;
  }
}

// ワールド更新は毎フレーム1回 (行列書き込み等の重い処理を含む)。
// 弾のみ移動量が大きくトンネリングし得るため、サブステップで衝突判定する。
function step(dt) {
  // 入力 → 横移動
  ctx.playerX += (input.targetX - ctx.playerX) * Math.min(1, 12 * dt);

  // 前進
  if (ctx.phase === 'run') {
    ctx.playerZ -= GAME.forwardSpeed * dt;
  }

  ctx.squad.update(dt, ctx);
  zombies.update(dt, ctx);
  horde.update(dt, ctx);
  obstacles.update(dt, ctx);
  boss.update(dt, ctx);
  gates.update(dt, ctx);

  const targets = ctx.targets;
  targets.length = 0;
  zombies.collectTargets(targets);
  horde.collectTargets(targets);
  obstacles.collectTargets(targets);
  boss.collectTargets(targets);
  gates.collectTargets(targets, ctx);

  // 弾サブステップ (0.7u/step 以下で対ゾンビ半径0.61を跨がない)
  let remaining = dt;
  const maxStep = 1 / 40;
  let guard = 0;
  while (remaining > 1e-6 && guard < 24) {
    const s = Math.min(remaining, maxStep);
    bullets.update(s, ctx, targets);
    remaining -= s;
    guard++;
  }

  checkProgress(dt);
}

function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;

  // fps 計測 (実フレーム)
  fpsBuf.push(dt);
  if (fpsBuf.length > 60) fpsBuf.shift();
  const sum = fpsBuf.reduce((a, b) => a + b, 0);
  fpsAvg = fpsBuf.length / Math.max(1e-6, sum);

  if (ctx.phase !== 'ready' && ctx.phase !== 'clear' && ctx.phase !== 'gameover') {
    step(Math.min(dt * timeScale, 0.3));
  } else if (ctx.phase === 'clear' || ctx.phase === 'gameover') {
    // 終了後も隊列アニメだけ生かす
    ctx.squad.update(Math.min(dt, 0.05), ctx);
  }

  adaptQuality(dt);
  chase.update(ctx.playerX, ctx.playerZ);
  renderer.render(scene, chase.camera);
}

function onResize() { fitFrame(frame, renderer, chase.camera); applyRenderScale(); }
window.addEventListener('resize', onResize);
onResize();

function startGame() {
  if (ctx.phase !== 'ready') return;
  audio.resume();
  ctx.phase = 'run';
}
hud.showStart(startGame);

requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });

// ---- テスト用フック (削除禁止 / architecture.md §10) ----
window.__game = {
  version: 1,
  _scene: scene, // 検証/実験用
  _THREE: THREE,
  _renderer: renderer,
  state() {
    return {
      phase: ctx.phase,
      squad: ctx.squad.count,
      playerX: ctx.playerX,
      playerZ: ctx.playerZ,
      fps: fpsAvg,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      bossHp: boss.hp,
      bossMax: GAME.bossHp,
      hordeAlive: horde.aliveCount(),
      zombiesAlive: zombies.aliveCount(),
      gates: gates.state(),
      ...obstacles.state(),
    };
  },
  setTimeScale(k) { timeScale = Math.max(0.1, Math.min(8, k)); },
  teleport(z) { ctx.playerZ = z; },
  setSquad(n) { ctx.squad.setCountSilent(n); },
  dragTo(x) { input.setTarget(x); },
  setFire(b) { bullets.enabled = !!b; },
  killBoss() { boss.debugKill(); },
  start() { hud.hideStart(); },
  restart() { location.reload(); },
};
