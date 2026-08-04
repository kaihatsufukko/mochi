// src/game/obstacles.js — 氷壁 / 爆発バレル / 支援物資
// architecture.md §4 §7 §8 §11 準拠。LEVEL.iceWalls / barrels / supplies から生成。
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';
import { LEVEL } from './level.js';

const FLASH_TIME = 0.1;         // ヒットフラッシュ秒
const SHARD_LIFE = 0.5;         // 氷片パーティクル寿命
const EXPLOSION_VIS_TIME = 0.25; // 爆発球の膨張時間
const CHAIN_DELAY = 0.15;       // バレル誘爆遅延
const SUPPLY_PICK_DIST = 0.9;   // 物資取得距離
const WALL_CONTACT_DZ = 0.9;    // 氷壁接触 z 判定
const WALL_CONTACT_PAD = 0.3;   // 氷壁接触 x パディング
const SHADOW_OPACITY = 0.35;

export class Obstacles {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;

    // --- 共有ジオメトリ/マテリアル ---
    this._shadowGeo = new THREE.CircleGeometry(1, 20);
    this._shadowMat = new THREE.MeshBasicMaterial({
      color: COLORS.shadow,
      transparent: true,
      opacity: SHADOW_OPACITY,
      depthWrite: false,
    });
    this._chunkGeo = new THREE.BoxGeometry(1, 1, 1); // 氷塊/氷片で使い回し
    this._barrelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 14);
    this._supplyGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    this._supplyMat = new THREE.MeshLambertMaterial({ color: COLORS.supply });
    this._boomGeo = new THREE.SphereGeometry(1, 16, 12);

    // --- 氷壁 ---
    this.walls = LEVEL.iceWalls.map((w) => this._createWall(w));
    // --- バレル ---
    this.barrels = LEVEL.barrels.map((b) => this._createBarrel(b));
    // --- 支援物資 ---
    this.supplies = LEVEL.supplies.map((s) => this._createSupply(s));

    // 氷片パーティクル・爆発球・誘爆キュー
    this._shards = [];      // {mesh, vel:Vector3, life, active}
    this._booms = [];       // {mesh, mat, t, radius, active}
    this._pendingChain = []; // {barrel, t}
    this._time = 0;
  }

  // ---- 生成 ----

  _createWall(def) {
    const mat = new THREE.MeshLambertMaterial({
      color: COLORS.ice,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(def.halfW * 2, 1.6, 1.2),
      mat
    );
    body.position.y = 0.8;
    group.add(body);
    // 上に小さい氷塊を3個
    const tops = [
      [-def.halfW * 0.5, 1.75, 0.1, 0.5],
      [def.halfW * 0.4, 1.85, -0.15, 0.6],
      [0.1, 1.7, 0.2, 0.4],
    ];
    for (const [tx, ty, tz, sc] of tops) {
      const c = new THREE.Mesh(this._chunkGeo, mat);
      c.position.set(tx, ty, tz);
      c.scale.set(sc, sc * 0.7, sc * 0.8);
      c.rotation.y = tx * 1.3;
      group.add(c);
    }
    group.position.set(def.x, 0, def.z);
    const shadow = this._makeShadow(def.x, def.z, def.halfW * 1.05, 0.75);
    this.scene.add(group);
    return {
      def,
      group,
      mat,
      shadow,
      bodyGeo: body.geometry,
      pos: new THREE.Vector3(def.x, 0.8, def.z),
      hp: GAME.iceWallHp,
      alive: true,
      flashT: 0,
      target: null, // 下で構築
    };
  }

  _createBarrel(def) {
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.barrel });
    const mesh = new THREE.Mesh(this._barrelGeo, mat);
    mesh.position.set(def.x, 0.35, def.z);
    const shadow = this._makeShadow(def.x, def.z, 0.55, 0.55);
    this.scene.add(mesh);
    return {
      def,
      mesh,
      mat,
      shadow,
      pos: new THREE.Vector3(def.x, 0.35, def.z),
      hp: GAME.barrelHp,
      alive: true,
      flashT: 0,
    };
  }

  _createSupply(def) {
    const mesh = new THREE.Mesh(this._supplyGeo, this._supplyMat);
    mesh.position.set(def.x, 0.6, def.z);
    const shadow = this._makeShadow(def.x, def.z, 0.45, 0.45);
    this.scene.add(mesh);
    return {
      def,
      mesh,
      shadow,
      alive: true,
      spin: Math.random() * Math.PI * 2,
    };
  }

  _makeShadow(x, z, sx, sz) {
    const m = new THREE.Mesh(this._shadowGeo, this._shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    m.scale.set(sx, sz, 1);
    this.scene.add(m);
    return m;
  }

  // ---- 更新 ----

  update(dt, ctx) {
    this.ctx = ctx;
    this._time += dt;
    const px = ctx.playerX ?? 0;
    const pz = ctx.playerZ ?? 0;

    // 氷壁: フラッシュ減衰 + プレイヤー接触
    for (const w of this.walls) {
      if (!w.alive) continue;
      if (w.flashT > 0) {
        w.flashT -= dt;
        w.mat.opacity = w.flashT > 0 ? 0.85 : 0.55;
      }
      const dz = Math.abs(pz - w.def.z);
      const dx = Math.abs(px - w.def.x);
      if (dz < WALL_CONTACT_DZ && dx < w.def.halfW + WALL_CONTACT_PAD) {
        // 接触破壊: 1壁1回のみ (alive=false で以後判定されない)
        this._breakWall(w);
        if (ctx.squad) ctx.squad.remove(GAME.iceWallContactLoss, 'ice');
      }
    }

    // バレル: フラッシュ減衰
    for (const b of this.barrels) {
      if (!b.alive) continue;
      if (b.flashT > 0) {
        b.flashT -= dt;
        b.mat.emissive.setScalar(b.flashT > 0 ? 0.5 : 0);
      }
    }

    // 誘爆キュー
    if (this._pendingChain.length > 0) {
      for (let i = this._pendingChain.length - 1; i >= 0; i--) {
        const p = this._pendingChain[i];
        p.t -= dt;
        if (p.t <= 0) {
          this._pendingChain.splice(i, 1);
          if (p.barrel.alive) this._explodeBarrel(p.barrel);
        }
      }
    }

    // 支援物資: 回転 + 浮遊 + 取得判定
    for (const s of this.supplies) {
      if (!s.alive) continue;
      s.spin += dt * 1.6;
      s.mesh.rotation.y = s.spin;
      s.mesh.position.y = 0.6 + Math.sin(this._time * 2.4 + s.spin) * 0.12;
      const dx = px - s.def.x;
      const dz = pz - s.def.z;
      if (dx * dx + dz * dz < SUPPLY_PICK_DIST * SUPPLY_PICK_DIST) {
        s.alive = false;
        s.mesh.visible = false;
        s.shadow.visible = false;
        // 音は squad.add 内の squad_gain に任せる
        if (ctx.squad) ctx.squad.add(GAME.supplyGain, 'supply');
      }
    }

    // 氷片パーティクル
    for (const sh of this._shards) {
      if (!sh.active) continue;
      sh.life -= dt;
      if (sh.life <= 0) {
        sh.active = false;
        sh.mesh.visible = false;
        continue;
      }
      sh.vel.y -= 12 * dt; // 簡易重力の放物線
      sh.mesh.position.addScaledVector(sh.vel, dt);
      sh.mesh.rotation.x += dt * 6;
      sh.mesh.rotation.z += dt * 4;
      const k = Math.max(0.05, sh.life / SHARD_LIFE);
      sh.mesh.scale.setScalar(sh.size * k);
    }

    // 爆発球
    for (const bm of this._booms) {
      if (!bm.active) continue;
      bm.t += dt;
      const u = bm.t / EXPLOSION_VIS_TIME;
      if (u >= 1) {
        bm.active = false;
        bm.mesh.visible = false;
        continue;
      }
      bm.mesh.scale.setScalar(Math.max(0.001, bm.radius * u));
      bm.mat.opacity = 0.85 * (1 - u);
    }
  }

  // ---- 弾ターゲット登録 ----

  collectTargets(out) {
    for (const w of this.walls) {
      if (!w.alive) continue;
      if (!w.target) {
        w.target = {
          kind: 'ice',
          pos: w.pos,
          radius: w.def.halfW + 0.2,
          onHit: () => this._hitWall(w),
        };
      }
      out.push(w.target);
    }
    for (const b of this.barrels) {
      if (!b.alive) continue;
      if (!b.target) {
        b.target = {
          kind: 'barrel',
          pos: b.pos,
          radius: 0.6,
          onHit: () => this._hitBarrel(b),
        };
      }
      out.push(b.target);
    }
    // 支援物資は弾対象にしない
  }

  // ---- 被弾/破壊 ----

  _hitWall(w) {
    if (!w.alive) return;
    w.hp -= 1;
    w.flashT = FLASH_TIME; // 被弾音はなし・フラッシュのみ
    w.mat.opacity = 0.85;
    if (w.hp <= 0) this._breakWall(w); // 射撃破壊: 部隊ダメージなし
  }

  // 破壊共通: ice_crash + 氷片 + 消滅
  _breakWall(w) {
    if (!w.alive) return;
    w.alive = false;
    w.group.visible = false;
    w.shadow.visible = false;
    if (this.ctx.audio) this.ctx.audio.play('ice_crash');
    this._spawnShards(w.def.x, 1.0, w.def.z, 7, COLORS.ice);
  }

  _hitBarrel(b) {
    if (!b.alive) return;
    b.hp -= 1;
    b.flashT = FLASH_TIME; // 被弾音なし・フラッシュのみ
    b.mat.emissive.setScalar(0.5);
    if (b.hp <= 0) this._explodeBarrel(b);
  }

  _explodeBarrel(b) {
    if (!b.alive) return;
    b.alive = false;
    b.mesh.visible = false;
    b.shadow.visible = false;
    const ctx = this.ctx;
    if (ctx.audio) ctx.audio.play('barrel_explode');
    if (ctx.events) {
      ctx.events.emit('explosion', {
        pos: b.pos.clone(),
        radius: GAME.barrelRadius,
      });
    }
    this._spawnBoom(b.def.x, 0.6, b.def.z, GAME.barrelRadius);
    const r2 = GAME.barrelRadius * GAME.barrelRadius;
    // 半径内の他バレルは誘爆 (0.15s 遅延)
    for (const other of this.barrels) {
      if (!other.alive || other === b) continue;
      const dx = other.def.x - b.def.x;
      const dz = other.def.z - b.def.z;
      if (dx * dx + dz * dz <= r2) {
        this._pendingChain.push({ barrel: other, t: CHAIN_DELAY });
      }
    }
    // 半径内の氷壁は破壊 (ice_crash 発火・部隊ダメージなし)
    for (const w of this.walls) {
      if (!w.alive) continue;
      const dx = w.def.x - b.def.x;
      const dz = w.def.z - b.def.z;
      if (dx * dx + dz * dz <= r2) this._breakWall(w);
    }
  }

  // ---- パーティクル ----

  _spawnShards(x, y, z, count, color) {
    for (let i = 0; i < count; i++) {
      let sh = this._shards.find((s) => !s.active);
      if (!sh) {
        const mat = new THREE.MeshLambertMaterial({ color });
        sh = {
          mesh: new THREE.Mesh(this._chunkGeo, mat),
          vel: new THREE.Vector3(),
          life: 0,
          size: 0.2,
          active: false,
        };
        this.scene.add(sh.mesh);
        this._shards.push(sh);
      }
      sh.active = true;
      sh.life = SHARD_LIFE;
      sh.size = 0.14 + Math.random() * 0.14;
      sh.mesh.visible = true;
      sh.mesh.material.color.set(color);
      sh.mesh.position.set(
        x + (Math.random() - 0.5) * 1.6,
        y + Math.random() * 0.6,
        z + (Math.random() - 0.5) * 0.8
      );
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3;
      sh.vel.set(Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp);
      sh.mesh.scale.setScalar(sh.size);
    }
  }

  _spawnBoom(x, y, z, radius) {
    let bm = this._booms.find((b) => !b.active);
    if (!bm) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff9a2e,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      bm = { mesh: new THREE.Mesh(this._boomGeo, mat), mat, t: 0, radius, active: false };
      this.scene.add(bm.mesh);
      this._booms.push(bm);
    }
    bm.active = true;
    bm.t = 0;
    bm.radius = radius;
    bm.mat.opacity = 0.85;
    bm.mesh.visible = true;
    bm.mesh.position.set(x, y, z);
    bm.mesh.scale.setScalar(0.001);
  }

  // ---- デバッグ ----

  state() {
    return {
      walls: this.walls.map((w) => ({ z: w.def.z, x: w.def.x, alive: w.alive })),
      barrels: this.barrels.map((b) => ({ z: b.def.z, x: b.def.x, alive: b.alive })),
      supplies: this.supplies.map((s) => ({ z: s.def.z, x: s.def.x, alive: s.alive })),
    };
  }

  dispose() {
    for (const w of this.walls) {
      this.scene.remove(w.group);
      this.scene.remove(w.shadow);
      w.bodyGeo.dispose();
      w.mat.dispose();
    }
    for (const b of this.barrels) {
      this.scene.remove(b.mesh);
      this.scene.remove(b.shadow);
      b.mat.dispose();
    }
    for (const s of this.supplies) {
      this.scene.remove(s.mesh);
      this.scene.remove(s.shadow);
    }
    for (const sh of this._shards) {
      this.scene.remove(sh.mesh);
      sh.mesh.material.dispose();
    }
    for (const bm of this._booms) {
      this.scene.remove(bm.mesh);
      bm.mat.dispose();
    }
    this.walls.length = 0;
    this.barrels.length = 0;
    this.supplies.length = 0;
    this._shards.length = 0;
    this._booms.length = 0;
    this._pendingChain.length = 0;
    this._shadowGeo.dispose();
    this._shadowMat.dispose();
    this._chunkGeo.dispose();
    this._barrelGeo.dispose();
    this._supplyGeo.dispose();
    this._supplyMat.dispose();
    this._boomGeo.dispose();
  }
}
