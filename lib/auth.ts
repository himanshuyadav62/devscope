import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    name:
      typeof claims.name === "string"
        ? claims.name
        : typeof claims.full_name === "string"
          ? claims.full_name
          : null,
    avatarUrl:
      typeof claims.avatar_url === "string" ? claims.avatar_url : null,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required.");
  return user;
}
