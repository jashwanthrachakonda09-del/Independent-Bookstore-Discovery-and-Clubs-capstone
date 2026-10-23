import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { Book, InventoryStoreSummary, ReadingList, Citation, ReadingProgress } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Bookmark,
  Send,
  AlertCircle,
  CheckCircle,
  X,
  Store,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

export const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [userProgress, setUserProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Reservation Modal State
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<InventoryStoreSummary | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState<any>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  // Reading List Modal / Feedback
  const [selectedListId, setSelectedListId] = useState("");
  const [listSuccess, setListSuccess] = useState<string | null>(null);

  // Progress Update State
  const [chapterInput, setChapterInput] = useState(1);
  const [pageInput, setPageInput] = useState(1);
  const [spoilerModeInput, setSpoilerModeInput] = useState<"spoiler_free" | "progress_limited" | "full_book">("progress_limited");
  const [progressStatus, setProgressStatus] = useState<"want_to_read" | "reading" | "completed">("reading");
  const [progressSaved, setProgressSaved] = useState(false);

  // Spoiler-Safe Chat State
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string; citations?: Citation[]; maskedContent?: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadBookData = async () => {
      setLoading(true);
      try {
        const bookRes = await api.getBook(id);
        setBook(bookRes.data);

        if (user) {
          const [listsRes, progRes] = await Promise.all([
            api.getReadingLists().catch(() => ({ data: [] })),
            api.getProgress(id).catch(() => ({ data: null })),
          ]);
          setReadingLists(listsRes.data || []);
          if (progRes.data) {
            setUserProgress(progRes.data);
            setChapterInput(progRes.data.currentChapter || 1);
            setPageInput(progRes.data.currentPage || 1);
            setSpoilerModeInput(progRes.data.spoilerMode || "progress_limited");
            setProgressStatus(progRes.data.status || "reading");
          }
        }
      } catch (err) {
        console.error("Error loading book detail:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBookData();
  }, [id, user]);

  const handleOpenReserve = (store: InventoryStoreSummary) => {
    setSelectedStore(store);
    setReserveQuantity(1);
    setReserveError(null);
    setReserveSuccess(null);
    setReserveModalOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (!book || !selectedStore) return;
    setReserveLoading(true);
    setReserveError(null);
    try {
      const res = await api.reserveBook(book._id, {
        storeId: selectedStore.storeId,
        quantity: reserveQuantity,
        format: selectedStore.format,
        condition: selectedStore.condition,
      });
      setReserveSuccess(res.data);
      // Refresh book inventory
      const updated = await api.getBook(book._id);
      setBook(updated.data);
    } catch (err: any) {
      setReserveError(err.message || "Reservation failed. Please check store stock.");
    } finally {
      setReserveLoading(false);
    }
  };

  const handleAddToList = async () => {
    if (!selectedListId || !book) return;
    try {
      await api.addBookToList(selectedListId, { bookId: book._id });
      setListSuccess("Book successfully added to list!");
      setTimeout(() => setListSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to add book to list.");
    }
  };

  const handleSaveProgress = async () => {
    if (!book) return;
    try {
      const res = await api.updateProgress({
        bookId: book._id,
        currentChapter: Number(chapterInput),
        currentPage: Number(pageInput),
        spoilerMode: spoilerModeInput,
        status: progressStatus,
      });
      setUserProgress(res.data);
      setProgressSaved(true);
      setTimeout(() => setProgressSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update reading progress.");
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !book || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await api.sendBookChat({
        bookId: book._id,
        message: userMsg,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply,
          citations: res.data.citations,
          maskedContent: res.data.maskedContent,
        },
      ]);
    } catch (err: any) {
      setChatError(err.message || "Chat failed. Local AI inference encountered an issue.");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-paper rounded-2xl border border-ivory-300 animate-pulse space-y-4">
        <div className="h-8 bg-ivory-300 rounded w-1/2" />
        <div className="h-4 bg-ivory-200 rounded w-1/4" />
        <div className="h-32 bg-ivory-100 rounded w-full mt-6" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-lg mx-auto my-16 text-center bg-paper p-8 rounded-2xl border border-ivory-300">
        <h2 className="font-serif text-xl font-bold text-ink-900">Book Not Found</h2>
        <p className="text-xs text-ink-600 mt-2">
          The requested title does not exist in our independent bookstore catalog.
        </p>
        <Link to="/discover" className="mt-4 inline-block px-4 py-2 text-xs rounded-lg bg-forest text-ivory">
          Browse Catalog
        </Link>
      </div>
    );
  }

  const stores = book.inventorySummary?.stores || [];
  const totalStock = book.inventorySummary?.totalAvailable ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-ink-500">
        <Link to="/discover" className="hover:text-forest transition-colors">
          Discovery
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-900 font-medium line-clamp-1">{book.title}</span>
      </div>

      {/* Hero Book Information Card */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Book Jacket Visual */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-48 h-64 rounded-xl bg-gradient-to-br from-forest-dark to-ink-900 text-ivory p-6 flex flex-col justify-between shadow-xl border-4 border-ivory/20 text-center">
            <span className="text-[10px] uppercase tracking-widest text-gold font-mono">Indie Shelf Edition</span>
            <div>
              <h2 className="font-serif text-lg font-bold leading-tight line-clamp-3">{book.title}</h2>
              <p className="text-xs text-ivory-300 mt-2 font-sans">{book.authors.join(", ")}</p>
            </div>
            <span className="text-[10px] text-ivory-400 font-mono">
              {book.publicationYear || "Classic"}
            </span>
          </div>

          <div className="text-center space-y-1">
            <span className="text-xs text-ink-500">Local Verified Stock:</span>
            <div className="text-sm font-bold text-forest-dark flex items-center justify-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${totalStock > 0 ? "bg-emerald-500" : "bg-red-400"}`} />
              <span>{totalStock > 0 ? `${totalStock} Copies Available` : "Temporarily Out of Stock"}</span>
            </div>
          </div>
        </div>

        {/* Book Metadata & Synopsis */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-burgundy bg-burgundy/10 px-3 py-1 rounded-full">
              {book.genres?.[0] || "Fiction"}
            </span>
            {book.readingLength && (
              <span className="text-xs text-ink-600 bg-ivory-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-ink-500" />
                <span>{book.readingLength} pages</span>
              </span>
            )}
            {book.isbn && (
              <span className="text-xs text-ink-500 font-mono bg-ivory px-2.5 py-1 rounded-md border border-ivory-200">
                ISBN: {book.isbn}
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-950 leading-tight">
            {book.title}
          </h1>
          <p className="text-sm font-medium text-ink-700">by {book.authors.join(", ")}</p>

          <p className="text-sm text-ink-800 leading-relaxed pt-2">
            {book.description}
          </p>

          {/* Tags */}
          <div className="pt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-ink-600 mr-1">Moods:</span>
              {book.moods?.map((mood, idx) => (
                <span key={idx} className="text-xs bg-terracotta/10 text-terracotta-dark px-2.5 py-0.5 rounded-md font-medium">
                  #{mood}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-ink-600 mr-1">Themes:</span>
              {book.themes?.map((theme, idx) => (
                <span key={idx} className="text-xs bg-forest/10 text-forest-dark px-2.5 py-0.5 rounded-md font-medium">
                  #{theme}
                </span>
              ))}
            </div>
          </div>

          {/* Add to Reading List Dropdown */}
          {user && (
            <div className="pt-4 border-t border-ivory-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-xs font-semibold text-ink-700 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-forest" />
                <span>Add to My List:</span>
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
                >
                  <option value="">Select reading list...</option>
                  {readingLists.map((list) => (
                    <option key={list._id} value={list._id}>
                      {list.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddToList}
                  disabled={!selectedListId}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-forest hover:bg-forest-light text-ivory transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {listSuccess && (
                <span className="text-xs text-forest-dark font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{listSuccess}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Local Store Inventory & Reservation Table */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-terracotta" />
            <h2 className="font-serif text-xl font-bold text-ink-950">
              Live Independent Bookstore Stock
            </h2>
          </div>
          <p className="text-xs text-ink-600 mt-1">
            Reserve a physical copy directly at your neighborhood bookstore. Reservations are held for 48 hours without upfront payment.
          </p>
        </div>

        {stores.length === 0 ? (
          <p className="text-sm text-ink-600 italic">No inventory listings found for this title.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory text-ink-700 uppercase tracking-wider font-semibold border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4">Independent Bookstore</th>
                  <th className="py-3 px-4">Format / Condition</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {stores.map((s, idx) => (
                  <tr key={idx} className="hover:bg-ivory/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink-900">{s.storeName}</div>
                      <div className="text-[11px] text-ink-500">Pickups held for 48h</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink-800">{s.format}</span>
                      <span className="text-ink-500 block text-[11px]">{s.condition}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                          s.availableQuantity > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.availableQuantity} in stock
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-ink-900">
                      ${s.price?.toFixed(2) || "18.00"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenReserve(s)}
                        disabled={s.availableQuantity <= 0}
                        className="px-3.5 py-1.5 rounded-lg bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors disabled:opacity-40 disabled:hover:bg-forest"
                      >
                        {s.availableQuantity > 0 ? "Reserve Copy" : "Out of Stock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reader Progress & Anti-Spoiler Shield Settings */}
      {user && (
        <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-forest" />
                <h2 className="font-serif text-xl font-bold text-ink-950">
                  Your Reading Progress & Spoiler Shield
                </h2>
              </div>
              <p className="text-xs text-ink-600 mt-1">
                Set your chapter marker to automatically mask discussions and AI responses discussing future plot events.
              </p>
            </div>

            {progressSaved && (
              <span className="text-xs font-medium text-forest-dark bg-forest/10 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Progress Saved</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Reading Status
              </label>
              <select
                value={progressStatus}
                onChange={(e: any) => setProgressStatus(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              >
                <option value="want_to_read">Want to Read</option>
                <option value="reading">Currently Reading</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Current Chapter
              </label>
              <input
                type="number"
                min={1}
                max={150}
                value={chapterInput}
                onChange={(e) => setChapterInput(Number(e.target.value))}
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Current Page
              </label>
              <input
                type="number"
                min={1}
                max={1500}
                value={pageInput}
                onChange={(e) => setPageInput(Number(e.target.value))}
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Spoiler Protection
              </label>
              <select
                value={spoilerModeInput}
                onChange={(e: any) => setSpoilerModeInput(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              >
                <option value="spoiler_free">Strictly Spoiler-Free</option>
                <option value="progress_limited">Up to Current Chapter</option>
                <option value="full_book">Full Book (No Masking)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProgress}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-forest hover:bg-forest-light text-ivory transition-colors shadow-sm"
            >
              Update Reading Marker
            </button>
          </div>
        </div>
      )}

      {/* Spoiler-Aware Book Chat (RAG) Tab */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h2 className="font-serif text-xl font-bold text-ink-950">
              Spoiler-Safe Book Companion
            </h2>
          </div>
          <p className="text-xs text-ink-600 mt-1">
            Ask questions about themes, character motivations, and historical context. Answers are grounded in catalog documentation and automatically shield future plot points!
          </p>
        </div>

        {/* Message Log */}
        <div className="min-h-[180px] max-h-[360px] overflow-y-auto space-y-4 p-4 rounded-2xl bg-ivory border border-ivory-300">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-500 space-y-1">
              <BookOpen className="w-8 h-8 mx-auto text-ink-400" />
              <p className="font-medium text-ink-700">No questions asked yet.</p>
              <p>Try asking: "What are the central philosophical themes in this novel?"</p>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1.5 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-forest text-ivory"
                      : "bg-paper border border-ivory-300 text-ink-900 shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-ivory-200 text-[10px] space-y-1 text-ink-600">
                      <span className="font-semibold block uppercase tracking-wider text-forest">
                        Citations & Verification:
                      </span>
                      {msg.citations.map((c, cIdx) => (
                        <div key={cIdx} className="bg-ivory p-1.5 rounded border border-ivory-300">
                          <strong>{c.sourceTitle}</strong> {c.chapter ? `(Ch. ${c.chapter})` : ""}: "{c.referenceText}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {chatLoading && (
            <div className="flex items-center space-x-2 text-xs text-ink-600 p-2">
              <span className="w-3.5 h-3.5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              <span>Checking spoiler boundaries & retrieving grounded knowledge...</span>
            </div>
          )}

          {chatError && (
            <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs">
              {chatError}
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              user
                ? "Ask a question about this book..."
                : "Sign in as a reader to chat with spoiler protection..."
            }
            disabled={!user || chatLoading}
            className="flex-1 text-xs py-2.5 px-4 rounded-xl border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
          />
          <button
            type="submit"
            disabled={!user || chatLoading || !chatInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Reservation Modal */}
      {reserveModalOpen && selectedStore && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-ink-900">
                Reserve Physical Copy
              </h3>
              <button
                onClick={() => setReserveModalOpen(false)}
                className="text-ink-500 hover:text-ink-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reserveSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle className="w-10 h-10 text-forest mx-auto" />
                <h4 className="font-serif text-base font-bold text-ink-900">
                  Reservation Confirmed!
                </h4>
                <p className="text-xs text-ink-600">
                  Your copy has been placed on hold at <strong>{selectedStore.storeName}</strong>.
                </p>
                <div className="p-3 bg-ivory rounded-lg text-xs text-left space-y-1">
                  <div>Hold Window: <strong>48 Hours</strong></div>
                  <div>Format: <strong>{selectedStore.format} ({selectedStore.condition})</strong></div>
                  <div>Quantity: <strong>{reserveQuantity}</strong></div>
                  <div>Total Due at Pickup: <strong>${((selectedStore.price || 18) * reserveQuantity).toFixed(2)}</strong></div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setReserveModalOpen(false)}
                    className="w-full py-2 rounded-lg bg-forest text-ivory text-xs font-medium"
                  >
                    Close & View Reservations
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-ivory rounded-lg text-xs space-y-1 text-ink-700">
                  <div><strong>Store:</strong> {selectedStore.storeName}</div>
                  <div><strong>Format:</strong> {selectedStore.format} ({selectedStore.condition})</div>
                  <div><strong>Price:</strong> ${selectedStore.price?.toFixed(2) || "18.00"}</div>
                  <div><strong>Available:</strong> {selectedStore.availableQuantity} copies</div>
                </div>

                {!user ? (
                  <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs space-y-2">
                    <p>You must be signed in to place a reservation.</p>
                    <Link
                      to="/login"
                      className="block text-center py-1.5 rounded bg-forest text-ivory text-xs font-medium"
                    >
                      Sign In Now
                    </Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1">
                        Quantity to Reserve:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={Math.min(selectedStore.availableQuantity, 5)}
                        value={reserveQuantity}
                        onChange={(e) => setReserveQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                      />
                    </div>

                    {reserveError && (
                      <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs">
                        {reserveError}
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReserveModalOpen(false)}
                        className="flex-1 py-2 rounded-lg border border-ivory-300 text-xs font-medium text-ink-700 hover:bg-ivory"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmReservation}
                        disabled={reserveLoading}
                        className="flex-1 py-2 rounded-lg bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {reserveLoading ? "Holding Stock..." : "Confirm Free Hold"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
