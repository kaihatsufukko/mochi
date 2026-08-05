import { gameData } from "../../data/GameData";
import { useEffect, useState } from "react";

export default function ResourceBar() {
  const [resources, setResources] = useState(gameData.getState().resources);

  useEffect(() => {
    return gameData.subscribe(() => {
      setResources({ ...gameData.getState().resources });
    });
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#0A1F25]/90 border-b border-[#39FF14]/20 text-xs font-mono overflow-x-auto relative z-30">
      <span className="text-yellow-400">G {resources.gold.toLocaleString()}</span>
      <span className="text-green-400">F {resources.food.toLocaleString()}</span>
      <span className="text-gray-300">S {resources.steel.toLocaleString()}</span>
      <span className="text-purple-400">B {resources.biofuel.toLocaleString()}</span>
      <span className="text-cyan-400">D {resources.gems}</span>
    </div>
  );
}
