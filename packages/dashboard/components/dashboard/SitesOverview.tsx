"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/context";
import { getOrCreateOperatorProfile } from "../../lib/firestore/operator";
import { listOperatorSites, type DashboardSite } from "../../lib/firestore/sites";

export function SitesOverview() {
  const { user } = useAuth();
  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.uid || !user.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await getOrCreateOperatorProfile({
          uid: user.uid,
          email: user.email
        });
        const nextSites = await listOperatorSites(user.uid);
        if (!cancelled) {
          setSites(nextSites);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load sites");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setError("Failed to load sites");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.uid]);

  if (loading) {
    return <div className="card">Loading sites…</div>;
  }

  if (error) {
    return <div className="card error">{error}</div>;
  }

  return (
    <div className="column">
      {sites.length === 0 ? (
        <div className="card">
          <p>No sites yet.</p>
          <Link href="/dashboard/sites/new">Create your first site</Link>
        </div>
      ) : null}
      {sites.map((site) => (
        <div className="card row" key={site.id} style={{ justifyContent: "space-between" }}>
          <div className="column" style={{ gap: 4 }}>
            <strong>{site.name}</strong>
            <span className="muted">{site.domain}</span>
            <code>{site.siteKey}</code>
          </div>
          <Link href={`/dashboard/sites/${site.id}`}>Open</Link>
        </div>
      ))}
    </div>
  );
}
