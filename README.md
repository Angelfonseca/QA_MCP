# 🔍 Servidor MCP de Análisis QA para GitLab y GitHub

Un servidor MCP (Model Context Protocol) especializado en análisis de issues de GitLab y GitHub para equipos de QA. Toma URLs de issues y genera análisis completos con todo lo necesario para realizar testing efectivo, además de herramientas adicionales para análisis de bases de datos, consultas HTTP y búsquedas web.

## 🚀 Características

- **Análisis automático de requerimientos**: Extrae automáticamente qué se solicita en el issue (GitLab y GitHub)
- **Criterios de aceptación**: Identifica y lista los criterios de aceptación
- **Sugerencias de testing**: Genera recomendaciones específicas de testing basadas en el contenido
- **Identificación de riesgos**: Detecta áreas críticas que requieren atención especial
- **Tipos de testing**: Recomienda qué tipos de testing aplicar
- **Análisis de contexto**: Incluye comentarios relevantes para mayor contexto
- **Herramientas adicionales**: Consultas HTTP, análisis de bases de datos (PostgreSQL, MySQL, MongoDB), búsquedas web

## 📋 Requisitos

- Node.js 18 o superior
- Token de acceso personal de GitLab (opcional, puede proporcionarse en el prompt)
- Token de acceso personal de GitHub (opcional, puede configurarse en variables de entorno o proporcionarse en el prompt)
- Acceso a las instancias de GitLab (gitlab.com o self-hosted) y/o GitHub

## ⚙️ Instalación

1. **Clona o descarga el proyecto**:
   ```bash
   cd gitlab_mcp
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto:
   ```bash
   # Configuración del Servidor MCP de GitLab QA
   # URL de tu instancia de GitLab (por defecto: https://gitlab.com)
   GITLAB_URL=https://gitlab.com

   # Token de acceso personal de GitLab (REQUERIDO para herramientas de GitLab)
   # Para crear uno:
   # 1. Ve a tu perfil de GitLab → Settings → Access Tokens
   # 2. Crea un nuevo token con estos permisos:
   #    - api (acceso completo a la API)
   #    - read_api (acceso de lectura a la API)
   #    - read_repository (acceso de lectura al repositorio)
   # 3. Copia el token generado aquí
   GITLAB_ACCESS_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

   # Token de acceso personal de GitHub (OPCIONAL - para herramientas de GitHub)
   # Si no se configura aquí, deberás proporcionarlo en cada llamada a la herramienta
   # Para crear uno:
   # 1. Ve a GitHub → Settings → Developer settings → Personal access tokens
   # 2. Crea un token con permisos de repo y read:org
   # GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

   # Ejemplos para diferentes instancias:
   # GITLAB_URL=https://gitlab.empresa.com  # Para GitLab empresarial
   # GITLAB_URL=https://gitlab.example.org   # Para instancia personalizada
   ```

4. **Compila el proyecto**:
   ```bash
   npm run build
   ```

## 🔧 Configuración del Token de GitLab

1. Ve a tu perfil de GitLab → **Settings** → **Access Tokens**
2. Crea un nuevo token con los siguientes permisos:
   - `api` - Acceso completo a la API
   - `read_api` - Acceso de lectura a la API
   - `read_repository` - Acceso de lectura al repositorio
3. Copia el token y colócalo en tu archivo `.env`

## 🎯 Herramientas Disponibles

### `analyze_gitlab_issue_for_qa`
Analiza un issue de GitLab completo para generar información de QA.

**Parámetros**:
- `issueUrl` (requerido): URL completa del issue de GitLab

**Ejemplo**:
```
URL: https://gitlab.com/mi-empresa/mi-proyecto/-/issues/123
```

**Salida**: Análisis completo incluyendo:
- Información del issue y proyecto
- Requerimientos identificados
- Criterios de aceptación
- Sugerencias específicas de testing
- Áreas de riesgo identificadas
- Tipos de testing recomendados
- Descripción original y comentarios relevantes

### `get_gitlab_issue_qa_summary`
Obtiene un resumen ejecutivo rápido del análisis QA.

**Parámetros**:
- `projectId` (requerido): ID del proyecto de GitLab
- `issueIid` (requerido): IID del issue

### `analyze_github_issue_for_qa`
Analiza un issue de GitHub completo para generar información de QA.

**Parámetros**:
- `issueUrl` (requerido): URL completa del issue de GitHub
- `accessToken` (opcional): Token de acceso de GitHub. Si no se proporciona, se usará el token configurado en GITHUB_ACCESS_TOKEN

**Ejemplo**:
```
URL: https://github.com/owner/repo/issues/123
```

**Salida**: Análisis completo similar al de GitLab, incluyendo requerimientos, criterios de aceptación, sugerencias de testing, áreas de riesgo y tipos de testing recomendados.

### `get_github_issue_qa_summary`
Obtiene un resumen ejecutivo rápido del análisis QA para un issue de GitHub.

**Parámetros**:
- `owner` (requerido): Nombre del propietario del repositorio
- `repo` (requerido): Nombre del repositorio
- `issueNumber` (requerido): Número del issue
- `accessToken` (opcional): Token de acceso de GitHub. Si no se proporciona, se usará el token configurado en GITHUB_ACCESS_TOKEN

### `github_get_commit_by_url`
Obtiene información de un commit de GitHub a partir de su URL.

**Parámetros**:
- `commitUrl` (requerido): URL completa del commit
- `accessToken` (opcional): Token de acceso de GitHub

### `github_get_commit`
Obtiene información de un commit de GitHub por sus coordenadas.

**Parámetros**:
- `owner` (requerido): Propietario del repositorio
- `repo` (requerido): Nombre del repositorio
- `sha` (requerido): Hash del commit
- `accessToken` (opcional): Token de acceso de GitHub

### `github_api_get`
Realiza una petición GET directa a la API de GitHub.

**Parámetros**:
- `endpoint` (requerido): Endpoint de la API (ej: `/repos/owner/repo`)
- `params` (opcional): Objeto con parámetros de consulta
- `accessToken` (opcional): Token de acceso de GitHub

## 🏃‍♂️ Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## 🔧 Herramientas Adicionales

### Herramientas HTTP

#### `http_request`
Realiza una solicitud HTTP genérica a cualquier endpoint.

**Parámetros**:
- `method` (requerido): Método HTTP (GET, POST, PUT, DELETE, etc.)
- `url` (requerido): URL completa
- `headers` (opcional): Objeto con headers
- `params` (opcional): Objeto con query params
- `body` (opcional): Cuerpo de la petición (string o JSON stringified)
- `timeoutMs` (opcional): Timeout en milisegundos (default: 15000)

### Herramientas de Base de Datos

#### `postgres_query`
Ejecuta una consulta en una base de datos PostgreSQL.

**Parámetros**:
- `connectionString` (requerido): String de conexión PostgreSQL (ej: `postgresql://user:pass@host:5432/db`)
- `query` (requerido): Consulta SQL
- `params` (opcional): Array de parámetros para la consulta

