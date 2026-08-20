import fs from "fs";
import { google } from "googleapis";

// Load .env.local manually
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[match[1]] = value;
  }
}

const clientEmail = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = envVars.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
let rawSheetId = envVars.GOOGLE_SHEET_ID;

let sheetId = rawSheetId;
if (sheetId && sheetId.includes("/spreadsheets/d/")) {
  const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) sheetId = match[1];
}

const PROJECT_COLUMNS = [
  "id",
  "roll_number",
  "student_name",
  "student_avatar_url",
  "project_title",
  "description",
  "tech_stack",
  "github_url",
  "live_url",
  "linkedin_url",
  "email",
  "batch_section",
  "subject",
  "supervisor_name",
  "screenshot_1",
  "screenshot_2",
  "screenshot_3",
  "screenshot_4",
  "status",
  "submitted_at",
  "updated_at",
];

const TEACHER_COLUMNS = [
  "name",
  "slug",
  "employee_code",
  "designation",
  "subjects",
  "sections",
  "superior_email",
  "image",
  "office_number",
  "weekly_classes",
  "weekly_hours",
  "workload_tier",
  "theme_color",
  "glow_color",
  "tier_class",
  "last_synced_at",
];

async function initializeSheet() {
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  console.log("Fetching spreadsheet details...");
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingSheets = meta.data.sheets?.map((s) => s.properties?.title) || [];
  console.log("Existing tabs:", existingSheets);

  const addSheetRequests = [];
  if (!existingSheets.includes("Projects")) {
    addSheetRequests.push({ addSheet: { properties: { title: "Projects" } } });
  }
  if (!existingSheets.includes("Teachers")) {
    addSheetRequests.push({ addSheet: { properties: { title: "Teachers" } } });
  }

  if (addSheetRequests.length > 0) {
    console.log("Creating missing tabs (Projects, Teachers)...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: addSheetRequests },
    });
    console.log("Created tabs successfully.");
  }

  // Add Headers to Projects
  console.log("Writing header row for Projects...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Projects!A1:U1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [PROJECT_COLUMNS] },
  });

  // Add Headers to Teachers
  console.log("Writing header row for Teachers...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Teachers!A1:P1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [TEACHER_COLUMNS] },
  });

  // Seed teachers from local database if any
  try {
    const localDbPath = ".data/showcase_db.json";
    if (fs.existsSync(localDbPath)) {
      const db = JSON.parse(fs.readFileSync(localDbPath, "utf8"));
      if (db.teachers && db.teachers.length > 0) {
        console.log(`Syncing ${db.teachers.length} initial teachers to Google Sheet...`);
        const teacherRows = db.teachers.map((t) => [
          t.name,
          t.slug,
          t.employee_code,
          t.designation,
          t.subjects,
          t.sections,
          t.superior_email,
          t.image,
          t.office_number,
          t.weekly_classes,
          t.weekly_hours,
          t.workload_tier,
          t.theme_color,
          t.glow_color,
          t.tier_class,
          t.last_synced_at,
        ]);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Teachers!A2:P${teacherRows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: teacherRows },
        });
        console.log("Teachers synced to Google Sheet!");
      }
      if (db.projects && db.projects.length > 0) {
        console.log(`Syncing ${db.projects.length} existing projects to Google Sheet...`);
        const projectRows = db.projects.map((p) => [
          p.id,
          p.roll_number,
          p.student_name,
          p.student_avatar_url || "",
          p.project_title,
          p.description,
          p.tech_stack,
          p.github_url,
          p.live_url || "",
          p.linkedin_url || "",
          p.email || "",
          p.batch_section,
          p.subject,
          p.supervisor_name,
          p.screenshot_1 || "",
          p.screenshot_2 || "",
          p.screenshot_3 || "",
          p.screenshot_4 || "",
          p.status,
          p.submitted_at,
          p.updated_at,
        ]);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Projects!A2:U${projectRows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: projectRows },
        });
        console.log("Projects synced to Google Sheet!");
      }
    }
  } catch (err) {
    console.error("Warning syncing local seed data:", err);
  }

  console.log("\n Google Sheet is fully initialized with headers and seeded data!");
}

initializeSheet().catch((e) => console.error("Initialization error:", e));
