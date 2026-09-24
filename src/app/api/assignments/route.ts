import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, courses } from '@/db/schema';
import { assignmentSchema } from '@/lib/validations';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { eq, desc, and } from 'drizzle-orm';

async function canManageCourse(user: { id: string; role: string }, courseId: string) {
  const [course] = await db
    .select({ instructorId: courses.instructorId })
    .from(courses)
    .where(eq(courses.id, courseId));

  if (!course) return { allowed: false, status: 404, error: 'Course not found' };
  if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
    return { allowed: false, status: 403, error: 'Forbidden: You can only manage assignments for your own courses' };
  }
  return { allowed: true, status: 200, error: null };
}

async function canManageAssignment(user: { id: string; role: string }, assignmentId: string) {
  const [assignment] = await db
    .select({
      id: assignments.id,
      instructorId: courses.instructorId,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(eq(assignments.id, assignmentId));

  if (!assignment) {
    return { allowed: false, status: 404, error: 'Assignment not found' };
  }

  if (user.role !== 'ADMIN' && assignment.instructorId !== user.id) {
    return { allowed: false, status: 403, error: 'Forbidden: You can only manage assignments for your own courses' };
  }

  return { allowed: true, status: 200, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    const query = db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        title: assignments.title,
        instructions: assignments.instructions,
        maxPoints: assignments.maxPoints,
        dueDate: assignments.dueDate,
        createdAt: assignments.createdAt,
        courseTitle: courses.title,
      })
      .from(assignments)
      .leftJoin(courses, eq(assignments.courseId, courses.id));

    const filters = [];
    if (courseId) filters.push(eq(assignments.courseId, courseId));
    if (user.role === 'STUDENT') {
      filters.push(eq(courses.status, 'PUBLISHED'));
    } else if (user.role === 'INSTRUCTOR') {
      filters.push(eq(courses.instructorId, user.id));
    }
    if (filters.length > 0) query.where(and(...filters));

    const list = await query.orderBy(desc(assignments.createdAt));
    return NextResponse.json({ assignments: list });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const validated = assignmentSchema.parse(body);
    const coursePermission = await canManageCourse(user, validated.courseId);
    if (!coursePermission.allowed) {
      return NextResponse.json({ error: coursePermission.error }, { status: coursePermission.status });
    }

    const [newAssignment] = await db
      .insert(assignments)
      .values({
        courseId: validated.courseId,
        title: validated.title,
        instructions: validated.instructions,
        maxPoints: validated.maxPoints,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      })
      .returning();

    return NextResponse.json({ message: 'Assignment created successfully', assignment: newAssignment }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const permission = await canManageAssignment(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: permission.status });
    }

    const body = await req.json();
    const validated = assignmentSchema.parse(body);
    const coursePermission = await canManageCourse(user, validated.courseId);
    if (!coursePermission.allowed) {
      return NextResponse.json({ error: coursePermission.error }, { status: coursePermission.status });
    }

    const [updated] = await db
      .update(assignments)
      .set({
        courseId: validated.courseId,
        title: validated.title,
        instructions: validated.instructions,
        maxPoints: validated.maxPoints,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      })
      .where(eq(assignments.id, id))
      .returning();

    return NextResponse.json({ message: 'Assignment updated successfully', assignment: updated });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: unknown; message?: string };
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Assignment update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const permission = await canManageAssignment(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: permission.status });
    }

    await db.delete(assignments).where(eq(assignments.id, id));

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Assignment delete failed' }, { status: 500 });
  }
}
