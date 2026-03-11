"use client";

import { useEffect, useMemo, useState } from "react";
import { HardDrive, RefreshCw, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { api } from "@/lib/api";

type User = { id: string; email: string; full_name: string; is_active: boolean };

type Usage = { email: string; used_bytes: number };

function formatStorage(bytes: number) {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("ChangeMe123!");
  const [role, setRole] = useState("employee");
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<"name" | "email">("name");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [u, s] = await Promise.all([api<User[]>("/admin/users"), api<Usage[]>("/admin/storage-usage")]);
      setUsers(u);
      setUsage(s);
    } catch (err) {
      setUsers([]);
      setUsage([]);
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, full_name: name, password, role }),
      });
      setEmail("");
      setName("");
      setPassword("ChangeMe123!");
      setStatus("User invited successfully");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    }
  }

  const visibleUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (!query) return true;
      return [user.full_name, user.email].some((field) => field.toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      if (userSort === "email") return a.email.localeCompare(b.email);
      return a.full_name.localeCompare(b.full_name);
    });
  }, [users, userSearch, userSort]);

  const totalStorageMb = Math.round(usage.reduce((sum, row) => sum + row.used_bytes, 0) / 1024 / 1024);
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.length - activeUsers;

  return (
    <LayoutShell>
      <div className="space-y-5">
        <section className="glass overflow-hidden rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 text-xs font-medium opacity-80">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Administration workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Admin Center</h1>
              <p className="mt-3 max-w-3xl text-sm opacity-70 sm:text-base">
                Manage users, invitations, and storage oversight from a cleaner control surface designed for faster daily operations.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh admin data"}
                </button>
                <div className="rounded-2xl border border-border px-4 py-2.5 text-sm opacity-70">
                  {visibleUsers.length} filtered users visible
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-card/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-45">Users</p>
                <p className="mt-2 text-2xl font-semibold">{users.length}</p>
                <p className="mt-1 text-sm opacity-60">Registered team members</p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-card/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-45">Active</p>
                <p className="mt-2 text-2xl font-semibold">{activeUsers}</p>
                <p className="mt-1 text-sm opacity-60">Accounts currently enabled</p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-card/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-45">Inactive</p>
                <p className="mt-2 text-2xl font-semibold">{inactiveUsers}</p>
                <p className="mt-1 text-sm opacity-60">Accounts needing review</p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-card/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-45">Storage</p>
                <p className="mt-2 text-2xl font-semibold">{totalStorageMb >= 1024 ? `${(totalStorageMb / 1024).toFixed(2)} GB` : `${totalStorageMb} MB`}</p>
                <p className="mt-1 text-sm opacity-60">Combined user usage</p>
              </div>
            </div>
          </div>
        </section>

        {status && (
          <div className="glass rounded-[1.5rem] border border-border bg-card/50 p-4 text-sm">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.2fr]">
          <form onSubmit={inviteUser} className="glass rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-start gap-4 border-b border-border/60 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-45">User access</p>
                <h2 className="mt-1 text-xl font-semibold">Invite user</h2>
                <p className="mt-2 text-sm opacity-65">Create a new user with a temporary password and assign the right role from the start.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full rounded-2xl border border-border bg-transparent px-3 py-2.5" required />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="w-full rounded-2xl border border-border bg-transparent px-3 py-2.5" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Temporary password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className="w-full rounded-2xl border border-border bg-transparent px-3 py-2.5" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-border bg-transparent px-3 py-2.5">
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-card/30 p-4 text-sm opacity-70">
              New users can sign in immediately with the temporary password and change it after first access.
            </div>

            <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              <UserPlus className="h-4 w-4" />
              Send invite
            </button>
          </form>

          <section className="glass rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-45">Directory</p>
                  <h3 className="mt-1 text-xl font-semibold">Users</h3>
                  <p className="mt-2 text-sm opacity-65">Review user accounts quickly with search and sorting controls.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name or email"
                    className="w-full rounded-2xl border border-border bg-transparent py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as "name" | "email")}
                  className="rounded-2xl border border-border bg-transparent px-3 py-2.5 text-sm"
                >
                  <option value="name">Sort by name</option>
                  <option value="email">Sort by email</option>
                </select>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm">
              {visibleUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border bg-card/25 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.full_name}</p>
                    <p className="mt-1 truncate text-xs opacity-70">{u.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${u.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {u.is_active ? "active" : "inactive"}
                  </span>
                </li>
              ))}
              {visibleUsers.length === 0 && <li className="rounded-[1.5rem] border border-dashed border-border p-5 text-center opacity-60">No users match this filter.</li>}
            </ul>
          </section>
        </div>

        <section className="glass rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-start gap-4 border-b border-border/60 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-45">Capacity</p>
              <h3 className="mt-1 text-xl font-semibold">Storage usage</h3>
              <p className="mt-2 text-sm opacity-65">See which accounts consume the most storage across the cloud environment.</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
            {usage.map((u) => (
              <li key={u.email} className="rounded-[1.5rem] border border-border bg-card/25 p-4">
                <p className="truncate font-medium">{u.email}</p>
                <p className="mt-2 text-lg font-semibold">{formatStorage(u.used_bytes)}</p>
                <p className="mt-1 text-xs opacity-55">Current allocated usage</p>
              </li>
            ))}
            {usage.length === 0 && <li className="rounded-[1.5rem] border border-dashed border-border p-5 text-center opacity-60 md:col-span-2 xl:col-span-3">No storage data available.</li>}
          </ul>
        </section>
      </div>
    </LayoutShell>
  );
}
