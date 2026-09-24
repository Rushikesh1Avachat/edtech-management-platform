import { db } from '@/db';
import { courses, users, categories, modules, lessons, assignments, enrollments, lessonCompletions, lessonProgress } from '@/db/schema';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { eq, asc, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, FileText, CheckCircle2, ArrowLeft, Lock, GraduationCap } from 'lucide-react';
import EnrollButton from './EnrollButton';
import PaymentStatusCard from '@/components/payments/PaymentStatusCard';
import LessonCompletionButton from '@/components/courses/LessonCompletionButton';

export const revalidate = 0;

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ payment_success?: string; payment_cancelled?: string; session_id?: string }>;
}

export default async function CourseDetailPage({ params, searchParams }: CourseDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUserFromCookies();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const paymentSuccess = resolvedSearchParams.payment_success === 'true';
  const paymentCancelled = resolvedSearchParams.payment_cancelled === 'true';
  const sessionId = resolvedSearchParams.session_id || undefined;

  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      level: courses.level,
      status: courses.status,
      price: courses.price,
      thumbnailUrl: courses.thumbnailUrl,
      createdAt: courses.createdAt,
      instructor: {
        id: users.id,
        name: users.name,
        email: users.email,
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
    .where(eq(courses.id, id));

  if (!course) {
    notFound();
  }

  // Fetch modules & lessons
  const courseModules = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, id))
    .orderBy(asc(modules.order));

  const modulesWithLessons = await Promise.all(
    courseModules.map(async (mod) => {
      const modLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.order));
      return { ...mod, lessons: modLessons };
    })
  );

  // Fetch assignments
  const courseAssignments = await db.select().from(assignments).where(eq(assignments.courseId, id));

  // Check existing enrollment
  let isEnrolled = false;
  if (currentUser) {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, currentUser.id), eq(enrollments.courseId, id)));
    if (enrollment) isEnrolled = true;
  }

  if (course.status !== 'PUBLISHED' && (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== course.instructor?.id))) {
    notFound();
  }

  const completedLessonIds = currentUser && isEnrolled
    ? new Set((await db
      .select({ lessonId: lessonCompletions.lessonId })
      .from(lessonCompletions)
      .where(eq(lessonCompletions.studentId, currentUser.id))).map((item) => item.lessonId))
    : new Set<string>();

  // Fetch per-lesson progress statuses for this student & course
  const lessonStatuses: Map<string, string> = new Map();
  if (currentUser && isEnrolled) {
    const lpRows = await db
      .select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(eq(lessonProgress.studentId, currentUser.id), eq(modules.courseId, id)));

    lpRows.forEach((r) => lessonStatuses.set(r.lessonId, r.status));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Course Directory
        </Link>

        {/* Hero Section Banner */}
        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-gray-800 relative overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <PaymentStatusCard
              courseId={id}
              sessionId={sessionId}
              paymentSuccess={paymentSuccess}
              paymentCancelled={paymentCancelled}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                {course.level}
              </span>
              {course.category && (
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                  {course.category.name}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">{course.title}</h1>
            <p className="text-gray-300 text-base leading-relaxed">{course.description}</p>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-sm text-gray-400 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="text-gray-200">{course.instructor?.name || 'Instructor'}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>{modulesWithLessons.length} Modules</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{courseAssignments.length} Assignments</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-6 text-center">
            <div className="text-3xl font-black text-white">
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </div>

            <EnrollButton
              courseId={course.id}
              coursePrice={course.price}
              courseTitle={course.title}
              isEnrolled={isEnrolled}
              isLoggedIn={Boolean(currentUser)}
            />

            <div className="text-xs text-gray-400 space-y-2 text-left pt-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lifetime access to all modules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automated AI assignment grading</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-white">Course Modules & Lessons</h2>

          {modulesWithLessons.length > 0 ? (
            <div className="space-y-4">
              {modulesWithLessons.map((mod, index) => (
                <div key={mod.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg gradient-bg text-xs flex items-center justify-center text-white">
                        {index + 1}
                      </span>
                      {mod.title}
                    </h3>
                    <span className="text-xs text-gray-400">{mod.lessons.length} Lessons</span>
                  </div>
                  {mod.description && <p className="text-xs text-gray-400 pl-8">{mod.description}</p>}

                  <div className="pl-8 space-y-2 pt-2">
                    {mod.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {lesson.isFree || isEnrolled ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-200">{lesson.title}</span>
                          {lesson.isFree && (
                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px]">
                              Free Preview
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{lesson.durationMinutes} mins</span>
                          {isEnrolled && (
                            <LessonCompletionButton
                              lessonId={lesson.id}
                              completed={completedLessonIds.has(lesson.id)}
                              status={lessonStatuses.get(lesson.id) ?? 'NOT_STARTED'}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
              No modules published yet for this course.
            </div>
          )}
        </div>

        {/* Assignments Sidebar */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Course Assignments</h2>
          {courseAssignments.length > 0 ? (
            <div className="space-y-4">
              {courseAssignments.map((assignment) => (
                <div key={assignment.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
                  <h4 className="text-sm font-bold text-white">{assignment.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-3">{assignment.instructions}</p>
                  <div className="flex items-center justify-between pt-2 text-xs text-gray-400 border-t border-gray-800/60">
                    <span>Max Points: {assignment.maxPoints}</span>
                    <Link
                      href={isEnrolled ? '/dashboard' : `/login`}
                      className="text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      {isEnrolled ? 'Submit Assignment →' : 'Enroll to Submit'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
              No assignments published yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
