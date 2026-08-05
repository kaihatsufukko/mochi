export interface BuildingDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  costs: { gold: number; steel: number }[];
  benefits: string[];
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'hq',
    name: '司令部',
    description: '基地の中枢。レベルアップで他の建物の上限が解放される。',
    icon: '🏛️',
    maxLevel: 10,
    costs: [
      { gold: 0, steel: 0 }, { gold: 200, steel: 100 }, { gold: 500, steel: 250 },
      { gold: 1000, steel: 500 }, { gold: 2000, steel: 1000 }, { gold: 4000, steel: 2000 },
      { gold: 8000, steel: 4000 }, { gold: 16000, steel: 8000 }, { gold: 32000, steel: 16000 },
      { gold: 64000, steel: 32000 },
    ],
    benefits: ['建物上限+1', '英雄スロット+1', '研究速度+5%'],
  },
  {
    id: 'barracks',
    name: '兵舎',
    description: '兵士を訓練する。レベルアップで訓練速度と容量が増加。',
    icon: '⚔️',
    maxLevel: 10,
    costs: [
      { gold: 100, steel: 50 }, { gold: 250, steel: 120 }, { gold: 500, steel: 250 },
      { gold: 1000, steel: 500 }, { gold: 2000, steel: 1000 }, { gold: 4000, steel: 2000 },
      { gold: 8000, steel: 4000 }, { gold: 16000, steel: 8000 }, { gold: 32000, steel: 16000 },
      { gold: 64000, steel: 32000 },
    ],
    benefits: ['攻撃力+3%', '兵士容量+10', '訓練速度+5%'],
  },
  {
    id: 'lab',
    name: '研究所',
    description: '新技術を研究する。レベルアップで研究速度が向上。',
    icon: '🔬',
    maxLevel: 10,
    costs: [
      { gold: 150, steel: 80 }, { gold: 300, steel: 150 }, { gold: 600, steel: 300 },
      { gold: 1200, steel: 600 }, { gold: 2400, steel: 1200 }, { gold: 4800, steel: 2400 },
      { gold: 9600, steel: 4800 }, { gold: 19200, steel: 9600 }, { gold: 38400, steel: 19200 },
      { gold: 76800, steel: 38400 },
    ],
    benefits: ['研究速度+10%', '新研究解放', 'バフ効果+5%'],
  },
  {
    id: 'armory',
    name: '武器庫',
    description: '武器と装備を保管・強化する。',
    icon: '🛡️',
    maxLevel: 10,
    costs: [
      { gold: 120, steel: 100 }, { gold: 280, steel: 200 }, { gold: 560, steel: 400 },
      { gold: 1120, steel: 800 }, { gold: 2240, steel: 1600 }, { gold: 4480, steel: 3200 },
      { gold: 8960, steel: 6400 }, { gold: 17920, steel: 12800 }, { gold: 35840, steel: 25600 },
      { gold: 71680, steel: 51200 },
    ],
    benefits: ['武器ダメージ+5%', '装備スロット+1', '防御力+3%'],
  },
  {
    id: 'storage',
    name: '倉庫',
    description: '資源の保管上限を増加させる。',
    icon: '📦',
    maxLevel: 10,
    costs: [
      { gold: 80, steel: 40 }, { gold: 160, steel: 80 }, { gold: 320, steel: 160 },
      { gold: 640, steel: 320 }, { gold: 1280, steel: 640 }, { gold: 2560, steel: 1280 },
      { gold: 5120, steel: 2560 }, { gold: 10240, steel: 5120 }, { gold: 20480, steel: 10240 },
      { gold: 40960, steel: 20480 },
    ],
    benefits: ['保管上限+500', '保護量+100', '採集速度+3%'],
  },
  {
    id: 'farm',
    name: '生産施設',
    description: 'オフライン中も資源を生産する。',
    icon: '🏭',
    maxLevel: 10,
    costs: [
      { gold: 100, steel: 60 }, { gold: 200, steel: 120 }, { gold: 400, steel: 240 },
      { gold: 800, steel: 480 }, { gold: 1600, steel: 960 }, { gold: 3200, steel: 1920 },
      { gold: 6400, steel: 3840 }, { gold: 12800, steel: 7680 }, { gold: 25600, steel: 15360 },
      { gold: 51200, steel: 30720 },
    ],
    benefits: ['生産速度+20%', 'オフライン上限+1h', '資源種類+1'],
  },
];

