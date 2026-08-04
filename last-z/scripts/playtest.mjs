// Playwright 自動プレイ検証ドライバ
// 使い方: node scripts/playtest.mjs <scenario>
//   scenario: quick | gates | growth | obstacles | boss | horde | gameover | full | fps
// 出力: shots/<scenario>-report.json と shots/<scenario>-*.png
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = path.join(ROOT, 'shots');
const URL_ = 'http://localhost:5199/';
fs.mkdirSync(SHOTS, { recursive: true });

function findChromium() {
  const cands = ['/opt/pw-browsers/chromium'];
  for (const c of cands) {
    if (fs.existsSync(c)) {
      const st = fs.statSync(c);
      if (st.isFile()) return c;
      // ディレクトリなら中の chrome 実行体を探す
      for (const sub of ['chrome-linux/chrome', 'chrome']) {
        const p = path.join(c, sub);
        if (fs.existsSync(p)) return p;
      }
      const entries = fs.readdirSync(c);
      for (const e of entries) {
        for (const sub of ['chrome-linux/chrome', 'chrome']) {
          const p = path.join(c, e, sub);
          if (fs.existsSync(p)) return p;
        }
      }
    }
  }
  throw new Error('chromium not found under /opt/pw-browsers');
}

function ping(url) {
  return new Promise((res) => {
    const req = http.get(url, (r) => { r.resume(); res(true); });
    req.on('error', () => res(false));
    req.setTimeout(1500, () => { req.destroy(); res(false); });
  });
}

async function ensureServer() {
  if (await ping(URL_)) return null;
  const proc = spawn('npx', ['vite', '--port', '5199', '--strictPort'], {
    cwd: ROOT, stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await ping(URL_)) return proc;
  }
  proc.kill();
  throw new Error('vite server did not start');
}

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail === undefined ? null : detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  :: ' + JSON.stringify(detail) : ''}`);
}

const S = (page) => page.evaluate(() => window.__game.state());
const AC = (page) => page.evaluate(() => {
  const c = {};
  for (const e of window.__audioLog) c[e.name] = (c[e.name] || 0) + 1;
  return c;
});
const call = (page, expr) => page.evaluate((e) => { const f = new Function('return ' + e); return f(); }, expr);

async function pollUntil(page, predSrc, timeoutMs = 20000, interval = 33) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ok = await page.evaluate((src) => new Function('s', 'return ' + src)(window.__game.state()), predSrc);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

async function boot(scenario, opts = {}) {
  const server = await ensureServer();
  const browser = await chromium.launch({ executablePath: findChromium() });
  // SwiftShader(ソフトウェアGPU)環境のため dsf=1。実機GPUでは dpr2 でも余裕がある。
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__audioLog, null, { timeout: 15000 });
  return { server, browser, page, errors };
}

function applyGateJS(count, op, value) {
  switch (op) {
    case 'add': return count + value;
    case 'sub': return Math.max(0, count - value);
    case 'mul': return count * value;
    case 'div': return Math.ceil(count / value);
  }
}

// ---------------- シナリオ ----------------

async function scQuick(page) {
  await page.screenshot({ path: path.join(SHOTS, 'quick-0-title.png') });
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setSquad(8)'); // 序盤ゲート/ゾンビで全滅しないよう補強
  await new Promise((r) => setTimeout(r, 800));
  const s1 = await S(page);
  check('start: phase run', s1.phase === 'run', s1.phase);
  // ドラッグ操作 (実ポインタ) — 最初のゲート到達前に実施
  const before = s1.playerX;
  await page.mouse.move(200, 500);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) { await page.mouse.move(200 + i * 12, 500); await new Promise((r) => setTimeout(r, 25)); }
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 400));
  const after = (await S(page)).playerX;
  check('drag right moves +x', after > before + 0.5, { before, after });
  check('x clamp respected', Math.abs(after) <= 3.25, after);
  await new Promise((r) => setTimeout(r, 2000));
  const s2 = await S(page);
  check('auto forward: z decreasing', s2.playerZ < s1.playerZ - 5, { z1: s1.playerZ, z2: s2.playerZ });
  const ac = await AC(page);
  check('auto fire: shoot events', (ac.shoot || 0) >= 8, ac.shoot);
  // fps: JITウォームアップと適応解像度の収束を待ち、中央値で判定 (撮影前に計測)
  await new Promise((r) => setTimeout(r, 2500));
  const fsm = [];
  for (let i = 0; i < 12; i++) { fsm.push((await S(page)).fps); await new Promise((r) => setTimeout(r, 150)); }
  const st = fpsStats(fsm);
  check('fps median >= 45 (平常時スモーク下限。厳密判定は horde/fps/full の相対基準)', st.median >= 45, st);
  await page.screenshot({ path: path.join(SHOTS, 'quick-1-run.png') });
}

