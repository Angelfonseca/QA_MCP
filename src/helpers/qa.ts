export interface IssueData {
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

export interface QAAnalysis {
  requirements: string[];
  acceptanceCriteria: string[];
  testingSuggestions: string[];
  riskAreas: string[];
  testTypes: string[];
}

function extractRequirements(issueData: IssueData): string[] {
  const requirements: string[] = [];
  const description = issueData.description;
  const reqPatterns = [
    /(?:requisito|requerimiento|requirement)s?[:\-\s]*(.*?)(?:\n\n|\n[A-Z]|$)/gis,
    /(?:necesita|debe|should|must)[:\-\s]*(.*?)(?:\n|\.|$)/gis,
    /(?:como|as a).*?(?:quiero|want|need).*?(?:para|so that)(.*?)(?:\n|\.|$)/gis,
  ];
  reqPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const req = match[1].trim();
      if (req.length > 10) requirements.push(req);
    }
  });
  if (requirements.length === 0) requirements.push(`Implementar: ${issueData.title}`);
  return requirements;
}

function extractAcceptanceCriteria(issueData: IssueData): string[] {
  const criteria: string[] = [];
  const description = issueData.description;
  const criteriaPatterns = [
    /(?:criterios? de aceptaci[oó]n|acceptance criteria)[:\-\s]*((?:.*\n)*?)(?:\n[A-Z]|\n\n|$)/gis,
    /(?:dado|given).*?(?:cuando|when).*?(?:entonces|then)(.*?)(?:\n|\.|$)/gis,
    /[-\*]\s*(.+?)(?:\n|$)/g,
  ];
  criteriaPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const criterion = match[1].trim();
      if (criterion.length > 5) criteria.push(criterion);
    }
  });
  return criteria;
}

function generateTestingSuggestions(issueData: IssueData, fullText: string): string[] {
  const suggestions: string[] = [];
  const testingSuggestions = [
    { keywords: ['login', 'auth', 'password', 'usuario'], tests: ['Verificar login con credenciales válidas', 'Verificar error con credenciales inválidas', 'Verificar logout funciona correctamente', 'Probar casos de seguridad (inyección, XSS)'] },
    { keywords: ['form', 'formulario', 'input', 'campo'], tests: ['Validar todos los campos obligatorios', 'Probar validaciones de formato', 'Verificar mensajes de error apropiados', 'Probar envío con datos válidos e inválidos'] },
    { keywords: ['api', 'endpoint', 'service'], tests: ['Probar respuestas con datos válidos', 'Verificar manejo de errores HTTP', 'Validar estructura de respuestas JSON', 'Probar autenticación y autorización'] },
    { keywords: ['ui', 'interfaz', 'button', 'botón'], tests: ['Verificar diseño responsive', 'Probar accesibilidad (WCAG)', 'Validar navegación entre pantallas', 'Verificar estados de loading y error'] },
    { keywords: ['database', 'datos', 'guardar', 'save'], tests: ['Verificar persistencia de datos', 'Probar integridad referencial', 'Validar rollback en errores', 'Probar concurrencia de acceso'] },
  ];
  testingSuggestions.forEach(({ keywords, tests }) => {
    if (keywords.some(keyword => fullText.includes(keyword))) suggestions.push(...tests);
  });
  suggestions.push('Verificar que el cambio no rompe funcionalidad existente', 'Probar en diferentes navegadores/dispositivos', 'Validar performance bajo carga normal', 'Revisar logs de errores durante las pruebas');
  return [...new Set(suggestions)];
}

