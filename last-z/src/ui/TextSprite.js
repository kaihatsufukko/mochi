// TextSprite — canvas テクスチャの極太数字/文字スプライト (docs/architecture.md §6)
// makeTextSprite(text, opts) → THREE.Sprite
//   sprite.userData.update(newText) で同じ canvas/texture に再描画（テクスチャ再生成なし）。
import * as THREE from 'three';

const FONT_FAMILY =
  "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.arcTo(x + w, y, x + w, y + rr, rr);
  g.lineTo(x + w, y + h - rr);
  g.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  g.lineTo(x + rr, y + h);
  g.arcTo(x, y + h, x, y + h - rr, rr);
  g.lineTo(x, y + rr);
  g.arcTo(x, y, x + rr, y, rr);
  g.closePath();
}

export function makeTextSprite(text, opts = {}) {
  const {
    fg = '#ffffff',
    bg = null,          // null = 透明。色指定で角丸パネル背景
    outline = '#000000',
    outlinePx = 8,
    fontPx = 140,
    w = 256,
    h = 256,
    scale = 2,          // ワールドでのスプライト幅 (u)
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');

  function draw(str) {
    g.clearRect(0, 0, w, h);

    if (bg) {
      const pad = Math.max(4, Math.round(Math.min(w, h) * 0.03));
      g.fillStyle = bg;
      roundRect(g, pad, pad, w - pad * 2, h - pad * 2, Math.min(w, h) * 0.18);
      g.fill();
    }

    // フォントサイズを幅に収まるよう自動縮小（極太のまま）
    let px = fontPx;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const maxW = w - outlinePx * 2 - w * 0.08;
    g.font = `900 ${px}px ${FONT_FAMILY}`;
    const measured = g.measureText(str).width;
    if (measured > maxW && measured > 0) {
      px = Math.max(10, Math.floor(px * (maxW / measured)));
      g.font = `900 ${px}px ${FONT_FAMILY}`;
    }

    const cx = w / 2;
    const cy = h / 2;

    // 太い縁取り → 本体の順
    if (outline && outlinePx > 0) {
      g.lineJoin = 'round';
      g.miterLimit = 2;
      g.lineWidth = outlinePx * 2; // strokeText は中心線基準なので実効太さ outlinePx
      g.strokeStyle = outline;
      g.strokeText(str, cx, cy);
    }
    g.fillStyle = fg;
    g.fillText(str, cx, cy);
  }

  draw(String(text));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale * (h / w), 1);

  let current = String(text);
  sprite.userData.update = function update(newText) {
    const s = String(newText);
    if (s === current) return;
    current = s;
    draw(s);
    texture.needsUpdate = true;
  };

  return sprite;
}
