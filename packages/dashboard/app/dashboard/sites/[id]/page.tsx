"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSite, type DashboardSite } from "../../../../lib/firestore/sites";
import { SiteTabs } from "../../../../components/dashboard/SiteTabs";

type TabId = "embed" | "providers" | "settings" | "logs";

function normalizeTab(value: string | null): TabId {
  if (value === "providers" || value === "settings" || value === "logs") {
    return value;
  }
  return "embed";
}

export default function SiteDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [site, setSite] = useState<DashboardSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSite() {
      setLoading(true);
      setError("");
      try {
        const loadedSite = await getSite(params.id);
        if (!cancelled) {
          setSite(loadedSite);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load site");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSite().catch(() => {
      if (!cancelled) {
        setError("Failed to load site");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <main>
        <div className="card">Loading site…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="card error">{error}</div>
      </main>
    );
  }

  if (!site) {
    return (
      <main>
        <div className="card">Site not found.</div>
      </main>
    );
  }

  return (
    <main className="column">
      <h1>{site.name}</h1>
      <p className="muted">{site.domain}</p>
      <SiteTabs initialTab={normalizeTab(searchParams.get("tab"))} site={site} />
    </main>
  );
}
