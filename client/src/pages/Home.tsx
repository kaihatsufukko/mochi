/**
 * 橋上怪獣防衛隊 - Bridge Kaiju Defender
 * Neo-16bit vertical scrolling defense shooter
 * 
 * Design: Dark background, full-screen canvas game
 * with pixel art aesthetic and modern particle effects
 */
import { useEffect, useRef } from 'react';
import { GameEngine } from '@/game/engine';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.start();

    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050a14] flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="block max-w-full max-h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}
