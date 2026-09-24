import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, courses } from '@/db/schema';
import { generateAssignmentAiSchema } from '@/lib/validations';
import { generateAssignmentDraft } from '@/lib/ai';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { logAiUsage } from '@/lib/ai-log';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: AI assignment generation is restricted to Instructors and Admins' }, { status: 403 });
    }

    const body = await req.json();
    const validated = generateAssignmentAiSchema.parse(body);

    const [course] = await db.select().from(courses).where(eq(courses.id, validated.courseId));
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only generate assignments for your own courses' }, { status: 403 });
    }

    const draft = await generateAssignmentDraft(course.title, course.description, course.level);

    const [assignment] = await db
      .insert(assignments)
      .values({
        courseId: course.id,
        title: draft.title,
        instructions: draft.instructions,
        maxPoints: draft.maxPoints,
      })
      .returning();

    await logAiUsage({
      userId: user.id,
      promptType: 'ASSIGNMENT_DRAFT',
      promptText: JSON.stringify({
        courseId: course.id,
        title: course.title,
        description: course.description,
        level: course.level,
      }),
      responseContent: assignment,
    });

    return NextResponse.json({ message: 'AI assignment created successfully', assignment }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'AI assignment generation failed' }, { status: 500 });
  }
}
