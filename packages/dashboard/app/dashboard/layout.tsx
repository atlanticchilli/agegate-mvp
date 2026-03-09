"use client";

import { RequireAuth } from "../../components/auth/RequireAuth";
import { DashboardNav } from "../../components/dashboard/DashboardNav";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardNav />
      {children}
    </RequireAuth>
  );
}
