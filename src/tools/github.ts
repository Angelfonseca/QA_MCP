import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { analyzeIssueForQA, formatQAAnalysis } from "../helpers/qa.js";
import { parseGitHubIssueUrl, getGitHubIssueData, makeGitHubRequest, parseGitHubCommitUrl, getGitHubCommit } from "../helpers/github.js";

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

export function createGitHubTools({ defaultAccessToken = "" }: { defaultAccessToken?: string } = {}): McpTool[] {
  const analyzeTool: McpTool = {
    name: "analyze_github_issue_for_qa",
    description: "Analiza un issue de GitHub y genera análisis completo de QA",
    inputSchema: {
      type: "object",
      properties: { 
        issueUrl: { type: "string" }, 
        accessToken: { type: "string" } 
      },
      required: ["issueUrl"],
    },
    handler: async (args: { issueUrl: string; accessToken?: string }) => {
      const accessToken = args.accessToken || defaultAccessToken;
      if (!accessToken) {
        throw new McpError(ErrorCode.InvalidParams, "Se requiere un token de acceso de GitHub. Proporciona 'accessToken' en los argumentos o configura GITHUB_ACCESS_TOKEN en las variables de entorno.");
      }
      const { owner, repo, issueNumber } = parseGitHubIssueUrl(args.issueUrl);
      const issueData = await getGitHubIssueData(accessToken, owner, repo, issueNumber);
      const qa = analyzeIssueForQA(issueData);
      const comments = await makeGitHubRequest(accessToken, `/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
      const formatted = formatQAAnalysis(issueData, qa, comments || []);
      return { content: [{ type: "text", text: formatted }] };
    },
  };

  const summaryTool: McpTool = {
    name: "get_github_issue_qa_summary",
    description: "Devuelve resumen QA para un issue de GitHub",
    inputSchema: {
      type: "object",
      properties: { 
        owner: { type: "string" }, 
        repo: { type: "string" }, 
        issueNumber: { type: "number" }, 
        accessToken: { type: "string" } 
      },
      required: ["owner", "repo", "issueNumber"],
    },
    handler: async (args: { owner: string; repo: string; issueNumber: number; accessToken?: string }) => {
      const accessToken = args.accessToken || defaultAccessToken;
      if (!accessToken) {
        throw new McpError(ErrorCode.InvalidParams, "Se requiere un token de acceso de GitHub. Proporciona 'accessToken' en los argumentos o configura GITHUB_ACCESS_TOKEN en las variables de entorno.");
      }
      const issueData = await getGitHubIssueData(accessToken, args.owner, args.repo, args.issueNumber);
      const qa = analyzeIssueForQA(issueData);
      const text = `🔍 **Resumen QA - Issue #${issueData.iid}**\n\n` +
        `**Repositorio:** ${args.owner}/${args.repo}\n` +
        `**Título:** ${issueData.title}\n` +
        `**Estado:** ${issueData.state}\n\n` +
        `**Requerimientos identificados:** ${qa.requirements.length}\n` +
        `**Criterios de aceptación:** ${qa.acceptanceCriteria.length}\n` +
        `**Sugerencias de testing:** ${qa.testingSuggestions.length}\n` +
        `**Áreas de riesgo:** ${qa.riskAreas.length}\n` +
        `**Tipos de testing:** ${qa.testTypes.join(', ')}`;
      return { content: [{ type: "text", text }] };
    },
  };

  const getCommitByUrl: McpTool = {
    name: "github_get_commit_by_url",
    description: "Obtiene información de un commit de GitHub a partir de su URL",
    inputSchema: {
      type: "object",
      properties: {
        commitUrl: { type: "string" },
        accessToken: { type: "string" },
      },
      required: ["commitUrl"],
    },
    handler: async (args: { commitUrl: string; accessToken?: string }) => {
      const accessToken = args.accessToken || defaultAccessToken;
      if (!accessToken) {
        throw new McpError(ErrorCode.InvalidParams, "Se requiere un token de acceso de GitHub. Proporciona 'accessToken' o configura GITHUB_ACCESS_TOKEN.");
      }
      const { owner, repo, sha } = parseGitHubCommitUrl(args.commitUrl);
      const commit = await getGitHubCommit(accessToken, owner, repo, sha);
      return { content: [{ type: "text", text: JSON.stringify(commit) }] };
    },
  };

  const getCommit: McpTool = {
    name: "github_get_commit",
    description: "Obtiene información de un commit de GitHub por owner, repo y sha",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        sha: { type: "string" },
        accessToken: { type: "string" },
      },
      required: ["owner", "repo", "sha"],
    },
    handler: async (args: { owner: string; repo: string; sha: string; accessToken?: string }) => {
      const accessToken = args.accessToken || defaultAccessToken;
      if (!accessToken) {
        throw new McpError(ErrorCode.InvalidParams, "Se requiere un token de acceso de GitHub. Proporciona 'accessToken' o configura GITHUB_ACCESS_TOKEN.");
      }
      const commit = await getGitHubCommit(accessToken, args.owner, args.repo, args.sha);
      return { content: [{ type: "text", text: JSON.stringify(commit) }] };
    },
  };

  const apiGet: McpTool = {
    name: "github_api_get",
    description: "Realiza una petición GET a la API de GitHub (ruta de /repos, /orgs, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: { type: "string" },
        params: { type: "object" },
        accessToken: { type: "string" },
      },
      required: ["endpoint"],
    },
    handler: async (args: { endpoint: string; params?: Record<string, any>; accessToken?: string }) => {
      const accessToken = args.accessToken || defaultAccessToken;
      if (!accessToken) {
        throw new McpError(ErrorCode.InvalidParams, "Se requiere un token de acceso de GitHub. Proporciona 'accessToken' o configura GITHUB_ACCESS_TOKEN.");
      }
      const data = await makeGitHubRequest(accessToken, args.endpoint, args.params);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  };

  return [analyzeTool, summaryTool, getCommitByUrl, getCommit, apiGet];
}
