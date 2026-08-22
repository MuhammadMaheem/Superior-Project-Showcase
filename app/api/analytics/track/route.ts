import { NextRequest, NextResponse } from "next/server";
import { recordVisitorEvent } from "@/lib/analytics/tracker";
import { getClientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

    await recordVisitorEvent({
      path: body.path || "/",
      projectId: body.projectId,
      projectTitle: body.projectTitle,
      referrer: body.referrer || request.headers.get("referer") || "Direct / Campus Network",
      device: isMobile ? "mobile" : "desktop",
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AnalyticsTrack] Error:", error);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
