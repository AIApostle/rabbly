---
name: supabase-rabbly
description: >-
  Comprehensive Supabase guidance for the Rabbly project. Use this skill when:
  - Writing or modifying Supabase database queries, RLS policies, migrations, or functions
  - Debugging Supabase auth (JWT, sessions, email verification, password reset)
  - Working with the Supabase MCP server tools (execute SQL, inspect schema, manage tables)
  - Managing Storage buckets, Edge Functions, or Realtime subscriptions for Rabbly
  - Reviewing or updating the backend Python/Supabase integration in src/db/ or src/auth/
---

# Supabase × Rabbly Skill

## Project Context

| Key | Value |
|-----|-------|
| **Project ref** | `rahjukfzdhebjxcsmsnd` |
| **URL** | `https://rahjukfzdhebjxcsmsnd.supabase.co` |
| **Backend env** | `backend/.env` |
| **DB queries folder** | `backend/src/db/` |
| **Auth folder** | `backend/src/auth/` |
| **Schema folder** | `backend/src/schemas/` |

---

## MCP Server Setup

The `supabase` MCP server is configured in `.agents/mcp_config.json`. It connects
via stdio using `npx @supabase/mcp-server-supabase --project-ref rahjukfzdhebjxcsmsnd`.

**Prerequisite**: The `SUPABASE_ACCESS_TOKEN` environment variable must be set to
a valid Supabase Personal Access Token (PAT).

To get one:
1. Go to https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**
3. Set `SUPABASE_ACCESS_TOKEN=<your-pat>` in your shell (or in `~/.bashrc` / `~/.zshrc`)

Once set, the MCP server exposes tools to:
- Execute SQL against the project DB
- List/inspect tables, views, and functions
- Manage storage buckets
- Inspect Edge Functions and logs

---

## Database Schema (Current)

### `profiles` table
Auto-created via Supabase auth trigger. Mirrors `auth.users`.

```sql
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  avatar_url  text,
  email       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

> All new tables MUST be added to `backend/src/db/` as a separate file.
> Update `backend/src/db/__init__.py` and this skill's schema section.

---

## Row-Level Security (RLS) — Required for Every Table

All tables **must** have RLS enabled. Default policy pattern:

```sql
-- Enable RLS
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY "self_select" ON public.<table>
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "self_insert" ON public.<table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "self_update" ON public.<table>
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "self_delete" ON public.<table>
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Auth Architecture

Rabbly uses **Supabase Auth** with the following flow:

1. **Signup** -> `POST /auth/signup` -> calls `supabase.auth.admin.create_user()`
2. **Sign-in** -> `POST /auth/login` -> calls `supabase.auth.sign_in_with_password()`
3. **Token verification** -> `supabase.auth.get_user(token)` (server-side, authoritative)
4. **Forgot password** -> `POST /auth/forgot-password` -> `supabase.auth.reset_password_for_email()`
5. **Reset password** -> `POST /auth/reset-password` -> `supabase.auth.admin.update_user_by_id()`
6. **Frontend** stores `access_token` in `localStorage` as `rabbly_access_token`

### Token Verification Pattern (Python)
```python
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async def verify_token(token: str):
    response = supabase.auth.get_user(token)
    return response.user  # None if invalid/expired
```

---

## Common MCP Tool Workflows

### Inspect current schema
Use the MCP execute_sql tool:
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check RLS policies
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Check auth users
```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;
```

---

## Rules for DB File Updates

When adding a new table or modifying an existing one:
1. Create or update the file in `backend/src/db/<table_name>.py`
2. Add queries as `async def` functions using the supabase Python client
3. Export from `backend/src/db/__init__.py`
4. Add the corresponding Pydantic schema to `backend/src/schemas/<table_name>.py`
5. **Update the schema section in this SKILL.md**

---

## Supabase Python Client Usage

```python
# backend/src/db/profiles.py
from supabase import AsyncClient

async def get_profile(supabase: AsyncClient, user_id: str):
    res = await supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return res.data

async def upsert_profile(supabase: AsyncClient, user_id: str, data: dict):
    res = await supabase.table("profiles").upsert({"id": user_id, **data}).execute()
    return res.data
```

---

## Edge Functions (if needed)

Edge Functions live at `supabase/functions/<name>/index.ts`.
Deploy with:
```bash
supabase functions deploy <name> --project-ref rahjukfzdhebjxcsmsnd
```

---

## Migrations

Always use the Supabase CLI for schema migrations:
```bash
supabase db diff --project-ref rahjukfzdhebjxcsmsnd -f <migration_name>
supabase db push --project-ref rahjukfzdhebjxcsmsnd
```
