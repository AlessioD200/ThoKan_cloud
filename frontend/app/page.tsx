"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function routeBySession() {
      const authenticated = await ensureSession();
      if (cancelled) return;
      router.replace(authenticated ? "/dashboard" : "/login");
    }

    void routeBySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm opacity-60">Redirecting...</p>
    </div>
  );
}

