-- =============================================================================
-- Rabbly Supabase SQL: SESSIONS / CLASSROOMS TABLE
-- Stores AI tutoring sessions, shared classrooms, and whiteboard snapshots.
-- =============================================================================

-- 1. Table Schema
create table if not exists public.sessions (
    id uuid default uuid_generate_v4() primary key,
    room_code text unique not null,
    host_id uuid references public.profiles(id) on delete set null,
    topic text not null,
    level text default 'Beginner',
    is_classroom boolean default false,
    status text default 'active',
    board_state jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security
alter table public.sessions enable row level security;

create policy "Sessions are viewable by authenticated users"
    on public.sessions for select
    to authenticated
    using (true);

create policy "Users can create sessions"
    on public.sessions for insert
    to authenticated
    with check (auth.uid() = host_id or host_id is null);

create policy "Hosts can update their own sessions"
    on public.sessions for update
    to authenticated
    using (auth.uid() = host_id);

-- =============================================================================
-- Common Session SQL Queries
-- =============================================================================

-- Select session by room code:
-- select * from public.sessions where room_code = :room_code limit 1;

-- Select session by ID:
-- select * from public.sessions where id = :session_id limit 1;

-- List all active sessions for a user:
-- select * from public.sessions where host_id = :user_id order by created_at desc;

-- Create new session:
-- insert into public.sessions (room_code, host_id, topic, level, is_classroom, status, board_state)
-- values (:room_code, :host_id, :topic, :level, :is_classroom, :status, :board_state)
-- returning *;

-- Update session whiteboard state:
-- update public.sessions
-- set board_state = :board_state,
--     updated_at = timezone('utc'::text, now())
-- where room_code = :room_code;
