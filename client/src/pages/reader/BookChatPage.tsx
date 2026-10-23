import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { Book, Citation } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  MessageSquare,
  Sparkles,
  Send,
  BookOpen,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";

export const BookChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialBookId = searchParams.get("bookId") || "";

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; citations?: Citation[] }[]
  >([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [booksRes, convRes] = await Promise.all([
          api.getBooks({ limit: 50 }),
          api.getConversations().catch(() => ({ data: [] })),
        ]);
        setBooks(booksRes.data || []);
        setConversations(convRes.data || []);

        if (!selectedBookId && booksRes.data?.length > 0) {
          setSelectedBookId(booksRes.data[0]._id);
        }
      } catch (err) {
        console.error("Chat init error:", err);
      }
    };
    init();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedBookId || loading) return;

    const userText = inputMsg.trim();
    setInputMsg("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await api.sendBookChat({
        bookId: selectedBookId,
        message: userText,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply,
          citations: res.data.citations,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message || "Failed to generate reply."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentBook = books.find((b) => b._id === selectedBookId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h1 className="font-serif text-3xl font-bold text-ink-950">
              Grounded AI Companion
            </h1>
          </div>
          <p className="text-sm text-ink-600 mt-1">
            Spoiler-aware conversational exploration grounded strictly in book chapters and catalog documentation.
          </p>
        </div>

        {/* Book Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ink-700">Discussing:</label>
          <select
            value={selectedBookId}
            onChange={(e) => {
              setSelectedBookId(e.target.value);
              setMessages([]);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-ivory-300 bg-paper focus:outline-none max-w-xs truncate"
          >
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-paper rounded-3xl border border-ivory-300 shadow-card flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 bg-ivory border-b border-ivory-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-forest" />
            <span className="font-semibold text-ink-900">
              {currentBook?.title || "Select a Book"}
            </span>
            <span className="text-ink-400">•</span>
            <span className="text-ink-600">
              {currentBook?.authors?.join(", ") || ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-forest text-[11px] font-medium bg-forest/10 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Spoiler RAG Active</span>
          </div>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-ivory/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-forest/10 text-forest flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-900">
                Start Exploring "{currentBook?.title}"
              </h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Ask about the thematic development, character relationships, narrative style, or historical backdrop. All answers cite verified chapters.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  onClick={() => setInputMsg("What is the central conflict in this story?")}
                  className="text-xs px-3 py-1 rounded-full bg-paper border border-ivory-300 hover:bg-ivory text-ink-700"
                >
                  "What is the central conflict?"
                </button>
                <button
                  onClick={() => setInputMsg("Can you explain the key themes explored in early chapters?")}
                  className="text-xs px-3 py-1 rounded-full bg-paper border border-ivory-300 hover:bg-ivory text-ink-700"
                >
                  "Explain early themes"
                </button>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1.5 ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-forest text-ivory"
                      : "bg-paper border border-ivory-300 text-ink-900 shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Grounding Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-ivory-200 text-[10px] space-y-1.5 text-ink-700">
                      <span className="font-semibold block uppercase tracking-wider text-forest">
                        Grounded Sources & Citations:
                      </span>
                      {m.citations.map((c, cIdx) => (
                        <div key={cIdx} className="bg-ivory p-2 rounded-lg border border-ivory-300">
                          <strong>{c.sourceTitle}</strong> {c.chapter ? `(Chapter ${c.chapter})` : ""}: "{c.referenceText}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-ink-600 p-2">
              <span className="w-3.5 h-3.5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              <span>Querying local vector store & verifying spoiler boundary...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 bg-paper border-t border-ivory-200 flex gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Ask a question about this book..."
            disabled={loading}
            className="flex-1 text-xs py-3 px-4 rounded-xl border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !inputMsg.trim()}
            className="px-5 py-3 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
