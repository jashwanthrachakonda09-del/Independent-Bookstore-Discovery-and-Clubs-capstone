import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { ReadingProgress } from "../../types";
import {
  ShieldCheck,
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Plus,
} from "lucide-react";

export const ReadingProgressPage: React.FC = () => {
  const [progressList, setProgressList] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const res = await api.getProgress();
      setProgressList(res.data || []);
    } catch (err) {
      console.error("Error loading reading progress:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const handleUpdate = async (item: ReadingProgress, changes: Partial<ReadingProgress>) => {
    try {
      await api.updateProgress({
        bookId: item.bookId._id,
        currentChapter: changes.currentChapter ?? item.currentChapter,
        currentPage: changes.currentPage ?? item.currentPage,
        spoilerMode: changes.spoilerMode ?? item.spoilerMode,
        status: changes.status ?? item.status,
      });
      loadProgress();
    } catch (err: any) {
      alert(err.message || "Failed to update progress.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-forest" />
          <h1 className="font-serif text-3xl font-bold text-ink-950">
            Reading Progress & Anti-Spoiler Shield
          </h1>
        </div>
        <p className="text-sm text-ink-600 mt-1">
          Your active reading markers synchronize with club discussion feeds and AI companion chats to dynamically shield future plot spoilers.
        </p>
      </div>

      {loading ? (
        <div className="bg-paper p-8 rounded-2xl border border-ivory-300 animate-pulse h-64" />
      ) : progressList.length === 0 ? (
        <div className="bg-paper p-12 rounded-2xl border border-ivory-300 text-center max-w-md mx-auto space-y-3">
          <BookOpen className="w-10 h-10 text-ink-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-ink-900">No active reading markers</h3>
          <p className="text-xs text-ink-600">
            Open any book detail page and set your current chapter marker to enable anti-spoiler shielding.
          </p>
          <Link
            to="/discover"
            className="inline-block px-4 py-2 text-xs rounded-lg bg-forest text-ivory font-medium"
          >
            Discover Books
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {progressList.map((item) => {
            const book = item.bookId;
            const totalPages = book.readingLength || 350;
            const pct = Math.min(100, Math.round((item.currentPage / totalPages) * 100));

            return (
              <div
                key={item._id}
                className="bg-paper p-6 sm:p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-burgundy bg-burgundy/10 px-2.5 py-0.5 rounded-full">
                      {item.status.replace("_", " ")}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-ink-950 mt-1 hover:text-forest transition-colors">
                      <Link to={`/books/${book._id}`}>{book.title}</Link>
                    </h2>
                    <p className="text-xs text-ink-600">by {book.authors?.join(", ")}</p>
                  </div>

                  <div className="text-right">
                    <span className="font-serif text-2xl font-bold text-forest-dark">{pct}%</span>
                    <span className="text-xs text-ink-500 block">
                      Page {item.currentPage} of {totalPages}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-ivory-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-forest h-full transition-all duration-300 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  {/* Quick Chapter Advance */}
                  <div className="p-3 bg-ivory rounded-xl border border-ivory-200 space-y-1.5">
                    <span className="font-semibold text-ink-800 block">Chapter Position:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink-900">Ch. {item.currentChapter}</span>
                      <button
                        onClick={() =>
                          handleUpdate(item, { currentChapter: item.currentChapter + 1 })
                        }
                        className="p-1 rounded bg-forest/10 hover:bg-forest text-forest hover:text-ivory transition-colors"
                        title="Advance 1 Chapter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Page Advance */}
                  <div className="p-3 bg-ivory rounded-xl border border-ivory-200 space-y-1.5">
                    <span className="font-semibold text-ink-800 block">Page Position:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink-900">Page {item.currentPage}</span>
                      <button
                        onClick={() =>
                          handleUpdate(item, {
                            currentPage: Math.min(totalPages, item.currentPage + 15),
                          })
                        }
                        className="p-1 rounded bg-forest/10 hover:bg-forest text-forest hover:text-ivory transition-colors text-[10px] font-bold px-1.5"
                        title="Advance 15 Pages"
                      >
                        +15 p.
                      </button>
                    </div>
                  </div>

                  {/* Spoiler Mode Selector */}
                  <div className="p-3 bg-ivory rounded-xl border border-ivory-200 space-y-1.5">
                    <span className="font-semibold text-ink-800 block">Spoiler Shield Mode:</span>
                    <select
                      value={item.spoilerMode}
                      onChange={(e: any) =>
                        handleUpdate(item, { spoilerMode: e.target.value })
                      }
                      className="w-full text-xs py-1 px-2 rounded border border-ivory-300 bg-paper focus:outline-none"
                    >
                      <option value="progress_limited">Up to Ch. {item.currentChapter}</option>
                      <option value="spoiler_free">Strictly Spoiler-Free</option>
                      <option value="full_book">Full Book (Unrestricted)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <span className="text-ink-500">
                    Last updated: {new Date(item.updatedAt).toLocaleDateString()}
                  </span>

                  <Link
                    to={`/books/${book._id}`}
                    className="text-forest hover:text-forest-dark font-medium flex items-center gap-1"
                  >
                    <span>Companion Chat</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
