#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { createGitLabTools } from "./tools/gitlab.js";
import { createHttpTools } from "./tools/http.js";
import { createDbTools } from "./tools/db.js";
import { createWebTools } from "./tools/web.js";
import { createGitHubTools } from "./tools/github.js";

dotenv.config();

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

class GitLabQAMCPServer {
  private server: Server;
  private tools: McpTool[];
  private gitlabUrl: string;
  private accessToken: string;
  private githubAccessToken: string;

  constructor() {
    this.server = new Server({ name: "gitlab-qa-mcp-server", version: "1.1.0" });
    this.gitlabUrl = process.env.GITLAB_URL || "https://gitlab.com";
    this.accessToken = process.env.GITLAB_ACCESS_TOKEN || "";
    this.githubAccessToken = process.env.GITHUB_ACCESS_TOKEN || "";
    
    // Solo advertir si falta GITLAB_ACCESS_TOKEN, no detener el servidor
    if (!this.accessToken) {
      console.error("⚠️  Advertencia: GITLAB_ACCESS_TOKEN no está configurado. Las herramientas de GitLab no estarán disponibles.");
    }
    
    const tools: McpTool[] = [];
    
    // Agregar herramientas de GitLab solo si hay token
    if (this.accessToken) {
      tools.push(...createGitLabTools({ gitlabUrl: this.gitlabUrl, accessToken: this.accessToken }));
    }
    
    // Agregar siempre las demás herramientas
    tools.push(...createHttpTools());
    tools.push(...createDbTools());
    tools.push(...createWebTools());
    tools.push(...createGitHubTools({ defaultAccessToken: this.githubAccessToken }));
    
    this.tools = tools;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
    });
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.find(t => t.name === name);
      if (!tool) throw new McpError(ErrorCode.MethodNotFound, `Herramienta desconocida: ${name}`);
      try {
        return await tool.handler(args);
      } catch (error: any) {
        if (error instanceof McpError) throw error;
        throw new McpError(ErrorCode.InternalError, `Error ejecutando ${name}: ${error?.message || String(error)}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🚀 Servidor MCP iniciado con ${this.tools.length} herramientas disponibles`);
    if (!this.accessToken) {
      console.error("⚠️  GitLab tools no disponibles (falta GITLAB_ACCESS_TOKEN)");
    }
  }
}

const server = new GitLabQAMCPServer();
server.run().catch(console.error);
