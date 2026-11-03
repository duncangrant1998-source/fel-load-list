"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError("That email and password didn't match. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-fel-border bg-fel-panel p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fel-icon.svg" alt="FEL" width={32} height={32} />
          <h1 className="text-xl font-semibold uppercase tracking-wide">
            Load List
          </h1>
        </div>
        <p className="mb-6 text-sm text-neutral-400">
          Sign in with the account your team lead set up for you. Don&apos;t
          have one yet? Ask them to invite you.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              placeholder="you@feldrives.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-red"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-md bg-fel-red/10 px-3 py-2 text-sm text-fel-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fel-red px-3 py-2 text-sm font-medium text-white transition hover:bg-fel-red/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
