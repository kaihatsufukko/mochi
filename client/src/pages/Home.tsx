/**
 * トップページ
 * 「昭和の縁側」デザイン — ノスタルジック・ウォーム
 * 
 * サイトの顔。最新記事一覧を表示し、日記・ニュースの新着を見やすく配置する。
 * 縁側のヒーロー画像 → 最新記事一覧 → 日記セクション → ニュースセクション
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Newspaper, ArrowRight } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { getLatestArticles, getArticlesByCategory } from "@/lib/articles";

const HERO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/hero-engawa-9pUwtDr6ZMZA7T2DjBCJxD.webp";
const DIARY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/diary-illustration-nJRvwgpWxmEiTbVfzmX4Cp.webp";
const NEWS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031129836/PAtsuYqFzkogYquuPuQ9VE/news-illustration-aNF63DrapZbooHkKtpFBXN.webp";

export default function Home() {
  const latestArticles = getLatestArticles(4);
  const diaryArticles = getArticlesByCategory("diary").slice(0, 3);
  const newsArticles = getArticlesByCategory("news").slice(0, 3);

  return (
    <div>
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="relative container py-16 sm:py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 sm:p-8 inline-block">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
              ようこそ、
              <br />
              のどかな縁側へ
            </h2>
            <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed">
              日々の暮らしの中で見つけた小さな幸せを、
              <br className="hidden sm:block" />
              のんびりと綴っています。
            </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 最新記事セクション */}
      <section className="container py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            最新の記事
          </h2>
          <p className="text-muted-foreground mb-8">
            日記やニュースの新着記事をお届けします
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {latestArticles.map((article, i) => (
              <ArticleCard key={article.id} article={article} index={i} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* 日記セクション */}
      <section className="bg-secondary/40 py-10 sm:py-14">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-koke/15 flex items-center justify-center">
                <BookOpen size={24} className="text-koke" />
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  日記
                </h2>
                <p className="text-muted-foreground text-base">
                  日常の出来事や思いを綴ります
                </p>
              </div>
            </div>
            <Link href="/diary">
              <span className="flex items-center gap-1 text-primary font-medium text-lg hover:underline">
                日記一覧を見る
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>

          {/* 日記イラスト + カード */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 hidden lg:block">
              <img
                src={DIARY_IMG}
                alt="日記のイラスト"
                className="w-full rounded-lg shadow-md border border-border"
              />
            </div>
            <div className="lg:col-span-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {diaryArticles.map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ニュースセクション */}
      <section className="py-10 sm:py-14">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-shu/15 flex items-center justify-center">
                <Newspaper size={24} className="text-shu" />
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  ニュース
                </h2>
                <p className="text-muted-foreground text-base">
                  気になる話題や情報を発信します
                </p>
              </div>
            </div>
            <Link href="/news">
              <span className="flex items-center gap-1 text-primary font-medium text-lg hover:underline">
                ニュース一覧を見る
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>

          {/* ニュースイラスト + カード */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {newsArticles.map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} />
              ))}
            </div>
            <div className="lg:col-span-1 hidden lg:block">
              <img
                src={NEWS_IMG}
                alt="ニュースのイラスト"
                className="w-full rounded-lg shadow-md border border-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* サイト紹介セクション */}
      <section className="bg-accent/30 py-10 sm:py-14">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
              このサイトについて
            </h2>
            <p className="text-foreground leading-loose text-lg">
              「のどかな縁側」は、寺尾ワカメが運営する個人サイトです。
              日々の暮らしの中で感じたことや、気になったニュースを
              のんびりと発信しています。
            </p>
            <p className="text-foreground leading-loose text-lg mt-4">
              コメントや拍手で気軽に交流していただけると嬉しいです。
              縁側でお茶を飲みながらおしゃべりするような、
              そんな温かい場所を目指しています。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
