import Link from "next/link";
import { OperatorProfileCard } from "../../components/dashboard/OperatorProfileCard";
import { SitesOverview } from "../../components/dashboard/SitesOverview";

export default function DashboardPage() {
  return (
    <main className="column">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Operator Sites</h1>
        <Link href="/dashboard/sites/new">Create site</Link>
      </div>
      <OperatorProfileCard />
      <SitesOverview />
    </main>
  );
}
