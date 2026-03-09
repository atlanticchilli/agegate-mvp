"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <main>
        <div className="card">Loading account…</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
