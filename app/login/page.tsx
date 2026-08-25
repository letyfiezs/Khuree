import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default function Login() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span>Х</span>ҮРЭЭ
      </Link>
      <div className="auth-cinematic" />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
