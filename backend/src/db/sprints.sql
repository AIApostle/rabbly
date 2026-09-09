-- =============================================================================
-- Rabbly Supabase SQL: LEARNING SPRINTS TABLE
-- Stores multi-day learning goals, milestones, and linked study resources.
-- =============================================================================

-- 1. Table Schema
create table if not exists public.sprints (
    id text primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    title text not null,
    subject text not null default 'General Mastery',
    timeframe text not null default '3-Day Sprint',
    days_remaining int default 3,
    total_days int default 3,
    progress_percent int default 0,
    milestones jsonb default '[]'::jsonb,
    resources jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security
alter table public.sprints enable row level security;

create policy "Sprints are viewable by authenticated users"
    on public.sprints for select
    to authenticated
    using (auth.uid() = user_id or user_id is null);

create policy "Users can insert their own sprints"
    on public.sprints for insert
    to authenticated
    with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own sprints"
    on public.sprints for update
    to authenticated
    using (auth.uid() = user_id or user_id is null);

create policy "Users can delete their own sprints"
    on public.sprints for delete
    to authenticated
    using (auth.uid() = user_id or user_id is null);

-- =============================================================================
-- Common Sprint SQL Queries
-- =============================================================================

-- Select all sprints for a user:
-- select * from public.sprints where user_id = :user_id or user_id is null order by created_at desc;

-- Select sprint by ID:
-- select * from public.sprints where id = :sprint_id limit 1;

-- Create new sprint:
-- insert into public.sprints (id, user_id, title, subject, timeframe, days_remaining, total_days, progress_percent, milestones, resources)
-- values (:id, :user_id, :title, :subject, :timeframe, :days_remaining, :total_days, :progress_percent, :milestones, :resources)
-- returning *;

-- Update sprint progress and milestones:
-- update public.sprints
-- set progress_percent = :progress_percent,
--     milestones = :milestones,
--     days_remaining = :days_remaining,
--     updated_at = timezone('utc'::text, now())
-- where id = :sprint_id;

-- Delete sprint:
-- delete from public.sprints where id = :sprint_id;
