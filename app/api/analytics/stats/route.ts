import { NextResponse } from "next/server";
import { getAggregatedTrafficStats } from "@/lib/analytics/tracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await getAggregatedTrafficStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[AnalyticsStats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
