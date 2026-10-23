import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Bookstore, Reservation } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  Store,
  Package,
  Clock,
  CheckCircle,
  FileText,
  Upload,
  Edit,
  Save,
  AlertCircle,
  Search,
  X,
} from "lucide-react";

export const BooksellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [store, setStore] = useState<Bookstore | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"inventory" | "reservations" | "policy" | "documents">("inventory");

  // Stock Adjustment State
  const [adjustModalItem, setAdjustModalItem] = useState<any | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [stockReason, setStockReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Policy Form State
  const [policyText, setPolicyText] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);

  // Document Upload State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAuthor, setUploadAuthor] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [storeRes, invRes, resRes, docRes] = await Promise.all([
        api.getBooksellerStore().catch(() => ({ data: null })),
        api.getBooksellerInventory().catch(() => ({ data: [] })),
        api.getBooksellerReservations().catch(() => ({ data: [] })),
        api.getDocuments().catch(() => ({ data: [] })),
      ]);

      if (storeRes.data) {
        setStore(storeRes.data);
        setPolicyText(storeRes.data.storePolicy || "");
        setPickupHours(storeRes.data.pickupHours || "");
      }
      setInventory(invRes.data || []);
      setReservations(resRes.data || []);
      setDocuments(docRes.data || []);
    } catch (err) {
      console.error("Bookseller dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOpenAdjust = (item: any) => {
    setAdjustModalItem(item);
    setNewStockQty(item.quantityOnHand);
    setStockReason("");
  };

  const handleSaveStock = async () => {
    if (!adjustModalItem) return;
    setAdjusting(true);
    try {
      await api.updateStock(adjustModalItem.bookId._id, {
        quantityOnHand: Number(newStockQty),
        reason: stockReason || "Staff shelf count adjustment",
      });
      setAdjustModalItem(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to update stock quantity.");
    } finally {
      setAdjusting(false);
    }
  };

  const handleMarkCollected = async (resId: string) => {
    if (!confirm("Confirm customer has picked up and collected this copy?")) return;
    try {
      await api.collectReservation(resId);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to mark collection.");
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await api.updateStorePolicy({
        storePolicy: policyText,
        pickupHours,
      });
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to update store policy.");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("author", uploadAuthor || store?.name || "Bookseller");
      formData.append("documentType", "inventory_notes");

      await api.uploadDocument(formData);
      setUploadTitle("");
      setUploadAuthor("");
      setUploadFile(null);
      alert("Document uploaded and enqueued for RAG chunking & vectorization!");
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto my-12 p-8 bg-paper rounded-2xl border border-ivory-300 animate-pulse space-y-4">
        <div className="h-8 bg-ivory-300 rounded w-1/3" />
        <div className="h-32 bg-ivory-100 rounded w-full mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Store Header Banner */}
      <div className="bg-paper p-8 rounded-3xl border border-ivory-300 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-terracotta bg-terracotta/10 px-2.5 py-0.5 rounded-full">
              Bookseller Staff Portal
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-950">
            {store?.name || "Independent Bookstore Operations"}
          </h1>
          <p className="text-xs text-ink-600">
            {store?.address
              ? `${store.address.street}, ${store.address.city}, ${store.address.state}`
              : "Local Bookstore Shelf Management"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="font-bold text-ink-900 block">{inventory.length} Titles Listed</span>
            <span className="text-forest font-medium">{reservations.filter(r => r.status === "confirmed" || r.status === "pending").length} Active Holds</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-ivory-300 pb-2">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "inventory"
              ? "bg-forest text-ivory shadow-sm"
              : "text-ink-700 hover:bg-ivory"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Shelf Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab("reservations")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "reservations"
              ? "bg-forest text-ivory shadow-sm"
              : "text-ink-700 hover:bg-ivory"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Customer Holds ({reservations.filter(r => r.status === "pending" || r.status === "confirmed").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("policy")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "policy"
              ? "bg-forest text-ivory shadow-sm"
              : "text-ink-700 hover:bg-ivory"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Hours & Policy</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "documents"
              ? "bg-forest text-ivory shadow-sm"
              : "text-ink-700 hover:bg-ivory"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>RAG Document Ingestion</span>
        </button>
      </div>

      {/* TAB 1: Shelf Inventory */}
      {activeTab === "inventory" && (
        <div className="bg-paper rounded-3xl border border-ivory-300 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-ink-900">
              Live Shelf Stock
            </h2>
            <span className="text-xs text-ink-500">
              Updates perform atomic concurrency checks and log audit history.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory text-ink-700 uppercase tracking-wider font-semibold border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4">Title & Author</th>
                  <th className="py-3 px-4">Format / Condition</th>
                  <th className="py-3 px-4 text-center">On Hand</th>
                  <th className="py-3 px-4 text-center">Reserved</th>
                  <th className="py-3 px-4 text-center">Available</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-ivory/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink-950">{item.bookId?.title}</div>
                      <div className="text-[11px] text-ink-500">{item.bookId?.authors?.join(", ")}</div>
                    </td>
                    <td className="py-3 px-4 text-ink-700">
                      <span>{item.format}</span>
                      <span className="block text-[11px] text-ink-500">{item.condition}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-ink-800">
                      {item.quantityOnHand}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-burgundy">
                      {item.quantityReserved}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-forest-dark">
                      <span className="bg-forest/10 px-2 py-0.5 rounded">
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="px-3 py-1 rounded bg-forest/10 hover:bg-forest text-forest hover:text-ivory text-xs font-medium transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Customer Reservations */}
      {activeTab === "reservations" && (
        <div className="bg-paper rounded-3xl border border-ivory-300 shadow-card p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink-900">
            Customer Holds & Curbside Pickups
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory text-ink-700 uppercase tracking-wider font-semibold border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Reserved Book</th>
                  <th className="py-3 px-4">Qty / Format</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {reservations.map((r) => {
                  const isPending = r.status === "pending" || r.status === "confirmed";
                  return (
                    <tr key={r._id} className="hover:bg-ivory/50">
                      <td className="py-3 px-4 font-medium text-ink-900">
                        {typeof r.readerId === "object" ? r.readerId.name : "Customer"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-950">{r.bookId?.title}</td>
                      <td className="py-3 px-4 text-ink-700 font-mono">
                        {r.quantity} × {r.format} ({r.condition})
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-500">
                        {new Date(r.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === "collected"
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending && (
                          <button
                            onClick={() => handleMarkCollected(r._id)}
                            className="px-3 py-1 rounded bg-forest text-ivory text-xs font-medium hover:bg-forest-light transition-colors"
                          >
                            Mark Collected
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Store Hours & Policy */}
      {activeTab === "policy" && (
        <form onSubmit={handleSavePolicy} className="bg-paper rounded-3xl border border-ivory-300 shadow-card p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-ivory-200 pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink-900">
                Store Policy & Pickup Schedule
              </h2>
              <p className="text-xs text-ink-600 mt-0.5">
                Published to readers when confirming reservations.
              </p>
            </div>

            {policySaved && (
              <span className="text-xs font-medium text-forest-dark bg-forest/10 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Policy Saved</span>
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Pickup Hours
              </label>
              <input
                type="text"
                value={pickupHours}
                onChange={(e) => setPickupHours(e.target.value)}
                placeholder="e.g. Tue–Sun: 9:00 AM – 7:00 PM (Closed Mondays)"
                className="w-full text-xs py-2.5 px-3.5 rounded-xl border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Hold & Curbside Policy
              </label>
              <textarea
                rows={4}
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                placeholder="Reservations are held behind the register for 48 hours..."
                className="w-full text-xs p-3.5 rounded-xl border border-ivory-300 bg-ivory focus:bg-paper focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPolicy}
            className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingPolicy ? "Saving..." : "Save Store Policy"}</span>
          </button>
        </form>
      )}

      {/* TAB 4: Document Ingestion */}
      {activeTab === "documents" && (
        <div className="bg-paper rounded-3xl border border-ivory-300 shadow-card p-8 space-y-6">
          <div className="border-b border-ivory-200 pb-4">
            <h2 className="font-serif text-xl font-bold text-ink-900">
              Catalog & Shelf Note Document Ingestion
            </h2>
            <p className="text-xs text-ink-600 mt-0.5">
              Upload shelf guides, author interview transcripts, or curated catalog lists. Files are automatically split into 500-token chunks with chapter headers and vectorized for grounded RAG searches.
            </p>
          </div>

          <form onSubmit={handleUploadDocument} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Beacon Hill Staff Recommendations 2026"
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Author / Curator
              </label>
              <input
                type="text"
                value={uploadAuthor}
                onChange={(e) => setUploadAuthor(e.target.value)}
                placeholder="e.g. Head Curator Eleanor"
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                File (.txt, .md)
              </label>
              <input
                type="file"
                accept=".txt,.md"
                required
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-forest file:text-ivory"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-ivory text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? "Ingesting & Chunking..." : "Upload Document"}</span>
            </button>
          </form>

          {/* Existing Ingested Documents */}
          <div className="pt-6 border-t border-ivory-200">
            <h3 className="font-serif text-sm font-bold text-ink-900 mb-3">
              Ingested Knowledge Assets ({documents.length})
            </h3>
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d._id} className="p-3 bg-ivory rounded-xl border border-ivory-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink-900">{d.title}</span>
                    <span className="text-[11px] text-ink-500 block">by {d.author} • {d.totalChunks || 1} vectorized chunks</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl border border-ivory-300 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-2">
              <h3 className="font-serif text-base font-bold text-ink-900">
                Adjust Shelf Stock
              </h3>
              <button onClick={() => setAdjustModalItem(null)} className="text-ink-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold block text-ink-900">{adjustModalItem.bookId?.title}</span>
                <span className="text-ink-500">{adjustModalItem.format} ({adjustModalItem.condition})</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Total On-Hand Quantity:
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(Number(e.target.value))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
                <span className="text-[11px] text-ink-500 block mt-1">
                  Currently {adjustModalItem.quantityReserved} copies held in active reservations.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Reason for Adjustment (Audit Log):
                </label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="e.g. Received new shipment box, physical recount"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-ivory-300 bg-ivory focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="flex-1 py-2 rounded-lg border border-ivory-300 text-xs font-medium text-ink-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={adjusting}
                  className="flex-1 py-2 rounded-lg bg-forest text-ivory text-xs font-medium hover:bg-forest-light transition-colors disabled:opacity-50"
                >
                  {adjusting ? "Saving..." : "Update Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
