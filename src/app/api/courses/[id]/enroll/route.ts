import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enrollments, courses, lessons, modules, lessonProgress, lessonCompletions } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to enroll' }, { status: 401 });
    }

    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Only allow direct enrollment for free courses
    if (existingCourse.price > 0) {
      return NextResponse.json({
        error: 'This is a paid course. Please use the Stripe checkout to enroll.',
        requiresPayment: true,
      }, { status: 402 });
    }

    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)));

    if (existingEnrollment) {
      return NextResponse.json({ message: 'Already enrolled in this course', enrollment: existingEnrollment });
    }

    const [newEnrollment] = await db
      .insert(enrollments)
      .values({
        studentId: user.id,
        courseId,
        progress: 0,
        paymentStatus: 'FREE',
      })
      .returning();

    const lessonRows = await db
      .select({ lessonId: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(eq(modules.courseId, courseId));

    if (lessonRows.length > 0) {
      const progressValues = lessonRows.map((row) => ({
        studentId: user.id,
        lessonId: row.lessonId,
        status: 'NOT_STARTED',
        updatedAt: new Date(),
      }));

      try {
        await db.insert(lessonProgress).values(progressValues).onConflictDoNothing();
      } catch (insertErr) {
        console.warn('lessonProgress insert warning:', insertErr);
      }

      // Also insert placeholder lesson completion rows (completedAt = null)
      try {
        await db.insert(lessonCompletions).values(
          lessonRows.map((row) => ({ studentId: user.id, lessonId: row.lessonId, completedAt: null }))
        ).onConflictDoNothing();
      } catch (insertErr) {
        console.warn('lessonCompletions insert warning:', insertErr);
      }
    }

    return NextResponse.json({ message: 'Successfully enrolled in course!', enrollment: newEnrollment }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Enrollment failed' }, { status: 500 });
  }
}
