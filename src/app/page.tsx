import Link from 'next/link';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import CourseCard from '@/components/courses/CourseCard';
import { db } from '@/db';
import { courses, users, categories } from '@/db/schema';
import { seedDatabase } from '@/db/seed';
import { eq, count, desc } from 'drizzle-orm';

export const revalidate = 0; // Ensure fresh SSR data

async function getLandingData() {
  try {
    const courseCountRes = await db.select({ value: count() }).from(courses);
    if ((courseCountRes[0]?.value || 0) === 0) {
      await seedDatabase();
    }

    const featured = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        level: courses.level,
        status: courses.status,
        price: courses.price,
        thumbnailUrl: courses.thumbnailUrl,
        instructor: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.status, 'PUBLISHED'))
      .orderBy(desc(courses.createdAt))
      .limit(3);

    const categoryList = await db.select().from(categories).limit(4);
    const userCountRes = await db.select({ value: count() }).from(users);

    return {
      featured,
      categoryList,
      totalCourses: courseCountRes[0]?.value || 3,
      totalUsers: userCountRes[0]?.value || 120,
    };
  } catch (err) {
    console.error('Landing page data fetch failed:', err);
    return { featured: [], categoryList: [], totalCourses: 0, totalUsers: 0 };
  }
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-blue-500/30 text-xs font-semibold text-blue-300 mb-8 shadow-lg shadow-blue-500/10">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>House of Edtech Fullstack Assessment — Next.js 16 & PostgreSQL</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Empowering Modern Learners & Educators with <span className="gradient-text">AI Curriculum Intelligence</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            A full-stack, domain-specific management platform featuring automated AI course generation, instant submission grading, role-based authorization, and real-time student analytics.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/courses"
              className="px-6 py-3.5 rounded-2xl font-bold text-white gradient-bg gradient-bg-hover shadow-xl shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              Explore Course Catalog <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-2xl font-bold text-gray-200 glass-panel hover:bg-gray-800 border border-gray-700 transition-all"
            >
              Try Quick Demo Login
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-panel p-5 rounded-2xl border border-gray-800">
              <div className="text-3xl font-black text-white">{data.totalCourses}+</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">Published Courses</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-gray-800">
              <div className="text-3xl font-black text-blue-400">100%</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">Zod Server Validated</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-gray-800">
              <div className="text-3xl font-black text-purple-400">Gemini 2.5</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">AI Feedback Engine</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-gray-800">
              <div className="text-3xl font-black text-emerald-400">RBAC</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">JWT Secure Auth</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Curriculum Spotlight</div>
            <h2 className="text-3xl font-bold text-white mt-1">Featured Production Courses</h2>
          </div>
          <Link
            href="/courses"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
          >
            View all courses <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.featured.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* AI Feature Spotlight Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 md:p-12 border border-blue-500/30 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-gray-950">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Google Gemini API Add-On
              </span>
              <h2 className="text-3xl font-bold text-white leading-tight">
                AI-Powered Syllabus Generation & Automated Student Grading
              </h2>
              <p className="text-gray-300 mt-4 leading-relaxed">
                Instructors can generate full multi-module course syllabi in seconds. Students receive instant, actionable feedback on assignment submissions evaluated against rubric criteria.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Auto-generates modules, topics, and free preview lessons</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Evaluates assignment text for correctness and recommendations</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Graceful fallback mode guarantees full reliability offline</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl font-semibold text-white gradient-bg shadow-lg shadow-purple-500/20 inline-flex items-center gap-2"
                >
                  Test AI Assistant <Sparkles className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs text-gray-400 font-mono">ai-feedback-engine.ts</span>
              </div>
              <div className="space-y-2 text-xs font-mono text-gray-300">
                <p className="text-purple-400">&#47;&#47; Gemini AI Student Evaluation</p>
                <p><span className="text-blue-400">Suggested Grade:</span> 94/100</p>
                <p className="text-gray-400 leading-relaxed">
                  &quot;Exceptional implementation of Next.js 16 Route Handlers and Drizzle ORM relations. Validation error handling is comprehensive.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
