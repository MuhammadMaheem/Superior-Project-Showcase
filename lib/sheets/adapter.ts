import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getGoogleSheetsClient, getSpreadsheetId } from "./client";
import { sanitizeForSheet, unescapeFromSheet } from "./sanitize";
import { isFirebaseConfigured } from "../firebase/client";
import { firebaseAdapter } from "../firebase/adapter";
import type {
  Project,
  Teacher,
  TeacherPending,
  TeacherSyncMeta,
  TeacherSyncLog,
  QueryMessage,
  AdminAuditLog,
} from "./models";

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NODE_ENV === "production"
);

const DB_FILE_PATH = IS_SERVERLESS
  ? path.join("/tmp", "showcase_db.json")
  : path.join(process.cwd(), ".data", "showcase_db.json");

interface LocalDatabase {
  projects: Project[];
  teachers: Teacher[];
  teachers_pending: TeacherPending[];
  sync_meta: TeacherSyncMeta;
  sync_logs: TeacherSyncLog[];
  queries: QueryMessage[];
  audit_logs: AdminAuditLog[];
}

let memoryDb: LocalDatabase | null = null;

function createDefaultDb(): LocalDatabase {
  return {
    projects: getInitialSeedProjects(),
    teachers: getInitialSeedTeachers(),
    teachers_pending: [],
    sync_meta: {
      last_hash: "initial_seeded_hash_2026",
      last_synced_at: new Date().toISOString(),
      last_check_status: "ok",
    },
    sync_logs: [],
    queries: getInitialSeedQueries(),
    audit_logs: [
      {
        id: "log-init",
        timestamp: new Date().toISOString(),
        action: "SYSTEM_INITIALIZED",
        target_type: "SYSTEM",
        target_id: "ALL",
        details: "Superior Project Showcase platform initialized with faculty seed.",
      },
    ],
  };
}

// Ensure database exists for persistence (Serverless & Read-only Safe)
function ensureLocalDb(): LocalDatabase {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn("[SheetsAdapter] Could not create db dir (ignoring for memory fallback):", err);
      }
    }

    if (!fs.existsSync(DB_FILE_PATH)) {
      const initialDb = createDefaultDb();
      try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), "utf8");
      } catch (err) {
        console.warn("[SheetsAdapter] Could not write initial db (using memory fallback):", err);
      }
      memoryDb = initialDb;
      return initialDb;
    }

    const content = fs.readFileSync(DB_FILE_PATH, "utf8");
    memoryDb = JSON.parse(content);
    return memoryDb!;
  } catch (err) {
    console.warn("[SheetsAdapter] Failed to load local db from file, using fresh in-memory db:", err);
    memoryDb = createDefaultDb();
    return memoryDb;
  }
}

function saveLocalDb(db: LocalDatabase) {
  memoryDb = db;
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.warn("[SheetsAdapter] Could not persist local db to disk (in-memory state preserved):", err);
  }
}

// ----------------------------------------------------
// Google Sheets Headers Mapping
// ----------------------------------------------------
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

const TEACHER_PENDING_COLUMNS = [
  ...TEACHER_COLUMNS,
  "status",
  "detected_at",
];

const QUERY_COLUMNS = [
  "id",
  "name",
  "email",
  "roll_number",
  "related_project_id",
  "message",
  "status",
  "submitted_at",
  "admin_response",
];

