// src/game/squad.js — 部隊システム（隊列・増減・描画・blob shadow）
// architecture.md §4 §7 §8 §11 準拠。
// 描画は InstancedMesh 2つ（胴体 + blob shadow）に集約: 200人でもドローコール2。
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';

const COL_SPACING = 0.55;   // 横間隔
const ROW_SPACING = 0.7;    // 縦間隔
const CLAMP_X = 4.2;        // 橋幅内クランプ
const LERP_RATE = 10;       // 追従 lerp 係数 (×dt)
const BOB_AMP = 0.05;       // 走り bob 振幅
const BOB_SPEED = 11;       // bob 角速度
const SHADOW_RADIUS = 0.32;
const LEADER_SCALE = 1.18;
const VISUAL_MAX = 100;     // 描画上限 (火力・count は実数のまま)

// 敵性接触 reason → player_hit を先に鳴らす
const HOSTILE_REASONS = new Set(['zombie', 'ice', 'boss']);

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion(); // 常に単位クォータニオン
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _color = new THREE.Color();

export class Squad {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this._count = GAME.startSquad;
    this._time = 0;
    this._leaderPos = new THREE.Vector3(0, 0, 0);
    this._scratchPositions = []; // soldierPositions() 用の再利用 Vector3 群

    // --- 共有ジオメトリ/マテリアル ---
    // 胴体: カプセル (半径0.18 + 円筒部0.54 → 全高 ~0.9)
    this._bodyGeo = new THREE.CapsuleGeometry(0.18, 0.54, 2, 6);
    // instanceColor で着色するためベース色は白（乗算されるので白=素通し）
    this._bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // blob shadow: 半径0.32 の円。水平配置はジオメトリに焼き込む
    this._shadowGeo = new THREE.CircleGeometry(SHADOW_RADIUS, 10).rotateX(-Math.PI / 2);
    this._shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    // --- InstancedMesh（count は常に maxSquad、非表示個体はスケール0行列） ---
    this._bodyMesh = new THREE.InstancedMesh(this._bodyGeo, this._bodyMat, GAME.maxSquad);
    this._bodyMesh.frustumCulled = false;
    this._shadowMesh = new THREE.InstancedMesh(this._shadowGeo, this._shadowMat, GAME.maxSquad);
    this._shadowMesh.frustumCulled = false;

    // 全インスタンスをスケール0で初期化 + 着色（index0=リーダー、他=兵士）。
    // リーダーは常に index0 なので色は不変 → instanceColor.needsUpdate はここでのみ立てる。
    _quat.identity();
    _pos.set(0, 0, 0);
    _scl.set(0, 0, 0);
    _mat4.compose(_pos, _quat, _scl);
    for (let i = 0; i < GAME.maxSquad; i++) {
      this._bodyMesh.setMatrixAt(i, _mat4);
      this._shadowMesh.setMatrixAt(i, _mat4);
      _color.setHex(i === 0 ? COLORS.leader : COLORS.soldier);
      this._bodyMesh.setColorAt(i, _color);
    }
    this._bodyMesh.instanceMatrix.needsUpdate = true;
    this._shadowMesh.instanceMatrix.needsUpdate = true;
    if (this._bodyMesh.instanceColor) this._bodyMesh.instanceColor.needsUpdate = true;

    this.scene.add(this._bodyMesh);
    this.scene.add(this._shadowMesh);

    // --- 兵士プール（位置・bob位相などの論理データのみ。Meshは持たない） ---
    this._pool = []; // [{pos:Vector3, phase, baseY, scale, active}]
    this._activeCount = 0;

