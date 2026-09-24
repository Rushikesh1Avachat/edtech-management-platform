import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getCurrentUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const [dbUser] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    avatarUrl: users.avatarUrl,
  }).from(users).where(eq(users.id, session.id));

  return NextResponse.json({ user: dbUser || session });
}
