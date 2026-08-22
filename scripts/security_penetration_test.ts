import { validateImageMagicBytes } from "../lib/security/image";
import { parseAndValidateGitHubUrl } from "../lib/security/ssrf";
import { sanitizeForSheet } from "../lib/sheets/sanitize";
import { checkRateLimit, recordFailedLogin, isLoginLocked, resetLoginAttempts } from "../lib/security/rate-limit";
import { createTeacherSessionToken, verifyAdminSessionToken } from "../lib/auth/session";
import { SignJWT } from "jose";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

async function runPenetrationSuite() {
  console.log("=================================================");
  console.log("  SUPERIOR PROJECT SHOWCASE - PENETRATION SUITE  ");
  console.log("=================================================\n");

  // --------------------------------------------------------------------------
  // 1. SSRF & Cloud Metadata Injection Protection
  // --------------------------------------------------------------------------
  console.log("[1/7] Testing SSRF & Cloud Metadata Interception Attacks...");

  const awsMetadata = parseAndValidateGitHubUrl("http://169.254.169.254/latest/meta-data/");
  assert(!awsMetadata.isValid, "Block AWS/Cloud metadata IP address (169.254.169.254)");

  const localhostTarget = parseAndValidateGitHubUrl("http://127.0.0.1:3000/api/admin");
  assert(!localhostTarget.isValid, "Block localhost / loopback address (127.0.0.1)");

  const internalHostname = parseAndValidateGitHubUrl("http://localhost:8080/internal");
  assert(!internalHostname.isValid, "Block internal hostname (localhost)");

  const traversalTarget = parseAndValidateGitHubUrl("https://github.com/../../etc/passwd");
  assert(!traversalTarget.isValid, "Block directory traversal payloads");

  const validTarget = parseAndValidateGitHubUrl("https://github.com/facebook/react");
  assert(validTarget.isValid && validTarget.owner === "facebook" && validTarget.repo === "react", "Allow legitimate GitHub repository URLs");

  // --------------------------------------------------------------------------
  // 2. Stored XSS & Polyglot Image Upload Exploits
  // --------------------------------------------------------------------------
  console.log("\n[2/7] Testing Stored XSS & SVG Polyglot Upload Exploits...");

  const svgScriptPayload = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert('XSS')</script></svg>");
  const svgCheck = validateImageMagicBytes(svgScriptPayload);
  assert(!svgCheck.isValid, "Reject SVG images with embedded JavaScript payloads");

  const htmlPayload = Buffer.from("<html><head><script>document.cookie</script></head><body>Fake</body></html>");
  const htmlCheck = validateImageMagicBytes(htmlPayload);
  assert(!htmlCheck.isValid, "Reject HTML files masquerading as images");

  const exePayload = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");
  const exeCheck = validateImageMagicBytes(exePayload);
  assert(!exeCheck.isValid, "Reject binary executable files");

  const realJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegCheck = validateImageMagicBytes(realJpeg);
  assert(jpegCheck.isValid && jpegCheck.format === "jpeg", "Verify authentic JPEG magic bytes");

  const realPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngCheck = validateImageMagicBytes(realPng);
  assert(pngCheck.isValid && pngCheck.format === "png", "Verify authentic PNG magic bytes");

  // --------------------------------------------------------------------------
  // 3. Formula Injection & Spreadsheet Arbitrary Code Execution
  // --------------------------------------------------------------------------
  console.log("\n[3/7] Testing Spreadsheet Formula Injection Attacks...");

  assert(sanitizeForSheet("=cmd|'/C calc'!A0") === "'=cmd|'/C calc'!A0", "Escape '=' formula execution vector");
  assert(sanitizeForSheet("+2+5+cmd|'calc'!A0") === "'+2+5+cmd|'calc'!A0", "Escape '+' formula execution vector");
  assert(sanitizeForSheet("-1+1+cmd|'calc'!A0") === "'-1+1+cmd|'calc'!A0", "Escape '-' formula execution vector");
  assert(sanitizeForSheet("@SUM(1,1)") === "'@SUM(1,1)", "Escape '@' formula execution vector");
  assert(sanitizeForSheet("Normal Project Title") === "Normal Project Title", "Preserve benign strings unmodified");

  // --------------------------------------------------------------------------
  // 4. JWT Cryptographic Forgery & Role Spoofing Attacks
  // --------------------------------------------------------------------------
  console.log("\n[4/7] Testing JWT Cryptographic Forgery & Role Spoofing...");

  const fakeSecret = new TextEncoder().encode("attacker-controlled-fake-secret-key-1234");
  const forgedToken = await new SignJWT({
    role: "SUPER_ADMIN",
    userId: "hacker",
    name: "Malicious Actor",
    permissions: { can_delete_projects: true, can_edit_projects: true, can_manage_queries: true, can_view_all_projects: true },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(fakeSecret);

  const verificationResult = await verifyAdminSessionToken(forgedToken);
  assert(verificationResult === null, "Reject forged JWT signed with an invalid cryptographic key");

  const tamperedToken = forgedToken.slice(0, -10) + "tampered01";
  const tamperedResult = await verifyAdminSessionToken(tamperedToken);
  assert(tamperedResult === null, "Reject tampered JWT signature with modified ciphertext");

  // --------------------------------------------------------------------------
  // 5. RBAC & Privilege Escalation Boundary Testing
  // --------------------------------------------------------------------------
  console.log("\n[5/7] Testing RBAC & Faculty Permission Boundaries...");

  const restrictedTeacherToken = await createTeacherSessionToken({
    id: "teacher-restricted-01",
    name: "Assistant Instructor",
    email: "instructor@superior.edu.pk",
    designation: "Lecturer",
    password_hash: "mock-hash",
    is_active: true,
    role: "TEACHER",
    assigned_subjects: ["Database Systems"],
    permissions: {
      can_view_all_projects: false,
      can_edit_projects: false,
      can_delete_projects: false,
      can_send_inquiries: false,
      can_escalate_faculty: false,
      can_manage_queries: false,
      can_view_telemetry: false,
    },
    created_at: new Date().toISOString(),
  });

  const verifiedSession = await verifyAdminSessionToken(restrictedTeacherToken);
  assert(verifiedSession !== null, "Successfully verify authentic Teacher JWT");
  assert(verifiedSession?.role === "TEACHER", "Correctly resolve session role to TEACHER");
  assert(verifiedSession?.permissions.can_delete_projects === false, "Enforce strict deletion restriction on teacher session");
  assert(verifiedSession?.permissions.can_manage_queries === false, "Enforce strict query management restriction on teacher session");

  // --------------------------------------------------------------------------
  // 6. Denial-of-Service & Rate Limit Flooding Attacks
  // --------------------------------------------------------------------------
  console.log("\n[6/7] Testing Rate Limiting & Flooding Protections...");

  const attackIp = "203.0.113.199";
  const limit = 5;
  const windowMs = 60000;

  // Perform 5 allowed requests
  for (let i = 1; i <= limit; i++) {
    const res = checkRateLimit(`flood-test:${attackIp}`, limit, windowMs);
    assert(res.success, `Request ${i}/${limit} allowed within window`);
  }

  // 6th request must be blocked
  const blockedRes = checkRateLimit(`flood-test:${attackIp}`, limit, windowMs);
  assert(!blockedRes.success, "Request 6/5 blocked by Rate Limiter (HTTP 429 Triggered)");
  assert(blockedRes.remaining === 0, "Remaining request counter is 0 upon limit violation");

  // --------------------------------------------------------------------------
  // 7. Brute-Force Password Cracking & Account Lockout
  // --------------------------------------------------------------------------
  console.log("\n[7/7] Testing Brute-Force Password Lockout System...");

  const bruteTarget = "attacker-brute-ip-10.0.0.1";
  resetLoginAttempts(bruteTarget);

  assert(!isLoginLocked(bruteTarget).isLocked, "Account initially unlocked");

  // Simulate 4 failed attempts
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = recordFailedLogin(bruteTarget, 5, 10000);
    assert(!result.isLocked, `Failed attempt ${attempt}/5 recorded without lockout`);
    assert(result.attemptsRemaining === 5 - attempt, `Remaining attempts: ${5 - attempt}`);
  }

  // 5th failed attempt triggers lockout
  const lockoutResult = recordFailedLogin(bruteTarget, 5, 10000);
  assert(lockoutResult.isLocked, "5th failed attempt triggers account lockout");
  assert(isLoginLocked(bruteTarget).isLocked, "Subsequent authentication attempts immediately blocked by lockout");

  // Reset on legitimate login
  resetLoginAttempts(bruteTarget);
  assert(!isLoginLocked(bruteTarget).isLocked, "Account successfully unlocked after credential reset");

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`  RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPenetrationSuite().catch((err) => {
  console.error("Penetration suite encountered unhandled error:", err);
  process.exit(1);
});
