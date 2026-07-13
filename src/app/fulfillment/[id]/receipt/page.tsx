"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type ReceiptLine = {
  sku: string;
  item_name: string;
  unit_type: string;
  requested_qty: string;
  fulfilled_qty: string | null;
  unit_price: string | null;
};

type ReceiptRequest = {
  id: number;
  submitted_at: string;
  fulfilled_at: string | null;
  recorded_at: string | null;
  submitted_by: string;
  fulfilled_by: string | null;
  recorded_by: string | null;
  cafe_name: string;
  status: string;
  notes: string | null;
  fulfillment_notes: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function padId(id: number) {
  return String(id).padStart(6, "0");
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    fulfilled: "Fulfilled",
    partially_fulfilled: "Partially Fulfilled",
    recorded: "Recorded",
  };
  return map[status] ?? status;
}

export default function ReceiptPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [req, setReq] = useState<ReceiptRequest | null>(null);
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/"); return; }

      const res = await fetch(`/api/fulfillment/${id}/receipt`, { cache: "no-store" });
      if (!res.ok) { setError("Unable to load receipt."); setLoading(false); return; }
      const data = (await res.json()) as { request: ReceiptRequest; lines: ReceiptLine[] };
      setReq(data.request);
      setLines(data.lines);
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Loading receipt...</p>
      </main>
    );
  }

  if (error || !req) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-red-500">{error || "Receipt not found."}</p>
      </main>
    );
  }

  const year = new Date(req.submitted_at).getFullYear();
  const receiptNo = `TR-${year}-${padId(req.id)}`;
  const requestNo = `REQ-${year}-${padId(req.id)}`;

  const totalRequestedUnits = lines.reduce((s, l) => s + parseFloat(l.requested_qty), 0);
  const totalFulfilledUnits = lines.reduce((s, l) => s + parseFloat(l.fulfilled_qty ?? l.requested_qty), 0);
  const totalShortUnits = totalRequestedUnits - totalFulfilledUnits;
  const totalValue = lines.reduce((s, l) => {
    const price = l.unit_price ? parseFloat(l.unit_price) : null;
    const qty = parseFloat(l.fulfilled_qty ?? l.requested_qty);
    return price != null ? s + price * qty : s;
  }, 0);

  return (
    <main className="min-h-screen bg-white text-stone-900">
      {/* Print controls — hidden when printing */}
      <div className="print:hidden flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-3">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-stone-500 hover:text-stone-800 transition"
        >
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[#c49a3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b08930] transition"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Receipt body */}
      <div className="mx-auto max-w-4xl px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Western Michigan University</p>
          <h1 className="mt-1 text-2xl font-bold uppercase tracking-wide text-[#2f200f]">Main Commissary</h1>
          <h2 className="mt-0.5 text-base font-semibold uppercase tracking-wider text-stone-500">Inventory Transfer Receipt</h2>
          <div className="mt-4 mx-auto h-px w-24 bg-[#c49a3c]" />
        </div>

        {/* Meta grid */}
        <div className="mb-6 grid grid-cols-2 gap-x-10 gap-y-2 rounded-lg border border-stone-200 bg-stone-50 px-6 py-4 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">Receipt No</span>
            <span className="font-bold text-stone-900">{receiptNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">Request No</span>
            <span className="font-bold text-stone-900">{requestNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">Request Date</span>
            <span className="text-stone-800">{formatDate(req.submitted_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">Fulfilled Date</span>
            <span className="text-stone-800">{formatDate(req.fulfilled_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">From</span>
            <span className="text-stone-800">Main Commissary</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-500">To</span>
            <span className="text-stone-800">{req.cafe_name}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="font-semibold text-stone-500">Status</span>
            <span className={`font-bold ${req.status === "fulfilled" ? "text-green-700" : req.status === "partially_fulfilled" ? "text-orange-600" : "text-stone-700"}`}>
              {statusLabel(req.status)}
            </span>
          </div>
        </div>

        {/* Line items table */}
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-[#f3ead8] text-[#5c3a18]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                <th className="px-4 py-3 text-right font-semibold">Requested</th>
                <th className="px-4 py-3 text-right font-semibold">Fulfilled</th>
                <th className="px-4 py-3 text-right font-semibold">Difference</th>
                <th className="px-4 py-3 text-right font-semibold">Unit Rate</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lines.map((line) => {
                const requested = parseFloat(line.requested_qty);
                const fulfilled = parseFloat(line.fulfilled_qty ?? line.requested_qty);
                const diff = requested - fulfilled;
                const price = line.unit_price ? parseFloat(line.unit_price) : null;
                const total = price != null ? price * fulfilled : null;
                return (
                  <tr key={line.sku} className={diff > 0 ? "bg-orange-50" : ""}>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{line.sku}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{line.item_name}</td>
                    <td className="px-4 py-3 text-stone-500">{line.unit_type}</td>
                    <td className="px-4 py-3 text-right text-stone-700">{requested}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900">{fulfilled}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? "text-orange-600" : "text-stone-400"}`}>
                      {diff > 0 ? diff : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">{price != null ? `$${price.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{total != null ? `$${total.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-stone-500">Total Requested Units</span>
              <span className="font-semibold text-stone-800">{totalRequestedUnits}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-stone-500">Total Fulfilled Units</span>
              <span className="font-semibold text-stone-800">{totalFulfilledUnits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total Short Units</span>
              <span className={`font-semibold ${totalShortUnits > 0 ? "text-orange-600" : "text-stone-400"}`}>
                {totalShortUnits > 0 ? totalShortUnits : "—"}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[#c49a3c] bg-[#fdf8ec] px-5 py-3 flex flex-col items-end justify-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7a6040]">Total Transfer Value</p>
            <p className="mt-1 text-2xl font-bold text-[#2f200f]">${totalValue.toFixed(2)}</p>
          </div>
        </div>

        {/* Signatures / people */}
        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-stone-500">Requested By</span>
              <span className="text-stone-800">{req.submitted_by}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-stone-500">Fulfilled By</span>
              <span className="text-stone-800">{req.fulfilled_by ?? "—"}</span>
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-stone-500">Finalized By</span>
              <span className="text-stone-800">{req.recorded_by ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(req.notes || req.fulfillment_notes) && (
          <div className="mb-6 space-y-2 text-sm">
            {req.notes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Cafe Notes</p>
                <p className="text-stone-800">{req.notes}</p>
              </div>
            )}
            {req.fulfillment_notes && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-1">Driver Notes</p>
                <p className="text-stone-800">{req.fulfillment_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-stone-200 pt-4 text-xs text-stone-400 flex justify-between">
          <span>WMU Dining Services — Main Commissary</span>
          <span>Generated: {formatDate(new Date().toISOString())}</span>
        </div>
      </div>
    </main>
  );
}
