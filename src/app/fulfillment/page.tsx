"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RequestLine = {
  sku: string;
  item_name: string;
  unit_type: string;
  requested_qty: string;
  unit_price: string | null;
};

type StockRequest = {
  id: number;
  submitted_at: string;
  submitted_by: string;
  fulfilled_by: string | null;
  recorded_by: string | null;
  cafe_name: string;
  status: string;
  item_count: string;
  notes: string | null;
  fulfillment_notes: string | null;
  lines: RequestLine[];
};

type FulfillIssue = {
  sku: string;
  item_name: string;
  requested_qty: number;
  on_hand_qty: number;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-800 border-amber-200",
    fulfilled: "bg-green-100 text-green-800 border-green-200",
    partially_fulfilled: "bg-orange-100 text-orange-700 border-orange-200",
    cancelled: "bg-stone-100 text-stone-500 border-stone-200",
    recorded: "bg-stone-100 text-stone-500 border-stone-200",
  };
  const labels: Record<string, string> = {
    submitted: "Pending",
    fulfilled: "Fulfilled",
    partially_fulfilled: "Partially Fulfilled",
    cancelled: "Cancelled",
    recorded: "Recorded",
  };
  const cls = styles[status] ?? "bg-stone-100 text-stone-500 border-stone-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FulfillmentPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [recordingId, setRecordingId] = useState<number | null>(null);

  const handleRecord = async (id: number) => {
    setRecordingId(id);
    try {
      const res = await fetch(`/api/fulfillment/${id}/record`, { method: "POST" });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "recorded" } : r));
      } else {
        setError("Unable to mark as recorded right now.");
      }
    } catch {
      setError("Unable to mark as recorded right now.");
    } finally {
      setRecordingId(null);
    }
  };

  // Fulfill mode state
  const [fulfillModeId, setFulfillModeId] = useState<number | null>(null);
  const [fulfillQtys, setFulfillQtys] = useState<Record<string, string>>({});
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [fulfillIssues, setFulfillIssues] = useState<FulfillIssue[]>([]);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/"); return; }
      const sessionData = (await sessionRes.json()) as { email?: string };
      setSessionEmail(sessionData.email ?? "");

      const res = await fetch("/api/fulfillment", { cache: "no-store" });
      if (!res.ok) { setError("Unable to load requests right now."); setLoading(false); return; }
      const data = (await res.json()) as { requests: StockRequest[] };
      setRequests(data.requests);
      setLoading(false);
    }
    init();
  }, [router]);

  const openFulfillMode = (req: StockRequest) => {
    const qtys: Record<string, string> = {};
    req.lines.forEach((l) => { qtys[l.sku] = String(parseFloat(l.requested_qty)); });
    setFulfillQtys(qtys);
    setFulfillNotes("");
    setFulfillIssues([]);
    setFulfillModeId(req.id);
    setExpandedId(req.id);
  };

  const closeFulfillMode = () => {
    setFulfillModeId(null);
    setFulfillQtys({});
    setFulfillNotes("");
    setFulfillIssues([]);
  };

  const handleConfirmFulfill = async (req: StockRequest) => {
    setFulfilling(true);
    setFulfillIssues([]);
    try {
      const lines = req.lines.map((l) => ({
        sku: l.sku,
        qty: parseFloat(fulfillQtys[l.sku] ?? "0") || 0,
      })).filter((l) => l.qty > 0);

      const res = await fetch(`/api/fulfillment/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, fulfillment_notes: fulfillNotes.trim() || null }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        status?: string;
        issues?: FulfillIssue[];
        error?: string;
      };

      if (res.status === 409 && data.issues) {
        setFulfillIssues(data.issues);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Unable to fulfill request right now.");
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, status: data.status ?? "fulfilled", fulfillment_notes: fulfillNotes.trim() || null }
            : r,
        ),
      );
      closeFulfillMode();
    } catch {
      setError("Unable to fulfill request right now.");
    } finally {
      setFulfilling(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/fulfillment/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setConfirmDeleteId(null);
        if (expandedId === id) setExpandedId(null);
        if (fulfillModeId === id) closeFulfillMode();
      } else {
        setError("Unable to delete request right now.");
      }
    } catch {
      setError("Unable to delete request right now.");
    } finally {
      setDeletingId(null);
    }
  };

  const displayed = showAll
    ? requests
    : requests.filter((r) => r.status === "submitted");

  const pendingCount = requests.filter((r) => r.status === "submitted").length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8]">
        <p className="text-sm text-stone-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Image src="/wmu-logo.png" alt="WMU logo" width={160} height={46} className="h-auto w-[160px]" priority />
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Commissary</p>
              <h1 className="text-lg font-semibold text-[#2f200f]">Fulfillment Queue</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950">
              Dashboard
            </a>
            <p className="text-sm text-stone-500">{sessionEmail}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-700">
            {showAll ? `All requests (${requests.length})` : `Pending (${pendingCount})`}
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-stone-400 hover:text-stone-900"
          >
            {showAll ? "Show Pending Only" : "Show All Requests"}
          </button>
        </div>

        {!!error && <p className="mb-4 text-sm font-medium text-red-700">{error}</p>}

        {displayed.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-6 py-12 text-center">
            <p className="text-stone-400 text-sm">{showAll ? "No requests yet." : "No pending requests."}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((req) => {
              const inFulfillMode = fulfillModeId === req.id;
              const requestTotal = req.lines.reduce((sum, l) => {
                const price = l.unit_price ? parseFloat(l.unit_price) : null;
                return price != null ? sum + price * parseFloat(l.requested_qty) : sum;
              }, 0);
              const hasPrices = req.lines.some((l) => l.unit_price != null);
              return (
                <div key={req.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">

                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <StatusBadge status={req.status} />
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{req.cafe_name}</p>
                        <p className="text-xs text-stone-500">{formatDate(req.submitted_at)} · {req.submitted_by}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-stone-400">{req.item_count} item{Number(req.item_count) !== 1 ? "s" : ""}</span>
                      {hasPrices && (
                        <span className="text-sm font-semibold text-[#2f200f]">${requestTotal.toFixed(2)}</span>
                      )}

                      {!inFulfillMode && (
                        <button
                          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          className="text-sm font-medium text-[#8a6331] hover:text-[#5c3a18] transition"
                        >
                          {expandedId === req.id ? "Hide items ▲" : "View items ▼"}
                        </button>
                      )}

                      {req.status === "submitted" && !inFulfillMode && (
                        <button
                          onClick={() => openFulfillMode(req)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                        >
                          Mark Fulfilled
                        </button>
                      )}

                      {(req.status === "fulfilled" || req.status === "partially_fulfilled") && !inFulfillMode && (
                        <>
                          <a
                            href={`/fulfillment/${req.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#c49a3c] px-3 py-1.5 text-xs font-semibold text-[#8a6331] transition hover:bg-[#fdf8ec]"
                          >
                            Receipt
                          </a>
                          <button
                            onClick={() => handleRecord(req.id)}
                            disabled={recordingId === req.id}
                            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-900 disabled:opacity-50"
                          >
                            {recordingId === req.id ? "Recording..." : "Mark as Recorded"}
                          </button>
                        </>
                      )}

                      {req.status === "recorded" && !inFulfillMode && (
                        <a
                          href={`/fulfillment/${req.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-50"
                        >
                          View Receipt
                        </a>
                      )}

                      {inFulfillMode && (
                        <button
                          onClick={closeFulfillMode}
                          className="text-sm font-medium text-stone-400 hover:text-stone-700 transition"
                        >
                          Cancel
                        </button>
                      )}

                      {confirmDeleteId === req.id ? (
                        <span className="flex items-center gap-1 text-sm">
                          <button
                            onClick={() => handleDelete(req.id)}
                            disabled={deletingId === req.id}
                            className="font-semibold text-red-600 hover:text-red-800 transition disabled:opacity-50"
                          >
                            {deletingId === req.id ? "Deleting..." : "Yes"}
                          </button>
                          <span className="text-stone-300">/</span>
                          <button onClick={() => setConfirmDeleteId(null)} className="font-semibold text-stone-500 hover:text-stone-800 transition">
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(req.id)}
                          className="text-stone-300 hover:text-red-500 transition cursor-pointer"
                          title="Delete request"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cafe notes */}
                  {req.notes && (
                    <div className="border-t border-stone-100 px-5 py-2.5 bg-amber-50 flex items-start gap-2">
                      <span className="text-xs font-semibold uppercase text-[#7a6040] mt-0.5 shrink-0">Cafe Note:</span>
                      <span className="text-sm text-[#2f200f]">{req.notes}</span>
                    </div>
                  )}

                  {/* Fulfillment notes (after fulfilled) */}
                  {req.fulfillment_notes && !inFulfillMode && (
                    <div className="border-t border-stone-100 px-5 py-2.5 bg-green-50 flex items-start gap-2">
                      <span className="text-xs font-semibold uppercase text-green-700 mt-0.5 shrink-0">Driver Note:</span>
                      <span className="text-sm text-green-900">{req.fulfillment_notes}</span>
                    </div>
                  )}

                  {/* Normal expanded view (read-only) */}
                  {expandedId === req.id && !inFulfillMode && (
                    <div className="border-t border-stone-100 bg-[#faf8f4]">
                      <table className="min-w-full text-sm">
                        <thead className="border-b border-stone-200 bg-[#f3ead8] text-[#5c3a18]">
                          <tr>
                            <th className="px-5 py-2.5 text-left font-semibold">Item</th>
                            <th className="px-5 py-2.5 text-left font-semibold">Unit</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Unit Price</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Qty</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {req.lines.map((line, i) => {
                            const price = line.unit_price ? parseFloat(line.unit_price) : null;
                            const qty = parseFloat(line.requested_qty);
                            const subtotal = price != null ? price * qty : null;
                            return (
                              <tr key={i}>
                                <td className="px-5 py-2.5 font-medium text-stone-900">{line.item_name}</td>
                                <td className="px-5 py-2.5 text-stone-500">{line.unit_type}</td>
                                <td className="px-5 py-2.5 text-right text-stone-500">{price != null ? `$${price.toFixed(2)}` : "—"}</td>
                                <td className="px-5 py-2.5 text-right font-semibold text-[#2f200f]">{qty}</td>
                                <td className="px-5 py-2.5 text-right font-semibold text-[#2f200f]">{subtotal != null ? `$${subtotal.toFixed(2)}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {hasPrices && (
                          <tfoot className="border-t border-stone-200 bg-[#f3ead8]">
                            <tr>
                              <td colSpan={4} className="px-5 py-2.5 text-right text-sm font-semibold text-[#5c3a18]">Estimated Total</td>
                              <td className="px-5 py-2.5 text-right text-sm font-bold text-[#2f200f]">${requestTotal.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}

                  {/* Fulfill mode — editable line items */}
                  {inFulfillMode && (
                    <div className="border-t border-stone-200 bg-[#faf8f4]">
                      {/* Stock issues alert */}
                      {fulfillIssues.length > 0 && (
                        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                          <p className="text-sm font-semibold text-red-700 mb-1.5">
                            ⚠ Cannot fulfill — insufficient stock on some items:
                          </p>
                          <ul className="space-y-1">
                            {fulfillIssues.map((issue) => (
                              <li key={issue.sku} className="text-sm text-red-600">
                                <span className="font-medium">{issue.item_name}</span>
                                {" — "}
                                {issue.on_hand_qty === 0
                                  ? "none in stock (0 available)"
                                  : `only ${issue.on_hand_qty} in stock, reduce qty to ${issue.on_hand_qty} or less`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <table className="min-w-full text-sm mt-1">
                        <thead className="border-b border-stone-200 bg-[#f3ead8] text-[#5c3a18]">
                          <tr>
                            <th className="px-5 py-2.5 text-left font-semibold">Item</th>
                            <th className="px-5 py-2.5 text-left font-semibold">Unit</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Unit Price</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Requested</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Fulfilling</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {req.lines.map((line) => {
                            const hasIssue = fulfillIssues.some((i) => i.sku === line.sku);
                            const price = line.unit_price ? parseFloat(line.unit_price) : null;
                            const fulfillQty = parseFloat(fulfillQtys[line.sku] ?? "0") || 0;
                            const subtotal = price != null ? price * fulfillQty : null;
                            return (
                              <tr key={line.sku} className={hasIssue ? "bg-red-50" : ""}>
                                <td className="px-5 py-2.5 font-medium text-stone-900">{line.item_name}</td>
                                <td className="px-5 py-2.5 text-stone-500">{line.unit_type}</td>
                                <td className="px-5 py-2.5 text-right text-stone-400">{price != null ? `$${price.toFixed(2)}` : "—"}</td>
                                <td className="px-5 py-2.5 text-right text-stone-400">{parseFloat(line.requested_qty)}</td>
                                <td className="px-5 py-2.5 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    max={parseFloat(line.requested_qty)}
                                    step="any"
                                    value={fulfillQtys[line.sku] ?? ""}
                                    onChange={(e) => {
                                      setFulfillQtys((prev) => ({ ...prev, [line.sku]: e.target.value }));
                                      if (hasIssue) setFulfillIssues((prev) => prev.filter((i) => i.sku !== line.sku));
                                    }}
                                    className={`w-24 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 ${
                                      hasIssue
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-stone-300 focus:border-green-500 focus:ring-green-100"
                                    }`}
                                  />
                                </td>
                                <td className="px-5 py-2.5 text-right font-semibold text-[#2f200f]">{subtotal != null ? `$${subtotal.toFixed(2)}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {hasPrices && (() => {
                          const fulfillTotal = req.lines.reduce((sum, l) => {
                            const price = l.unit_price ? parseFloat(l.unit_price) : null;
                            const qty = parseFloat(fulfillQtys[l.sku] ?? "0") || 0;
                            return price != null ? sum + price * qty : sum;
                          }, 0);
                          return (
                            <tfoot className="border-t border-stone-200 bg-[#f3ead8]">
                              <tr>
                                <td colSpan={5} className="px-5 py-2.5 text-right text-sm font-semibold text-[#5c3a18]">Fulfillment Total</td>
                                <td className="px-5 py-2.5 text-right text-sm font-bold text-[#2f200f]">${fulfillTotal.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>

                      {/* Driver notes + actions */}
                      <div className="px-5 py-4 border-t border-stone-100 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1.5">
                            Driver Note <span className="normal-case font-normal text-stone-400">(optional — e.g. partially fulfilled, reason for reduction)</span>
                          </label>
                          <textarea
                            value={fulfillNotes}
                            onChange={(e) => setFulfillNotes(e.target.value)}
                            placeholder="e.g. Only 5 of 10 Co2 fulfilled — rest out of stock, cafe to resubmit remaining"
                            rows={2}
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none resize-none focus:border-green-500 focus:ring-2 focus:ring-green-100 placeholder:text-stone-400"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={closeFulfillMode}
                            disabled={fulfilling}
                            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmFulfill(req)}
                            disabled={fulfilling}
                            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {fulfilling ? "Fulfilling..." : "Confirm Fulfillment"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
