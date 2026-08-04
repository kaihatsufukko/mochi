// 9:16 縦画面・俯瞰チルト約55°の固定追従カメラ
import * as THREE from 'three';

export const ASPECT = 9 / 16;

export class ChaseCamera {
  constructor() {
    // far は fog 終端に合わせて浅く: SwiftShader 等でも遠方の頂点/ラスタ処理を省く
    this.camera = new THREE.PerspectiveCamera(58, ASPECT, 0.5, 80);
    this._look = new THREE.Vector3();
  }
  // 高さ14 / 前方距離差9.8 → atan(14/9.8) ≈ 55° の俯瞰チルト
  update(playerX, playerZ) {
    const cx = playerX * 0.25;
    this.camera.position.set(cx, 14, playerZ + 7);
    this._look.set(cx, 0, playerZ - 2.8);
    this.camera.lookAt(this._look);
  }
}

// 9:16 letterbox サイズ計算
export function fitFrame(frameEl, renderer, camera) {
  const W = window.innerWidth, H = window.innerHeight;
  let w = Math.floor(H * ASPECT), h = H;
  if (w > W) { w = W; h = Math.floor(W / ASPECT); }
  frameEl.style.width = w + 'px';
  frameEl.style.height = h + 'px';
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = ASPECT;
  camera.updateProjectionMatrix();
}
