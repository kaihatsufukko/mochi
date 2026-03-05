/**
 * ClapButton.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * 朱色の角張ったボタン（丸みを排除）
 * 花びらバーストアニメーション
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface ClapButtonProps {
  initialCount: number;
  articleId: string;
}

export default function ClapButton({ initialCount, articleId }: ClapButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [hasClapped, setHasClapped] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`clap-${articleId}`) === "true";
    }
    return false;
  });
  const [showBurst, setShowBurst] = useState(false);

  const handleClap = () => {
    if (hasClapped) return;
    setCount((c) => c + 1);
    setHasClapped(true);
    setShowBurst(true);
    localStorage.setItem(`clap-${articleId}`, "true");
    setTimeout(() => setShowBurst(false), 1200);
  };

  const petals = ["✿", "❀", "✾", "✽", "❁"];

  return (
    <div className="flex items-center gap-4">
      <motion.button
        whileTap={!hasClapped ? { scale: 0.94 } : {}}
        onClick={handleClap}
        disabled={hasClapped}
        className="relative flex items-center gap-2.5 text-lg font-medium transition-all duration-300"
        style={{
          padding: "0.7rem 1.6rem",
          borderRadius: "2px",
          background: hasClapped ? "oklch(0.52 0.18 28 / 0.1)" : "var(--shu)",
          color: hasClapped ? "var(--shu)" : "oklch(0.97 0.01 85)",
          border: `1.5px solid ${hasClapped ? "var(--shu)" : "var(--shu)"}`,
          fontFamily: "'Zen Kaku Gothic New', sans-serif",
          letterSpacing: "0.06em",
          cursor: hasClapped ? "default" : "pointer",
        }}
        aria-label={hasClapped ? "拍手済み" : "拍手する"}
      >
        <Heart
          size={20}
          fill={hasClapped ? "currentColor" : "none"}
          className="transition-all duration-300"
        />
        <span>{hasClapped ? "拍手しました" : "拍手する"}</span>

        {/* 花びらバーストアニメーション */}
        <AnimatePresence>
          {showBurst && (
            <>
              {petals.map((petal, i) => {
                const angle = (i / petals.length) * 360;
                const rad = (angle * Math.PI) / 180;
                const dist = 45 + Math.random() * 20;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: Math.cos(rad) * dist,
                      y: Math.sin(rad) * dist - 10,
                      scale: 0.6,
                      rotate: Math.random() * 180,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, delay: i * 0.04 }}
                    className="absolute top-1/2 left-1/2 pointer-events-none"
                    style={{
                      fontSize: "14px",
                      color: "oklch(0.75 0.12 20)",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {petal}
                  </motion.span>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </motion.button>

      {/* カウント表示 */}
      <div className="flex flex-col items-center">
        <motion.span
          key={count}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl font-bold editorial-heading"
          style={{ color: "var(--shu)", lineHeight: 1 }}
        >
          {count}
        </motion.span>
        <span
          className="text-xs mt-0.5"
          style={{
            color: "oklch(0.60 0.02 65)",
            fontFamily: "'Zen Kaku Gothic New', sans-serif",
            letterSpacing: "0.08em",
          }}
        >
          拍手
        </span>
      </div>
    </div>
  );
}
