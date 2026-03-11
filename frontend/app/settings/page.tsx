"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Cog,
  HardDrive,
  PackageCheck,
  RefreshCw,
  Server,
  ShoppingBag,
  Sparkles,
  Store,
  WandSparkles,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { api, apiRaw } from "@/lib/api";

type StorageInfo = {
  current_path: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent_used: number;
};

type MountPoint = {
  path: string;
  device: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
};

type SystemInfo = {
  hostname: string;
  platform: string;
  cpu_cores: number;
  python_version: string;
  storage: StorageInfo;
  available_mounts: MountPoint[];
};

type UpdatePackage = {
  name: string;
  channel: string;
  size_bytes: number;
  modified_at: string;
};

type UpdateStatus = {
  state: string;
  package_name?: string | null;
  channel?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  return_code?: number | null;
  stdout?: string | null;
  stderr?: string | null;
};

type UpdateConfig = {
  selected_channel: "stable" | "beta";
  stable_source_url: string;
  beta_source_url: string;
  auto_rebuild_docker: boolean;
  auto_update_ubuntu: boolean;
  docker_update_command: string;
  ubuntu_update_command: string;
};

type ShopifyConfig = {
  store_domain: string;
  api_version: string;
  has_access_token: boolean;
  has_client_credentials: boolean;
};

type GelatoConfig = {
  base_url: string;
  has_api_key: boolean;
  sku_map: Record<string, string>;
};

function SectionShell({
  icon,
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="glass overflow-hidden rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            {icon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-45">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm opacity-65">{description}</p>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm opacity-60">{hint}</p>
    </div>
  );
}

function getUpdateStateTone(state?: string) {
  if (!state) return "bg-card/40 text-fg";
  if (state === "success") return "bg-green-500/15 text-green-600 dark:text-green-300";
  if (state === "failed" || state === "error") return "bg-red-500/15 text-red-600 dark:text-red-300";
  if (state === "running") return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300";
  return "bg-card/40 text-fg";
}

