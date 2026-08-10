"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

type Tag = { id: number; name: string; slug: string; item_count: string };

export default function AdminTagsPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/"); return; }
      const sessionData = (await sessionRes.json()) as { email?: string; role?: string };
      if (sessionData.role !== "admin") { router.push("/"); return; }
      setSessionEmail(sessionData.email ?? "");

      const res = await fetch("/api/tags", { cache: "no-store" });
      if (!res.ok) { setError("Unable to load tags."); setLoading(false); return; }
      const data = (await res.json()) as { tags: Tag[] };
      setTags(data.tags);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!newName.trim()) { setAddError("Enter a tag name."); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = (await res.json()) as { tag?: Tag; error?: string };
      if (!res.ok) { setAddError(data.error ?? "Unable to create tag."); return; }
      setTags((prev) => [...prev, data.tag!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch {
      setAddError("Unable to create tag right now.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch("/api/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Unable to delete tag."); return; }
      setTags((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
    } catch {
      setError("Unable to delete tag right now.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8]">
        <p className="text-sm text-stone-400">Loading...</p>
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
              <p className="text-xs font-semibold uppercase text-stone-500">System</p>
              <h1 className="text-lg font-semibold text-[#2f200f]">Tag Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 transition">
              ← Access Management
            </a>
            <a href="/" className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 transition">Dashboard</a>
            <p className="text-sm text-stone-500">{sessionEmail}</p>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {!!error && <p className="text-sm font-medium text-red-700">{error}</p>}

        {/* Explainer */}
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm text-sm text-stone-600 space-y-1">
          <p className="font-semibold text-stone-800">What are tags?</p>
          <p>Tags are labels you can attach to inventory items (e.g. <span className="font-medium text-stone-800">Daily Count</span>). An item can have multiple tags. Tags appear as filter buttons on the Dashboard and Request pages so staff can quickly find items by category.</p>
          <p className="text-stone-400 text-xs pt-1">Tags do not affect the receipt — only the filters.</p>
        </div>

        {/* Create tag form */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-stone-100 bg-[#f3ead8] px-5 py-3">
            <h2 className="font-semibold text-[#2f200f] text-sm">Create New Tag</h2>
            <p className="text-xs text-[#7a6040] mt-0.5">The tag will immediately appear as a filter option and can be assigned to items from the Dashboard.</p>
          </div>
          <form onSubmit={handleAdd} className="px-5 py-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Tag Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Daily Count, Seasonal, Beverage..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#c49a3c] focus:ring-2 focus:ring-[#c49a3c44]"
              />
              {newName.trim() && (
                <p className="mt-1 text-xs text-stone-400">
                  Slug: <span className="font-mono text-stone-500">{newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</span>
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-[#c49a3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b08930] transition disabled:opacity-50 whitespace-nowrap"
            >
              {adding ? "Creating..." : "Create Tag"}
            </button>
          </form>
          {!!addError && <p className="px-5 pb-3 text-sm text-red-600">{addError}</p>}
        </div>

        {/* Tags list */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-stone-100 bg-[#f3ead8] px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#2f200f] text-sm">Existing Tags</h2>
            <span className="text-xs text-stone-500">{tags.length} tag{tags.length !== 1 ? "s" : ""}</span>
          </div>

          {tags.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-400 text-center">No tags yet. Create one above.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="border-b border-stone-100 bg-stone-50 text-xs font-semibold uppercase text-stone-400">
                <tr>
                  <th className="px-5 py-3 text-left">Tag Name</th>
                  <th className="px-5 py-3 text-left">Slug</th>
                  <th className="px-5 py-3 text-right">Items Tagged</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium text-stone-900">
                      <span className="inline-flex items-center rounded-full bg-[#fdf3d8] border border-[#e8c96a] px-3 py-0.5 text-xs font-semibold text-[#7a6040]">
                        {tag.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-stone-400">{tag.slug}</td>
                    <td className="px-5 py-3 text-right text-stone-600">{tag.item_count}</td>
                    <td className="px-5 py-3 text-right">
                      {confirmDelete === tag.id ? (
                        <span className="flex items-center justify-end gap-1 text-sm">
                          {Number(tag.item_count) > 0 && (
                            <span className="text-xs text-orange-600 mr-2">
                              Will remove from {tag.item_count} item{Number(tag.item_count) !== 1 ? "s" : ""}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(tag.id)}
                            disabled={deleting === tag.id}
                            className="font-semibold text-red-600 hover:text-red-800 transition disabled:opacity-50"
                          >
                            {deleting === tag.id ? "Deleting..." : "Confirm"}
                          </button>
                          <span className="text-stone-300">/</span>
                          <button onClick={() => setConfirmDelete(null)} className="font-semibold text-stone-500 hover:text-stone-800 transition">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(tag.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-700 transition"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
