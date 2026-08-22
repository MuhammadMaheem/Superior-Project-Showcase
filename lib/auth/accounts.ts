import crypto from "crypto";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  DEFAULT_TEACHER_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  type TeacherAccount,
  type TeacherPermissions,
} from "@/lib/sheets/models";

export { DEFAULT_TEACHER_PERMISSIONS, SUPER_ADMIN_PERMISSIONS };

const COLLECTION_NAME = "teacher_accounts";

/**
 * Hashes a plaintext password using salt + PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, originalHash] = storedHash.split(":");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
  } catch {
    return false;
  }
}

// Pre-seeded demo faculty accounts for easy 1-click testing
let localTeacherAccounts: TeacherAccount[] = [
  {
    id: "usr-teacher-ahmed-demo",
    email: "dr.ahmed.bilal@superior.edu.pk",
    name: "Dr. Ahmed Bilal",
    designation: "Associate Professor & FYP Evaluator",
    password_hash: hashPassword("Password123!"),
    is_active: true,
    role: "TEACHER",
    permissions: {
      can_view_all_projects: true,
      can_edit_projects: true,
      can_delete_projects: false,
      can_send_inquiries: true,
      can_escalate_faculty: true,
      can_manage_queries: false,
      can_view_telemetry: true,
    },
    assigned_subjects: ["Deep Learning", "Machine Learning"],
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-teacher-sarah-demo",
    email: "sarah.khan@superior.edu.pk",
    name: "Dr. Sarah Khan",
    designation: "Assistant Professor (AI/ML)",
    password_hash: hashPassword("Password123!"),
    is_active: true,
    role: "TEACHER",
    permissions: {
      can_view_all_projects: false,
      can_edit_projects: false,
      can_delete_projects: false,
      can_send_inquiries: true,
      can_escalate_faculty: false,
      can_manage_queries: false,
      can_view_telemetry: false,
    },
    assigned_subjects: ["Computer Networks", "Information Security"],
    created_at: new Date().toISOString(),
  },
];

/**
 * Generates a random secure temporary password
 */
export function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

/**
 * Retrieves all teacher accounts
 */
export async function getTeacherAccounts(): Promise<TeacherAccount[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).orderBy("created_at", "desc").get();
      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as TeacherAccount);
      }
    } catch (err) {
      console.warn("[Accounts] Error fetching from Firestore, using fallback:", err);
    }
  }
  return [...localTeacherAccounts];
}

/**
 * Retrieves a teacher account by Email
 */
export async function getTeacherAccountByEmail(email: string): Promise<TeacherAccount | null> {
  const cleanEmail = email.toLowerCase().trim();
  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await db.collection(COLLECTION_NAME).where("email", "==", cleanEmail).limit(1).get();
      if (!snap.empty) {
        return snap.docs[0].data() as TeacherAccount;
      }
    } catch (err) {
      console.warn("[Accounts] Error fetching by email from Firestore:", err);
    }
  }
  const match = localTeacherAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
  return match || null;
}

/**
 * Retrieves a teacher account by ID
 */
export async function getTeacherAccountById(id: string): Promise<TeacherAccount | null> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const doc = await db.collection(COLLECTION_NAME).doc(id).get();
      if (doc.exists) {
        return doc.data() as TeacherAccount;
      }
      return null;
    } catch (err) {
      console.warn("[Accounts] Error fetching by ID from Firestore:", err);
    }
  }
  const match = localTeacherAccounts.find((a) => a.id === id);
  return match || null;
}

/**
 * Creates a new teacher account
 */
export async function createTeacherAccount(params: {
  name: string;
  email: string;
  designation?: string;
  password?: string;
  permissions?: Partial<TeacherPermissions>;
  assigned_subjects?: string[];
}): Promise<{ account: TeacherAccount; plainPassword: string }> {
  const cleanEmail = params.email.toLowerCase().trim();
  const existing = await getTeacherAccountByEmail(cleanEmail);
  if (existing) {
    throw new Error(`An account already exists for email: ${cleanEmail}`);
  }

  const plainPassword = params.password || generateRandomPassword();
  const password_hash = hashPassword(plainPassword);
  const id = `usr-teacher-${crypto.randomBytes(4).toString("hex")}`;

  const account: TeacherAccount = {
    id,
    email: cleanEmail,
    name: params.name.trim(),
    designation: params.designation?.trim() || "Faculty Member",
    password_hash,
    is_active: true,
    role: "TEACHER",
    permissions: {
      ...DEFAULT_TEACHER_PERMISSIONS,
      ...(params.permissions || {}),
    },
    assigned_subjects: params.assigned_subjects || [],
    created_at: new Date().toISOString(),
  };

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection(COLLECTION_NAME).doc(id).set(account);
    } catch (err) {
      console.warn("[Accounts] Failed to write account to Firestore, saving locally:", err);
      localTeacherAccounts.push(account);
    }
  } else {
    localTeacherAccounts.push(account);
  }

  return { account, plainPassword };
}

/**
 * Updates a teacher's permissions or active status
 */
export async function updateTeacherAccount(
  id: string,
  updates: {
    name?: string;
    designation?: string;
    is_active?: boolean;
    permissions?: Partial<TeacherPermissions>;
    assigned_subjects?: string[];
    newPassword?: string;
  }
): Promise<TeacherAccount | null> {
  const account = await getTeacherAccountById(id);
  if (!account) return null;

  if (updates.name) account.name = updates.name.trim();
  if (updates.designation) account.designation = updates.designation.trim();
  if (typeof updates.is_active === "boolean") account.is_active = updates.is_active;
  if (updates.permissions) {
    account.permissions = {
      ...account.permissions,
      ...updates.permissions,
    };
  }
  if (updates.assigned_subjects) account.assigned_subjects = updates.assigned_subjects;
  if (updates.newPassword) {
    account.password_hash = hashPassword(updates.newPassword);
  }

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection(COLLECTION_NAME).doc(id).set(account, { merge: true });
    } catch (err) {
      console.warn("[Accounts] Error updating account in Firestore:", err);
    }
  }

  const idx = localTeacherAccounts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    localTeacherAccounts[idx] = account;
  }

  return account;
}

/**
 * Deletes a teacher account
 */
export async function deleteTeacherAccount(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (err) {
      console.warn("[Accounts] Error deleting account from Firestore:", err);
    }
  }
  localTeacherAccounts = localTeacherAccounts.filter((a) => a.id !== id);
  return true;
}

/**
 * Verifies credentials for teacher login
 */
export async function verifyTeacherCredentials(
  email: string,
  plainPassword: string
): Promise<TeacherAccount | null> {
  const account = await getTeacherAccountByEmail(email);
  if (!account) return null;
  if (!account.is_active) {
    throw new Error("Account is currently suspended. Please contact the Super Admin.");
  }
  const isMatch = verifyPassword(plainPassword, account.password_hash);
  if (!isMatch) return null;

  // Update last login timestamp asynchronously
  const db = getFirestoreDb();
  const now = new Date().toISOString();
  account.last_login_at = now;
  if (db) {
    db.collection(COLLECTION_NAME).doc(account.id).update({ last_login_at: now }).catch(() => {});
  }

  return account;
}
