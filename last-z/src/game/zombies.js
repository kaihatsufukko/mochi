// 道中ゾンビ: LEVEL.zombiePacks から生成される小集団。
// 描画は horde.js と同方式の InstancedMesh 2つ (合成ジオメトリの胴体 + blob shadow)。
// 契約 (docs/architecture.md §4 §7 §8):
//  - HP GAME.zombieHp(3)。弾命中で生存なら 'zombie_hit'、死亡なら 'zombie_death'。
//  - 接触(0.55)で ctx.squad.remove(GAME.zombieContactLoss,'zombie') + ゾンビ即死('zombie_death')。
//  - 'explosion' {pos, radius} 購読で範囲内即死(各 'zombie_death')。
// パフォーマンス: 個体データはプレーン配列、フレーム内で Vector3/Matrix4 の新規生成なし。
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';
import { LEVEL } from './level.js';

const ACTIVATE_DIST = 18;   // |zombieZ - playerZ| < 18 で起動
const WALK_SPEED = 3.2;     // u/s
const CONTACT_DIST = 0.55;
const CLAMP_X = 4.2;        // 橋幅 clamp
const HIT_RADIUS = 0.5;
const DEATH_TIME = 0.15;    // s (縮小トゥイーン)

const STATE_ALIVE = 0;
const STATE_DYING = 1;
const STATE_DEAD = 2;

// 決定的擬似乱数 (インデックスベース)
function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// 胴体+頭+両腕を1ジオメトリに手動マージ (non-indexed 連結、examples 依存なし)。
// 旧 Group 構成のローカル変換 (腕の前突き出し -1.2 rad、全体前傾 0.18 rad) をベイク。
function buildBodyGeometry() {
  const parts = [];
  const body = new THREE.BoxGeometry(0.4, 0.62, 0.26);
  body.translate(0, 0.55, 0);
  parts.push(body);
  const head = new THREE.BoxGeometry(0.26, 0.24, 0.24);
  head.translate(0, 0.98, 0);
  parts.push(head);
  const armL = new THREE.BoxGeometry(0.09, 0.4, 0.09);
  armL.rotateX(-1.2);
  armL.translate(-0.26, 0.62, 0.14);
  parts.push(armL);
  const armR = new THREE.BoxGeometry(0.09, 0.4, 0.09);
  armR.rotateX(-1.2);
  armR.translate(0.26, 0.62, 0.14);
  parts.push(armR);

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
  geo.rotateX(0.18); // 少し前傾 (旧 bodyGroup.rotation.x)
  for (const g of parts) g.dispose();
  for (const g of nonIndexed) g.dispose();
  return geo;
}

export class Zombies {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this._disposed = false;
    this._time = 0;

    // --- 決定的配置 (LEVEL.zombiePacks、黄金角散布) ---
    let n = 0;
    for (const pack of LEVEL.zombiePacks) n += pack.count;
    this.count = n;
    this._alive = n;

    // --- 個体データ (プレーン配列) ---
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.hp = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.yaw = new Float32Array(n);
    this.deathT = new Float32Array(n);
    this.state = new Uint8Array(n);  // STATE_*
    this.active = new Uint8Array(n); // 起動フラグ

    let gi = 0; // グローバルインデックス (決定的散布用)
    for (const pack of LEVEL.zombiePacks) {
      for (let k = 0; k < pack.count; k++) {
        const ang = gi * 2.3999632; // 黄金角
        const rad = 0.5 + hash(gi) * 1.5; // 半径 ~2 に散らす
        this.x[gi] = THREE.MathUtils.clamp(pack.x + Math.cos(ang) * rad, -CLAMP_X, CLAMP_X);
        this.z[gi] = pack.z + Math.sin(ang) * rad;
        this.hp[gi] = GAME.zombieHp;
        this.phase[gi] = hash(gi + 1000) * Math.PI * 2; // bob 位相オフセット
        this.state[gi] = STATE_ALIVE;
        gi++;
      }
    }

    // --- InstancedMesh x2: 胴体 (合成ジオメトリ) + blob shadow ---
    this.bodyGeo = buildBodyGeometry();
    this.bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.zombie });
    this.bodyMesh = new THREE.InstancedMesh(this.bodyGeo, this.bodyMat, n);
    this.bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodyMesh.frustumCulled = false;
    scene.add(this.bodyMesh);

    this.shadowGeo = new THREE.CircleGeometry(0.3, 10);
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
    this._writeMatrices();

    // 爆発による範囲即死
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

  // onHit クロージャは一度だけ生成 (弾側から呼ばれる)
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

      // 起動判定
      if (!this.active[i] && Math.abs(this.z[i] - pz) < ACTIVATE_DIST) this.active[i] = 1;

      if (this.active[i]) {
        const dx = px - this.x[i];
        const dz = pz - this.z[i];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1e-4) {
          const step = WALK_SPEED * dt;
          this.x[i] += (dx / dist) * step;
          this.z[i] += (dz / dist) * step;
          this.x[i] = THREE.MathUtils.clamp(this.x[i], -CLAMP_X, CLAMP_X);
          this.yaw[i] = Math.atan2(dx, dz); // プレイヤー方向を向く
        }
        // 接触: 部隊 -1、ゾンビ即死
        if (dist < CONTACT_DIST) {
          ctx.squad.remove(GAME.zombieContactLoss, 'zombie');
          this._kill(i);
          continue;
        }
      }

      // ターゲット pos 同期 (参照渡し)
      this.targets[i].pos.set(this.x[i], 0.5, this.z[i]);
    }

    this._writeMatrices(ctx.playerZ);
  }

  _writeMatrices(pz) {
    const m = this._tmpMat;
    const p = this._tmpPos;
    const q = this._tmpQuat;
    const s = this._tmpScale;
    const e = this._tmpEuler;
    const time = this._time;

    if (!this._deadWritten) this._deadWritten = new Uint8Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const st = this.state[i];
      // CPU節約: 死亡確定後は一度だけ0行列を書き、遠方(霧の彼方)の待機個体は書き換えない
      if (st === STATE_DEAD && this._deadWritten[i]) continue;
      if (st === STATE_ALIVE && !this.active[i] && pz !== undefined && Math.abs(this.z[i] - pz) > 55) continue;
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

      // 歩行 bob (位相オフセット) / 待機ゆらゆら
      const bob = this.active[i]
        ? Math.abs(Math.sin(time * 8 + this.phase[i])) * 0.07
        : Math.sin(time * 2 + this.phase[i]) * 0.02;

      e.set(0, this.yaw[i], 0);
      q.setFromEuler(e);
      s.set(scale, scale, scale);

      p.set(this.x[i], bob, this.z[i]);
      m.compose(p, q, s);
      this.bodyMesh.setMatrixAt(i, m);

      // 影は地面に貼り付け (world y = 0.01)
      p.set(this.x[i], 0.01, this.z[i]);
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
