import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/domain/access/access-rules";

// A raiz não tem tela: o proxy.ts já leva cada pessoa para a área dela.
// Este redirect só vale quando o proxy está desligado (sem .env.local).
export default function Home() {
  redirect(LOGIN_PATH);
}
