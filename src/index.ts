#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

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

interface QAAnalysis {
  requirements: string[];
  acceptanceCriteria: string[];
  testingSuggestions: string[];
  riskAreas: string[];
  testTypes: string[];
}

class GitLabQAMCPServer {
  private server: Server;
  private gitlabUrl: string;
  private accessToken: string;

  constructor() {
    this.server = new Server({
      name: "gitlab-qa-mcp-server",
      version: "1.0.0",
    });

    this.gitlabUrl = process.env.GITLAB_URL || "https://gitlab.com";
    this.accessToken = process.env.GITLAB_ACCESS_TOKEN || "";

    if (!this.accessToken) {
      console.error("Error: GITLAB_ACCESS_TOKEN no está configurado en las variables de entorno");
      process.exit(1);
    }

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze_gitlab_issue_for_qa",
            description: "Analiza un issue de GitLab para generar información completa de QA: qué se solicita y cómo testearlo",
            inputSchema: {
              type: "object",
              properties: {
                issueUrl: {
                  type: "string",
                  description: "URL completa del issue de GitLab (ej: https://gitlab.com/namespace/project/-/issues/123)",
                },
              },
              required: ["issueUrl"],
            },
          },
          {
            name: "get_gitlab_issue_qa_summary",
            description: "Obtiene un resumen ejecutivo de QA de un issue específico",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "ID del proyecto de GitLab",
                },
                issueIid: {
                  type: "number",
                  description: "IID del issue",
                },
              },
              required: ["projectId", "issueIid"],
            },
          },
        ],
      };
    });

    // Manejar llamadas a herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "analyze_gitlab_issue_for_qa":
            return await this.analyzeGitLabIssueForQA(args as any);
          case "get_gitlab_issue_qa_summary":
            return await this.getGitLabIssueQASummary(args as any);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Herramienta desconocida: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error ejecutando ${name}: ${error}`
        );
      }
    });
  }

  private parseGitLabUrl(url: string): { projectId: string; issueIid: number } {
    // Extraer información del URL del issue
    const urlPattern = /^https?:\/\/([^\/]+)\/(.+)\/-\/issues\/(\d+)/;
    const match = url.match(urlPattern);
    
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "URL de issue de GitLab inválido. Formato esperado: https://gitlab.com/namespace/project/-/issues/123"
      );
    }

    const [, domain, projectPath, issueIid] = match;
    
    // Actualizar la URL base si es diferente
    if (domain !== new URL(this.gitlabUrl).hostname) {
      this.gitlabUrl = `https://${domain}`;
    }

    return {
      projectId: projectPath,
      issueIid: parseInt(issueIid, 10),
    };
  }

  private async makeGitLabRequest(endpoint: string, params?: Record<string, any>) {
    try {
      const response = await axios.get(`${this.gitlabUrl}/api/v4${endpoint}`, {
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        params,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error de GitLab API: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`
        );
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Error de conexión: ${error.message}`
      );
    }
  }

  private async getIssueData(projectId: string, issueIid: number): Promise<IssueData> {
    const [issue, project] = await Promise.all([
      this.makeGitLabRequest(`/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`),
      this.makeGitLabRequest(`/projects/${encodeURIComponent(projectId)}`)
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

  private analyzeIssueForQA(issueData: IssueData): QAAnalysis {
    const description = issueData.description.toLowerCase();
    const title = issueData.title.toLowerCase();
    const fullText = `${title} ${description}`;

    // Extraer requerimientos
    const requirements = this.extractRequirements(issueData);
    
    // Extraer criterios de aceptación
    const acceptanceCriteria = this.extractAcceptanceCriteria(issueData);
    
    // Generar sugerencias de testing
    const testingSuggestions = this.generateTestingSuggestions(issueData, fullText);
    
    // Identificar áreas de riesgo
    const riskAreas = this.identifyRiskAreas(fullText, issueData.labels);
    
    // Determinar tipos de testing
    const testTypes = this.determineTestTypes(fullText, issueData.labels);

    return {
      requirements,
      acceptanceCriteria,
      testingSuggestions,
      riskAreas,
      testTypes,
    };
  }

  private extractRequirements(issueData: IssueData): string[] {
    const requirements: string[] = [];
    const description = issueData.description;

    // Buscar secciones de requerimientos
    const reqPatterns = [
      /(?:requisito|requerimiento|requirement)s?[:\-\s]*(.*?)(?:\n\n|\n[A-Z]|$)/gis,
      /(?:necesita|debe|should|must)[:\-\s]*(.*?)(?:\n|\.|$)/gis,
      /(?:como|as a).*?(?:quiero|want|need).*?(?:para|so that)(.*?)(?:\n|\.|$)/gis,
    ];

    reqPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const req = match[1].trim();
        if (req.length > 10) {
          requirements.push(req);
        }
      }
    });

    // Si no se encontraron requerimientos específicos, usar el título como requerimiento principal
    if (requirements.length === 0) {
      requirements.push(`Implementar: ${issueData.title}`);
    }

    return requirements;
  }

  private extractAcceptanceCriteria(issueData: IssueData): string[] {
    const criteria: string[] = [];
    const description = issueData.description;

    // Buscar criterios de aceptación explícitos
    const criteriaPatterns = [
      /(?:criterios? de aceptaci[oó]n|acceptance criteria)[:\-\s]*((?:.*\n)*?)(?:\n[A-Z]|\n\n|$)/gis,
      /(?:dado|given).*?(?:cuando|when).*?(?:entonces|then)(.*?)(?:\n|\.|$)/gis,
      /[-\*]\s*(.+?)(?:\n|$)/g,
    ];

    criteriaPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const criterion = match[1].trim();
        if (criterion.length > 5) {
          criteria.push(criterion);
        }
      }
    });

    return criteria;
  }

  private generateTestingSuggestions(issueData: IssueData, fullText: string): string[] {
    const suggestions: string[] = [];

    // Sugerencias basadas en palabras clave
    const testingSuggestions = [
      {
        keywords: ['login', 'auth', 'password', 'usuario'],
        tests: [
          'Verificar login con credenciales válidas',
          'Verificar error con credenciales inválidas',
          'Verificar logout funciona correctamente',
          'Probar casos de seguridad (inyección, XSS)',
        ]
      },
      {
        keywords: ['form', 'formulario', 'input', 'campo'],
        tests: [
          'Validar todos los campos obligatorios',
          'Probar validaciones de formato',
          'Verificar mensajes de error apropiados',
          'Probar envío con datos válidos e inválidos',
        ]
      },
      {
        keywords: ['api', 'endpoint', 'service'],
        tests: [
          'Probar respuestas con datos válidos',
          'Verificar manejo de errores HTTP',
          'Validar estructura de respuestas JSON',
          'Probar autenticación y autorización',
        ]
      },
      {
        keywords: ['ui', 'interfaz', 'button', 'botón'],
        tests: [
          'Verificar diseño responsive',
          'Probar accesibilidad (WCAG)',
          'Validar navegación entre pantallas',
          'Verificar estados de loading y error',
        ]
      },
      {
        keywords: ['database', 'datos', 'guardar', 'save'],
        tests: [
          'Verificar persistencia de datos',
          'Probar integridad referencial',
          'Validar rollback en errores',
          'Probar concurrencia de acceso',
        ]
      }
    ];

    testingSuggestions.forEach(({ keywords, tests }) => {
      if (keywords.some(keyword => fullText.includes(keyword))) {
        suggestions.push(...tests);
      }
    });

    // Sugerencias generales siempre incluidas
    suggestions.push(
      'Verificar que el cambio no rompe funcionalidad existente',
      'Probar en diferentes navegadores/dispositivos',
      'Validar performance bajo carga normal',
      'Revisar logs de errores durante las pruebas'
    );

    return [...new Set(suggestions)]; // Remover duplicados
  }

  private identifyRiskAreas(fullText: string, labels: string[]): string[] {
    const risks: string[] = [];

    const riskIndicators = [
      { pattern: /security|seguridad|auth|password/, risk: 'Seguridad - requiere testing exhaustivo' },
      { pattern: /payment|pago|billing|facturación/, risk: 'Pagos - crítico para el negocio' },
      { pattern: /data|datos|database/, risk: 'Integridad de datos - riesgo de pérdida' },
      { pattern: /migration|migración/, risk: 'Migración - riesgo de downtime' },
      { pattern: /integration|integración|third.party/, risk: 'Integraciones externas - dependencias' },
      { pattern: /performance|rendimiento/, risk: 'Performance - impacto en UX' },
    ];

    riskIndicators.forEach(({ pattern, risk }) => {
      if (pattern.test(fullText)) {
        risks.push(risk);
      }
    });

    // Riesgos basados en etiquetas
    const criticalLabels = ['critical', 'crítico', 'high-priority', 'security', 'bug'];
    if (labels.some(label => criticalLabels.includes(label.toLowerCase()))) {
      risks.push('Alta prioridad - requiere testing completo antes de release');
    }

    return risks;
  }

  private determineTestTypes(fullText: string, labels: string[]): string[] {
    const testTypes: string[] = [];

    const typeMapping = [
      { pattern: /unit|unitario/, type: 'Testing Unitario' },
      { pattern: /integration|integración/, type: 'Testing de Integración' },
      { pattern: /ui|interfaz|frontend/, type: 'Testing de UI/UX' },
      { pattern: /api|service|backend/, type: 'Testing de API' },
      { pattern: /performance|rendimiento/, type: 'Testing de Performance' },
      { pattern: /security|seguridad/, type: 'Testing de Seguridad' },
      { pattern: /mobile|móvil/, type: 'Testing Mobile' },
      { pattern: /accessibility|accesibilidad/, type: 'Testing de Accesibilidad' },
    ];

    typeMapping.forEach(({ pattern, type }) => {
      if (pattern.test(fullText)) {
        testTypes.push(type);
      }
    });

    // Tipos básicos siempre incluidos
    testTypes.push('Testing Funcional', 'Testing de Regresión');

    return [...new Set(testTypes)];
  }

  private async analyzeGitLabIssueForQA(args: { issueUrl: string }) {
    const { issueUrl } = args;
    
    // Parsear URL para extraer proyecto e issue
    const { projectId, issueIid } = this.parseGitLabUrl(issueUrl);
    
    // Obtener datos del issue
    const issueData = await this.getIssueData(projectId, issueIid);
    
    // Analizar para QA
    const qaAnalysis = this.analyzeIssueForQA(issueData);
    
    // Obtener comentarios para contexto adicional
    const comments = await this.makeGitLabRequest(
      `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`
    );
    const userComments = comments.filter((comment: any) => !comment.system);

    return {
      content: [
        {
          type: "text",
          text: this.formatQAAnalysis(issueData, qaAnalysis, userComments),
        },
      ],
    };
  }

  private async getGitLabIssueQASummary(args: { projectId: string; issueIid: number }) {
    const { projectId, issueIid } = args;
    
    const issueData = await this.getIssueData(projectId, issueIid);
    const qaAnalysis = this.analyzeIssueForQA(issueData);

    return {
      content: [
        {
          type: "text",
          text: `🔍 **Resumen QA - Issue #${issueData.iid}**\n\n` +
               `**Proyecto:** ${issueData.project_name}\n` +
               `**Título:** ${issueData.title}\n` +
               `**Estado:** ${issueData.state}\n\n` +
               `**Requerimientos identificados:** ${qaAnalysis.requirements.length}\n` +
               `**Criterios de aceptación:** ${qaAnalysis.acceptanceCriteria.length}\n` +
               `**Sugerencias de testing:** ${qaAnalysis.testingSuggestions.length}\n` +
               `**Áreas de riesgo:** ${qaAnalysis.riskAreas.length}\n` +
               `**Tipos de testing:** ${qaAnalysis.testTypes.join(', ')}`
        },
      ],
    };
  }

  private formatQAAnalysis(issueData: IssueData, qaAnalysis: QAAnalysis, comments: any[]): string {
    return `# 📋 Análisis QA Completo

## 📄 Información del Issue
**Proyecto:** ${issueData.project_name}
**Issue:** #${issueData.iid} - ${issueData.title}
**Estado:** ${issueData.state}
**Autor:** ${issueData.author}
**Asignados:** ${issueData.assignees.length > 0 ? issueData.assignees.join(', ') : 'Sin asignar'}
**Etiquetas:** ${issueData.labels.length > 0 ? issueData.labels.join(', ') : 'Sin etiquetas'}
**URL:** ${issueData.web_url}

## 🎯 Requerimientos Identificados
${qaAnalysis.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

## ✅ Criterios de Aceptación
${qaAnalysis.acceptanceCriteria.length > 0 
  ? qaAnalysis.acceptanceCriteria.map((criteria, index) => `${index + 1}. ${criteria}`).join('\n')
  : 'No se encontraron criterios de aceptación explícitos. Revisar descripción del issue.'}

## 🧪 Sugerencias de Testing
${qaAnalysis.testingSuggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

## ⚠️ Áreas de Riesgo Identificadas
${qaAnalysis.riskAreas.length > 0 
  ? qaAnalysis.riskAreas.map((risk, index) => `${index + 1}. ${risk}`).join('\n')
  : 'No se identificaron áreas de riesgo específicas.'}

## 🔬 Tipos de Testing Recomendados
${qaAnalysis.testTypes.map((type, index) => `${index + 1}. ${type}`).join('\n')}

## 📝 Descripción Original del Issue
${issueData.description || 'Sin descripción proporcionada'}

${comments.length > 0 ? `## 💬 Comentarios Relevantes (${comments.length})
${comments.slice(0, 3).map((comment: any) => 
  `**${comment.author.name}** (${new Date(comment.created_at).toLocaleDateString('es-ES')}):\n${comment.body}\n`
).join('\n---\n')}${comments.length > 3 ? '\n*(Mostrando solo los 3 comentarios más recientes)*' : ''}` : ''}

---
*Análisis generado automáticamente por GitLab QA MCP Server*`;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Servidor MCP de GitLab QA iniciado");
  }
}

const server = new GitLabQAMCPServer();
server.run().catch(console.error); 