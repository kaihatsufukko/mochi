import { useState, useCallback, useEffect } from "react";
import GameCanvas from "../components/game/GameCanvas";
import GameHUD from "../components/game/GameHUD";
import NavBar, { GameView } from "../components/game/NavBar";
import ResourceBar from "../components/game/ResourceBar";
import BaseView from "../components/game/BaseView";
import HeroPanel from "../components/game/HeroPanel";
import ResearchTree from "../components/game/ResearchTree";
import MissionPanel from "../components/game/MissionPanel";
import { gameData } from "../data/GameData";
import { PLAYER_MAX_HP } from "../game/constants";
import { toast } from "sonner";

export default function Home() {
  const [currentView, setCurrentView] = useState<GameView>('shoot');
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [maxHp] = useState(PLAYER_MAX_HP);
  const [wave, setWave] = useState(gameData.getState().currentWave);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const rewards = gameData.calculateOfflineRewards();
    if (rewards.gold && rewards.gold > 0) {
      toast.info(`オフライン報酬: G${rewards.gold} F${rewards.food || 0} S${rewards.steel || 0}`);
    }
  }, []);

  const handleWaveStart = useCallback((w: number) => setWave(w), []);
  const handleWaveComplete = useCallback((_w: number) => {}, []);
  const handlePlayerDied = useCallback(() => setGameOver(true), []);
  const handleHpChange = useCallback((h: number, _mh: number) => setHp(h), []);
  const handleScoreChange = useCallback((s: number) => setScore(s), []);

  const handleStartGame = () => {
    setShowTitle(false);
    setGameOver(false);
    setGameStarted(true);
    setHp(PLAYER_MAX_HP);
    setScore(0);
    setWave(gameData.getState().currentWave);
  };

  const handleRetry = () => {
    setGameOver(false);
    setShowTitle(true);
    setGameStarted(false);
  };

  const isShootingMode = currentView === 'shoot' && gameStarted && !showTitle;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#061215] text-white relative">
      {currentView !== 'shoot' && <ResourceBar />}

      {showTitle && currentView === 'shoot' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#040D10] overflow-hidden">
          {/* Biohazard background pattern */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, #39FF14 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, #FF006E 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, #39FF14 0.5px, transparent 0.5px)`,
            backgroundSize: '60px 60px, 80px 80px, 30px 30px'
          }} />
          {/* Scanning lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #39FF14 2px, #39FF14 3px)',
            backgroundSize: '100% 4px'
          }} />
          {/* Corner containment brackets */}
          <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-[#39FF14]/30" />
          <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-[#39FF14]/30" />
          <div className="absolute bottom-20 left-6 w-12 h-12 border-l-2 border-b-2 border-[#39FF14]/30" />
          <div className="absolute bottom-20 right-6 w-12 h-12 border-r-2 border-b-2 border-[#39FF14]/30" />
          {/* Top diagnostic bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] font-mono text-[#39FF14]/50">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
            <span>CONTAINMENT PROTOCOL ACTIVE</span>
            <span className="text-[#FF006E]/60">■ THREAT LV.{gameData.getState().maxWaveReached}</span>
          </div>
          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-5">
            {/* Custom biohazard Z logo */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer spore ring */}
              <div className="absolute inset-0 rounded-full border border-[#39FF14]/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-2 rounded-full border border-dashed border-[#FF006E]/15 animate-[spin_15s_linear_infinite_reverse]" />
              {/* Hex containment cell */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="#39FF14" strokeWidth="0.8" opacity="0.4" />
                <polygon points="50,15 80,32.5 80,67.5 50,85 20,67.5 20,32.5" fill="none" stroke="#39FF14" strokeWidth="0.4" opacity="0.2" />
              </svg>
              {/* Z mark with mutation trail */}
              <span className="text-5xl font-black text-[#39FF14] drop-shadow-[0_0_15px_rgba(57,255,20,0.6)] relative">
                Z
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF006E]/60 blur-sm animate-pulse" />
                <span className="absolute bottom-0 -left-1 w-2 h-2 rounded-full bg-[#39FF14]/40 blur-[2px]" />
              </span>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-black tracking-[0.3em] text-[#39FF14] drop-shadow-[0_0_25px_rgba(57,255,20,0.4)]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                LAST Z
              </h1>
              <p className="text-[11px] tracking-[0.5em] text-gray-400 font-mono mt-1">SURVIVAL SHOOTER</p>
            </div>
            {/* Status readout */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 border border-[#39FF14]/10 rounded px-4 py-1.5 bg-[#0A1F25]/50">
              <span>WAVE <span className="text-[#39FF14]">{gameData.getState().currentWave}</span></span>
              <span className="w-px h-3 bg-gray-600" />
              <span>LV.<span className="text-[#39FF14]">{gameData.getState().playerLevel}</span></span>
              <span className="w-px h-3 bg-gray-600" />
              <span>KILLS <span className="text-[#FF006E]">{gameData.getState().totalKills}</span></span>
            </div>
            {/* CTA */}
            <button
              onClick={handleStartGame}
              className="mt-2 px-10 py-3 bg-[#39FF14] text-[#040D10] font-black rounded text-lg tracking-wider hover:bg-[#2ECC0F] transition-all duration-200 hover:scale-[1.03] shadow-[0_0_40px_rgba(57,255,20,0.3)] border border-[#39FF14]/60 relative overflow-hidden group"
            >
              <span className="relative z-10">作戦開始</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <p className="text-[10px] text-gray-600 font-mono mt-1">
              ⚠ 汚染区域への出撃を許可しますか
            </p>
          </div>
        </div>
      )}

      <GameCanvas
        visible={isShootingMode && !gameOver}
        onWaveStart={handleWaveStart}
        onWaveComplete={handleWaveComplete}
        onPlayerDied={handlePlayerDied}
        onHpChange={handleHpChange}
        onScoreChange={handleScoreChange}
      />

      <GameHUD hp={hp} maxHp={maxHp} wave={wave} score={score} visible={isShootingMode && !gameOver} />

      {gameOver && currentView === 'shoot' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#040D10]/90 backdrop-blur-sm">
          {/* Danger scan lines */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #FF006E 2px, #FF006E 3px)',
            backgroundSize: '100% 4px'
          }} />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#FF006E] animate-pulse">
            ■ CRITICAL FAILURE — CONTAINMENT BREACH ■
          </div>
          <h2 className="text-4xl font-black text-[#FF006E] mb-4 tracking-wider drop-shadow-[0_0_20px_rgba(255,0,110,0.5)]">TERMINATED</h2>
          <p className="text-lg text-gray-300 mb-2 font-mono">Wave {wave} — 生体反応消失</p>
          <p className="text-sm text-[#39FF14] mb-6 font-mono">戦果: {score.toLocaleString()} pts</p>
          <button
            onClick={handleRetry}
            className="px-8 py-2.5 bg-[#FF006E] text-white font-bold rounded hover:bg-[#CC0058] transition-all tracking-wider shadow-[0_0_20px_rgba(255,0,110,0.3)]"
          >
            再出撃準備
          </button>
        </div>
      )}

      {currentView === 'base' && (
        <div className="absolute inset-0 top-[40px] bottom-14 bg-[#061215] overflow-hidden z-30">
          <BaseView />
        </div>
      )}
      {currentView === 'heroes' && (
        <div className="absolute inset-0 top-[40px] bottom-14 bg-[#061215] overflow-hidden z-30">
          <HeroPanel />
        </div>
      )}
      {currentView === 'research' && (
        <div className="absolute inset-0 top-[40px] bottom-14 bg-[#061215] overflow-hidden z-30">
          <ResearchTree />
        </div>
      )}
      {currentView === 'missions' && (
        <div className="absolute inset-0 top-[40px] bottom-14 bg-[#061215] overflow-hidden z-30">
          <MissionPanel />
        </div>
      )}

      <NavBar currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
}
