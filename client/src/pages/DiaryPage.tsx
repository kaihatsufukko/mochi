/**
 * 日記一覧ページ
 * 「昭和の縁側」デザイン — ノスタルジック・ウォーム
 * 
 * 日常の出来事や思いを綴る。カテゴリ・タグ機能あり。
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { getArticlesByCategory } from "@/lib/articles";

const DIARY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/diary-illustration-nJRvwgpWxmEiTbVfzmX4Cp.webp";

export default function DiaryPage() {
  const allDiaries = getArticlesByCategory("diary");
  const allTags = Array.from(new Set(allDiaries.flatMap((a) => a.tags)));
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = selectedTag
    ? allDiaries.filter((a) => a.tags.includes(selectedTag))
    : allDiaries;

  return (
    <div>
      {/* ページヘッダー */}
      <section className="bg-secondary/40 py-8 sm:py-12">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <img
              src={DIARY_IMG}
              alt="日記のイラスト"
              className="w-full sm:w-48 rounded-lg shadow-md border border-border"
            />
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="w-10 h-10 rounded-full bg-koke/15 flex items-center justify-center">
                  <BookOpen size={22} className="text-koke" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  日記
                </h1>
              </motion.div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                日常の出来事や思いを綴っています。
                <br />
                季節の移ろいや、ちょっとした発見をお届けします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* タグフィルター */}
      <section className="container pt-8 sm:pt-10">
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 rounded-full text-base font-medium transition-all ${
              selectedTag === null
                ? "bg-koke text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-4 py-2 rounded-full text-base font-medium transition-all ${
                selectedTag === tag
                  ? "bg-koke text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* 記事一覧 */}
        <div className="grid gap-5 sm:grid-cols-2 pb-12">
          {filtered.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-lg">
            該当する記事がありません。
          </p>
        )}
      </section>
    </div>
  );
}