    this._syncSoldiers(true);
    if (ctx && ctx.hud && ctx.hud.setSquad) ctx.hud.setSquad(this._count);
  }

  get count() {
    return this._count;
  }

  get leaderPos() {
    return this._leaderPos;
  }

  // n>=1 で増加。squad_gain を1回だけ発火。
  add(n, reason) {
    n = Math.floor(n);
    if (n < 1) return;
    const before = this._count;
    this._count = Math.min(GAME.maxSquad, this._count + n);
    const gained = this._count - before;
    if (gained <= 0) return;
    this._syncSoldiers(false);
    const ctx = this.ctx;
    if (ctx.audio) ctx.audio.play('squad_gain');
    if (ctx.hud && ctx.hud.setSquad) ctx.hud.setSquad(this._count);
    this._popup('+' + gained, 'gain');
  }

  // n>=1 で減少。敵性接触 reason は player_hit → squad_loss の順。最小0。0で squadZero emit。
  remove(n, reason) {
    n = Math.floor(n);
    if (n < 1) return;
    const before = this._count;
    this._count = Math.max(0, this._count - n);
    const lost = before - this._count;
    if (lost <= 0) return;
    this._syncSoldiers(false);
    const ctx = this.ctx;
    if (ctx.audio) {
      if (HOSTILE_REASONS.has(reason)) ctx.audio.play('player_hit');
      ctx.audio.play('squad_loss');
    }
    if (ctx.hud && ctx.hud.setSquad) ctx.hud.setSquad(this._count);
    this._popup('-' + lost, 'loss');
    if (this._count === 0 && ctx.events) ctx.events.emit('squadZero');
  }

  // ゲート通過結果を適用（gateMath.applyGate の結果を受け取る）
  applyGateResult(newCount, gate) {
    const delta = newCount - this._count;
    if (delta > 0) this.add(delta, 'gate');
    else if (delta < 0) this.remove(-delta, 'gate');
  }

  // デバッグ用: 音もpopupも無しで設定
  setCountSilent(n) {
    n = Math.floor(n);
    this._count = Math.max(0, Math.min(GAME.maxSquad, n));
    this._syncSoldiers(false);
    if (this.ctx.hud && this.ctx.hud.setSquad) this.ctx.hud.setSquad(this._count);
  }

  update(dt, ctx) {
    this.ctx = ctx;
    this._time += dt;
    const px = ctx.playerX ?? 0;
    const pz = ctx.playerZ ?? 0;
    const k = Math.min(1, LERP_RATE * dt);

    _quat.identity();
    for (let i = 0; i < this._activeCount; i++) {
      const s = this._pool[i];
      const tx = this._targetX(i, px);
      const tz = pz + this._targetZBack(i);
      // 滑らかな追従（即時スナップしない）
      s.pos.x += (tx - s.pos.x) * k;
      s.pos.z += (tz - s.pos.z) * k;

      const bob = BOB_AMP * (1 + Math.sin(this._time * BOB_SPEED + s.phase));
      // 胴体インスタンス行列
      _pos.set(s.pos.x, s.baseY + bob, s.pos.z);
      _scl.set(s.scale, s.scale, s.scale);
      _mat4.compose(_pos, _quat, _scl);
      this._bodyMesh.setMatrixAt(i, _mat4);
      // 影インスタンス行列（水平回転はジオメトリに焼き込み済み）
      _pos.set(s.pos.x, 0.01, s.pos.z);
      _scl.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scl);
      this._shadowMesh.setMatrixAt(i, _mat4);
    }
    this._bodyMesh.instanceMatrix.needsUpdate = true;
    this._shadowMesh.instanceMatrix.needsUpdate = true;

    if (this._activeCount > 0) this._leaderPos.copy(this._pool[0].pos).setY(0);
    else this._leaderPos.set(px, 0, pz);
  }

  // 全兵士（リーダー含む）の現在位置。弾の発射原点用。
  soldierPositions() {
    const out = [];
    for (let i = 0; i < this._activeCount; i++) {
      let v = this._scratchPositions[i];
      if (!v) v = this._scratchPositions[i] = new THREE.Vector3();
      v.set(this._pool[i].pos.x, 0, this._pool[i].pos.z);
      out.push(v);
    }
    return out;
  }

  dispose() {
    this.scene.remove(this._bodyMesh);
    this.scene.remove(this._shadowMesh);
    this._bodyMesh.dispose();   // instanceMatrix / instanceColor バッファ解放
    this._shadowMesh.dispose();
    this._pool.length = 0;
    this._activeCount = 0;
    this._bodyGeo.dispose();
    this._shadowGeo.dispose();
    this._bodyMat.dispose();
    this._shadowMat.dispose();
  }

  // ---- 内部 ----

  // 隊列レイアウト:
  //   index 0 = リーダー (playerX, playerZ)
  //   follower j = index-1: cols = min(10, max(1, ceil(sqrt(count))))
  //   row = floor(j/cols)+1（後方 +Z 方向）, col = j%cols
  //   x = playerX + (col - (rowN-1)/2)*0.55 + 千鳥オフセット(奇数行 +0.275)、clamp(±4.2)
  //   z = playerZ + row*0.7
  _cols() {
    return Math.min(10, Math.max(1, Math.ceil(Math.sqrt(this._count))));
  }

  _targetX(index, px) {
    if (index === 0) return THREE.MathUtils.clamp(px, -CLAMP_X, CLAMP_X);
    const j = index - 1;
    const cols = this._cols();
    const row = Math.floor(j / cols) + 1;
    const col = j % cols;
    // この行に実際に並ぶ人数でセンタリング
    const followers = this._count - 1;
    const rowStart = (row - 1) * cols;
    const rowN = Math.min(cols, followers - rowStart);
    let x = px + (col - (rowN - 1) / 2) * COL_SPACING;
    if (row % 2 === 1) x += COL_SPACING * 0.5; // 千鳥格子（スタッガード）
    return THREE.MathUtils.clamp(x, -CLAMP_X, CLAMP_X);
  }

  _targetZBack(index) {
    if (index === 0) return 0;
    const j = index - 1;
    const cols = this._cols();
    const row = Math.floor(j / cols) + 1;
    return row * ROW_SPACING; // 後方 = +Z（前進は -Z）
  }

  // 論理プールを count 体ぶん有効化。不足分は生成、余剰はスケール0行列で非表示。
  // 描画は最大 VISUAL_MAX 体 (10列×10行 = カメラに映る範囲。それ以遠の行は画面外のため描かない。
  // count 自体・火力・HUD表示は実数のまま)。
  _syncSoldiers(initial) {
    const need = Math.min(this._count, VISUAL_MAX);
    while (this._pool.length < need && this._pool.length < GAME.maxSquad) {
      this._pool.push(this._createSoldier(this._pool.length));
    }
    _quat.identity();
    for (let i = 0; i < this._pool.length; i++) {
      const s = this._pool[i];
      const active = i < need;
      if (active && !s.active) {
        // 復帰: リーダー付近から lerp で隊列位置へ流れ込む
        const lead = this._activeCount > 0 ? this._pool[0].pos : this._leaderPos;
        s.pos.set(lead.x, 0, lead.z + 0.5);
        s.phase = Math.random() * Math.PI * 2;
      }
      s.active = active;
      // リーダー(0)だけ色/サイズを変える（色は instanceColor で固定済み）
      const sc = i === 0 ? LEADER_SCALE : 1;
      s.scale = sc;
      s.baseY = 0.45 * sc; // カプセル中心（底が地面に付く高さ）
      if (!active) {
        // 非表示個体: スケール0行列（描画されない）
        _pos.set(0, 0, 0);
        _scl.set(0, 0, 0);
        _mat4.compose(_pos, _quat, _scl);
        this._bodyMesh.setMatrixAt(i, _mat4);
        this._shadowMesh.setMatrixAt(i, _mat4);
      }
    }
    this._activeCount = need;
    // 描画は先頭 need 個のみ (SwiftShader等で非表示分の頂点処理を省く)
    this._bodyMesh.count = need;
    this._shadowMesh.count = need;
    if (initial && need > 0) {
      const px = this.ctx?.playerX ?? 0;
      const pz = this.ctx?.playerZ ?? 0;
      for (let i = 0; i < need; i++) {
        this._pool[i].pos.set(this._targetX(i, px), 0, pz + this._targetZBack(i));
      }
    }
    // 有効個体の行列は次の update で書かれるが、同フレーム描画に備えここでも反映
    for (let i = 0; i < need; i++) {
      const s = this._pool[i];
      _pos.set(s.pos.x, s.baseY, s.pos.z);
      _scl.set(s.scale, s.scale, s.scale);
      _mat4.compose(_pos, _quat, _scl);
      this._bodyMesh.setMatrixAt(i, _mat4);
      _pos.set(s.pos.x, 0.01, s.pos.z);
      _scl.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scl);
      this._shadowMesh.setMatrixAt(i, _mat4);
    }
    this._bodyMesh.instanceMatrix.needsUpdate = true;
    this._shadowMesh.instanceMatrix.needsUpdate = true;
  }

  _createSoldier(index) {
    return {
      pos: new THREE.Vector3(0, 0, 0),
      phase: (index * 1.7) % (Math.PI * 2),
      baseY: 0.45,
      scale: 1,
      active: false,
    };
  }

  _popup(text, kind) {
    const ctx = this.ctx;
    if (!ctx.hud || !ctx.hud.popup || !ctx.worldToScreen) return;
    const p = this._tmpPopup || (this._tmpPopup = new THREE.Vector3());
    p.copy(this._leaderPos);
    p.y += 1.5;
    const scr = ctx.worldToScreen(p);
    if (scr) ctx.hud.popup(text, scr.x, scr.y, kind);
  }
}
