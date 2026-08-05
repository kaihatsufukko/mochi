export interface MissionDef {
  id: string;
  name: string;
  description: string;
  target: number;
  type: 'kill' | 'wave' | 'upgrade' | 'research' | 'collect';
  reward: { gold?: number; food?: number; steel?: number; biofuel?: number; gems?: number };
}

export const DAILY_MISSIONS: MissionDef[] = [
  { id: 'kill_20', name: 'ゾンビ掃討', description: 'ゾンビを20体撃破', target: 20, type: 'kill', reward: { gold: 100, food: 50 } },
  { id: 'wave_5', name: 'ウェーブ突破', description: '5ウェーブクリア', target: 5, type: 'wave', reward: { gold: 150, steel: 80 } },
  { id: 'upgrade_1', name: '施設強化', description: '建物を1回アップグレード', target: 1, type: 'upgrade', reward: { biofuel: 50, gems: 10 } },
  { id: 'collect_500', name: '資源収集', description: 'ゴールドを500獲得', target: 500, type: 'collect', reward: { food: 100, steel: 50 } },
];

