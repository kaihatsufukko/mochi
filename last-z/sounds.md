# Last Z — サウンドイベント一覧 (17種)

音の実装: `src/audio/AudioManager.js` の `SOUND_DEFS`。現在は全て Web Audio 合成のプレースホルダー。

| イベント名 | 発火条件 | 現在の音（合成パラメータ要約） | 差し替え予定ファイル |
|---|---|---|---|
| `shoot` | 弾発射 volley ごとに1回 | square 1650→900Hz の短いブリップ (50ms, 高速減衰) | `assets/sfx/shoot.mp3` |
| `zombie_hit` | 弾がゾンビに命中 (非死亡) | triangle 420→260Hz の鈍い中域トック (70ms) | `assets/sfx/zombie_hit.mp3` |
| `zombie_death` | ゾンビ死亡 (弾/爆発) | sawtooth 300→70Hz の下降うめき (220ms) + 低域ノイズ | `assets/sfx/zombie_death.mp3` |
| `gate_hit` | 弾がゲートに命中 (値不変でも) | sine 2100Hz + 倍音4200Hz の金属的プリンク (60ms) | `assets/sfx/gate_hit.mp3` |
| `gate_value_change` | ゲート値が実際に変化 | square 700→1400Hz の短い上昇ジップ (90ms) | `assets/sfx/gate_value_change.mp3` |
| `gate_pass_blue` | 青ゲート (add/mul) 通過 | sine C6→G6 (1046→1568Hz) の明るい2音上昇チャイム | `assets/sfx/gate_pass_blue.mp3` |
| `gate_pass_red` | 赤ゲート (sub/div) 通過 | triangle G5→C5 (784→523Hz) の2音下降 (青の鏡像) | `assets/sfx/gate_pass_red.mp3` |
| `squad_gain` | 部隊数が増えた (増加1回=1回) | sine 500→1900Hz の速い上昇ポップ (120ms) | `assets/sfx/squad_gain.mp3` |
| `squad_loss` | 部隊数が減った (減少1回=1回) | sine 180→60Hz の低い鈍いサブ落下 + 小ノイズノック | `assets/sfx/squad_loss.mp3` |
| `ice_crash` | 氷壁が砕けた (接触/射撃) | highpass 2500Hz ノイズ + 高域 sine 落下スパークル (280ms) | `assets/sfx/ice_crash.mp3` |
| `barrel_explode` | バレル爆発 | lowpass 1600→90Hz の長いノイズ轟音 (550ms) + sine 120→35Hz サブ | `assets/sfx/barrel_explode.mp3` |
| `boss_hit` | 弾がボスに命中 | square 620/660Hz デチューン2声の金属クランク (70ms) | `assets/sfx/boss_hit.mp3` |
| `boss_break` | ボス破壊 (氷砕破) | highpass 3200Hz ガラス的高周波バースト (600ms) + band ノイズ掃引 + sine 6000→1800Hz + 低域ボディ | `assets/sfx/boss_break.mp3` |
| `horde_start` | 大群戦開始の瞬間 (1回) | sawtooth 110/116Hz 不協和2声の上昇スウェル (700ms, 遅い attack) + 低域ノイズ | `assets/sfx/horde_start.mp3` |
| `player_hit` | 敵性接触で部隊が削られた | square 880→440 / 660→330Hz の下降2連アラームスタブ | `assets/sfx/player_hit.mp3` |
| `stage_clear` | 大群殲滅でクリア確定 (1回) | triangle C5-E5-G5-C6 上昇アルペジオ + 高域スパークル | `assets/sfx/stage_clear.mp3` |
| `game_over` | 部隊0確定の瞬間 (1回) | sawtooth C5-Ab4-F4-C4 下降ライン + 最後に sine 低音落下 | `assets/sfx/game_over.mp3` |

## 本番音源への差し替え手順

1. 音源ファイルを規約パス `assets/sfx/<イベント名>.mp3` に配置する。
2. `src/audio/AudioManager.js` の `SOUND_DEFS` の該当エントリに `file` プロパティを追記する:

   ```js
   barrel_explode: {
     file: 'assets/sfx/barrel_explode.mp3',
     synth(ctx, dest, t0) { /* そのまま残す（フォールバック用） */ },
   },
   ```

3. `file` があると初回再生時に fetch + `decodeAudioData` してファイルを再生する。ロード完了前やロード失敗時は自動で合成音にフォールバックするため、`synth` は消さずに残す。
