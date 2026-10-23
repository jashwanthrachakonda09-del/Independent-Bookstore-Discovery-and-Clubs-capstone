import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ShieldCheck, Heart, Sparkles, MapPin, Compass, Users } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink-950 text-ivory-200 border-t border-ivory-900/40 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-forest text-ivory flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-serif text-lg font-bold text-ivory">The Independent Shelf</span>
            </div>
            <p className="text-sm text-ivory-400 leading-relaxed">
              Empowering readers to discover books by forgotten themes, moods, and plots, while championing neighborhood independent bookstores.
            </p>
            <div className="flex items-center space-x-2 text-xs text-forest-light bg-forest-dark/40 px-3 py-1.5 rounded-full border border-forest/30 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-light" />
              <span>Spoiler-Shielded & Anti-Hallucination Grounded</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="font-serif font-semibold text-ivory text-sm tracking-wide uppercase mb-4">
              Explore
            </h3>
            <ul className="space-y-2 text-sm text-ivory-400">
              <li>
                <Link to="/discover" className="hover:text-gold transition-colors flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Thematic Discovery</span>
                </Link>
              </li>
              <li>
                <Link to="/clubs" className="hover:text-gold transition-colors flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Reading Clubs</span>
                </Link>
              </li>
              <li>
                <Link to="/reading-lists" className="hover:text-gold transition-colors">
                  Curated Reading Lists
                </Link>
              </li>
              <li>
                <Link to="/reservations" className="hover:text-gold transition-colors">
                  Local Store Pickups
                </Link>
              </li>
            </ul>
          </div>

          {/* Featured Independent Bookstores */}
          <div>
            <h3 className="font-serif font-semibold text-ivory text-sm tracking-wide uppercase mb-4">
              Partner Bookstores
            </h3>
            <ul className="space-y-2 text-sm text-ivory-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                <span>Beacon Hill Books & Cafe</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                <span>Porter Square Books</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                <span>Harvard Book Store</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                <span>Brookline Booksmith</span>
              </li>
            </ul>
          </div>

          {/* Technology & Principles */}
          <div>
            <h3 className="font-serif font-semibold text-ivory text-sm tracking-wide uppercase mb-4">
              AI & Architecture
            </h3>
            <p className="text-xs text-ivory-400 leading-relaxed mb-3">
              Powered by local Ollama embedding and inference pipelines. All search queries and RAG discussions strictly ground against catalog records without third-party data tracking.
            </p>
            <div className="bg-ivory-900/50 p-3 rounded-lg border border-ivory-800/60 text-xs text-ivory-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold shrink-0" />
              <span>Deterministic local AI & concurrency-locked inventory</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-ivory-900/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ivory-400 gap-4">
          <p>© {new Date().getFullYear()} The Independent Shelf. All rights reserved.</p>
          <div className="flex items-center space-x-1">
            <span>Built with passion for literature & local indie booksellers</span>
            <Heart className="w-3.5 h-3.5 text-burgundy-light fill-current inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
