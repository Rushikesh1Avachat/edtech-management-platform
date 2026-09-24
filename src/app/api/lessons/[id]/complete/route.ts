import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courses, enrollments, lessonCompletions, lessons, modules, lessonProgress } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { and, count, eq } from 'drizzle-orm';

// Supports marking a lesson as completed (POST) or updating progress status (POST with { status })
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only enrolled students can update lessons' }, { status: 403 });
    }

    const { id: lessonId } = await params;

    const body = await req.json().catch(() => ({}));
    const requestedStatus = body.status ? String(body.status).toUpperCase() : 'COMPLETED';
    const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    if (!allowed.includes(requestedStatus)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` }, { status: 400 });
    }

    const [lesson] = await db
      .select({ lessonId: lessons.id, courseId: courses.id })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(eq(lessons.id, lessonId));

    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, lesson.courseId)));

    if (!enrollment) return NextResponse.json({ error: 'Enroll in this course first' }, { status: 403 });

    // Upsert lesson progress record
    try {
      await db
        .insert(lessonProgress)
        .values({ studentId: user.id, lessonId, status: requestedStatus, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [lessonProgress.studentId, lessonProgress.lessonId], set: { status: requestedStatus, updatedAt: new Date() } });
    } catch (upsertErr) {
      // fallback: attempt update then insert
      try {
        await db.update(lessonProgress).set({ status: requestedStatus, updatedAt: new Date() }).where(and(eq(lessonProgress.studentId, user.id), eq(lessonProgress.lessonId, lessonId)));
      } catch (e) {
        await db.insert(lessonProgress).values({ studentId: user.id, lessonId, status: requestedStatus, updatedAt: new Date() }).onConflictDoNothing();
      }
    }

    if (requestedStatus === 'COMPLETED') {
      // Upsert a completion record and set completedAt to now
      try {
        await db.insert(lessonCompletions)
          .values({ studentId: user.id, lessonId, completedAt: new Date() })
          .onConflictDoUpdate({ target: [lessonCompletions.studentId, lessonCompletions.lessonId], set: { completedAt: new Date() } });
      } catch (e) {
        // fallback: try update then insert
        try {
          await db.update(lessonCompletions).set({ completedAt: new Date() }).where(and(eq(lessonCompletions.studentId, user.id), eq(lessonCompletions.lessonId, lessonId)));
        } catch (u) {
          await db.insert(lessonCompletions).values({ studentId: user.id, lessonId, completedAt: new Date() }).onConflictDoNothing();
        }
      }

      const [{ totalLessons }] = await db
        .select({ totalLessons: count() })
        .from(lessons)
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(modules.courseId, lesson.courseId));

      const [{ completedLessons }] = await db
        .select({ completedLessons: count() })
        .from(lessonCompletions)
        .innerJoin(lessons, eq(lessonCompletions.lessonId, lessons.id))
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(and(eq(lessonCompletions.studentId, user.id), eq(modules.courseId, lesson.courseId)));

      const progress = totalLessons > 0 ? Math.min(100, Math.round((Number(completedLessons) / Number(totalLessons)) * 100)) : 0;

      await db.update(enrollments).set({
        progress,
        completedAt: progress === 100 ? new Date() : null,
      }).where(eq(enrollments.id, enrollment.id));

      return NextResponse.json({ message: 'Lesson progress updated', status: requestedStatus, progress });
    }

    return NextResponse.json({ message: 'Lesson progress updated', status: requestedStatus });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Could not update lesson progress' }, { status: 500 });
  }
}
