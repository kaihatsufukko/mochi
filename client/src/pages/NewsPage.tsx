/**
 * ニュース一覧ページ
 * 「昭和の縁側」デザイン — ノスタルジック・ウォーム
 * 
 * 気になる話題や情報を発信。日記とは別カテゴリで管理。
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { getArticlesByCategory } from "@/lib/articles";

const NEWS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/news-illustration-aNF63DrapZbooHkKtpFBXN.webp";

export default function NewsPage() {
  const allNews = getArticlesByCategory("news");
  const allTags = Array.from(new Set(allNews.flatMap((a) => a.tags)));
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = selectedTag
    ? allNews.filter((a) => a.tags.includes(selectedTag))
    : allNews;

  return (
    <div>
      {/* ページヘッダー */}
      <section className="bg-accent/30 py-8 sm:py-12">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <img
              src={NEWS_IMG}
              alt="ニュースのイラスト"
              className="w-full sm:w-48 rounded-lg shadow-md border border-border"
            />
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="w-10 h-10 rounded-full bg-shu/15 flex items-center justify-center">
                  <Newspaper size={22} className="text-shu" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  ニュース
                </h1>
              </motion.div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                気になる話題や地域の情報をお届けします。
                <br />
                暮らしに役立つ情報を発信しています。
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
                ? "bg-shu text-white shadow-md"
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
                  ? "bg-shu text-white shadow-md"
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
