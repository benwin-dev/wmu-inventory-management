"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InventoryItem = {
  sku: string;
  item_name: string;
  unit_type: string;
  units_per_case: string | null;
  case_price: string | null;
  unit_price: string | null;
};

type OrderLine = {
  sku: string;
  item_name: string;
  unit_type: string;
  unit_price: number | null;
  qty: number;
};

type ValidationIssue = {
  sku: string;
  item_name: string;
  requested_qty: number;
  on_hand_qty: number;
};

export default function RequestPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/");
        return;
      }
      const sessionData = (await sessionRes.json()) as { email?: string };
      setSessionEmail(sessionData.email ?? "");

      const invRes = await fetch("/api/inventory/master", { cache: "no-store" });
      const invData = (await invRes.json()) as { items?: InventoryItem[] };
      setItems(invData.items ?? []);
      setLoading(false);
    }
    init();
  }, [router]);

  const selectedLines: OrderLine[] = items
    .map((item) => ({
      sku: item.sku,
      item_name: item.item_name,
      unit_type: item.unit_type,
      unit_price: item.unit_price ? Number(item.unit_price) : null,
      qty: parseFloat(quantities[item.sku] ?? "0") || 0,
    }))
    .filter((l) => l.qty > 0);

  const estimatedTotal = selectedLines.reduce(
    (sum, l) => sum + (l.unit_price ?? 0) * l.qty,
    0,
  );

  const handleOpenConfirm = async () => {
    setError("");
    setValidationIssues([]);

    if (selectedLines.length === 0) {
      setError("Please enter a quantity for at least one item.");
      return;
    }

    setValidating(true);
    try {
      const res = await fetch("/api/requests/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedLines.map((l) => ({ sku: l.sku, qty: l.qty })) }),
      });

      const data = (await res.json()) as { issues?: ValidationIssue[]; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Unable to validate request right now.");
        return;
      }

      if (data.issues && data.issues.length > 0) {
        setValidationIssues(data.issues);
        return;
      }

      setShowConfirm(true);
    } catch {
      setError("Unable to validate request right now.");
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!requesterName.trim()) {
      setNameError("Please enter your name.");
      return;
    }
    setNameError("");
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedLines.map((l) => ({ sku: l.sku, qty: l.qty })),
          notes: notes.trim() || null,
          requested_by_name: requesterName.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setShowConfirm(false);
        setError(data.error ?? "Unable to submit request right now.");
        return;
      }

      setShowConfirm(false);
      setRequesterName("");
      setSubmitted(true);
    } catch {
      setShowConfirm(false);
      setError("Unable to submit request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ede4d3]">
        <p className="text-sm text-stone-500">Loading...</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#ede4d3] p-4">
        <div className="rounded-2xl border border-[#d6c9b0] bg-[#faf6ee] p-10 text-center shadow-sm">
          <p className="text-4xl">✅</p>
          <h2 className="mt-4 text-xl font-semibold text-[#2f200f]">Request Submitted!</h2>
          <p className="mt-2 text-sm text-[#7a6040]">Your request has been sent to the Commissary.</p>
          <button
            onClick={() => { setSubmitted(false); setQuantities({}); setNotes(""); setValidationIssues([]); }}
            className="mt-6 rounded-lg bg-[#c49a3c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b08930]"
          >
            Submit Another Request
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#ede4d3] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Image src="/wmu-logo.png" alt="WMU logo" width={140} height={40} className="h-auto w-[140px]" priority />
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Parkview Cafe</p>
              <h1 className="text-lg font-semibold text-[#2f200f]">Request Items</h1>
            </div>
          </div>
          <p className="text-sm text-stone-500">{sessionEmail}</p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="overflow-hidden rounded-lg border border-[#d6c9b0] bg-[#faf6ee]">
          <div className="border-b border-[#d6c9b0] bg-[#f3ead8] px-4 py-3">
            <h2 className="font-bold text-[#2f200f]">Parkview Cafe Request Form</h2>
            <p className="mt-1 text-sm text-[#7a6040]">Enter the quantity you need for each item. Leave blank to skip.</p>
          </div>

          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#d6c9b0] bg-[#ede4d3] text-[#5c3a18]">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Unit Price</th>
                <th className="px-4 py-3 font-semibold">Per Unit</th>
                <th className="px-4 py-3 font-semibold w-32">Qty Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dfc8]">
              {items.map((item) => {
                const hasIssue = validationIssues.some((i) => i.sku === item.sku);
                return (
                  <tr
                    key={item.sku}
                    className={
                      hasIssue
                        ? "bg-red-50"
                        : quantities[item.sku] && Number(quantities[item.sku]) > 0
                        ? "bg-[#fdf3d8]"
                        : ""
                    }
                  >
                    <td className="px-4 py-3 font-medium text-[#2f200f]">{item.item_name}</td>
                    <td className="px-4 py-3 text-[#5c3a18]">
                      {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#7a6040]">{item.unit_type}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quantities[item.sku] ?? ""}
                        onChange={(e) => {
                          setQuantities((prev) => ({ ...prev, [item.sku]: e.target.value }));
                          if (hasIssue) setValidationIssues((prev) => prev.filter((i) => i.sku !== item.sku));
                        }}
                        placeholder="0"
                        className={`w-24 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 ${
                          hasIssue
                            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                            : "border-[#c9b48a] focus:border-[#c49a3c] focus:ring-[#c49a3c44]"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation alert */}
        {validationIssues.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 mb-2">
              ⚠ Some quantities exceed available stock — please adjust before submitting:
            </p>
            <ul className="space-y-1">
              {validationIssues.map((issue) => (
                <li key={issue.sku} className="text-sm text-red-600">
                  <span className="font-medium">{issue.item_name}</span>
                  {" — "}
                  {issue.on_hand_qty === 0
                    ? "none in stock (0 available)"
                    : `you requested ${issue.requested_qty}, only ${issue.on_hand_qty} in stock`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes field */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-[#2f200f] mb-1.5">
            Notes <span className="font-normal text-[#7a6040]">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for the Commissary — e.g. need by Friday morning, urgent, etc."
            rows={3}
            className="w-full rounded-lg border border-[#c9b48a] bg-[#faf6ee] px-3 py-2 text-sm text-[#2f200f] outline-none resize-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44] placeholder:text-[#b0956a]"
          />
        </div>

        {!!error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[#7a6040]">
            {selectedLines.length} item(s) selected
          </p>
          <button
            onClick={handleOpenConfirm}
            disabled={validating}
            className="rounded-lg bg-[#c49a3c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b08930] disabled:bg-[#c9b48a]"
          >
            {validating ? "Checking stock..." : `Review & Submit${selectedLines.length > 0 ? ` (${selectedLines.length})` : ""}`}
          </button>
        </div>
      </section>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d6c9b0] bg-[#faf6ee] shadow-xl">
            {/* Modal header */}
            <div className="border-b border-[#d6c9b0] bg-[#f3ead8] px-6 py-4 rounded-t-2xl">
              <h2 className="text-base font-bold text-[#2f200f]">Review Your Request</h2>
              <p className="text-xs text-[#7a6040] mt-0.5">Parkview Cafe → Commissary</p>
            </div>

            {/* Line items */}
            <div className="px-6 py-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-[#7a6040] border-b border-[#e8dfc8]">
                    <th className="pb-2 text-left">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8dfc8]">
                  {selectedLines.map((line) => (
                    <tr key={line.sku}>
                      <td className="py-2.5 pr-4 font-medium text-[#2f200f]">{line.item_name}</td>
                      <td className="py-2.5 text-right text-[#5c3a18]">{line.qty}</td>
                      <td className="py-2.5 text-right text-[#5c3a18]">
                        {line.unit_price != null ? `$${line.unit_price.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#2f200f]">
                        {line.unit_price != null ? `$${(line.unit_price * line.qty).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border-t border-[#d6c9b0] bg-[#f3ead8] px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#2f200f]">Estimated Total</span>
              <span className="text-base font-bold text-[#2f200f]">${estimatedTotal.toFixed(2)}</span>
            </div>

            {/* Notes in modal */}
            {notes.trim() && (
              <div className="px-6 py-3 border-t border-[#d6c9b0]">
                <p className="text-xs font-semibold uppercase text-[#7a6040] mb-1">Notes</p>
                <p className="text-sm text-[#2f200f]">{notes.trim()}</p>
              </div>
            )}

            {/* Notes textarea in modal (editable) */}
            {!notes.trim() && (
              <div className="px-6 py-3 border-t border-[#d6c9b0]">
                <label className="block text-xs font-semibold uppercase text-[#7a6040] mb-1">
                  Add a note <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for the Commissary?"
                  rows={2}
                  className="w-full rounded-lg border border-[#c9b48a] bg-white px-3 py-2 text-sm text-[#2f200f] outline-none resize-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44] placeholder:text-[#b0956a]"
                />
              </div>
            )}

            {/* Name field */}
            <div className="px-6 py-3 border-t border-[#d6c9b0]">
              <label className="block text-xs font-semibold uppercase text-[#7a6040] mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => { setRequesterName(e.target.value); setNameError(""); }}
                placeholder="e.g. John Smith"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[#2f200f] outline-none focus:ring-2 ${
                  nameError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-[#c9b48a] focus:border-[#c49a3c] focus:ring-[#c49a3c44]"
                }`}
              />
              {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="rounded-lg border border-[#c9b48a] px-4 py-2 text-sm font-semibold text-[#5c3a18] transition hover:bg-[#ede4d3] disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="rounded-lg bg-[#c49a3c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b08930] disabled:bg-[#c9b48a]"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
