/**
 * 記事カード
 * 「昭和の縁側」デザイン — 畳の目のようなグリッドカード
 * 障子の枠のようなボーダーで囲む
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import type { Article } from "@/lib/articles";
import { formatDate, getCategoryLabel } from "@/lib/articles";

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/article/${article.id}`}>
        <article className="group bg-card rounded-lg border-2 border-border hover:border-primary/30 p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full">
          {/* カテゴリバッジ */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                article.category === "diary"
                  ? "bg-koke/15 text-koke"
                  : "bg-shu/15 text-shu"
              }`}
            >
              {getCategoryLabel(article.category)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar size={14} />
              {formatDate(article.date)}
            </span>
          </div>

          {/* タイトル */}
          <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">
            {article.title}
          </h3>

          {/* 抜粋 */}
          <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
            {article.excerpt}
          </p>

          {/* タグ */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border">
            <span className="flex items-center gap-1">
              <Heart size={15} className="text-shu/70" />
              {article.clapCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={15} className="text-koke/70" />
              {article.comments.length}
            </span>
            <span className="ml-auto text-primary font-medium group-hover:underline">
              続きを読む →
            </span>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
