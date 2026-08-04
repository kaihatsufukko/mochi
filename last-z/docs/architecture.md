# Last Z — Ad Game Architecture Contract

これは全モジュール実装者（サブエージェント含む）が従う**契約書**。API シグネチャ・イベント名・数値仕様はここが正。勝手に変えない。変更が必要なら統合担当（メインセッション）が本書を更新する。

## 0. 技術前提

- Vite + three (^0.170) + vitest。プレーン ESM JavaScript（TypeScript 不使用）。
- `npm run dev` → http://localhost:5199 。`npm test` → vitest。
- **package.json を編集しない・npm install しない**（依存は導入済み）。
- 見た目はフラット単色 + 強い色分けのみ。ポストプロセス禁止。ライトは ambient + directional 1灯。
- 60fps 維持: 大群は InstancedMesh、弾はプール。`new` をフレーム内で乱発しない。

## 1. 座標系・カメラ・入力

- 橋は Z 軸負方向へ伸びる。プレイヤーは z を **減らしながら** 自動前進（forward = -Z）。
- 橋幅: x ∈ [-4.5, +4.5]。プレイヤー可動域 x ∈ [-3.2, +3.2]。
- 9:16 縦画面。canvas は常に 9:16 を維持し画面中央に letterbox。
- カメラ: 俯瞰チルト約55°（水平から55°下向き）。プレイヤーの背後上方に固定オフセットで追従（z のみ追従、x は橋中央固定で微追従 0.25 倍）。
- 入力: ポインタードラッグの dx を x 速度に変換して左右移動。クリック位置は無関係（相対ドラッグ）。
- ゲーム開始: 「TAP TO START」オーバーレイをタップ → AudioContext resume → phase 'run' 開始。

## 2. モジュール構成とオーナー

| ファイル | 内容 |
|---|---|
| `src/game/gateMath.js` | ゲート演算 純関数（three 非依存・DOM 非依存） |
| `src/game/gateMath.test.js` | その単体テスト (vitest) |
| `src/audio/AudioManager.js` | Web Audio 合成 + イベントログ (three/DOM 非依存の synth + ログ) |
| `src/ui/DebugPanel.js` | サウンドイベントのリアルタイム表示 DOM パネル |
| `src/ui/TextSprite.js` | canvas テクスチャの太字数字スプライト |
| `src/ui/HUD.js` | DOM HUD: 部隊数バッジ / ボスHPバー / ダメージポップ / 状態バナー |
| `src/game/constants.js` | 色・寸法・ゲーム数値の一元定義 |
| `src/game/level.js` | レベル配置データ（ゲート/障害物/バレル/物資/ボス/大群） |
| `src/game/squad.js` | 部隊（隊列・増減・描画・blob shadow） |
| `src/game/bullets.js` | 弾プール + 発射 + 命中判定 |
| `src/game/zombies.js` | 道中ゾンビ (通常) |
| `src/game/horde.js` | 終盤100体大群 (InstancedMesh) |
| `src/game/gates.js` | ゲート看板エンティティ（gateMath を使用） |
| `src/game/obstacles.js` | 氷壁 / 爆発バレル / 支援物資 |
| `src/game/boss.js` | 中ボス 氷漬けメカ |
| `src/main.js` + `src/core/*` | エンジン・統合・stage 進行 |

## 3. gateMath.js — 純関数契約（単体テスト必須）

```js
// op: 'add' | 'sub' | 'mul' | 'div'
// Gate 状態は {op, value} のプレーンオブジェクト。value は常に正の整数（符号は op が持つ）。

export function createGate(op, value)      // → {op, value}。value<1 や非整数は Error を throw
export function applyGate(count, gate)     // → 通過後の部隊数 (整数, 最小0)
export function growGate(gate)             // → 新しい {op, value, changed:boolean}。元 gate は不変(イミュータブル)
export function gateLabel(gate)            // → 表示文字列 '+5' '-4' 'x2' '÷3' ('x' は小文字エックス, '÷' U+00F7)
export function isPositiveGate(gate)       // → op が add/mul なら true（青）、sub/div なら false（赤）
```

**applyGate の仕様（テストで固定すること）:**
- add: `count + value`
- sub: `max(0, count - value)`
- mul: `count * value`
- div: `ceil(count / value)`（部隊は人間なので切り上げ。0 人なら 0 のまま）
- count が 0 のとき add ゲートなら増えてよい（0 + 5 = 5）。※ただしゲームは部隊0で即ゲームオーバーなので実際は通らない。

**growGate の仕様（1ヒット = 1ステップ。例: -4 に3発 → -1）:**
- sub: value を 1 減らす。下限 1（-1 で止まる。`-1` に撃っても changed:false）
- div: value を 1 減らす。下限 1（÷1 = 実質無効化。`÷1` に撃っても changed:false）
- add: value を 1 増やす。上限 99
- mul: value を 1 増やす。上限 9
- changed は値が実際に変わったときだけ true。

