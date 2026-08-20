/**
 * SSRF Guard & GitHub URL Validator
 * Ensures only legitimate https://github.com/{owner}/{repo} URLs can trigger server-side enrichment
 */

export interface ParsedGitHubUrl {
  isValid: boolean;
  owner?: string;
  repo?: string;
  error?: string;
}

export function parseAndValidateGitHubUrl(rawUrl: string): ParsedGitHubUrl {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "GitHub URL is required" };
  }

  let parsed: URL;
  try {
    const trimmed = rawUrl.trim();
    if (trimmed.includes("/..") || trimmed.includes("/.") || trimmed.includes("%2e") || trimmed.includes("%2E")) {
      return { isValid: false, error: "Directory traversal sequences not allowed" };
    }
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Malformed URL format" };
  }

  // 1. Strict Protocol Check
  if (parsed.protocol !== "https:") {
    return { isValid: false, error: "Only HTTPS protocol is supported" };
  }

  // 2. Strict Hostname Allowlist
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    return { isValid: false, error: "URL must be on github.com" };
  }

  // 3. Prevent any credentials or odd ports in URL
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "URL cannot contain user credentials" };
  }
  if (parsed.port && parsed.port !== "443") {
    return { isValid: false, error: "Invalid port specified" };
  }

  // 4. Extract and validate path segments: /{owner}/{repo}
  const pathParts = parsed.pathname
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  if (pathParts.length < 2) {
    return { isValid: false, error: "Must specify both repository owner and name (e.g. github.com/owner/repo)" };
  }

  const owner = pathParts[0];
  let repo = pathParts[1];

  // Strip .git suffix if present
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  // Validate owner and repo characters (GitHub allows alphanumeric, hyphens, underscores, dots)
  const validIdentifier = /^[a-zA-Z0-9_.-]+$/;
  if (!validIdentifier.test(owner) || !validIdentifier.test(repo)) {
    return { isValid: false, error: "Invalid characters in repository path" };
  }

  // Reject traversal attempts
  if (owner === ".." || repo === ".." || owner === "." || repo === ".") {
    return { isValid: false, error: "Directory traversal characters detected" };
  }

  return {
    isValid: true,
    owner,
    repo,
  };
}
