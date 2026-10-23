import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, KeyRound, Mail, User, ArrowRight, CheckCircle2 } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await register({ name, email, password });
      setSuccessData(data);
      // Automatically attempt login
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your information.");
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
          <h1 className="font-serif text-2xl font-bold text-ink-900">Join The Community</h1>
          <p className="text-sm text-ink-600 mt-1">
            Discover books by themes, reserve copies at local indie bookstores, and participate in clubs.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-burgundy/10 border border-burgundy/30 text-burgundy text-sm">
            {error}
          </div>
        )}

        {successData ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 bg-forest/10 text-forest rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-ink-900">Account Created!</h2>
              <p className="text-sm text-ink-600 mt-1">
                Welcome to The Independent Shelf, <span className="font-medium text-ink-900">{name}</span>.
              </p>
            </div>

            <div className="p-4 bg-ivory rounded-lg border border-ivory-300 text-left text-xs space-y-2">
              <p className="font-semibold text-ink-800">Local Verification Token:</p>
              <p className="font-mono bg-ivory-200 p-2 rounded break-all text-forest-dark">
                {successData.verificationToken || "token-generated-internally"}
              </p>
              <p className="text-ink-500">
                In this demo environment, your session is already active. You can verify your email anytime in account settings.
              </p>
            </div>

            <button
              onClick={() => navigate("/discover")}
              className="w-full py-2.5 px-4 rounded-lg bg-forest hover:bg-forest-light text-ivory font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Start Discovering Books</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Eleanor Vance"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:border-forest focus:ring-1 focus:ring-forest text-sm text-ink-900 transition-all outline-none"
                />
              </div>
            </div>

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
                  placeholder="reader@example.com"
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ivory-300 bg-ivory focus:bg-paper focus:border-forest focus:ring-1 focus:ring-forest text-sm text-ink-900 transition-all outline-none"
                />
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                Must include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-forest hover:bg-forest-light text-ivory font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-ivory border-t-transparent" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <p className="text-center text-xs text-ink-600 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-forest hover:text-forest-dark underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
