"use client";

import React from "react";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

type SummaryRow = {
  cafe_name: string;
  category: string;
  total_value: string;
  has_missing_price: boolean;
};

type CafeGroup = {
  cafe_name: string;
  rows: SummaryRow[];
  cafe_total: number;
  has_missing_price: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  nonfood: "Non-Food",
  produce: "Produce",
};

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}

function groupByCafe(rows: SummaryRow[]): CafeGroup[] {
  const map = new Map<string, CafeGroup>();
  for (const row of rows) {
    if (!map.has(row.cafe_name)) {
      map.set(row.cafe_name, { cafe_name: row.cafe_name, rows: [], cafe_total: 0, has_missing_price: false });
    }
    const group = map.get(row.cafe_name)!;
    group.rows.push(row);
    group.cafe_total += parseFloat(row.total_value);
    if (row.has_missing_price) group.has_missing_price = true;
  }
  return Array.from(map.values());
}

export default function ReportsPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const defaultRange = getWeekRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMissingPrice, setHasMissingPrice] = useState(false);
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/auth/session");
      if (!res.ok) { router.push("/"); return; }
      const data = (await res.json()) as { role?: string; email?: string };
      if (data.role !== "admin" && data.role !== "commissary") { router.push("/"); return; }
      setSessionEmail(data.email ?? "");
    }
    init();
  }, [router]);

  const fetchReport = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/transfer-summary?from=${from}&to=${to}`, { cache: "no-store" });
      if (!res.ok) { setError("Unable to load report."); return; }
      const data = (await res.json()) as { rows: SummaryRow[] };
      setRows(data.rows);
      setHasMissingPrice(data.rows.some((r) => r.has_missing_price));
    } catch {
      setError("Unable to load report right now.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { setNow(new Date().toLocaleString()); }, []);

  const groups = groupByCafe(rows);
  const grandTotal = groups.reduce((s, g) => s + g.cafe_total, 0);

  const downloadCSV = () => {
    const lines: string[] = [];
    lines.push(`"Transfer Summary Report"`);
    lines.push(`"Period","${formatDate(from)} – ${formatDate(to)}"`);
    lines.push(`"Generated","${now}"`);
    lines.push("");
    lines.push(`"Cafe","Category","Total Value"`);
    for (const group of groups) {
      for (const row of group.rows) {
        lines.push(`"${group.cafe_name}","${categoryLabel(row.category)}","$${parseFloat(row.total_value).toFixed(2)}"`);
      }
      lines.push(`"${group.cafe_name} Total","","$${group.cafe_total.toFixed(2)}"`);
      lines.push("");
    }
    lines.push(`"Grand Total","","$${grandTotal.toFixed(2)}"`);
    if (hasMissingPrice) lines.push(`"* Some items have no price set — totals may be understated."`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transfer-summary-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-stone-900">
      {/* Header — hidden when printing */}
      <header className="print:hidden border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Image src="/wmu-logo.png" alt="WMU logo" width={160} height={46} className="h-auto w-[160px]" priority />
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Commissary</p>
              <h1 className="text-lg font-semibold text-[#2f200f]">Transfer Summary Report</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 transition">Dashboard</a>
            <p className="text-sm text-stone-500">{sessionEmail}</p>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Date range controls — hidden when printing */}
        <div className="print:hidden mb-6 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44]"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-lg bg-[#c49a3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b08930] transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Generate"}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 transition disabled:opacity-40"
            >
              Download CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={rows.length === 0}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 transition disabled:opacity-40"
            >
              Print / PDF
            </button>
          </div>
        </div>

        {!!error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {/* Report body */}
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">

          {/* Print header — only visible when printing */}
          <div className="hidden print:block px-8 py-6 text-center border-b border-stone-200">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Western Michigan University</p>
            <h1 className="mt-1 text-2xl font-bold uppercase tracking-wide text-[#2f200f]">Main Commissary</h1>
            <h2 className="mt-0.5 text-base font-semibold uppercase tracking-wider text-stone-500">Transfer Summary Report</h2>
            <div className="mt-4 mx-auto h-px w-24 bg-[#c49a3c]" />
            <p className="mt-3 text-sm text-stone-600">
              Period: <span className="font-semibold">{formatDate(from)}</span> — <span className="font-semibold">{formatDate(to)}</span>
            </p>
            {now && <p className="text-xs text-stone-400 mt-1">Generated: {now}</p>}
          </div>

          {/* Screen period label */}
          <div className="print:hidden border-b border-stone-100 bg-[#f3ead8] px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#2f200f] text-sm">
              {from && to ? `${formatDate(from)} — ${formatDate(to)}` : "Select a date range"}
            </h2>
            {rows.length > 0 && (
              <span className="text-xs text-stone-500">{groups.length} cafe{groups.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-stone-400">Loading report...</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-400">No fulfilled transfers found for this date range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Cafe</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {groups.map((group) => (
                    <React.Fragment key={group.cafe_name}>
                      {group.rows.map((row, i) => (
                        <tr key={`${group.cafe_name}-${row.category}`} className="hover:bg-stone-50">
                          <td className="px-6 py-3 font-medium text-stone-900">
                            {i === 0 ? group.cafe_name : ""}
                          </td>
                          <td className="px-6 py-3 text-stone-600">{categoryLabel(row.category)}</td>
                          <td className="px-6 py-3 text-right text-stone-800">
                            ${parseFloat(row.total_value).toFixed(2)}
                            {row.has_missing_price && <span className="text-orange-500 ml-1">*</span>}
                          </td>
                        </tr>
                      ))}
                      {/* Cafe subtotal */}
                      <tr key={`${group.cafe_name}-total`} className="bg-[#f3ead8]">
                        <td className="px-6 py-2 font-semibold text-[#5c3a18]" colSpan={2}>
                          {group.cafe_name} Total
                          {group.has_missing_price && <span className="text-orange-500 ml-1">*</span>}
                        </td>
                        <td className="px-6 py-2 text-right font-bold text-[#2f200f]">
                          ${group.cafe_total.toFixed(2)}
                        </td>
                      </tr>
                      {/* Spacer row between cafes */}
                      <tr key={`${group.cafe_name}-spacer`} className="h-2 bg-stone-50" />
                    </React.Fragment>
                  ))}

                  {/* Grand total */}
                  <tr className="border-t-2 border-[#c49a3c] bg-[#fdf8ec]">
                    <td className="px-6 py-4 font-bold text-[#2f200f] text-base" colSpan={2}>
                      Grand Total
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#2f200f] text-lg">
                      ${grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {hasMissingPrice && (
                <p className="px-6 py-3 text-xs text-orange-600 border-t border-stone-100">
                  * One or more items have no unit price set — totals for those items are counted as $0.00. Update prices in the Dashboard.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Print footer */}
        <div className="hidden print:flex mt-6 border-t border-stone-200 pt-4 text-xs text-stone-400 justify-between">
          <span>WMU Dining Services — Main Commissary</span>
          {now && <span>Generated: {now}</span>}
        </div>
      </div>
    </main>
  );
}
