export interface ResearchDef {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'economy' | 'defense';
  tier: number;
  prerequisites: string[];
  cost: { gold: number; biofuel: number };
  effect: string;
}

export const RESEARCH_TREE: ResearchDef[] = [
  { id: 'atk_1', name: '強化弾薬', description: '基本攻撃力+10%', category: 'combat', tier: 1, prerequisites: [], cost: { gold: 200, biofuel: 50 }, effect: 'atk+10%' },
  { id: 'spd_1', name: '高速装填', description: '射撃速度+15%', category: 'combat', tier: 1, prerequisites: [], cost: { gold: 200, biofuel: 50 }, effect: 'fireRate+15%' },
  { id: 'atk_2', name: '貫通弾頭', description: '基本攻撃力+20%', category: 'combat', tier: 2, prerequisites: ['atk_1'], cost: { gold: 500, biofuel: 150 }, effect: 'atk+20%' },
  { id: 'crit_1', name: 'クリティカル理論', description: 'クリティカル率+10%', category: 'combat', tier: 2, prerequisites: ['spd_1'], cost: { gold: 500, biofuel: 150 }, effect: 'crit+10%' },
  { id: 'gather_1', name: '効率採集', description: '資源獲得+20%', category: 'economy', tier: 1, prerequisites: [], cost: { gold: 150, biofuel: 30 }, effect: 'gather+20%' },
  { id: 'prod_1', name: '自動生産', description: 'オフライン生産+25%', category: 'economy', tier: 1, prerequisites: [], cost: { gold: 150, biofuel: 30 }, effect: 'offline+25%' },
  { id: 'gather_2', name: '高度精錬', description: '資源獲得+40%', category: 'economy', tier: 2, prerequisites: ['gather_1'], cost: { gold: 400, biofuel: 100 }, effect: 'gather+40%' },
  { id: 'storage_1', name: '圧縮保管', description: '保管上限+50%', category: 'economy', tier: 2, prerequisites: ['prod_1'], cost: { gold: 400, biofuel: 100 }, effect: 'storage+50%' },
  { id: 'hp_1', name: '強化装甲', description: 'HP+15%', category: 'defense', tier: 1, prerequisites: [], cost: { gold: 200, biofuel: 50 }, effect: 'hp+15%' },
  { id: 'shield_1', name: 'エネルギーシールド', description: 'ダメージ軽減+10%', category: 'defense', tier: 1, prerequisites: [], cost: { gold: 200, biofuel: 50 }, effect: 'def+10%' },
  { id: 'hp_2', name: 'バイオ再生', description: 'HP+30%、自動回復', category: 'defense', tier: 2, prerequisites: ['hp_1'], cost: { gold: 500, biofuel: 150 }, effect: 'hp+30%,regen' },
  { id: 'shield_2', name: '反射障壁', description: 'ダメージ反射+15%', category: 'defense', tier: 2, prerequisites: ['shield_1'], cost: { gold: 500, biofuel: 150 }, effect: 'reflect+15%' },
];
