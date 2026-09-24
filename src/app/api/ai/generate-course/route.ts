import { NextRequest, NextResponse } from 'next/server';
import { generateCourseAiSchema } from '@/lib/validations';
import { generateCourseOutline } from '@/lib/ai';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { logAiUsage } from '@/lib/ai-log';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: AI course generation is restricted to Instructors and Admins' }, { status: 403 });
    }

    const body = await req.json();
    const validated = generateCourseAiSchema.parse(body);

    const outline = await generateCourseOutline(validated.topic, validated.level, validated.numModules);

    await logAiUsage({
      userId: user.id,
      promptType: 'COURSE_OUTLINE',
      promptText: JSON.stringify(validated),
      responseContent: outline,
    });

    return NextResponse.json({ outline });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'AI generation failed' }, { status: 500 });
  }
}
