import { gameData } from "../../data/GameData";
import { HEROES } from "../../data/heroes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function HeroPanel() {
  const [heroStates, setHeroStates] = useState(gameData.getState().heroes);
  const [resources, setResources] = useState(gameData.getState().resources);

  useEffect(() => {
    return gameData.subscribe(() => {
      setHeroStates([...gameData.getState().heroes]);
      setResources({ ...gameData.getState().resources });
    });
  }, []);

  const handleLevelUp = (heroId: string) => {
    const success = gameData.levelUpHero(heroId);
    if (success) toast.success("レベルアップ！");
    else toast.error("ゴールドが不足しています");
  };

  const handleRecruit = (heroId: string) => {
    const def = HEROES.find(h => h.id === heroId);
    if (!def) return;
    const cost = def.rarity * 100;
    if (resources.gems < cost) { toast.error("ジェムが不足しています"); return; }
    gameData.spendResources({ gems: cost });
    gameData.addHero(heroId);
    toast.success(`${def.name} を獲得！`);
  };

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-[#39FF14] mb-4 font-mono">英雄一覧</h2>
      <div className="space-y-3">
        {HEROES.map(def => {
          const state = heroStates.find(h => h.id === def.id);
          const owned = !!state;
          const levelCost = state ? state.level * 100 : 0;
          return (
            <div key={def.id} className={`bg-[#0F2A30] border rounded-lg p-3 ${owned ? 'border-[#39FF14]/30' : 'border-gray-700/50'}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#1A3A42] flex items-center justify-center text-lg border border-[#39FF14]/20">
                  {def.type === 'assault' ? '⚔' : def.type === 'support' ? '♥' : '◆'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{def.name}</span>
                    <span className="text-xs text-gray-400">{def.title}</span>
                  </div>
                  <div className="flex items-center gap-1 my-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < def.rarity ? 'text-yellow-400' : 'text-gray-600'}`}>*</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{def.description}</p>
                  {owned && state && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-[#39FF14]">Lv.{state.level}</span>
                      <span className="text-red-400">ATK {def.baseAtk + state.level * 2}</span>
                      <span className="text-blue-400">DEF {def.baseDef + state.level}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2">
                {owned ? (
                  <button
                    onClick={() => handleLevelUp(def.id)}
                    disabled={resources.gold < levelCost}
                    className={`w-full text-xs py-1.5 rounded font-bold transition-all ${
                      resources.gold >= levelCost
                        ? 'bg-[#39FF14] text-black hover:bg-[#2ECC0F]'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    レベルアップ (G{levelCost})
                  </button>
                ) : (
                  <button
                    onClick={() => handleRecruit(def.id)}
                    disabled={resources.gems < def.rarity * 100}
                    className={`w-full text-xs py-1.5 rounded font-bold transition-all ${
                      resources.gems >= def.rarity * 100
                        ? 'bg-purple-600 text-white hover:bg-purple-500'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    獲得 (D{def.rarity * 100})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
