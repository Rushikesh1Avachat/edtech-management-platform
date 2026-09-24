<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# EduTrack AI - EdTech Management Platform

EduTrack AI is a state-of-the-art fullstack role-based Learning Management System (LMS) built with Next.js 16 (App Router), TypeScript, PostgreSQL (via `@electric-sql/pglite` / PostgreSQL), Drizzle ORM, Tailwind CSS v4, and Google Gemini 2.5 Flash AI SDK (`@google/genai`).

## Application Overview
- **Multi-Role Authentication**: Role-based access control supporting `ADMIN`, `INSTRUCTOR`, and `STUDENT` roles via secure HTTP-only JWT cookies.
- **Course & Syllabus Management**: Comprehensive CRUD operations for courses, modules, lessons, and assignments with real-time search, category filtering, and level filtering.
- **AI-Powered Capabilities**:
  - **AI Course Outline Generator**: Generates comprehensive multi-module course syllabi and topics using Google Gemini 2.5 Flash (`@google/genai`).
  - **AI Student Evaluation & Grading**: Automatically evaluates assignment submissions and generates constructive feedback with suggested grades.
- **Interactive Modern UI**: Dark-mode aesthetic featuring glassmorphism, responsive grids, quick demo login buttons, and real-time dashboard updates.

## Technology Stack
- **Framework**: Next.js 16 (App Router with Async Server Components and Route Handlers)
- **Database & ORM**: Drizzle ORM paired with `@electric-sql/pglite` (Embedded PostgreSQL)
- **Authentication**: Custom JWT authentication (`jose`, `bcryptjs`) with middleware protection
- **Validation**: Zod schema validation across client forms and server API routes
- **Styling & UI**: Tailwind CSS v4 with custom glassmorphism design system & Lucide icons

## Key Directory Structure
- `src/app/`: Next.js pages and API route handlers (`/api/auth`, `/api/courses`, `/api/assignments`, `/api/submissions`, `/api/ai`)
- `src/components/`: Reusable client UI components (`Navbar`, `Footer`, `CourseCard`, `CourseFormModal`, `AiCourseGeneratorModal`)
- `src/db/`: Database configuration (`index.ts`), Drizzle schema (`schema.ts`), and seed script (`seed.ts`)
- `src/lib/`: Core helpers for authentication (`auth.ts`), Gemini AI SDK (`ai.ts`), and Zod schemas (`validations.ts`)

## Essential CLI Commands
- `npm run dev`: Launch local development server
- `npm run build`: Compile Next.js production build
- `npx tsc --noEmit`: Perform TypeScript type checking
- `npm run lint`: Execute ESLint checks across codebase
- `npm run db:seed`: Seed database with demo data
