-- =============================================================================
-- Rabbly Supabase Database Schema & RLS Policies
-- Execute this script in your Supabase Dashboard SQL Editor to initialize all tables.
-- =============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- PROFILES TABLE
-- Stores public student and tutor profile details linked to auth.users.
-- =============================================================================
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text unique,
    full_name text,
    avatar_url text,
    bio text,
    preferred_level text default 'Beginner',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on profiles
alter table public.profiles enable row level security;

-- RLS Policy: Anyone authenticated can view user profiles
create policy "Profiles are viewable by authenticated users"
    on public.profiles for select
    to authenticated
    using (true);

-- RLS Policy: Users can only update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);

-- RLS Policy: Service role or trigger can insert profiles
create policy "Users or system can insert profiles"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);


-- =============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- Automatically creates a public.profiles entry whenever a user signs up.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- =============================================================================
-- SESSIONS / CLASSROOMS TABLE
-- Stores AI tutoring sessions, shared classrooms, and whiteboard snapshots.
-- =============================================================================
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

-- Enable Row Level Security on sessions
alter table public.sessions enable row level security;

-- RLS Policy: Authenticated users can read sessions
create policy "Sessions are viewable by authenticated users"
    on public.sessions for select
    to authenticated
    using (true);

-- RLS Policy: Hosts can insert and update their sessions
create policy "Users can create sessions"
    on public.sessions for insert
    to authenticated
    with check (auth.uid() = host_id or host_id is null);

create policy "Hosts can update their own sessions"
    on public.sessions for update
    to authenticated
    using (auth.uid() = host_id);


-- =============================================================================
-- LEARNING SPRINTS TABLE
-- Stores multi-day learning goals, milestones, and linked study resources.
-- =============================================================================
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

-- Enable Row Level Security on sprints
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