async function scGates(page) {
  // 連射OFFで純粋な演算検証 (全8対を左右交互に通過)
  // 競合対策: 通過ライン2.5u手前で before を採取し、player_hit(接触被害)が混入したサンプルはリトライ
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setFire(false)');
  await call(page, 'window.__game.setTimeScale(1)');
  const gates = (await S(page)).gates;
  const zs = [...new Set(gates.map((g) => g.z))].sort((a, b) => b - a);
  const pickSquad = (op, value) => (op === 'sub' ? value + 9 : op === 'div' ? value * 3 + 1 : 10);
  let i = 0;
  for (const z of zs) {
    const side = i % 2 === 0 ? 'left' : 'right';
    const x = side === 'left' ? -2.2 : 2.2;
    // テレポート先がボストリガー(-196)以深ならボスを先に通常経路で破壊しておく
    const sChk = await S(page);
    if (sChk.bossHp > 0 && z + 16 <= -196) await call(page, 'window.__game.killBoss()');
    if ((await S(page)).phase === 'boss') await pollUntil(page, "s.phase==='run'", 9000);
    let result = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const gInfo = (await S(page)).gates.find((g2) => g2.z === z && g2.side === side);
      if (gInfo.passed) { result = { skip: 'already passed' }; break; }
      await call(page, `window.__game.teleport(${z + 16})`);
      await call(page, `window.__game.dragTo(${x})`);
      // x が定位置に着き、ライン2.5u手前に達するまで待つ
      await pollUntil(page, `Math.abs(s.playerX - (${x})) < 0.4 && s.playerZ < ${z} + 3.2 && s.playerZ > ${z}`, 6000, 10);
      await call(page, `window.__game.setSquad(${pickSquad(gInfo.op, gInfo.value)})`);
      const pre = await S(page);
      const preHits = (await AC(page)).player_hit || 0;
      const g = pre.gates.find((g2) => g2.z === z && g2.side === side);
      if (g.passed || pre.playerZ <= z) continue; // すでに跨いでいた → リトライ
      const ok = await pollUntil(page, `s.gates.find(g=>g.z===${z}&&g.side==='${side}').passed`, 8000, 16);
      const post = await S(page);
      const postHits = (await AC(page)).player_hit || 0;
      if (postHits !== preHits) continue; // 接触被害混入 → リトライ
      const expected = Math.min(200, applyGateJS(pre.squad, g.op, g.value));
      result = { ok, before: pre.squad, after: post.squad, expected, op: g.op, value: g.value };
      break;
    }
    if (result && result.skip) {
      check(`gate z=${z} ${side}: SKIP (${result.skip})`, false, result);
    } else if (!result) {
      check(`gate z=${z} ${side}: sample kept contaminating`, false, null);
    } else {
      check(`gate z=${z} ${side} ${result.op}${result.value}: ${result.before} -> ${result.expected}`,
        result.ok && result.after === result.expected, result);
    }
    // ボス帯に入ったら通常経路で破壊して道を開ける
    const sNow = await S(page);
    if (sNow.phase === 'boss') {
      await call(page, 'window.__game.killBoss()');
      await pollUntil(page, "s.phase==='run'", 8000);
    }
    i++;
  }
  const ac = await AC(page);
  check('gate_pass events total = pairs crossed', (ac.gate_pass_blue || 0) + (ac.gate_pass_red || 0) === zs.length,
    { blue: ac.gate_pass_blue, red: ac.gate_pass_red, pairs: zs.length });
  check('no gate_hit with fire off', !ac.gate_hit, ac.gate_hit);
}

