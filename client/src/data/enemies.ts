export interface EnemyDef {
  id: string;
  name: string;
  type: 'basic' | 'fast' | 'tank' | 'boss';
  hp: number;
  speed: number;
  damage: number;
  color: string;
  size: number;
  xpReward: number;
  goldReward: number;
}

export const ENEMIES: EnemyDef[] = [
  { id: 'zombie_basic', name: 'ウォーカー', type: 'basic', hp: 30, speed: 1.5, damage: 5, color: '#4a7c59', size: 0.8, xpReward: 10, goldReward: 5 },
  { id: 'zombie_fast', name: 'ランナー', type: 'fast', hp: 20, speed: 3.0, damage: 8, color: '#8b5cf6', size: 0.6, xpReward: 15, goldReward: 8 },
  { id: 'zombie_tank', name: 'ブルート', type: 'tank', hp: 100, speed: 0.8, damage: 15, color: '#dc2626', size: 1.2, xpReward: 30, goldReward: 15 },
  { id: 'zombie_boss', name: 'ミュータント', type: 'boss', hp: 500, speed: 0.5, damage: 30, color: '#ff006e', size: 2.0, xpReward: 200, goldReward: 100 },
];
