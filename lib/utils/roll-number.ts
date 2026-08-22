export interface ParsedRollNumber {
  raw: string;
  isValid: boolean;
  campus?: string;
  degree?: "BSAI" | "BSCS" | "BSSE" | "BSDS" | "BSIT" | string;
  shift?: "Morning" | "Evening" | "Regular";
  batchYear?: string;
  batchCode?: string;
  serial?: string;
  suggestedSemester?: string;
}

/**
 * Parses Superior University roll numbers (e.g. SU92-BSAIM-F24-042 or BSAI-F21-042)
 */
export function parseSuperiorRollNumber(input: string): ParsedRollNumber {
  if (!input || typeof input !== "string") {
    return { raw: "", isValid: false };
  }

  const raw = input.trim().toUpperCase();

  // Pattern: Optional campus (group 1), program (group 2), session (group 3), serial (group 4)
  const fullPattern = /^(?:(SU\d{2}|[A-Z0-9]+)-)?([A-Z]+)-([FS]\d{2})-(\d+)$/i;
  const match = raw.match(fullPattern);

  if (!match) {
    return { raw, isValid: false };
  }

  const campus = match[1] || "SU92";
  const programRaw = match[2];
  const session = match[3];
  const serial = match[4];

  // Determine shift (e.g. BSAIM = BSAI Morning, BSSEE = BSSE Evening)
  let shift: "Morning" | "Evening" | "Regular" = "Regular";
  let degree = programRaw;

  if (programRaw.endsWith("M") && programRaw.length > 3) {
    shift = "Morning";
    degree = programRaw.slice(0, -1);
  } else if (programRaw.endsWith("E") && programRaw.length > 3) {
    shift = "Evening";
    degree = programRaw.slice(0, -1);
  }

  // Normalize common degree names
  if (degree === "BSA" || degree === "AI") degree = "BSAI";
  if (degree === "BSC" || degree === "CS") degree = "BSCS";
  if (degree === "BSS" || degree === "SE") degree = "BSSE";
  if (degree === "BSD" || degree === "DS") degree = "BSDS";
  if (degree === "BSI" || degree === "IT") degree = "BSIT";

  // Parse session e.g. F24 -> Fall 2024, S24 -> Spring 2024
  const season = session.startsWith("F") ? "Fall" : session.startsWith("S") ? "Spring" : "Session";
  const yearSuffix = session.slice(1);
  const fullYear = `20${yearSuffix}`;
  const batchYear = `${season} ${fullYear}`;

  // Estimate expected semester based on intake
  // e.g. F24 in 2026 is 3rd/4th semester
  const intakeYearNum = Number(fullYear);
  const currentYear = new Date().getFullYear();
  const yearDiff = Math.max(0, currentYear - intakeYearNum);
  const estimatedSemesterNum = Math.min(8, Math.max(1, yearDiff * 2));
  const suggestedSemester = `${estimatedSemesterNum}A`;

  return {
    raw,
    isValid: true,
    campus: campus === "SU92" ? "SU92 (Main Campus)" : campus,
    degree,
    shift,
    batchYear,
    batchCode: session,
    serial,
    suggestedSemester,
  };
}