async function scGrowth(page) {
  // 連射ONで値が1ヒット1ステップ育つこと (最初の対の左ゲート -? を観測)
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setTimeScale(1)');
  const g0 = (await S(page)).gates[0]; // z=-30 left add3 … 実際は並び順に依存
  const zsAll = (await S(page)).gates;
  const target = zsAll.find((g) => g.op === 'sub'); // 赤subゲートで -4 -> 成長を見る
  await call(page, `window.__game.dragTo(${target.x})`);
  await call(page, `window.__game.setSquad(20)`);
  await call(page, `window.__game.teleport(${target.z + 22})`);
  const seen = [];
  let passed = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !passed) {
    const s = await S(page);
    const g = s.gates.find((x) => x.z === target.z && x.side === target.side);
    if (seen.length === 0 || seen[seen.length - 1] !== g.value) seen.push(g.value);
    passed = g.passed;
    await new Promise((r) => setTimeout(r, 16));
  }
  // ポーリングは全ステップを捕捉できない(1フレームに複数ヒット)ため、
  // 単調減少 + 下限1到達 + gate_value_change 回数 >= 減少量 で検証する
  const nonIncreasing = seen.every((v, i) => i === 0 || v <= seen[i - 1]);
  const v0 = seen[0];
  const vEnd = seen[seen.length - 1];
  check(`growth: sub value non-increasing ${JSON.stringify(seen)}`, nonIncreasing && seen.length >= 2, seen);
  check('growth: ground down to floor 1 before pass', vEnd === 1, vEnd);
  const ac = await AC(page);
  check('gate_hit fired', (ac.gate_hit || 0) >= v0 - vEnd, ac.gate_hit);
  check(`gate_value_change >= ${v0 - vEnd} (=v0-vEnd)`, (ac.gate_value_change || 0) >= v0 - vEnd, ac.gate_value_change);
  check('growth floor: value never < 1', seen.every((v) => v >= 1), seen);
}

async function scObstacles(page) {
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setFire(false)');
  await call(page, 'window.__game.setTimeScale(2)');
  // 氷壁接触: wall z=-45 x=-2.4 (先にゲート-30の適用を確定させてから部隊数を固定する)
  await call(page, 'window.__game.dragTo(-2.4)');
  await call(page, 'window.__game.teleport(-38)');
  await pollUntil(page, 's.gates.filter(g=>g.z===-30).every(g=>g.passed)', 5000, 10);
  await call(page, 'window.__game.setSquad(20)');
  const pre = await S(page);
  await pollUntil(page, 's.walls.find(w=>w.z===-45).alive===false || s.playerZ < -47', 10000);
  const post = await S(page);
  const acA = await AC(page);
  check('ice wall contact: broken', post.walls.find((w) => w.z === -45).alive === false, post.walls[0]);
  check('ice wall contact: squad -3', post.squad === pre.squad - 3, { pre: pre.squad, post: post.squad });
  check('ice_crash fired', (acA.ice_crash || 0) >= 1, acA.ice_crash);
  check('player_hit fired (ice)', (acA.player_hit || 0) >= 1, acA.player_hit);
  // バレル: z=-88 x=-1.5 を射撃で爆発させる
  await call(page, 'window.__game.setFire(true)');
  await call(page, 'window.__game.dragTo(-1.5)');
  await call(page, 'window.__game.teleport(-80)');
  await pollUntil(page, 's.barrels.find(b=>b.z===-88).alive===false || s.playerZ < -95', 12000);
  const acC = await AC(page);
  const post3 = await S(page);
  check('barrel exploded by shots', post3.barrels.find((b) => b.z === -88).alive === false, post3.barrels);
  check('barrel_explode fired', (acC.barrel_explode || 0) >= 1, acC.barrel_explode);
  // 支援物資: z=-120 x=1.6 (+3 の厳密検証。player_hit 混入時はリトライ)
  await call(page, 'window.__game.setFire(false)');
  let supplyOk = null;
  for (let attempt = 0; attempt < 3 && !supplyOk; attempt++) {
    if ((await S(page)).supplies.find((u) => u.z === -120).alive === false) break;
    await call(page, 'window.__game.dragTo(1.6)');
    await call(page, 'window.__game.teleport(-112)');
    await pollUntil(page, 's.playerZ < -116 && Math.abs(s.playerX-1.6)<0.4', 6000, 10);
    const pre2 = await S(page);
    const preHits2 = (await AC(page)).player_hit || 0;
    const got = await pollUntil(page, 's.supplies.find(u=>u.z===-120).alive===false && s.playerZ > -126', 8000, 10);
    const post2 = await S(page);
    const postHits2 = (await AC(page)).player_hit || 0;
    if (postHits2 !== preHits2) continue; // 接触混入 → リトライ
    supplyOk = { got, pre: pre2.squad, post: post2.squad };
  }
  check('supply picked: squad +3', supplyOk && supplyOk.got && supplyOk.post === supplyOk.pre + 3, supplyOk);
  const acB = await AC(page);
  check('squad_gain fired (supply)', (acB.squad_gain || 0) >= 1, acB.squad_gain);
  await page.screenshot({ path: path.join(SHOTS, 'obstacles-end.png') });
}

