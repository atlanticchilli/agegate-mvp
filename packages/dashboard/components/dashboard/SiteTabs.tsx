"use client";

import type { ProviderId } from "@agegate/shared";
import { useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/context";
import { exportLogsCsv, listLogs, type VerificationLog } from "../../lib/api/logs";
import { updateSite, type DashboardSite } from "../../lib/firestore/sites";
import { getProviderName, type DashboardProviderConfig } from "../../lib/providers";
import { maskSecretKey } from "../../lib/secrets";

type TabId = "embed" | "providers" | "settings" | "logs";

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: "embed", label: "Embed" },
  { id: "providers", label: "Providers" },
  { id: "settings", label: "Settings" },
  { id: "logs", label: "Logs" }
];

function ProviderEditor({
  site,
  onSaved
}: {
  site: DashboardSite;
  onSaved: (providers: DashboardProviderConfig[]) => void;
}) {
  const [providers, setProviders] = useState<DashboardProviderConfig[]>(site.providers || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateProvider(
    providerId: ProviderId,
    updater: (provider: DashboardProviderConfig) => DashboardProviderConfig
  ) {
    setProviders((current) =>
      current.map((provider) => (provider.providerId === providerId ? updater(provider) : provider))
    );
  }

  async function saveProviders() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const sanitizedProviders = providers.map((provider) => {
        const hasNewSecret = Boolean(provider.credentials.clientSecret);
        return {
          ...provider,
          credentialsRef: provider.credentialsRef || undefined,
          credentialsMeta: hasNewSecret
            ? {
                hasClientSecret: true,
                updatedAt: new Date().toISOString()
              }
            : provider.credentialsMeta
        };
      });

      await updateSite(site.id, { providers: sanitizedProviders });
      onSaved(
        sanitizedProviders.map((provider) => ({
          ...provider,
          credentials: {
            ...provider.credentials,
            clientSecret: ""
          }
        }))
      );
      setSuccess("Providers updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update providers");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="column">
      <p className="muted">
        Save only Secret Manager references/metadata in Firestore. Client secrets are treated as
        one-time input and are not displayed long-term.
      </p>
      {providers.map((provider) => (
        <div className="card column" key={provider.providerId}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{getProviderName(provider.providerId)}</strong>
            <label className="row">
              <input
                checked={provider.enabled}
                type="checkbox"
                onChange={(event) =>
                  updateProvider(provider.providerId, (current) => ({
                    ...current,
                    enabled: event.target.checked
                  }))
                }
              />
              Enabled
            </label>
          </div>
          <label>
            Client ID
            <input
              value={provider.credentials.clientId}
              onChange={(event) =>
                updateProvider(provider.providerId, (current) => ({
                  ...current,
                  credentials: {
                    ...current.credentials,
                    clientId: event.target.value
                  }
                }))
              }
            />
          </label>
          <label>
            Secret Manager reference
            <input
              placeholder="projects/<project>/secrets/<name>/versions/latest"
              value={provider.credentialsRef ?? ""}
              onChange={(event) =>
                updateProvider(provider.providerId, (current) => ({
                  ...current,
                  credentialsRef: event.target.value
                }))
              }
            />
          </label>
          <label>
            Client secret (one-time input)
            <input
              placeholder="Will not be displayed after save"
              type="password"
              value={provider.credentials.clientSecret}
              onChange={(event) =>
                updateProvider(provider.providerId, (current) => ({
                  ...current,
                  credentials: {
                    ...current.credentials,
                    clientSecret: event.target.value
                  }
                }))
              }
            />
          </label>
          <p className="muted">
            {provider.credentialsMeta?.hasClientSecret
              ? `Secret metadata saved (${provider.credentialsMeta.updatedAt}).`
              : "No stored secret metadata yet."}
          </p>
        </div>
      ))}
      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      <button disabled={saving} onClick={saveProviders} type="button">
        {saving ? "Saving…" : "Save providers"}
      </button>
    </div>
  );
}

