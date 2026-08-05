export interface HeroDef {
  id: string;
  name: string;
  title: string;
  rarity: number;
  type: 'assault' | 'support' | 'tank';
  baseAtk: number;
  baseDef: number;
  baseHp: number;
  skill: string;
  description: string;
}

export const HEROES: HeroDef[] = [
  { id: 'recon_01', name: 'ヴァイパー', title: '先遣偵察兵', rarity: 2, type: 'assault', baseAtk: 15, baseDef: 8, baseHp: 100, skill: '毒弾散布', description: '素早い動きで敵陣を撹乱する元特殊部隊員。' },
  { id: 'medic_01', name: 'セラフィム', title: '戦場医師', rarity: 3, type: 'support', baseAtk: 8, baseDef: 12, baseHp: 120, skill: 'バイオヒール', description: 'ウイルス研究者から転身した衛生兵。味方を回復する。' },
  { id: 'heavy_01', name: 'アイアンウォール', title: '重装防衛兵', rarity: 3, type: 'tank', baseAtk: 10, baseDef: 20, baseHp: 200, skill: '鉄壁展開', description: '改造防護服を纏う元機動隊員。前線を死守する。' },
  { id: 'sniper_01', name: 'ファントム', title: '長距離狙撃手', rarity: 4, type: 'assault', baseAtk: 25, baseDef: 5, baseHp: 80, skill: '貫通弾', description: '一撃必殺を信条とする孤高のスナイパー。' },
  { id: 'scientist_01', name: 'Dr.ノヴァ', title: '変異学者', rarity: 4, type: 'support', baseAtk: 12, baseDef: 10, baseHp: 110, skill: '変異促進', description: 'ウイルスを逆利用する天才科学者。全体バフを付与。' },
  { id: 'berserker_01', name: 'レイジ', title: '暴走戦士', rarity: 5, type: 'assault', baseAtk: 30, baseDef: 6, baseHp: 150, skill: '狂乱モード', description: '半感染状態を制御する危険な戦士。HP減少で攻撃力上昇。' },
];
