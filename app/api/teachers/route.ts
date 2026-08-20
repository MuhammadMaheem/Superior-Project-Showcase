import { NextResponse } from "next/server";
import { dataAdapter } from "@/lib/sheets/adapter";

export async function GET() {
  try {
    const teachers = await dataAdapter.getTeachers();

    // Extract unique normalized subjects
    const subjectsSet = new Set<string>();
    for (const t of teachers) {
      if (t.subjects) {
        t.subjects.split(",").forEach((sub) => {
          const trimmed = sub.trim();
          if (trimmed) subjectsSet.add(trimmed);
        });
      }
    }
    const subjects = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));

    // Extract unique sections
    const sectionsSet = new Set<string>();
    for (const t of teachers) {
      if (t.sections) {
        t.sections.split(",").forEach((sec) => {
          const trimmed = sec.trim();
          if (trimmed) sectionsSet.add(trimmed);
        });
      }
    }
    const sections = Array.from(sectionsSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      teachers,
      subjects,
      sections,
    });
  } catch (error) {
    console.error("[Teachers API GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}
