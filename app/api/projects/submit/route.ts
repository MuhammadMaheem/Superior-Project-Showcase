import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";
import { ProjectSubmissionSchema } from "@/lib/sheets/models";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { processScreenshotBase64 } from "@/lib/security/image";
import { parseAndValidateGitHubUrl } from "@/lib/security/ssrf";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`project-submit:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 15,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Submission rate limit exceeded. Please wait before submitting another project." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 1. Anti-spam Honeypot Check
    if (body.honeypot && body.honeypot.trim().length > 0) {
      // Spam detected: silently return fake success or 400
      return NextResponse.json(
        { success: true, message: "Project received for moderation" },
        { status: 200 }
      );
    }

    // 2. Validate with Zod
    const validationResult = ProjectSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError, details: validationResult.error.flatten() }, { status: 400 });
    }

    const data = validationResult.data;

    // 3. Strict SSRF check on GitHub URL
    const ghCheck = parseAndValidateGitHubUrl(data.github_url);
    if (!ghCheck.isValid) {
      return NextResponse.json({ error: ghCheck.error || "Invalid GitHub repository URL" }, { status: 400 });
    }

    // 4. Process screenshots server-side (magic bytes, EXIF strip, Sharp resize/compression)
    const rawScreenshots = data.screenshots || [];
    const processedScreenshots: string[] = [];

    for (let i = 0; i < Math.min(rawScreenshots.length, 4); i++) {
      const rawImg = rawScreenshots[i];
      if (rawImg) {
        const processed = await processScreenshotBase64(rawImg);
        if (processed) {
          processedScreenshots.push(processed);
        }
      }
    }

    // 5. Create project record with status = published
    const newProject = await dataAdapter.createProject({
      roll_number: data.roll_number.trim().toUpperCase(),
      student_name: data.student_name.trim(),
      student_avatar_url: data.student_avatar_url?.trim() || "",
      project_title: data.project_title.trim(),
      description: data.description.trim(),
      tech_stack: data.tech_stack.trim(),
      github_url: data.github_url.trim(),
      live_url: data.live_url?.trim() || "",
      linkedin_url: data.linkedin_url?.trim() || "",
      email: data.email?.trim() || "",
      batch_section: data.batch_section.trim(),
      subject: data.subject.trim(),
      supervisor_name: data.supervisor_name.trim(),
      screenshot_1: processedScreenshots[0] || "",
      screenshot_2: processedScreenshots[1] || "",
      screenshot_3: processedScreenshots[2] || "",
      screenshot_4: processedScreenshots[3] || "",
      status: "published",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project submitted and published successfully!",
        project: newProject,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ProjectSubmit] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing project submission." },
      { status: 500 }
    );
  }
}
