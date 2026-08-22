import { sanitizeForSheet, unescapeFromSheet } from "../lib/sheets/sanitize";
import { parseAndValidateGitHubUrl } from "../lib/security/ssrf";
import { validateImageMagicBytes } from "../lib/security/image";
import { normalizeTeachers, computeHash } from "../lib/sync/teachers";
import { normalizeVideoEmbedUrl, ProjectSubmissionSchema, type Project } from "../lib/sheets/models";
import { parseSuperiorRollNumber } from "../lib/utils/roll-number";
import { normalizeRepoUrl, evaluateProjectSimilarity } from "../lib/similarity/detector";
import { hashPassword, verifyPassword } from "../lib/auth/accounts";
import { generateReferenceCode, generateQueryResolutionEmail } from "../lib/email/mailer";

console.log("=================================================");
console.log("  SUPERIOR PROJECT SHOWCASE - QA TEST SUITE      ");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

// 1. Formula Injection Neutralization
console.log("[1/5] Testing Google Sheets Formula Injection Sanitizer (§6.4)...");
assert(sanitizeForSheet("=SUM(A1:B10)") === "'=SUM(A1:B10)", "Neutralize = (equals formula)");
assert(sanitizeForSheet("+cmd|' /C calc'") === "'+cmd|' /C calc'", "Neutralize + (plus formula)");
assert(sanitizeForSheet("-10*5") === "'-10*5", "Neutralize - (minus formula)");
assert(sanitizeForSheet("@HYPERLINK('http://evil.com')") === "'@HYPERLINK('http://evil.com')", "Neutralize @ (at formula)");
assert(sanitizeForSheet("NeuralVision: Edge AI") === "NeuralVision: Edge AI", "Safe string preserved");
assert(unescapeFromSheet("'-10*5") === "-10*5", "Unescape formula escape character");

// 2. SSRF Protection & GitHub URL Validator
console.log("\n[2/5] Testing SSRF Guard & GitHub URL Validator (§6.6)...");
const validGh = parseAndValidateGitHubUrl("https://github.com/facebook/react");
assert(validGh.isValid && validGh.owner === "facebook" && validGh.repo === "react", "Accept valid GitHub URL");

const withGitSuffix = parseAndValidateGitHubUrl("https://github.com/vercel/next.js.git");
assert(withGitSuffix.isValid && withGitSuffix.repo === "next.js", "Strip .git suffix correctly");

const evilDomain = parseAndValidateGitHubUrl("https://evil-phishing-site.com/facebook/react");
assert(!evilDomain.isValid, "Reject non-github domain");

const localhostAttack = parseAndValidateGitHubUrl("http://localhost:3000/admin");
assert(!localhostAttack.isValid, "Reject HTTP localhost");

const traversalAttack = parseAndValidateGitHubUrl("https://github.com/../etc/passwd");
assert(!traversalAttack.isValid, "Reject directory traversal");

// 3. Image Magic Bytes Verification
console.log("\n[3/5] Testing Image Magic Byte Verification (§6.7)...");
const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
assert(validateImageMagicBytes(jpegHeader).isValid && validateImageMagicBytes(jpegHeader).format === "jpeg", "Verify JPEG magic bytes");

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
assert(validateImageMagicBytes(pngHeader).isValid && validateImageMagicBytes(pngHeader).format === "png", "Verify PNG magic bytes");

const fakePayload = Buffer.from("<!DOCTYPE html><html><body>malicious script</body></html>");
assert(!validateImageMagicBytes(fakePayload).isValid, "Reject text/html masquerading as image");

// 4. Faculty Normalization & SHA-256 Hashing Stability
console.log("\n[4/5] Testing Faculty Normalization & SHA-256 Hashing Stability (§4.5)...");
const rawList1 = [
  { name: "dr. abdul waheed ", subjects: "Software Engineering, Foreign Language", sections: "BSSE-6B, BSSE-6A" },
  { name: "DR. ARFAN ALI NAGRA", subjects: "Generative AI, Discrete Structures", sections: "BSAI-2B, BSAI-2C" }
];
const rawList2 = [
  { name: "DR. ARFAN ALI NAGRA", subjects: "Discrete Structures, Generative AI", sections: "BSAI-2C, BSAI-2B" },
  { name: "DR. ABDUL WAHEED", subjects: "Foreign Language, Software Engineering", sections: "BSSE-6A, BSSE-6B" }
];

const norm1 = normalizeTeachers(rawList1);
const norm2 = normalizeTeachers(rawList2);
const hash1 = computeHash(norm1);
const hash2 = computeHash(norm2);

assert(hash1 === hash2, "Deterministic SHA-256 hashing across reordered names and subjects");
assert(norm1[0].name === "DR. ABDUL WAHEED" && norm1[0].subjects === "Foreign Language, Software Engineering", "Alphabetical sorting of faculty and subjects");

// 5. Video & Google Drive Embed Normalization
console.log("\n[5/5] Testing Video & Google Drive Embed Normalization...");
const ytWatch = normalizeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
assert(ytWatch === "https://www.youtube.com/embed/dQw4w9WgXcQ", "Convert YouTube watch URL to embed");

const ytShort = normalizeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=10");
assert(ytShort === "https://www.youtube.com/embed/dQw4w9WgXcQ", "Convert youtu.be short URL to embed");

const gDriveView = normalizeVideoEmbedUrl("https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing");
assert(gDriveView === "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview", "Convert Google Drive view to /preview embed");

const loomLink = normalizeVideoEmbedUrl("https://www.loom.com/share/abc123def456");
assert(loomLink === "https://www.loom.com/embed/abc123def456", "Convert Loom share link to /embed");

