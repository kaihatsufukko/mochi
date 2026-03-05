/**
 * Layout コンポーネント
 * 「昭和の縁側」デザイン — ノスタルジック・ウォーム
 * 
 * 木目テクスチャのヘッダー・フッター
 * 一カラム構造でスマホファーストに最適化
 * シンプルなナビゲーション（70代以上向け）
 */

import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Home, BookOpen, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HEADER_WOOD_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/header-wood-Kgwuq4hEtvzbSF6S8w2CUb.webp";
const FOOTER_SEASONAL_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/footer-seasonal-YCU47QNPpe4sQZjqVZiwye.webp";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/diary", label: "日記", icon: BookOpen },
  { href: "/news", label: "ニュース", icon: Newspaper },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー：木目テクスチャ */}
      <header
        className="relative overflow-hidden"
        style={{
          backgroundImage: `url(${HEADER_WOOD_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative container py-5 sm:py-6">
          <div className="flex items-center justify-between">
            {/* サイトタイトル */}
            <Link href="/">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white drop-shadow-lg tracking-wide">
                のどかな縁側
              </h1>
              <p className="text-white/80 text-sm sm:text-base mt-0.5 drop-shadow">
                寺尾ワカメの個人サイト
              </p>
            </Link>

            {/* デスクトップナビ */}
            <nav className="hidden sm:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-lg font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white/30 text-white shadow-inner"
                          : "text-white/90 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      <Icon size={20} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* モバイルメニューボタン */}
            <button
              className="sm:hidden p-3 rounded-lg bg-white/20 text-white active:bg-white/30 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="メニューを開く"
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* モバイルメニュー */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="sm:hidden overflow-hidden mt-4"
              >
                <div className="flex flex-col gap-2 pb-2">
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={`flex items-center gap-3 px-5 py-3.5 rounded-lg text-lg font-medium transition-all ${
                            isActive
                              ? "bg-white/30 text-white"
                              : "text-white/90 hover:bg-white/20"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon size={22} />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {children}
      </main>

      {/* フッター */}
      <footer className="mt-auto">
        {/* 季節の花ボーダー */}
        <div className="w-full overflow-hidden">
          <img
            src={FOOTER_SEASONAL_URL}
            alt="季節の花々"
            className="w-full h-20 sm:h-28 object-cover opacity-60"
          />
        </div>
        <div
          className="relative"
          style={{
            backgroundImage: `url(${HEADER_WOOD_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative container py-6 sm:py-8">
            <div className="text-center text-white/90">
              <p className="font-display text-xl font-bold mb-2 drop-shadow">
                のどかな縁側
              </p>
              <p className="text-sm text-white/70 mb-4">
                寺尾ワカメの個人サイト
              </p>
              <nav className="flex justify-center gap-6 mb-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <span className="text-white/80 hover:text-white text-base transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>
              <p className="text-xs text-white/50">
                &copy; 2026 寺尾ワカメ All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
