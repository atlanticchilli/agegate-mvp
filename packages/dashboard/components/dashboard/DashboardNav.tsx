"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../../lib/auth/actions";
import { useAuth } from "../../lib/auth/context";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: "#fff"
      }}
    >
      <main className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>AgeGate Dashboard</strong>
          <Link href="/dashboard">
            <span className={pathname === "/dashboard" ? "pill" : ""}>Sites</span>
          </Link>
          <Link href="/dashboard/sites/new">
            <span className={pathname === "/dashboard/sites/new" ? "pill" : ""}>New Site</span>
          </Link>
        </div>
        <div className="row">
          <span className="muted">{user?.email ?? "Unknown user"}</span>
          <button onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </main>
    </header>
  );
}
