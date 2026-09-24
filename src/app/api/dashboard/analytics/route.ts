import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, courses, enrollments, submissions } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { and, avg, count, eq, inArray, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ownedCourseIds = user.role === 'ADMIN'
      ? (await db.select({ id: courses.id }).from(courses)).map((course) => course.id)
      : (await db.select({ id: courses.id }).from(courses).where(eq(courses.instructorId, user.id))).map((course) => course.id);

    if (ownedCourseIds.length === 0) {
      return NextResponse.json({ courses: 0, enrollments: 0, completionRate: 0, averageGrade: 0, pendingSubmissions: 0 });
    }

    const [{ courseCount }] = await db.select({ courseCount: count() }).from(courses).where(inArray(courses.id, ownedCourseIds));
    const [{ enrollmentCount }] = await db.select({ enrollmentCount: count() }).from(enrollments).where(inArray(enrollments.courseId, ownedCourseIds));
    const [{ averageGrade }] = await db
      .select({ averageGrade: avg(submissions.grade) })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(inArray(assignments.courseId, ownedCourseIds));
    const [{ pendingSubmissions }] = await db
      .select({ pendingSubmissions: count() })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(inArray(assignments.courseId, ownedCourseIds), isNull(submissions.grade)));
    const [{ completedEnrollments }] = await db
      .select({ completedEnrollments: count() })
      .from(enrollments)
      .where(and(inArray(enrollments.courseId, ownedCourseIds), eq(enrollments.progress, 100)));

    return NextResponse.json({
      courses: Number(courseCount),
      enrollments: Number(enrollmentCount),
      completionRate: enrollmentCount ? Math.round((Number(completedEnrollments) / Number(enrollmentCount)) * 100) : 0,
      averageGrade: averageGrade ? Math.round(Number(averageGrade)) : 0,
      pendingSubmissions: Number(pendingSubmissions),
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
