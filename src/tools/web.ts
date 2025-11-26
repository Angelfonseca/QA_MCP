import axios from "axios";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

export function createWebTools(): McpTool[] {
  const webSearch: McpTool = {
    name: "web_search",
    description: "Busca en la web y devuelve resultados básicos",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Término de búsqueda" },
        maxResults: { type: "number", description: "Número máximo de resultados" },
      },
      required: ["query"],
    },
    handler: async (args: { query: string; maxResults?: number }) => {
      try {
        const res = await axios.get("https://api.duckduckgo.com/", { params: { q: args.query, format: "json", no_html: 1, no_redirect: 1 } });
        const data = res.data || {};
        const items: any[] = [];
        if (data.Abstract && data.AbstractURL) items.push({ title: data.Heading || "", url: data.AbstractURL, snippet: data.Abstract || "" });
        if (Array.isArray(data.RelatedTopics)) {
          data.RelatedTopics.forEach((t: any) => {
            const topic = t.Text ? t : t.Topics?.[0];
            if (topic && topic.FirstURL) items.push({ title: topic.Text || "", url: topic.FirstURL, snippet: topic.Text || "" });
          });
        }
        const max = args.maxResults && args.maxResults > 0 ? args.maxResults : 5;
        return { content: [{ type: "text", text: JSON.stringify(items.slice(0, max)) }] };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, error?.message || String(error));
      }
    },
  };
  return [webSearch];
}
