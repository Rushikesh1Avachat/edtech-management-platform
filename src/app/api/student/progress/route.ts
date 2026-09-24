import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courses, enrollments, lessonCompletions, lessons, modules } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { and, eq, count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentEnrollments = await db
      .select({
        courseId: enrollments.courseId,
        courseTitle: courses.title,
        progress: enrollments.progress,
        completedAt: enrollments.completedAt,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.studentId, user.id));

    const formattedCourses = await Promise.all(studentEnrollments.map(async (item) => {
      const [{ totalLessons }] = await db
        .select({ totalLessons: count() })
        .from(lessons)
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(modules.courseId, item.courseId));

      const [{ completedLessons }] = await db
        .select({ completedLessons: count() })
        .from(lessonCompletions)
        .innerJoin(lessons, eq(lessonCompletions.lessonId, lessons.id))
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(and(eq(lessonCompletions.studentId, user.id), eq(modules.courseId, item.courseId)));

      return {
        courseId: item.courseId,
        courseTitle: item.courseTitle,
        progress: item.progress,
        completedLessons: Number(completedLessons || 0),
        totalLessons: Number(totalLessons || 0),
        completedAt: item.completedAt ? new Date(item.completedAt).toISOString() : null,
      };
    }));

    return NextResponse.json({ courses: formattedCourses }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Could not load student progress' }, { status: 500 });
  }
}