function SettingsEditor({ site, onSaved }: { site: DashboardSite; onSaved: (site: DashboardSite) => void }) {
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [validity, setValidity] = useState(String(site.verificationValidityPeriod));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveSettings() {
    const parsedValidity = Number.parseInt(validity, 10);
    if (!Number.isFinite(parsedValidity) || parsedValidity <= 0) {
      setError("Verification validity period must be a positive number.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateSite(site.id, {
        name: name.trim(),
        domain: domain.trim(),
        verificationValidityPeriod: parsedValidity
      });
      onSaved({
        ...site,
        name: name.trim(),
        domain: domain.trim(),
        verificationValidityPeriod: parsedValidity
      });
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card column">
      <label>
        Site name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Domain
        <input value={domain} onChange={(event) => setDomain(event.target.value)} />
      </label>
      <label>
        Verification validity period (seconds)
        <input type="number" value={validity} onChange={(event) => setValidity(event.target.value)} />
      </label>
      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      <button disabled={saving} onClick={saveSettings} type="button">
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function LogsViewer({ siteId }: { siteId: string }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);

  async function loadLogs(reset = true) {
    if (!user) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const loadedLogs = await listLogs({
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
        siteId,
        idToken,
        cursor: reset ? undefined : cursor ?? undefined
      });
      setLogs((previous) => (reset ? loadedLogs.logs : [...previous, ...loadedLogs.logs]));
      setCursor(loadedLogs.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    if (!user) {
      return;
    }
    setError("");
    try {
      const idToken = await user.getIdToken();
      const csv = await exportLogsCsv({
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
        siteId,
        idToken
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `verification-logs-${siteId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export logs");
    }
  }

  return (
    <div className="column">
      <div className="row">
        <button disabled={loading} onClick={() => loadLogs(true)} type="button">
          {loading ? "Loading…" : "Load logs"}
        </button>
        <button disabled={loading || !cursor} onClick={() => loadLogs(false)} type="button">
          Load more
        </button>
        <button onClick={exportCsv} type="button">
          Export CSV
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {logs.length > 0 ? (
        <div className="card column">
          {logs.map((logItem) => (
            <div className="row" key={logItem.id} style={{ justifyContent: "space-between" }}>
              <span>{logItem.id}</span>
              <span className="muted">{logItem.status}</span>
              <span className="muted">{logItem.selectedProvider ?? "-"}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="muted">No logs loaded.</div>
      )}
    </div>
  );
}

export function SiteTabs({
  site,
  initialTab = "embed"
}: {
  site: DashboardSite;
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [currentSite, setCurrentSite] = useState(site);

  const embedSnippet = useMemo(() => {
    return `<script src="https://cdn.agegate.example/widget.js" data-site-key="${currentSite.siteKey}"></script>`;
  }, [currentSite.siteKey]);

  return (
    <div className="column">
      <div className="row">
        {TAB_ITEMS.map((tabItem) => (
          <button
            key={tabItem.id}
            style={{ background: tabItem.id === tab ? "#1d4ed8" : "#64748b" }}
            type="button"
            onClick={() => setTab(tabItem.id)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>
      {tab === "embed" ? (
        <div className="card column">
          <h3>Embed</h3>
          <div className="column" style={{ gap: 4 }}>
            <span className="muted">Site key</span>
            <code>{currentSite.siteKey}</code>
            <span className="muted">Secret key (masked after creation)</span>
            <code>{maskSecretKey(currentSite.secretKey)}</code>
            <span className="muted">Embed snippet</span>
            <textarea readOnly rows={3} value={embedSnippet} />
          </div>
        </div>
      ) : null}
      {tab === "providers" ? (
        <ProviderEditor
          site={currentSite}
          onSaved={(providers) => setCurrentSite((prev) => ({ ...prev, providers }))}
        />
      ) : null}
      {tab === "settings" ? (
        <SettingsEditor site={currentSite} onSaved={(nextSite) => setCurrentSite(nextSite)} />
      ) : null}
      {tab === "logs" ? <LogsViewer siteId={currentSite.id} /> : null}
    </div>
  );
}
