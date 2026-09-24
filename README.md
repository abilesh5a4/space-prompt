# Space Prompt

Turn ideas into better prompts.

Space Prompt is an intelligent conversational prompt-building application that turns rough ideas into optimized AI prompts through intent analysis and guided clarification.

---

## Features

- **Conversational Prompt Building**: Guided interactive flow from initial idea to optimized meta-prompt.
- **Smart Clarification**: Asks targeted questions with options and "Let AI Recommend" choices.
- **Multi-Variant Generation**: Produces **Balanced**, **Detailed**, and **Expert** prompt variants.
- **Prompt Quality Evaluator**: Scores prompts across 6 objective quality dimensions with actionable suggestions.
- **Prompt Refinement**: Targeted refinement modes to adjust tone, length, constraints, or custom instructions.
- **Voice Input**: Web Speech API integration for direct dictation.
- **Authentication**: Google OAuth and email sign-in powered by Supabase.
- **Prompt History**: Saved prompts, search, favorites, and detail management.
- **Groq AI Provider**: High-speed AI inference using Groq `openai/gpt-oss-120b` with strict JSON Schema output.
- **Resilient Fallback**: Automatic single-attempt fallback to Google Gemini on transient provider errors.

---

## Tech Stack

- **Framework**: [Next.js 16 App Router](https://nextjs.org) (TypeScript, React 19)
- **Styling**: Tailwind CSS & Lucide Icons
- **Database & Auth**: [Supabase](https://supabase.com) (SSR Auth, PostgreSQL, RLS)
- **AI Engines**: [Groq](https://groq.com) (Primary: `openai/gpt-oss-120b`) & [Google Gemini](https://ai.google.dev) (Fallback)
- **Validation**: Zod & Strict OpenAPI Response Schemas

---

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here

AI_PROVIDER=groq
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

---

## Author

**Abhilesh**  
GitHub: [https://github.com/abilesh5a4](https://github.com/abilesh5a4)
