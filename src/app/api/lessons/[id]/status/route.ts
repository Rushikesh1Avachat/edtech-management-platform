import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonProgress, lessonCompletions } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: lessonId } = await params;

    const [lp] = await db
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.studentId, user.id), eq(lessonProgress.lessonId, lessonId)));

    const [lc] = await db
      .select({ completedAt: lessonCompletions.completedAt })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.studentId, user.id), eq(lessonCompletions.lessonId, lessonId)));

    return NextResponse.json({ status: lp?.status ?? 'NOT_STARTED', completed: Boolean(lc && lc.completedAt) });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Could not get lesson status' }, { status: 500 });
  }
}
