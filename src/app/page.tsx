"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

const WMU_DOMAIN = "wmich.edu";
const OTP_LENGTH = 6;

type AuthStep = "request" | "verify" | "app";
type MasterInventoryItem = {
  sku: string;
  item_name: string;
  unit_type: string;
  case_size: string | null;
  on_hand_qty: string;
  case_price: string | null;
  unit_price: string | null;
  units_per_case: number | null;
};

type AddItemForm = {
  name: string;
  unit_type: string;
  units_per_case: string;
  case_price: string;
  unit_price: string;
  on_hand_qty: string;
};

const EMPTY_FORM: AddItemForm = {
  name: "",
  unit_type: "each",
  units_per_case: "",
  case_price: "",
  unit_price: "",
  on_hand_qty: "0",
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isWmuEmail(value: string) {
  const email = normalizeEmail(value);
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  return parts[1] === WMU_DOMAIN;
}

export default function Home() {
  const [authStep, setAuthStep] = useState<AuthStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [inventoryItems, setInventoryItems] = useState<MasterInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  // Add item modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddItemForm>(EMPTY_FORM);
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Delete state
  const [hoveredSku, setHoveredSku] = useState<string | null>(null);
  const [confirmDeleteSku, setConfirmDeleteSku] = useState<string | null>(null);
  const [deletingSku, setDeletingSku] = useState<string | null>(null);

  // Edit state
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddItemForm>(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editUnitPriceManuallyEdited, setEditUnitPriceManuallyEdited] = useState(false);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailLooksValid = isWmuEmail(normalizedEmail);
  const appEmail = signedInEmail || normalizedEmail;
  const totalItems = inventoryItems.length;
  const lowStockItems = inventoryItems.filter((item) => Number(item.on_hand_qty) <= 24).length;

  // Auto-calculate unit price from case price / units per case
  const autoUnitPrice = useMemo(() => {
    const cp = parseFloat(addForm.case_price);
    const upc = parseFloat(addForm.units_per_case);
    if (!isNaN(cp) && !isNaN(upc) && upc > 0) {
      return (cp / upc).toString();
    }
    return "";
  }, [addForm.case_price, addForm.units_per_case]);

  // Only override unit_price with auto value if user hasn't manually changed it
  const [unitPriceManuallyEdited, setUnitPriceManuallyEdited] = useState(false);

  useEffect(() => {
    if (!unitPriceManuallyEdited && autoUnitPrice) {
      setAddForm((prev) => ({ ...prev, unit_price: autoUnitPrice }));
    }
  }, [autoUnitPrice, unitPriceManuallyEdited]);

  // Auto-calculate unit price for edit form
  const autoEditUnitPrice = useMemo(() => {
    const cp = parseFloat(editForm.case_price);
    const upc = parseFloat(editForm.units_per_case);
    if (!isNaN(cp) && !isNaN(upc) && upc > 0) {
      return (cp / upc).toString();
    }
    return "";
  }, [editForm.case_price, editForm.units_per_case]);

  useEffect(() => {
    if (!editUnitPriceManuallyEdited && autoEditUnitPrice) {
      setEditForm((prev) => ({ ...prev, unit_price: autoEditUnitPrice }));
    }
  }, [autoEditUnitPrice, editUnitPriceManuallyEdited]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { email?: string };

        if (isMounted && data.email) {
          setSignedInEmail(data.email);
          setAuthStep("app");
        }
      } catch {
        // Login screen remains the fallback when no session is available.
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpSent || isSubmitting) {
      return;
    }

    if (!normalizedEmail) {
      setError("Enter your WMU email address to continue.");
      return;
    }

    if (!emailLooksValid) {
      setError("Only @wmich.edu accounts are allowed.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error || "Unable to send code right now.");
        return;
      }

      setOtpSent(true);
      setAuthStep("verify");
      setInfo("OTP sent successfully. Please check your WMU email inbox.");
    } catch {
      setError("Unable to send code right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });

      const data = (await response.json()) as { error?: string; email?: string };

      if (!response.ok) {
        setError(data.error || "Unable to verify code right now.");
        return;
      }

      setSignedInEmail(data.email || normalizedEmail);
      setAuthStep("app");
    } catch {
      setError("Unable to verify code right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRequestState = () => {
    setAuthStep("request");
    setOtpSent(false);
    setIsSubmitting(false);
    setEmail("");
    setOtp("");
    setError("");
    setInfo("");
    setSignedInEmail("");
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    resetRequestState();
  };

  useEffect(() => {
    if (authStep !== "app") {
      return;
    }

    let isMounted = true;

    async function loadMasterInventory() {
      setInventoryLoading(true);
      setInventoryError("");

      try {
        const response = await fetch("/api/inventory/master", { cache: "no-store" });
        const data = (await response.json()) as {
          error?: string;
          items?: MasterInventoryItem[];
        };

        if (!response.ok) {
          if (isMounted) {
            setInventoryError(data.error || "Unable to load inventory right now.");
          }
          return;
        }

        if (isMounted) {
          setInventoryItems(data.items || []);
        }
      } catch {
        if (isMounted) {
          setInventoryError("Unable to load inventory right now.");
        }
      } finally {
        if (isMounted) {
          setInventoryLoading(false);
        }
      }
    }

    loadMasterInventory();

    return () => {
      isMounted = false;
    };
  }, [authStep]);

  const handleDelete = async (sku: string) => {
    setDeletingSku(sku);
    try {
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(sku)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setInventoryItems((prev) => prev.filter((item) => item.sku !== sku));
      }
    } catch {
      // silently fail — item stays in list
    } finally {
      setDeletingSku(null);
      setConfirmDeleteSku(null);
    }
  };

  const openEditModal = (item: MasterInventoryItem) => {
    setEditingSku(item.sku);
    setEditForm({
      name: item.item_name,
      unit_type: item.unit_type,
      units_per_case: item.units_per_case ? String(parseFloat(String(item.units_per_case))) : "",
      case_price: item.case_price ? String(parseFloat(item.case_price)) : "",
      unit_price: item.unit_price ? String(parseFloat(item.unit_price)) : "",
      on_hand_qty: item.on_hand_qty,
    });
    setEditError("");
    setEditUnitPriceManuallyEdited(true); // don't auto-override on open
  };

  const closeEditModal = () => {
    setEditingSku(null);
    setEditError("");
  };

  const handleEditItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSku) return;
    setIsEditing(true);
    setEditError("");

    try {
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(editingSku)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          unit_type: editForm.unit_type,
          units_per_case: editForm.units_per_case ? parseFloat(editForm.units_per_case) : null,
          case_price: editForm.case_price ? parseFloat(editForm.case_price) : null,
          unit_price: editForm.unit_price ? parseFloat(editForm.unit_price) : null,
          on_hand_qty: editForm.on_hand_qty ? parseFloat(editForm.on_hand_qty) : 0,
        }),
      });

      const data = (await response.json()) as { error?: string; item?: MasterInventoryItem };

      if (!response.ok) {
        setEditError(data.error || "Unable to update item right now.");
        return;
      }

      if (data.item) {
        setInventoryItems((prev) =>
          prev.map((item) => (item.sku === editingSku ? data.item! : item)),
        );
      }

      closeEditModal();
    } catch {
      setEditError("Unable to update item right now.");
    } finally {
      setIsEditing(false);
    }
  };

  const openAddModal = () => {
    setAddForm(EMPTY_FORM);
    setAddError("");
    setUnitPriceManuallyEdited(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddError("");
  };

  const handleAddItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAdding(true);
    setAddError("");

    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          unit_type: addForm.unit_type,
          units_per_case: addForm.units_per_case ? parseFloat(addForm.units_per_case) : null,
          case_price: addForm.case_price ? parseFloat(addForm.case_price) : null,
          unit_price: addForm.unit_price ? parseFloat(addForm.unit_price) : null,
          on_hand_qty: addForm.on_hand_qty ? parseFloat(addForm.on_hand_qty) : 0,
        }),
      });

      const data = (await response.json()) as { error?: string; item?: MasterInventoryItem };

      if (!response.ok) {
        setAddError(data.error || "Unable to add item right now.");
        return;
      }

      if (data.item) {
        setInventoryItems((prev) => [...prev, data.item!]);
      }

      closeAddModal();
    } catch {
      setAddError("Unable to add item right now.");
    } finally {
      setIsAdding(false);
    }
  };

  if (authStep === "app") {
    return (
      <main className="min-h-screen bg-[#f6f1e8] text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Image
                src="/wmu-logo.png"
                alt="Western Michigan University logo"
                width={160}
                height={46}
                className="h-auto w-[160px] max-w-full"
                priority
              />
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Inventory</p>
                <h1 className="text-lg font-semibold text-[#2f200f]">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/fulfillment"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
              >
                Fulfillment Queue
              </a>
              <a
                href="/request"
                className="rounded-lg bg-[#4a2f14] px-3 py-2 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18]"
              >
                Request Items
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-stone-950">Welcome back</h2>
            <p className="mt-1 text-sm text-stone-600">{appEmail}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Items", String(totalItems)],
              ["Low Stock (<=24)", String(lowStockItems)],
              ["Location", "Commissary"],
              ["Signed In", "Active"],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h3 className="font-semibold text-stone-950">Master Inventory (Commissary)</h3>
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-lg bg-[#4a2f14] px-3 py-2 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18]"
              >
                + Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              {inventoryLoading && <p className="px-4 py-3 text-sm text-stone-600">Loading inventory...</p>}
              {!!inventoryError && <p className="px-4 py-3 text-sm font-medium text-red-700">{inventoryError}</p>}

              {!inventoryLoading && !inventoryError && (
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-stone-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Case Price</th>
                      <th className="px-4 py-3 font-semibold">Per Case</th>
                      <th className="px-4 py-3 font-semibold">Unit Price</th>
                      <th className="px-4 py-3 font-semibold">Per Unit</th>
                      <th className="px-4 py-3 font-semibold">On Hand</th>
                      <th className="w-24 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {inventoryItems.map((item) => (
                      <tr
                        key={item.sku}
                        onMouseEnter={() => setHoveredSku(item.sku)}
                        onMouseLeave={() => {
                          setHoveredSku(null);
                          if (confirmDeleteSku === item.sku) setConfirmDeleteSku(null);
                        }}
                      >
                        <td className="px-4 py-3 font-medium text-stone-950">{item.item_name}</td>
                        <td className="px-4 py-3 text-stone-800">
                          {item.case_price ? `$${Number(item.case_price).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {item.units_per_case
                            ? `case(${parseFloat(String(item.units_per_case))})`
                            : item.case_size ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-800">
                          {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">{item.unit_type}</td>
                        <td className="px-4 py-3 text-stone-800">{item.on_hand_qty}</td>
                        <td className="px-4 py-3 text-right">
                          {confirmDeleteSku === item.sku ? (
                            <span className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDelete(item.sku)}
                                disabled={deletingSku === item.sku}
                                className="rounded px-2 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingSku === item.sku ? "Deleting…" : "Yes"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSku(null)}
                                className="rounded px-2 py-1 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <span className={`flex items-center justify-end gap-4 transition-opacity ${hoveredSku === item.sku ? "opacity-100" : "opacity-0"}`}>
                              <button
                                onClick={() => openEditModal(item)}
                                className="cursor-pointer text-stone-400 hover:text-blue-600"
                                aria-label="Edit item"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSku(item.sku)}
                                className="cursor-pointer text-stone-400 hover:text-red-600"
                                aria-label="Delete item"
                              >
                                🗑
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-stone-950">Add New Item</h2>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="text-stone-400 transition hover:text-stone-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddItem} className="px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Pop 20oz"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                  />
                </div>

                {/* Unit Type + Units Per Case */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Unit Type</label>
                    <select
                      value={addForm.unit_type}
                      onChange={(e) => setAddForm((p) => ({ ...p, unit_type: e.target.value }))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    >
                      <option value="each">each</option>
                      <option value="tub">tub</option>
                      <option value="bag">bag</option>
                      <option value="box">box</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Units Per Case</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={addForm.units_per_case}
                      onChange={(e) => setAddForm((p) => ({ ...p, units_per_case: e.target.value }))}
                      placeholder="24"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                </div>

                {/* Case Price + Unit Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Case Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={addForm.case_price}
                      onChange={(e) => {
                        setAddForm((p) => ({ ...p, case_price: e.target.value }));
                        setUnitPriceManuallyEdited(false);
                      }}
                      placeholder="25.56"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Unit Price ($)
                      {!unitPriceManuallyEdited && autoUnitPrice && (
                        <span className="ml-1 text-xs text-stone-400">(auto-calculated)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={addForm.unit_price}
                      onChange={(e) => {
                        setAddForm((p) => ({ ...p, unit_price: e.target.value }));
                        setUnitPriceManuallyEdited(true);
                      }}
                      placeholder="1.07"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                </div>

                {/* On Hand Qty */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">On Hand Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={addForm.on_hand_qty}
                    onChange={(e) => setAddForm((p) => ({ ...p, on_hand_qty: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                  />
                </div>

                {!!addError && <p className="text-sm font-medium text-red-700">{addError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="flex-1 rounded-lg bg-[#4a2f14] px-4 py-2 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:bg-[#8a6f4e]"
                  >
                    {isAdding ? "Saving..." : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {editingSku && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-stone-950">Edit Item</h2>
                <button type="button" onClick={closeEditModal} className="text-stone-400 transition hover:text-stone-700">✕</button>
              </div>

              <form onSubmit={handleEditItem} className="px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                  />
                </div>

                {/* Unit Type + Units Per Case */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Unit Type</label>
                    <select
                      value={editForm.unit_type}
                      onChange={(e) => setEditForm((p) => ({ ...p, unit_type: e.target.value }))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    >
                      <option value="each">each</option>
                      <option value="tub">tub</option>
                      <option value="bag">bag</option>
                      <option value="box">box</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Units Per Case</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.units_per_case}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, units_per_case: e.target.value }));
                        setEditUnitPriceManuallyEdited(false);
                      }}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                </div>

                {/* Case Price + Unit Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Case Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.case_price}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, case_price: e.target.value }));
                        setEditUnitPriceManuallyEdited(false);
                      }}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Unit Price ($)
                      {!editUnitPriceManuallyEdited && autoEditUnitPrice && (
                        <span className="ml-1 text-xs text-stone-400">(auto-calculated)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.unit_price}
                      onChange={(e) => {
                        setEditForm((p) => ({ ...p, unit_price: e.target.value }));
                        setEditUnitPriceManuallyEdited(true);
                      }}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                    />
                  </div>
                </div>

                {/* On Hand Qty */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">On Hand Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.on_hand_qty}
                    onChange={(e) => setEditForm((p) => ({ ...p, on_hand_qty: e.target.value }))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#8a6331] focus:ring-2 focus:ring-[#d9b98a66]"
                  />
                </div>

                {!!editError && <p className="text-sm font-medium text-red-700">{editError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="flex-1 rounded-lg bg-[#4a2f14] px-4 py-2 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:bg-[#8a6f4e]"
                  >
                    {isEditing ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#fff6e7_0%,#f7ecdc_34%,#eadac6_100%)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-[#d8c4a7] bg-white/95 p-7 shadow-[0_18px_50px_rgba(58,38,17,0.16)] backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/wmu-logo.png"
            alt="Western Michigan University logo"
            width={200}
            height={58}
            className="h-auto w-[200px] max-w-full"
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold text-[#2f200f]">Sign in to Inventory</h1>
          <p className="mt-2 text-sm text-stone-600">Use your WMU email to receive a one-time passcode.</p>
        </div>

        {authStep === "request" && (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
          <label className="block text-sm font-medium text-stone-700" htmlFor="email">
            WMU Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="broncos@wmich.edu"
            disabled={otpSent}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-[#8a6331] focus:ring-3 focus:ring-[#d9b98a66] disabled:cursor-not-allowed disabled:bg-stone-100"
          />

          {!!email && !emailLooksValid && !otpSent && (
            <p className="text-sm font-medium text-amber-700">
              Only addresses ending in @wmich.edu can continue.
            </p>
          )}

          {!!error && <p className="text-sm font-medium text-red-700">{error}</p>}
          {!!info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={otpSent || isSubmitting}
            className="w-full rounded-xl bg-[#4a2f14] px-4 py-3 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:cursor-not-allowed disabled:bg-[#8a6f4e]"
          >
            {otpSent ? "OTP Sent" : isSubmitting ? "Sending..." : "Send Verification Code"}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={resetRequestState}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-900"
            >
              Reset for Demo
            </button>
          )}
          </form>
        )}

        {authStep === "verify" && (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <p className="text-sm text-stone-600">
                Enter the 6-digit code sent for <span className="font-semibold">{normalizedEmail}</span>.
              </p>
            </div>

            <label className="block text-sm font-medium text-stone-700" htmlFor="otp">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-center text-xl tracking-[0.35em] outline-none transition focus:border-[#8a6331] focus:ring-3 focus:ring-[#d9b98a66]"
            />

            {!!error && <p className="text-sm font-medium text-red-700">{error}</p>}
            {!!info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#4a2f14] px-4 py-3 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:cursor-not-allowed disabled:bg-[#8a6f4e]"
            >
              {isSubmitting ? "Verifying..." : "Verify and Continue"}
            </button>

            <button
              type="button"
              onClick={resetRequestState}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-900"
            >
              Use a Different Email
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
