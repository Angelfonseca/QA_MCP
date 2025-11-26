import axios from "axios";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { IssueData } from "./qa.js";

export function parseGitHubIssueUrl(url: string): { owner: string; repo: string; issueNumber: number } {
  const m = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
  if (!m) throw new McpError(ErrorCode.InvalidParams, "URL de issue de GitHub inválido. Formato esperado: https://github.com/owner/repo/issues/123");
  return { owner: m[1], repo: m[2], issueNumber: parseInt(m[3], 10) };
}

export function parseGitHubCommitUrl(url: string): { owner: string; repo: string; sha: string } {
  const m = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/commit\/([0-9a-fA-F]{7,40})/);
  if (!m) throw new McpError(ErrorCode.InvalidParams, "URL de commit de GitHub inválido. Formato esperado: https://github.com/owner/repo/commit/<sha>");
  return { owner: m[1], repo: m[2], sha: m[3] };
}

export async function makeGitHubRequest(accessToken: string, endpoint: string, params?: Record<string, any>) {
  try {
    const res = await axios.get(`https://api.github.com${endpoint}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" }, params });
    return res.data;
  } catch (error: any) {
    if (error.response) {
      throw new McpError(ErrorCode.InternalError, `Error de GitHub API: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    }
    throw new McpError(ErrorCode.InternalError, `Error de conexión: ${error.message}`);
  }
}

export async function getGitHubIssueData(accessToken: string, owner: string, repo: string, issueNumber: number): Promise<IssueData> {
  const [issue, repository] = await Promise.all([
    makeGitHubRequest(accessToken, `/repos/${owner}/${repo}/issues/${issueNumber}`),
    makeGitHubRequest(accessToken, `/repos/${owner}/${repo}`),
  ]);
  return {
    title: issue.title,
    description: issue.body || "",
    labels: (issue.labels || []).map((l: any) => l.name),
    assignees: (issue.assignees || []).map((a: any) => a.login),
    author: issue.user.login,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    web_url: issue.html_url,
    project_name: repository.name,
    iid: issue.number,
  };
}

export async function getGitHubCommit(accessToken: string, owner: string, repo: string, sha: string) {
  return await makeGitHubRequest(accessToken, `/repos/${owner}/${repo}/commits/${sha}`);
}
