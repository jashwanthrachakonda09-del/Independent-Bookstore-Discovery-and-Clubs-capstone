import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { ReadingList } from "../../types";
import {
  Bookmark,
  Plus,
  Trash2,
  BookOpen,
  ArrowRight,
  Lock,
  Globe,
  X,
} from "lucide-react";

export const ReadingListsPage: React.FC = () => {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // Create List Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListVisibility, setNewListVisibility] = useState<"private" | "public">("private");
  const [createLoading, setCreateLoading] = useState(false);

  const loadLists = async () => {
    setLoading(true);
    try {
      const res = await api.getReadingLists();
      const listData = res.data || [];
      setLists(listData);
      if (listData.length > 0 && !activeListId) {
        setActiveListId(listData[0]._id);
      }
    } catch (err) {
      console.error("Error loading reading lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await api.createReadingList({
        name: newListName.trim(),
        description: newListDesc.trim(),
        visibility: newListVisibility,
      });
      setModalOpen(false);
      setNewListName("");
      setNewListDesc("");
      await loadLists();
      setActiveListId(res.data._id);
    } catch (err: any) {
      alert(err.message || "Failed to create reading list.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRemoveBook = async (listId: string, bookId: string) => {
    if (!confirm("Remove this book from your reading list?")) return;
    try {
      await api.removeBookFromList(listId, bookId);
      loadLists();
    } catch (err: any) {
      alert(err.message || "Failed to remove book.");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this custom reading list?")) return;
    try {
      await api.deleteReadingList(listId);
      setActiveListId(null);
      loadLists();
    } catch (err: any) {
      alert(err.message || "Failed to delete list.");
    }
  };

  const activeList = lists.find((l) => l._id === activeListId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink-950">
            My Curated Reading Lists
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Organize personal shelf discoveries, track books in progress, and manage reading goals.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Reading List</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-paper p-8 rounded-2xl border border-ivory-300 animate-pulse h-64" />
      ) : lists.length === 0 ? (
        <div className="bg-paper p-12 rounded-2xl border border-ivory-300 text-center max-w-md mx-auto space-y-3">
          <Bookmark className="w-10 h-10 text-ink-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-ink-900">No reading lists found</h3>
          <p className="text-xs text-ink-600">Create your first reading list to organize books!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Lists Sidebar */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block mb-2 px-1">
              Your Lists
            </span>

            {lists.map((l) => (
              <button
                key={l._id}
                onClick={() => setActiveListId(l._id)}
                className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                  activeListId === l._id
                    ? "bg-forest text-ivory shadow-sm"
                    : "bg-paper hover:bg-ivory text-ink-800 border border-ivory-300"
                }`}
              >
                <div className="truncate pr-2">
                  <span className="block truncate">{l.name}</span>
                  <span className={`text-[10px] ${activeListId === l._id ? "text-ivory-300" : "text-ink-500"}`}>
                    {l.books?.length || 0} books
                  </span>
                </div>

                {l.visibility === "private" ? (
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${activeListId === l._id ? "text-ivory-300" : "text-ink-400"}`} />
                ) : (
                  <Globe className={`w-3.5 h-3.5 shrink-0 ${activeListId === l._id ? "text-ivory-300" : "text-ink-400"}`} />
                )}
              </button>
            ))}
          </div>

          {/* Active List Content */}
          <div className="md:col-span-3 space-y-6">
            {activeList && (
              <div className="bg-paper p-6 sm:p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
                <div className="flex items-start justify-between border-b border-ivory-200 pb-4">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-ink-950">
                      {activeList.name}
                    </h2>
                    {activeList.description && (
                      <p className="text-xs text-ink-600 mt-1">{activeList.description}</p>
                    )}
                  </div>

                  {!activeList.isDefaultSystemList && (
                    <button
                      onClick={() => handleDeleteList(activeList._id)}
                      className="text-xs text-burgundy hover:text-burgundy-dark font-medium flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete List</span>
                    </button>
                  )}
                </div>

                {/* Books in this list */}
                {activeList.books.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
                    <p className="text-xs text-ink-600">No books added to this list yet.</p>
                    <Link
                      to="/discover"
                      className="inline-block px-4 py-2 rounded-lg bg-forest text-ivory text-xs font-medium"
                    >
                      Explore Books
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeList.books.map((entry) => {
                      const book = entry.bookId;
                      if (!book) return null;

                      return (
                        <div
                          key={entry._id}
                          className="p-4 rounded-2xl bg-ivory border border-ivory-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-14 bg-forest text-ivory rounded flex items-center justify-center font-serif text-[10px] font-bold text-center p-1 shrink-0">
                              {book.title.slice(0, 10)}
                            </div>
                            <div>
                              <h3 className="font-serif text-sm font-bold text-ink-950 hover:text-forest transition-colors">
                                <Link to={`/books/${book._id}`}>{book.title}</Link>
                              </h3>
                              <p className="text-[11px] text-ink-600">by {book.authors?.join(", ")}</p>
                              {entry.notes && (
                                <p className="text-[11px] text-ink-500 italic mt-0.5">"{entry.notes}"</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Link
                              to={`/books/${book._id}`}
                              className="px-3 py-1.5 rounded-lg bg-forest/10 hover:bg-forest text-forest hover:text-ivory text-xs font-medium transition-colors"
                            >
                              Reserve Copy
                            </Link>
                            <button
                              onClick={() => handleRemoveBook(activeList._id, book._id)}
                              className="p-1.5 rounded-lg text-ink-400 hover:text-burgundy transition-colors"
                              title="Remove from list"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-ink-900">New Reading List</h3>
              <button onClick={() => setModalOpen(false)} className="text-ink-500 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  List Name
                </label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Autumn Mystery Favorites"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder="Brief note on what belongs in this collection..."
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Visibility
                </label>
                <select
                  value={newListVisibility}
                  onChange={(e: any) => setNewListVisibility(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                >
                  <option value="private">Private (Only you can see this list)</option>
                  <option value="public">Public (Shared with community)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-ivory-300 text-xs font-medium text-ink-700 hover:bg-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2 rounded-lg bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Save List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
