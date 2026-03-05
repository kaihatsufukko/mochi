/**
 * Layout.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * Awwwardsトレンドを和風に昇華：
 * - スクロールで変化するフローティングヘッダー
 * - 縦書きアクセント文字
 * - エディトリアル誌のような余白とタイポグラフィ
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const FOOTER_SEASONAL_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/footer-seasonal-YCU47QNPpe4sQZjqVZiwye.webp";

const HEADER_WOOD_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/header-wood-Kgwuq4hEtvzbSF6S8w2CUb.webp";

const navLinks = [
  { href: "/", label: "ホーム", en: "Home" },
  { href: "/diary", label: "日記", en: "Diary" },
  { href: "/news", label: "ニュース", en: "News" },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.975 0.008 80)" }}>
      {/* フローティングヘッダー */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? "oklch(0.975 0.008 80 / 0.95)"
            : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid oklch(0.86 0.02 75)" : "none",
        }}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* ロゴ */}
            <Link href="/">
              <div className="group flex items-baseline gap-3">
                <span
                  className="editorial-heading text-xl sm:text-2xl transition-colors duration-300"
                  style={{ color: "var(--sumi)" }}
                >
                  のどかな縁側
                </span>
                <span
                  className="hidden sm:inline text-xs transition-colors duration-300"
                  style={{
                    color: "var(--muted-foreground)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.12em",
                  }}
                >
                  寺尾ワカメ
                </span>
              </div>
            </Link>

            {/* デスクトップナビ */}
            <nav className="hidden md:flex items-center gap-0">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <div className="relative px-5 py-2 group cursor-pointer">
                      <span
                        className="block text-base font-medium transition-colors duration-200"
                        style={{
                          fontFamily: "'Zen Kaku Gothic New', sans-serif",
                          color: isActive ? "var(--koke)" : "var(--sumi)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {link.label}
                      </span>
                      {/* アクティブ & ホバー下線 */}
                      <span
                        className="absolute bottom-0 left-5 right-5 h-0.5 transition-transform duration-300 origin-left"
                        style={{
                          background: "var(--koke)",
                          transform: isActive ? "scaleX(1)" : "scaleX(0)",
                        }}
                      />
                      <span
                        className="absolute bottom-0 left-5 right-5 h-0.5 transition-transform duration-300 origin-left group-hover:scale-x-100"
                        style={{
                          background: "oklch(0.42 0.08 145 / 0.4)",
                          transform: "scaleX(0)",
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* モバイルメニューボタン */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="メニュー"
            >
              {mobileOpen ? (
                <X size={26} style={{ color: "var(--sumi)" }} />
              ) : (
                <Menu size={26} style={{ color: "var(--sumi)" }} />
              )}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="md:hidden"
              style={{
                background: "oklch(0.975 0.008 80 / 0.97)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid oklch(0.86 0.02 75)",
              }}
            >
              <nav className="container py-4 flex flex-col">
                {navLinks.map((link) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <div
                        className="py-4 flex items-center justify-between"
                        style={{ borderBottom: "1px solid oklch(0.88 0.02 75)" }}
                      >
                        <span
                          className="text-xl font-medium"
                          style={{
                            fontFamily: "'Zen Kaku Gothic New', sans-serif",
                            color: isActive ? "var(--koke)" : "var(--sumi)",
                          }}
                        >
                          {link.label}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--muted-foreground)",
                            fontFamily: "'Zen Kaku Gothic New', sans-serif",
                            letterSpacing: "0.15em",
                          }}
                        >
                          {link.en}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 pt-16 sm:pt-20">
        {children}
      </main>

      {/* フッター */}
      <footer className="mt-auto">
        {/* 季節の花ボーダー */}
        <div className="w-full h-20 sm:h-28 overflow-hidden">
          <img
            src={FOOTER_SEASONAL_URL}
            alt=""
            className="w-full h-full object-cover object-top opacity-70"
          />
        </div>

        {/* フッター本体 */}
        <div
          className="relative py-12 sm:py-16"
          style={{
            backgroundImage: `url(${HEADER_WOOD_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0.18 0.04 55 / 0.72)" }}
          />
          <div className="relative container">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-16 mb-10">
              {/* サイト情報 */}
              <div className="sm:col-span-2">
                <h3
                  className="editorial-heading text-3xl sm:text-4xl mb-4"
                  style={{ color: "oklch(0.97 0.01 85)" }}
                >
                  のどかな縁側
                </h3>
                <p
                  className="text-base leading-loose mb-3"
                  style={{
                    color: "oklch(0.78 0.02 85)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  }}
                >
                  「のどかな縁側」は、寺尾ワカメが運営する個人サイトです。
                  日々の暮らしの中で感じたことや、気になったニュースを
                  のんびりと発信しています。
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: "oklch(0.60 0.02 75)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  コメントや拍手で気軽に交流していただけると嬉しいです。
                </p>
              </div>

              {/* ナビゲーション */}
              <div>
                <p
                  className="section-label mb-5"
                  style={{ color: "oklch(0.55 0.02 75)" }}
                >
                  Navigation
                </p>
                <nav className="flex flex-col gap-3">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <span
                        className="text-link text-lg transition-colors duration-200 hover:opacity-100"
                        style={{
                          color: "oklch(0.78 0.02 85)",
                          fontFamily: "'Zen Kaku Gothic New', sans-serif",
                          opacity: 0.85,
                        }}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* コピーライト */}
            <div
              className="pt-8"
              style={{ borderTop: "1px solid oklch(0.97 0.01 85 / 0.12)" }}
            >
              <p
                className="text-sm text-center"
                style={{
                  color: "oklch(0.55 0.02 75)",
                  fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  letterSpacing: "0.1em",
                }}
              >
                © 2026 寺尾ワカメ / のどかな縁側
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
