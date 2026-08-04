// 終盤100体大群。InstancedMesh 2つ (胴体 + blob shadow) で描画。
// 契約 (docs/architecture.md §4 §7 §8):
//  - HP GAME.hordeZombieHp(2)。弾命中で生存なら 'zombie_hit'、死亡なら 'zombie_death'。
//  - activate() 後、各個体 3.8〜4.6 u/s でプレイヤーへ殺到。接触(0.55)で squad.remove(1,'zombie') + 個体死亡。
//  - 'explosion' {pos, radius} 購読で範囲即死。
// パフォーマンス: 個体データはプレーン配列、フレーム内で Vector3/Matrix4 の新規生成なし。
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';
import { LEVEL } from './level.js';

const CONTACT_DIST = 0.55;
const CLAMP_X = 4.2;
const HIT_RADIUS = 0.5;
const DEATH_TIME = 0.15;

const STATE_ALIVE = 0;
const STATE_DYING = 1;
const STATE_DEAD = 2;

function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// 胴体+頭を1ジオメトリに手動マージ (non-indexed 連結、examples 依存なし)
function buildBodyGeometry() {
  const parts = [];
  const body = new THREE.BoxGeometry(0.4, 0.62, 0.26);
  body.translate(0, 0.55, 0);
  parts.push(body);
  const head = new THREE.BoxGeometry(0.26, 0.24, 0.24);
  head.translate(0, 0.98, 0);
  parts.push(head);

  let posLen = 0;
  const nonIndexed = parts.map((g) => {
    const ni = g.toNonIndexed();
    posLen += ni.attributes.position.count;
    return ni;
  });
  const pos = new Float32Array(posLen * 3);
  const nor = new Float32Array(posLen * 3);
  let off = 0;
  for (const g of nonIndexed) {
    pos.set(g.attributes.position.array, off);
    nor.set(g.attributes.normal.array, off);
    off += g.attributes.position.array.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.rotateX(0.18); // 前傾 (ローカル +Z = 進行方向)
  for (const g of parts) g.dispose();
  for (const g of nonIndexed) g.dispose();
  return geo;
}

export class Horde {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this._disposed = false;
    this._activated = false;
    this._time = 0;

    const n = GAME.hordeCount;
    this.count = n;
    this._alive = n;

    // --- 個体データ (プレーン配列) ---
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.hp = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.deathT = new Float32Array(n);
    this.state = new Uint8Array(n); // STATE_*

    // 配置: hordeZ 前方 (hordeZ-4 〜 hordeZ-26) に幅±4の楕円ブロブ (黄金角スパイラル、決定的)
    const cz = LEVEL.hordeZ - 15;
    for (let i = 0; i < n; i++) {
      const t = Math.sqrt((i + 0.5) / n);
      const ang = i * 2.3999632;
      this.x[i] = THREE.MathUtils.clamp(t * 4 * Math.cos(ang) + (hash(i) - 0.5) * 0.5, -4, 4);
      this.z[i] = THREE.MathUtils.clamp(cz + t * 11 * Math.sin(ang) + (hash(i + 500) - 0.5) * 0.8, LEVEL.hordeZ - 26, LEVEL.hordeZ - 4);
      this.hp[i] = GAME.hordeZombieHp;
      this.speed[i] = 3.8 + hash(i + 1000) * 0.8; // 3.8〜4.6 u/s 個体差
      this.phase[i] = hash(i + 2000) * Math.PI * 2;
      this.state[i] = STATE_ALIVE;
    }

    // --- InstancedMesh x2: 胴体 + blob shadow ---
    this.bodyGeo = buildBodyGeometry();
    this.bodyMat = new THREE.MeshLambertMaterial({ color: 0x59763f }); // COLORS.zombie をやや暗く
    this.bodyMesh = new THREE.InstancedMesh(this.bodyGeo, this.bodyMat, n);
    this.bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodyMesh.frustumCulled = false;
    scene.add(this.bodyMesh);

    this.shadowGeo = new THREE.CircleGeometry(0.3, 12);
    this.shadowGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: COLORS.shadow, transparent: true, opacity: 0.35, depthWrite: false,
    });
    this.shadowMesh = new THREE.InstancedMesh(this.shadowGeo, this.shadowMat, n);
    this.shadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadowMesh.frustumCulled = false;
    scene.add(this.shadowMesh);

    // --- 使い回し temp (フレーム内 new 禁止) ---
    this._tmpMat = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();
    this._identQuat = new THREE.Quaternion();

    // ターゲットオブジェクトは個体ごとに一度だけ生成 (pos は毎フレーム同期する参照 Vector3)
    this.targets = new Array(n);
    for (let i = 0; i < n; i++) {
      const pos = new THREE.Vector3(this.x[i], 0.5, this.z[i]);
      this.targets[i] = {
        kind: 'zombie',
        pos,
        radius: HIT_RADIUS,
        onHit: this._makeOnHit(i),
      };
    }

    // 初期行列を書き込む
    this._writeMatrices(0);

    this._onExplosion = ({ pos, radius }) => {
      if (this._disposed) return;
      const r2 = radius * radius;
      for (let i = 0; i < this.count; i++) {
        if (this.state[i] !== STATE_ALIVE) continue;
        const dx = this.x[i] - pos.x;
        const dz = this.z[i] - pos.z;
        if (dx * dx + dz * dz <= r2) this._kill(i);
      }
    };
    ctx.events.on('explosion', this._onExplosion);
  }

  _makeOnHit(i) {
    return (dmg) => {
      if (this.state[i] !== STATE_ALIVE) return false;
      this.hp[i] -= dmg;
      if (this.hp[i] > 0) {
        this.ctx.audio.play('zombie_hit');
      } else {
        this._kill(i);
      }
      return true; // 弾消費
    };
  }

  _kill(i) {
    if (this.state[i] !== STATE_ALIVE) return;
    this.state[i] = STATE_DYING;
    this.deathT[i] = 0;
    this._alive--;
    this.ctx.audio.play('zombie_death');
  }

  activate() {
    this._activated = true;
  }

  get activated() {
    return this._activated;
  }

  update(dt, ctx) {
    this.ctx = ctx;
    this._time += dt;
    const px = ctx.playerX;
    const pz = ctx.playerZ;

    for (let i = 0; i < this.count; i++) {
      const st = this.state[i];
      if (st === STATE_DEAD) continue;
      if (st === STATE_DYING) {
        this.deathT[i] += dt;
        if (this.deathT[i] >= DEATH_TIME) this.state[i] = STATE_DEAD;
        continue;
      }
      if (this._activated) {
        const dx = px - this.x[i];
        const dz = pz - this.z[i];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1e-4) {
          const step = this.speed[i] * dt;
          this.x[i] += (dx / dist) * step;
          this.z[i] += (dz / dist) * step;
          if (this.x[i] > CLAMP_X) this.x[i] = CLAMP_X;
          else if (this.x[i] < -CLAMP_X) this.x[i] = -CLAMP_X;
        }
        if (dist < CONTACT_DIST) {
          ctx.squad.remove(GAME.zombieContactLoss, 'zombie');
          this._kill(i);
          continue;
        }
      }
      // ターゲット pos 同期 (参照渡し)
      this.targets[i].pos.set(this.x[i], 0.5, this.z[i]);
    }

    // プレイヤーから遠い間 (霧の彼方で不可視) は行列書き換えをスキップして CPU を節約。
    // 初回だけは初期配置を書き込む。
    const nearestDz = Math.abs(pz - (this.z[0] !== undefined ? this._nearestZ() : pz));
    if (!this._activated && nearestDz > 60) {
      if (!this._wroteOnce) {
        this._writeMatrices(this._time, px, pz);
        this._wroteOnce = true;
      }
      return;
    }
    this._writeMatrices(this._time, px, pz);
  }

  _nearestZ() {
    // 大群は手前側 (z最大) がプレイヤーに最も近い
    if (this._maxZ === undefined) {
      let mz = -Infinity;
      for (let i = 0; i < this.count; i++) if (this.z[i] > mz) mz = this.z[i];
      this._maxZ = mz;
    }
    return this._maxZ;
  }

  _writeMatrices(time, px, pz) {
    const m = this._tmpMat;
    const p = this._tmpPos;
    const q = this._tmpQuat;
    const s = this._tmpScale;
    const e = this._tmpEuler;
    const hasPlayer = px !== undefined;

    if (!this._deadWritten) this._deadWritten = new Uint8Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const st = this.state[i];
      // CPU節約: 死亡確定後は一度だけ0行列を書き、以後スキップ
      if (st === STATE_DEAD && this._deadWritten[i]) continue;
      let scale = 1;
      if (st === STATE_DYING) scale = Math.max(0, 1 - this.deathT[i] / DEATH_TIME);
      else if (st === STATE_DEAD) scale = 0;

      if (scale <= 0) {
        s.set(0, 0, 0);
        p.set(this.x[i], 0, this.z[i]);
        m.compose(p, this._identQuat, s);
        this.bodyMesh.setMatrixAt(i, m);
        this.shadowMesh.setMatrixAt(i, m);
        if (st === STATE_DEAD) this._deadWritten[i] = 1;
        continue;
      }

      // 歩行 bob / 待機ゆらゆら
      let bx = this.x[i];
      let by;
      if (this._activated) {
        by = Math.abs(Math.sin(time * 9 + this.phase[i])) * 0.08;
      } else {
        by = Math.sin(time * 2 + this.phase[i]) * 0.025;
        bx += Math.sin(time * 1.4 + this.phase[i]) * 0.06;
      }

      // プレイヤー方向へ yaw (待機中は +Z = プレイヤー側を向く)
      let yaw = 0;
      if (this._activated && hasPlayer) {
        yaw = Math.atan2(px - this.x[i], pz - this.z[i]);
      }
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      s.set(scale, scale, scale);

      p.set(bx, by, this.z[i]);
      m.compose(p, q, s);
      this.bodyMesh.setMatrixAt(i, m);

      p.set(bx, 0.01, this.z[i]);
      m.compose(p, this._identQuat, s);
      this.shadowMesh.setMatrixAt(i, m);
    }
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.shadowMesh.instanceMatrix.needsUpdate = true;
  }

  collectTargets(out) {
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] === STATE_ALIVE) out.push(this.targets[i]);
    }
  }

  aliveCount() {
    return this._alive;
  }

  dispose() {
    this._disposed = true;
    if (this.ctx.events.off) this.ctx.events.off('explosion', this._onExplosion);
    this.scene.remove(this.bodyMesh);
    this.scene.remove(this.shadowMesh);
    this.bodyMesh.dispose();
    this.shadowMesh.dispose();
    this.bodyGeo.dispose();
    this.shadowGeo.dispose();
    this.bodyMat.dispose();
    this.shadowMat.dispose();
  }
}