export const dataAdapter = {
  // --------------------------------------------------
  // PROJECTS
  // --------------------------------------------------
  async getProjects(filter?: { publishedOnly?: boolean }): Promise<Project[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getProjects(filter);
      } catch (err) {
        console.warn("[DataAdapter] Firebase getProjects failed, trying fallback:", err);
      }
    }

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Projects!A2:U",
        });
        const rows = response.data.values || [];
        const projects: Project[] = rows.map((row) => ({
          id: unescapeFromSheet(row[0] || ""),
          roll_number: unescapeFromSheet(row[1] || ""),
          student_name: unescapeFromSheet(row[2] || ""),
          student_avatar_url: unescapeFromSheet(row[3] || ""),
          project_title: unescapeFromSheet(row[4] || ""),
          description: unescapeFromSheet(row[5] || ""),
          tech_stack: unescapeFromSheet(row[6] || ""),
          github_url: unescapeFromSheet(row[7] || ""),
          live_url: unescapeFromSheet(row[8] || ""),
          linkedin_url: unescapeFromSheet(row[9] || ""),
          email: unescapeFromSheet(row[10] || ""),
          batch_section: unescapeFromSheet(row[11] || ""),
          subject: unescapeFromSheet(row[12] || ""),
          supervisor_name: unescapeFromSheet(row[13] || ""),
          screenshot_1: unescapeFromSheet(row[14] || ""),
          screenshot_2: unescapeFromSheet(row[15] || ""),
          screenshot_3: unescapeFromSheet(row[16] || ""),
          screenshot_4: unescapeFromSheet(row[17] || ""),
          status: (unescapeFromSheet(row[18] || "published") as "published" | "hidden"),
          submitted_at: unescapeFromSheet(row[19] || ""),
          updated_at: unescapeFromSheet(row[20] || ""),
        }));

        if (filter?.publishedOnly) {
          return projects.filter((p) => p.status === "published");
        }
        return projects;
      } catch (err) {
        console.warn("[SheetsAdapter] Failed to fetch Projects from Google Sheets, falling back to local DB:", err);
      }
    }

    // Local DB fallback
    const db = ensureLocalDb();
    if (filter?.publishedOnly) {
      return db.projects.filter((p) => p.status === "published");
    }
    return db.projects;
  },

  async getProjectById(id: string): Promise<Project | null> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getProjectById(id);
      } catch (err) {
        console.warn("[DataAdapter] Firebase getProjectById failed, trying fallback:", err);
      }
    }
    const projects = await this.getProjects();
    return projects.find((p) => p.id === id) || null;
  },

  async createProject(projectData: Omit<Project, "id" | "submitted_at" | "updated_at">): Promise<Project> {
    if (isFirebaseConfigured()) {
      try {
        const created = await firebaseAdapter.createProject(projectData);
        const db = ensureLocalDb();
        db.projects = [created, ...db.projects.filter((p) => p.id !== created.id)];
        saveLocalDb(db);
        return created;
      } catch (err) {
        console.warn("[DataAdapter] Firebase createProject failed, trying fallback:", err);
      }
    }

    const now = new Date().toISOString();
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      submitted_at: now,
      updated_at: now,
    };

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const row = [
          sanitizeForSheet(newProject.id),
          sanitizeForSheet(newProject.roll_number),
          sanitizeForSheet(newProject.student_name),
          sanitizeForSheet(newProject.student_avatar_url),
          sanitizeForSheet(newProject.project_title),
          sanitizeForSheet(newProject.description),
          sanitizeForSheet(newProject.tech_stack),
          sanitizeForSheet(newProject.github_url),
          sanitizeForSheet(newProject.live_url || ""),
          sanitizeForSheet(newProject.linkedin_url || ""),
          sanitizeForSheet(newProject.email || ""),
          sanitizeForSheet(newProject.batch_section),
          sanitizeForSheet(newProject.subject),
          sanitizeForSheet(newProject.supervisor_name),
          sanitizeForSheet(newProject.screenshot_1 || ""),
          sanitizeForSheet(newProject.screenshot_2 || ""),
          sanitizeForSheet(newProject.screenshot_3 || ""),
          sanitizeForSheet(newProject.screenshot_4 || ""),
          sanitizeForSheet(newProject.status),
          sanitizeForSheet(newProject.submitted_at),
          sanitizeForSheet(newProject.updated_at),
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Projects!A:U",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        });
      } catch (err) {
        console.error("[SheetsAdapter] Google Sheets append failed:", err);
      }
    }

    // Always update local DB too
    const db = ensureLocalDb();
    db.projects.unshift(newProject);
    saveLocalDb(db);

    return newProject;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (isFirebaseConfigured()) {
      try {
        const updated = await firebaseAdapter.updateProject(id, updates);
        if (updated) {
          const db = ensureLocalDb();
          const idx = db.projects.findIndex((p) => p.id === id);
          if (idx !== -1) {
            db.projects[idx] = updated;
            saveLocalDb(db);
          }
        }
        return updated;
      } catch (err) {
        console.warn("[DataAdapter] Firebase updateProject failed, trying fallback:", err);
      }
    }

    const now = new Date().toISOString();
    const db = ensureLocalDb();
    const idx = db.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    db.projects[idx] = {
      ...db.projects[idx],
      ...updates,
      updated_at: now,
    };
    const updated = db.projects[idx];
    saveLocalDb(db);

    // If Google Sheets is configured, update corresponding row
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    if (sheets && spreadsheetId) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Projects!A2:A",
        });
        const rows = res.data.values || [];
        const rowIndex = rows.findIndex((r) => unescapeFromSheet(r[0]) === id);
        if (rowIndex !== -1) {
          const sheetRowNumber = rowIndex + 2;
          const rowValues = [
            sanitizeForSheet(updated.id),
            sanitizeForSheet(updated.roll_number),
            sanitizeForSheet(updated.student_name),
            sanitizeForSheet(updated.student_avatar_url),
            sanitizeForSheet(updated.project_title),
            sanitizeForSheet(updated.description),
            sanitizeForSheet(updated.tech_stack),
            sanitizeForSheet(updated.github_url),
            sanitizeForSheet(updated.live_url || ""),
            sanitizeForSheet(updated.linkedin_url || ""),
            sanitizeForSheet(updated.email || ""),
            sanitizeForSheet(updated.batch_section),
            sanitizeForSheet(updated.subject),
            sanitizeForSheet(updated.supervisor_name),
            sanitizeForSheet(updated.screenshot_1 || ""),
            sanitizeForSheet(updated.screenshot_2 || ""),
            sanitizeForSheet(updated.screenshot_3 || ""),
            sanitizeForSheet(updated.screenshot_4 || ""),
            sanitizeForSheet(updated.status),
            sanitizeForSheet(updated.submitted_at),
            sanitizeForSheet(updated.updated_at),
          ];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Projects!A${sheetRowNumber}:U${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [rowValues] },
          });
        }
      } catch (err) {
        console.error("[SheetsAdapter] Failed to update project in Google Sheets:", err);
      }
    }

    return updated;
  },

  async deleteProject(id: string): Promise<boolean> {
    if (isFirebaseConfigured()) {
      try {
        const deleted = await firebaseAdapter.deleteProject(id);
        const db = ensureLocalDb();
        db.projects = db.projects.filter((p) => p.id !== id);
        saveLocalDb(db);
        return deleted;
      } catch (err) {
        console.warn("[DataAdapter] Firebase deleteProject failed, trying fallback:", err);
      }
    }

    const db = ensureLocalDb();
    const initialLen = db.projects.length;
    db.projects = db.projects.filter((p) => p.id !== id);
    saveLocalDb(db);
    return db.projects.length < initialLen;
  },

  // --------------------------------------------------
  // TEACHERS (Live approved data)
  // --------------------------------------------------
  async getTeachers(): Promise<Teacher[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getTeachers();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getTeachers failed, trying fallback:", err);
      }
    }

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Teachers!A2:P",
        });
        const rows = response.data.values || [];
        if (rows.length > 0) {
          return rows.map((row) => ({
            name: unescapeFromSheet(row[0] || ""),
            slug: unescapeFromSheet(row[1] || ""),
            employee_code: unescapeFromSheet(row[2] || ""),
            designation: unescapeFromSheet(row[3] || ""),
            subjects: unescapeFromSheet(row[4] || ""),
            sections: unescapeFromSheet(row[5] || ""),
            superior_email: unescapeFromSheet(row[6] || ""),
            image: unescapeFromSheet(row[7] || ""),
            office_number: unescapeFromSheet(row[8] || ""),
            weekly_classes: Number(row[9] || 0),
            weekly_hours: Number(row[10] || 0),
            workload_tier: unescapeFromSheet(row[11] || "Standard"),
            theme_color: unescapeFromSheet(row[12] || "#38bdf8"),
            glow_color: unescapeFromSheet(row[13] || "rgba(56, 189, 248, 0.4)"),
            tier_class: unescapeFromSheet(row[14] || "workload-standard"),
            last_synced_at: unescapeFromSheet(row[15] || ""),
          }));
        }
      } catch (err) {
        console.warn("[SheetsAdapter] Failed to fetch Teachers from Google Sheets:", err);
      }
    }

    const db = ensureLocalDb();
    return db.teachers;
  },

  async setTeachers(teachers: Teacher[]): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.setTeachers(teachers);
        return;
      } catch (err) {
        console.warn("[DataAdapter] Firebase setTeachers failed, trying fallback:", err);
      }
    }

    const db = ensureLocalDb();
    db.teachers = teachers;
    saveLocalDb(db);

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    if (sheets && spreadsheetId) {
      try {
        const rows = teachers.map((t) => [
          sanitizeForSheet(t.name),
          sanitizeForSheet(t.slug),
          sanitizeForSheet(t.employee_code),
          sanitizeForSheet(t.designation),
          sanitizeForSheet(t.subjects),
          sanitizeForSheet(t.sections),
          sanitizeForSheet(t.superior_email),
          sanitizeForSheet(t.image),
          sanitizeForSheet(t.office_number),
          t.weekly_classes,
          t.weekly_hours,
          sanitizeForSheet(t.workload_tier),
          sanitizeForSheet(t.theme_color),
          sanitizeForSheet(t.glow_color),
          sanitizeForSheet(t.tier_class),
          sanitizeForSheet(t.last_synced_at),
        ]);

        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: "Teachers!A2:P",
        });

        if (rows.length > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Teachers!A2:P${rows.length + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: rows },
          });
        }
      } catch (err) {
        console.error("[SheetsAdapter] Failed to set live Teachers in Google Sheets:", err);
      }
    }
  },

  // --------------------------------------------------
  // TEACHERS PENDING (Sync staging queue)
  // --------------------------------------------------
  async getTeachersPending(): Promise<TeacherPending[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getTeachersPending();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getTeachersPending failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    return db.teachers_pending;
  },

  async setTeachersPending(pending: TeacherPending[]): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.setTeachersPending(pending);
        return;
      } catch (err) {
        console.warn("[DataAdapter] Firebase setTeachersPending failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    db.teachers_pending = pending;
    saveLocalDb(db);
  },

  async updatePendingTeacher(slug: string, updates: Partial<TeacherPending>): Promise<TeacherPending | null> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.updatePendingTeacher(slug, updates);
      } catch (err) {
        console.warn("[DataAdapter] Firebase updatePendingTeacher failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    const idx = db.teachers_pending.findIndex((t) => t.slug === slug);
    if (idx === -1) return null;
    db.teachers_pending[idx] = { ...db.teachers_pending[idx], ...updates };
    saveLocalDb(db);
    return db.teachers_pending[idx];
  },

  // --------------------------------------------------
  // SYNC META & LOGS
  // --------------------------------------------------
  async getSyncMeta(): Promise<TeacherSyncMeta> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getSyncMeta();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getSyncMeta failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    return db.sync_meta;
  },

  async updateSyncMeta(meta: Partial<TeacherSyncMeta>): Promise<TeacherSyncMeta> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.updateSyncMeta(meta);
        return await firebaseAdapter.getSyncMeta();
      } catch (err) {
        console.warn("[DataAdapter] Firebase updateSyncMeta failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    db.sync_meta = { ...db.sync_meta, ...meta };
    saveLocalDb(db);
    return db.sync_meta;
  },

  async getSyncLogs(): Promise<TeacherSyncLog[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getSyncLogs();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getSyncLogs failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    return db.sync_logs;
  },

  async appendSyncLogs(logs: TeacherSyncLog[]): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.appendSyncLogs(logs);
        return;
      } catch (err) {
        console.warn("[DataAdapter] Firebase appendSyncLogs failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    db.sync_logs.unshift(...logs);
    saveLocalDb(db);
  },

  async updateSyncLogResolution(syncId: string, resolution: "approved" | "rejected"): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.updateSyncLogResolution(syncId, resolution);
        return;
      } catch (err) {
        console.warn("[DataAdapter] Firebase updateSyncLogResolution failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    db.sync_logs = db.sync_logs.map((log) =>
      log.sync_id === syncId ? { ...log, resolution } : log
    );
    saveLocalDb(db);
  },

  // --------------------------------------------------
  // QUERIES
  // --------------------------------------------------
  async getQueries(): Promise<QueryMessage[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getQueries();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getQueries failed, trying fallback:", err);
      }
    }

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Queries!A2:I",
        });
        const rows = response.data.values || [];
        if (rows.length > 0) {
          return rows.map((row) => ({
            id: unescapeFromSheet(row[0] || ""),
            name: unescapeFromSheet(row[1] || ""),
            email: unescapeFromSheet(row[2] || ""),
            roll_number: unescapeFromSheet(row[3] || ""),
            related_project_id: unescapeFromSheet(row[4] || ""),
            message: unescapeFromSheet(row[5] || ""),
            status: (unescapeFromSheet(row[6] || "open") as "open" | "resolved"),
            submitted_at: unescapeFromSheet(row[7] || ""),
            admin_response: unescapeFromSheet(row[8] || ""),
          }));
        }
      } catch (err) {
        console.warn("[SheetsAdapter] Failed to fetch Queries from Google Sheets, falling back to local DB:", err);
      }
    }

    const db = ensureLocalDb();
    return db.queries;
  },

  async getQueryById(id: string): Promise<QueryMessage | null> {
    const queries = await this.getQueries();
    return queries.find((q) => q.id === id) || null;
  },

  async createQuery(queryData: Omit<QueryMessage, "id" | "submitted_at" | "status">): Promise<QueryMessage> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.createQuery(queryData);
      } catch (err) {
        console.warn("[DataAdapter] Firebase createQuery failed, trying fallback:", err);
      }
    }

    const newQuery: QueryMessage = {
      ...queryData,
      id: crypto.randomUUID(),
      status: "open",
      submitted_at: new Date().toISOString(),
    };

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const row = [
          sanitizeForSheet(newQuery.id),
          sanitizeForSheet(newQuery.name),
          sanitizeForSheet(newQuery.email),
          sanitizeForSheet(newQuery.roll_number || ""),
          sanitizeForSheet(newQuery.related_project_id || ""),
          sanitizeForSheet(newQuery.message),
          sanitizeForSheet(newQuery.status),
          sanitizeForSheet(newQuery.submitted_at),
          sanitizeForSheet(newQuery.admin_response || ""),
        ];
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Queries!A:I",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        });
      } catch (err) {
        console.error("[SheetsAdapter] Google Sheets append failed for query:", err);
      }
    }

    const db = ensureLocalDb();
    db.queries.unshift(newQuery);
    saveLocalDb(db);
    return newQuery;
  },

  async respondToQuery(id: string, adminResponse: string, status: "open" | "resolved" = "resolved"): Promise<QueryMessage | null> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.respondToQuery(id, adminResponse, status);
      } catch (err) {
        console.warn("[DataAdapter] Firebase respondToQuery failed, trying fallback:", err);
      }
    }

    const db = ensureLocalDb();
    const idx = db.queries.findIndex((q) => q.id === id);
    if (idx === -1) return null;

    db.queries[idx] = {
      ...db.queries[idx],
      admin_response: adminResponse,
      status,
    };
    const updated = db.queries[idx];
    saveLocalDb(db);

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    if (sheets && spreadsheetId) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Queries!A2:A",
        });
        const rows = res.data.values || [];
        const rowIndex = rows.findIndex((r) => unescapeFromSheet(r[0]) === id);
        if (rowIndex !== -1) {
          const sheetRowNumber = rowIndex + 2;
          const rowValues = [
            sanitizeForSheet(updated.id),
            sanitizeForSheet(updated.name),
            sanitizeForSheet(updated.email),
            sanitizeForSheet(updated.roll_number || ""),
            sanitizeForSheet(updated.related_project_id || ""),
            sanitizeForSheet(updated.message),
            sanitizeForSheet(updated.status),
            sanitizeForSheet(updated.submitted_at),
            sanitizeForSheet(updated.admin_response || ""),
          ];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Queries!A${sheetRowNumber}:I${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [rowValues] },
          });
        }
      } catch (err) {
        console.error("[SheetsAdapter] Failed to update query in Google Sheets:", err);
      }
    }

    return updated;
  },

  // --------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    if (isFirebaseConfigured()) {
      try {
        return await firebaseAdapter.getAuditLogs();
      } catch (err) {
        console.warn("[DataAdapter] Firebase getAuditLogs failed, trying fallback:", err);
      }
    }
    const db = ensureLocalDb();
    return db.audit_logs || [];
  },

  async logAdminAction(action: string, targetType: string, targetId: string, details: string): Promise<void> {
    if (isFirebaseConfigured()) {
      try {
        await firebaseAdapter.logAdminAction(action, targetType, targetId, details);
        return;
      } catch (err) {
        console.warn("[DataAdapter] Firebase logAdminAction failed, trying fallback:", err);
      }
    }

    const log: AdminAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    };
    const db = ensureLocalDb();
    if (!db.audit_logs) db.audit_logs = [];
    db.audit_logs.unshift(log);
    saveLocalDb(db);
  },
};

