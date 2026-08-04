// ゲート看板: 撃つと値が育ち、通過で部隊数へ演算適用
import * as THREE from 'three';
import { COLORS, GAME } from './constants.js';
import { createGate, applyGate, growGate, gateLabel, isPositiveGate } from './gateMath.js';
import { makeTextSprite } from '../ui/TextSprite.js';

const PANEL_W = 4.0;   // 各ゲートの横幅 (左右で橋をほぼカバー)
const PANEL_H = 2.2;
const GATE_X = 2.2;    // 左右ゲート中心

export class Gates {
  constructor(scene, ctx) {
    this.scene = scene;
    this.list = [];
    let id = 0;
    for (const pair of ctx.level.gatePairs) {
      for (const side of ['left', 'right']) {
        const def = pair[side];
        if (!def) continue;
        const gate = createGate(def.op, def.value);
        const x = side === 'left' ? -GATE_X : GATE_X;
        const g = this._build(id++, gate, x, pair.z, side);
        this.list.push(g);
      }
    }
  }

  _build(id, gate, x, z, side) {
    const positive = isPositiveGate(gate);
    const color = positive ? COLORS.gateBlue : COLORS.gateRed;
    const group = new THREE.Group();

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    panel.position.y = PANEL_H / 2 + 0.15;
    group.add(panel);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(PANEL_W + 0.15, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color })
    );
    frame.position.y = PANEL_H + 0.25;
    group.add(frame);

    for (const px of [-PANEL_W / 2, PANEL_W / 2]) {
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, PANEL_H + 0.3, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xdddddd })
      );
      pole.position.set(px, (PANEL_H + 0.3) / 2, 0);
      group.add(pole);
    }

    const label = makeTextSprite(gateLabel(gate), {
      fg: '#ffffff', outline: '#000000', outlinePx: 10,
      fontPx: 150, w: 320, h: 200, scale: 3.0,
    });
    label.position.set(0, PANEL_H / 2 + 0.35, 0.3);
    group.add(label);

    group.position.set(x, 0, z);
    this.scene.add(group);

    return {
      id, gate, x, z, side, group, panel, label,
      passed: false, dead: false, flash: 0,
      pos: new THREE.Vector3(x, 0, z),
    };
  }

  collectTargets(out, ctx) {
    for (const g of this.list) {
      if (g.passed || g.dead) continue;
      out.push({
        kind: 'gate',
        pos: g.pos,
        radius: PANEL_W / 2,
        dead: false,
        onHit: () => {
          ctx.audio.play('gate_hit');
          const grown = growGate(g.gate);
          if (grown.changed) {
            g.gate = { op: grown.op, value: grown.value };
            ctx.audio.play('gate_value_change');
            g.label.userData.update(gateLabel(g.gate));
            g.flash = 0.12;
          }
          return true;
        },
      });
    }
  }

  // 通過判定: プレイヤー z がゲート線を跨いだ瞬間、プレイヤーが居る側のゲートを適用
  update(dt, ctx) {
    for (const g of this.list) {
      if (g.flash > 0) {
        g.flash -= dt;
        g.panel.material.opacity = g.flash > 0 ? 0.85 : 0.5;
      }
      if (g.passed) continue;
      if (ctx.playerZ <= g.z) {
        // この対の全ゲートを passed に
        const pairGates = this.list.filter((o) => o.z === g.z && !o.passed);
        const onLeft = ctx.playerX < 0;
        const chosen = pairGates.find((o) => (o.side === 'left') === onLeft) || pairGates[0];
        for (const o of pairGates) o.passed = true;
        this._applyPass(chosen, ctx);
      }
    }
  }

  _applyPass(g, ctx) {
    const before = ctx.squad.count;
    const after = Math.min(GAME.maxSquad, applyGate(before, g.gate));
    ctx.audio.play(isPositiveGate(g.gate) ? 'gate_pass_blue' : 'gate_pass_red');
    ctx.squad.applyGateResult(after, g.gate);
    // 通過演出: パネルをフェードアウト
    g.dead = true;
    const fade = () => {
      g.panel.material.opacity -= 0.05;
      if (g.panel.material.opacity > 0) requestAnimationFrame(fade);
      else g.group.visible = false;
    };
    fade();
  }

  state() {
    return this.list.map((g) => ({
      id: g.id, z: g.z, x: g.x, side: g.side,
      op: g.gate.op, value: g.gate.value, passed: g.passed,
    }));
  }

  dispose() {
    for (const g of this.list) this.scene.remove(g.group);
  }
}
