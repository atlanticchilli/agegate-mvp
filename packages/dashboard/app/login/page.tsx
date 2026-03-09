import { Suspense } from "react";
import { LoginForm } from "../../components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<main><div className="card">Loading login…</div></main>}>
      <LoginForm />
    </Suspense>
  );
}
