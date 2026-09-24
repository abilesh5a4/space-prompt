-- Space Prompt — Prompts Table & Row Level Security Schema Migration

-- 1. Create public prompts table
create table if not exists public.prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  original_input text not null,
  category text not null,
  context jsonb not null,
  balanced_prompt text not null,
  detailed_prompt text not null,
  expert_prompt text not null,
  is_favorite boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create performance indexes
create index if not exists idx_prompts_user_id on public.prompts(user_id);
create index if not exists idx_prompts_user_favorite on public.prompts(user_id, is_favorite);
create index if not exists idx_prompts_created_at on public.prompts(created_at desc);

-- 3. Enable Row Level Security (RLS)
alter table public.prompts enable row level security;

-- 4. RLS Security Policies
create policy "Users can view their own prompts." on public.prompts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own prompts." on public.prompts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own prompts." on public.prompts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own prompts." on public.prompts
  for delete using (auth.uid() = user_id);
