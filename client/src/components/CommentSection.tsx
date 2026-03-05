/**
 * コメントセクション
 * 「昭和の縁側」デザイン — 温かみのあるコメント欄
 * 自動承認方式（静的サイトのためローカルストレージで管理）
 */

import { useState, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // ローカルストレージから追加コメントを読み込み
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

    // ローカルストレージに保存
    const stored = localStorage.getItem(`comments-${articleId}`);
    const extra = stored ? JSON.parse(stored) : [];
    extra.push(newComment);
    localStorage.setItem(`comments-${articleId}`, JSON.stringify(extra));

    setComments((prev) => [...prev, newComment]);
    setAuthor("");
    setContent("");
    toast.success("コメントを投稿しました");
  };

  return (
    <section className="mt-10 pt-8 border-t-2 border-border">
      <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
        <MessageCircle size={24} className="text-koke" />
        コメント（{comments.length}件）
      </h3>

      {/* コメント一覧 */}
      {comments.length > 0 ? (
        <div className="space-y-4 mb-8">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-card rounded-lg p-4 sm:p-5 border border-border shadow-sm"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display font-bold text-base text-foreground">
                  {comment.author}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(comment.date)}
                </span>
              </div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mb-8 text-center py-6 bg-muted/50 rounded-lg">
          まだコメントはありません。最初のコメントを書いてみませんか？
        </p>
      )}

      {/* コメント投稿フォーム */}
      <div className="bg-card rounded-lg p-5 sm:p-6 border border-border shadow-sm">
        <h4 className="font-display text-lg font-bold mb-4 text-foreground">
          コメントを書く
        </h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="comment-author"
              className="block text-base font-medium text-foreground mb-1.5"
            >
              お名前
            </label>
            <input
              id="comment-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="お名前を入力してください"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-base focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
              maxLength={30}
            />
          </div>
          <div>
            <label
              htmlFor="comment-content"
              className="block text-base font-medium text-foreground mb-1.5"
            >
              コメント
            </label>
            <textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コメントを入力してください"
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-base focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all resize-y"
              maxLength={500}
            />
          </div>
          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-3 h-auto rounded-lg shadow-md"
          >
            <Send size={18} className="mr-2" />
            コメントを投稿する
          </Button>
        </form>
      </div>
    </section>
  );
}
