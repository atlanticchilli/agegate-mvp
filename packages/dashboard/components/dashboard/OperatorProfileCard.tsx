"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/context";
import {
  getOrCreateOperatorProfile,
  updateOperatorProfile,
  type OperatorProfile
} from "../../lib/firestore/operator";

export function OperatorProfileCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.uid || !user.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const loadedProfile = await getOrCreateOperatorProfile({
          uid: user.uid,
          email: user.email
        });
        if (!cancelled) {
          setProfile(loadedProfile);
          setDisplayName(loadedProfile.displayName);
          setCompanyName(loadedProfile.companyName);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile().catch(() => {
      if (!cancelled) {
        setError("Failed to load profile");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.uid]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateOperatorProfile(profile.uid, {
        displayName: displayName.trim(),
        companyName: companyName.trim()
      });
      setSuccess("Profile updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Loading operator profile…</div>;
  }

  return (
    <form className="card column" onSubmit={onSubmit}>
      <h2>Operator profile</h2>
      <label>
        Display name
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label>
        Company name
        <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
      </label>
      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      <button disabled={saving} type="submit">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
