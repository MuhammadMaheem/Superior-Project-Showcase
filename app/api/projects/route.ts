import { NextRequest, NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const batch = searchParams.get("batch");
    const tech = searchParams.get("tech")?.toLowerCase();
    const supervisor = searchParams.get("supervisor");
    const roll = searchParams.get("roll")?.toLowerCase();

    let projects = await dataAdapter.getProjects({ publishedOnly: true });

    if (search) {
      projects = projects.filter(
        (p) =>
          p.project_title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.student_name.toLowerCase().includes(search) ||
          p.roll_number.toLowerCase().includes(search) ||
          p.tech_stack.toLowerCase().includes(search)
      );
    }

    if (batch && batch !== "all") {
      projects = projects.filter((p) => p.batch_section.includes(batch));
    }

    if (tech && tech !== "all") {
      projects = projects.filter((p) => p.tech_stack.toLowerCase().includes(tech));
    }

    if (supervisor && supervisor !== "all") {
      projects = projects.filter((p) => p.supervisor_name.toLowerCase() === supervisor.toLowerCase());
    }

    if (roll) {
      projects = projects.filter((p) => p.roll_number.toLowerCase().includes(roll));
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[Projects API GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
