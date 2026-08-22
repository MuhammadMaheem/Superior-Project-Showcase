import { z } from "zod";

export interface Project {
  id: string;
  roll_number: string;
  student_name: string;
  student_avatar_url: string;
  project_title: string;
  description: string;
  tech_stack: string; // Comma-separated in sheet, parsed to string[] when needed
  github_url: string;
  live_url?: string;
  video_url?: string; // YouTube, Google Drive, Loom, Vimeo or direct video link
  linkedin_url?: string;
  email?: string;
  batch_section: string;
  subject: string;
  supervisor_name: string;
  screenshot_1?: string;
  screenshot_2?: string;
  screenshot_3?: string;
  screenshot_4?: string;
  status: "published" | "hidden";
  submitted_at: string;
  updated_at: string;
}

export interface Teacher {
  name: string;
  slug: string;
  employee_code: string;
  designation: string;
  subjects: string; // Comma-separated or raw string
  sections: string;
  superior_email: string;
  image: string;
  office_number: string;
  weekly_classes: number;
  weekly_hours: number;
  workload_tier: string;
  theme_color: string;
  glow_color: string;
  tier_class: string;
  last_synced_at: string;
}

export interface TeacherPending extends Teacher {
  status: "pending" | "approved" | "rejected";
  detected_at: string;
}

export interface TeacherSyncMeta {
  last_hash: string;
  last_synced_at: string;
  last_check_status: string;
}

export interface TeacherSyncLog {
  sync_id: string;
  timestamp: string;
  change_type: "added" | "removed" | "modified";
  teacher_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  resolution: "approved" | "rejected" | "pending";
}

export interface QueryMessage {
  id: string;
  name: string;
  email?: string;
  roll_number?: string;
  related_project_id?: string;
  message: string;
  status: "open" | "resolved";
  submitted_at: string;
  admin_response?: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
}

export interface VisitorEvent {
  id: string;
  timestamp: string;
  path: string;
  projectId?: string;
  projectTitle?: string;
  referrer?: string;
  device?: "desktop" | "mobile" | "tablet";
  ipHash?: string;
}

export interface TeacherPermissions {
  can_view_all_projects: boolean; // true = all projects; false = only their supervised projects
  can_edit_projects: boolean;     // Can edit project status, title, details
  can_delete_projects: boolean;   // Can delete projects
  can_send_inquiries: boolean;    // Can send similarity inquiry emails to students
  can_escalate_faculty: boolean;  // Can escalate dossiers to disciplinary faculty
  can_manage_queries: boolean;    // Can view & resolve student help desk queries
  can_view_telemetry: boolean;    // Can view visitor analytics & traffic graphs
}

export const DEFAULT_TEACHER_PERMISSIONS: TeacherPermissions = {
  can_view_all_projects: true,
  can_edit_projects: false,
  can_delete_projects: false,
  can_send_inquiries: true,
  can_escalate_faculty: true,
  can_manage_queries: false,
  can_view_telemetry: false,
};

export const SUPER_ADMIN_PERMISSIONS: TeacherPermissions = {
  can_view_all_projects: true,
  can_edit_projects: true,
  can_delete_projects: true,
  can_send_inquiries: true,
  can_escalate_faculty: true,
  can_manage_queries: true,
  can_view_telemetry: true,
};

export interface TeacherAccount {
  id: string;                      // "usr-teacher-xxxx"
  email: string;                   // "dr.ahmed@superior.edu.pk"
  name: string;                    // "Dr. Ahmed Bilal"
  designation: string;             // "Associate Professor & FYP Evaluator"
  password_hash: string;           // Salted password hash
  is_active: boolean;              // true = Active, false = Suspended
  role: "TEACHER" | "SUPER_ADMIN";
  permissions: TeacherPermissions;
  assigned_subjects?: string[];    // e.g. ["Deep Learning", "Machine Learning"]
  created_at: string;
  last_login_at?: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "TEACHER";
  permissions: TeacherPermissions;
  assigned_subjects?: string[];
}

export interface TrafficStats {
  totalPageviews: number;
  uniqueVisitors: number;
  activeVisitorsNow: number;
  topProjects: {
    id: string;
    title: string;
    rollNumber: string;
    views: number;
  }[];
  referrers: { source: string; count: number; percentage: number }[];
  deviceBreakdown: { desktop: number; mobile: number };
  dailyViews: { date: string; views: number }[];
  recentEvents: VisitorEvent[];
}

/**
 * Normalizes video links (YouTube, Google Drive, Loom, Vimeo) to their embeddable preview URLs
 */
export function normalizeVideoEmbedUrl(url?: string): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // 1. YouTube watch or short links
  // e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}`;
  }

  // 2. Google Drive preview links
  // e.g. https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`;
  }
  const gDriveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (gDriveOpenMatch && gDriveOpenMatch[1]) {
    return `https://drive.google.com/file/d/${gDriveOpenMatch[1]}/preview`;
  }

  // 3. Loom video links
  // e.g. https://www.loom.com/share/abcdef123456
  const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9_-]+)/i);
  if (loomMatch && loomMatch[1]) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  // 4. Vimeo video links
  // e.g. https://vimeo.com/123456789
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

// Zod Schemas for Public Forms & Server Validation
export const ProjectSubmissionSchema = z.object({
  roll_number: z
    .string()
    .min(3, "Roll number must be at least 3 characters")
    .max(30, "Roll number cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Roll number should only contain letters, numbers, hyphens or underscores"),
  student_name: z
    .string()
    .min(2, "Student name must be at least 2 characters")
    .max(100, "Student name cannot exceed 100 characters"),
  student_avatar_url: z
    .string()
    .url("Invalid avatar URL")
    .optional()
    .or(z.literal("")),
  project_title: z
    .string()
    .min(3, "Project title must be at least 3 characters")
    .max(150, "Project title cannot exceed 150 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(3000, "Description cannot exceed 3000 characters"),
  tech_stack: z
    .string()
    .min(2, "Please provide at least one technology tag"),
  github_url: z
    .string()
    .url("Invalid GitHub URL")
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/, "Must be a valid GitHub repository URL"),
  live_url: z
    .string()
    .url("Invalid Live URL")
    .optional()
    .or(z.literal("")),
  video_url: z
    .string()
    .url("Invalid Video / Google Drive URL")
    .optional()
    .or(z.literal("")),
  linkedin_url: z
    .string()
    .url("Invalid LinkedIn URL")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  batch_section: z
    .string()
    .min(2, "Please select your Batch / Section"),
  subject: z
    .string()
    .min(2, "Please select a Subject"),
  supervisor_name: z
    .string()
    .min(2, "Please select a Supervisor"),
  screenshots: z
    .array(z.string())
    .max(4, "Maximum 4 screenshots allowed")
    .optional(),
  honeypot: z.string().optional(), // Spam trap field
});

export const QuerySubmissionSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  roll_number: z
    .string()
    .max(30, "Roll number cannot exceed 30 characters")
    .optional()
    .or(z.literal("")),
  related_project_id: z.string().optional().or(z.literal("")),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
  honeypot: z.string().optional(),
});
