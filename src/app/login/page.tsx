import { LoginForm, Logo } from "@/components";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo width={220} />
      <LoginForm />
    </main>
  );
}
