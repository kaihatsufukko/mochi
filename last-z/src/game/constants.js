// 色・寸法・ゲーム数値の一元定義。architecture.md §7 §11 が正。
export const COLORS = {
  bg: 0x10141f,
  bridge: 0x8a929e,
  bridgeEdge: 0x5a6068,
  soldier: 0x1e6fff,
  leader: 0x4b9bff,
  zombie: 0x6b8e4e,
  gateBlue: 0x1d5dff,
  gateRed: 0xe8302a,
  ice: 0xa8e4ff,
  barrel: 0xff7b1c,
  supply: 0xffd23c,
  boss: 0xcfeaff,
  bullet: 0xfff2a8,
  shadow: 0x000000,
};

export const GAME = {
  bridgeHalfWidth: 4.5,
  playerClampX: 3.2,
  forwardSpeed: 9,          // u/s (moves toward -Z)
  dragSensitivity: 0.02,    // u per px
  volleyInterval: 0.22,     // s
  maxEmitters: 16,          // 1斉射の最大発射体数 (火力は1発ダメージ側でスケール)
  bulletSpeed: 28,
  bulletLife: 1.0,
  bulletDamage: 1,
  zombieHp: 3,
  hordeZombieHp: 2,
  hordeCount: 100,
  zombieContactLoss: 1,
  iceWallHp: 12,
  iceWallContactLoss: 3,
  barrelHp: 3,
  barrelRadius: 4.5,
  supplyGain: 3,
  bossHp: 9560,
  bossAttackInterval: 5,
  bossAttackLoss: 2,
  startSquad: 1,
  maxSquad: 200,
};
