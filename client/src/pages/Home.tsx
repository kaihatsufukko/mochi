/**
 * トップページ — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * Awwwardsトレンドを和風に昇華：
 * - 超大型明朝体タイトルがフルスクリーンを占める
 * - 非対称エディトリアルグリッド
 * - スタッガーアニメーション
 * - ホバーで画像ズームイン
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getLatestArticles, getArticlesByCategory } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

const HERO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/hero-engawa-9pUwtDr6ZMZA7T2DjBCJxD.webp";
const DIARY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/diary-illustration-nJRvwgpWxmEiTbVfzmX4Cp.webp";
const NEWS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/news-illustration-aNF63DrapZbooHkKtpFBXN.webp";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function Home() {
  const latestArticles = getLatestArticles(4);
  const diaryArticles = getArticlesByCategory("diary").slice(0, 3);
  const newsArticles = getArticlesByCategory("news").slice(0, 3);

  return (
    <div>
      {/* ═══════════════════════════════════════
          ヒーローセクション — フルスクリーン
          超大型明朝体 × 縁側の水彩画
      ═══════════════════════════════════════ */}
      <section className="relative min-h-[90vh] sm:min-h-screen flex items-end overflow-hidden">
        {/* 背景画像 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_URL})` }}
        />
        {/* グラデーションオーバーレイ */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.975 0.008 80 / 0) 30%, oklch(0.975 0.008 80 / 0.85) 75%, oklch(0.975 0.008 80) 100%)",
          }}
        />

        {/* 縦書き装飾 */}
        <div
          className="absolute top-24 right-6 sm:right-12 hidden sm:block vertical-accent text-sm"
          style={{ color: "oklch(0.42 0.08 145 / 0.5)", letterSpacing: "0.3em" }}
        >
          日々の暮らし
        </div>

        {/* ヒーローテキスト */}
        <div className="relative container pb-16 sm:pb-24 lg:pb-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* ラベル */}
            <motion.p
              variants={itemVariants}
              className="section-label mb-4"
              style={{ color: "var(--koke)" }}
            >
              Nodokana Engawa
            </motion.p>

            {/* 超大型見出し */}
            <motion.h1
              variants={itemVariants}
              className="editorial-heading mb-6"
              style={{
                fontSize: "clamp(2.8rem, 8vw, 7rem)",
                lineHeight: 1.05,
                color: "var(--sumi)",
                letterSpacing: "-0.01em",
              }}
            >
              ようこそ、
              <br />
              <span style={{ color: "var(--koke)" }}>のどかな</span>
              <br />
              縁側へ。
            </motion.h1>

            {/* サブテキスト */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl max-w-md"
              style={{
                color: "oklch(0.38 0.02 60)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                lineHeight: 1.8,
                letterSpacing: "0.04em",
              }}
            >
              日々の暮らしの中で見つけた
              <br />
              小さな幸せを、のんびりと綴っています。
            </motion.p>

            {/* CTAボタン */}
            <motion.div variants={itemVariants} className="mt-8 flex gap-4">
              <Link href="/diary">
                <span
                  className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium transition-all duration-300 hover:gap-3"
                  style={{
                    background: "var(--koke)",
                    color: "oklch(0.97 0.01 85)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.06em",
                    borderRadius: "2px",
                  }}
                >
                  日記を読む
                  <ArrowRight size={16} />
                </span>
              </Link>
              <Link href="/news">
                <span
                  className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium transition-all duration-300 hover:gap-3"
                  style={{
                    border: "1px solid var(--sumi)",
                    color: "var(--sumi)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.06em",
                    borderRadius: "2px",
                  }}
                >
                  ニュース
                  <ArrowRight size={16} />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          最新記事セクション — エディトリアルグリッド
      ═══════════════════════════════════════ */}
      <section className="py-16 sm:py-24">
        <div className="container">
          {/* セクションヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <p
                className="section-label mb-2"
                style={{ color: "var(--koke)" }}
              >
                Latest Articles
              </p>
              <h2
                className="editorial-heading"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  color: "var(--sumi)",
                }}
              >
                最新の記事
              </h2>
            </div>
          </motion.div>

          {/* 記事グリッド */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid gap-5 sm:grid-cols-2"
          >
            {latestArticles.map((article, i) => (
              <motion.div key={article.id} variants={itemVariants}>
                <ArticleCard article={article} index={i} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          日記セクション — 非対称レイアウト
          大きな画像 + テキスト + カード
      ═══════════════════════════════════════ */}
      <section
        className="py-16 sm:py-24"
        style={{ background: "oklch(0.955 0.012 80)" }}
      >
        <div className="container">
          {/* セクションヘッダー */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <p
              className="section-label mb-2"
              style={{ color: "var(--koke)" }}
            >
              Diary
            </p>
            <div className="flex items-end justify-between">
              <h2
                className="editorial-heading"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  color: "var(--sumi)",
                }}
              >
                日記
              </h2>
              <Link href="/diary">
                <span
                  className="text-link flex items-center gap-1 text-base font-medium"
                  style={{
                    color: "var(--koke)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  すべて見る
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* 非対称グリッド */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* 大きな画像（左） */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-2 img-zoom-container rounded-sm overflow-hidden hidden lg:block"
              style={{ aspectRatio: "3/4" }}
            >
              <img
                src={DIARY_IMG}
                alt="日記のイラスト"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* 記事カード（右） */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="lg:col-span-3 flex flex-col gap-5"
            >
              {diaryArticles.map((article, i) => (
                <motion.div key={article.id} variants={itemVariants}>
                  <ArticleCard article={article} index={i} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          ニュースセクション — 逆非対称レイアウト
      ═══════════════════════════════════════ */}
      <section className="py-16 sm:py-24">
        <div className="container">
          {/* セクションヘッダー */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <p
              className="section-label mb-2"
              style={{ color: "var(--shu)" }}
            >
              News
            </p>
            <div className="flex items-end justify-between">
              <h2
                className="editorial-heading"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  color: "var(--sumi)",
                }}
              >
                ニュース
              </h2>
              <Link href="/news">
                <span
                  className="text-link flex items-center gap-1 text-base font-medium"
                  style={{
                    color: "var(--shu)",
                    fontFamily: "'Zen Kaku Gothic New', sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  すべて見る
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* 逆非対称グリッド */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* 記事カード（左） */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="lg:col-span-3 flex flex-col gap-5"
            >
              {newsArticles.map((article, i) => (
                <motion.div key={article.id} variants={itemVariants}>
                  <ArticleCard article={article} index={i} />
                </motion.div>
              ))}
            </motion.div>

            {/* 大きな画像（右） */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-2 img-zoom-container rounded-sm overflow-hidden hidden lg:block"
              style={{ aspectRatio: "3/4" }}
            >
              <img
                src={NEWS_IMG}
                alt="ニュースのイラスト"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          サイト紹介 — フルブリードテキストセクション
      ═══════════════════════════════════════ */}
      <section
        className="py-20 sm:py-28"
        style={{ background: "oklch(0.955 0.012 80)" }}
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto"
          >
            <p
              className="section-label mb-6 text-center"
              style={{ color: "var(--koke)" }}
            >
              About This Site
            </p>
            <h2
              className="editorial-heading text-center mb-8"
              style={{
                fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
                color: "var(--sumi)",
              }}
            >
              縁側でお茶を飲みながら
              <br />
              おしゃべりするような場所
            </h2>
            <div
              className="divider-washi mb-8"
            />
            <p
              className="text-center text-lg leading-loose"
              style={{
                color: "oklch(0.38 0.02 60)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                lineHeight: 2,
              }}
            >
              「のどかな縁側」は、寺尾ワカメが運営する個人サイトです。
              日々の暮らしの中で感じたことや、気になったニュースを
              のんびりと発信しています。
              <br /><br />
              コメントや拍手で気軽に交流していただけると嬉しいです。
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
