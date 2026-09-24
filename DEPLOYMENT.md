# Space Prompt — Vercel & Production Deployment Checklist

This guide provides step-by-step instructions to deploy Space Prompt to **Vercel** and configure production Supabase Auth.

---

## 1. Push Code to GitHub / Git Repository

Push your complete repository to GitHub or your preferred Git provider.

```bash
git add .
git commit -m "Build: Space Prompt production release"
git push origin main
```

---

## 2. Import Project into Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new) and log in.
2. Select your repository and click **Import**.
3. Select **Next.js** as the Framework Preset.

---

## 3. Configure Environment Variables in Vercel

Under **Environment Variables** in Vercel, add the following production variables:

| Variable Name | Environment | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Your Supabase `anon` `public` key |
| `GEMINI_API_KEY` | Production, Preview, Development | Your Google Gemini API Key (Server-side) |
| `GEMINI_MODEL` | Optional | Default is `gemini-3.6-flash` |
| `GEMINI_THINKING_LEVEL` | Optional | Default is `low` |

---

## 4. Apply Supabase Database Migration

If you have not already executed the migration on your remote Supabase instance:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** &rarr; **New Query**.
3. Copy and execute the contents of `supabase/migrations/20260915_create_prompts_table.sql`.
4. Confirm `public.prompts` table and RLS policies are created.

---

## 5. Configure Supabase Production Auth & OAuth Callbacks

1. In Supabase Dashboard, navigate to **Authentication** &rarr; **URL Configuration**.
2. Set **Site URL** to your production Vercel domain:
   `https://your-production-app.vercel.app`
3. Under **Redirect URLs**, click **Add URL** and add:
   `https://your-production-app.vercel.app/auth/callback`
4. If using **Google OAuth** or **GitHub OAuth**, update your provider app redirect URIs in Google Cloud Console / GitHub Developer Settings to:
   `https://your-supabase-project-id.supabase.co/auth/v1/callback`

---

## 6. Deploy & Smoke Test

1. Click **Deploy** in Vercel.
2. Once the build completes:
   - **Test Authentication**: Sign up and sign in on production domain.
   - **Test Studio Pipeline**: Input an idea &rarr; Analyze &rarr; Clarify &rarr; Context &rarr; Generate Prompts.
   - **Test Evaluation & Refinement**: Evaluate active prompt quality & refine variant.
   - **Test Persistence**: Click **Save**, open `/history` and `/favorites`, and verify prompt persistence.
