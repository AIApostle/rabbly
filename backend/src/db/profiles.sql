-- =============================================================================
-- Rabbly Supabase SQL: PROFILES TABLE
-- Handles user and student profiles linked to Supabase auth.users.
-- =============================================================================

-- 1. Table Schema
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

-- 2. Row Level Security
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
    on public.profiles for select
    to authenticated
    using (true);

create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);

create policy "Users or system can insert profiles"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);

-- 3. Automatic Profile Creation Trigger on auth.users
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- =============================================================================
-- Common Profile SQL Queries
-- =============================================================================

-- Select profile by user ID:
-- select * from public.profiles where id = :user_id limit 1;

-- Select profile by email:
-- select * from public.profiles where email = :email limit 1;

-- Upsert profile record:
-- insert into public.profiles (id, email, full_name, preferred_level)
-- values (:id, :email, :full_name, :preferred_level)
-- on conflict (id) do update
-- set full_name = excluded.full_name,
--     preferred_level = excluded.preferred_level,
--     updated_at = timezone('utc'::text, now());

-- Update profile:
-- update public.profiles
-- set full_name = coalesce(:full_name, full_name),
--     bio = coalesce(:bio, bio),
--     avatar_url = coalesce(:avatar_url, avatar_url),
--     preferred_level = coalesce(:preferred_level, preferred_level),
--     updated_at = timezone('utc'::text, now())
-- where id = :user_id;
