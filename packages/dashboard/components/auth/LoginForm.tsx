"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "./AuthShell";
import { loginWithEmail } from "../../lib/auth/actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Login failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Access your operator dashboard">
      <form className="column" onSubmit={onSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button disabled={submitting} type="submit">
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <div className="muted">
        No account? <Link href="/signup">Create one</Link>
      </div>
      <div className="muted">
        <Link href="/reset-password">Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
