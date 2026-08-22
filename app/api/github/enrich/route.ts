import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateGitHubUrl } from "@/lib/security/ssrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export interface LanguageStat {
  language: string;
  percentage: number;
  color?: string;
  bytes: number;
}

export interface GitHubEnrichResponse {
  success: boolean;
  owner: string;
  repo: string;
  student_name?: string;
  student_avatar_url?: string;
  project_title?: string;
  description?: string;
  tech_stack?: string;
  languages?: string[];
  language_breakdown?: LanguageStat[];
  stars?: number;
  forks?: number;
  open_issues?: number;
  topics?: string[];
  readme_excerpt?: string;
  last_commit_at?: string;
  default_branch?: string;
  warning?: string;
}

// Common language color mappings for GitHub badges
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Go: "#00ADD8",
  Rust: "#dea584",
  Dart: "#00B4AB",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Jupyter: "#DA5B0B",
  R: "#198CE7",
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`github-enrich:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 40,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many GitHub lookup requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawUrl = body.github_url;

    const parseResult = parseAndValidateGitHubUrl(rawUrl);
    if (!parseResult.isValid || !parseResult.owner || !parseResult.repo) {
      return NextResponse.json(
        { error: parseResult.error || "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    const { owner, repo } = parseResult;
    const token = process.env.GITHUB_API_TOKEN;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Superior-Project-Showcase/1.0",
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    // Parallel fetch: Repo details, Languages, and Owner Profile with 4s timeout
    const fetchOptions = {
      headers,
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    };

    const [repoRes, langRes, userRes, readmeRes] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, fetchOptions),
      fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, fetchOptions),
      fetch(`https://api.github.com/users/${owner}`, fetchOptions),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, fetchOptions),
    ]);

    // Check if repo lookup succeeded
    if (repoRes.status !== "fulfilled" || !repoRes.value.ok) {
      const statusCode = repoRes.status === "fulfilled" ? repoRes.value.status : 500;
      let warningMsg = "Could not fetch repository from GitHub (private or not found).";
      if (statusCode === 403) {
        warningMsg = "GitHub API rate limit reached. Pre-filling with available URL information.";
      }

      // Return graceful fallback data per §7.3
      const fallbackResponse: GitHubEnrichResponse = {
        success: false,
        owner,
        repo,
        project_title: repo.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        tech_stack: "unavailable",
        warning: warningMsg,
      };
      return NextResponse.json(fallbackResponse);
    }

    const repoData = await repoRes.value.json();

    // Parse languages & calculate percentage breakdown
    let languagesList: string[] = [];
    const languageBreakdown: LanguageStat[] = [];

    if (langRes.status === "fulfilled" && langRes.value.ok) {
      const langData: Record<string, number> = await langRes.value.json();
      languagesList = Object.keys(langData);
      const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);

      if (totalBytes > 0) {
        for (const [lang, bytes] of Object.entries(langData)) {
          const pct = Math.round((bytes / totalBytes) * 1000) / 10;
          if (pct >= 1.0) {
            languageBreakdown.push({
              language: lang,
              percentage: pct,
              bytes,
              color: LANGUAGE_COLORS[lang] || "#6366f1",
            });
          }
        }
        languageBreakdown.sort((a, b) => b.percentage - a.percentage);
      }
    }

    // Parse owner profile
    let studentName = "";
    let avatarUrl = "";
    if (userRes.status === "fulfilled" && userRes.value.ok) {
      const userData = await userRes.value.json();
      studentName = userData.name || userData.login || "";
      avatarUrl = userData.avatar_url || "";
    }

    // Parse topics
    const topics: string[] = repoData.topics || [];

    // Parse readme title & excerpt
    let readmeTitle = "";
    let readmeExcerpt = "";

    if (readmeRes.status === "fulfilled" && readmeRes.value.ok) {
      try {
        const readmeData = await readmeRes.value.json();
        if (readmeData.content && readmeData.encoding === "base64") {
          const rawReadme = Buffer.from(readmeData.content, "base64").toString("utf8");

          // Extract first H1 header for accurate project title
          const h1Match = rawReadme.match(/^#\s+(.+)$/m);
          if (h1Match) {
            readmeTitle = h1Match[1]
              .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "") // strip emojis
              .replace(/`{1,3}.*?`{1,3}/g, "")
              .replace(/\[(.*?)\]\(.*?\)/g, "$1")
              .trim();
          }

          // Clean Markdown body
          const cleanBody = rawReadme
            .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // nested badge links
            .replace(/!\[.*?\]\(.*?\)/g, "")            // image tags
            .replace(/\[(.*?)\]\(.*?\)/g, "$1")          // regular markdown links
            .replace(/<[^>]+>/g, "")                    // html tags
            .replace(/```[\s\S]*?```/g, "")             // code blocks
            .replace(/`.*?`/g, "")                      // inline code
            .replace(/^#+\s+.*$/gm, "")                 // header lines
            .replace(/[-*+]\s+/g, "")                   // unordered list bullets
            .replace(/^\d+\.\s+/gm, "")                 // ordered list bullets
            .replace(/\n{2,}/g, "\n")                   // collapse multiple linebreaks
            .trim();

          // Find first meaningful paragraph with >= 40 chars
          const paragraphs = cleanBody
            .split("\n")
            .map((p) => p.trim())
            .filter((p) => p.length >= 40 && !p.toLowerCase().startsWith("http"));

          if (paragraphs.length > 0) {
            readmeExcerpt = paragraphs[0].slice(0, 320).trim();
            if (paragraphs[0].length > 320) readmeExcerpt += "...";
          }
        }
      } catch {
        // Ignore readme decode errors
      }
    }

    // Format human-friendly title
    const formattedRepoName = repo
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    const projectTitle = readmeTitle || repoData.name ? (readmeTitle || formattedRepoName) : repo;

    // Detect frameworks & libraries from README if found
    const detectedExtraTech: string[] = [];
    if (readmeExcerpt) {
      const lowerExcerpt = readmeExcerpt.toLowerCase();
      if (lowerExcerpt.includes("pytorch") && !topics.includes("pytorch")) detectedExtraTech.push("PyTorch");
      if (lowerExcerpt.includes("tensorflow") && !topics.includes("tensorflow")) detectedExtraTech.push("TensorFlow");
      if (lowerExcerpt.includes("flask") && !topics.includes("flask")) detectedExtraTech.push("Flask");
      if (lowerExcerpt.includes("fastapi") && !topics.includes("fastapi")) detectedExtraTech.push("FastAPI");
      if (lowerExcerpt.includes("next.js") || lowerExcerpt.includes("nextjs")) detectedExtraTech.push("Next.js");
      if (lowerExcerpt.includes("dqn") || lowerExcerpt.includes("deep q")) detectedExtraTech.push("Deep Q-Learning (DQN)");
    }

    // Combine languages, topics, and detected frameworks
    const combinedTags = Array.from(
      new Set([...languagesList, ...topics, ...detectedExtraTech])
    ).filter(Boolean);

    const techStackString =
      combinedTags.length > 0
        ? combinedTags.slice(0, 8).join(", ")
        : repoData.language || "TypeScript, React";

    // Build final authentic description
    const finalDescription =
      repoData.description ||
      readmeExcerpt ||
      `An advanced engineering capstone project developed by ${studentName || owner}.`;

    const responseData: GitHubEnrichResponse = {
      success: true,
      owner,
      repo,
      student_name: studentName,
      student_avatar_url: avatarUrl,
      project_title: projectTitle,
      description: finalDescription,
      tech_stack: techStackString,
      languages: languagesList,
      language_breakdown: languageBreakdown,
      stars: repoData.stargazers_count ?? 0,
      forks: repoData.forks_count ?? 0,
      open_issues: repoData.open_issues_count ?? 0,
      topics,
      readme_excerpt: readmeExcerpt,
      last_commit_at: repoData.pushed_at || repoData.updated_at,
      default_branch: repoData.default_branch || "main",
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[GitHubEnrich] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while enriching project metadata." },
      { status: 500 }
    );
  }
}
