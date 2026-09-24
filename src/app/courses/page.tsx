import CourseCard, { CourseData } from '@/components/courses/CourseCard';
import CourseFilters from '@/components/courses/CourseFilters';
import { db } from '@/db';
import { courses, users, categories } from '@/db/schema';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { seedDatabase } from '@/db/seed';
import { eq, ilike, or, and, count, desc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';

export const revalidate = 0;

interface CoursesPageProps {
  searchParams: Promise<{
    search?: string;
    level?: string;
    categoryId?: string;
    page?: string;
  }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || '';
  const level = resolvedSearchParams.level || '';
  const categoryId = resolvedSearchParams.categoryId || '';
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const limit = 6;
  const offset = (page - 1) * limit;

  const currentUser = await getCurrentUserFromCookies();

  // Auto-seed if empty
  const courseCountRes = await db.select({ value: count() }).from(courses);
  if ((courseCountRes[0]?.value || 0) === 0) {
    await seedDatabase();
  }

  const categoryList = await db.select().from(categories);

  const conditions = [eq(courses.status, 'PUBLISHED')];

  if (search) {
    conditions.push(or(ilike(courses.title, `%${search}%`), ilike(courses.description, `%${search}%`))!);
  }

  if (level && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
    conditions.push(eq(courses.level, level as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'));
  }

  if (categoryId) {
    conditions.push(eq(courses.categoryId, categoryId));
  }

  const whereClause = and(...conditions);

  const courseList = await db
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
    .where(whereClause)
    .orderBy(desc(courses.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRes = await db.select({ value: count() }).from(courses).where(whereClause);
  const total = totalRes[0]?.value || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Course Directory</h1>
        <p className="text-gray-400 text-sm mt-1">
          Explore production-grade courses with hands-on modules, assignments, and AI tutor feedback.
        </p>
      </div>

      <CourseFilters categories={categoryList} />

      {courseList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseList.map((course) => (
            <CourseCard
              key={course.id}
              course={course as CourseData}
              currentUserId={currentUser?.id}
              currentUserRole={currentUser?.role}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center border border-gray-800 space-y-3">
          <BookOpen className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No courses match your filter criteria</h3>
          <p className="text-sm text-gray-400">Try adjusting your search query or removing category/level filters.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-800">
          <div className="text-xs text-gray-400">
            Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span> ({total} courses)
          </div>

          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/courses?page=${page - 1}${search ? `&search=${search}` : ''}${level ? `&level=${level}` : ''}${
                  categoryId ? `&categoryId=${categoryId}` : ''
                }`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-gray-300 hover:text-white border border-gray-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </Link>
            ) : (
              <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900/40 text-gray-600 border border-gray-800/50 cursor-not-allowed flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={`/courses?page=${page + 1}${search ? `&search=${search}` : ''}${level ? `&level=${level}` : ''}${
                  categoryId ? `&categoryId=${categoryId}` : ''
                }`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold gradient-bg text-white shadow-md flex items-center gap-1"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900/40 text-gray-600 border border-gray-800/50 cursor-not-allowed flex items-center gap-1">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
