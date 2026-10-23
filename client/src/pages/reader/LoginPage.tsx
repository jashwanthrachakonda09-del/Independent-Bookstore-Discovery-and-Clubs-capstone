import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, KeyRound, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: "reader" | "unverified" | "bookseller" | "moderator" | "admin") => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin(role);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-0">
      <div className="bg-paper p-8 rounded-2xl border border-ivory-300 shadow-card">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-forest text-ivory flex items-center justify-center mx-auto mb-3 shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">Welcome Back</h1>
          <p className="text-sm text-ink-600 mt-1">
            Sign in to access your reading lists, club meetings, and local reservations.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-burgundy/10 border border-burgundy/30 text-burgundy text-sm flex items-start gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@indiebooks.demo"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:border-forest focus:ring-1 focus:ring-forest text-sm text-ink-900 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-ink-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:border-forest focus:ring-1 focus:ring-forest text-sm text-ink-900 transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-forest hover:bg-forest-light text-ivory font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-ivory border-t-transparent" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Personas */}
        <div className="mt-8 pt-6 border-t border-ivory-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              One-Click Evaluator Personas
            </span>
            <span className="text-[10px] text-ink-500 bg-ivory-200 px-2 py-0.5 rounded">Pre-seeded</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleDemo("reader")}
              disabled={loading}
              className="px-3 py-2 text-xs rounded-lg border border-forest/30 bg-forest/5 hover:bg-forest/10 text-forest-dark flex items-center justify-between transition-colors"
            >
              <div>
                <span className="font-semibold block">1. Verified Reader</span>
                <span className="text-[10px] text-ink-600">reader@indiebooks.demo</span>
              </div>
              <span className="text-[10px] bg-forest/20 text-forest px-2 py-0.5 rounded font-mono">Reader</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemo("bookseller")}
              disabled={loading}
              className="px-3 py-2 text-xs rounded-lg border border-terracotta/30 bg-terracotta/5 hover:bg-terracotta/10 text-terracotta-dark flex items-center justify-between transition-colors"
            >
              <div>
                <span className="font-semibold block">2. Beacon Hill Bookseller</span>
                <span className="text-[10px] text-ink-600">bookseller@beaconhill.demo</span>
              </div>
              <span className="text-[10px] bg-terracotta/20 text-terracotta px-2 py-0.5 rounded font-mono">Store Staff</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemo("moderator")}
              disabled={loading}
              className="px-3 py-2 text-xs rounded-lg border border-burgundy/30 bg-burgundy/5 hover:bg-burgundy/10 text-burgundy-dark flex items-center justify-between transition-colors"
            >
              <div>
                <span className="font-semibold block">3. Club Moderator</span>
                <span className="text-[10px] text-ink-600">moderator@bookclub.demo</span>
              </div>
              <span className="text-[10px] bg-burgundy/20 text-burgundy px-2 py-0.5 rounded font-mono">Agent & Clubs</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemo("admin")}
              disabled={loading}
              className="px-3 py-2 text-xs rounded-lg border border-ink-400/30 bg-ink-100 hover:bg-ink-200 text-ink-900 flex items-center justify-between transition-colors"
            >
              <div>
                <span className="font-semibold block">4. System Administrator</span>
                <span className="text-[10px] text-ink-600">admin@indiebooks.demo</span>
              </div>
              <span className="text-[10px] bg-ink-300 text-ink-900 px-2 py-0.5 rounded font-mono">Admin</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-ink-600 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-forest hover:text-forest-dark underline">
            Register as a Reader
          </Link>
        </p>
      </div>
    </div>
  );
};
