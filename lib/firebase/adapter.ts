import { getFirestoreDb } from "./client";
import { uploadScreenshotToFirebaseStorage } from "./storage";
import { normalizeVideoEmbedUrl } from "../sheets/models";
import type {
  Project,
  Teacher,
  TeacherPending,
  TeacherSyncMeta,
  TeacherSyncLog,
  QueryMessage,
  AdminAuditLog,
} from "../sheets/models";
import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import crypto from "crypto";

export class FirebaseDataAdapter {
  private getDb(): Firestore {
    const db = getFirestoreDb();
    if (!db) {
      throw new Error("Firestore Database is not configured. Please check your FIREBASE_* environment variables.");
    }
    return db;
  }

  // ==========================================
  // PROJECTS COLLECTION
  // ==========================================

  async getProjects(filter?: { publishedOnly?: boolean }): Promise<Project[]> {
    const db = this.getDb();
    let queryRef: FirebaseFirestore.Query = db.collection("projects");
    if (filter?.publishedOnly) {
      queryRef = queryRef.where("status", "==", "published");
    }
    const snapshot = await queryRef.get();
    const list = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];

    return list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }

  async getPublishedProjects(): Promise<Project[]> {
    return this.getProjects({ publishedOnly: true });
  }

  async getProjectById(id: string): Promise<Project | null> {
    const db = this.getDb();
    const doc = await db.collection("projects").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Project;
  }

  async createProject(projectData: Omit<Project, "id" | "submitted_at" | "updated_at">): Promise<Project> {
    const db = this.getDb();
    const projectId = `proj-${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    // 1. Upload base64 screenshots to Firebase Storage if present
    let s1 = projectData.screenshot_1;
    let s2 = projectData.screenshot_2;
    let s3 = projectData.screenshot_3;
    let s4 = projectData.screenshot_4;

    try {
      if (s1 && s1.startsWith("data:")) s1 = await uploadScreenshotToFirebaseStorage(s1, projectId, 1);
      if (s2 && s2.startsWith("data:")) s2 = await uploadScreenshotToFirebaseStorage(s2, projectId, 2);
      if (s3 && s3.startsWith("data:")) s3 = await uploadScreenshotToFirebaseStorage(s3, projectId, 3);
      if (s4 && s4.startsWith("data:")) s4 = await uploadScreenshotToFirebaseStorage(s4, projectId, 4);
    } catch (err) {
      console.warn("[FirebaseAdapter] Storage upload warning (fallback to raw):", err);
    }

    const newProject: Project = {
      ...projectData,
      id: projectId,
      video_url: normalizeVideoEmbedUrl(projectData.video_url),
      screenshot_1: s1,
      screenshot_2: s2,
      screenshot_3: s3,
      screenshot_4: s4,
      status: projectData.status || "published",
      submitted_at: now,
      updated_at: now,
    };

    await db.collection("projects").doc(projectId).set(newProject);
    return newProject;
  }

  async insertProject(projectData: Omit<Project, "id" | "submitted_at" | "updated_at">): Promise<Project> {
    return this.createProject(projectData);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const db = this.getDb();
    const ref = db.collection("projects").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;

    if (updates.video_url) {
      updates.video_url = normalizeVideoEmbedUrl(updates.video_url);
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await ref.update(payload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const db = this.getDb();
    await db.collection("projects").doc(id).delete();
    return true;
  }

  // ==========================================
  // TEACHERS COLLECTION
  // ==========================================

  async getTeachers(): Promise<Teacher[]> {
    const db = this.getDb();
    const snapshot = await db.collection("teachers").orderBy("name", "asc").get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Teacher);
  }

  async setTeachers(teachers: Teacher[]): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();

    // Clear old teachers
    const oldDocs = await db.collection("teachers").get();
    oldDocs.forEach((d: QueryDocumentSnapshot) => batch.delete(d.ref));

    // Insert new teachers
    teachers.forEach((t) => {
      const ref = db.collection("teachers").doc(t.slug);
      batch.set(ref, t);
    });

    await batch.commit();
  }

  async getTeachersPending(): Promise<TeacherPending[]> {
    const db = this.getDb();
    const snapshot = await db.collection("teachers_pending").where("status", "==", "pending").get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as TeacherPending);
  }

  async setTeachersPending(pendingList: TeacherPending[]): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();

    const oldDocs = await db.collection("teachers_pending").get();
    oldDocs.forEach((d: QueryDocumentSnapshot) => batch.delete(d.ref));

    pendingList.forEach((t) => {
      const ref = db.collection("teachers_pending").doc(t.slug);
      batch.set(ref, t);
    });

    await batch.commit();
  }

  async updatePendingTeacher(slug: string, updates: Partial<TeacherPending>): Promise<TeacherPending | null> {
    const db = this.getDb();
    const ref = db.collection("teachers_pending").doc(slug);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const payload = {
      ...updates,
      last_synced_at: new Date().toISOString(),
    };

    await ref.update(payload);
    const updated = await ref.get();
    return updated.data() as TeacherPending;
  }

  // ==========================================
  // TEACHER SYNC METADATA & LOGS
  // ==========================================

  async getSyncMeta(): Promise<TeacherSyncMeta> {
    const db = this.getDb();
    const doc = await db.collection("teachers_sync_meta").doc("meta").get();
    if (!doc.exists) {
      return {
        last_hash: "",
        last_synced_at: "Never",
        last_check_status: "Initialized",
      };
    }
    return doc.data() as TeacherSyncMeta;
  }

  async updateSyncMeta(metaUpdates: Partial<TeacherSyncMeta>): Promise<void> {
    const db = this.getDb();
    const current = await this.getSyncMeta();
    const updated: TeacherSyncMeta = {
      ...current,
      ...metaUpdates,
    };
    await db.collection("teachers_sync_meta").doc("meta").set(updated);
  }

  async getSyncLogs(): Promise<TeacherSyncLog[]> {
    const db = this.getDb();
    const snapshot = await db.collection("teachers_sync_log").orderBy("timestamp", "desc").limit(100).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as TeacherSyncLog);
  }

  async appendSyncLogs(newLogs: TeacherSyncLog[]): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();
    newLogs.forEach((log) => {
      const id = log.sync_id || `log-${crypto.randomBytes(4).toString("hex")}`;
      const ref = db.collection("teachers_sync_log").doc(id);
      batch.set(ref, log);
    });
    await batch.commit();
  }

  async updateSyncLogResolution(syncId: string, resolution: "approved" | "rejected"): Promise<void> {
    const db = this.getDb();
    const ref = db.collection("teachers_sync_log").doc(syncId);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.update({ resolution });
    }
  }

  // ==========================================
  // QUERIES COLLECTION
  // ==========================================

  async getQueries(): Promise<QueryMessage[]> {
    const db = this.getDb();
    const snapshot = await db.collection("queries").orderBy("submitted_at", "desc").get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as QueryMessage[];
  }

  async createQuery(queryData: Omit<QueryMessage, "id" | "status" | "submitted_at">): Promise<QueryMessage> {
    const db = this.getDb();
    const queryId = `query-${crypto.randomBytes(4).toString("hex")}`;
    const newQuery: QueryMessage = {
      ...queryData,
      id: queryId,
      status: "open",
      submitted_at: new Date().toISOString(),
    };
    await db.collection("queries").doc(queryId).set(newQuery);
    return newQuery;
  }

  async respondToQuery(id: string, adminResponse: string, status: "open" | "resolved" = "resolved"): Promise<QueryMessage | null> {
    const db = this.getDb();
    const ref = db.collection("queries").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const payload: Partial<QueryMessage> = {
      status,
      admin_response: adminResponse || "",
    };

    await ref.update(payload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as QueryMessage;
  }

  // ==========================================
  // AUDIT LOG COLLECTION
  // ==========================================

  async logAdminAction(action: string, targetType: string, targetId: string, details: string): Promise<void> {
    try {
      const db = this.getDb();
      const logId = `audit-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const logEntry: AdminAuditLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      };
      await db.collection("audit_logs").doc(logId).set(logEntry);
    } catch (err) {
      console.error("[FirebaseAdapter] Audit log error:", err);
    }
  }

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    const db = this.getDb();
    const snapshot = await db.collection("audit_logs").orderBy("timestamp", "desc").limit(100).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as AdminAuditLog[];
  }
}

export const firebaseAdapter = new FirebaseDataAdapter();
