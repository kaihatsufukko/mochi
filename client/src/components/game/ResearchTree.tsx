import { gameData } from "../../data/GameData";
import { RESEARCH_TREE } from "../../data/research";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ResearchTree() {
  const [researchStates, setResearchStates] = useState(gameData.getState().research);
  const [resources, setResources] = useState(gameData.getState().resources);

  useEffect(() => {
    return gameData.subscribe(() => {
      setResearchStates([...gameData.getState().research]);
      setResources({ ...gameData.getState().resources });
    });
  }, []);

  const isCompleted = (id: string) => researchStates.find(r => r.id === id)?.completed || false;
  const canResearch = (def: typeof RESEARCH_TREE[0]) => {
    if (isCompleted(def.id)) return false;
    if (def.prerequisites.some(p => !isCompleted(p))) return false;
    if (resources.gold < def.cost.gold || resources.biofuel < def.cost.biofuel) return false;
    return true;
  };

  const handleResearch = (id: string) => {
    const def = RESEARCH_TREE.find(r => r.id === id);
    if (!def || !canResearch(def)) { toast.error("条件を満たしていません"); return; }
    gameData.spendResources({ gold: def.cost.gold, biofuel: def.cost.biofuel });
    gameData.completeResearch(id);
    toast.success(`${def.name} 研究完了！`);
  };

  const categories = ['combat', 'economy', 'defense'] as const;
  const categoryNames = { combat: '戦闘', economy: '経済', defense: '防御' };

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-[#39FF14] mb-4 font-mono">研究ツリー</h2>
      {categories.map(cat => (
        <div key={cat} className="mb-4">
          <h3 className="text-sm font-bold text-white mb-2">{categoryNames[cat]}</h3>
          <div className="space-y-2">
            {RESEARCH_TREE.filter(r => r.category === cat).map(def => {
              const completed = isCompleted(def.id);
              const available = canResearch(def);
              const prereqsMet = def.prerequisites.every(p => isCompleted(p));
              return (
                <div key={def.id} className={`bg-[#0F2A30] border rounded-lg p-3 ${
                  completed ? 'border-[#39FF14]/50' : prereqsMet ? 'border-gray-600' : 'border-gray-800 opacity-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{def.name}</div>
                      <div className="text-xs text-gray-400">{def.description}</div>
                      {!completed && <div className="text-xs text-gray-500 mt-1">G{def.cost.gold} B{def.cost.biofuel}</div>}
                    </div>
                    {completed ? (
                      <span className="text-xs text-[#39FF14] font-bold px-2 py-1 bg-[#39FF14]/10 rounded">完了</span>
                    ) : (
                      <button
                        onClick={() => handleResearch(def.id)}
                        disabled={!available}
                        className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                          available ? 'bg-[#39FF14] text-black hover:bg-[#2ECC0F]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        研究
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
