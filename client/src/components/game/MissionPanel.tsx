import { DAILY_MISSIONS } from "../../data/missions";
import { gameData } from "../../data/GameData";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function MissionPanel() {
  const [state, setState] = useState(gameData.getState());
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    return gameData.subscribe(() => {
      setState({ ...gameData.getState() });
    });
  }, []);

  const getMissionProgress = (mission: typeof DAILY_MISSIONS[0]): number => {
    switch (mission.type) {
      case 'kill': return Math.min(state.totalKills, mission.target);
      case 'wave': return Math.min(state.maxWaveReached, mission.target);
      case 'upgrade': {
        const totalLevels = state.buildings.reduce((sum, b) => sum + b.level, 0);
        return Math.min(totalLevels, mission.target);
      }
      case 'collect': return Math.min(state.resources.gold, mission.target);
      default: return 0;
    }
  };

  const handleClaim = (missionId: string) => {
    if (claimed.has(missionId)) return;
    const mission = DAILY_MISSIONS.find(m => m.id === missionId);
    if (!mission) return;
    gameData.addResources(mission.reward);
    setClaimed(prev => new Set(prev).add(missionId));
    toast.success("報酬を獲得しました！");
  };

  return (
    <div className="p-4 pb-20 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-[#39FF14] mb-4 font-mono">デイリーミッション</h2>
      <div className="space-y-3">
        {DAILY_MISSIONS.map(mission => {
          const progress = getMissionProgress(mission);
          const complete = progress >= mission.target;
          const isClaimed = claimed.has(mission.id);
          const percent = Math.min(100, (progress / mission.target) * 100);
          return (
            <div key={mission.id} className="bg-[#0F2A30] border border-[#39FF14]/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-white">{mission.name}</div>
                  <div className="text-xs text-gray-400">{mission.description}</div>
                </div>
                {isClaimed && (
                  <span className="text-xs text-[#39FF14] font-mono">完了</span>
                )}
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#39FF14] rounded-full transition-all" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{progress}/{mission.target}</span>
                {complete && !isClaimed && (
                  <button onClick={() => handleClaim(mission.id)} className="text-xs px-3 py-1 rounded font-bold bg-[#39FF14] text-black hover:bg-[#2ECC0F]">
                    受取
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
