"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { signupWithEmail } from "../../lib/auth/actions";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await signupWithEmail(email.trim(), password);
      router.replace("/dashboard");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Signup failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Set up an operator dashboard login">
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
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          Confirm password
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button disabled={submitting} type="submit">
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <div className="muted">
        Already registered? <Link href="/login">Log in</Link>
      </div>
    </AuthShell>
  );
}
