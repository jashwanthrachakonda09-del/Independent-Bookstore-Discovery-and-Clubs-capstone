import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { Club, Meeting, Discussion, AgentProposal, AgentProposalCandidate } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  Plus,
  Send,
  Flag,
  ArrowRight,
  BookOpen,
  ChevronRight,
  X,
} from "lucide-react";

export const ClubDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  // Unmasked spoilers tracked in local state per session
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Post Discussion State
  const [discussionContent, setDiscussionContent] = useState("");
  const [discussionChapter, setDiscussionChapter] = useState(1);
  const [discussionHasSpoilers, setDiscussionHasSpoilers] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  // Meeting Creation State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTarget, setMeetingTarget] = useState("Chapters 1–5");
  const [meetingDuration, setMeetingDuration] = useState(60);

  // AI Agent Book Selection Modal State
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentProposal, setAgentProposal] = useState<AgentProposal | null>(null);
  const [confirmingBookId, setConfirmingBookId] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const loadClubData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [clubRes, meetRes, discRes] = await Promise.all([
        api.getClub(id),
        api.getClubMeetings(id).catch(() => ({ data: [] })),
        api.getClubDiscussions(id).catch(() => ({ data: [] })),
      ]);
      setClub(clubRes.data);
      setMeetings(meetRes.data || []);
      setDiscussions(discRes.data || []);
    } catch (err) {
      console.error("Error loading club details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubData();
  }, [id, user]);

  const toggleSpoilerReveal = (discussionId: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [discussionId]: !prev[discussionId],
    }));
  };

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !discussionContent.trim()) return;

    setPostLoading(true);
    try {
      await api.createDiscussion(id, {
        content: discussionContent.trim(),
        hasSpoilers: discussionHasSpoilers,
        spoilerChapter: Number(discussionChapter),
      });
      setDiscussionContent("");
      setDiscussionHasSpoilers(false);
      // Reload discussions
      const res = await api.getClubDiscussions(id);
      setDiscussions(res.data || []);
    } catch (err: any) {
      alert(err.message || "Failed to post comment.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await api.createMeeting(id, {
        title: meetingTitle,
        scheduledAt: new Date(meetingDate).toISOString(),
        readingTarget: meetingTarget,
        durationMinutes: Number(meetingDuration),
      });
      setMeetingModalOpen(false);
      setMeetingTitle("");
      const res = await api.getClubMeetings(id);
      setMeetings(res.data || []);
    } catch (err: any) {
      alert(err.message || "Failed to schedule meeting.");
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !agentQuery.trim()) return;

    setAgentRunning(true);
    setAgentError(null);
    setAgentProposal(null);
    try {
      const res = await api.runClubAgent(id, agentQuery.trim());
      setAgentProposal(res.data);
    } catch (err: any) {
      setAgentError(err.message || "AI Agent book selection failed.");
    } finally {
      setAgentRunning(false);
    }
  };

  const handleConfirmCandidate = async (bookId: string) => {
    if (!id || !agentProposal) return;
    setConfirmingBookId(bookId);
    try {
      await api.confirmClubBookSelection(id, {
        proposalId: agentProposal.proposalId,
        selectedBookId: bookId,
      });
      alert("Book confirmed and scheduled as club's current reading title!");
      setAgentModalOpen(false);
      loadClubData();
    } catch (err: any) {
      alert(err.message || "Failed to confirm book selection.");
    } finally {
      setConfirmingBookId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-paper rounded-2xl border border-ivory-300 animate-pulse space-y-4">
        <div className="h-8 bg-ivory-300 rounded w-1/3" />
        <div className="h-4 bg-ivory-200 rounded w-1/4" />
        <div className="h-32 bg-ivory-100 rounded w-full mt-6" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="max-w-lg mx-auto my-16 text-center bg-paper p-8 rounded-2xl border border-ivory-300">
        <h2 className="font-serif text-xl font-bold text-ink-900">Club Not Found</h2>
        <Link to="/clubs" className="mt-4 inline-block px-4 py-2 text-xs rounded-lg bg-forest text-ivory">
          Back to Directory
        </Link>
      </div>
    );
  }

  const isModerator = club.userMembership?.isModerator || false;
  const isMember = club.userMembership?.isMember || false;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-ink-500">
        <Link to="/clubs" className="hover:text-forest transition-colors">
          Reading Clubs
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-900 font-medium">{club.name}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest/10 px-3 py-1 rounded-full">
                {club.genres?.[0] || "General"}
              </span>
              <span className="text-xs text-ink-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{club.memberCount || 1} Active Members</span>
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-950">
              {club.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isModerator && (
              <button
                onClick={() => setAgentModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-forest to-forest-dark hover:from-forest-light hover:to-forest text-ivory text-xs font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-gold" />
                <span>AI Book Selection Agent</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-ink-700 leading-relaxed max-w-3xl">
          {club.description}
        </p>

        {/* Club Guidelines & Policy Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-ivory-200 text-xs">
          <div className="p-3 bg-ivory rounded-xl border border-ivory-200">
            <span className="font-semibold text-ink-800 block mb-0.5">Anti-Spoiler Rule:</span>
            <span className="text-ink-600">
              {club.spoilerPolicy === "chapter_synchronized"
                ? "Chapter Synchronized"
                : club.spoilerPolicy === "strict_no_spoilers"
                ? "Strict No Spoilers Allowed"
                : "Post-Meeting Open"}
            </span>
          </div>

          <div className="p-3 bg-ivory rounded-xl border border-ivory-200">
            <span className="font-semibold text-ink-800 block mb-0.5">Length Cap:</span>
            <span className="text-ink-600">
              {club.readingLengthLimit ? `Under ${club.readingLengthLimit} pages` : "No strict limit"}
            </span>
          </div>

          <div className="p-3 bg-ivory rounded-xl border border-ivory-200">
            <span className="font-semibold text-ink-800 block mb-0.5">Expected Group:</span>
            <span className="text-ink-600">{club.expectedGroupSize || 8} Readers</span>
          </div>
        </div>
      </div>

      {/* Currently Reading Book Spotlight */}
      {club.currentBookId && (
        <div className="bg-gradient-to-r from-forest/10 via-paper to-ivory p-6 rounded-3xl border border-forest/20 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-20 bg-forest text-ivory rounded-lg flex items-center justify-center font-serif text-xs font-bold text-center p-1 shadow-md">
              {club.currentBookId.title.slice(0, 15)}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-forest block">
                Currently Reading
              </span>
              <h3 className="font-serif text-lg font-bold text-ink-950">
                {club.currentBookId.title}
              </h3>
              <p className="text-xs text-ink-600">
                by {club.currentBookId.authors?.join(", ")}
              </p>
            </div>
          </div>

          <Link
            to={`/books/${club.currentBookId._id}`}
            className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors shadow-sm shrink-0"
          >
            Check Local Store Stock & Reserve
          </Link>
        </div>
      )}

      {/* Upcoming Meetings Section */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-forest" />
            <h2 className="font-serif text-xl font-bold text-ink-950">
              Club Meetings & Reading Milestones
            </h2>
          </div>

          {isModerator && (
            <button
              onClick={() => setMeetingModalOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-forest/10 hover:bg-forest text-forest hover:text-ivory font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Next Meeting</span>
            </button>
          )}
        </div>

        {meetings.length === 0 ? (
          <p className="text-xs text-ink-500 italic">No meetings currently scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {meetings.map((m) => (
              <div key={m._id} className="p-4 rounded-2xl bg-ivory border border-ivory-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900">{m.title}</span>
                  <span className="text-[11px] text-forest font-semibold bg-forest/10 px-2 py-0.5 rounded">
                    {new Date(m.scheduledAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-ink-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-ink-400" />
                  <span>Target: <strong>{m.readingTarget}</strong> ({m.durationMinutes} min session)</span>
                </div>
                {m.agenda && <p className="text-xs text-ink-500 italic">{m.agenda}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Board with Anti-Spoiler Masks */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-burgundy" />
              <h2 className="font-serif text-xl font-bold text-ink-950">
                Chapter-Synchronized Discussions
              </h2>
            </div>
            <p className="text-xs text-ink-600 mt-1">
              Comments containing spoilers are automatically masked if their chapter exceeds your personal reading progress.
            </p>
          </div>
        </div>

        {/* Post Form */}
        {user ? (
          <form onSubmit={handlePostDiscussion} className="p-4 bg-ivory rounded-2xl border border-ivory-300 space-y-3">
            <textarea
              required
              rows={3}
              value={discussionContent}
              onChange={(e) => setDiscussionContent(e.target.value)}
              placeholder="Share an observation, question, or theory about the current chapters..."
              className="w-full text-xs p-3 rounded-xl border border-ivory-300 bg-paper focus:outline-none"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={discussionHasSpoilers}
                    onChange={(e) => setDiscussionHasSpoilers(e.target.checked)}
                    className="rounded text-burgundy focus:ring-burgundy"
                  />
                  <span className="font-medium text-ink-800">Contains Plot Spoilers</span>
                </label>

                {discussionHasSpoilers && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-600">Up to Chapter:</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={discussionChapter}
                      onChange={(e) => setDiscussionChapter(Number(e.target.value))}
                      className="w-16 py-1 px-2 text-xs rounded border border-ivory-300 bg-paper text-center"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={postLoading || !discussionContent.trim()}
                className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>Post Comment</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-ivory rounded-xl text-center text-xs text-ink-600">
            <Link to="/login" className="text-forest font-semibold underline">
              Sign in
            </Link>{" "}
            to join this club's discussion board.
          </div>
        )}

        {/* Discussions List */}
        <div className="space-y-4">
          {discussions.length === 0 ? (
            <p className="text-xs text-ink-500 italic text-center py-6">
              No comments posted yet. Start the conversation!
            </p>
          ) : (
            discussions.map((d) => {
              const isMasked = d.isSpoilerForViewer && !revealedSpoilers[d._id];

              return (
                <div
                  key={d._id}
                  className="p-5 rounded-2xl bg-ivory border border-ivory-200 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{d.authorId?.name || "Reader"}</span>
                      <span className="text-ink-400">•</span>
                      <span className="text-ink-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>

                    {d.hasSpoilers && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-burgundy bg-burgundy/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-burgundy" />
                        <span>Spoiler: Chapter {d.spoilerChapter}</span>
                      </span>
                    )}
                  </div>

                  {/* Masked vs Plain Content */}
                  {isMasked ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                      <div className="flex items-center justify-between text-amber-900">
                        <span className="font-semibold flex items-center gap-1.5">
                          <EyeOff className="w-4 h-4 text-amber-700" />
                          <span>Spoiler Shield Active (Covers Chapter {d.spoilerChapter})</span>
                        </span>
                        <button
                          onClick={() => toggleSpoilerReveal(d._id)}
                          className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium text-[11px] transition-colors"
                        >
                          Reveal Comment
                        </button>
                      </div>
                      <p className="text-ink-500 italic text-[11px]">
                        This post discusses events ahead of your saved reading progress.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-ink-800 leading-relaxed whitespace-pre-wrap">
                        {d.content}
                      </p>
                      {revealedSpoilers[d._id] && (
                        <button
                          onClick={() => toggleSpoilerReveal(d._id)}
                          className="mt-2 text-[11px] text-ink-500 hover:text-ink-700 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Re-mask spoiler</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AI Book Selection Agent Modal (Moderator Only) */}
      {agentModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-3xl border border-ivory-300 p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" />
                  <h3 className="font-serif text-xl font-bold text-ink-900">
                    AI Club Selection Agent
                  </h3>
                </div>
                <p className="text-xs text-ink-600 mt-0.5">
                  Runs a bounded 3-tool pipeline to discover, check store stock, and match club reading constraints.
                </p>
              </div>
              <button onClick={() => setAgentModalOpen(false)} className="text-ink-500 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt input */}
            <form onSubmit={handleRunAgent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Agent Guidance Prompt:
                </label>
                <input
                  type="text"
                  required
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                  placeholder="e.g. Find a cozy mystery under 350 pages with strong local bookstore stock for next month"
                  className="w-full text-xs py-2.5 px-3.5 rounded-xl border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={agentRunning || !agentQuery.trim()}
                className="w-full py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {agentRunning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-ivory border-t-transparent rounded-full animate-spin" />
                    <span>Executing Bounded 3-Tool Workflow...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Agent Evaluation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {agentError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs">
                {agentError}
              </div>
            )}

            {/* Agent Results Display */}
            {agentProposal && (
              <div className="space-y-6 pt-4 border-t border-ivory-200">
                {/* Tool Execution Steps */}
                <div className="p-4 bg-ivory rounded-xl border border-ivory-300 space-y-2 text-xs">
                  <span className="font-semibold block text-forest uppercase tracking-wider text-[10px]">
                    Tool Execution Trace (Bounded Pipeline):
                  </span>
                  <div className="space-y-1 font-mono text-[11px] text-ink-700">
                    {agentProposal.steps?.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between">
                        <span>{sIdx + 1}. {step.toolName}</span>
                        <span className="text-emerald-700 font-semibold">{step.status} ({step.durationMs}ms)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Synthesis Summary */}
                <div className="text-xs text-ink-800 leading-relaxed bg-paper p-4 rounded-xl border border-ivory-300">
                  <span className="font-semibold text-ink-900 block mb-1">Agent Recommendation Summary:</span>
                  <p>{agentProposal.proposal?.summary}</p>
                </div>

                {/* Ranked Candidates */}
                <div className="space-y-3">
                  <span className="font-semibold text-xs text-ink-900 uppercase tracking-wider block">
                    Ranked Candidates (Confirmation Required):
                  </span>

                  {agentProposal.proposal?.rankedCandidates?.map((cand, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-4 rounded-xl bg-ivory border border-ivory-300 space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-forest text-ivory text-[10px] font-bold flex items-center justify-center">
                              {cIdx + 1}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-ink-950">{cand.title}</h4>
                          </div>
                          <p className="text-[11px] text-ink-600 pl-7">by {cand.author}</p>
                        </div>

                        <span className="text-xs font-mono font-semibold text-forest-dark bg-forest/10 px-2 py-0.5 rounded">
                          {cand.availableStock} copies on shelves
                        </span>
                      </div>

                      <p className="text-xs text-ink-700 pl-7">{cand.clubFitNotes}</p>

                      <div className="pl-7 pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-ink-500">
                          Length: {cand.readingLength} pages • {cand.readingTimeSuitability}
                        </span>

                        <button
                          onClick={() => handleConfirmCandidate(cand.bookId)}
                          disabled={confirmingBookId === cand.bookId}
                          className="px-3.5 py-1.5 rounded-lg bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors shadow-sm"
                        >
                          {confirmingBookId === cand.bookId ? "Confirming..." : "Confirm for Club"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {meetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-ink-900">Schedule Meeting</h3>
              <button onClick={() => setMeetingModalOpen(false)} className="text-ink-500 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Chapters 1–6 Discussion & Theories"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Meeting Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Reading Target
                </label>
                <input
                  type="text"
                  required
                  value={meetingTarget}
                  onChange={(e) => setMeetingTarget(e.target.value)}
                  placeholder="e.g. Chapters 1–5 (Pages 1–120)"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-ivory-300 text-xs font-medium text-ink-700 hover:bg-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors"
                >
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
