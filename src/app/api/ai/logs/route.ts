import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiLogs, users } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const list = await db
      .select({
        id: aiLogs.id,
        userId: aiLogs.userId,
        promptType: aiLogs.promptType,
        promptText: aiLogs.promptText,
        responseContent: aiLogs.responseContent,
        createdAt: aiLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(aiLogs)
      .leftJoin(users, eq(aiLogs.userId, users.id))
      .orderBy(desc(aiLogs.createdAt))
      .limit(20);

    return NextResponse.json({ logs: list });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch AI logs' }, { status: 500 });
  }
}
