import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, assignments, users } from '@/db/schema';
import { submissionSchema, gradeSubmissionSchema } from '@/lib/validations';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { generateAssignmentFeedback } from '@/lib/ai';
import { logAiUsage } from '@/lib/ai-log';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    const query = db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        studentId: submissions.studentId,
        content: submissions.content,
        grade: submissions.grade,
        aiFeedback: submissions.aiFeedback,
        submittedAt: submissions.submittedAt,
        gradedAt: submissions.gradedAt,
        studentName: users.name,
        studentEmail: users.email,
        assignmentTitle: assignments.title,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.studentId, users.id))
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id));

    if (user.role === 'STUDENT') {
      query.where(eq(submissions.studentId, user.id));
    } else if (assignmentId) {
      query.where(eq(submissions.assignmentId, assignmentId));
    }

    const list = await query.orderBy(desc(submissions.submittedAt));
    return NextResponse.json({ submissions: list });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to submit assignments' }, { status: 401 });
    }

    const body = await req.json();
    const validated = submissionSchema.parse(body);

    // Fetch assignment details for AI grading assistance
    const [targetAssignment] = await db.select().from(assignments).where(eq(assignments.id, validated.assignmentId));
    
    // Auto-generate AI Feedback upon student submission
    let aiFeedback = '';
    let autoGrade: number | null = null;

    if (targetAssignment) {
      try {
        const aiResult = await generateAssignmentFeedback(
          targetAssignment.title,
          targetAssignment.instructions,
          validated.content
        );
        aiFeedback = aiResult.feedbackText;
        autoGrade = aiResult.suggestedGrade;
        await logAiUsage({
          userId: user.id,
          promptType: 'ASSIGNMENT_FEEDBACK',
          promptText: JSON.stringify({
            assignmentTitle: targetAssignment.title,
            instructions: targetAssignment.instructions,
            submissionContent: validated.content,
          }),
          responseContent: aiResult,
        });
      } catch (aiErr) {
        console.warn('AI feedback generation failed gracefully:', aiErr);
      }
    }

    const [newSubmission] = await db
      .insert(submissions)
      .values({
        assignmentId: validated.assignmentId,
        studentId: user.id,
        content: validated.content,
        grade: autoGrade,
        aiFeedback,
        gradedAt: autoGrade ? new Date() : null,
      })
      .returning();

    return NextResponse.json({ message: 'Assignment submitted successfully!', submission: newSubmission }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const validated = gradeSubmissionSchema.parse(body);

    const [updated] = await db
      .update(submissions)
      .set({
        grade: validated.grade,
        aiFeedback: validated.aiFeedback || undefined,
        gradedAt: new Date(),
      })
      .where(eq(submissions.id, id))
      .returning();

    return NextResponse.json({ message: 'Submission graded successfully', submission: updated });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Grading failed' }, { status: 500 });
  }
}