const submissionTest = ProjectSubmissionSchema.safeParse({
  roll_number: "BSAI-F22-099",
  student_name: "Zainab Fatima",
  project_title: "MedVision: Retinal Diagnostics",
  description: "Deep convolutional architecture for diabetic retinopathy detection and clinical triage.",
  tech_stack: "Python, PyTorch, React, FastAPI",
  github_url: "https://github.com/facebook/react",
  batch_section: "BSAI-4A",
  subject: "Computer Vision",
  supervisor_name: "Dr. Hafiz Muhammad Tayyab Khushi",
  video_url: "https://youtu.be/dQw4w9WgXcQ",
});
assert(submissionTest.success, "ProjectSubmissionSchema accepts valid video_url and BSAI-4A section");

// 6. Roll Number Smart Parser
console.log("\n[6/7] Testing Superior University Roll Number Smart Parser...");

const parsed1 = parseSuperiorRollNumber("SU92-BSAIM-F24-042");
assert(parsed1.isValid && parsed1.degree === "BSAI" && parsed1.shift === "Morning" && parsed1.batchYear === "Fall 2024", "Parse SU92-BSAIM-F24-042 correctly");

const parsed2 = parseSuperiorRollNumber("BSAI-F21-042");
assert(parsed2.isValid && parsed2.degree === "BSAI" && parsed2.batchYear === "Fall 2021", "Parse legacy BSAI-F21-042 correctly");

const parsed3 = parseSuperiorRollNumber("SU92-BSSEE-F23-112");
assert(parsed3.isValid && parsed3.degree === "BSSE" && parsed3.shift === "Evening" && parsed3.batchYear === "Fall 2023", "Parse Evening shift roll number SU92-BSSEE-F23-112");

// 7. Repository Similarity & Plagiarism Detector
console.log("\n[7/7] Testing Automated Repository Similarity & Plagiarism Detector...");

const canonical1 = normalizeRepoUrl("https://github.com/facebook/react.git/");
const canonical2 = normalizeRepoUrl("http://github.com/FACEBOOK/React");
assert(canonical1 === canonical2 && canonical1 === "github.com/facebook/react", "Normalize GitHub URLs to canonical owner/repo identifier");

const mockExistingProjects: Project[] = [
  {
    id: "proj-1",
    github_url: "https://github.com/superior/agent-swarm",
    project_title: "Autonomous Research Agent Swarm",
    description: "Multi-agent collaborative framework for deep academic exploration.",
    tech_stack: "Python, FastAPI, LangChain, React",
    roll_number: "SU92-BSAIM-F24-054",
    student_name: "Ali Hassan",
    student_avatar_url: "",
    batch_section: "BSAI-8A",
    subject: "Deep Learning",
    supervisor_name: "Dr. Ahmed Bilal",
    submitted_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    status: "published",
  },
];

const duplicateCheck = evaluateProjectSimilarity(
  {
    github_url: "https://github.com/superior/agent-swarm.git",
    project_title: "AI Research Swarm Copy",
    description: "Another multi-agent project",
    tech_stack: "Python, React",
  },
  mockExistingProjects
);
assert(duplicateCheck.flag === "duplicate" && duplicateCheck.exactUrlMatch === true, "Detect exact duplicate repository URL match");

const uniqueCheck = evaluateProjectSimilarity(
  {
    github_url: "https://github.com/student/quantum-cryptex",
    project_title: "Quantum Cryptex Security Engine",
    description: "Post-quantum cryptographic key exchange protocol using lattice cryptography.",
    tech_stack: "Rust, WebAssembly, TypeScript",
  },
  mockExistingProjects
);
assert(uniqueCheck.flag === "unique" && uniqueCheck.score < 25, "Verify unique original project submission");

// 8. Role-Based Access Control & Password Hashing
console.log("\n[8/8] Testing RBAC & Teacher Account Security...");

const testPlainPassword = "SuperiorTeacher2026!";
const testHash = hashPassword(testPlainPassword);
assert(testHash.includes(":") && testHash.length > 50, "Hash password with salt and PBKDF2");
assert(verifyPassword(testPlainPassword, testHash), "Verify matching plaintext password");
assert(!verifyPassword("WrongPassword123", testHash), "Reject incorrect password");

const credRefCode = generateReferenceCode("CRED", "DR-AHMED");
assert(credRefCode.startsWith("SPS-CRED-") && credRefCode.includes("2026"), "Generate valid credentials email reference code");

// 9. Helpdesk Query Email & Reference Code Generator
console.log("\n[9/9] Testing Helpdesk Query Resolution Email Generator...");

const qryRefCode = generateReferenceCode("QRY", "QRY-98124");
assert(qryRefCode.startsWith("SPS-QRY-") && qryRefCode.includes("2026"), "Generate valid helpdesk QRY tracking code");

const qryDraft = generateQueryResolutionEmail({
  queryId: "qry-test-42",
  studentName: "Ali Raza",
  studentEmail: "ali.raza@superior.edu.pk",
  queryType: "Request Project Edit",
  originalMessage: "Please update my github repo URL to the final branch.",
  resolutionNote: "Updated repository link in database.",
  adminName: "Dr. Ahmed Bilal",
});
assert(qryDraft.subject.includes("SPS-QRY-") && qryDraft.subject.includes("Resolution"), "Draft subject contains SPS-QRY reference");
assert(qryDraft.text.includes("Updated repository link in database"), "Draft text contains resolution notes");
assert(qryDraft.html.includes("Ticket Resolved"), "Draft HTML contains professional resolution badge");

// Print Summary
console.log("\n=================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
