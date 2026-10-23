import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireAdmin?: boolean;
  requireVerified?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireVerified = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-serif text-ink-600">Checking literary credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user.isSystemAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-paper rounded-xl border border-ivory-300 text-center shadow-card">
        <h2 className="font-serif text-2xl font-bold text-burgundy mb-2">Restricted Area</h2>
        <p className="text-ink-600 mb-6">
          Access to this management interface requires system administrator privileges.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  if (requireVerified && !user.emailVerified) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-gold-light/20 rounded-xl border border-gold/40 text-center shadow-card">
        <h2 className="font-serif text-2xl font-bold text-ink-900 mb-2">Email Verification Required</h2>
        <p className="text-ink-600 mb-4">
          Please verify your email address to access full reservation and club privileges.
        </p>
        <p className="text-xs text-ink-500">
          Tip: You can use the Quick Persona switcher to switch to the verified Reader demo account.
        </p>
      </div>
    );
  }

  return children;
};
