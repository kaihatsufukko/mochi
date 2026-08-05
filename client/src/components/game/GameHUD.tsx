interface GameHUDProps {
  hp: number;
  maxHp: number;
  wave: number;
  score: number;
  visible: boolean;
}

export default function GameHUD({ hp, maxHp, wave, score, visible }: GameHUDProps) {
  if (!visible) return null;
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const hpColor = hpPercent > 60 ? '#39FF14' : hpPercent > 30 ? '#FFD700' : '#FF006E';

  return (
    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-32 h-3 bg-black/60 rounded-full overflow-hidden border border-[#39FF14]/30">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
            />
          </div>
          <span className="text-xs font-mono text-[#39FF14]">{Math.ceil(hp)}/{maxHp}</span>
        </div>
        <div className="bg-black/60 px-3 py-1 rounded border border-[#39FF14]/30">
          <span className="text-xs font-mono text-[#39FF14]">WAVE {wave}</span>
        </div>
        <div className="bg-black/60 px-3 py-1 rounded border border-[#39FF14]/30">
          <span className="text-xs font-mono text-[#39FF14]">{score.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
