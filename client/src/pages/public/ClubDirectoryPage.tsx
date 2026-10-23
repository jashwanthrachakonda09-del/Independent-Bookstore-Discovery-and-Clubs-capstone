import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Club } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  ShieldCheck,
  Plus,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";

export const ClubDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Club Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState("Mystery, Thriller");
  const [themes, setThemes] = useState("Atmospheric, Puzzles");
  const [readingLengthLimit, setReadingLengthLimit] = useState(400);
  const [spoilerPolicy, setSpoilerPolicy] = useState<"strict_no_spoilers" | "chapter_synchronized" | "unrestricted_post_meeting">("chapter_synchronized");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadClubs = async () => {
    setLoading(true);
    try {
      const res = await api.getClubs();
      setClubs(res.data || []);
    } catch (err) {
      console.error("Error loading clubs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.createClub({
        name,
        description,
        genres: genres.split(",").map((s) => s.trim()).filter(Boolean),
        themes: themes.split(",").map((s) => s.trim()).filter(Boolean),
        readingLengthLimit: Number(readingLengthLimit),
        spoilerPolicy,
      });
      setModalOpen(false);
      setName("");
      setDescription("");
      loadClubs();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create reading club.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleJoin = async (clubId: string, isMember: boolean) => {
    if (!user) {
      alert("Please sign in to join reading clubs.");
      return;
    }
    try {
      if (isMember) {
        await api.leaveClub(clubId);
      } else {
        await api.joinClub(clubId);
      }
      loadClubs();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-950">
            Reading Clubs & Circles
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Join moderated discussions with strict chapter-synchronized spoiler shields and local bookstore stock coordination.
          </p>
        </div>

        {user && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Start a Reading Club</span>
          </button>
        )}
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-paper p-6 rounded-2xl border border-ivory-300 animate-pulse h-64" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="bg-paper p-12 rounded-2xl border border-ivory-300 text-center max-w-md mx-auto space-y-3">
          <Users className="w-10 h-10 text-ink-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-ink-900">No active reading clubs</h3>
          <p className="text-xs text-ink-600">Be the first moderator to launch a community circle!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => {
            const isMember = club.userMembership?.isMember || false;
            const isModerator = club.userMembership?.isModerator || false;

            return (
              <div
                key={club._id}
                className="bg-paper rounded-2xl border border-ivory-300 p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-forest bg-forest/10 px-2.5 py-0.5 rounded-full">
                      {club.genres?.[0] || "General"}
                    </span>
                    <span className="text-xs text-ink-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{club.memberCount || 1} members</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="font-serif text-xl font-bold text-ink-950 hover:text-forest transition-colors">
                      <Link to={`/clubs/${club._id}`}>{club.name}</Link>
                    </h2>
                    {isModerator && (
                      <span className="text-[10px] bg-burgundy/10 text-burgundy font-semibold px-2 py-0.5 rounded mt-1 inline-block">
                        You Moderate This Club
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-700 line-clamp-3 leading-relaxed">
                    {club.description}
                  </p>

                  {/* Club Rules & Spoiler Badge */}
                  <div className="space-y-1.5 text-xs text-ink-600 bg-ivory p-3 rounded-xl border border-ivory-200">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                      <span>
                        <strong>Policy:</strong>{" "}
                        {club.spoilerPolicy === "chapter_synchronized"
                          ? "Chapter Synchronized"
                          : club.spoilerPolicy === "strict_no_spoilers"
                          ? "Strict No Spoilers"
                          : "Post-Meeting Unrestricted"}
                      </span>
                    </div>

                    {club.readingLengthLimit && (
                      <div className="flex items-center gap-1.5 text-ink-500 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Length Cap: {club.readingLengthLimit} pages</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-ivory-200 flex items-center justify-between gap-2">
                  {user && (
                    <button
                      onClick={() => handleToggleJoin(club._id, isMember)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        isMember
                          ? "bg-ivory-200 hover:bg-ivory-300 text-ink-800"
                          : "bg-forest/10 hover:bg-forest text-forest hover:text-ivory"
                      }`}
                    >
                      {isMember ? "Joined" : "Join Club"}
                    </button>
                  )}

                  <Link
                    to={`/clubs/${club._id}`}
                    className="ml-auto text-xs font-medium text-forest hover:text-forest-dark flex items-center gap-1"
                  >
                    <span>View Discussions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Club Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-ink-900">
                Launch a New Reading Club
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-ink-500 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClub} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Club Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Back Bay Historical Fiction Guild"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kinds of books does this circle read, and who is welcome?"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Genres (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Max Page Length
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={1200}
                    value={readingLengthLimit}
                    onChange={(e) => setReadingLengthLimit(Number(e.target.value))}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Anti-Spoiler Policy
                </label>
                <select
                  value={spoilerPolicy}
                  onChange={(e: any) => setSpoilerPolicy(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                >
                  <option value="chapter_synchronized">Chapter Synchronized (Masks unreached chapters)</option>
                  <option value="strict_no_spoilers">Strict No Spoilers (Zero plot spoilers allowed)</option>
                  <option value="unrestricted_post_meeting">Unrestricted Post-Meeting</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
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
                  {createLoading ? "Creating..." : "Launch Club"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
