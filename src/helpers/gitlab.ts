import axios from "axios";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
interface IssueData {
  title: string;
  description: string;
  labels: string[];
  assignees: string[];
  author: string;
  state: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  project_name: string;
  iid: number;
}

export function parseGitLabUrl(baseUrl: string, url: string): { gitlabUrl: string; projectId: string; issueIid: number } {
  const urlPattern = /^https?:\/\/([^\/]+)\/(.+)\/-\/issues\/(\d+)/;
  const match = url.match(urlPattern);
  if (!match) {
    throw new McpError(ErrorCode.InvalidParams, "URL de issue de GitLab inválido. Formato esperado: https://gitlab.com/namespace/project/-/issues/123");
  }
  const [, domain, projectPath, issueIid] = match;
  const currentHost = new URL(baseUrl).hostname;
  const gitlabUrl = domain !== currentHost ? `https://${domain}` : baseUrl;
  return { gitlabUrl, projectId: projectPath, issueIid: parseInt(issueIid, 10) };
}

export function parseGitLabCommitUrl(baseUrl: string, url: string): { gitlabUrl: string; projectId: string; sha: string } {
  const urlPattern = /^https?:\/\/([^\/]+)\/(.+)\/-\/commit\/([0-9a-fA-F]{7,40})/;
  const match = url.match(urlPattern);
  if (!match) {
    throw new McpError(ErrorCode.InvalidParams, "URL de commit de GitLab inválido. Formato esperado: https://gitlab.com/namespace/project/-/commit/<sha>");
  }
  const [, domain, projectPath, sha] = match;
  const currentHost = new URL(baseUrl).hostname;
  const gitlabUrl = domain !== currentHost ? `https://${domain}` : baseUrl;
  return { gitlabUrl, projectId: projectPath, sha };
}

export async function makeGitLabRequest(gitlabUrl: string, accessToken: string, endpoint: string, params?: Record<string, any>) {
  try {
    const response = await axios.get(`${gitlabUrl}/api/v4${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new McpError(ErrorCode.InternalError, `Error de GitLab API: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    }
    throw new McpError(ErrorCode.InternalError, `Error de conexión: ${error.message}`);
  }
}

export async function getIssueData(gitlabUrl: string, accessToken: string, projectId: string, issueIid: number): Promise<IssueData> {
  const [issue, project] = await Promise.all([
    makeGitLabRequest(gitlabUrl, accessToken, `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`),
    makeGitLabRequest(gitlabUrl, accessToken, `/projects/${encodeURIComponent(projectId)}`),
  ]);
  return {
    title: issue.title,
    description: issue.description || "",
    labels: issue.labels || [],
    assignees: issue.assignees?.map((a: any) => a.username) || [],
    author: issue.author.username,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    web_url: issue.web_url,
    project_name: project.name,
    iid: issue.iid,
  };
}

export async function getGitLabCommit(gitlabUrl: string, accessToken: string, projectId: string, sha: string) {
  return await makeGitLabRequest(gitlabUrl, accessToken, `/projects/${encodeURIComponent(projectId)}/repository/commits/${sha}`);
}
