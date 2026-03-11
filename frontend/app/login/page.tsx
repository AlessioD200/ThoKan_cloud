"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const notice = sessionStorage.getItem("auth_notice");
    if (notice) {
      setError(notice);
      sessionStorage.removeItem("auth_notice");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      sessionStorage.removeItem("auth_notice");
      
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-border/60 bg-card/35 shadow-glass lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-border/60 bg-gradient-to-br from-card via-card to-accent/10 p-8 lg:block xl:p-10">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 text-xs font-medium opacity-80">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Secure cloud access
              </div>
              <img src="/Logo_tekst_CV.png" alt="ThoKan Cloud" className="mt-6 h-16 w-auto" />
              <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">
                Welcome back to a cleaner ThoKan Cloud workspace.
              </h1>
              <p className="mt-4 max-w-xl text-base opacity-70">
                Sign in to continue working with files, mail, orders, and platform controls from one consistent interface.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border border-border/70 bg-card/45 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Protected access</p>
                    <p className="text-xs opacity-60">Session-based authentication with secure token flow.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-card/45 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Direct workspace access</p>
                    <p className="text-xs opacity-60">Jump straight into your dashboard after login.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-8 xl:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-45">Authentication</p>
              <h2 className="mt-2 text-3xl font-semibold">Sign in</h2>
              <p className="mt-2 text-sm opacity-70">Use your account credentials to open the cloud workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-card/35 p-4 text-sm opacity-70">
              Need an account? Ask an administrator or continue to registration if self-signup is enabled.
            </div>

            <p className="mt-6 text-center text-sm opacity-60">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Register
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
