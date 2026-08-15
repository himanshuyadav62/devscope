"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";
import { useState } from "react";

export function LoginForm({ next = "/" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next.startsWith("/") ? next : "/");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-[#d8dcd6] bg-white p-8 shadow-sm dark:border-[#2b3530] dark:bg-[#151b18]">
      <span className="grid size-10 place-items-center bg-[#1e5f4d] text-white">
        <Sparkles className="size-5" />
      </span>
      <h1 className="mt-6 font-heading text-3xl font-semibold">Welcome to Devscope</h1>
      <p className="mt-3 text-sm leading-6 text-[#69716d] dark:text-[#aab4af]">
        Sign in to keep your feed sources, discoveries, bookmarks, and library private.
      </p>
      <Button className="mt-7 w-full" onClick={signIn} disabled={loading}>
        {loading ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? <p className="mt-3 text-xs text-red-700 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