#### `mysql_query`
Ejecuta una consulta en una base de datos MySQL.

**Parámetros**:
- `query` (requerido): Consulta SQL
- `connectionUri` (opcional): URI de conexión (ej: `mysql://user:pass@host:3306/db`)
- `host`, `port`, `user`, `password`, `database` (opcionales): Alternativa a connectionUri
- `params` (opcional): Array de parámetros

#### `mongo_query`
Ejecuta operaciones en MongoDB.

**Parámetros**:
- `uri` (requerido): URI de conexión MongoDB
- `database` (requerido): Nombre de la base de datos
- `collection` (requerido): Nombre de la colección
- `operation` (requerido): Operación a realizar (`find_one`, `find_many`, `insert_one`, `update_many`, `delete_many`)
- `filter` (opcional): Objeto de filtro para búsquedas
- `update` (opcional): Objeto de actualización
- `document` (opcional): Documento a insertar
- `options` (opcional): Opciones adicionales

### Herramientas Web

#### `web_search`
Realiza búsquedas web usando DuckDuckGo.

**Parámetros**:
- `query` (requerido): Término de búsqueda
- `maxResults` (opcional): Número máximo de resultados (default: 5)

## 📝 Ejemplo de Análisis Generado

Para un issue que dice: "Implementar login con Google OAuth", el servidor generaría:

```markdown
# 📋 Análisis QA Completo

## 📄 Información del Issue
**Proyecto:** Mi Aplicación Web
**Issue:** #123 - Implementar login con Google OAuth
**Estado:** opened
...

## 🎯 Requerimientos Identificados
1. Implementar: Implementar login con Google OAuth
2. Integrar autenticación OAuth2 con Google
3. Manejar tokens de acceso y refresh

## ✅ Criterios de Aceptación
1. Usuario puede hacer login con su cuenta de Google
2. Se muestra error apropiado si falla la autenticación
3. Token se almacena de forma segura

## 🧪 Sugerencias de Testing
1. Verificar login con credenciales válidas
2. Verificar error con credenciales inválidas
3. Verificar logout funciona correctamente
4. Probar casos de seguridad (inyección, XSS)
5. Verificar que el cambio no rompe funcionalidad existente
...

## ⚠️ Áreas de Riesgo Identificadas
1. Seguridad - requiere testing exhaustivo
2. Integraciones externas - dependencias

## 🔬 Tipos de Testing Recomendados
1. Testing de Seguridad
2. Testing de Integración
3. Testing Funcional
4. Testing de Regresión
```

## 🧠 Inteligencia del Análisis

El servidor utiliza patrones avanzados para:

- **Detectar requerimientos**: Busca palabras clave como "debe", "necesita", "como usuario"
- **Extraer criterios**: Identifica listas, patrones Given/When/Then
- **Sugerir testing**: Basado en tecnologías mencionadas (API, UI, auth, etc.)
- **Identificar riesgos**: Detecta áreas críticas como seguridad, pagos, datos
- **Recomendar tipos**: Mapea contenido a tipos específicos de testing

## 🔗 Integración con Clientes MCP

Este servidor es compatible con cualquier cliente MCP como:
- Claude Desktop
- Cursor
- Otras aplicaciones que soporten MCP

Configura el servidor en tu cliente MCP apuntando al ejecutable compilado.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para agregar nuevos patrones de análisis:

1. Modifica los métodos `extract*` y `generate*` en `src/helpers/qa.ts`
2. Agrega nuevos patrones de detección
3. Prueba con issues reales de tu organización

## 📄 Licencia

MIT - Siéntete libre de usar y modificar según tus necesidades.

---

**💡 Tip**: Para mejores resultados, asegúrate de que tus issues de GitLab tengan descripciones detalladas con criterios de aceptación claros. 