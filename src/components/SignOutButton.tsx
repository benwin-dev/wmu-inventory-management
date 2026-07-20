"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      {signingOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}
