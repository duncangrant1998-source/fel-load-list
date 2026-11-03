"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="mb-2 text-lg font-semibold">Link expired</h1>
          <p className="text-sm text-neutral-400">
            This invite link isn&apos;t valid anymore. Ask your team lead to
            send you a new invite, or{" "}
            <a href="/login" className="text-fel-blue underline">
              sign in
            </a>{" "}
            if you&apos;ve already set a password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-fel-border bg-fel-panel p-8 shadow-xl">
        <h1 className="mb-2 text-xl font-semibold">Set your password</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Choose a password to finish setting up your FEL Load List account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              New password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-fel-border bg-fel-panel2 px-3 py-2 text-sm outline-none focus:border-fel-blue"
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
            {loading ? "Saving..." : "Save password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
