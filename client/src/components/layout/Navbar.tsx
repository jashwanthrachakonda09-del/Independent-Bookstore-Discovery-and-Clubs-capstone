import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen,
  Users,
  Compass,
  Bookmark,
  Store,
  ShieldCheck,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Sparkles,
  Menu,
  X,
  Clock,
  Sliders,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-md border-b border-ivory-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-forest text-ivory flex items-center justify-center shadow-md group-hover:bg-forest-light transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-forest-dark block">
                  The Independent Shelf
                </span>
                <span className="text-xs text-ink-600 block -mt-1 font-sans">
                  Bookstore Discovery & Clubs
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              <Link
                to="/discover"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive("/discover")
                    ? "text-forest font-semibold bg-ivory-200"
                    : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Discover</span>
              </Link>

              <Link
                to="/clubs"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive("/clubs")
                    ? "text-forest font-semibold bg-ivory-200"
                    : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Reading Clubs</span>
              </Link>

              {user && (
                <>
                  <Link
                    to="/reading-lists"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      isActive("/reading-lists")
                        ? "text-forest font-semibold bg-ivory-200"
                        : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>My Lists</span>
                  </Link>

                  <Link
                    to="/reservations"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      isActive("/reservations")
                        ? "text-forest font-semibold bg-ivory-200"
                        : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Reservations</span>
                  </Link>

                  <Link
                    to="/progress"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      isActive("/progress")
                        ? "text-forest font-semibold bg-ivory-200"
                        : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Spoilers & Progress</span>
                  </Link>

                  <Link
                    to="/chat"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      isActive("/chat")
                        ? "text-forest font-semibold bg-ivory-200"
                        : "text-ink-700 hover:text-forest hover:bg-ivory-100"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Book Assistant</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {/* Demo Quick-Switcher */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-forest/10 text-forest border border-forest/20 hover:bg-forest/20 flex items-center space-x-1 transition-colors"
                title="Switch demo account roles"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Accounts</span>
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-xl border border-ivory-300 py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 font-semibold text-ink-500 uppercase tracking-wider text-[10px] border-b border-ivory-200">
                    Switch Active Demo Role
                  </div>
                  <button
                    onClick={() => {
                      demoLogin("reader");
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-ivory-100 flex items-center space-x-2 text-ink-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Clara Reader (Verified)</span>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin("unverified");
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-ivory-100 flex items-center space-x-2 text-ink-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Noah Reader (Unverified)</span>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin("bookseller");
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-ivory-100 flex items-center space-x-2 text-ink-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Evelyn Bookseller (Beacon Hill)</span>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin("moderator");
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-ivory-100 flex items-center space-x-2 text-ink-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>Julian Moderator (Coastal Club)</span>
                  </button>
                  <button
                    onClick={() => {
                      demoLogin("admin");
                      setDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-ivory-100 flex items-center space-x-2 text-ink-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Sarah Admin (System Admin)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Portal Shortcuts for Privileged Roles */}
            {user && (
              <>
                <Link
                  to="/bookseller"
                  className="px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:text-forest flex items-center space-x-1"
                  title="Bookseller Store Inventory Portal"
                >
                  <Store className="w-3.5 h-3.5 text-forest" />
                  <span>Bookseller</span>
                </Link>

                <Link
                  to="/admin"
                  className="px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:text-forest flex items-center space-x-1"
                  title="Store Admin & Audit Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-burgundy" />
                  <span>Admin</span>
                </Link>
              </>
            )}

            {/* User Profile or Login */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-ivory-300">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1.5 text-sm font-medium text-ink-800 hover:text-forest"
                >
                  <div className="w-7 h-7 rounded-full bg-forest/10 text-forest flex items-center justify-center font-serif text-xs font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="p-1.5 text-ink-500 hover:text-rose-600 rounded-md hover:bg-ivory-200 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-ink-700 hover:text-forest"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-medium text-ivory bg-forest rounded-md shadow-sm hover:bg-forest-light transition-colors"
                >
                  Join Us
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-ink-600 hover:text-forest hover:bg-ivory-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-ivory-300 bg-ivory px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/discover"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
          >
            Discover Books
          </Link>
          <Link
            to="/clubs"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
          >
            Reading Clubs
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                My Dashboard
              </Link>
              <Link
                to="/reading-lists"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Reading Lists
              </Link>
              <Link
                to="/reservations"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Reservations
              </Link>
              <Link
                to="/progress"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Spoilers & Progress
              </Link>
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Book Assistant
              </Link>
              <Link
                to="/bookseller"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Bookseller Portal
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-ink-800 hover:bg-ivory-200"
              >
                Admin & Audits
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-ink-700 bg-ivory-200 rounded-md"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-ivory bg-forest rounded-md"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
