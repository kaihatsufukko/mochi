/**
 * 拍手（いいね）ボタン
 * 「昭和の縁側」デザイン — 朱色の丸いボタン
 * ワンクリックで気軽にリアクション可能
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
  const [showPetal, setShowPetal] = useState(false);

  const handleClap = () => {
    if (hasClapped) return;
    setCount((c) => c + 1);
    setHasClapped(true);
    setShowPetal(true);
    localStorage.setItem(`clap-${articleId}`, "true");
    setTimeout(() => setShowPetal(false), 1000);
  };

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={!hasClapped ? { scale: 0.92 } : {}}
        onClick={handleClap}
        disabled={hasClapped}
        className={`relative flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium transition-all duration-300 shadow-md ${
          hasClapped
            ? "bg-shu/20 text-shu border-2 border-shu/30"
            : "bg-shu text-white hover:bg-shu/90 active:shadow-inner border-2 border-shu"
        }`}
        aria-label={hasClapped ? "拍手済み" : "拍手する"}
      >
        <Heart
          size={22}
          fill={hasClapped ? "currentColor" : "none"}
          className="transition-all duration-300"
        />
        <span>{hasClapped ? "拍手しました" : "拍手する"}</span>

        {/* 花びらアニメーション */}
        <AnimatePresence>
          {showPetal && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    y: -40 - Math.random() * 30,
                    x: (Math.random() - 0.5) * 60,
                    scale: 0.5,
                    rotate: Math.random() * 360,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className="absolute top-0 left-1/2 text-pink-400 pointer-events-none"
                  style={{ fontSize: "16px" }}
                >
                  ✿
                </motion.span>
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.button>
      <span className="text-lg text-muted-foreground font-medium">
        {count}
      </span>
    </div>
  );
}
