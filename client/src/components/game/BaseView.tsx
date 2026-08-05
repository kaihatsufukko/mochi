import { gameData } from "../../data/GameData";
import { BUILDINGS } from "../../data/buildings";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BaseView() {
  const [buildings, setBuildings] = useState(gameData.getState().buildings);
  const [resources, setResources] = useState(gameData.getState().resources);

  useEffect(() => {
    return gameData.subscribe(() => {
      setBuildings([...gameData.getState().buildings]);
      setResources({ ...gameData.getState().resources });
    });
  }, []);

  const handleUpgrade = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    const def = BUILDINGS.find(b => b.id === buildingId);
    if (!building || !def) return;
    if (building.level >= def.maxLevel) {
      toast.error("最大レベルに達しています");
      return;
    }
    const cost = def.costs[building.level];
    if (resources.gold < cost.gold || resources.steel < cost.steel) {
      toast.error("資源が不足しています");
      return;
    }
    gameData.spendResources({ gold: cost.gold, steel: cost.steel });
    gameData.upgradeBuilding(buildingId);
    toast.success(`${def.name} をLv.${building.level + 1}にアップグレード！`);
  };

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-[#39FF14] mb-4 font-mono">基地建設</h2>
      <div className="grid grid-cols-2 gap-3">
        {BUILDINGS.map(def => {
          const state = buildings.find(b => b.id === def.id);
          const level = state?.level || 0;
          const cost = level < def.maxLevel ? def.costs[level] : null;
          const canAfford = cost ? resources.gold >= cost.gold && resources.steel >= cost.steel : false;
          return (
            <div key={def.id} className="bg-[#0F2A30] border border-[#39FF14]/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{def.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{def.name}</div>
                  <div className="text-xs text-[#39FF14]">Lv.{level}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">{def.description}</p>
              {level < def.maxLevel && cost && (
                <div className="text-xs text-gray-500 mb-2">
                  G{cost.gold} S{cost.steel}
                </div>
              )}
              <button
                onClick={() => handleUpgrade(def.id)}
                disabled={!canAfford || level >= def.maxLevel}
                className={`w-full text-xs py-1.5 rounded font-bold transition-all ${
                  canAfford && level < def.maxLevel
                    ? 'bg-[#39FF14] text-black hover:bg-[#2ECC0F]'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {level >= def.maxLevel ? 'MAX' : 'アップグレード'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
