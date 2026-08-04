// src/game/boss.js — 中ボス 氷漬けメカ
// architecture.md §4 §7 §8 §11 準拠。LEVEL.bossZ に配置。
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';
import { LEVEL } from './level.js';
import { makeTextSprite } from '../ui/TextSprite.js';

const MECH_COLOR = 0x3a4250;      // 内側メカ本体の濃いグレー
const SHELL_OPACITY = 0.5;        // 氷殻の基本 opacity
const SHELL_FLASH_OPACITY = 0.78; // ヒットフラッシュ時
const FLASH_TIME = 0.08;
const ORB_FLIGHT_TIME = 0.6;      // 氷弾の飛行時間
const DEATH_SINK_TIME = 0.5;      // メカが沈む時間
const SHARD_LIFE = 0.7;           // 死亡氷片寿命
const HP_SPRITE_Y = 4.2;

export class Boss {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this._hp = GAME.bossHp;
    this._alive = true;
    this._activated = false;
    this._attackTimer = 0;
    this._flashT = 0;
    this._deathT = -1; // >=0 で死亡演出中
    this._time = 0;

    const bz = LEVEL.bossZ;
    this._pos = new THREE.Vector3(0, 1.6, bz);

    // --- メカ本体 (胴体+頭+肩の箱組み) ---
    this._mechMat = new THREE.MeshLambertMaterial({ color: MECH_COLOR });
    this.mech = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.7, 1.2), this._mechMat);
    torso.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.9), this._mechMat);
    head.position.y = 2.35;
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.0), this._mechMat);
    shoulderL.position.set(-1.35, 1.75, 0);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 1.35;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.8), this._mechMat);
    legL.position.set(-0.55, 0.35, 0);
    const legR = legL.clone();
    legR.position.x = 0.55;
    // 目 (赤い小箱) で正面(+Z=プレイヤー側)を示す
    this._eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.05), this._eyeMat);
    eye.position.set(0, 2.4, 0.48);
    this.mech.add(torso, head, shoulderL, shoulderR, legL, legR, eye);
    this.mech.position.set(0, 0, bz);
    scene.add(this.mech);

    // --- 氷殻 (全体を覆う半透明の大箱) ---
    this._shellMat = new THREE.MeshLambertMaterial({
      color: COLORS.boss,
      transparent: true,
      opacity: SHELL_OPACITY,
      depthWrite: false,
    });
    this._shellGeo = new THREE.BoxGeometry(3.4, 3.2, 2.2);
    this.shell = new THREE.Mesh(this._shellGeo, this._shellMat);
    this.shell.position.set(0, 1.6, bz);
    scene.add(this.shell);

    // --- blob shadow ---
    this._shadowGeo = new THREE.CircleGeometry(2.0, 24);
    this._shadowMat = new THREE.MeshBasicMaterial({
      color: COLORS.shadow,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(this._shadowGeo, this._shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, 0.01, bz);
    scene.add(this.shadow);

    // --- 頭上 HP スプライト ---
    this.hpSprite = makeTextSprite(String(this._hp), {
      fontPx: 150,
      fg: '#ffffff',
      outline: '#000000',
      bg: '#e8302a',
      w: 512,
      h: 200,
      scale: 4,
    });
    this.hpSprite.position.set(0, HP_SPRITE_Y, bz);
    scene.add(this.hpSprite);
    this._hpShown = this._hp;

    // --- 氷弾 (視覚プール) ---
    this._orbGeo = new THREE.SphereGeometry(0.35, 12, 10);
    this._orbMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff });
    this._orbs = []; // {mesh, from:Vector3, t, active}

    // --- 死亡氷片パーティクル ---
    this._shardGeo = new THREE.BoxGeometry(1, 1, 1);
    this._shardMat = new THREE.MeshLambertMaterial({ color: COLORS.boss });
    this._shards = []; // {mesh, vel, life, size, active}

    this._target = {
      kind: 'boss',
      pos: this._pos,
      radius: 2.0,
      onHit: (dmg) => this._onHit(dmg),
    };
  }

  get hp() {
    return this._hp;
  }

  get alive() {
    return this._alive;
  }

  activate() {
    if (!this._alive || this._activated) return;
    this._activated = true;
    this._attackTimer = GAME.bossAttackInterval;
  }

  update(dt, ctx) {
    this.ctx = ctx;
    this._time += dt;

    // ヒットフラッシュ減衰
    if (this._flashT > 0) {
      this._flashT -= dt;
      this._shellMat.opacity = this._flashT > 0 ? SHELL_FLASH_OPACITY : SHELL_OPACITY;
    }

    // HP スプライト更新 (値が変わったフレームのみ再描画)
    if (this._alive && this._hpShown !== this._hp) {
      this._hpShown = this._hp;
      this.hpSprite.userData.update(String(this._hp));
    }

    // 攻撃: activate 後、phase 'boss' の間のみ 5秒ごとに氷弾
    if (this._alive && this._activated && ctx.phase === 'boss') {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        this._attackTimer += GAME.bossAttackInterval;
        this._fireOrb(ctx);
      }
    }

    // 氷弾の飛行 (現在のリーダー位置へ 0.6 秒でホーミング補間)
    for (const orb of this._orbs) {
      if (!orb.active) continue;
      orb.t += dt;
      const u = Math.min(1, orb.t / ORB_FLIGHT_TIME);
      const tx = ctx.playerX ?? 0;
      const tz = ctx.playerZ ?? 0;
      orb.mesh.position.set(
        orb.from.x + (tx - orb.from.x) * u,
        orb.from.y + (0.5 - orb.from.y) * u + Math.sin(u * Math.PI) * 1.4,
        orb.from.z + (tz - orb.from.z) * u
      );
      if (u >= 1) {
        orb.active = false;
        orb.mesh.visible = false;
        // 着弾: 部隊 -2 (squad 内で player_hit → squad_loss)
        if (ctx.squad) ctx.squad.remove(GAME.bossAttackLoss, 'boss');
      }
    }

    // 死亡演出: メカが沈む/倒れる
    if (this._deathT >= 0) {
      this._deathT += dt;
      const u = Math.min(1, this._deathT / DEATH_SINK_TIME);
      this.mech.position.y = -1.4 * u;
      this.mech.rotation.x = 0.5 * u;
      if (u >= 1) this.mech.visible = false;
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
      sh.vel.y -= 12 * dt;
      sh.mesh.position.addScaledVector(sh.vel, dt);
      sh.mesh.rotation.x += dt * 5;
      sh.mesh.rotation.y += dt * 3;
      sh.mesh.scale.setScalar(sh.size * Math.max(0.05, sh.life / SHARD_LIFE));
    }
  }

  collectTargets(out) {
    if (this._alive) out.push(this._target);
  }

  dispose() {
    this.scene.remove(this.mech);
    this.scene.remove(this.shell);
    this.scene.remove(this.shadow);
    this.scene.remove(this.hpSprite);
    for (const orb of this._orbs) this.scene.remove(orb.mesh);
    for (const sh of this._shards) this.scene.remove(sh.mesh);
    this._orbs.length = 0;
    this._shards.length = 0;
    this.mech.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    this._mechMat.dispose();
    this._eyeMat.dispose();
    this._shellGeo.dispose();
    this._shellMat.dispose();
    this._shadowGeo.dispose();
    this._shadowMat.dispose();
    this._orbGeo.dispose();
    this._orbMat.dispose();
    this._shardGeo.dispose();
    this._shardMat.dispose();
    if (this.hpSprite.material.map) this.hpSprite.material.map.dispose();
    this.hpSprite.material.dispose();
  }

  // ---- 内部 ----

  _onHit(_dmg) {
    if (!this._alive) return;
    const ctx = this.ctx;
    // 実ダメージ = 部隊数 (dmg 引数は無視、仕様)
    const real = Math.max(1, ctx.squad ? ctx.squad.count : 1);
    this._hp = Math.max(0, this._hp - real);
    if (ctx.audio) ctx.audio.play('boss_hit'); // AudioManager 側でスロットリング
    this._flashT = FLASH_TIME;
    this._shellMat.opacity = SHELL_FLASH_OPACITY;
    if (ctx.hud && ctx.hud.setBossHp) ctx.hud.setBossHp(this._hp, GAME.bossHp);
    if (this._hp <= 0) this._die();
  }

  // テスト用: 通常の死亡経路(boss_break→bossDead)でボスを即破壊する
  debugKill() {
    if (!this._alive) return;
    this._hp = 0;
    if (this.ctx.hud && this.ctx.hud.setBossHp) this.ctx.hud.setBossHp(0, GAME.bossHp);
    this._die();
  }

  _die() {
    if (!this._alive) return; // 1回のみ
    this._alive = false;
    const ctx = this.ctx;
    if (ctx.audio) ctx.audio.play('boss_break');
    // 氷殻が砕ける: 殻を消して氷片12個を飛散
    this.shell.visible = false;
    this._spawnShards(12);
    // メカ本体は 0.5 秒で沈む/倒れる (update で進行)
    this._deathT = 0;
    // HP スプライト非表示
    this.hpSprite.visible = false;
    // 飛行中の氷弾はキャンセル
    for (const orb of this._orbs) {
      orb.active = false;
      orb.mesh.visible = false;
    }
    if (ctx.events) ctx.events.emit('bossDead');
  }

  _fireOrb(ctx) {
    let orb = this._orbs.find((o) => !o.active);
    if (!orb) {
      orb = {
        mesh: new THREE.Mesh(this._orbGeo, this._orbMat),
        from: new THREE.Vector3(),
        t: 0,
        active: false,
      };
      this.scene.add(orb.mesh);
      this._orbs.push(orb);
    }
    orb.active = true;
    orb.t = 0;
    orb.from.set(0, 2.4, LEVEL.bossZ); // 頭部あたりから発射
    orb.mesh.position.copy(orb.from);
    orb.mesh.visible = true;
  }

  _spawnShards(count) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this._shardGeo, this._shardMat);
      const size = 0.25 + Math.random() * 0.3;
      mesh.position.set(
        (Math.random() - 0.5) * 3.0,
        0.8 + Math.random() * 2.4,
        LEVEL.bossZ + (Math.random() - 0.5) * 1.6
      );
      mesh.scale.setScalar(size);
      const a = Math.random() * Math.PI * 2;
      const sp = 2.5 + Math.random() * 3.5;
      const sh = {
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * sp, 3.5 + Math.random() * 3, Math.sin(a) * sp),
        life: SHARD_LIFE,
        size,
        active: true,
      };
      this.scene.add(mesh);
      this._shards.push(sh);
    }
  }
}
