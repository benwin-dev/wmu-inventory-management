"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RequestLine = {
  item_name: string;
  unit_type: string;
  requested_qty: string;
};

type StockRequest = {
  id: number;
  submitted_at: string;
  submitted_by: string;
  cafe_name: string;
  status: string;
  item_count: string;
  notes: string | null;
  lines: RequestLine[];
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-800 border-amber-200",
    fulfilled: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-stone-100 text-stone-500 border-stone-200",
  };
  const labels: Record<string, string> = {
    submitted: "Pending",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
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
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/");
        return;
      }
      const sessionData = (await sessionRes.json()) as { email?: string };
      setSessionEmail(sessionData.email ?? "");

      const res = await fetch("/api/fulfillment", { cache: "no-store" });
      if (!res.ok) {
        setError("Unable to load requests right now.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { requests: StockRequest[] };
      setRequests(data.requests);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleFulfill = async (id: number) => {
    setFulfillingId(id);
    try {
      const res = await fetch(`/api/fulfillment/${id}`, { method: "PATCH" });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "fulfilled" } : r)),
        );
      } else {
        setError("Unable to fulfill request right now.");
      }
    } catch {
      setError("Unable to fulfill request right now.");
    } finally {
      setFulfillingId(null);
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
            <a
              href="/"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              Dashboard
            </a>
            <p className="text-sm text-stone-500">{sessionEmail}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-8">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-700">
              {showAll ? `All requests (${requests.length})` : `Pending (${pendingCount})`}
            </span>
          </div>
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
            <p className="text-stone-400 text-sm">
              {showAll ? "No requests yet." : "No pending requests."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((req) => (
              <div key={req.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                {/* Request header row */}
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
                    <button
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      className="text-sm font-medium text-[#8a6331] hover:text-[#5c3a18] transition"
                    >
                      {expandedId === req.id ? "Hide items ▲" : "View items ▼"}
                    </button>
                    {req.status === "submitted" && (
                      <button
                        onClick={() => handleFulfill(req.id)}
                        disabled={fulfillingId === req.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        {fulfillingId === req.id ? "Fulfilling..." : "Mark Fulfilled"}
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
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="font-semibold text-stone-500 hover:text-stone-800 transition"
                        >
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

                {/* Notes */}
                {req.notes && (
                  <div className="border-t border-stone-100 px-5 py-2.5 bg-amber-50">
                    <span className="text-xs font-semibold uppercase text-[#7a6040]">Note: </span>
                    <span className="text-sm text-[#2f200f]">{req.notes}</span>
                  </div>
                )}

                {/* Expanded line items */}
                {expandedId === req.id && (
                  <div className="border-t border-stone-100 bg-[#faf8f4]">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-stone-200 bg-[#f3ead8] text-[#5c3a18]">
                        <tr>
                          <th className="px-5 py-2.5 text-left font-semibold">Item</th>
                          <th className="px-5 py-2.5 text-left font-semibold">Unit</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Qty Requested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {req.lines.map((line, i) => (
                          <tr key={i}>
                            <td className="px-5 py-2.5 font-medium text-stone-900">{line.item_name}</td>
                            <td className="px-5 py-2.5 text-stone-500">{line.unit_type}</td>
                            <td className="px-5 py-2.5 text-right font-semibold text-[#2f200f]">{parseFloat(line.requested_qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
