import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Public Pages
import { HomePage } from "./pages/public/HomePage";
import { DiscoverPage } from "./pages/public/DiscoverPage";
import { BookDetailPage } from "./pages/public/BookDetailPage";
import { ClubDirectoryPage } from "./pages/public/ClubDirectoryPage";
import { ClubDetailPage } from "./pages/public/ClubDetailPage";

// Auth & Reader Pages
import { LoginPage } from "./pages/reader/LoginPage";
import { RegisterPage } from "./pages/reader/RegisterPage";
import { ReadingListsPage } from "./pages/reader/ReadingListsPage";
import { ReservationsPage } from "./pages/reader/ReservationsPage";
import { ReadingProgressPage } from "./pages/reader/ReadingProgressPage";
import { BookChatPage } from "./pages/reader/BookChatPage";

// Staff & Admin Pages
import { BooksellerDashboard } from "./pages/bookseller/BooksellerDashboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-gold-light/40">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/clubs" element={<ClubDirectoryPage />} />
              <Route path="/clubs/:id" element={<ClubDetailPage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Reader Protected Routes */}
              <Route
                path="/reading-lists"
                element={
                  <ProtectedRoute>
                    <ReadingListsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute>
                    <ReservationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ReadingProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <BookChatPage />
                  </ProtectedRoute>
                }
              />

              {/* Bookseller Dashboard */}
              <Route
                path="/bookseller"
                element={
                  <ProtectedRoute>
                    <BooksellerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* System Admin Dashboard */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="max-w-md mx-auto my-20 p-8 bg-paper rounded-2xl border border-ivory-300 text-center shadow-card space-y-4">
                    <h2 className="font-serif text-3xl font-bold text-burgundy">404</h2>
                    <h3 className="font-serif text-lg font-bold text-ink-900">
                      Page Not Found on This Shelf
                    </h3>
                    <p className="text-xs text-ink-600">
                      The chapter or catalog page you were searching for does not exist in our library.
                    </p>
                    <Link
                      to="/"
                      className="inline-block px-4 py-2 rounded-xl bg-forest text-ivory text-xs font-medium"
                    >
                      Return to The Independent Shelf
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}
