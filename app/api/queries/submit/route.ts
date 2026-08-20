import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import { QuerySubmissionSchema } from "@/lib/sheets/models";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`query-submit:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 15,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many query submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Honeypot spam trap
    if (body.honeypot && body.honeypot.trim().length > 0) {
      return NextResponse.json({ success: true, message: "Query received" }, { status: 200 });
    }

    const validationResult = QuerySubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError, details: validationResult.error.flatten() }, { status: 400 });
    }

    const data = validationResult.data;

    const query = await dataAdapter.createQuery({
      name: data.name.trim(),
      email: data.email?.trim() || "",
      roll_number: data.roll_number?.trim() || "",
      related_project_id: data.related_project_id?.trim() || "",
      message: data.message.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent to the administration team.",
        queryId: query.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[QuerySubmit] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit query. Please try again." },
      { status: 500 }
    );
  }
}
