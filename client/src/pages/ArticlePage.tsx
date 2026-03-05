/**
 * 記事詳細ページ
 * 「昭和の縁側」デザイン — ノスタルジック・ウォーム
 * 
 * 記事本文、拍手ボタン、コメント欄を表示
 * 障子の枠のようなボーダーで囲む
 */

import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import {
  getArticleById,
  formatDate,
  getCategoryLabel,
} from "@/lib/articles";
import ClapButton from "@/components/ClapButton";
import CommentSection from "@/components/CommentSection";
import { useEffect } from "react";

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const article = getArticleById(params.id || "");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

  if (!article) {
    return (
      <div className="container py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          記事が見つかりませんでした
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          お探しの記事は存在しないか、削除された可能性があります。
        </p>
        <Link href="/">
          <span className="inline-flex items-center gap-2 text-primary text-lg font-medium hover:underline">
            <ArrowLeft size={18} />
            トップページに戻る
          </span>
        </Link>
      </div>
    );
  }

  const backLink = article.category === "diary" ? "/diary" : "/news";
  const backLabel = article.category === "diary" ? "日記一覧" : "ニュース一覧";

  return (
    <div className="container py-8 sm:py-12">
      {/* パンくずリスト */}
      <nav className="mb-6">
        <Link href={backLink}>
          <span className="inline-flex items-center gap-2 text-primary text-lg font-medium hover:underline">
            <ArrowLeft size={18} />
            {backLabel}に戻る
          </span>
        </Link>
      </nav>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-lg border-2 border-border p-6 sm:p-8 lg:p-10 shadow-sm"
      >
        {/* 記事ヘッダー */}
        <header className="mb-8 pb-6 border-b-2 border-border">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-base font-medium ${
                article.category === "diary"
                  ? "bg-koke/15 text-koke"
                  : "bg-shu/15 text-shu"
              }`}
            >
              {getCategoryLabel(article.category)}
            </span>
            <span className="flex items-center gap-1.5 text-base text-muted-foreground">
              <Calendar size={16} />
              {formatDate(article.date)}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-snug mb-4">
            {article.title}
          </h1>

          {/* タグ */}
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-base text-muted-foreground bg-muted px-3 py-1 rounded"
              >
                <Tag size={14} />
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* 記事本文 */}
        <div className="prose-custom mb-8">
          {article.content.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="text-foreground leading-loose text-lg mb-5 last:mb-0"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* 拍手ボタン */}
        <div className="py-6 border-t-2 border-b-2 border-border flex justify-center">
          <ClapButton
            initialCount={article.clapCount}
            articleId={article.id}
          />
        </div>

        {/* コメントセクション */}
        <CommentSection
          articleId={article.id}
          initialComments={article.comments}
        />
      </motion.article>
    </div>
  );
}
