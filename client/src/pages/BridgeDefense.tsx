import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { BridgeDefenseEngine } from '@/game/bridgeDefenseEngine';

export default function BridgeDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BridgeDefenseEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BridgeDefenseEngine(canvasRef.current);
    engineRef.current = engine;
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050a14] flex items-center justify-center overflow-hidden select-none touch-none">
      <div className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs text-white/75 backdrop-blur-sm">
        Bridge Defense Shooter P1
      </div>
      <Link
        href="/kaiju"
        className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs text-white/65 backdrop-blur-sm transition hover:text-white"
      >
        旧プロトタイプ
      </Link>
      <div className="relative flex h-full w-full items-center justify-center">
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full rounded-[18px] shadow-2xl shadow-cyan-950/40"
          style={{ imageRendering: 'auto', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
