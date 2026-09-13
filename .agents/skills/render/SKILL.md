---
name: render
description: >-
  Comprehensive guide and operational manual for Render deployment, infrastructure management,
  and the Render Model Context Protocol (MCP) server. Use this skill when:
  - Deploying, managing, or scaling services, web apps, databases, background workers, or cron jobs on Render
  - Interacting with the Render MCP server (list_services, trigger_deploy, get_service, list_env_vars, list_logs)
  - Generating and validating `render.yaml` Blueprints for Infrastructure-as-Code
  - Configuring environment variables, custom domains, health checks, or persistent disks on Render
  - Troubleshooting deploy failures, build timeouts, or runtime logs on Render
---

# Render Cloud Platform & MCP Skill

This skill provides expert guidance for deploying and operating full-stack applications on **Render** (`https://render.com`) using both the **Render MCP Server** and **Infrastructure-as-Code (render.yaml Blueprints)**.

---

## 1. Render MCP Server Integration

The official Render MCP server allows AI agents to inspect, manage, deploy, and monitor services and datastores.

### Connection Details

| Attribute | Specification |
|-----------|---------------|
| **Remote Server URL** | `https://mcp.render.com/mcp` |
| **Transport** | Remote HTTP / SSE (`serverUrl: "https://mcp.render.com/mcp"`) |
| **Authentication** | Bearer API token via Header `Authorization: Bearer <RENDER_API_KEY>` or OAuth |
| **Configuration** | `.agents/mcp_config.json` |
| **API Key Generation** | https://dashboard.render.com/u/settings?add-api-key |

### Configuration in `.agents/mcp_config.json`

```json
{
  "mcpServers": {
    "render": {
      "serverUrl": "https://mcp.render.com/mcp"
    }
  }
}
```

If using a local personal access token via environment variable:
```bash
export RENDER_API_KEY="rnd_..."
```

---

## 2. MCP Tool Catalog

### A. Workspaces & Identity
- **`list_workspaces`**: List all teams and individual workspaces available to the authenticated account.
- **`select_workspace`**: Select the active workspace (`ownerID` / `workspaceId`).
- **`get_selected_workspace`**: View currently targeted workspace context.

### B. Service Management & Deployments
- **`list_services`**: List all deployed web services, static sites, background workers, and cron jobs.
  - Parameters: `includePreviews` (boolean, optional), `workspaceId` (string, optional).
- **`get_service`**: Retrieve details, configuration, endpoints, and status for a service (`serviceId`).
- **`create_web_service`**: Provision a new Docker or native runtime web service.
  - Parameters: `name`, `runtime` (`node` | `python` | `go` | `rust` | `docker`), `buildCommand`, `startCommand`, `repo`, `branch`, `plan` (`starter` | `standard` | `pro`), `region` (`oregon` | `frankfurt` | `singapore` | `ohio` | `virginia`), `envVars`.
- **`create_static_site`**: Provision a static frontend site.
  - Parameters: `name`, `buildCommand`, `publishPath` (e.g. `dist`), `repo`, `branch`.
- **`restart_service`**: Trigger a zero-downtime service restart.
- **`list_deploys`**: Fetch deployment history, commit SHAs, and build logs for a service.
- **`trigger_deploy`**: Trigger an immediate deployment (`clearCache: "do_clear"` or `"clear"`).

### C. Environment Variables & Secrets
- **`list_env_vars`**: Inspect active environment variables on a service (`serviceId`).
- **`update_env_vars`**: Add, update, or remove key-value secrets securely.

### D. Databases & Datastores
- **`list_postgres_databases`**: List managed PostgreSQL databases in the workspace.
- **`create_postgres_database`**: Provision managed PostgreSQL with backup plans and connection strings.
- **`get_postgres_database`**: Retrieve host, port, database name, and connection credentials.

### E. Logs & Telemetry
- **`list_logs`**: Stream runtime stdout/stderr logs for debugging deployment crashes.
- **`list_metrics`**: Review CPU usage, RAM utilization, and HTTP request throughput.

---

## 3. Infrastructure-as-Code: `render.yaml` Blueprint

For reproducible, version-controlled setups, place a `render.yaml` in the root of your repository:

### Rabbly Full-Stack Deployment Blueprint

```yaml
services:
  # 1. Backend Web Service (FastAPI + Python)
  - type: web
    name: rabbly-backend
    runtime: python
    region: oregon
    plan: starter
    rootDir: backend
    buildCommand: "pip install uv && uv sync --frozen"
    startCommand: "uv run uvicorn main:app --host 0.0.0.0 --port $PORT"
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: PORT
        value: 8000
      - key: CORS_ORIGINS
        value: "https://rabbly.onrender.com,https://rabbly.vercel.app,http://localhost:5173"
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_LIVE_MODEL
        value: "gemini-2.5-flash"

  # 2. Frontend Static Site (React + Vite + Tailwind)
  - type: web
    name: rabbly-frontend
    runtime: static
    rootDir: frontend
    buildCommand: "npm install && npm run build"
    staticPublishPath: dist
    autoDeploy: true
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_API_URL
        fromService:
          type: web
          name: rabbly-backend
          property: host
```

---

## 4. Best Practices & Gotchas

1. **Port Binding**:
   - Render dynamically assigns the `$PORT` environment variable to web services. Always bind to `0.0.0.0` and `$PORT` (e.g. `uvicorn main:app --host 0.0.0.0 --port $PORT`).
2. **SPA Routing**:
   - For static frontend apps (React/Vite), add a rewrite rule routing `/*` to `/index.html` to prevent 404s on browser reloads of nested routes (`/classroom/:code`, `/learn`).
3. **Health Checks**:
   - Set `healthCheckPath: /health` so Render only routes live traffic once the FastAPI server has completed its startup hooks and database connections.
4. **Secret Protection**:
   - Never commit sensitive keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, tokens) in `render.yaml`. Use `sync: false` to populate them securely via the Render Dashboard or `update_env_vars` MCP tool.
