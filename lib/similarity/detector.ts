import type { Project } from "../sheets/models";

export interface SimilarityMatch {
  score: number; // 0 to 100
  flag: "unique" | "warning" | "duplicate";
  reason: string;
  matchedProject?: Project;
  exactUrlMatch?: boolean;
}

/**
 * Normalizes a GitHub URL into canonical 'owner/repo' lowercase identifier
 */
export function normalizeRepoUrl(url?: string): string {
  if (!url || typeof url !== "string") return "";
  let cleaned = url.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  cleaned = cleaned.replace(/^www\./i, "");
  cleaned = cleaned.replace(/\/+$/, "");
  cleaned = cleaned.replace(/\.git$/i, "");
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned;
}

/**
 * Tokenizes text into lowercase words, stripping punctuation and common stop words
 */
function tokenizeText(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about",
    "against", "between", "into", "through", "during", "before", "after", "above", "below",
    "from", "up", "down", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "this", "that", "these", "those", "system", "project", "application",
    "based", "using", "built", "with", "platform", "developed", "web", "app",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return new Set(words);
}

/**
 * Calculates Jaccard Similarity between two text strings (0 to 100)
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const setA = tokenizeText(textA);
  const setB = tokenizeText(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...setA, ...setB]).size;
  if (unionCount === 0) return 0;

  return Math.round((intersectionCount / unionCount) * 100);
}

/**
 * Evaluates a project submission against all archived/published projects
 */
export function evaluateProjectSimilarity(
  candidate: {
    id?: string;
    github_url: string;
    project_title: string;
    description: string;
    tech_stack?: string;
  },
  existingProjects: Project[]
): SimilarityMatch {
  const targetCanonicalUrl = normalizeRepoUrl(candidate.github_url);
  const candidateCorpus = `${candidate.project_title} ${candidate.description} ${candidate.tech_stack || ""}`;

  let highestScore = 0;
  let closestProject: Project | undefined;
  let exactMatchProject: Project | undefined;

  for (const existing of existingProjects) {
    // Skip self if editing
    if (candidate.id && existing.id === candidate.id) continue;

    const existingCanonicalUrl = normalizeRepoUrl(existing.github_url);

    // 1. Exact Canonical URL match
    if (targetCanonicalUrl && existingCanonicalUrl && targetCanonicalUrl === existingCanonicalUrl) {
      exactMatchProject = existing;
      return {
        score: 100,
        flag: "duplicate",
        reason: `Exact repository URL match with "${existing.project_title}" (Roll: ${existing.roll_number})`,
        matchedProject: existing,
        exactUrlMatch: true,
      };
    }

    // 2. Semantic Text & Stack similarity
    const existingCorpus = `${existing.project_title} ${existing.description} ${existing.tech_stack || ""}`;
    const score = calculateTextSimilarity(candidateCorpus, existingCorpus);

    if (score > highestScore) {
      highestScore = score;
      closestProject = existing;
    }
  }

  if (highestScore >= 75 && closestProject) {
    return {
      score: highestScore,
      flag: "duplicate",
      reason: `High semantic overlap (${highestScore}%) with "${closestProject.project_title}" (${closestProject.roll_number})`,
      matchedProject: closestProject,
    };
  }

  if (highestScore >= 45 && closestProject) {
    return {
      score: highestScore,
      flag: "warning",
      reason: `Moderate topic resemblance (${highestScore}%) with "${closestProject.project_title}"`,
      matchedProject: closestProject,
    };
  }

  return {
    score: highestScore,
    flag: "unique",
    reason: highestScore > 0 && closestProject
      ? `Original submission (max ${highestScore}% similarity with "${closestProject.project_title}")`
      : "100% Unique concept & codebase",
    matchedProject: closestProject,
  };
}

export interface ProjectComparisonDetail {
  projectA: Project;
  projectB: Project;
  overallScore: number;
  flag: "unique" | "warning" | "duplicate";
  exactUrlMatch: boolean;
  titleScore: number;
  sharedTech: string[];
  uniqueTechA: string[];
  uniqueTechB: string[];
  sharedKeywords: string[];
  reason: string;
}

/**
 * Computes deep field-by-field comparison between two projects
 */
export function compareProjectsDetail(projectA: Project, projectB: Project): ProjectComparisonDetail {
  const normUrlA = normalizeRepoUrl(projectA.github_url);
  const normUrlB = normalizeRepoUrl(projectB.github_url);
  const exactUrlMatch = Boolean(normUrlA && normUrlB && normUrlA === normUrlB);

  const titleScore = calculateTextSimilarity(projectA.project_title, projectB.project_title);

  // Tech stack comparison
  const parseTags = (str?: string) =>
    (str || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const rawTagsA = (projectA.tech_stack || "").split(",").map((s) => s.trim()).filter(Boolean);
  const rawTagsB = (projectB.tech_stack || "").split(",").map((s) => s.trim()).filter(Boolean);

  const lowerSetB = new Set(parseTags(projectB.tech_stack));
  const lowerSetA = new Set(parseTags(projectA.tech_stack));

  const sharedTech: string[] = [];
  const uniqueTechA: string[] = [];
  const uniqueTechB: string[] = [];

  rawTagsA.forEach((t) => {
    if (lowerSetB.has(t.toLowerCase())) {
      sharedTech.push(t);
    } else {
      uniqueTechA.push(t);
    }
  });

  rawTagsB.forEach((t) => {
    if (!lowerSetA.has(t.toLowerCase())) {
      uniqueTechB.push(t);
    }
  });

  // Description / Keywords comparison
  const tokensA = tokenizeText(`${projectA.project_title} ${projectA.description}`);
  const tokensB = tokenizeText(`${projectB.project_title} ${projectB.description}`);
  const sharedKeywords: string[] = [];
  tokensA.forEach((t) => {
    if (tokensB.has(t)) {
      sharedKeywords.push(t);
    }
  });

  const overallScore = exactUrlMatch
    ? 100
    : calculateTextSimilarity(
        `${projectA.project_title} ${projectA.description} ${projectA.tech_stack || ""}`,
        `${projectB.project_title} ${projectB.description} ${projectB.tech_stack || ""}`
      );

  let flag: "unique" | "warning" | "duplicate" = "unique";
  if (exactUrlMatch || overallScore >= 75) {
    flag = "duplicate";
  } else if (overallScore >= 45) {
    flag = "warning";
  }

  let reason = "100% Unique project codebase";
  if (exactUrlMatch) {
    reason = `Exact duplicate repository URL match (${normUrlA})`;
  } else if (overallScore >= 75) {
    reason = `High semantic overlap (${overallScore}%) between submissions`;
  } else if (overallScore >= 45) {
    reason = `Moderate topic resemblance (${overallScore}%) with shared technology stack`;
  }

  return {
    projectA,
    projectB,
    overallScore,
    flag,
    exactUrlMatch,
    titleScore,
    sharedTech,
    uniqueTechA,
    uniqueTechB,
    sharedKeywords: sharedKeywords.slice(0, 10),
    reason,
  };
}
