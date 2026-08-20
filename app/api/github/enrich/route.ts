import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateGitHubUrl } from "@/lib/security/ssrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

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
  topics?: string[];
  readme_excerpt?: string;
  last_commit_at?: string;
  warning?: string;
}

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

    // Parallel fetch: Repo details, Languages, and Owner Profile
    const [repoRes, langRes, userRes, readmeRes] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, next: { revalidate: 60 } }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers, next: { revalidate: 60 } }),
      fetch(`https://api.github.com/users/${owner}`, { headers, next: { revalidate: 60 } }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, next: { revalidate: 60 } }),
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

    // Parse languages
    let languagesList: string[] = [];
    if (langRes.status === "fulfilled" && langRes.value.ok) {
      const langData = await langRes.value.json();
      languagesList = Object.keys(langData);
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

    // Combine languages and topics for tech stack tags
    const combinedTags = Array.from(new Set([...languagesList, ...topics])).filter(Boolean);
    const techStackString = combinedTags.length > 0 ? combinedTags.slice(0, 8).join(", ") : repoData.language || "TypeScript, React";

    // Parse readme excerpt
    let readmeExcerpt = "";
    if (readmeRes.status === "fulfilled" && readmeRes.value.ok) {
      try {
        const readmeData = await readmeRes.value.json();
        if (readmeData.content && readmeData.encoding === "base64") {
          const decoded = Buffer.from(readmeData.content, "base64").toString("utf8");
          // Extract first 400 chars of meaningful text without markdown headers
          const cleanText = decoded
            .replace(/#+\s+.*?\n/g, "")
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .replace(/\[.*?\]\(.*?\)/g, "$1")
            .replace(/`{1,3}.*?`{1,3}/g, "")
            .trim();
          readmeExcerpt = cleanText.slice(0, 300) + (cleanText.length > 300 ? "..." : "");
        }
      } catch {
        // Ignore readme decode errors
      }
    }

    // Format human-friendly title if description exists
    const projectTitle = repoData.name
      ? repoData.name.replace(/[-_]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
      : repo;

    const responseData: GitHubEnrichResponse = {
      success: true,
      owner,
      repo,
      student_name: studentName,
      student_avatar_url: avatarUrl,
      project_title: projectTitle,
      description: repoData.description || readmeExcerpt || `A capstone engineering project built by ${owner}.`,
      tech_stack: techStackString,
      languages: languagesList,
      topics,
      readme_excerpt: readmeExcerpt,
      last_commit_at: repoData.pushed_at || repoData.updated_at,
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
