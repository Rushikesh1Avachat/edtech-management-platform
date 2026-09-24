import { NextRequest, NextResponse } from 'next/server';
import { generateFeedbackAiSchema } from '@/lib/validations';
import { generateAssignmentFeedback } from '@/lib/ai';
import { getCurrentUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const validated = generateFeedbackAiSchema.parse(body);

    const result = await generateAssignmentFeedback(
      validated.assignmentTitle,
      validated.instructions,
      validated.submissionContent
    );

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'AI feedback generation failed' }, { status: 500 });
  }
}
