// HUD — DOM オーバーレイ (docs/architecture.md §6)
// 部隊数バッジ / ボスHPバー / ダメージポップ / 状態バナー / START・RESTART。
// 全スタイルは JS で注入。containerEl (#frame) 基準の絶対配置。豪華さ不要、視認性最優先。

const STYLE_ID = 'hud-style';

const CSS = `
.hud-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
  font-family: 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  user-select: none;
  -webkit-user-select: none;
}
.hud-root * { box-sizing: border-box; }

/* --- 部隊数バッジ --- */
.hud-squad {
  position: absolute;
  left: 50%;
  bottom: 3.5%;
  transform: translateX(-50%) scale(1);
  background: #1e6fff;
  color: #ffffff;
  font-weight: 900;
  line-height: 1;
  padding: 0.28em 0.62em;
  border-radius: 999px;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.55);
  text-shadow:
    -2px -2px 0 #08245e, 2px -2px 0 #08245e,
    -2px  2px 0 #08245e, 2px  2px 0 #08245e;
  transition: transform 0.12s ease-out;
  white-space: nowrap;
}
.hud-squad.pop {
  transform: translateX(-50%) scale(1.25);
}

/* --- ボス --- */
.hud-boss {
  position: absolute;
  top: 2.5%;
  left: 50%;
  transform: translateX(-50%);
  width: 78%;
  text-align: center;
  color: #ffffff;
}
.hud-boss-label {
  font-weight: 900;
  color: #ff5548;
  letter-spacing: 0.12em;
  text-shadow:
    -2px -2px 0 #000, 2px -2px 0 #000,
    -2px  2px 0 #000, 2px  2px 0 #000;
}
.hud-boss-num {
  font-weight: 900;
  line-height: 1.05;
  color: #ffffff;
  text-shadow:
    -3px -3px 0 #000, 3px -3px 0 #000,
    -3px  3px 0 #000, 3px  3px 0 #000,
    0 4px 8px rgba(0,0,0,0.6);
}
.hud-boss-bar {
  margin-top: 0.35em;
  width: 100%;
  height: 14px;
  background: #000000;
  border: 3px solid #ffffff;
  border-radius: 8px;
  overflow: hidden;
}
.hud-boss-bar-fill {
  height: 100%;
  width: 100%;
  background: #e8302a;
  transition: width 0.1s linear;
}

/* --- ポップ --- */
.hud-popup {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    -2px -2px 0 #000, 2px -2px 0 #000,
    -2px  2px 0 #000, 2px  2px 0 #000;
  animation: hudPopupRise 0.8s ease-out forwards;
}
@keyframes hudPopupRise {
  0%   { opacity: 1; margin-top: 0; }
  60%  { opacity: 1; }
  100% { opacity: 0; margin-top: -30px; }
}

/* --- バナー --- */
.hud-banner {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 94%;
  padding: 0.35em 0;
  text-align: center;
  font-weight: 900;
  line-height: 1.05;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.6);
  white-space: nowrap;
}
.hud-banner.clear { background: #ffd23c; color: #000000; border: 4px solid #ffffff; }
.hud-banner.over  { background: #e8302a; color: #ffffff; border: 4px solid #ffffff; }
.hud-banner.warn  { background: #8a2be2; color: #ffffff; border: 4px solid #ffffff; }
.hud-banner.over,
.hud-banner.warn {
  text-shadow:
    -2px -2px 0 #000, 2px -2px 0 #000,
    -2px  2px 0 #000, 2px  2px 0 #000;
}

/* --- START オーバーレイ --- */
.hud-start {
  position: absolute;
  inset: 0;
  background: rgba(6, 10, 22, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  cursor: pointer;
}
.hud-start-text {
  font-weight: 900;
  color: #ffffff;
  text-align: center;
  letter-spacing: 0.06em;
  text-shadow:
    -3px -3px 0 #000, 3px -3px 0 #000,
    -3px  3px 0 #000, 3px  3px 0 #000;
  animation: hudBlink 0.9s step-end infinite;
  white-space: nowrap;
}
@keyframes hudBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.25; }
}

/* --- RESTART ボタン --- */
.hud-restart {
  position: absolute;
  left: 50%;
  bottom: 16%;
  transform: translateX(-50%);
  background: #1e6fff;
  color: #ffffff;
  font-weight: 900;
  font-family: inherit;
  line-height: 1;
  padding: 0.45em 1.1em;
  border: 4px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.6);
  text-shadow:
    -2px -2px 0 #08245e, 2px -2px 0 #08245e,
    -2px  2px 0 #08245e, 2px  2px 0 #08245e;
  pointer-events: auto;
  cursor: pointer;
  white-space: nowrap;
}
.hud-restart:active { transform: translateX(-50%) scale(0.94); }
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

const POPUP_COLORS = {
  gain: '#3fe05a',
  loss: '#ff5548',
  dmg: '#ffffff',
};

export class HUD {
  constructor(containerEl) {
    injectStyles();
    this.container = containerEl;
    if (getComputedStyle(containerEl).position === 'static') {
      containerEl.style.position = 'relative';
    }

    this.root = document.createElement('div');
    this.root.className = 'hud-root';
    containerEl.appendChild(this.root);

    // 部隊数バッジ
    this.squadEl = document.createElement('div');
    this.squadEl.className = 'hud-squad';
    this.squadEl.textContent = '×1';
    this.root.appendChild(this.squadEl);
    this._squadN = 1;
    this._popTimer = 0;

    // ボス
    this.bossEl = document.createElement('div');
    this.bossEl.className = 'hud-boss';
    this.bossEl.style.display = 'none';
    this.bossLabelEl = document.createElement('div');
    this.bossLabelEl.className = 'hud-boss-label';
    this.bossLabelEl.textContent = 'BOSS';
    this.bossNumEl = document.createElement('div');
    this.bossNumEl.className = 'hud-boss-num';
    this.bossNumEl.textContent = '';
    this.bossBarEl = document.createElement('div');
    this.bossBarEl.className = 'hud-boss-bar';
    this.bossFillEl = document.createElement('div');
    this.bossFillEl.className = 'hud-boss-bar-fill';
    this.bossBarEl.appendChild(this.bossFillEl);
    this.bossEl.appendChild(this.bossLabelEl);
    this.bossEl.appendChild(this.bossNumEl);
    this.bossEl.appendChild(this.bossBarEl);
    this.root.appendChild(this.bossEl);

    this._bannerEl = null;
    this._bannerTimer = 0;

    this._applySizes = this._applySizes.bind(this);
    this._applySizes();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._applySizes);
      this._ro.observe(containerEl);
    } else {
      window.addEventListener('resize', this._applySizes);
    }
  }

  _w() {
    return this.container.clientWidth || 360;
  }

  _applySizes() {
    const w = this._w();
    this.squadEl.style.fontSize = Math.max(28, Math.round(w * 0.09)) + 'px';
    this.bossLabelEl.style.fontSize = Math.max(18, Math.round(w * 0.05)) + 'px';
    this.bossNumEl.style.fontSize = Math.max(30, Math.round(w * 0.10)) + 'px';
    this.bossBarEl.style.height = Math.max(10, Math.round(w * 0.035)) + 'px';
    if (this._bannerEl) {
      this._bannerEl.style.fontSize = Math.max(34, Math.round(w * 0.13)) + 'px';
    }
  }

  // 部隊数バッジ「×N」。数値変化でスケールポップ。
  setSquad(n) {
    const v = Math.max(0, Math.floor(n));
    if (v !== this._squadN) {
      this._squadN = v;
      this.squadEl.classList.remove('pop');
      // reflow で transition を再トリガー
      void this.squadEl.offsetWidth;
      this.squadEl.classList.add('pop');
      clearTimeout(this._popTimer);
      this._popTimer = setTimeout(() => this.squadEl.classList.remove('pop'), 130);
    }
    this.squadEl.textContent = '×' + v;
  }

  showBoss(visible) {
    this.bossEl.style.display = visible ? '' : 'none';
  }

  setBossHp(hp, max) {
    const v = Math.max(0, Math.round(hp));
    const m = Math.max(1, Math.round(max));
    this.bossNumEl.textContent = String(v);
    this.bossFillEl.style.width = Math.max(0, Math.min(100, (v / m) * 100)) + '%';
  }

  // ダメージ/増減ポップ。x,y はコンテナ内 css px。0.8s で浮上フェード後に DOM 削除。
  popup(text, x, y, kind) {
    const el = document.createElement('div');
    el.className = 'hud-popup';
    el.textContent = String(text);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = POPUP_COLORS[kind] || POPUP_COLORS.dmg;
    el.style.fontSize = Math.max(22, Math.round(this._w() * 0.065)) + 'px';
    this.root.appendChild(el);
    const kill = () => { if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', kill);
    setTimeout(kill, 1000); // animationend が来ない環境でもリークさせない
  }

  // 中央大バナー。'warn' は 1.2s で自動消滅、'clear'/'over' は残留。
  banner(text, kind) {
    clearTimeout(this._bannerTimer);
    if (this._bannerEl && this._bannerEl.parentNode) {
      this._bannerEl.parentNode.removeChild(this._bannerEl);
    }
    const el = document.createElement('div');
    el.className = 'hud-banner ' + (kind || 'warn');
    el.textContent = String(text);
    el.style.fontSize = Math.max(34, Math.round(this._w() * 0.13)) + 'px';
    this.root.appendChild(el);
    this._bannerEl = el;
    if (kind === 'warn') {
      this._bannerTimer = setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (this._bannerEl === el) this._bannerEl = null;
      }, 1200);
    }
  }

  // TAP TO START 全面オーバーレイ。タップで削除して fn()。
  showStart(fn) {
    const overlay = document.createElement('div');
    overlay.className = 'hud-start';
    const txt = document.createElement('div');
    txt.className = 'hud-start-text';
    txt.textContent = 'TAP TO START';
    txt.style.fontSize = Math.max(28, Math.round(this._w() * 0.10)) + 'px';
    overlay.appendChild(txt);
    this.root.appendChild(overlay);
    const onTap = () => {
      overlay.removeEventListener('pointerdown', onTap);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (fn) fn();
    };
    overlay.addEventListener('pointerdown', onTap);
    this._startOverlay = overlay;
    this._startTap = onTap;
    return overlay;
  }

  // プログラム的に TAP TO START を踏む（__game.start() 用）
  hideStart() {
    if (this._startTap) {
      const f = this._startTap;
      this._startTap = null;
      f();
    }
  }

  // 大きな RESTART ボタン。タップで fn()（削除はしない: reload 前提）。
  showRestart(fn) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hud-restart';
    btn.textContent = 'RESTART';
    btn.style.fontSize = Math.max(26, Math.round(this._w() * 0.08)) + 'px';
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (fn) fn();
    });
    this.root.appendChild(btn);
    return btn;
  }

  dispose() {
    clearTimeout(this._popTimer);
    clearTimeout(this._bannerTimer);
    if (this._ro) this._ro.disconnect();
    else window.removeEventListener('resize', this._applySizes);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
