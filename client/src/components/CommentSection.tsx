/**
 * CommentSection.tsx — のどかな縁側
 * デザインビジョン：「縁側エディトリアル」
 * 
 * エディトリアル誌のようなコメント欄
 * 左ボーダーアクセント、角張ったフォーム
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import type { Comment } from "@/lib/articles";
import { formatDate } from "@/lib/articles";
import { toast } from "sonner";

interface CommentSectionProps {
  articleId: string;
  initialComments: Comment[];
}

export default function CommentSection({
  articleId,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`comments-${articleId}`);
    if (stored) {
      try {
        const extra = JSON.parse(stored) as Comment[];
        setComments([...initialComments, ...extra]);
      } catch {
        // ignore
      }
    }
  }, [articleId, initialComments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      toast.error("お名前とコメントを入力してください");
      return;
    }

    const newComment: Comment = {
      id: `local-${Date.now()}`,
      author: author.trim(),
      content: content.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    const stored = localStorage.getItem(`comments-${articleId}`);
    const extra = stored ? JSON.parse(stored) : [];
    extra.push(newComment);
    localStorage.setItem(`comments-${articleId}`, JSON.stringify(extra));

    setComments((prev) => [...prev, newComment]);
    setAuthor("");
    setContent("");
    toast.success("コメントを投稿しました");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.85rem 1rem",
    border: "1px solid oklch(0.86 0.02 75)",
    background: "oklch(0.99 0.005 80)",
    color: "var(--sumi)",
    fontSize: "1rem",
    fontFamily: "'Zen Kaku Gothic New', sans-serif",
    lineHeight: 1.7,
    outline: "none",
    borderRadius: "2px",
    transition: "border-color 0.2s",
  };

  return (
    <section
      className="mt-12 pt-10"
      style={{ borderTop: "1px solid oklch(0.86 0.02 75)" }}
    >
      {/* セクションヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle size={20} style={{ color: "var(--koke)" }} />
        <h3
          className="editorial-heading"
          style={{ fontSize: "1.3rem", color: "var(--sumi)" }}
        >
          コメント
        </h3>
        <span
          className="text-sm px-2 py-0.5"
          style={{
            background: "oklch(0.42 0.08 145 / 0.1)",
            color: "var(--koke)",
            fontFamily: "'Zen Kaku Gothic New', sans-serif",
            borderRadius: "2px",
          }}
        >
          {comments.length}件
        </span>
      </div>

      {/* コメント一覧 */}
      <div className="mb-10">
        {comments.length > 0 ? (
          <AnimatePresence>
            <div className="flex flex-col gap-4">
              {comments.map((comment, i) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{
                    background: "oklch(0.99 0.005 80)",
                    borderLeft: "3px solid var(--koke)",
                    borderTop: "1px solid oklch(0.88 0.02 75)",
                    borderRight: "1px solid oklch(0.88 0.02 75)",
                    borderBottom: "1px solid oklch(0.88 0.02 75)",
                    padding: "1.1rem 1.4rem",
                  }}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span
                      className="editorial-heading text-base"
                      style={{ color: "var(--sumi)" }}
                    >
                      {comment.author}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color: "oklch(0.60 0.02 65)",
                        fontFamily: "'Zen Kaku Gothic New', sans-serif",
                      }}
                    >
                      {formatDate(comment.date)}
                    </span>
                  </div>
                  <p
                    className="whitespace-pre-wrap leading-loose"
                    style={{
                      color: "oklch(0.38 0.02 60)",
                      fontFamily: "'Zen Kaku Gothic New', sans-serif",
                      fontSize: "0.95rem",
                    }}
                  >
                    {comment.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div
            className="text-center py-10"
            style={{
              background: "oklch(0.96 0.01 80)",
              border: "1px dashed oklch(0.82 0.03 75)",
              borderRadius: "2px",
            }}
          >
            <p
              className="text-base"
              style={{
                color: "oklch(0.60 0.02 65)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
              }}
            >
              まだコメントはありません。
              <br />
              最初のコメントを書いてみませんか？
            </p>
          </div>
        )}
      </div>

      {/* コメント投稿フォーム */}
      <div
        style={{
          background: "oklch(0.975 0.01 80)",
          border: "1px solid oklch(0.86 0.02 75)",
          padding: "1.75rem",
          borderRadius: "2px",
        }}
      >
        <h4
          className="editorial-heading mb-5"
          style={{ fontSize: "1.1rem", color: "var(--sumi)" }}
        >
          コメントを書く
        </h4>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="comment-author"
              className="block text-base font-medium mb-2"
              style={{
                color: "var(--sumi)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              お名前
            </label>
            <input
              id="comment-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="お名前を入力してください"
              style={inputStyle}
              maxLength={30}
              onFocus={(e) => (e.target.style.borderColor = "var(--koke)")}
              onBlur={(e) => (e.target.style.borderColor = "oklch(0.86 0.02 75)")}
            />
          </div>
          <div>
            <label
              htmlFor="comment-content"
              className="block text-base font-medium mb-2"
              style={{
                color: "var(--sumi)",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              コメント
            </label>
            <textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コメントを入力してください"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              maxLength={500}
              onFocus={(e) => (e.target.style.borderColor = "var(--koke)")}
              onBlur={(e) => (e.target.style.borderColor = "oklch(0.86 0.02 75)")}
            />
          </div>
          <div>
            <button
              type="submit"
              className="flex items-center gap-2 text-base font-medium transition-all duration-200 hover:opacity-85"
              style={{
                background: "var(--koke)",
                color: "oklch(0.97 0.01 85)",
                padding: "0.75rem 1.8rem",
                borderRadius: "2px",
                fontFamily: "'Zen Kaku Gothic New', sans-serif",
                letterSpacing: "0.06em",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Send size={16} />
              コメントを投稿する
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
