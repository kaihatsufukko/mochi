// 弾: InstancedMesh プール + オート連射 + 命中判定（総当り距離二乗）
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';

const POOL = 320;
const _m = new THREE.Matrix4();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

export class Bullets {
  constructor(scene, ctx) {
    this.scene = scene;
    this.geo = new THREE.SphereGeometry(0.11, 4, 2);
    this.mat = new THREE.MeshBasicMaterial({ color: COLORS.bullet });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, POOL);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < POOL; i++) this.mesh.setMatrixAt(i, _zero);
    scene.add(this.mesh);

    // スロットデータ
    this.x = new Float32Array(POOL);
    this.z = new Float32Array(POOL);
    this.life = new Float32Array(POOL);
    this.dmg = new Float32Array(POOL);
    this.free = [];
    for (let i = POOL - 1; i >= 0; i--) this.free.push(i);
    this.activeIdx = [];
    this.cooldown = 0;
    this.enabled = true; // テスト用: __game.setFire(false) で連射停止
  }

  update(dt, ctx, targets) {
    this.cooldown -= dt;
    const firing = ctx.phase === 'run' || ctx.phase === 'boss' || ctx.phase === 'horde';
    if (firing && this.enabled && this.cooldown <= 0 && ctx.squad.count > 0) {
      this.cooldown = GAME.volleyInterval;
      // 火力 = 部隊数 は維持しつつ発射体数を集約:
      // 1斉射 = 最大 maxEmitters 発、1発ダメージ = ceil(部隊数 / 発数) → DPS ∝ 部隊数
      const origins = ctx.squad.soldierPositions();
      const n = Math.min(origins.length, GAME.maxEmitters);
      this.volleyDamage = Math.max(1, Math.round(ctx.squad.count / n));
      let fired = 0;
      for (let oi = 0; oi < n; oi++) {
        const p = origins[oi];
        const i = this.free.pop();
        if (i === undefined) break;
        this.x[i] = p.x;
        this.z[i] = p.z - 0.4;
        this.life[i] = GAME.bulletLife;
        this.dmg[i] = this.volleyDamage;
        this.activeIdx.push(i);
        fired++;
      }
      if (fired > 0) ctx.audio.play('shoot');
    }

    const speed = GAME.bulletSpeed;
    for (let k = this.activeIdx.length - 1; k >= 0; k--) {
      const i = this.activeIdx[k];
      this.z[i] -= speed * dt;
      this.life[i] -= dt;
      let dead = this.life[i] <= 0;
      if (!dead) {
        const bx = this.x[i], bz = this.z[i];
        for (let j = 0; j < targets.length; j++) {
          const t = targets[j];
          if (t.dead) continue;
          const dx = bx - t.pos.x;
          const dz = bz - t.pos.z;
          const r = t.radius + 0.11;
          if (dx * dx + dz * dz < r * r) {
            const consumed = t.onHit(this.dmg[i] || 1);
            if (consumed !== false) { dead = true; break; }
          }
        }
      }
      if (dead) {
        this.mesh.setMatrixAt(i, _zero);
        const last = this.activeIdx.pop();
        if (k < this.activeIdx.length) this.activeIdx[k] = last;
        this.free.push(i);
      } else {
        _m.makeTranslation(this.x[i], 0.65, this.z[i]);
        this.mesh.setMatrixAt(i, _m);
      }
    }
    // 描画レンジを実使用スロットに絞る (最大アクティブ添字+1)
    let maxIdx = -1;
    for (let k = 0; k < this.activeIdx.length; k++) {
      if (this.activeIdx[k] > maxIdx) maxIdx = this.activeIdx[k];
    }
    this.mesh.count = maxIdx + 1;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}
