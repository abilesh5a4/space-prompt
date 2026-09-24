import {
  Blocks,
  Bug,
  Code2,
  Cpu,
  Database,
  FileSearch,
  FileStack,
  FileText,
  GraduationCap,
  ImagePlus,
  Layers,
  Lightbulb,
  LineChart,
  Megaphone,
  MessagesSquare,
  Microscope,
  NotebookPen,
  Palette,
  Presentation,
  Share2,
  Target,
  Workflow,
} from 'lucide-react';
import type { Template } from '@/types';

/**
 * Starter templates.
 *
 * IMPORTANT: `starterText` is an opening phrase, not a finished prompt. Space
 * Prompt still needs to understand and clarify the user's real requirement, so
 * a template only removes the blank-page problem — it never assumes the answer.
 */
export const templates: Template[] = [
  // Coding & Development
  {
    id: 'build-application',
    name: 'Build an Application',
    description: 'Plan and structure a complete software project.',
    category: 'Coding',
    icon: Blocks,
    starterText: 'Help me plan and build an application for ',
    tags: ['Architecture', 'Full-stack', 'App'],
    featured: true,
  },
  {
    id: 'debug-code',
    name: 'Debug My Code',
    description: 'Track down what is breaking, and why.',
    category: 'Coding',
    icon: Bug,
    starterText: 'I need help debugging the following issue in ',
    tags: ['Debugging', 'Refactoring', 'Errors'],
  },
  {
    id: 'api-design',
    name: 'API Design & Contract',
    description: 'Design REST or GraphQL endpoints with validation and error specs.',
    category: 'Coding',
    icon: Code2,
    starterText: 'Design a clean, RESTful API structure for ',
    tags: ['API', 'REST', 'Backend'],
  },
  {
    id: 'database-schema',
    name: 'Database Schema & RLS',
    description: 'Architect relational SQL schemas with security policies and indexes.',
    category: 'Coding',
    icon: Database,
    starterText: 'Help me design a database schema and security policy for ',
    tags: ['SQL', 'Supabase', 'Database'],
  },

  // AI Projects
  {
    id: 'ai-ml-project-planner',
    name: 'AI/ML Project Planner',
    description: 'Define problem, dataset requirements, model architecture, and deployment.',
    category: 'Business',
    icon: Cpu,
    starterText: 'I want to build an AI/ML project about ',
    tags: ['AI', 'LLM', 'Machine Learning'],
    featured: true,
  },

  // Study & Learning
  {
    id: 'explain-topic',
    name: 'Explain a Topic',
    description: 'Break a difficult concept into clear pieces.',
    category: 'Study',
    icon: Lightbulb,
    starterText: 'Explain the following topic clearly with examples: ',
    tags: ['Learning', 'Concept', 'Simplification'],
  },
  {
    id: 'exam-preparation',
    name: 'Exam Preparation',
    description: 'Build a focused revision plan and practice testing schedule.',
    category: 'Study',
    icon: GraduationCap,
    starterText: 'Help me prepare for an upcoming exam on ',
    tags: ['Exams', 'Study Plan', 'Revision'],
  },

  // Research
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Make sense of findings, papers and source material.',
    category: 'Research',
    icon: Microscope,
    starterText: 'Help me analyze and synthesize research about ',
    tags: ['Analysis', 'Sources', 'Synthesis'],
  },
  {
    id: 'compare-research-papers',
    name: 'Research Paper Comparison',
    description: 'Line up several papers and compare methodology and findings.',
    category: 'Research',
    icon: FileStack,
    starterText: 'Help me compare multiple research papers on ',
    tags: ['Literature', 'Academic', 'Comparison'],
  },
  {
    id: 'literature-review',
    name: 'Literature Review Synthesizer',
    description: 'Extract core themes, gaps, and insights from a domain.',
    category: 'Research',
    icon: FileSearch,
    starterText: 'Help me structure a literature review on ',
    tags: ['Review', 'Academic', 'Gaps'],
  },

  // Career
  {
    id: 'resume-improvement',
    name: 'Resume Improvement',
    description: 'Sharpen your resume for a specific role and highlight achievements.',
    category: 'Career',
    icon: FileText,
    starterText: 'Help me improve my resume for ',
    tags: ['Resume', 'Job Search', 'Career'],
    featured: true,
  },
  {
    id: 'interview-preparation',
    name: 'Interview Preparation',
    description: 'Rehearse targeted behavioral and technical questions.',
    category: 'Career',
    icon: MessagesSquare,
    starterText: 'Prepare me for an upcoming interview for ',
    tags: ['Interview', 'Roleplay', 'Career'],
  },

  // Writing
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Write articles, blog posts, or guides that engage readers.',
    category: 'Writing',
    icon: NotebookPen,
    starterText: 'Help me write an engaging article about ',
    tags: ['Writing', 'Blog', 'Articles'],
  },
  {
    id: 'linkedin-post',
    name: 'LinkedIn Thought Leadership',
    description: 'Draft impactful professional posts with strong hooks.',
    category: 'Writing',
    icon: Share2,
    starterText: 'Help me write a compelling LinkedIn post about ',
    tags: ['LinkedIn', 'Social', 'Personal Brand'],
  },

  // Design & Image Gen
  {
    id: 'image-prompt-builder',
    name: 'Image Prompt Builder',
    description: 'Describe a visual precisely with lighting, camera angle, and artistic style.',
    category: 'Design',
    icon: ImagePlus,
    starterText: 'Help me create an image generation prompt for ',
    tags: ['Midjourney', 'DALL-E', 'Visuals'],
    featured: true,
  },
  {
    id: 'ui-art-director',
    name: 'UI/UX Art Direction',
    description: 'Define design system tokens, color palettes, typography, and layout rules.',
    category: 'Design',
    icon: Palette,
    starterText: 'Help me establish a visual design system for ',
    tags: ['Design System', 'UI/UX', 'Aesthetics'],
  },

  // Business & Product
  {
    id: 'business-planner',
    name: 'Business Planner',
    description: 'Think through value proposition, target market, revenue model, and strategy.',
    category: 'Business',
    icon: Target,
    starterText: 'Help me create a business plan for ',
    tags: ['Strategy', 'Startup', 'Planning'],
    featured: true,
  },
  {
    id: 'presentation-builder',
    name: 'Presentation Builder',
    description: 'Shape a slide deck with clear story arc, narrative flow, and slide outlines.',
    category: 'Business',
    icon: Presentation,
    starterText: 'Help me outline a presentation deck about ',
    tags: ['Pitch', 'Slides', 'Presentation'],
  },
  {
    id: 'prd-builder',
    name: 'Product Requirements (PRD)',
    description: 'Draft explicit product requirements, user stories, and acceptance criteria.',
    category: 'Business',
    icon: Layers,
    starterText: 'Help me write a Product Requirements Document (PRD) for ',
    tags: ['PRD', 'Product Management', 'Specs'],
  },

  // Marketing & Data
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign Plan',
    description: 'Outline positioning, messaging pillars, channels, and launch milestones.',
    category: 'Business',
    icon: Megaphone,
    starterText: 'Help me plan a marketing campaign for ',
    tags: ['Marketing', 'Launch', 'Campaign'],
  },
  {
    id: 'data-analysis-plan',
    name: 'Data Analysis & Insights',
    description: 'Formulate hypotheses, metrics, analysis frameworks, and visualization goals.',
    category: 'Research',
    icon: LineChart,
    starterText: 'Help me structure a data analysis plan for ',
    tags: ['Data', 'Metrics', 'Analytics'],
  },

  // Automation
  {
    id: 'automation-workflow',
    name: 'Automation Workflow',
    description: 'Map triggers, conditions, tools, and scripts for workflow automation.',
    category: 'Coding',
    icon: Workflow,
    starterText: 'Help me design an automated workflow for ',
    tags: ['Automation', 'Zapier', 'Scripts'],
  },
];

/** Resolves a `?template=` value to a known template, or null if unrecognised. */
export function findTemplate(id: string | undefined): Template | null {
  if (!id) return null;
  return templates.find((template) => template.id === id) ?? null;
}

