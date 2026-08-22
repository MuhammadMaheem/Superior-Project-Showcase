import { TelemetryDashboardClient } from "@/components/TelemetryDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminTelemetryPage() {
  return <TelemetryDashboardClient />;
}