テストは最低: 各 op の apply 正常系 / 0 と 1 の境界 / div の切り上げ (`applyGate(5,{op:'div',value:2})===3`) / grow の全下限上限 / `-4 に growGate 3回 → -1` の統合例 / createGate バリデーション。

## 4. AudioManager — イベント名は固定 ID（17種）

```js
import { audio } from '../audio/AudioManager.js';
audio.play(name)          // 名前付きイベント発火。合成音再生 + ログ追加。未知の name は console.error + ログに {name, unknown:true}
audio.resume()            // ユーザージェスチャで AudioContext resume
audio.log                 // [{t: performance.now()での ms, name}] 全履歴（上限 2000, 超えたら古い方から破棄）
audio.onEvent(fn)         // 発火ごとのコールバック登録（DebugPanel 用）
audio.setMuted(bool)
```

**イベント ID（この綴りを厳守）:**

| ID | 発火条件（唯一の発火箇所を守る） |
|---|---|
| `shoot` | 弾が発射された volley ごとに1回（同一フレームの複数弾は1回） |
| `zombie_hit` | 弾がゾンビ(道中/大群/どちらも)に命中し死亡しなかった |
| `zombie_death` | ゾンビ死亡（弾/爆発とも） |
| `gate_hit` | 弾がゲートに命中（値が変わらなくても鳴る） |
| `gate_value_change` | ゲート値が実際に変化した（growGate changed:true のときのみ） |
| `gate_pass_blue` | 青ゲート(add/mul)通過の瞬間 |
| `gate_pass_red` | 赤ゲート(sub/div)通過の瞬間 |
| `squad_gain` | 部隊数が増えた（増加イベント1回につき1回。+5 でも1回） |
| `squad_loss` | 部隊数が減った（減少イベント1回につき1回） |
| `ice_crash` | 氷壁が砕けた（接触でも射撃破壊でも） |
| `barrel_explode` | バレル爆発 |
| `boss_hit` | 弾がボスに命中 |
| `boss_break` | ボス破壊（氷砕破） |
| `horde_start` | 大群戦開始の瞬間（1回のみ） |
| `player_hit` | 敵性接触で部隊が削られた（ゾンビ接触/氷壁接触/ボス攻撃）。この直後に squad_loss も鳴る（2音で正しい） |
| `stage_clear` | 大群殲滅でクリア確定の瞬間（1回のみ） |
| `game_over` | 部隊0確定の瞬間（1回のみ） |

- 音は Web Audio 合成プレースホルダー。**イベントごとに聞き分け可能な音色**（周波数/波形/エンベロープ/ノイズを変える）。
- 同名イベントの再生スロットリング（例 `shoot` 最低 45ms 間隔で実音声はスキップ可）はよいが、**ログには play() 呼び出しを必ず全件記録**する。
- AudioContext が resume 前でもログは記録する。
- `window.__audioLog` に audio.log への参照を公開。

## 5. DebugPanel

- 画面右端に半透明の縦パネル。最新イベント名を上から新しい順に約14行、`名前 ×累積回数 (+直近1秒回数)` 形式で表示。直近300msに発火した行はハイライト。
- 高頻度 `shoot` などで他が流れないよう、行はイベント名ごとに集約表示 + 下部に「最新発火: name」ティッカー。
- `audio.onEvent` 経由で更新。ゲームロジックへ依存しない。

## 6. TextSprite / HUD（視認性）

- `makeTextSprite(text, {fg, bg, outline, w, h, fontPx})` → THREE.Sprite。canvas に **極太フォント（900 weight 相当）+ 縁取り** で描画。`sprite.userData.update(text)` で再描画可能（テクスチャ再利用）。
- HUD (DOM):
  - `hud.setSquad(n)` 部隊数バッジ（画面下部中央、白抜き極太、青背景の丸カプセル）
  - `hud.setBossHp(hp, max)` / `hud.showBoss(bool)` 画面上部の太い数字 + バー（赤/白高コントラスト）
  - `hud.popup(text, screenX, screenY, kind)` ダメージ/増減ポップ（kind: 'gain'=緑, 'loss'=赤, 'dmg'=白）浮上フェード
  - `hud.banner(text, kind)` 中央大バナー（'CLEAR!' / 'GAME OVER' / 'HORDE!'）
  - `hud.showStart(fn)` TAP TO START オーバーレイ
- 全数字はスマホ想定で最低でも画面幅の 1/10 以上の文字高。コントラスト比を強く。

## 7. ゲーム数値（constants.js に定義）

