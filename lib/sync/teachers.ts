import crypto from "crypto";
import { dataAdapter } from "@/lib/sheets/adapter";
import type { Teacher, TeacherPending, TeacherSyncLog } from "@/lib/sheets/models";

const FACULTY_ENDPOINT = "https://superior-academic-tool.onrender.com/get_teachers";

export interface RawTeacherRecord {
  name?: string;
  employee_code?: string;
  designation?: string;
  subjects?: string;
  sections?: string;
  superior_email?: string;
  image?: string;
  office_number?: string;
  weekly_classes?: number;
  weekly_hours?: number;
  workload_tier?: string;
  theme_color?: string;
  glow_color?: string;
  tier_class?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes faculty list for deterministic hashing and diffing
 */
export function normalizeTeachers(rawList: RawTeacherRecord[]): Teacher[] {
  const normalized: Teacher[] = rawList.map((item) => {
    const rawName = (item.name || "").trim().toUpperCase();
    const slug = slugify(rawName) || `teacher-${crypto.randomBytes(4).toString("hex")}`;

    // Sort subjects array
    const subjects = (item.subjects || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

    // Sort sections array
    const sections = (item.sections || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

    return {
      name: rawName,
      slug,
      employee_code: (item.employee_code || "").trim(),
      designation: (item.designation || "Faculty Member").trim(),
      subjects: subjects || "Computer Science",
      sections: sections || "All Sections",
      superior_email: (item.superior_email || "").trim(),
      image: item.image || "/static/faculty/profile.png",
      office_number: (item.office_number || "").trim(),
      weekly_classes: Number(item.weekly_classes || 0),
      weekly_hours: Number(item.weekly_hours || 0),
      workload_tier: (item.workload_tier || "Standard").trim(),
      theme_color: (item.theme_color || "#38bdf8").trim(),
      glow_color: (item.glow_color || "rgba(56, 189, 248, 0.4)").trim(),
      tier_class: (item.tier_class || "workload-standard").trim(),
      last_synced_at: new Date().toISOString(),
    };
  });

  // Sort whole array deterministically by name
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

export function computeHash(data: Teacher[] | unknown): string {
  if (Array.isArray(data)) {
    // Strip timestamp fields when computing hash of teachers
    const contentOnly = data.map((t) => {
      if (t && typeof t === "object" && "last_synced_at" in t) {
        const { last_synced_at: _, ...rest } = t as Teacher;
        return rest;
      }
      return t;
    });
    return crypto.createHash("sha256").update(JSON.stringify(contentOnly)).digest("hex");
  }
  const jsonString = JSON.stringify(data);
  return crypto.createHash("sha256").update(jsonString).digest("hex");
}

export interface SyncResult {
  hasChanges: boolean;
  meta: {
    lastHash: string;
    newHash: string;
    syncedAt: string;
  };
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  diffLogs: TeacherSyncLog[];
  pendingTeachers: TeacherPending[];
}

export async function runTeacherSync(): Promise<SyncResult> {
  const now = new Date().toISOString();

  // 1. Fetch live source
  const response = await fetch(FACULTY_ENDPOINT, {
    headers: {
      "User-Agent": "Superior-Project-Showcase-Sync/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Faculty API returned status ${response.status}`);
  }

  const rawData: RawTeacherRecord[] = await response.json();
  const normalizedIncoming = normalizeTeachers(rawData);
  const newHash = computeHash(normalizedIncoming);

  // 2. Get current sync metadata and live teachers
  const currentMeta = await dataAdapter.getSyncMeta();
  const liveTeachers = await dataAdapter.getTeachers();

  const isHashIdentical = currentMeta.last_hash === newHash;

  if (isHashIdentical) {
    await dataAdapter.updateSyncMeta({
      last_synced_at: now,
      last_check_status: "up_to_date",
    });

    return {
      hasChanges: false,
      meta: {
        lastHash: currentMeta.last_hash,
        newHash,
        syncedAt: now,
      },
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      diffLogs: [],
      pendingTeachers: [],
    };
  }

  // 3. Diff old (live) vs new (incoming)
  const liveMap = new Map(liveTeachers.map((t) => [t.name, t]));
  const incomingMap = new Map(normalizedIncoming.map((t) => [t.name, t]));

  const diffLogs: TeacherSyncLog[] = [];
  const pendingTeachers: TeacherPending[] = [];

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // Check additions and modifications
  for (const incoming of normalizedIncoming) {
    const live = liveMap.get(incoming.name);
    if (!live) {
      // Added
      addedCount++;
      diffLogs.push({
        sync_id: crypto.randomUUID(),
        timestamp: now,
        change_type: "added",
        teacher_name: incoming.name,
        field_changed: "all",
        old_value: "NONE",
        new_value: `${incoming.designation} (${incoming.subjects})`,
        resolution: "pending",
      });

      pendingTeachers.push({
        ...incoming,
        status: "pending",
        detected_at: now,
      });
    } else {
      // Check field diffs
      const fieldsToCheck: (keyof Teacher)[] = [
        "subjects",
        "sections",
        "designation",
        "office_number",
        "weekly_classes",
        "weekly_hours",
        "workload_tier",
      ];

      let isModified = false;
      for (const field of fieldsToCheck) {
        const oldVal = String(live[field] ?? "");
        const newVal = String(incoming[field] ?? "");
        if (oldVal !== newVal) {
          isModified = true;
          diffLogs.push({
            sync_id: crypto.randomUUID(),
            timestamp: now,
            change_type: "modified",
            teacher_name: incoming.name,
            field_changed: field,
            old_value: oldVal,
            new_value: newVal,
            resolution: "pending",
          });
        }
      }

      if (isModified) {
        modifiedCount++;
        pendingTeachers.push({
          ...incoming,
          status: "pending",
          detected_at: now,
        });
      }
    }
  }

  // Check removals
  for (const live of liveTeachers) {
    if (!incomingMap.has(live.name)) {
      removedCount++;
      diffLogs.push({
        sync_id: crypto.randomUUID(),
        timestamp: now,
        change_type: "removed",
        teacher_name: live.name,
        field_changed: "all",
        old_value: `${live.name} (${live.designation})`,
        new_value: "REMOVED FROM SOURCE",
        resolution: "pending",
      });
    }
  }

  // 4. Record to sync logs and staging queue (NEVER overwrite live Teachers)
  if (diffLogs.length > 0) {
    await dataAdapter.appendSyncLogs(diffLogs);
    await dataAdapter.setTeachersPending(pendingTeachers);
  }

  await dataAdapter.updateSyncMeta({
    last_hash: newHash,
    last_synced_at: now,
    last_check_status: diffLogs.length > 0 ? "changes_pending_review" : "up_to_date",
  });

  return {
    hasChanges: diffLogs.length > 0,
    meta: {
      lastHash: currentMeta.last_hash,
      newHash,
      syncedAt: now,
    },
    addedCount,
    removedCount,
    modifiedCount,
    diffLogs,
    pendingTeachers,
  };
}
