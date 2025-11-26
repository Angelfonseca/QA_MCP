import axios, { AxiosRequestConfig } from "axios";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

export function createHttpTools(): McpTool[] {
  const httpRequest: McpTool = {
    name: "http_request",
    description: "Realiza una solicitud HTTP genérica",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", description: "Método HTTP" },
        url: { type: "string", description: "URL" },
        headers: { type: "object", description: "Headers" },
        params: { type: "object", description: "Query params" },
        body: { type: "string", description: "Cuerpo de la petición (JSON string o texto plano)" },
        timeoutMs: { type: "number", description: "Timeout en ms" },
      },
      required: ["method", "url"],
    },
    handler: async (args: any) => {
      try {
        const config: AxiosRequestConfig = {
          method: args.method,
          url: args.url,
          headers: args.headers || {},
          params: args.params || undefined,
          data: args.body || undefined,
          timeout: args.timeoutMs || 15000,
        };
        const res = await axios.request(config);
        const payload = { status: res.status, statusText: res.statusText, headers: res.headers, data: res.data };
        return { content: [{ type: "text", text: JSON.stringify(payload) }] };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, error?.message || String(error));
      }
    },
  };
  return [httpRequest];
}
