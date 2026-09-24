# CLAUDE.md - EduTrack AI Project Guide

EduTrack AI is a fullstack role-based EdTech management platform built for course creation, enrollment, assignment submissions, and AI-assisted curriculum generation & student grading.

## Project Information & Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript 5
- **Database & ORM**: Drizzle ORM with `@electric-sql/pglite` (Embedded PostgreSQL)
- **AI Integration**: `@google/genai` (Google Gemini 2.5 Flash SDK)
- **Styling & Icons**: Tailwind CSS v4, Glassmorphism UI, Lucide React Icons
- **Authentication**: JWT in HTTP-Only Cookies (`jose`, `bcryptjs`)
- **Validation**: Zod Schema Validation

## Command Guide
- **Development**: `npm run dev`
- **Production Build**: `npm run build`
- **Type Checking**: `npx tsc --noEmit`
- **Linting**: `npm run lint`
- **Seed Database**: `npm run db:seed`

## Architecture Highlights
1. **Database Schema (`src/db/schema.ts`)**:
   - `users`: User profiles with roles (`ADMIN`, `INSTRUCTOR`, `STUDENT`).
   - `categories`: Course categories (Web Dev, AI & Data Science, Cloud Infrastructure).
   - `courses`: Courses with instructor, category, price, level, status, and thumbnails.
   - `modules` & `lessons`: Hierarchical module syllabus and lesson content.
   - `enrollments`: Student course enrollment tracking.
   - `assignments` & `submissions`: Course assignments and student submission evaluations.
   - `aiLogs`: Audit logging for Gemini AI generation prompts.

2. **API Handlers (`src/app/api/`)**:
   - `/api/auth/*`: Authentication handlers (login, register, me, logout).
   - `/api/courses` & `/api/courses/[id]`: Course CRUD endpoints with filtering & pagination.
   - `/api/courses/[id]/enroll`: Student course enrollment API.
   - `/api/assignments`: Assignment creation and querying.
   - `/api/submissions`: Assignment submission and instructor grading handler.
   - `/api/ai/generate-course`: AI course syllabus generator endpoint.
   - `/api/ai/grade-submission`: AI submission evaluation endpoint.

3. **Development Guidelines**:
   - Maintain strict TypeScript type safety (no `: any` usages).
   - Enforce Zod validation on incoming request payloads and API inputs.
   - Use clean, modular components with dark mode glassmorphism UI styling.
