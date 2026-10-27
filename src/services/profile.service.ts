import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Profile, UserRole } from "@/types/profile";

// Devolve o perfil de quem está logado, ou null (sem login ou perfil inativo).
// O RLS garante que cada pessoa só enxerga o próprio perfil.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role as UserRole,
  };
}