// ----------------------------------------------------
// Initial Seed Data Functions (Pre-populates teachers & showcase projects)
// ----------------------------------------------------
function getInitialSeedTeachers(): Teacher[] {
  return [
    {
      name: "DR. ABDUL WAHEED",
      slug: "dr-abdul-waheed",
      employee_code: "FAC-1001",
      designation: "Associate Professor",
      subjects: "Foreign Language, Software Engineering",
      sections: "BSSE-6A, BSSE-6B, BSSE-6C, BSSE-6D",
      superior_email: "abdul.waheed@superior.edu.pk",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      office_number: "CS-301",
      weekly_classes: 4,
      weekly_hours: 10.7,
      workload_tier: "Moderate",
      theme_color: "#818cf8",
      glow_color: "rgba(129, 140, 248, 0.4)",
      tier_class: "workload-moderate",
      last_synced_at: new Date().toISOString(),
    },
    {
      name: "DR. ARFAN ALI NAGRA",
      slug: "dr-arfan-ali-nagra",
      employee_code: "FAC-1002",
      designation: "Professor & Head of AI",
      subjects: "Discrete Structures, Generative AI",
      sections: "BSAI-2B, BSAI-2C, BSDS-1A, BSSE-1A",
      superior_email: "arfan.nagra@superior.edu.pk",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      office_number: "AI-Lab-1",
      weekly_classes: 3,
      weekly_hours: 7.8,
      workload_tier: "Standard",
      theme_color: "#38bdf8",
      glow_color: "rgba(56, 189, 248, 0.4)",
      tier_class: "workload-standard",
      last_synced_at: new Date().toISOString(),
    },
    {
      name: "DR. HAFIZ MUHAMMAD SHAHZAD",
      slug: "dr-hafiz-muhammad-shahzad",
      employee_code: "FAC-1003",
      designation: "Assistant Professor",
      subjects: "Artificial Neural Networks, Machine Learning",
      sections: "BSAI-7A, BSAI-8A, BSSE-6A",
      superior_email: "shahzad.cs@superior.edu.pk",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      office_number: "CS-204",
      weekly_classes: 3,
      weekly_hours: 7.7,
      workload_tier: "Standard",
      theme_color: "#38bdf8",
      glow_color: "rgba(56, 189, 248, 0.4)",
      tier_class: "workload-standard",
      last_synced_at: new Date().toISOString(),
    },
    {
      name: "DR. HAFIZ MUHAMMAD TAYYAB KHUSHI",
      slug: "dr-hafiz-muhammad-tayyab-khushi",
      employee_code: "FAC-1004",
      designation: "Associate Professor",
      subjects: "Advance Computer Programming, Web Technologies",
      sections: "BSAI-4A, BSAI-4B, BSAI-4C, BSDS-4A",
      superior_email: "tayyab.khushi@superior.edu.pk",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      office_number: "CS-108",
      weekly_classes: 4,
      weekly_hours: 10.7,
      workload_tier: "Moderate",
      theme_color: "#818cf8",
      glow_color: "rgba(129, 140, 248, 0.4)",
      tier_class: "workload-moderate",
      last_synced_at: new Date().toISOString(),
    },
    {
      name: "DR. IFTIKHAR NASEER",
      slug: "dr-iftikhar-naseer",
      employee_code: "FAC-1005",
      designation: "Associate Professor",
      subjects: "Data Mining, Machine Learning, Deep Learning",
      sections: "BSDS-6A, BSSE-6B, BSSE-6C, BSSE-6D",
      superior_email: "iftikhar.naseer@superior.edu.pk",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
      office_number: "DS-401",
      weekly_classes: 4,
      weekly_hours: 10.5,
      workload_tier: "Moderate",
      theme_color: "#818cf8",
      glow_color: "rgba(129, 140, 248, 0.4)",
      tier_class: "workload-moderate",
      last_synced_at: new Date().toISOString(),
    },
  ];
}

