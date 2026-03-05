/**
 * ArticlePage.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * 雑誌のような記事レイアウト
 * 大型タイトル、読みやすい本文、拍手・コメント
 */

import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { useEffect } from "react";
import {
  getArticleById,
  formatDate,
  getCategoryLabel,
} from "@/lib/articles";
import ClapButton from "@/components/ClapButton";
import CommentSection from "@/components/CommentSection";

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const article = getArticleById(params.id || "");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

  if (!article) {
    return (
      <div className="container py-20 text-center">
        <h2
          className="editorial-heading mb-4"
          style={{ fontSize: "2rem", color: "var(--sumi)" }}
        >
          記事が見つかりませんでした
        </h2>
        <p
          className="mb-8 text-lg"
          style={{
            color: "oklch(0.55 0.02 65)",
            fontFamily: "'Zen Kaku Gothic New', sans-serif",
          }}
        >
          お探しの記事は存在しないか、削除された可能性があります。
        </p>
        <Link href="/">
          <span
            className="inline-flex items-center gap-2 text-lg font-medium"
            style={{
              color: "var(--koke)",
              fontFamily: "'Zen Kaku Gothic New', sans-serif",
            }}
          >
            <ArrowLeft size={18} />
            トップページに戻る
          </span>
        </Link>
      </div>
    );
  }

  const isDiary = article.category === "diary";
  const backLink = isDiary ? "/diary" : "/news";
  const backLabel = isDiary ? "日記一覧" : "ニュース一覧";
  const accentColor = isDiary ? "var(--koke)" : "var(--shu)";

  return (
    <div>
      {/* 記事ヘッダー — フルブリード */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="py-12 sm:py-20"
        style={{ background: "oklch(0.955 0.012 80)" }}
      >
        <div className="container max-w-4xl">
          {/* パンくず */}
          <Link href={backLink}>
            <span
              className="inline-flex items-center gap-2 text-base font-medium mb-8 transition-opacity hover:opacity-70"
              style={{
                color: accentColor,
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              <ArrowLeft size={16} />
              {backLabel}に戻る
            </span>
          </Link>

          {/* カテゴリ + 日付 */}
          <div
            className="flex flex-wrap items-center gap-3 mb-6"
            style={{ fontFamily: "'Zen Kaku Gothic New', sans-serif" }}
          >
            <span
              className="text-sm font-medium px-3 py-1"
              style={{
                background: isDiary
                  ? "oklch(0.42 0.08 145 / 0.12)"
                  : "oklch(0.52 0.18 28 / 0.12)",
                color: accentColor,
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

          {/* 大型タイトル */}
          <h1
            className="editorial-heading mb-6"
            style={{
              fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
              color: "var(--sumi)",
              lineHeight: 1.2,
            }}
          >
            {article.title}
          </h1>

          {/* タグ */}
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-sm px-2.5 py-0.5"
                style={{
                  color: "oklch(0.55 0.02 65)",
                  background: "oklch(0.92 0.015 80)",
                  fontFamily: "'Zen Kaku Gothic New', sans-serif",
                  letterSpacing: "0.04em",
                  borderRadius: "2px",
                }}
              >
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 記事本文 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="container max-w-4xl py-12 sm:py-16"
      >
        {/* 本文 */}
        <div
          className="mb-12"
          style={{
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: "1.75rem",
          }}
        >
          {article.content.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="mb-6 last:mb-0"
              style={{
                color: "oklch(0.32 0.015 60)",
                fontFamily: "'Noto Serif JP', serif",
                fontSize: "1.05rem",
                lineHeight: 2.1,
                textIndent: i === 0 ? "0" : "1em",
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* 区切り線 */}
        <div className="divider-washi mb-10" />

        {/* 拍手ボタン */}
        <div className="flex justify-center mb-12">
          <ClapButton
            initialCount={article.clapCount}
            articleId={article.id}
          />
        </div>

        {/* 区切り線 */}
        <div className="divider-washi mb-10" />

        {/* コメントセクション */}
        <CommentSection
          articleId={article.id}
          initialComments={article.comments}
        />

        {/* 戻るリンク */}
        <div
          className="mt-12 pt-8"
          style={{ borderTop: "1px solid oklch(0.86 0.02 75)" }}
        >
          <Link href={backLink}>
            <span
              className="inline-flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-70"
              style={{
                color: accentColor,
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              <ArrowLeft size={16} />
              {backLabel}に戻る
            </span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