async function scBoss(page) {
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setSquad(60)');
  await call(page, 'window.__game.setTimeScale(2)');
  await call(page, 'window.__game.teleport(-192)');
  const okBoss = await pollUntil(page, "s.phase==='boss'", 15000);
  check('phase boss entered', okBoss);
  await page.screenshot({ path: path.join(SHOTS, 'boss-fight.png') });
  const s0 = await S(page);
  check('boss hp starts 9560 and decreasing', s0.bossHp < 9560 && s0.bossHp > 0, s0.bossHp);
  const okDead = await pollUntil(page, 's.bossHp<=0', 40000);
  check('boss destroyed', okDead);
  const okOpen = await pollUntil(page, "s.phase==='run'", 8000);
  check('path opens after boss (phase run)', okOpen);
  const ac = await AC(page);
  check('boss_hit fired many', (ac.boss_hit || 0) >= 10, ac.boss_hit);
  check('boss_break fired exactly once', (ac.boss_break || 0) === 1, ac.boss_break);
  await page.screenshot({ path: path.join(SHOTS, 'boss-after.png') });
}

async function scHorde(page) {
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setSquad(80)');
  const baseline = await measureBaseline(page);
  await call(page, 'window.__game.setTimeScale(2)');
  // ボス帯を通常経路で通過してから大群帯へ (テレポートでトリガーを飛ばすとボス戦で停止する)
  await call(page, 'window.__game.teleport(-200)');
  await pollUntil(page, "s.phase==='boss'", 8000);
  await call(page, 'window.__game.killBoss()');
  await pollUntil(page, "s.phase==='run'", 8000);
  await call(page, 'window.__game.setTimeScale(1)'); // fps計測のため等倍で大群戦へ
  await call(page, 'window.__game.teleport(-262)'); // 先制ダウンスケール帯(-256)を経由して自走で突入
  const okStart = await pollUntil(page, "s.phase==='horde'", 15000);
  check('horde phase entered', okStart);
  const s0 = await S(page);
  check('horde alive ~100 at start', s0.hordeAlive >= 90, s0.hordeAlive);
  await new Promise((r) => setTimeout(r, 1200)); // 解像度切替/開始バーストの平均バッファ抜けを待つ
  const samples = [];
  for (let i = 0; i < 120; i++) {
    const s = await S(page);
    samples.push(s.fps);
    if (s.phase === 'clear' || s.phase === 'gameover') break;
    if (i === 8) await page.screenshot({ path: path.join(SHOTS, 'horde-start.png') });
    await new Promise((r) => setTimeout(r, 100));
  }
  const okClear = await pollUntil(page, "s.phase==='clear'", 60000);
  const sEnd = await S(page);
  check('horde cleared -> stage clear', okClear, sEnd.phase);
  checkBattleFps('fps during horde', fpsStats(samples), baseline);
  const ac = await AC(page);
  check('horde_start exactly once', (ac.horde_start || 0) === 1, ac.horde_start);
  check('stage_clear exactly once', (ac.stage_clear || 0) === 1, ac.stage_clear);
  check('zombie deaths >= 100', (ac.zombie_death || 0) >= 100, ac.zombie_death);
  await page.screenshot({ path: path.join(SHOTS, 'horde-clear.png') });
}

