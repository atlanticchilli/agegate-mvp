"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/context";
import { createSite } from "../../lib/firestore/sites";
import { defaultProviders } from "../../lib/providers";

export function NewSiteForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [verificationValidityPeriod, setVerificationValidityPeriod] = useState("3600");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    siteId: string;
    siteKey: string;
    secretKey: string;
  } | null>(null);

  const parsedValidityPeriod = useMemo(
    () => Number.parseInt(verificationValidityPeriod, 10),
    [verificationValidityPeriod]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.uid) {
      setError("You must be logged in.");
      return;
    }
    if (!Number.isFinite(parsedValidityPeriod) || parsedValidityPeriod <= 0) {
      setError("Verification validity must be a positive number of seconds.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = await createSite({
        operatorId: user.uid,
        name: name.trim(),
        domain: domain.trim(),
        verificationValidityPeriod: parsedValidityPeriod,
        providers: defaultProviders()
      });
      setCreated(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create site");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="card column">
        <h2>Site created</h2>
        <p className="success">
          Copy this secret key now. It will only be shown once and will be masked on later views.
        </p>
        <div className="column" style={{ gap: 4 }}>
          <span className="muted">Site key</span>
          <code>{created.siteKey}</code>
          <span className="muted">Secret key (one-time)</span>
          <code>{created.secretKey}</code>
        </div>
        <div className="row">
          <button onClick={() => router.push(`/dashboard/sites/${created.siteId}`)} type="button">
            Open site
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "#475569" }}
            type="button"
          >
            Back to overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card column" onSubmit={onSubmit}>
      <label>
        Site name
        <input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Domain
        <input
          placeholder="example.com"
          required
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        />
      </label>
      <label>
        Verification validity period (seconds)
        <input
          required
          type="number"
          value={verificationValidityPeriod}
          onChange={(event) => setVerificationValidityPeriod(event.target.value)}
        />
      </label>
      {error ? <div className="error">{error}</div> : null}
      <button disabled={submitting} type="submit">
        {submitting ? "Creating…" : "Create site"}
      </button>
    </form>
  );
}
