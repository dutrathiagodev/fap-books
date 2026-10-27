import { redirect } from "next/navigation";
import { LOGIN_PATH, ROLE_HOME } from "@/domain/access/access-rules";
import { getCurrentProfile } from "@/services/profile.service";
import type { Profile, UserRole } from "@/types/profile";

// Segunda barreira das páginas (a primeira é o proxy.ts): confere de novo quem está logado.
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(LOGIN_PATH);
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);
  return profile;
}
