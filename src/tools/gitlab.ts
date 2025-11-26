import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { analyzeIssueForQA, formatQAAnalysis, IssueData } from "../helpers/qa.js";
import { parseGitLabUrl, getIssueData, makeGitLabRequest, parseGitLabCommitUrl, getGitLabCommit } from "../helpers/gitlab.js";

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

export function createGitLabTools(ctx: { gitlabUrl: string; accessToken: string }): McpTool[] {
  const analyzeTool: McpTool = {
    name: "analyze_gitlab_issue_for_qa",
    description: "Analiza un issue de GitLab y genera análisis completo de QA",
    inputSchema: {
      type: "object",
      properties: {
        issueUrl: { type: "string", description: "URL del issue de GitLab" },
        accessToken: { type: "string", description: "Token de acceso (opcional)" },
      },
      required: ["issueUrl"],
    },
    handler: async (args: { issueUrl: string; accessToken?: string }) => {
      const { issueUrl } = args;
      const parsed = parseGitLabUrl(ctx.gitlabUrl, issueUrl);
      ctx.gitlabUrl = parsed.gitlabUrl;
      const token = args.accessToken || ctx.accessToken;
      const issueData = await getIssueData(ctx.gitlabUrl, token, parsed.projectId, parsed.issueIid);
      const comments = await makeGitLabRequest(ctx.gitlabUrl, token, `/projects/${encodeURIComponent(parsed.projectId)}/issues/${parsed.issueIid}/notes`);
      const userComments = comments.filter((c: any) => !c.system);
      const qaAnalysis = analyzeIssueForQA(issueData);
      return { content: [{ type: "text", text: formatQAAnalysis(issueData, qaAnalysis, userComments) }] };
    },
  };

  const summaryTool: McpTool = {
    name: "get_gitlab_issue_qa_summary",
    description: "Devuelve un resumen ejecutivo de QA de un issue",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID del proyecto" },
        issueIid: { type: "number", description: "IID del issue" },
        accessToken: { type: "string", description: "Token de acceso (opcional)" },
      },
      required: ["projectId", "issueIid"],
    },
    handler: async (args: { projectId: string; issueIid: number; accessToken?: string }) => {
      const token = args.accessToken || ctx.accessToken;
      const issueData = await getIssueData(ctx.gitlabUrl, token, args.projectId, args.issueIid);
      const qaAnalysis = analyzeIssueForQA(issueData);
      const text = `🔍 **Resumen QA - Issue #${issueData.iid}**\n\n` +
        `**Proyecto:** ${issueData.project_name}\n` +
        `**Título:** ${issueData.title}\n` +
        `**Estado:** ${issueData.state}\n\n` +
        `**Requerimientos identificados:** ${qaAnalysis.requirements.length}\n` +
        `**Criterios de aceptación:** ${qaAnalysis.acceptanceCriteria.length}\n` +
        `**Sugerencias de testing:** ${qaAnalysis.testingSuggestions.length}\n` +
        `**Áreas de riesgo:** ${qaAnalysis.riskAreas.length}\n` +
        `**Tipos de testing:** ${qaAnalysis.testTypes.join(', ')}`;
      return { content: [{ type: "text", text }] };
    },
  };

  const getCommitByUrl: McpTool = {
    name: "gitlab_get_commit_by_url",
    description: "Obtiene información de un commit de GitLab a partir de su URL",
    inputSchema: {
      type: "object",
      properties: {
        commitUrl: { type: "string", description: "URL del commit" },
        accessToken: { type: "string", description: "Token de acceso (opcional)" },
      },
      required: ["commitUrl"],
    },
    handler: async (args: { commitUrl: string; accessToken?: string }) => {
      const parsed = parseGitLabCommitUrl(ctx.gitlabUrl, args.commitUrl);
      ctx.gitlabUrl = parsed.gitlabUrl;
      const token = args.accessToken || ctx.accessToken;
      const commit = await getGitLabCommit(ctx.gitlabUrl, token, parsed.projectId, parsed.sha);
      return { content: [{ type: "text", text: JSON.stringify(commit) }] };
    },
  };

  const getCommit: McpTool = {
    name: "gitlab_get_commit",
    description: "Obtiene información de un commit de GitLab por projectId y sha",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID del proyecto" },
        sha: { type: "string", description: "SHA del commit" },
        accessToken: { type: "string", description: "Token de acceso (opcional)" },
      },
      required: ["projectId", "sha"],
    },
    handler: async (args: { projectId: string; sha: string; accessToken?: string }) => {
      const token = args.accessToken || ctx.accessToken;
      const commit = await getGitLabCommit(ctx.gitlabUrl, token, args.projectId, args.sha);
      return { content: [{ type: "text", text: JSON.stringify(commit) }] };
    },
  };

  const apiGet: McpTool = {
    name: "gitlab_api_get",
    description: "Realiza una petición GET a la API de GitLab (ruta de /projects, /groups, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: { type: "string", description: "Endpoint bajo /api/v4" },
        params: { type: "object", description: "Query params" },
        accessToken: { type: "string", description: "Token de acceso (opcional)" },
      },
      required: ["endpoint"],
    },
    handler: async (args: { endpoint: string; params?: Record<string, any>; accessToken?: string }) => {
      const token = args.accessToken || ctx.accessToken;
      const data = await makeGitLabRequest(ctx.gitlabUrl, token, args.endpoint, args.params);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  };

  return [analyzeTool, summaryTool, getCommitByUrl, getCommit, apiGet];
}
