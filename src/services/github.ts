import type { ProjectVerification, ProjectVerificationCheck } from '../types';

/**
 * Uses GitHub's public REST API directly from the browser — no token needed
 * for public repo metadata. Unauthenticated requests are rate-limited to
 * ~60/hour per IP by GitHub, which is fine for occasional manual "Verify"
 * clicks but would need a token (server-side) if this were called
 * automatically at scale.
 */

interface ParsedRepo {
  owner: string;
  repo: string;
}

export function parseGithubUrl(url: string): ParsedRepo | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.endsWith('github.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

async function githubGet(path: string): Promise<Response> {
  return fetch(`https://api.github.com/${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
}

/**
 * Checks a GitHub repo against generic signals (exists, public, has
 * commits, has a README) plus lightweight keyword-based checks derived
 * from the project's stated requirements (e.g. a requirement mentioning
 * "Dockerfile" triggers a check for a Dockerfile in the repo root).
 *
 * This is a sanity check, not a grader — it confirms the repo is real and
 * roughly matches what was asked for, not that the code is correct.
 */
export async function verifyGithubRepo(
  githubUrl: string,
  requirements: string[]
): Promise<ProjectVerification> {
  const checks: ProjectVerificationCheck[] = [];
  const parsed = parseGithubUrl(githubUrl);

  if (!parsed) {
    checks.push({ label: 'Valid GitHub repo URL', passed: false });
    return { checkedAt: new Date().toISOString(), checks, allPassed: false };
  }

  const { owner, repo } = parsed;

  // 1. Repo exists and is public (unauthenticated requests 404 on private repos).
  const repoRes = await githubGet(`repos/${owner}/${repo}`);
  const repoExists = repoRes.ok;
  checks.push({ label: 'Repository exists and is public', passed: repoExists });

  if (!repoExists) {
    return { checkedAt: new Date().toISOString(), checks, allPassed: false };
  }

  // 2. Has at least one commit.
  const commitsRes = await githubGet(`repos/${owner}/${repo}/commits?per_page=1`);
  const hasCommits = commitsRes.ok && (await commitsRes.json()).length > 0;
  checks.push({ label: 'Has at least one commit', passed: hasCommits });

  // 3. Has a README.
  const readmeRes = await githubGet(`repos/${owner}/${repo}/readme`);
  checks.push({ label: 'Has a README', passed: readmeRes.ok });

  // 4. Root file listing, for keyword-based requirement checks below.
  const contentsRes = await githubGet(`repos/${owner}/${repo}/contents`);
  const rootFiles: string[] = contentsRes.ok
    ? (await contentsRes.json()).map((f: { name: string }) => f.name.toLowerCase())
    : [];

  const reqText = requirements.join(' ').toLowerCase();

  if (reqText.includes('dockerfile')) {
    checks.push({
      label: 'Dockerfile present in repo root',
      passed: rootFiles.some((f) => f.includes('dockerfile')),
    });
  }

  if (reqText.includes('ci') || reqText.includes('pipeline') || reqText.includes('workflow') || reqText.includes('github actions')) {
    const workflowsRes = await githubGet(`repos/${owner}/${repo}/contents/.github/workflows`);
    checks.push({ label: 'CI/CD workflow config present (.github/workflows)', passed: workflowsRes.ok });
  }

  if (reqText.includes('documented') || reqText.includes('readme')) {
    checks.push({ label: 'Documentation requirement satisfied by README', passed: readmeRes.ok });
  }

  const allPassed = checks.every((c) => c.passed);
  return { checkedAt: new Date().toISOString(), checks, allPassed };
}
