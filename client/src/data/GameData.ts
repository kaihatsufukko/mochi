// GameData.ts — Singleton state manager with localStorage persistence

export interface ResourceState {
  gold: number;
  food: number;
  steel: number;
  biofuel: number;
  xp: number;
  gems: number;
}

export interface BuildingState {
  id: string;
  level: number;
  upgrading: boolean;
  upgradeEndTime: number | null;
}

export interface HeroState {
  id: string;
  level: number;
  stars: number;
  equipped: boolean;
  xp: number;
}

export interface ResearchState {
  id: string;
  completed: boolean;
  researching: boolean;
  researchEndTime: number | null;
}

export interface MissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface GameState {
  resources: ResourceState;
  buildings: BuildingState[];
  heroes: HeroState[];
  research: ResearchState[];
  missions: MissionState[];
  currentWave: number;
  maxWaveReached: number;
  totalKills: number;
  lastLoginTime: number;
  playerLevel: number;
  playerXp: number;
}

const DEFAULT_STATE: GameState = {
  resources: { gold: 500, food: 300, steel: 200, biofuel: 100, xp: 0, gems: 50 },
  buildings: [
    { id: 'hq', level: 1, upgrading: false, upgradeEndTime: null },
    { id: 'barracks', level: 0, upgrading: false, upgradeEndTime: null },
    { id: 'lab', level: 0, upgrading: false, upgradeEndTime: null },
    { id: 'armory', level: 0, upgrading: false, upgradeEndTime: null },
    { id: 'storage', level: 0, upgrading: false, upgradeEndTime: null },
    { id: 'farm', level: 0, upgrading: false, upgradeEndTime: null },
  ],
  heroes: [
    { id: 'recon_01', level: 1, stars: 1, equipped: true, xp: 0 },
  ],
  research: [],
  missions: [],
  currentWave: 1,
  maxWaveReached: 1,
  totalKills: 0,
  lastLoginTime: Date.now(),
  playerLevel: 1,
  playerXp: 0,
};

const STORAGE_KEY = 'last_z_save';

class GameDataManager {
  private state: GameState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.load();
  }

  private load(): GameState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return { ...DEFAULT_STATE };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  addResources(resources: Partial<ResourceState>) {
    const r = this.state.resources;
    if (resources.gold) r.gold += resources.gold;
    if (resources.food) r.food += resources.food;
    if (resources.steel) r.steel += resources.steel;
    if (resources.biofuel) r.biofuel += resources.biofuel;
    if (resources.xp) r.xp += resources.xp;
    if (resources.gems) r.gems += resources.gems;
    this.save();
    this.notify();
  }

  spendResources(resources: Partial<ResourceState>): boolean {
    const r = this.state.resources;
    if ((resources.gold || 0) > r.gold) return false;
    if ((resources.food || 0) > r.food) return false;
    if ((resources.steel || 0) > r.steel) return false;
    if ((resources.biofuel || 0) > r.biofuel) return false;
    if ((resources.gems || 0) > r.gems) return false;
    if (resources.gold) r.gold -= resources.gold;
    if (resources.food) r.food -= resources.food;
    if (resources.steel) r.steel -= resources.steel;
    if (resources.biofuel) r.biofuel -= resources.biofuel;
    if (resources.gems) r.gems -= resources.gems;
    this.save();
    this.notify();
    return true;
  }

  upgradeBuilding(buildingId: string): boolean {
    const building = this.state.buildings.find(b => b.id === buildingId);
    if (!building || building.upgrading) return false;
    building.level += 1;
    this.save();
    this.notify();
    return true;
  }

  addHero(heroId: string) {
    if (this.state.heroes.find(h => h.id === heroId)) return;
    this.state.heroes.push({ id: heroId, level: 1, stars: 1, equipped: false, xp: 0 });
    this.save();
    this.notify();
  }

  levelUpHero(heroId: string): boolean {
    const hero = this.state.heroes.find(h => h.id === heroId);
    if (!hero) return false;
    const cost = hero.level * 100;
    if (this.state.resources.gold < cost) return false;
    this.state.resources.gold -= cost;
    hero.level += 1;
    hero.xp = 0;
    this.save();
    this.notify();
    return true;
  }

  completeResearch(researchId: string) {
    let research = this.state.research.find(r => r.id === researchId);
    if (!research) {
      research = { id: researchId, completed: true, researching: false, researchEndTime: null };
      this.state.research.push(research);
    } else {
      research.completed = true;
      research.researching = false;
    }
    this.save();
    this.notify();
  }

  setWave(wave: number) {
    this.state.currentWave = wave;
    if (wave > this.state.maxWaveReached) {
      this.state.maxWaveReached = wave;
    }
    this.save();
    this.notify();
  }

  addKills(count: number) {
    this.state.totalKills += count;
    this.save();
  }

  addPlayerXp(amount: number) {
    this.state.playerXp += amount;
    const xpNeeded = this.state.playerLevel * 200;
    while (this.state.playerXp >= xpNeeded) {
      this.state.playerXp -= xpNeeded;
      this.state.playerLevel += 1;
    }
    this.save();
    this.notify();
  }

  resetGame() {
    this.state = { ...DEFAULT_STATE };
    this.save();
    this.notify();
  }

  calculateOfflineRewards(): Partial<ResourceState> {
    const now = Date.now();
    const elapsed = Math.min(now - this.state.lastLoginTime, 8 * 60 * 60 * 1000); // max 8 hours
    const hours = elapsed / (60 * 60 * 1000);
    const farmLevel = this.state.buildings.find(b => b.id === 'farm')?.level || 0;
    const rewards: Partial<ResourceState> = {
      gold: Math.floor(hours * 20 * (1 + farmLevel * 0.5)),
      food: Math.floor(hours * 15 * (1 + farmLevel * 0.3)),
      steel: Math.floor(hours * 10 * (1 + farmLevel * 0.2)),
    };
    this.state.lastLoginTime = now;
    this.addResources(rewards);
    return rewards;
  }
}

export const gameData = new GameDataManager();
