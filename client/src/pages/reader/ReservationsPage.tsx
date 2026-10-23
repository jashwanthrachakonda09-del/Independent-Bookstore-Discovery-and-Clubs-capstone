import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Reservation } from "../../types";
import {
  Clock,
  Store,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export const ReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const res = await api.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      console.error("Error loading reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleCancel = async () => {
    if (!cancelModalId) return;
    setCancelling(true);
    try {
      await api.cancelReservation(cancelModalId, cancelReason || "Cancelled by reader");
      setCancelModalId(null);
      setCancelReason("");
      loadReservations();
    } catch (err: any) {
      alert(err.message || "Failed to cancel reservation.");
    } finally {
      setCancelling(false);
    }
  };

  const activeReservations = reservations.filter(
    (r) => r.status === "pending" || r.status === "confirmed"
  );
  const pastReservations = reservations.filter(
    (r) => r.status === "collected" || r.status === "cancelled" || r.status === "expired"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink-950">
          Local Bookstore Reservations
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Review held books awaiting pickup at your neighborhood independent bookstores. No payment required until pickup.
        </p>
      </div>

      {/* Active Holds */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-forest" />
          <span>Active Pickup Holds ({activeReservations.length})</span>
        </h2>

        {loading ? (
          <div className="bg-paper p-8 rounded-2xl border border-ivory-300 animate-pulse h-40" />
        ) : activeReservations.length === 0 ? (
          <div className="bg-paper p-8 rounded-2xl border border-ivory-300 text-center space-y-2">
            <p className="text-xs text-ink-600">You currently have no active holds awaiting pickup.</p>
            <Link
              to="/discover"
              className="inline-block text-xs font-semibold text-forest hover:text-forest-dark"
            >
              Discover books on local shelves →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeReservations.map((res) => {
              const book = res.bookId;
              const store = res.storeId;
              const expiresDate = new Date(res.expiresAt);
              const isImminent = expiresDate.getTime() - Date.now() < 12 * 3600 * 1000;

              return (
                <div
                  key={res._id}
                  className="bg-paper p-6 rounded-2xl border border-ivory-300 shadow-card space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {res.status === "confirmed" ? "Ready for Pickup" : "Hold Active"}
                      </span>
                      <span
                        className={`text-xs font-mono font-medium ${
                          isImminent ? "text-burgundy font-bold" : "text-ink-600"
                        }`}
                      >
                        Expires: {expiresDate.toLocaleDateString()} {expiresDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-lg font-bold text-ink-950">
                        {book?.title || "Book Title"}
                      </h3>
                      <p className="text-xs text-ink-600">by {book?.authors?.join(", ")}</p>
                    </div>

                    <div className="p-3 bg-ivory rounded-xl border border-ivory-200 text-xs space-y-1.5 text-ink-700">
                      <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                        <Store className="w-3.5 h-3.5 text-terracotta" />
                        <span>{store?.name || "Independent Bookstore"}</span>
                      </div>
                      <p className="text-[11px] text-ink-500 pl-5">
                        {store?.address ? `${store.address.street}, ${store.address.city}` : "Local store pickup"}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-ivory-300 text-[11px]">
                        <span>Quantity: <strong>{res.quantity}</strong> ({res.format})</span>
                        <span className="text-forest-dark font-medium">{store?.pickupHours || "Store hours apply"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-ivory-200 flex items-center justify-between">
                    <Link
                      to={`/books/${book?._id}`}
                      className="text-xs text-forest hover:text-forest-dark font-medium"
                    >
                      Book Details
                    </Link>

                    <button
                      onClick={() => setCancelModalId(res._id)}
                      className="text-xs text-burgundy hover:text-burgundy-dark font-medium"
                    >
                      Cancel Hold
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Holds Archive */}
      {pastReservations.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-ivory-300">
          <h2 className="font-serif text-lg font-bold text-ink-700">
            Past Reservations Archive
          </h2>

          <div className="bg-paper rounded-2xl border border-ivory-300 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory text-ink-700 uppercase tracking-wider font-semibold border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4">Book</th>
                  <th className="py-3 px-4">Store</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {pastReservations.map((res) => (
                  <tr key={res._id} className="hover:bg-ivory/50">
                    <td className="py-3 px-4 font-medium text-ink-900">{res.bookId?.title}</td>
                    <td className="py-3 px-4 text-ink-600">{res.storeId?.name}</td>
                    <td className="py-3 px-4 text-ink-500 font-mono">
                      {new Date(res.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium text-[10px] uppercase ${
                          res.status === "collected"
                            ? "bg-emerald-100 text-emerald-800"
                            : res.status === "cancelled"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-base font-bold text-ink-900">
              Release Reserved Copy?
            </h3>
            <p className="text-xs text-ink-600">
              This will immediately return the copy to local bookstore shelf stock for other readers.
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Reason for cancellation (optional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Purchased elsewhere, scheduling conflict"
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelModalId(null)}
                className="flex-1 py-2 rounded-lg border border-ivory-300 text-xs font-medium text-ink-700 hover:bg-ivory"
              >
                Keep Hold
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2 rounded-lg bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-medium transition-colors disabled:opacity-50"
              >
                {cancelling ? "Releasing..." : "Confirm Release"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
