import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { Book, Bookstore, Club } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  BookOpen,
  Sparkles,
  MapPin,
  Users,
  ShieldCheck,
  ArrowRight,
  Bookmark,
  Store,
  Layers,
  CheckCircle,
} from "lucide-react";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, demoLogin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [bookstores, setBookstores] = useState<Bookstore[]>([]);
  const [featuredClubs, setFeaturedClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [booksRes, clubsRes] = await Promise.all([
          api.getBooks({ limit: 6 }),
          api.getClubs(),
        ]);
        setFeaturedBooks(booksRes.data || []);
        setFeaturedClubs((clubsRes.data || []).slice(0, 3));
      } catch (err) {
        console.error("Error loading homepage data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const samplePrompts = [
    "Atmospheric locked-room mysteries set in snowy manors",
    "Gentle cozy fantasy about found families and running a tea shop",
    "Philosophical sci-fi exploring memory, isolation, and artificial consciousness",
    "Dark gothic suspense with unreliable narrators and decaying ancestral homes",
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-paper to-ivory border border-ivory-300 shadow-card py-16 px-6 sm:px-12 text-center mt-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest/10 border border-forest/20 text-forest-dark text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-forest" />
            <span>AI-Powered Thematic Discovery & Indie Bookstore Stock</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-950 tracking-tight leading-tight">
            Find the book you remember, <br />
            <span className="italic font-normal text-forest">even if you forgot the title.</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-600 max-w-2xl mx-auto leading-relaxed">
            Search by remembered plot details, atmospheric moods, or emotional themes. Discover verified stock at your neighborhood independent bookstores and reserve a copy in seconds.
          </p>

          {/* Natural Language Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mt-6">
            <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border-2 border-forest/30 bg-paper focus-within:border-forest transition-all">
              <Search className="w-5 h-5 text-ink-400 absolute left-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe a mood, plot snippet, or remembered feeling..."
                className="w-full pl-12 pr-32 py-4 text-sm sm:text-base text-ink-900 bg-transparent placeholder-ink-400 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-forest hover:bg-forest-light text-ivory font-medium text-sm transition-colors flex items-center gap-1.5 shadow"
              >
                <span>Discover</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Prompt Chips */}
          <div className="pt-2">
            <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold mb-2">Try searching for:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate(`/discover?q=${encodeURIComponent(prompt)}`)}
                  className="text-xs px-3 py-1.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-ink-700 transition-colors text-left"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Evaluator Quick Personas Bar */}
      <section className="bg-paper rounded-2xl border border-ivory-300 p-6 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <h2 className="font-serif text-lg font-bold text-ink-900">One-Click Evaluator Personas</h2>
            </div>
            <p className="text-xs text-ink-600">
              Instantly authenticate as any role to test role-based access, inventory reservation, and AI agent workflows.
            </p>
          </div>
          {user ? (
            <div className="text-xs bg-forest/10 border border-forest/20 text-forest-dark px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-forest" />
              <span>Signed in as <strong>{user.name}</strong> ({user.isSystemAdmin ? "Admin" : user.email})</span>
            </div>
          ) : (
            <span className="text-xs text-ink-500 italic">Not signed in</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => demoLogin("reader")}
            className="p-3 text-left rounded-xl border border-forest/20 bg-forest/5 hover:bg-forest/10 transition-colors"
          >
            <span className="text-xs font-bold text-forest-dark block">1. Verified Reader</span>
            <span className="text-[11px] text-ink-600 block mt-0.5">Explore catalog & reserve local stock</span>
          </button>

          <button
            onClick={() => demoLogin("bookseller")}
            className="p-3 text-left rounded-xl border border-terracotta/20 bg-terracotta/5 hover:bg-terracotta/10 transition-colors"
          >
            <span className="text-xs font-bold text-terracotta-dark block">2. Indie Bookseller</span>
            <span className="text-[11px] text-ink-600 block mt-0.5">Manage stock & confirm pickups</span>
          </button>

          <button
            onClick={() => demoLogin("moderator")}
            className="p-3 text-left rounded-xl border border-burgundy/20 bg-burgundy/5 hover:bg-burgundy/10 transition-colors"
          >
            <span className="text-xs font-bold text-burgundy-dark block">3. Club Moderator</span>
            <span className="text-[11px] text-ink-600 block mt-0.5">Run 3-tool AI agent & moderate discussions</span>
          </button>

          <button
            onClick={() => demoLogin("admin")}
            className="p-3 text-left rounded-xl border border-ink-400/20 bg-ink-100 hover:bg-ink-200 transition-colors"
          >
            <span className="text-xs font-bold text-ink-900 block">4. System Admin</span>
            <span className="text-[11px] text-ink-600 block mt-0.5">Audit logs, roles & 15 AI eval queries</span>
          </button>
        </div>
      </section>

      {/* Featured Books & Stock */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
              Curated Thematic Highlights
            </h2>
            <p className="text-sm text-ink-600 mt-1">
              Handpicked titles with active stock across local independent bookstores.
            </p>
          </div>
          <Link
            to="/discover"
            className="text-sm font-medium text-forest hover:text-forest-dark flex items-center gap-1 group"
          >
            <span>View All Books</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-paper p-6 rounded-2xl border border-ivory-300 animate-pulse h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBooks.map((book) => {
              const totalStock = book.inventorySummary?.totalAvailable ?? 0;
              return (
                <div
                  key={book._id}
                  className="bg-paper rounded-2xl border border-ivory-300 p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-burgundy bg-burgundy/10 px-2.5 py-0.5 rounded-full">
                          {book.genres?.[0] || "Fiction"}
                        </span>
                        <h3 className="font-serif text-lg font-bold text-ink-950 mt-1.5 group-hover:text-forest transition-colors line-clamp-1">
                          <Link to={`/books/${book._id}`}>{book.title}</Link>
                        </h3>
                        <p className="text-xs text-ink-600">by {book.authors.join(", ")}</p>
                      </div>

                      {/* Cover Jacket Placeholder */}
                      <div className="w-14 h-20 bg-ivory-200 border border-ivory-300 rounded-md shrink-0 flex items-center justify-center text-ink-400 shadow-sm font-serif text-xs font-bold p-1 text-center line-clamp-2">
                        {book.title.slice(0, 15)}
                      </div>
                    </div>

                    <p className="text-xs text-ink-700 line-clamp-3 leading-relaxed">
                      {book.description}
                    </p>

                    {/* Mood & Theme Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {book.moods?.slice(0, 2).map((mood, idx) => (
                        <span key={idx} className="text-[10px] bg-ivory-200 text-ink-700 px-2 py-0.5 rounded-md">
                          #{mood}
                        </span>
                      ))}
                      {book.themes?.slice(0, 2).map((theme, idx) => (
                        <span key={idx} className="text-[10px] bg-ivory-200 text-ink-700 px-2 py-0.5 rounded-md">
                          #{theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stock Indicator & Action */}
                  <div className="mt-5 pt-4 border-t border-ivory-200 flex items-center justify-between">
                    <div className="text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${totalStock > 0 ? "bg-emerald-500" : "bg-red-400"}`} />
                      <span className="text-ink-600 font-medium">
                        {totalStock > 0 ? `${totalStock} in stock locally` : "Checking inventory"}
                      </span>
                    </div>

                    <Link
                      to={`/books/${book._id}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-forest/10 hover:bg-forest text-forest hover:text-ivory transition-colors"
                    >
                      View & Reserve
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Participating Independent Bookstores */}
      <section className="bg-paper rounded-3xl border border-ivory-300 p-8 sm:p-10 shadow-card">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <div className="inline-flex p-2 bg-terracotta/10 rounded-xl text-terracotta mb-2">
            <Store className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
            Neighborhood Independent Bookstores
          </h2>
          <p className="text-sm text-ink-600 mt-2">
            Every book you discover links directly to local shelves. Free curbside pickups, curated staff notes, and held reservations without prepayment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Beacon Hill Books & Cafe",
              neighborhood: "Beacon Hill, Boston",
              specialty: "Historical fiction, philosophy & cozy tea room",
              hours: "Tue–Sun: 9:00 AM – 7:00 PM",
            },
            {
              name: "Porter Square Books",
              neighborhood: "Cambridge, MA",
              specialty: "Contemporary literary fiction, sci-fi & community readings",
              hours: "Mon–Sun: 10:00 AM – 8:00 PM",
            },
            {
              name: "Harvard Book Store",
              neighborhood: "Harvard Square, Cambridge",
              specialty: "Academic press, translated literature & rare prints",
              hours: "Mon–Sat: 9:00 AM – 10:00 PM",
            },
            {
              name: "Brookline Booksmith",
              neighborhood: "Coolidge Corner, Brookline",
              specialty: "Author events, speculative fiction & gift curations",
              hours: "Mon–Sun: 9:00 AM – 9:00 PM",
            },
          ].map((store, i) => (
            <div key={i} className="p-5 rounded-2xl bg-ivory border border-ivory-300 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-terracotta font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{store.neighborhood}</span>
              </div>
              <h3 className="font-serif text-base font-bold text-ink-900">{store.name}</h3>
              <p className="text-xs text-ink-600">{store.specialty}</p>
              <p className="text-[11px] text-ink-500 pt-2 border-t border-ivory-200">{store.hours}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reading Clubs Section */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
              Community Reading Clubs
            </h2>
            <p className="text-sm text-ink-600 mt-1">
              Join moderated discussions with chapter-synchronized spoiler shields and AI-assisted book selections.
            </p>
          </div>
          <Link
            to="/clubs"
            className="text-sm font-medium text-forest hover:text-forest-dark flex items-center gap-1 group"
          >
            <span>Explore All Clubs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredClubs.map((club) => (
            <div
              key={club._id}
              className="bg-paper p-6 rounded-2xl border border-ivory-300 shadow-card flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-forest bg-forest/10 px-2.5 py-0.5 rounded-full">
                    {club.genres?.[0] || "General"}
                  </span>
                  <span className="text-xs text-ink-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{club.memberCount || 1} members</span>
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-ink-950">
                  <Link to={`/clubs/${club._id}`} className="hover:text-forest transition-colors">
                    {club.name}
                  </Link>
                </h3>

                <p className="text-xs text-ink-700 line-clamp-3 leading-relaxed">
                  {club.description}
                </p>

                <div className="text-[11px] text-ink-600 bg-ivory p-2.5 rounded-lg border border-ivory-200">
                  <strong>Spoiler Policy:</strong>{" "}
                  {club.spoilerPolicy === "chapter_synchronized"
                    ? "Chapter Synchronized"
                    : club.spoilerPolicy === "strict_no_spoilers"
                    ? "Strict No Spoilers"
                    : "Post-Meeting Unrestricted"}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-ivory-200">
                <Link
                  to={`/clubs/${club._id}`}
                  className="block text-center w-full py-2 px-3 text-xs font-medium rounded-lg bg-forest hover:bg-forest-light text-ivory transition-colors"
                >
                  View Club & Discussions
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Architectural Guarantees */}
      <section className="bg-gradient-to-r from-forest-dark to-ink-950 text-ivory rounded-3xl p-8 sm:p-12 shadow-card">
        <div className="max-w-3xl mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Built for Literary Trust and Local Communities
          </h2>
          <p className="text-sm text-ivory-300 mt-2 leading-relaxed">
            Every feature is designed with rigorous anti-hallucination bounds, reader privacy, and local bookstore integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-ivory/10 p-5 rounded-2xl border border-ivory/15 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest text-ivory flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-bold text-ivory">Anti-Spoiler Shield</h3>
            <p className="text-xs text-ivory-300 leading-relaxed">
              Discussions and RAG answers automatically mask plot details beyond your current chapter progress.
            </p>
          </div>

          <div className="bg-ivory/10 p-5 rounded-2xl border border-ivory/15 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-terracotta text-ivory flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-bold text-ivory">Atomic Stock Holds</h3>
            <p className="text-xs text-ivory-300 leading-relaxed">
              Conditional database locking ensures no overselling or double-booking during local bookstore reservations.
            </p>
          </div>

          <div className="bg-ivory/10 p-5 rounded-2xl border border-ivory/15 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold text-ink-950 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base font-bold text-ivory">Bounded 3-Tool AI Agent</h3>
            <p className="text-xs text-ivory-300 leading-relaxed">
              Book club selection queries run through a bounded multi-tool pipeline requiring moderator confirmation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
