"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { api } from "@/lib/api";

type User = { id: string; email: string; full_name: string; is_active: boolean };

type Usage = { email: string; used_bytes: number };

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

  return (
    <LayoutShell>
      <div className="space-y-4">
        <div className="glass sticky top-3 z-20 flex items-center justify-between rounded-2xl p-4 backdrop-blur">
          <h1 className="text-2xl font-bold">Admin Center</h1>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition hover:bg-accent/10 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/30 p-3">
            <p className="text-xs opacity-60">Total users</p>
            <p className="mt-1 text-2xl font-semibold">{users.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card/30 p-3">
            <p className="text-xs opacity-60">Active users</p>
            <p className="mt-1 text-2xl font-semibold">{users.filter((u) => u.is_active).length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card/30 p-3">
            <p className="text-xs opacity-60">Combined storage</p>
            <p className="mt-1 text-2xl font-semibold">{totalStorageMb} MB</p>
          </div>
        </div>

        {status && (
          <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={inviteUser} className="glass rounded-2xl p-4">
          <h2 className="text-lg font-semibold">Invite user</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-border bg-transparent px-3 py-2" required />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-xl border border-border bg-transparent px-3 py-2" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className="rounded-xl border border-border bg-transparent px-3 py-2" required />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-border bg-transparent px-3 py-2">
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button className="mt-3 rounded-xl bg-accent/80 px-4 py-2 text-white">Send invite</button>
        </form>

        <section className="glass rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Users</h3>
            <div className="flex gap-2">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name or email"
                className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
              />
              <select
                value={userSort}
                onChange={(e) => setUserSort(e.target.value as "name" | "email")}
                className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
              >
                <option value="name">Sort by name</option>
                <option value="email">Sort by email</option>
              </select>
            </div>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {visibleUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl border border-border p-2">
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-xs opacity-70">{u.email}</p>
                </div>
                <span className={`rounded-lg px-2 py-1 text-xs ${u.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                  {u.is_active ? "active" : "inactive"}
                </span>
              </li>
            ))}
            {visibleUsers.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center opacity-60">No users match this filter.</li>}
          </ul>
        </section>

        <section className="glass rounded-2xl p-4">
          <h3 className="font-medium">Storage usage</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {usage.map((u) => (
              <li key={u.email} className="rounded-xl border border-border p-2">
                {u.email}: {Math.round(u.used_bytes / 1024 / 1024)} MB
              </li>
            ))}
            {usage.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center opacity-60">No storage data available.</li>}
          </ul>
        </section>
      </div>
    </LayoutShell>
  );
}
