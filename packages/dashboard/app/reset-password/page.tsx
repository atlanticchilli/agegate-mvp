"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { resetPassword } from "../../lib/auth/actions";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSuccess("Password reset email sent.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Reset failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Send a password reset email">
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
        {error ? <div className="error">{error}</div> : null}
        {success ? <div className="success">{success}</div> : null}
        <button disabled={submitting} type="submit">
          {submitting ? "Sending…" : "Send reset email"}
        </button>
      </form>
      <div className="muted">
        <Link href="/login">Back to login</Link>
      </div>
    </AuthShell>
  );
}
