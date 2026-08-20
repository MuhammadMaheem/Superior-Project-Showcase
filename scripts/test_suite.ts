import { sanitizeForSheet, unescapeFromSheet } from "../lib/sheets/sanitize";
import { parseAndValidateGitHubUrl } from "../lib/security/ssrf";
import { validateImageMagicBytes } from "../lib/security/image";
import { normalizeTeachers, computeHash } from "../lib/sync/teachers";

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
console.log("[1/4] Testing Google Sheets Formula Injection Sanitizer (§6.4)...");
assert(sanitizeForSheet("=SUM(A1:B10)") === "'=SUM(A1:B10)", "Neutralize = (equals formula)");
assert(sanitizeForSheet("+cmd|' /C calc'") === "'+cmd|' /C calc'", "Neutralize + (plus formula)");
assert(sanitizeForSheet("-10*5") === "'-10*5", "Neutralize - (minus formula)");
assert(sanitizeForSheet("@HYPERLINK('http://evil.com')") === "'@HYPERLINK('http://evil.com')", "Neutralize @ (at formula)");
assert(sanitizeForSheet("NeuralVision: Edge AI") === "NeuralVision: Edge AI", "Safe string preserved");
assert(unescapeFromSheet("'-10*5") === "-10*5", "Unescape formula escape character");

// 2. SSRF Protection & GitHub URL Validator
console.log("\n[2/4] Testing SSRF Guard & GitHub URL Validator (§6.6)...");
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
console.log("\n[3/4] Testing Image Magic Byte Verification (§6.7)...");
const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
assert(validateImageMagicBytes(jpegHeader).isValid && validateImageMagicBytes(jpegHeader).format === "jpeg", "Verify JPEG magic bytes");

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
assert(validateImageMagicBytes(pngHeader).isValid && validateImageMagicBytes(pngHeader).format === "png", "Verify PNG magic bytes");

const fakePayload = Buffer.from("<!DOCTYPE html><html><body>malicious script</body></html>");
assert(!validateImageMagicBytes(fakePayload).isValid, "Reject text/html masquerading as image");

// 4. Faculty Normalization & SHA-256 Hashing Stability
console.log("\n[4/4] Testing Faculty Normalization & SHA-256 Hashing Stability (§4.5)...");
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

console.log("\n=================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
