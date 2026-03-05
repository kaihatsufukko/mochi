/**
 * ArticleCard.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * Awwwardsトレンドを和風に昇華：
 * - 左ボーダーアクセント（カテゴリカラー）
 * - ホバー時の微妙なリフト + 影
 * - エディトリアル誌のような余白とタイポグラフィ
 */

import { Link } from "wouter";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import type { Article } from "@/lib/articles";
import { formatDate, getCategoryLabel } from "@/lib/articles";

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  const isDiary = article.category === "diary";

  return (
    <Link href={`/article/${article.id}`}>
      <article
        className="article-card group h-full"
        style={{
          background: "oklch(0.99 0.005 80)",
          borderLeft: `3px solid ${isDiary ? "var(--koke)" : "var(--shu)"}`,
          borderTop: "1px solid oklch(0.88 0.02 75)",
          borderRight: "1px solid oklch(0.88 0.02 75)",
          borderBottom: "1px solid oklch(0.88 0.02 75)",
          padding: "1.5rem 1.75rem",
        }}
      >
        {/* カテゴリ + 日付 */}
        <div
          className="flex items-center gap-3 mb-4"
          style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif" }}
        >
          <span
            className="text-xs font-medium px-2.5 py-1"
            style={{
              background: isDiary ? "oklch(0.42 0.08 145 / 0.1)" : "oklch(0.52 0.18 28 / 0.1)",
              color: isDiary ? "var(--koke)" : "var(--shu)",
              letterSpacing: "0.08em",
              borderRadius: "2px",
            }}
          >
            {getCategoryLabel(article.category)}
          </span>
          <span
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "oklch(0.58 0.02 65)" }}
          >
            <Calendar size={13} />
            {formatDate(article.date)}
          </span>
        </div>

        {/* タイトル */}
        <h3
          className="editorial-heading mb-3 transition-colors duration-200 group-hover:opacity-70"
          style={{
            fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
            color: "var(--sumi)",
            lineHeight: 1.4,
          }}
        >
          {article.title}
        </h3>

        {/* 抜粋 */}
        <p
          className="mb-4 line-clamp-2"
          style={{
            color: "oklch(0.45 0.02 60)",
            fontFamily: "'Zen Kaku Gothic New', sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.85,
          }}
        >
          {article.excerpt}
        </p>

        {/* タグ */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5"
              style={{
                color: "oklch(0.55 0.02 65)",
                background: "oklch(0.93 0.015 80)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.04em",
                borderRadius: "2px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* フッター */}
        <div
          className="flex items-center gap-4 pt-3"
          style={{ borderTop: "1px solid oklch(0.90 0.015 80)" }}
        >
          <span
            className="flex items-center gap-1.5 text-sm"
            style={{
              color: "oklch(0.58 0.02 65)",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
            }}
          >
            <Heart size={14} style={{ color: "var(--shu)" }} />
            {article.clapCount}
          </span>
          <span
            className="flex items-center gap-1.5 text-sm"
            style={{
              color: "oklch(0.58 0.02 65)",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
            }}
          >
            <MessageCircle size={14} style={{ color: "var(--koke)" }} />
            {article.comments.length}
          </span>
          <span
            className="ml-auto text-sm font-medium transition-all duration-200 group-hover:translate-x-1"
            style={{
              color: isDiary ? "var(--koke)" : "var(--shu)",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            続きを読む →
          </span>
        </div>
      </article>
    </Link>
  );
}
