// ドラッグ入力: dx(px) を横速度に変換。クリック位置は使わない相対ドラッグ。
import { GAME } from '../game/constants.js';

export class DragInput {
  constructor(el) {
    this.el = el;
    this.dragging = false;
    this.lastX = 0;
    this.targetX = 0;      // 目標 x (world)
    this._down = (e) => {
      this.dragging = true;
      this.lastX = this._px(e);
    };
    this._move = (e) => {
      if (!this.dragging) return;
      const x = this._px(e);
      const dx = x - this.lastX;
      this.lastX = x;
      // 画面幅に対する感度補正: 基準幅 400px
      const k = GAME.dragSensitivity * (400 / Math.max(200, this.el.clientWidth));
      this.targetX += dx * k * this.el.clientWidth / 400 * 2.2;
      const c = GAME.playerClampX;
      this.targetX = Math.max(-c, Math.min(c, this.targetX));
    };
    this._up = () => { this.dragging = false; };
    el.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }
  _px(e) { return e.clientX; }
  setTarget(x) {
    const c = GAME.playerClampX;
    this.targetX = Math.max(-c, Math.min(c, x));
  }
  dispose() {
    this.el.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
}
