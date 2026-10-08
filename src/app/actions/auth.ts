"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// Sai do sistema e volta para a tela de login.
export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