function identifyRiskAreas(fullText: string, labels: string[]): string[] {
  const risks: string[] = [];
  const riskIndicators = [
    { pattern: /security|seguridad|auth|password/, risk: 'Seguridad - requiere testing exhaustivo' },
    { pattern: /payment|pago|billing|facturación/, risk: 'Pagos - crítico para el negocio' },
    { pattern: /data|datos|database/, risk: 'Integridad de datos - riesgo de pérdida' },
    { pattern: /migration|migración/, risk: 'Migración - riesgo de downtime' },
    { pattern: /integration|integración|third.party/, risk: 'Integraciones externas - dependencias' },
    { pattern: /performance|rendimiento/, risk: 'Performance - impacto en UX' },
  ];
  riskIndicators.forEach(({ pattern, risk }) => { if (pattern.test(fullText)) risks.push(risk); });
  const criticalLabels = ['critical', 'crítico', 'high-priority', 'security', 'bug'];
  if (labels.some(label => criticalLabels.includes(label.toLowerCase()))) risks.push('Alta prioridad - requiere testing completo antes de release');
  return risks;
}

function determineTestTypes(fullText: string, labels: string[]): string[] {
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
  typeMapping.forEach(({ pattern, type }) => { if (pattern.test(fullText)) testTypes.push(type); });
  testTypes.push('Testing Funcional', 'Testing de Regresión');
  return [...new Set(testTypes)];
}

export function analyzeIssueForQA(issueData: IssueData): QAAnalysis {
  const description = issueData.description.toLowerCase();
  const title = issueData.title.toLowerCase();
  const fullText = `${title} ${description}`;
  const requirements = extractRequirements(issueData);
  const acceptanceCriteria = extractAcceptanceCriteria(issueData);
  const testingSuggestions = generateTestingSuggestions(issueData, fullText);
  const riskAreas = identifyRiskAreas(fullText, issueData.labels);
  const testTypes = determineTestTypes(fullText, issueData.labels);
  return { requirements, acceptanceCriteria, testingSuggestions, riskAreas, testTypes };
}

export function formatQAAnalysis(issueData: IssueData, qaAnalysis: QAAnalysis, comments: any[]): string {
  return `# 📋 Análisis QA Completo\n\n## 📄 Información del Issue\n**Proyecto:** ${issueData.project_name}\n**Issue:** #${issueData.iid} - ${issueData.title}\n**Estado:** ${issueData.state}\n**Autor:** ${issueData.author}\n**Asignados:** ${issueData.assignees.length > 0 ? issueData.assignees.join(', ') : 'Sin asignar'}\n**Etiquetas:** ${issueData.labels.length > 0 ? issueData.labels.join(', ') : 'Sin etiquetas'}\n**URL:** ${issueData.web_url}\n\n## 🎯 Requerimientos Identificados\n${qaAnalysis.requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}\n\n## ✅ Criterios de Aceptación\n${qaAnalysis.acceptanceCriteria.length > 0 ? qaAnalysis.acceptanceCriteria.map((criteria, index) => `${index + 1}. ${criteria}`).join('\n') : 'No se encontraron criterios de aceptación explícitos. Revisar descripción del issue.'}\n\n## 🧪 Sugerencias de Testing\n${qaAnalysis.testingSuggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}\n\n## ⚠️ Áreas de Riesgo Identificadas\n${qaAnalysis.riskAreas.length > 0 ? qaAnalysis.riskAreas.map((risk, index) => `${index + 1}. ${risk}`).join('\n') : 'No se identificaron áreas de riesgo específicas.'}\n\n## 🔬 Tipos de Testing Recomendados\n${qaAnalysis.testTypes.map((type, index) => `${index + 1}. ${type}`).join('\n')}\n\n## 📝 Descripción Original del Issue\n${issueData.description || 'Sin descripción proporcionada'}\n\n${comments.length > 0 ? `## 💬 Comentarios Relevantes (${comments.length})\n${comments.slice(0, 3).map((comment: any) => `**${comment.author.name}** (${new Date(comment.created_at).toLocaleDateString('es-ES')}):\n${comment.body}\n`).join('\n---\n')}${comments.length > 3 ? '\n*(Mostrando solo los 3 comentarios más recientes)*' : ''}` : ''}\n\n---\n*Análisis generado automáticamente por GitLab QA MCP Server*`;
}
