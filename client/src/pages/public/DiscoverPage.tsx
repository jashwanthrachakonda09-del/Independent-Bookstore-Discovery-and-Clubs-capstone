import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { Book } from "../../types";
import {
  Search,
  Filter,
  Sparkles,
  BookOpen,
  MapPin,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  ArrowRight,
  Clock,
  RotateCcw,
} from "lucide-react";

export const DiscoverPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialGenre = searchParams.get("genre") || "";
  const initialTheme = searchParams.get("theme") || "";
  const initialMood = searchParams.get("mood") || "";

  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [theme, setTheme] = useState(initialTheme);
  const [mood, setMood] = useState(initialMood);
  const [maxPages, setMaxPages] = useState<number | "">("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const genresList = [
    "Mystery",
    "Science Fiction",
    "Fantasy",
    "Gothic",
    "Historical Fiction",
    "Literary Fiction",
    "Non-Fiction",
    "Romance",
  ];

  const moodsList = [
    "Atmospheric",
    "Cozy",
    "Melancholy",
    "Tense",
    "Philosophical",
    "Dark",
    "Whimsical",
    "Uplifting",
  ];

  const themesList = [
    "Isolation",
    "Memory",
    "Identity",
    "Found Family",
    "Artificial Intelligence",
    "Decaying Manor",
    "Small Town Secrets",
    "Time Travel",
  ];

  const fetchResults = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, any> = {};
      if (query.trim()) params.query = query.trim();
      if (genre) params.genre = genre;
      if (theme) params.theme = theme;
      if (mood) params.mood = mood;
      if (maxPages) params.maxReadingLength = Number(maxPages);
      if (inStockOnly) params.inStockOnly = true;

      const res = await api.getBooks(params);
      setBooks(res.data || []);
      setTotalCount(res.count || res.data?.length || 0);
    } catch (err) {
      console.error("Discovery error:", err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [genre, theme, mood, inStockOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query, genre, theme, mood });
    fetchResults();
  };

  const handleResetFilters = () => {
    setQuery("");
    setGenre("");
    setTheme("");
    setMood("");
    setMaxPages("");
    setInStockOnly(false);
    setSearchParams({});
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-950">
          Thematic Bookstore Discovery
        </h1>
        <p className="text-sm text-ink-600">
          Search with natural phrases or filter by sensory mood, philosophical theme, and verified indie shelf stock.
        </p>
      </div>

      {/* Main Search Bar */}
      <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-center shadow-md rounded-2xl overflow-hidden border border-ivory-300 bg-paper focus-within:border-forest transition-all">
          <Search className="w-5 h-5 text-ink-400 absolute left-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'a tense snowy locked room mystery' or 'cozy tea shop found family'..."
            className="w-full pl-12 pr-28 py-3.5 text-sm sm:text-base text-ink-900 bg-transparent placeholder-ink-400 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2 rounded-xl bg-forest hover:bg-forest-light text-ivory font-medium text-sm transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filter Control Drawer */}
      <div className="bg-paper p-6 rounded-2xl border border-ivory-300 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-700">
            <SlidersHorizontal className="w-4 h-4 text-forest" />
            <span>Refine By Criteria</span>
          </div>
          {(query || genre || theme || mood || maxPages || inStockOnly) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-burgundy hover:text-burgundy-dark font-medium flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Genre Chips */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
              Genre
            </label>
            <div className="flex flex-wrap gap-1.5">
              {genresList.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? "" : g)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    genre === g
                      ? "bg-forest text-ivory font-semibold shadow-sm"
                      : "bg-ivory border border-ivory-300 text-ink-700 hover:bg-ivory-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Chips */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
              Atmosphere / Mood
            </label>
            <div className="flex flex-wrap gap-1.5">
              {moodsList.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? "" : m)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    mood === m
                      ? "bg-terracotta text-ivory font-semibold shadow-sm"
                      : "bg-ivory border border-ivory-300 text-ink-700 hover:bg-ivory-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Chips */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
              Underlying Theme
            </label>
            <div className="flex flex-wrap gap-1.5">
              {themesList.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(theme === t ? "" : t)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    theme === t
                      ? "bg-burgundy text-ivory font-semibold shadow-sm"
                      : "bg-ivory border border-ivory-300 text-ink-700 hover:bg-ivory-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sliders & Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-ivory-200">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-ink-700">Max Reading Length (pages):</label>
            <input
              type="number"
              min={50}
              max={1200}
              step={50}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value ? Number(e.target.value) : "")}
              placeholder="Any length"
              className="w-28 px-2.5 py-1 text-xs rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-ink-800">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded text-forest focus:ring-forest border-ivory-300 w-4 h-4"
            />
            <span>Only show books in-stock at local bookstores</span>
          </label>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-ink-600 px-1">
        <span>
          Showing <strong>{books.length}</strong> {books.length === 1 ? "book" : "books"} matching criteria
        </span>
        {query && (
          <span className="flex items-center gap-1 text-forest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semantic vector similarity active</span>
          </span>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-paper p-6 rounded-2xl border border-ivory-300 animate-pulse h-48" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-paper p-12 rounded-2xl border border-ivory-300 text-center max-w-lg mx-auto space-y-4">
          <BookOpen className="w-10 h-10 text-ink-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-ink-900">No matching books found</h3>
          <p className="text-xs text-ink-600">
            Try broadening your search query or removing specific mood and theme filters to discover related works.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-forest text-ivory hover:bg-forest-light transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {books.map((book) => {
            const totalStock = book.inventorySummary?.totalAvailable ?? 0;
            const stores = book.inventorySummary?.stores || [];

            return (
              <div
                key={book._id}
                className="bg-paper rounded-2xl border border-ivory-300 p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Genre & Similarity Score */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-burgundy bg-burgundy/10 px-2.5 py-0.5 rounded-full">
                      {book.genres?.[0] || "Fiction"}
                    </span>

                    {typeof book.similarityScore === "number" && (
                      <span className="text-[11px] font-semibold text-forest bg-forest/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-forest" />
                        <span>{Math.round(book.similarityScore * 100)}% match</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <div>
                    <h2 className="font-serif text-xl font-bold text-ink-950 hover:text-forest transition-colors">
                      <Link to={`/books/${book._id}`}>{book.title}</Link>
                    </h2>
                    <p className="text-xs text-ink-600">by {book.authors.join(", ")}</p>
                  </div>

                  {/* AI Match Reasons / Explanations */}
                  {book.matchReasons && book.matchReasons.length > 0 && (
                    <div className="p-3 rounded-lg bg-forest/5 border border-forest/15 text-xs text-forest-dark space-y-1">
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-forest">
                        Why this matched:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {book.matchReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Criteria Warning */}
                  {book.missingInfo && book.missingInfo.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 flex items-center gap-1.5">
                      <span className="font-semibold">Note:</span>
                      <span>Missing requested elements: {book.missingInfo.join(", ")}</span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-ink-700 line-clamp-3 leading-relaxed">
                    {book.description}
                  </p>

                  {/* Metadata Chips: Length, Moods, Themes */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {book.readingLength && (
                      <span className="text-[10px] bg-ivory-200 text-ink-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-ink-500" />
                        <span>{book.readingLength} pages</span>
                      </span>
                    )}
                    {book.moods?.map((mood, idx) => (
                      <span key={idx} className="text-[10px] bg-terracotta/10 text-terracotta-dark px-2 py-0.5 rounded-md">
                        #{mood}
                      </span>
                    ))}
                    {book.themes?.map((theme, idx) => (
                      <span key={idx} className="text-[10px] bg-forest/10 text-forest-dark px-2 py-0.5 rounded-md">
                        #{theme}
                      </span>
                    ))}
                  </div>

                  {/* Local Bookstore Stock Summary */}
                  <div className="pt-2 border-t border-ivory-200">
                    <span className="text-[11px] font-semibold text-ink-800 block mb-1">
                      Independent Bookstore Stock:
                    </span>
                    {stores.length > 0 ? (
                      <div className="space-y-1">
                        {stores.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-ink-600 bg-ivory p-1.5 rounded">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-terracotta" />
                              <span className="font-medium">{s.storeName}</span>
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-forest-dark">
                              {s.availableQuantity} available (${s.price?.toFixed(2) || "18.00"})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-500 italic">No copies currently on shelves.</p>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-4 border-t border-ivory-200 flex items-center justify-between">
                  <div className="text-xs text-ink-600 font-medium">
                    Total: <strong className="text-forest-dark">{totalStock} copies</strong>
                  </div>

                  <Link
                    to={`/books/${book._id}`}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-forest hover:bg-forest-light text-ivory transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>View & Reserve Copy</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
