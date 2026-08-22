import nodemailer from "nodemailer";
import crypto from "crypto";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

/**
 * Creates nodemailer transporter for Gmail SMTP
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE !== "false";

  if (!user || !pass || pass.includes("xxxx")) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: pass.replace(/\s+/g, ""), // clean spaces from Google App Password
    },
  });
}

/**
 * Generates an official SPS reference code for email tracking and filtering
 */
export function generateReferenceCode(type: "INQ" | "ESC" | "CRED", identifier?: string): string {
  const year = new Date().getFullYear();
  const cleanId = (identifier || "FAC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = cleanId.slice(-8) || crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SPS-${type}-${year}-${suffix}`;
}

/**
 * Sends transactional email via Gmail SMTP (with safe mock fallback if credentials not yet set)
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "Superior University Capstone Directorate";
  const fromEmail = process.env.SMTP_USER || "directorate@superior.edu.pk";
  const fromHeader = `"${fromName}" <${fromEmail}>`;

  if (!transporter) {
    console.log("[Mailer Mock] SMTP not configured in .env.local. Simulated send to:", payload.to);
    console.log("[Mailer Mock] Subject:", payload.subject);
    return {
      success: true,
      mocked: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromHeader,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]+>/g, ""),
      replyTo: payload.replyTo || fromEmail,
    });

    return {
      success: true,
      messageId: info.messageId,
      mocked: false,
    };
  } catch (err: any) {
    console.error("[Mailer Error] Failed to send email via Gmail SMTP:", err);
    return {
      success: false,
      error: err.message || "Failed to send email via SMTP",
    };
  }
}

/**
 * Generates an executive, formal university inquiry notice for students
 */
export function generateStudentInquiryEmail(params: {
  studentName: string;
  studentRollNumber: string;
  projectTitle: string;
  submittedGithubUrl: string;
  matchedProjectTitle?: string;
  matchedRollNumber?: string;
  matchedGithubUrl?: string;
  similarityScore?: number;
  customMessage?: string;
}) {
  const refCode = generateReferenceCode("INQ", params.studentRollNumber);
  const subject = `[${refCode}] Academic Integrity Inquiry: Capstone Submission "${params.projectTitle}"`;
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060913; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .wrapper { max-width: 620px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .top-banner { background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); border-bottom: 2px solid #3b82f6; padding: 28px 32px; }
    .university-title { font-size: 11px; font-family: monospace; letter-spacing: 2px; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px; font-weight: 700; }
    .banner-heading { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; line-height: 1.3; }
    .banner-sub { font-size: 12px; color: #cbd5e1; margin: 0; }
    .content { padding: 32px; font-size: 14px; line-height: 1.65; color: #cbd5e1; }
    .case-strip { background: #090d16; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: table; width: 100%; box-sizing: border-box; }
    .case-cell { display: table-cell; vertical-align: middle; }
    .case-label { font-size: 10px; font-family: monospace; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
    .case-val { font-size: 12px; font-family: monospace; font-weight: 700; color: #f1f5f9; }
    .notice-badge { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; }
    .evidence-card { background: #090d16; border: 1px solid #1e293b; border-left: 4px solid #ef4444; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .evidence-title { font-size: 12px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #f87171; margin-bottom: 12px; }
    .evidence-row { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e293b; }
    .evidence-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .field-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-family: monospace; margin-bottom: 2px; }
    .field-val { font-size: 13px; color: #ffffff; font-weight: 600; word-break: break-all; }
    .field-link { color: #60a5fa; text-decoration: none; }
    .admin-note-box { background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; padding: 18px; margin: 24px 0; }
    .action-box { background: #172554; border: 1px solid #1d4ed8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .deadline-highlight { color: #fbbf24; font-weight: 700; }
    .signature { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; }
    .footer { background: #090d16; border-top: 1px solid #1e293b; padding: 20px 32px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Top University Banner -->
    <div class="top-banner">
      <div class="university-title">Superior University · Faculty of CS & IT</div>
      <h1 class="banner-heading">Official Academic Integrity Notice</h1>
      <p class="banner-sub">Office of the Capstone Evaluation Board & Engineering Directorate</p>
    </div>

    <div class="content">
      <!-- Reference Case Strip -->
      <table class="case-strip" role="presentation">
        <tr>
          <td class="case-cell" style="width: 50%;">
            <div class="case-label">Case Reference ID</div>
            <div class="case-val">${refCode}</div>
          </td>
          <td class="case-cell" style="width: 30%;">
            <div class="case-label">Date Issued</div>
            <div class="case-val">${issuedDate}</div>
          </td>
          <td class="case-cell" style="width: 20%; text-align: right;">
            <span class="notice-badge">Inquiry Stage</span>
          </td>
        </tr>
      </table>

      <p style="margin-top: 0;">
        Dear <strong>${params.studentName}</strong> (Roll No: <code style="color: #60a5fa; font-size: 13px;">${params.studentRollNumber}</code>),
      </p>

      <p>
        This communication serves as a formal academic inquiry from the <strong>Capstone Evaluation Board</strong>. During our automated code originality review, your project submission <strong>"${params.projectTitle}"</strong> was flagged for significant repository similarity and structural overlap with previously published work.
      </p>

      <!-- Technical Evidence Breakdown -->
      <div class="evidence-card">
        <div class="evidence-title">Automated Originality Audit Findings</div>

        <div class="evidence-row">
          <div class="field-label">Your Submitted Repository</div>
          <div class="field-val"><a href="${params.submittedGithubUrl}" class="field-link">${params.submittedGithubUrl}</a></div>
        </div>

        ${params.matchedGithubUrl ? `
        <div class="evidence-row">
          <div class="field-label" style="color: #f87171;">Matched Historical Repository (Archive)</div>
          <div class="field-val" style="color: #fca5a5;">${params.matchedProjectTitle || "Archived Work"}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Submitted by: <strong>${params.matchedRollNumber || "Previous Batch Student"}</strong> · <a href="${params.matchedGithubUrl}" style="color: #94a3b8;">${params.matchedGithubUrl}</a>
          </div>
        </div>
        ` : ""}

        ${params.similarityScore ? `
        <div class="evidence-row">
          <div class="field-label">Similarity / Plagiarism Index</div>
          <div class="field-val" style="color: #fbbf24; font-family: monospace;">${params.similarityScore}% Match</div>
        </div>
        ` : ""}
      </div>

      ${params.customMessage ? `
      <div class="admin-note-box">
        <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px;">
          Case Officer Review Directives:
        </div>
        <p style="margin: 0; color: #f1f5f9; font-size: 13px; font-style: italic;">
          &ldquo;${params.customMessage}&rdquo;
        </p>
      </div>
      ` : ""}

      <!-- Action Required Box -->
      <div class="action-box">
        <div style="font-size: 12px; font-family: monospace; font-weight: 800; text-transform: uppercase; color: #93c5fd; margin-bottom: 8px;">
          Mandatory Action Required
        </div>
        <p style="margin: 0; font-size: 13px; color: #e0e7ff; line-height: 1.6;">
          You are required to submit a formal written clarification within <span class="deadline-highlight">48 hours</span> of receiving this notice by <strong>replying directly to this email</strong>.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #bfdbfe;">
          If this submission represents an authorized v2 continuation, a multi-phase laboratory research project, or a supervised group effort, you must attach written supervisory authorization.
        </p>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        <strong>Academic Notice:</strong> Under Superior University Capstone Guidelines (Clause 4.2), unaddressed repository duplications are automatically referred to the <em>Departmental Disciplinary Committee</em> and your Supervising Faculty for grading nullification.
      </p>

      <div class="signature">
        <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Office of Academic Integrity & Capstone Review</div>
        <div style="font-size: 12px; color: #94a3b8;">Faculty of Computer Science & Information Technology · Superior University</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} Superior University — Official Academic Directorate Transmission.</p>
      <p style="margin: 0;">Case ID: <code>${refCode}</code> · You may reply directly to this email to submit your clarification.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, refCode };
}

/**
 * Generates an executive, formal disciplinary escalation dossier for supervising faculty
 */
export function generateTeacherEscalationEmail(params: {
  teacherName: string;
  studentName: string;
  studentRollNumber: string;
  projectTitle: string;
  submittedGithubUrl: string;
  matchedProjectTitle?: string;
  matchedRollNumber?: string;
  matchedGithubUrl?: string;
  similarityScore?: number;
  adminNotes?: string;
  studentResponse?: string;
}) {
  const refCode = generateReferenceCode("ESC", params.studentRollNumber);
  const subject = `[${refCode}] Faculty Disciplinary Dossier: ${params.studentName} (${params.studentRollNumber})`;
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060913; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .wrapper { max-width: 620px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .top-banner { background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border-bottom: 2px solid #ef4444; padding: 28px 32px; }
    .university-title { font-size: 11px; font-family: monospace; letter-spacing: 2px; text-transform: uppercase; color: #fca5a5; margin-bottom: 6px; font-weight: 700; }
    .banner-heading { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; line-height: 1.3; }
    .banner-sub { font-size: 12px; color: #fecaca; margin: 0; }
    .content { padding: 32px; font-size: 14px; line-height: 1.65; color: #cbd5e1; }
    .case-strip { background: #090d16; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: table; width: 100%; box-sizing: border-box; }
    .case-cell { display: table-cell; vertical-align: middle; }
    .case-label { font-size: 10px; font-family: monospace; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
    .case-val { font-size: 12px; font-family: monospace; font-weight: 700; color: #f1f5f9; }
    .priority-badge { display: inline-block; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; }
    .dossier-card { background: #090d16; border: 1px solid #1e293b; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .dossier-row { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e293b; }
    .dossier-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .field-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-family: monospace; margin-bottom: 2px; }
    .field-val { font-size: 13px; color: #ffffff; font-weight: 600; word-break: break-all; }
    .field-link { color: #60a5fa; text-decoration: none; }
    .action-checklist { background: #090d16; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .checklist-item { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #e2e8f0; }
    .checklist-item:last-child { margin-bottom: 0; }
    .signature { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; }
    .footer { background: #090d16; border-top: 1px solid #1e293b; padding: 20px 32px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Top University Header -->
    <div class="top-banner">
      <div class="university-title">Superior University · Department of Computer Science</div>
      <h1 class="banner-heading">Faculty Disciplinary Escalation Dossier</h1>
      <p class="banner-sub">Transferred for Supervisory Review & Action</p>
    </div>

    <div class="content">
      <!-- Case Meta Strip -->
      <table class="case-strip" role="presentation">
        <tr>
          <td class="case-cell" style="width: 50%;">
            <div class="case-label">Dossier Reference ID</div>
            <div class="case-val">${refCode}</div>
          </td>
          <td class="case-cell" style="width: 30%;">
            <div class="case-label">Escalated On</div>
            <div class="case-val">${issuedDate}</div>
          </td>
          <td class="case-cell" style="width: 20%; text-align: right;">
            <span class="priority-badge">Escalated</span>
          </td>
        </tr>
      </table>

      <p style="margin-top: 0;">
        Respected <strong>${params.teacherName}</strong>,
      </p>

      <p>
        The Capstone Directorate has transferred the following project submission under your direct supervision for formal supervisory review and disciplinary action due to <strong>flagged repository duplication and plagiarism</strong>.
      </p>

      <!-- Complete Disciplinary Evidence Packet -->
      <div class="dossier-card">
        <div style="font-size: 12px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #f59e0b; margin-bottom: 14px;">
          Student & Repository Investigation Dossier
        </div>

        <div class="dossier-row">
          <div class="field-label">Student Identification</div>
          <div class="field-val">${params.studentName} — <code style="color: #60a5fa;">${params.studentRollNumber}</code></div>
        </div>

        <div class="dossier-row">
          <div class="field-label">Flagged Capstone Submission</div>
          <div class="field-val">${params.projectTitle}</div>
          <div style="font-size: 12px; margin-top: 2px;"><a href="${params.submittedGithubUrl}" class="field-link">${params.submittedGithubUrl}</a></div>
        </div>

        ${params.matchedGithubUrl ? `
        <div class="dossier-row">
          <div class="field-label" style="color: #f87171;">Matched Archive Project (Original Source)</div>
          <div class="field-val" style="color: #fca5a5;">${params.matchedProjectTitle || "Archived Work"} (Roll: ${params.matchedRollNumber || "Previous Batch"})</div>
          <div style="font-size: 12px; margin-top: 2px;"><a href="${params.matchedGithubUrl}" style="color: #94a3b8;">${params.matchedGithubUrl}</a></div>
        </div>
        ` : ""}

        ${params.similarityScore ? `
        <div class="dossier-row">
          <div class="field-label">Plagiarism / Similarity Index</div>
          <div class="field-val" style="color: #fbbf24; font-family: monospace;">${params.similarityScore}% Overlap</div>
        </div>
        ` : ""}
      </div>

      ${params.adminNotes ? `
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 12px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #fcd34d; margin-bottom: 6px;">
          Case Officer Directorate Findings:
        </div>
        <p style="margin: 0; color: #fef3c7; font-size: 13px;">
          ${params.adminNotes}
        </p>
      </div>
      ` : ""}

      ${params.studentResponse ? `
      <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px;">
          Student Response / Explanation (if any):
        </div>
        <p style="margin: 0; color: #e2e8f0; font-size: 13px; font-style: italic;">
          &ldquo;${params.studentResponse}&rdquo;
        </p>
      </div>
      ` : ""}

      <!-- Action Required by Faculty -->
      <div class="action-checklist">
        <div style="font-size: 12px; font-family: monospace; font-weight: 700; text-transform: uppercase; color: #ffffff; margin-bottom: 12px;">
          Supervising Faculty Action Steps
        </div>
        <div class="checklist-item">
          <span>1.</span>
          <span>Inspect the codebases and commit trees between the two repositories.</span>
        </div>
        <div class="checklist-item">
          <span>2.</span>
          <span>Conduct an individual viva/hearing with the student regarding original contribution.</span>
        </div>
        <div class="checklist-item">
          <span>3.</span>
          <span>Submit your supervisory recommendation (Authorized Continuation vs Grading Penalty) to the Head of Department.</span>
        </div>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        <em>Note: The project has been automatically hidden from the public showcase pending your supervisory decision.</em>
      </p>

      <div class="signature">
        <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Office of Academic Integrity & Faculty Coordination</div>
        <div style="font-size: 12px; color: #94a3b8;">Faculty of Computer Science & Information Technology · Superior University</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} Superior University — Internal Faculty Disciplinary Transmission.</p>
      <p style="margin: 0;">Case ID: <code>${refCode}</code> · Direct reply enabled for supervisory findings submission.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, refCode };
}

/**
 * Generates an executive university welcome email with faculty login credentials & permissions
 */
export function generateTeacherCredentialsEmail(params: {
  teacherName: string;
  teacherEmail: string;
  temporaryPassword: string;
  designation?: string;
  loginUrl: string;
  permissionsList: string[];
}): { subject: string; html: string; refCode: string } {
  const refCode = generateReferenceCode("CRED", params.teacherEmail.split("@")[0]);
  const subject = `[${refCode}] Faculty Portal Access & Credentials — Superior University Capstone Showcase`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faculty Portal Credentials</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0f1d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .container { max-width: 620px; margin: 24px auto; background-color: #111827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); padding: 32px 24px; border-bottom: 2px solid #3b82f6; text-align: center; }
    .badge { display: inline-block; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd; font-size: 11px; font-weight: 700; font-family: monospace; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .content { padding: 32px 24px; }
    .cred-card { background-color: #0a0f1d; border: 1px solid #2563eb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 16px; }
    .footer { padding: 20px 24px; background-color: #0a0f1d; border-top: 1px solid #1f293d; font-size: 11px; color: #64748b; text-align: center; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Superior University · Faculty Access Authorization</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Faculty Workbench Credentials</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd;">Department of Computer Science & Information Technology</p>
    </div>

    <div class="content">
      <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">
        Dear <strong>${params.teacherName}</strong>${params.designation ? ` (${params.designation})` : ""},
      </p>

      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Your faculty administrator account has been provisioned on the <strong>Superior University Project Showcase Platform</strong>. You may now securely log in to supervise student capstone submissions, evaluate viva presentations, and manage academic queries.
      </p>

      <div class="cred-card">
        <div style="font-size: 11px; font-family: monospace; color: #60a5fa; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
          Your Secure Login Credentials
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; width: 140px;">Portal URL:</td>
            <td style="color: #ffffff; padding: 6px 0;"><a href="${params.loginUrl}" style="color: #60a5fa; text-decoration: underline;">${params.loginUrl}</a></td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">University Email:</td>
            <td style="color: #ffffff; font-family: monospace; padding: 6px 0; font-weight: bold;">${params.teacherEmail}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Temporary Password:</td>
            <td style="padding: 6px 0;">
              <code style="background: rgba(59, 130, 246, 0.2); color: #38bdf8; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 14px; border: 1px solid rgba(56, 189, 248, 0.3);">${params.temporaryPassword}</code>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #1f293d; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 11px; font-family: monospace; color: #cbd5e1; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
          Authorized Permissions & Access Scope
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #94a3b8; line-height: 1.7;">
          ${params.permissionsList.map((p) => `<li><strong style="color: #e2e8f0;">${p}</strong></li>`).join("")}
        </ul>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.loginUrl}" class="btn">Sign In to Faculty Workbench →</a>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #1f293d; font-size: 12px; color: #94a3b8;">
        <div style="font-weight: 700; color: #ffffff;">Office of Academic Administration</div>
        <div>Faculty of Computer Science & Information Technology · Superior University</div>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} Superior University — Confidential Faculty Access Dispatch.</p>
      <p style="margin: 0;">Reference ID: <code>${refCode}</code> · Please do not share temporary credentials.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, refCode };
}