function getInitialSeedProjects(): Project[] {
  return [
    {
      id: "proj-capstone-001",
      roll_number: "BSAI-F21-042",
      student_name: "Hamza Tariq",
      student_avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      project_title: "NeuralVision: Real-time Multi-Camera Edge Diagnostics",
      description:
        "NeuralVision is an industrial computer vision pipeline engineered to run on NVIDIA Jetson edge nodes. It detects micro-defects in manufacturing assembly lines using lightweight YOLOv8 and TensorRT acceleration with sub-12ms latency per frame. Integrated with an interactive Next.js telemetry dashboard and automated alert webhooks.",
      tech_stack: "Python, PyTorch, YOLOv8, TensorRT, Next.js, WebSockets, TailwindCSS",
      github_url: "https://github.com/facebook/react",
      live_url: "https://neuralvision-demo.vercel.app",
      linkedin_url: "https://linkedin.com/in/hamzatariq-ai",
      email: "bsai-f21-042@superior.edu.pk",
      batch_section: "Fall 2024 - BSAI-7A",
      subject: "Artificial Neural Networks",
      supervisor_name: "DR. HAFIZ MUHAMMAD SHAHZAD",
      screenshot_1: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      screenshot_2: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
      status: "published",
      submitted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "proj-capstone-002",
      roll_number: "BSSE-F21-118",
      student_name: "Ayesha Malik",
      student_avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4",
      project_title: "DecentraHealth: Zero-Knowledge Patient Record Exchange",
      description:
        "A decentralized medical record exchange framework utilizing Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs) to allow patients to share cryptographically verified health credentials with hospitals without exposing private biometric or diagnostic data.",
      tech_stack: "Solidity, Circom, Next.js, IPFS, Ethers.js, TailwindCSS",
      github_url: "https://github.com/vercel/next.js",
      live_url: "https://decentrahealth-superior.vercel.app",
      linkedin_url: "https://linkedin.com/in/ayeshamalik-se",
      email: "bsse-f21-118@superior.edu.pk",
      batch_section: "Spring 2024 - BSSE-6B",
      subject: "Software Engineering",
      supervisor_name: "DR. ABDUL WAHEED",
      screenshot_1: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
      screenshot_2: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=80",
      status: "published",
      submitted_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "proj-capstone-003",
      roll_number: "BSDS-F21-009",
      student_name: "Zainab Rehan",
      student_avatar_url: "https://avatars.githubusercontent.com/u/9919?v=4",
      project_title: "CardioRisk: Genomic Variant Risk Factor Engine",
      description:
        "High-throughput genetic risk calculator for early cardiovascular disease prognosis. Analyzes single nucleotide polymorphisms (SNPs) against clinical biobanks to compute polygenic risk scores with 94.2% validation accuracy.",
      tech_stack: "Python, Scikit-Learn, FastAPI, React, D3.js, PostgreSQL",
      github_url: "https://github.com/facebook/react",
      live_url: "https://cardiorisk-engine.vercel.app",
      linkedin_url: "https://linkedin.com/in/zainabrehan",
      email: "bsds-f21-009@superior.edu.pk",
      batch_section: "Fall 2024 - BSDS-6A",
      subject: "Data Mining",
      supervisor_name: "DR. IFTIKHAR NASEER",
      screenshot_1: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80",
      status: "published",
      submitted_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: "proj-capstone-004",
      roll_number: "BSAI-F22-088",
      student_name: "Bilal Ahmed",
      student_avatar_url: "https://avatars.githubusercontent.com/u/196195?v=4",
      project_title: "CampusFlow: Autonomous Room Scheduling Agent",
      description:
        "Multi-agent reasoning system for university space allocation, optimizing room capacity, faculty schedules, and student clash prevention using constraint satisfaction algorithms and LLM natural language command dispatch.",
      tech_stack: "TypeScript, LangChain, Next.js, Prisma, TailwindCSS",
      github_url: "https://github.com/vercel/next.js",
      live_url: "",
      linkedin_url: "https://linkedin.com/in/bilalahmed-dev",
      email: "bsai-f22-088@superior.edu.pk",
      batch_section: "Spring 2025 - BSAI-4A",
      subject: "Advance Computer Programming",
      supervisor_name: "DR. HAFIZ MUHAMMAD TAYYAB KHUSHI",
      screenshot_1: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
      status: "published",
      submitted_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];
}

function getInitialSeedQueries(): QueryMessage[] {
  return [
    {
      id: "query-demo-001",
      name: "Hamza Tariq",
      email: "bsai-f21-042@superior.edu.pk",
      roll_number: "BSAI-F21-042",
      related_project_id: "proj-capstone-001",
      message: "Hi Admin, I updated our live demo URL to point to our production edge cluster. Could you please verify the live link?",
      status: "open",
      submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ];
}
