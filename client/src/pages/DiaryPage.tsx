/**
 * DiaryPage.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * 雑誌のような日記一覧
 * 大型ヘッダー + タグフィルター + エディトリアルグリッド
 */

import { useState } from "react";
import { motion } from "framer-motion";
import ArticleCard from "@/components/ArticleCard";
import { getArticlesByCategory } from "@/lib/articles";

const DIARY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/diary-illustration-nJRvwgpWxmEiTbVfzmX4Cp.webp";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DiaryPage() {
  const allDiaries = getArticlesByCategory("diary");
  const allTags = Array.from(new Set(allDiaries.flatMap((a) => a.tags)));
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = selectedTag
    ? allDiaries.filter((a) => a.tags.includes(selectedTag))
    : allDiaries;

  return (
    <div>
      {/* ページヘッダー — 非対称レイアウト */}
      <section
        className="py-14 sm:py-20"
        style={{ background: "oklch(0.955 0.012 80)" }}
      >
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            {/* テキスト（左3/5） */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3"
            >
              <p
                className="section-label mb-3"
                style={{ color: "var(--koke)" }}
              >
                Diary
              </p>
              <h1
                className="editorial-heading mb-5"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  color: "var(--sumi)",
                  lineHeight: 1.05,
                }}
              >
                日記
              </h1>
              <div
                className="divider-washi mb-5"
                style={{ maxWidth: "200px" }}
              />
              <p
                className="text-lg leading-loose"
                style={{
                  color: "oklch(0.45 0.02 60)",
                  fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  lineHeight: 1.9,
                }}
              >
                日常の出来事や思いを綴っています。
                <br />
                季節の移ろいや、ちょっとした発見をお届けします。
              </p>
            </motion.div>

            {/* 画像（右2/5） */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="lg:col-span-2 img-zoom-container hidden lg:block"
              style={{
                aspectRatio: "4/3",
                overflow: "hidden",
                borderRadius: "2px",
              }}
            >
              <img
                src={DIARY_IMG}
                alt="日記のイラスト"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* タグフィルター + 記事一覧 */}
      <section className="container py-12 sm:py-16">
        {/* タグフィルター */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setSelectedTag(null)}
            className="text-sm font-medium px-4 py-2 transition-all duration-200"
            style={{
              background: selectedTag === null ? "var(--koke)" : "oklch(0.93 0.015 80)",
              color: selectedTag === null ? "oklch(0.97 0.01 85)" : "oklch(0.45 0.02 60)",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
              letterSpacing: "0.06em",
              borderRadius: "2px",
              border: "none",
              cursor: "pointer",
            }}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className="text-sm font-medium px-4 py-2 transition-all duration-200"
              style={{
                background: selectedTag === tag ? "var(--koke)" : "oklch(0.93 0.015 80)",
                color: selectedTag === tag ? "oklch(0.97 0.01 85)" : "oklch(0.45 0.02 60)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.06em",
                borderRadius: "2px",
                border: "none",
                cursor: "pointer",
              }}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* 記事グリッド */}
        {filtered.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-5 sm:grid-cols-2 pb-4"
          >
            {filtered.map((article) => (
              <motion.div key={article.id} variants={itemVariants}>
                <ArticleCard article={article} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div
            className="text-center py-16"
            style={{
              background: "oklch(0.96 0.01 80)",
              border: "1px dashed oklch(0.82 0.03 75)",
              borderRadius: "2px",
            }}
          >
            <p
              className="text-lg"
              style={{
                color: "oklch(0.55 0.02 65)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
              }}
            >
              該当する記事がありません。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
