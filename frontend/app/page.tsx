"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cloud, FolderOpen, Mail, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ensureSession } from "@/lib/api";

type SessionState = "loading" | "authenticated" | "guest";

const featureCards = [
  {
    title: "Files",
    description: "Manage cloud storage, recent uploads, and team documents from one clean workspace.",
    href: "/files",
    icon: FolderOpen,
  },
  {
    title: "Mail",
    description: "Read inbox and sent messages in a focused interface with faster navigation.",
    href: "/mail",
    icon: Mail,
  },
  {
    title: "Admin",
    description: "Monitor users, storage, and platform health with a professional control surface.",
    href: "/admin",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    description: "Control updates, environment options, and mailbox configuration in one place.",
    href: "/settings",
    icon: Settings,
  },
];

export default function HomePage() {
  const [sessionState, setSessionState] = useState<SessionState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const authenticated = await ensureSession();
      if (cancelled) return;
      setSessionState(authenticated ? "authenticated" : "guest");
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const primaryAction = useMemo(() => {
    if (sessionState === "authenticated") {
      return { href: "/dashboard", label: "Open dashboard" };
    }
    return { href: "/login", label: "Sign in" };
  }, [sessionState]);

  return (
    <div className="min-h-screen overflow-hidden bg-bg">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass sticky top-3 z-20 rounded-3xl px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Cloud className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">ThoKan</p>
                <h1 className="text-2xl font-semibold">Cloud workspace</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <Link href={primaryAction.href} className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                {sessionState === "loading" ? "Checking session..." : primaryAction.label}
              </Link>
              {sessionState !== "authenticated" && (
                <Link href="/register" className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-card/70">
                  Create account
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 py-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-accent/10 p-6 shadow-glass sm:p-8 lg:p-10">
            <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium opacity-80">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Professional cloud control center
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                    A cleaner, faster home for your files, mail, and operations.
                  </h2>
                  <p className="max-w-2xl text-base opacity-70 sm:text-lg">
                    ThoKan Cloud now starts with a modern overview page that gives direct access to the tools your team uses most.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={primaryAction.href} className="rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
                    {sessionState === "authenticated" ? "Go to dashboard" : "Enter cloud"}
                  </Link>
                  <Link href="/files" className="rounded-2xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-card/70">
                    Browse files
                  </Link>
                  <Link href="/mail" className="rounded-2xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-card/70">
                    Open mailbox
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">Storage</p>
                    <p className="mt-2 text-lg font-semibold">Centralized files</p>
                    <p className="mt-1 text-sm opacity-65">Quick access to uploads, recent items, and shared work.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">Mail</p>
                    <p className="mt-2 text-lg font-semibold">Inbox + Sent</p>
                    <p className="mt-1 text-sm opacity-65">One place to review conversations and respond faster.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">Control</p>
                    <p className="mt-2 text-lg font-semibold">Platform settings</p>
                    <p className="mt-1 text-sm opacity-65">Updates, environment actions, and system controls.</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-[2rem] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Workspace status</p>
                    <p className="text-xs opacity-55">Live overview of the cloud surface</p>
                  </div>
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-500">
                    {sessionState === "loading" ? "Checking" : sessionState === "authenticated" ? "Ready" : "Guest"}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dashboard access</span>
                      <span className="text-xs opacity-55">Always available</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-card/70">
                      <div className="h-full w-full rounded-full bg-accent" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mail workspace</span>
                      <span className="text-xs opacity-55">Redesigned</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-card/70">
                      <div className="h-full w-[88%] rounded-full bg-sky-400" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Update controls</span>
                      <span className="text-xs opacity-55">Stable + beta</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-card/70">
                      <div className="h-full w-[92%] rounded-full bg-violet-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="glass group rounded-3xl p-5 transition hover:-translate-y-0.5 hover:bg-card/80"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent transition group-hover:bg-accent/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm opacity-65">{card.description}</p>
                  <div className="mt-4 text-sm font-medium text-accent">Open {card.title.toLowerCase()} →</div>
                </Link>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}

