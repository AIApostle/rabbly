---
name: vercel
description: >-
  Comprehensive guide and operational manual for Vercel deployment, edge platform configuration,
  and the official Vercel Model Context Protocol (MCP) server. Use this skill when:
  - Deploying, configuring, or scaling frontend applications, static sites, or edge functions on Vercel
  - Interacting with the Vercel MCP server (list_projects, list_deployments, create_deployment, list_env_vars)
  - Managing environment variables, secrets, custom domains, DNS, and deployment aliases
  - Writing or updating `vercel.json` for SPA rewrites, security headers, caching, and routing rules
  - Troubleshooting build errors, preview deployments, or runtime edge diagnostics on Vercel
---

# Vercel Cloud Platform & MCP Skill

This skill provides comprehensive operational instructions for deploying and managing high-performance frontend applications, serverless APIs, and edge infrastructure on **Vercel** (`https://vercel.com`) using the **Vercel MCP Server** and **Vercel CLI**.

---

## 1. Vercel MCP Server Integration

The official Vercel MCP server (`https://mcp.vercel.com`) exposes the complete Vercel REST API to AI agents for project provisioning, deployment management, environment variable synchronization, and domain verification.

### Connection Details

| Attribute | Specification |
|-----------|---------------|
| **Remote Server URL** | `https://mcp.vercel.com` |
| **Transport** | Remote HTTP / SSE (`serverUrl: "https://mcp.vercel.com"`) |
| **Authentication** | Bearer Token via Header `Authorization: Bearer <VERCEL_TOKEN>` or browser OAuth flow |
| **Configuration** | `.agents/mcp_config.json` |
| **Token Generation** | https://vercel.com/account/tokens |

### Configuration in `.agents/mcp_config.json`

```json
{
  "mcpServers": {
    "vercel": {
      "serverUrl": "https://mcp.vercel.com"
    }
  }
}
```

If connecting via CLI or personal access token:
```bash
export VERCEL_TOKEN="vca_..."
```

---

## 2. MCP Tool Catalog

### A. Projects & Teams
- **`list_projects`**: Enumerate all projects under the active user or team account.
  - Returns: Project names, framework presets (`vite`, `nextjs`, etc.), repository link, and root directories.
- **`get_project`**: Retrieve detailed project configuration (`projectId` or `projectName`), build commands, and output directories.
- **`create_project`**: Provision a new Vercel project with Git repository linking.
  - Parameters: `name`, `framework` (e.g. `'vite'`), `gitRepository` (`type`, `repo`), `buildCommand`, `outputDirectory`.
- **`list_teams`**: List all organizations/teams the authenticated user belongs to.

### B. Deployments & Builds
- **`list_deployments`**: List recent deployments across preview and production environments.
  - Filters: `projectId`, `state` (`READY`, `BUILDING`, `ERROR`, `CANCELED`), `limit`.
- **`get_deployment`**: Inspect specific deployment status, build duration, deployment URL, and creator.
- **`create_deployment`**: Trigger an automated deployment from a Git branch or commit SHA.
- **`cancel_deployment`**: Terminate an active or stuck build pipeline.
- **`get_deployment_events`**: Stream step-by-step build logs, dependency resolution outputs, and compiler errors.

### C. Environment Variables & Secrets
- **`list_env_vars`**: List environment variables defined for a project.
  - Targets: `production`, `preview`, `development`.
- **`create_env_var`**: Create encrypted environment variables.
  - Parameters: `projectId`, `key`, `value`, `target` (`['production', 'preview', 'development']`), `type` (`encrypted` | `plain`).
- **`update_env_var`**: Modify an existing variable's value or target environment.
- **`delete_env_var`**: Remove outdated or rotated API keys.

### D. Domains & DNS Routing
- **`list_domains`**: Enumerate assigned production and preview domains.
- **`add_domain`**: Attach a custom apex or subdomain (e.g. `rabbly.ai`, `app.rabbly.ai`).
- **`verify_domain`**: Validate DNS configuration (A records, CNAME records) and request SSL certificates.

---

## 3. Configuration: `vercel.json`

For Single Page Applications (SPAs) like Vite + React, create a `vercel.json` in the frontend root or project root to ensure proper client-side routing and caching:

### Recommended `vercel.json` for Rabbly Frontend

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://rabbly-backend.onrender.com/api/:match*"
    },
    {
      "source": "/ws/:match*",
      "destination": "https://rabbly-backend.onrender.com/ws/:match*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 4. Vercel CLI Commands

The Vercel CLI (`vercel`) provides quick terminal-driven workflows:

| Task | Command |
|------|---------|
| Link project | `npx vercel link` |
| Pull environment variables | `npx vercel env pull .env.local` |
| Deploy to Preview | `npx vercel` |
| Deploy to Production | `npx vercel --prod` |
| Inspect build logs | `npx vercel logs <deployment-url>` |
| Manage domains | `npx vercel domains ls` |

---

## 5. Deployment Best Practices

1. **SPA Rewrites**:
   - Without the rewrite rule `{ "source": "/(.*)", "destination": "/index.html" }`, direct navigation or browser refresh on deep routes (e.g. `/classroom/RAB-3764` or `/learn`) returns HTTP 404.
2. **Environment Variable Naming**:
   - Variables intended for the client bundle must be prefixed with `VITE_` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   - Server-only variables (such as `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY`) must **never** be exposed in the frontend project.
3. **Cache Optimization**:
   - Vite builds generate content-hashed static assets in `/assets/`. Configure long-term immutable caching (`max-age=31536000, immutable`) for these assets, and no-cache for `/index.html`.