export default function SettingsPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [newPath, setNewPath] = useState("");
  const [packages, setPackages] = useState<UpdatePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig | null>(null);
  const [updateChannel, setUpdateChannel] = useState<"stable" | "beta">("stable");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [fetchBusy, setFetchBusy] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyApiVersion, setShopifyApiVersion] = useState("2024-10");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [shopifyHasToken, setShopifyHasToken] = useState(false);
  const [shopifyClientId, setShopifyClientId] = useState("");
  const [shopifyClientSecret, setShopifyClientSecret] = useState("");
  const [shopifyHasClientCredentials, setShopifyHasClientCredentials] = useState(false);
  const [shopifyBusy, setShopifyBusy] = useState(false);
  const [shopifyTestStatus, setShopifyTestStatus] = useState("");
  const [testShopifyBusy, setTestShopifyBusy] = useState(false);
  const [gelatoBaseUrl, setGelatoBaseUrl] = useState("https://order.gelatoapis.com");
  const [gelatoApiKey, setGelatoApiKey] = useState("");
  const [gelatoHasKey, setGelatoHasKey] = useState(false);
  const [gelatoSkuMapText, setGelatoSkuMapText] = useState("{}");
  const [gelatoBusy, setGelatoBusy] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<"all" | "core" | "storage" | "integrations" | "updates">("all");
  const [sectionSearch, setSectionSearch] = useState("");

  useEffect(() => {
    loadInfo();
    loadUpdateData();
    loadUpdateConfig();
    loadShopifyConfig();
    loadGelatoConfig();
  }, []);

  async function loadInfo() {
    setLoading(true);
    try {
      const data = await api<SystemInfo>("/system/info");
      setInfo(data);
      setNewPath(data.storage.current_path);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load system info");
    }
    setLoading(false);
  }

  async function loadUpdateData() {
    try {
      const [packageRows, latest] = await Promise.all([
        api<UpdatePackage[]>("/system/update/packages"),
        api<UpdateStatus>("/system/update/status"),
      ]);
      setPackages(packageRows);
      setUpdateStatus(latest);
      if (!selectedPackage && packageRows.length > 0) {
        setSelectedPackage(packageRows[0].name);
      }
    } catch {
      // keep update section optional if unavailable
    }
  }

  async function loadUpdateConfig() {
    try {
      const config = await api<UpdateConfig>("/system/update/config");
      setUpdateConfig(config);
      setUpdateChannel(config.selected_channel || "stable");
    } catch {
      // keep section optional if route not yet available
    }
  }

  async function saveUpdateConfig() {
    if (!updateConfig) return;
    setUpdateBusy(true);
    setStatus("");
    try {
      const saved = await api<UpdateConfig>("/system/update/config", {
        method: "PUT",
        body: JSON.stringify({ ...updateConfig, selected_channel: updateChannel }),
      });
      setUpdateConfig(saved);
      setStatus("Update channel settings saved");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save update settings");
    }
    setUpdateBusy(false);
  }

  async function fetchLatestUpdate() {
    setFetchBusy(true);
    setStatus("");
    try {
      const fetched = await api<UpdatePackage>("/system/update/fetch-latest", {
        method: "POST",
        body: JSON.stringify({ channel: updateChannel }),
      });
      setStatus(`Latest ${updateChannel} update fetched: ${fetched.name}`);
      await loadUpdateData();
      setSelectedPackage(fetched.name);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to fetch latest update");
    }
    setFetchBusy(false);
  }

  async function uploadUpdatePackage() {
    if (!updateFile) return;
    setUpdateBusy(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("upload", updateFile);
      formData.append("channel", updateChannel);
      const response = await apiRaw("/system/update/upload", {
        method: "POST",
        body: formData,
      });

      setStatus("Update package uploaded");
      setUpdateFile(null);
      await loadUpdateData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Update package upload failed");
    }
    setUpdateBusy(false);
  }

  async function applyUpdate() {
    if (!selectedPackage) return;
    setUpdateBusy(true);
    setStatus("");
    try {
      const result = await api<UpdateStatus>("/system/update/apply", {
        method: "POST",
        body: JSON.stringify({
          package_name: selectedPackage,
          channel: updateChannel,
          script_name: "update.sh",
          dry_run: dryRun,
          auto_rebuild_docker: updateConfig?.auto_rebuild_docker,
          auto_update_ubuntu: updateConfig?.auto_update_ubuntu,
        }),
      });
      setUpdateStatus(result);
      setStatus(result.state === "success" ? "Update completed" : "Update failed");
      await loadUpdateData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Update failed");
      await loadUpdateData();
    }
    setUpdateBusy(false);
  }

  async function loadShopifyConfig() {
    try {
      const row = await api<ShopifyConfig>("/shopify/config");
      setShopifyDomain(row.store_domain || "");
      setShopifyApiVersion(row.api_version || "2024-10");
      setShopifyHasToken(Boolean(row.has_access_token));
      setShopifyHasClientCredentials(Boolean(row.has_client_credentials));
    } catch {
      // keep section optional if route not yet available
    }
  }

  async function testShopifyConnection() {
    setTestShopifyBusy(true);
    setShopifyTestStatus("");
    try {
      const result = await api<{ success: boolean; message: string; store_domain: string }>("/shopify/test");
      setShopifyTestStatus(result.message + ` (${result.store_domain})`);
    } catch (err) {
      setShopifyTestStatus(err instanceof Error ? err.message : "Connection test failed");
    }
    setTestShopifyBusy(false);
  }

  async function saveShopifyConfig() {
    setShopifyBusy(true);
    setStatus("");
    try {
      const payload: {
        store_domain: string;
        api_version: string;
        access_token?: string;
        client_id?: string;
        client_secret?: string;
      } = {
        store_domain: shopifyDomain,
        api_version: shopifyApiVersion,
      };
      if (shopifyAccessToken.trim()) {
        payload.access_token = shopifyAccessToken.trim();
      }
      if (shopifyClientId.trim()) {
        payload.client_id = shopifyClientId.trim();
      }
      if (shopifyClientSecret.trim()) {
        payload.client_secret = shopifyClientSecret.trim();
      }

      const result = await api<{ message: string }>("/shopify/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(result.message);
      setShopifyAccessToken("");
      setShopifyClientSecret("");
      await loadShopifyConfig();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save Shopify config");
    }
    setShopifyBusy(false);
  }

  async function loadGelatoConfig() {
    try {
      const row = await api<GelatoConfig>("/gelato/config");
      setGelatoBaseUrl(row.base_url || "https://order.gelatoapis.com");
      setGelatoHasKey(Boolean(row.has_api_key));
      setGelatoSkuMapText(JSON.stringify(row.sku_map || {}, null, 2));
    } catch {
      // keep section optional if route not yet available
    }
  }

  async function saveGelatoConfig() {
    setGelatoBusy(true);
    setStatus("");
    try {
      const parsed = JSON.parse(gelatoSkuMapText || "{}") as Record<string, string>;
      const payload: { base_url: string; sku_map: Record<string, string>; api_key?: string } = {
        base_url: gelatoBaseUrl,
        sku_map: parsed,
      };
      if (gelatoApiKey.trim()) {
        payload.api_key = gelatoApiKey.trim();
      }

      const result = await api<{ message: string }>("/gelato/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(result.message);
      setGelatoApiKey("");
      await loadGelatoConfig();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save Gelato config");
    }
    setGelatoBusy(false);
  }

  async function updateStoragePath(path: string) {
    setStatus("");
    try {
      const response = await api<{ message: string; new_path: string }>("/system/storage-path", {
        method: "POST",
        body: JSON.stringify({ new_path: path }),
      });
      setStatus(response.message);
      await loadInfo();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update storage path");
    }
  }

  function getStorageColor(percent: number): string {
    if (percent > 90) return "bg-red-500";
    if (percent > 75) return "bg-yellow-500";
    return "bg-green-500";
  }

  const visibleSectionCount = useMemo(() => {
    const query = sectionSearch.trim().toLowerCase();
    const sections = [
      { key: "core", title: "System Information" },
      { key: "storage", title: "Current Storage" },
      { key: "storage", title: "Available Mount Points" },
      { key: "integrations", title: "Shopify Integration" },
      { key: "integrations", title: "Gelato Integration" },
      { key: "updates", title: "System Updates" },
    ];

    return sections.filter((section) => {
      if (sectionFilter !== "all" && section.key !== sectionFilter) return false;
      if (!query) return true;
      return section.title.toLowerCase().includes(query);
    }).length;
  }, [sectionFilter, sectionSearch]);

  const channelPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (!pkg.channel || pkg.channel === "manual") return true;
      return pkg.channel === updateChannel;
    });
  }, [packages, updateChannel]);

  function shouldShowSection(sectionKey: "core" | "storage" | "integrations" | "updates", title: string): boolean {
    if (sectionFilter !== "all" && sectionFilter !== sectionKey) return false;
    const query = sectionSearch.trim().toLowerCase();
    if (!query) return true;
    return title.toLowerCase().includes(query);
  }

  const configuredIntegrations = Number(shopifyHasToken) + Number(gelatoHasKey);
  const activeStorageUsage = info?.storage.percent_used ?? 0;

  return (
    <LayoutShell>
      <div className="space-y-5">
        <section className="glass overflow-hidden rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 text-xs font-medium opacity-80">
                <WandSparkles className="h-3.5 w-3.5 text-accent" />
                Refined system control center
              </div>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">System Settings</h1>
              <p className="mt-3 max-w-3xl text-sm opacity-70 sm:text-base">
                Manage infrastructure, storage, integrations, and update workflows from a clearer professional settings experience.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    loadInfo();
                    loadUpdateData();
                    loadUpdateConfig();
                    loadShopifyConfig();
                    loadGelatoConfig();
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh settings"}
                </button>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm opacity-75">
                  <Cog className="h-4 w-4" />
                  {visibleSectionCount} visible sections
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Visible" value={visibleSectionCount} hint="Sections matching current filters" />
              <StatCard label="Mounts" value={info?.available_mounts?.length || 0} hint="Detected storage targets" />
              <StatCard label="Integrations" value={configuredIntegrations} hint="Connected external services" />
              <StatCard label="Storage" value={`${activeStorageUsage.toFixed(0)}%`} hint="Current disk usage" />
            </div>
          </div>
        </section>

        <section className="glass sticky top-3 z-20 rounded-[1.75rem] p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Find the right setting faster</p>
              <p className="text-xs opacity-55">Filter by area or search by section name.</p>
            </div>
            <div className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">Professional view</div>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={sectionSearch}
              onChange={(e) => setSectionSearch(e.target.value)}
              placeholder="Find section (system, storage, integration, updates)"
              className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as "all" | "core" | "storage" | "integrations" | "updates")}
              className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
            >
              <option value="all">All sections</option>
              <option value="core">Core</option>
              <option value="storage">Storage</option>
              <option value="integrations">Integrations</option>
              <option value="updates">Updates</option>
            </select>
          </div>
        </section>

        {status && (
          <div className="glass rounded-[1.5rem] border border-border/70 bg-card/50 p-4 text-sm">
            <p>{status}</p>
          </div>
        )}

        {shouldShowSection("core", "System Information") && (
        <SectionShell
          icon={<Server className="h-5 w-5" />}
          eyebrow="Core"
          title="System Information"
          description="A concise overview of the environment powering this cloud instance."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-card/30 p-3">
              <span className="text-xs font-medium opacity-70">Hostname</span>
              <p className="mt-1 font-mono text-sm">{info?.hostname || "-"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/30 p-3">
              <span className="text-xs font-medium opacity-70">Platform</span>
              <p className="mt-1 font-mono text-sm">{info?.platform || "-"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/30 p-3">
              <span className="text-xs font-medium opacity-70">CPU Cores</span>
              <p className="mt-1 font-mono text-sm">{info?.cpu_cores || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/30 p-3">
              <span className="text-xs font-medium opacity-70">Python Version</span>
              <p className="mt-1 font-mono text-sm">{info?.python_version || "-"}</p>
            </div>
          </div>
        </SectionShell>
        )}

        {shouldShowSection("storage", "Current Storage") && (
        <SectionShell
          icon={<HardDrive className="h-5 w-5" />}
          eyebrow="Storage"
          title="Current Storage"
          description="Monitor the active storage target and switch the main cloud file location safely."
          aside={
            <div className="rounded-2xl border border-border/70 bg-card/40 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] opacity-45">Usage</p>
              <p className="mt-1 text-lg font-semibold">{(info?.storage.free_gb ?? 0).toFixed(2)} GB free</p>
            </div>
          }
        >
          <div className="rounded-[1.5rem] border border-border bg-card/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{info?.storage.current_path || "-"}</p>
                <p className="mt-1 text-xs opacity-60">
                  {info?.storage.used_gb.toFixed(2)} GB used of {info?.storage.total_gb.toFixed(2)} GB (
                  {info?.storage.percent_used.toFixed(1)}%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{info?.storage.free_gb.toFixed(2)} GB free</p>
              </div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-card/50">
              <div
                className={`h-full transition-all duration-500 ${getStorageColor(info?.storage.percent_used || 0)}`}
                style={{ width: `${info?.storage.percent_used || 0}%` }}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-card/25 p-4">
            <label className="block text-sm font-medium">Change Storage Path</label>
            <p className="mt-1 text-xs opacity-60">Select a new path or mount point for storing cloud files</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/path/to/storage"
              />
              <button
                onClick={() => updateStoragePath(newPath)}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Update Path
              </button>
            </div>
          </div>
        </SectionShell>
        )}

        {shouldShowSection("storage", "Available Mount Points") && (
        <SectionShell
          icon={<Boxes className="h-5 w-5" />}
          eyebrow="Storage"
          title="Available Mount Points"
          description="Review detected disks and quickly switch to another mount when needed."
        >
          <div className="space-y-3">
            {info?.available_mounts && info.available_mounts.length > 0 ? (
              info.available_mounts.map((mount, index) => {
                const percent = mount.total_gb > 0 ? (mount.used_gb / mount.total_gb) * 100 : 0;
                return (
                  <div key={index} className="rounded-[1.5rem] border border-border bg-card/30 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium">{mount.path}</p>
                          {mount.path === info.storage.current_path && (
                            <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs opacity-60">
                          {mount.device} ({mount.fstype})
                        </p>
                        <p className="mt-1 text-xs opacity-60">
                          {mount.used_gb.toFixed(1)} GB / {mount.total_gb.toFixed(1)} GB used ({percent.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{mount.free_gb.toFixed(1)} GB free</p>
                        {mount.path !== info.storage.current_path && (
                          <button
                            onClick={() => {
                              setNewPath(mount.path);
                              updateStoragePath(mount.path);
                            }}
                            className="mt-2 rounded-lg border border-border bg-card px-3 py-1 text-xs transition hover:bg-accent/10"
                          >
                            Use this disk
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-card/50">
                      <div
                        className={`h-full transition-all duration-500 ${getStorageColor(percent)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm opacity-60">
                No mount points detected (may require Linux system with /proc/mounts)
              </div>
            )}
          </div>
        </SectionShell>
        )}

        {shouldShowSection("integrations", "Shopify Integration") && (
        <SectionShell
          icon={<Store className="h-5 w-5" />}
          eyebrow="Integrations"
          title="Shopify Integration"
          description="Connect Shopify to surface order data inside the cloud dashboard and fulfillment flow."
          aside={
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${shopifyHasToken ? "bg-green-500/15 text-green-600 dark:text-green-300" : "bg-card/40"}`}>
              {shopifyHasToken ? "Configured" : "Needs token"}
            </div>
          }
        >
          <p className="mt-2 text-xs opacity-70">
            Gebruik hier je <strong>.myshopify.com</strong> admin domein (niet je storefront domein zoals thokan.be).
          </p>
          <p className="mt-1 text-xs opacity-70">
            Access token: Shopify Admin → Apps and sales channels → Develop apps → jouw app → Configuration (scope: read_orders)
            → Install app → API credentials → Admin API access token.
          </p>
          <p className="mt-1 text-xs opacity-70">
            Client ID/Secret kun je optioneel bewaren voor referentie, maar voor orders is altijd een Admin API access token nodig.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Store Domain</label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="your-store.myshopify.com"
                value={shopifyDomain}
                onChange={(e) => setShopifyDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">API Version</label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="2024-10"
                value={shopifyApiVersion}
                onChange={(e) => setShopifyApiVersion(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium">Admin API Access Token</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              placeholder={shopifyHasToken ? "Token already saved (leave empty to keep)" : "shpat_..."}
              value={shopifyAccessToken}
              onChange={(e) => setShopifyAccessToken(e.target.value)}
            />
            {shopifyHasToken && <p className="mt-1 text-xs opacity-60">A token is already stored securely.</p>}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Client ID (optional)</label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="Shopify app client id"
                value={shopifyClientId}
                onChange={(e) => setShopifyClientId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Client Secret (optional)</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder={shopifyHasClientCredentials ? "Already stored (leave empty to keep)" : "Shopify app client secret"}
                value={shopifyClientSecret}
                onChange={(e) => setShopifyClientSecret(e.target.value)}
              />
            </div>
          </div>
          {shopifyHasClientCredentials && (
            <p className="mt-1 text-xs opacity-60">Client credentials are already stored securely.</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={saveShopifyConfig}
              disabled={!shopifyDomain || !shopifyApiVersion || shopifyBusy}
              className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {shopifyBusy ? "Saving..." : "Save Shopify Config"}
            </button>
            <button
              onClick={testShopifyConnection}
              disabled={!shopifyDomain || testShopifyBusy || !shopifyHasToken}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent/10 disabled:opacity-50"
            >
              {testShopifyBusy ? "Testing..." : "Test Connection"}
            </button>
          </div>
          {shopifyTestStatus && (
            <div className="mt-2 rounded-xl border border-border bg-card/50 p-3 text-sm">
              <p>{shopifyTestStatus}</p>
            </div>
          )}
        </SectionShell>
        )}

        {shouldShowSection("integrations", "Gelato Integration") && (
        <SectionShell
          icon={<ShoppingBag className="h-5 w-5" />}
          eyebrow="Integrations"
          title="Gelato Integration"
          description="Configure Gelato for product mapping, pricing, and order placement from Shopify orders."
          aside={
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${gelatoHasKey ? "bg-green-500/15 text-green-600 dark:text-green-300" : "bg-card/40"}`}>
              {gelatoHasKey ? "Connected" : "Needs API key"}
            </div>
          }
        >
          <p className="mt-1 text-sm opacity-60">
            Configure Gelato API for catalog discovery, pricing and order placement from Shopify orders.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Base URL</label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="https://order.gelatoapis.com"
                value={gelatoBaseUrl}
                onChange={(e) => setGelatoBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">API Key</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder={gelatoHasKey ? "API key already saved (leave empty to keep)" : "Gelato API key"}
                value={gelatoApiKey}
                onChange={(e) => setGelatoApiKey(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium">SKU mapping (Shopify SKU → Gelato productUid)</label>
            <p className="mt-1 text-xs opacity-60">Example: {`{ "TSHIRT-BLACK-M": "gelato-product-uid" }`}</p>
            <textarea
              className="mt-2 h-40 w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs"
              value={gelatoSkuMapText}
              onChange={(e) => setGelatoSkuMapText(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <button
              onClick={saveGelatoConfig}
              disabled={!gelatoBaseUrl || gelatoBusy}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {gelatoBusy ? "Saving..." : "Save Gelato Config"}
            </button>
          </div>
        </SectionShell>
        )}

        {shouldShowSection("updates", "System Updates") && (
        <SectionShell
          icon={<PackageCheck className="h-5 w-5" />}
          eyebrow="Updates"
          title="System Updates"
          description="Run stable or beta updates from your own source with clearer controls for fetch, upload, and apply flows."
          aside={
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${getUpdateStateTone(updateStatus?.state)}`}>
              {updateStatus?.state || "idle"}
            </div>
          }
        >
          <p className="mt-1 text-sm opacity-60">Gebruik stabiele of beta channel updates zonder GitHub-koppeling, direct vanaf je eigen updatebron.</p>

          <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-border bg-card/30 p-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Update channel</label>
              <select
                value={updateChannel}
                onChange={(e) => setUpdateChannel(e.target.value as "stable" | "beta")}
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="stable">stable</option>
                <option value="beta">beta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Latest source URL ({updateChannel})</label>
              <input
                type="text"
                value={updateChannel === "stable" ? updateConfig?.stable_source_url || "" : updateConfig?.beta_source_url || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setUpdateConfig((prev) => {
                    if (!prev) return prev;
                    return updateChannel === "stable"
                      ? { ...prev, stable_source_url: value }
                      : { ...prev, beta_source_url: value };
                  });
                }}
                placeholder="https://updates.example.com/stable/latest.json"
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs opacity-60">Ondersteunt direct archive URL (.zip/.tar/.tar.gz/.tgz) of manifest .json met package_url.</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(updateConfig?.auto_rebuild_docker)}
                onChange={(e) => setUpdateConfig((prev) => (prev ? { ...prev, auto_rebuild_docker: e.target.checked } : prev))}
              />
              Auto Docker rebuild na update
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(updateConfig?.auto_update_ubuntu)}
                onChange={(e) => setUpdateConfig((prev) => (prev ? { ...prev, auto_update_ubuntu: e.target.checked } : prev))}
              />
              Auto Ubuntu updates na update
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                onClick={saveUpdateConfig}
                disabled={!updateConfig || updateBusy}
                className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {updateBusy ? "Saving..." : "Save update settings"}
              </button>
              <button
                onClick={fetchLatestUpdate}
                disabled={fetchBusy || !updateConfig}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent/10 disabled:opacity-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                {fetchBusy ? "Fetching..." : `Fetch latest ${updateChannel}`}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept=".zip,.tar,.tar.gz,.tgz"
              onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              onClick={uploadUpdatePackage}
              disabled={!updateFile || updateBusy}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {updateBusy ? "Uploading..." : "Upload Package"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">Select update package ({updateChannel})</option>
              {channelPackages.map((pkg) => (
                <option key={pkg.name} value={pkg.name}>
                  [{pkg.channel || "manual"}] {pkg.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry run
            </label>
            <button
              onClick={applyUpdate}
              disabled={!selectedPackage || updateBusy}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {updateBusy ? "Applying..." : "Apply Update"}
            </button>
          </div>

          {updateStatus && (
            <div className="mt-4 rounded-[1.5rem] border border-border bg-card/30 p-4 text-sm">
              <p>
                Status: <span className="font-medium">{updateStatus.state}</span>
              </p>
              {updateStatus.channel && <p className="mt-1">Channel: {updateStatus.channel}</p>}
              {updateStatus.package_name && <p className="mt-1">Package: {updateStatus.package_name}</p>}
              {typeof updateStatus.return_code === "number" && <p className="mt-1">Return code: {updateStatus.return_code}</p>}
              {updateStatus.started_at && <p className="mt-1 opacity-70">Started: {new Date(updateStatus.started_at).toLocaleString()}</p>}
              {updateStatus.finished_at && <p className="mt-1 opacity-70">Finished: {new Date(updateStatus.finished_at).toLocaleString()}</p>}
              {updateStatus.stderr && (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs text-red-300">
                  {updateStatus.stderr}
                </pre>
              )}
              {updateStatus.stdout && (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs">
                  {updateStatus.stdout}
                </pre>
              )}
            </div>
          )}
        </SectionShell>
        )}

        {visibleSectionCount === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm opacity-60">
            No settings sections match this filter.
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
