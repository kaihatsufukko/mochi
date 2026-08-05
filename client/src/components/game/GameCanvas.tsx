import { useRef, useEffect, useCallback } from "react";
import { GameWorld, GameCallbacks } from "../../game/GameWorld";
import { gameData } from "../../data/GameData";

interface GameCanvasProps {
  visible: boolean;
  onWaveStart: (wave: number) => void;
  onWaveComplete: (wave: number) => void;
  onPlayerDied: () => void;
  onHpChange: (hp: number, maxHp: number) => void;
  onScoreChange: (score: number) => void;
}

export default function GameCanvas({ visible, onWaveStart, onWaveComplete, onPlayerDied, onHpChange, onScoreChange }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameWorld | null>(null);

  const callbacks: GameCallbacks = {
    onWaveStart,
    onWaveComplete: (wave) => {
      gameData.setWave(wave + 1);
      onWaveComplete(wave);
    },
    onEnemyKilled: (xp, gold) => {
      gameData.addResources({ gold, xp });
      gameData.addKills(1);
      gameData.addPlayerXp(xp);
    },
    onPlayerDamaged: (hp, maxHp) => {
      onHpChange(hp, maxHp);
    },
    onPlayerDied,
    onScoreUpdate: onScoreChange,
  };

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;
    if (gameRef.current) {
      gameRef.current.dispose();
    }
    const world = new GameWorld(canvasRef.current, callbacks);
    gameRef.current = world;
    world.start(gameData.getState().currentWave);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visible && !gameRef.current) {
      startGame();
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const handleResize = () => gameRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full absolute inset-0 ${visible ? 'block' : 'hidden'}`}
      style={{ touchAction: 'none' }}
    />
  );
}

