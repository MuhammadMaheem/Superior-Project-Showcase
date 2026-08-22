import path from "path";
import fs from "fs";

// Load .env.local manually without extra dotenv dependency
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

import { getFirestoreDb, isFirebaseConfigured } from "../lib/firebase/client";
import { uploadScreenshotToFirebaseStorage } from "../lib/firebase/storage";
import { normalizeVideoEmbedUrl } from "../lib/sheets/models";
import type { Project, Teacher, QueryMessage, AdminAuditLog } from "../lib/sheets/models";

async function runMigration() {
  console.log("=================================================");
  console.log("🔥 SUPERIOR SHOWCASE -> FIREBASE MIGRATION TOOL");
  console.log("=================================================");

  if (!isFirebaseConfigured()) {
    console.error("❌ Error: Firebase environment variables are missing in .env.local.");
    console.error("Please add:");
    console.error("  FIREBASE_PROJECT_ID");
    console.error("  FIREBASE_CLIENT_EMAIL");
    console.error("  FIREBASE_PRIVATE_KEY");
    process.exit(1);
  }

  const db = getFirestoreDb();
  if (!db) {
    console.error("❌ Error: Could not establish connection with Firestore.");
    process.exit(1);
  }

  console.log("✅ Successfully connected to Firebase Admin SDK.");

  // Read local showcase database
  const dbPath = path.join(process.cwd(), ".data", "showcase_db.json");
  let localData = {
    projects: [] as Project[],
    teachers: [] as Teacher[],
    queries: [] as QueryMessage[],
    audit_logs: [] as AdminAuditLog[],
  };

  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, "utf8");
      localData = JSON.parse(raw);
      console.log(`📁 Loaded local database: ${localData.projects?.length || 0} projects, ${localData.teachers?.length || 0} faculty members.`);
    } catch (e) {
      console.warn("⚠️ Could not parse local showcase_db.json, will use live sync:", e);
    }
  }

  // 1. Migrate Faculty (fetch latest from academic tool if empty or seed)
  console.log("\n📚 Step 1: Migrating Faculty Records...");
  let facultyList = localData.teachers || [];
  try {
    console.log("🌐 Fetching complete live faculty roster (63+ members) from Superior Academic Tool API...");
    const res = await fetch("https://superior-academic-tool.onrender.com/get_teachers");
    if (res.ok) {
      const live = await res.json();
      if (Array.isArray(live) && live.length > 0) {
        facultyList = live.map((t: any) => ({
          name: t.name || "",
          slug: t.slug || t.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          employee_code: t.employee_code || "",
          designation: t.designation || "Lecturer",
          subjects: Array.isArray(t.subjects) ? t.subjects.join(", ") : String(t.subjects || ""),
          sections: Array.isArray(t.sections) ? t.sections.join(", ") : String(t.sections || ""),
          superior_email: t.superior_email || "",
          image: t.image || "",
          office_number: t.office_number || "",
          weekly_classes: Number(t.weekly_classes || 0),
          weekly_hours: Number(t.weekly_hours || 0),
          workload_tier: t.workload_tier || "Standard",
          theme_color: t.theme_color || "#38bdf8",
          glow_color: t.glow_color || "rgba(56, 189, 248, 0.4)",
          tier_class: t.tier_class || "workload-standard",
          last_synced_at: new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn("Using cached/local faculty list:", err);
  }

  let teacherCount = 0;
  const teacherBatch = db.batch();
  for (const teacher of facultyList) {
    const docRef = db.collection("teachers").doc(teacher.slug);
    teacherBatch.set(docRef, teacher);
    teacherCount++;
  }
  await teacherBatch.commit();
  console.log(`✅ Migrated ${teacherCount} faculty members into Firestore 'teachers' collection.`);

  // 2. Migrate Projects & Media
  console.log("\n🚀 Step 2: Migrating Capstone Projects & Media...");
  const projects = localData.projects || [];
  let projCount = 0;

  for (const proj of projects) {
    let s1 = proj.screenshot_1 || "";
    let s2 = proj.screenshot_2 || "";
    let s3 = proj.screenshot_3 || "";
    let s4 = proj.screenshot_4 || "";

    const firestoreProject = {
      id: proj.id,
      roll_number: proj.roll_number || "",
      student_name: proj.student_name || "",
      student_avatar_url: proj.student_avatar_url || "",
      project_title: proj.project_title || "",
      description: proj.description || "",
      tech_stack: proj.tech_stack || "",
      github_url: proj.github_url || "",
      live_url: proj.live_url || "",
      video_url: normalizeVideoEmbedUrl(proj.video_url) || "",
      linkedin_url: proj.linkedin_url || "",
      email: proj.email || "",
      batch_section: proj.batch_section || "",
      subject: proj.subject || "",
      supervisor_name: proj.supervisor_name || "",
      screenshot_1: s1,
      screenshot_2: s2,
      screenshot_3: s3,
      screenshot_4: s4,
      status: proj.status || "published",
      submitted_at: proj.submitted_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.collection("projects").doc(proj.id).set(firestoreProject);
    projCount++;
    console.log(`   ✓ Migrated project: [${proj.roll_number}] ${proj.project_title}`);
  }
  console.log(`✅ Migrated ${projCount} capstone projects to Firestore 'projects' collection.`);

  // 3. Migrate Queries
  console.log("\n💬 Step 3: Migrating Student Queries...");
  const queries = localData.queries || [];
  const queryBatch = db.batch();
  for (const q of queries) {
    const qRef = db.collection("queries").doc(q.id);
    queryBatch.set(qRef, {
      id: q.id,
      name: q.name || "",
      email: q.email || "",
      roll_number: q.roll_number || "",
      related_project_id: q.related_project_id || "",
      message: q.message || "",
      status: q.status || "open",
      submitted_at: q.submitted_at || new Date().toISOString(),
      admin_response: q.admin_response || "",
    });
  }
  if (queries.length > 0) {
    await queryBatch.commit();
  }
  console.log(`✅ Migrated ${queries.length} student queries to Firestore 'queries' collection.`);

  // 4. Migrate Audit Logs
  console.log("\n🛡️ Step 4: Migrating Admin Security Audit Logs...");
  const logs = localData.audit_logs || [];
  const logBatch = db.batch();
  for (const l of logs) {
    const lRef = db.collection("audit_logs").doc(l.id);
    logBatch.set(lRef, {
      id: l.id,
      timestamp: l.timestamp || new Date().toISOString(),
      action: l.action || "SYSTEM_ACTION",
      target_type: l.target_type || "SYSTEM",
      target_id: l.target_id || "",
      details: l.details || "",
    });
  }
  if (logs.length > 0) {
    await logBatch.commit();
  }
  console.log(`✅ Migrated ${logs.length} audit logs to Firestore 'audit_logs' collection.`);

  // Initial Sync Metadata
  await db.collection("teachers_sync_meta").doc("meta").set({
    last_hash: "firebase_migrated_v1",
    last_synced_at: new Date().toISOString(),
    last_check_status: "ok",
  });

  console.log("\n=================================================");
  console.log("🎉 FIREBASE MIGRATION COMPLETED SUCCESSFULLY!");
  console.log("=================================================");
  console.log(`Summary:`);
  console.log(`  - Projects:     ${projCount}`);
  console.log(`  - Faculty:      ${teacherCount}`);
  console.log(`  - Queries:      ${queries.length}`);
  console.log(`  - Audit Logs:   ${logs.length}`);
  console.log("=================================================\n");
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