async function scGameover(page) {
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setFire(false)');
  await call(page, 'window.__game.setSquad(6)'); // テレポートで跨ぐゲート(-4)を吸収する緩衝
  await call(page, 'window.__game.setTimeScale(2)');
  await call(page, 'window.__game.dragTo(0)');
  await call(page, 'window.__game.teleport(-34)'); // ゲート-4で部隊2 → pack z=-40 のゾンビ2接触で0
  const ok = await pollUntil(page, "s.phase==='gameover'", 20000);
  check('game over reached', ok);
  const ac = await AC(page);
  check('game_over exactly once', (ac.game_over || 0) === 1, ac.game_over);
  check('player_hit fired', (ac.player_hit || 0) >= 1, ac.player_hit);
  const s = await S(page);
  check('squad is 0', s.squad === 0, s.squad);
  await page.screenshot({ path: path.join(SHOTS, 'gameover.png') });
}

async function scFull(page) {
  // 通しプレイ: 人間らしい不完全ボット。
  //  - 基本は青ゲート優先だが「赤を踏んでも部隊>=3が残る」なら状況次第で赤も通る
  //    (gate_pass_red / squad_loss を自然発生させ、部隊肥大を抑え弾ダメージを下げ zombie_hit も出す)
  //  - 氷壁に一度だけ故意に接触 (ice_crash / player_hit)
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setTimeScale(1)');
  await call(page, 'window.__game.dragTo(-2.2)'); // ベースライン計測中に最初の青ゲート(左+3)を通る針路
  const baseline = await measureBaseline(page);
  const shotAt = new Set();
  const t0 = Date.now();
  let lastPhase = 'run';
  let wallBumped = false;
  let lastShotT = 0; // スクショは描画を止め移動平均fpsを汚すため、直後1.5sはサンプリングしない
  const fpsSamples = [];
  while (Date.now() - t0 < 240000) {
    const s = await S(page);
    if (Date.now() - t0 > 3000 && Date.now() - lastShotT > 1500 &&
        (s.phase === 'run' || s.phase === 'boss' || s.phase === 'horde')) {
      fpsSamples.push(s.fps);
      if (s.fps < 47) console.log('  [fps dip]', Math.round(s.fps), 'z=', Math.round(s.playerZ), 'phase=', s.phase, 'squad=', s.squad);
    }
    if (s.phase === 'clear' || s.phase === 'gameover') { lastPhase = s.phase; break; }
    lastPhase = s.phase;
    // 次のゲート対の選択。ゲートが遠い間は中央へ戻る (人間的な動き。弾がゲートに吸われず道中ゾンビに当たる)
    const next = s.gates.filter((g) => !g.passed && g.z < s.playerZ).sort((a, b) => b.z - a.z)[0];
    let tx = 0;
    if (next && next.z > s.playerZ - 16) {
      const pair = s.gates.filter((g) => g.z === next.z);
      const blue = pair.find((g) => g.op === 'add' || g.op === 'mul');
      const red = pair.find((g) => g.op === 'sub' || g.op === 'div');
      let choice = blue || pair[0];
      if (red) {
        const after = applyGateJS(s.squad, red.op, red.value);
        if (after >= 25) choice = red; // 部隊25以上残るなら赤も通る (25〜60程度に維持)
      }
      tx = choice.x;
    }
    // 氷壁: 一度だけ故意に接触、それ以外は回避
    const wall = s.walls.filter((w) => w.alive && w.z < s.playerZ && w.z > s.playerZ - 14)[0];
    if (wall) {
      if (!wallBumped && s.squad >= 10) { tx = wall.x; if (wall.z > s.playerZ - 4) wallBumped = true; }
      else tx = wall.x > 0 ? -2.6 : 2.6;
    }
    await call(page, `window.__game.dragTo(${tx})`);
    // 節目スクショ
    for (const [mark, z] of [['g1', -28], ['mid', -128], ['boss', -196], ['horde', -284]]) {
      if (s.playerZ < z && !shotAt.has(mark)) {
        shotAt.add(mark);
        await page.screenshot({ path: path.join(SHOTS, `full-${mark}.png`) });
        lastShotT = Date.now();
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  await page.screenshot({ path: path.join(SHOTS, 'full-end.png') });
  const s = await S(page);
  const ac = await AC(page);
  check('full run reached clear', lastPhase === 'clear', { phase: lastPhase, squad: s.squad, z: s.playerZ });
  checkBattleFps('fps during full run', fpsStats(fpsSamples), baseline);
  const required = ['shoot', 'zombie_hit', 'zombie_death', 'gate_hit', 'gate_value_change', 'gate_pass_blue',
    'gate_pass_red', 'squad_gain', 'squad_loss', 'ice_crash', 'player_hit', 'barrel_explode',
    'boss_hit', 'boss_break', 'horde_start', 'stage_clear'];
  for (const name of required) check(`event ${name} fired in full run`, (ac[name] || 0) >= 1, ac[name] || 0);
  check('singleton events once', ['boss_break', 'horde_start', 'stage_clear'].every((n) => (ac[n] || 0) === 1),
    { boss_break: ac.boss_break, horde_start: ac.horde_start, stage_clear: ac.stage_clear });
  fs.writeFileSync(path.join(SHOTS, 'full-audio-counts.json'), JSON.stringify(ac, null, 2));
}

function fpsStats(samples) {
  const a = [...samples].sort((x, y) => x - y);
  return {
    n: a.length,
    min: a.length ? Math.round(a[0]) : null,
    p5: a.length ? Math.round(a[Math.floor(a.length * 0.05)]) : null, // VM単発スパイクに頑健な実質最低値
    median: a.length ? Math.round(a[Math.floor(a.length / 2)]) : null,
  };
}

// 平常時 (序盤・低負荷) の fps 中央値。この検証VMはスロットリングで基礎速度が変動するため、
// 戦闘時 fps は「絶対55」または「同一実行の平常時比90%」で判定する (絶対下限40)。
async function measureBaseline(page) {
  await new Promise((r) => setTimeout(r, 2000)); // JIT ウォームアップ
  const b = [];
  for (let i = 0; i < 10; i++) { b.push((await S(page)).fps); await new Promise((r) => setTimeout(r, 150)); }
  return fpsStats(b).median;
}

function checkBattleFps(label, st, baseline) {
  const relOk = baseline ? st.median >= 0.9 * baseline : false;
  check(`${label}: median >= 55 or >= 90% of baseline(${baseline})`, st.median >= 55 || relOk, { ...st, baseline });
  check(`${label}: p5 >= 40`, st.p5 >= 40, st);
}

async function scFps(page) {
  await call(page, 'window.__game.start()');
  await call(page, 'window.__game.setSquad(120)');
  const baseline = await measureBaseline(page);
  await call(page, 'window.__game.setTimeScale(2)');
  await call(page, 'window.__game.teleport(-200)');
  await pollUntil(page, "s.phase==='boss'", 8000);
  await call(page, 'window.__game.killBoss()');
  await pollUntil(page, "s.phase==='run'", 8000);
  await call(page, 'window.__game.setTimeScale(1)');
  await call(page, 'window.__game.teleport(-262)');
  await pollUntil(page, "s.phase==='horde'", 15000);
  await new Promise((r) => setTimeout(r, 500));
  const samples = [];
  for (let i = 0; i < 200; i++) {
    const s = await S(page);
    samples.push(s.fps);
    if (s.phase !== 'horde') break;
    await new Promise((r) => setTimeout(r, 80));
  }
  const st = fpsStats(samples);
  check('fps samples collected (>=8)', st.n >= 8, st);
  checkBattleFps('fps during horde (120 squad)', st, baseline);
}

const SCENARIOS = {
  quick: scQuick, gates: scGates, growth: scGrowth, obstacles: scObstacles,
  boss: scBoss, horde: scHorde, gameover: scGameover, full: scFull, fps: scFps,
};

const name = process.argv[2];
if (!SCENARIOS[name]) {
  console.error('scenario required: ' + Object.keys(SCENARIOS).join(' | '));
  process.exit(2);
}

const { server, browser, page, errors } = await boot(name);
try {
  await SCENARIOS[name](page);
} catch (e) {
  check('scenario threw no error', false, String(e && e.stack || e));
}
check('no page errors', errors.length === 0, errors.slice(0, 5));
const report = { scenario: name, when: new Date().toISOString(), pass: checks.every((c) => c.pass), checks };
fs.writeFileSync(path.join(SHOTS, `${name}-report.json`), JSON.stringify(report, null, 2));
console.log(`\n== ${name}: ${report.pass ? 'ALL PASS' : 'FAILURES PRESENT'} ==`);
await browser.close();
if (server) server.kill();
process.exit(report.pass ? 0 : 1);