| 項目 | 値 |
|---|---|
| プレイヤー前進速度 | 9 u/s |
| 横移動感度 | drag dx(px) × 0.02 u |
| 発射レート | 1 volley / 0.22s。volley = 最大16発（発射体集約）。1発ダメージ = round(部隊数/発数) → DPS ∝ 部隊数 |
| 弾速 / 弾寿命 | 28 u/s / 1.0s。（対ボスは 1発 = 部隊数ぶん） |
| 道中ゾンビ HP | 3 |
| 大群ゾンビ HP | 2 / 数 100 体 |
| ゾンビ接触 | 部隊 -1 & ゾンビ死亡 |
| 氷壁接触 | 壁破壊 & 部隊 -3 (射撃破壊: HP12) |
| バレル | HP3。爆発半径 4.5u 内のゾンビ即死・氷壁破壊 |
| 支援物資 | 拾うと部隊 +3 |
| ボス HP | 9560。5秒ごとに氷弾で部隊 -2 |
| ゲーム開始部隊数 | 1 |
| 部隊上限 | 200（隊列は最大10列×20行の千鳥） |

## 8. エンティティ標準インターフェース

各システム (squad, bullets, zombies, horde, gates, obstacles, boss) はクラスで:

```js
constructor(scene, ctx)   // ctx = 共有コンテキスト（下記）
update(dt, ctx)           // dt 秒
dispose()
```

`ctx`（main.js が構築、毎フレーム更新）:

```js
ctx = {
  playerX, playerZ,        // 部隊リーダー位置
  squad,                   // Squad インスタンス
  audio, hud, camera, scene,
  phase,                   // 'ready'|'run'|'boss'|'horde'|'clear'|'gameover'
  events,                  // EventBus: on(name,fn) / emit(name,payload)
  worldToScreen(v3)        // → {x,y} css px（HUD ポップ用）
}
```

**衝突はすべて簡易距離判定（円/矩形）。物理エンジン禁止。**

- bullets: `fire(volley)` は squad が呼ぶ。命中先は zombies/horde/gates/obstacles/boss が `ctx.targets` に登録した `{kind, pos, radius, onHit(dmg)}` を総当り（弾×ターゲットは毎フレーム最大数千回の距離二乗比較で十分）。
- squad: `count` getter、`add(n, reason)` / `remove(n, reason)` が squad_gain/squad_loss を**1呼び出し1回**発火し HUD 更新・隊列再構成。reason は 'gate'|'supply'|'zombie'|'ice'|'boss' 等（player_hit は接触系 reason のとき remove 内で先に発火）。

## 9. ステージ進行 (main.js/stage)

1. `ready` — TAP TO START。
2. `run` — 自動前進。z が boss トリガー (`level.bossZ + 14`) に達すると `boss` へ。
3. `boss` — 前進停止（隊列はその場で射撃継続、左右移動は可）。ボス HP0 → boss_break → 2秒演出後 `run` 再開（道が開く）。
4. z が `level.hordeZ + 16` に達すると `horde`。horde_start 発火、前進停止、大群がプレイヤーへ突撃。全滅 → stage_clear → `clear`（CLEAR バナー + リスタートボタン）。
5. squad 0 → game_over → `gameover`（バナー + リスタート）。
- リスタートは `location.reload()` でよい。

## 10. テスト用フック（必須・削除禁止）

`window.__game` を main.js が公開:

```js
{
  version: 1,
  state()      // → {phase, squad, playerX, playerZ, fps, bossHp, bossMax, hordeAlive,
               //     gates:[{id, z, op, value, passed}], walls:​[{z,x,alive}], barrels:[...], supplies:[...]}
  setTimeScale(k)   // 0.1〜8
  teleport(z)       // プレイヤー z を移動（検証用）
  setSquad(n)       // 部隊数を直接設定（squad_gain/loss は鳴らさない・検証用）
  dragTo(x)         // プレイヤー目標 x を直接指定（検証用）
  start()           // TAP TO START を踏む
  restart()
}
window.__audioLog   // AudioManager のログ配列
```

fps は直近60フレームの移動平均を state() に含める。

## 11. 色（constants.js COLORS）

| 対象 | 色 |
|---|---|
| 背景/霧 | #10141f |
| 橋面 | #8a929e（縁 #5a6068） |
| プレイヤー/兵 | #1e6fff（リーダーは #4b9bff で少し明るく） |
| ゾンビ | #6b8e4e（くすんだ緑） |
| 青ゲート | #1d5dff 半透明パネル + 白極太文字 |
| 赤ゲート | #e8302a 半透明パネル + 白極太文字 |
| 氷 | #a8e4ff 半透明 (opacity 0.55) |
| バレル | #ff7b1c |
| 支援物資 | #ffd23c |
| ボス | #cfeaff + 氷殻 |
| blob shadow | 黒 opacity 0.35 の円 |
