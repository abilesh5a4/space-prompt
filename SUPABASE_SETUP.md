# Space Prompt — Supabase Setup Guide

This guide provides step-by-step instructions to configure **Supabase Auth** (Email/Password, Google OAuth, and GitHub OAuth) for Space Prompt.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create an account.
2. Click **New Project**.
3. Select your Organization, enter a project **Name** (e.g. `space-prompt`), set a secure **Database Password**, and select a region close to your users.
4. Click **Create new project** and wait a moment for initialization.

---

## 2. Obtain Supabase API Credentials

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon at the bottom of the left sidebar).
2. Click on **API** in the settings menu.
3. Locate the following two credentials:
   - **Project URL**: Found under `Project URL` (e.g., `https://xyzcompany.supabase.co`).
   - **Project API Keys**: Copy the key labeled `anon` `public` (this is safe for frontend client usage).

---

## 3. Configure Local Environment Variables

1. In the root of your `spaceprompt` project, create a file named `.env.local` (this file is ignored by Git).
2. Add your credentials using the following format:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Configure Authentication Redirect URLs in Supabase

1. In the Supabase Dashboard, go to **Authentication** &rarr; **URL Configuration**.
2. Set **Site URL** to:
   `http://localhost:3000`
3. Under **Redirect URLs**, click **Add URL** and add the following callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.vercel.app/auth/callback` (when deploying)
4. Save your changes.

---

## 5. Enable Email & Password Authentication

1. Navigate to **Authentication** &rarr; **Providers** in your Supabase Dashboard.
2. Click on **Email**.
3. Toggle **Enable Email provider** to `ON`.
4. (Optional for development) Toggle **Confirm email** `OFF` if you want users to sign in immediately without clicking an email verification link during testing.
5. Click **Save**.

---

## 6. Configure Google OAuth Provider

### Step A: Create OAuth Credentials in Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. Go to **APIs & Services** &rarr; **OAuth consent screen**. Set user type to **External** and complete the app details.
4. Go to **APIs & Services** &rarr; **Credentials**.
5. Click **Create Credentials** &rarr; **OAuth client ID**.
6. Select **Web application** as the application type.
7. Under **Authorized redirect URIs**, click **ADD URI** and enter your Supabase Auth callback URL:
   `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
8. Click **Create** and copy the generated **Client ID** and **Client Secret**.

### Step B: Enable Google in Supabase
1. In your Supabase Dashboard, go to **Authentication** &rarr; **Providers** &rarr; **Google**.
2. Toggle **Enable Google provider** to `ON`.
3. Paste the **Client ID** and **Client Secret** obtained from Google.
4. Click **Save**.

---

## 7. Configure GitHub OAuth Provider

### Step A: Create an OAuth App in GitHub
1. Sign in to GitHub and go to **Settings** &rarr; **Developer Settings** &rarr; **OAuth Apps**.
2. Click **New OAuth App**.
3. Fill in the details:
   - **Application name**: `Space Prompt`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
4. Click **Register application**.
5. Copy the **Client ID** and generate a new **Client Secret**.

### Step B: Enable GitHub in Supabase
1. In your Supabase Dashboard, go to **Authentication** &rarr; **Providers** &rarr; **GitHub**.
2. Toggle **Enable GitHub provider** to `ON`.
3. Paste the **Client ID** and **Client Secret** obtained from GitHub.
4. Click **Save**.

---

## 8. Optional Database Profiles Table Setup

If you wish to store custom user profiles in PostgreSQL, execute the following SQL inside the **Supabase SQL Editor**:

```sql
-- Create a public profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create secure policies
create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create automatic profile creation trigger on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

---

## 10. Database Prompts Table Setup (Phase 12+)

To enable persistence for saved prompts, history, and favorites, run the following SQL script in your **Supabase SQL Editor**:

```sql
-- Create public prompts table
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

-- Performance indexes
create index if not exists idx_prompts_user_id on public.prompts(user_id);
create index if not exists idx_prompts_user_favorite on public.prompts(user_id, is_favorite);
create index if not exists idx_prompts_created_at on public.prompts(created_at desc);

-- Enable RLS
alter table public.prompts enable row level security;

-- RLS Security Policies
create policy "Users can view their own prompts." on public.prompts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own prompts." on public.prompts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own prompts." on public.prompts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own prompts." on public.prompts
  for delete using (auth.uid() = user_id);
```

---

## 11. Testing Auth & Persistence Locally

1. Start your local dev server: `npm run dev`
2. Open `http://localhost:3000/signup` and create a new account.
3. Open `http://localhost:3000/login` and test sign in.
4. Verify redirection to `/dashboard`.
5. Run a prompt generation session in `/studio` and click **Save**.
6. Verify prompt appears in `/history` and `/dashboard`.

