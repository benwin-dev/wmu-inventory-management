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

export default function RequestPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      // Check session
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/");
        return;
      }
      const sessionData = (await sessionRes.json()) as { email?: string };
      setSessionEmail(sessionData.email ?? "");

      // Load inventory
      const invRes = await fetch("/api/inventory/master", { cache: "no-store" });
      const invData = (await invRes.json()) as { items?: InventoryItem[] };
      setItems(invData.items ?? []);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    const lines = items
      .map((item) => ({ sku: item.sku, qty: parseFloat(quantities[item.sku] ?? "0") || 0 }))
      .filter((l) => l.qty > 0);

    if (lines.length === 0) {
      setError("Please enter a quantity for at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Unable to submit request right now.");
        return;
      }

      setSubmitted(true);
    } catch {
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
            onClick={() => { setSubmitted(false); setQuantities({}); }}
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
          <div className="bg-[#FFD75E] px-4 py-3">
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
              {items.map((item) => (
                <tr key={item.sku} className={quantities[item.sku] && Number(quantities[item.sku]) > 0 ? "bg-[#fdf3d8]" : ""}>
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
                      onChange={(e) => setQuantities((prev) => ({ ...prev, [item.sku]: e.target.value }))}
                      placeholder="0"
                      className="w-24 rounded-lg border border-[#c9b48a] px-3 py-1.5 text-sm outline-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!!error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[#7a6040]">
            {Object.values(quantities).filter((q) => Number(q) > 0).length} item(s) selected
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#c49a3c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b08930] disabled:bg-[#c9b48a]"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </section>
    </main>
  );
}
