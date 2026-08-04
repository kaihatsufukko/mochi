// レベル配置データ。z は負方向が前方（プレイヤーは z を減らして進む）。
// side: ゲート対の左右。left = x -2.2, right = x +2.2（対で1組、単独ゲートは center 0）。

export const LEVEL = {
  startZ: 0,
  endZ: -330,
  bossZ: -210,
  hordeZ: -300,

  // ゲート対: 通過ラインは z。青(add/mul)と赤(sub/div)を混ぜる。
  gatePairs: [
    { z: -30,  left: { op: 'add', value: 3 },  right: { op: 'sub', value: 4 } },
    { z: -60,  left: { op: 'sub', value: 6 },  right: { op: 'mul', value: 2 } },
    { z: -95,  left: { op: 'add', value: 8 },  right: { op: 'div', value: 2 } },
    { z: -130, left: { op: 'mul', value: 2 },  right: { op: 'sub', value: 10 } },
    { z: -165, left: { op: 'div', value: 3 },  right: { op: 'add', value: 12 } },
    { z: -195, left: { op: 'add', value: 6 },  right: { op: 'mul', value: 2 } },  // ボス前の補給
    { z: -240, left: { op: 'mul', value: 2 },  right: { op: 'sub', value: 15 } }, // ボス後
    { z: -270, left: { op: 'add', value: 10 }, right: { op: 'div', value: 2 } },
  ],

  // 氷壁: ジグザグ配置 (x はブロック中心, 幅 halfW)
  iceWalls: [
    { z: -45,  x: -2.4, halfW: 2.1 },
    { z: -75,  x: 2.4,  halfW: 2.1 },
    { z: -110, x: -2.4, halfW: 2.1 },
    { z: -145, x: 2.4,  halfW: 2.1 },
    { z: -255, x: -2.4, halfW: 2.1 },
    { z: -283, x: 2.4,  halfW: 2.1 },
  ],

  barrels: [
    { z: -52,  x: 1.8 },
    { z: -88,  x: -1.5 },
    { z: -140, x: 0 },
    { z: -228, x: 1.2 },
    { z: -262, x: -1.8 },
  ],

  supplies: [
    { z: -68,  x: -0.8 },
    { z: -120, x: 1.6 },
    { z: -185, x: -1.2 },
    { z: -248, x: 0.5 },
  ],

  // 道中ゾンビ小集団 (count 体を z 周辺に散らす)
  zombiePacks: [
    { z: -40,  x: 0,    count: 4 },
    { z: -70,  x: -1.5, count: 5 },
    { z: -100, x: 1.5,  count: 6 },
    { z: -125, x: -1,   count: 6 },
    { z: -155, x: 1,    count: 8 },
    { z: -178, x: 0,    count: 8 },
    { z: -235, x: 0,    count: 10 },
    { z: -265, x: -1,   count: 10 },
    { z: -288, x: 1,    count: 10 },
  ],
};
