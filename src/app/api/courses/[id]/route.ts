import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courses, users, categories, modules, lessons, assignments } from '@/db/schema';
import { courseSchema } from '@/lib/validations';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [course] = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        level: courses.level,
        status: courses.status,
        price: courses.price,
        thumbnailUrl: courses.thumbnailUrl,
        instructorId: courses.instructorId,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        instructor: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.id, id));

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch modules and lessons
    const courseModules = await db.select().from(modules).where(eq(modules.courseId, id)).orderBy(asc(modules.order));
    
    const modulesWithLessons = await Promise.all(
      courseModules.map(async (mod) => {
        const modLessons = await db.select().from(lessons).where(eq(lessons.moduleId, mod.id)).orderBy(asc(lessons.order));
        return { ...mod, lessons: modLessons };
      })
    );

    // Fetch assignments
    const courseAssignments = await db.select().from(assignments).where(eq(assignments.courseId, id));

    return NextResponse.json({
      course: {
        ...course,
        modules: modulesWithLessons,
        assignments: courseAssignments,
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [existing] = await db.select().from(courses).where(eq(courses.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && existing.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this course' }, { status: 403 });
    }

    const body = await req.json();
    const validated = courseSchema.parse(body);

    const [updated] = await db.update(courses).set({
      title: validated.title,
      description: validated.description,
      categoryId: validated.categoryId || null,
      level: validated.level,
      status: validated.status,
      price: validated.price,
      thumbnailUrl: validated.thumbnailUrl || existing.thumbnailUrl,
      updatedAt: new Date(),
    }).where(eq(courses.id, id)).returning();

    return NextResponse.json({ message: 'Course updated successfully', course: updated });
  } catch (err: unknown) {
    const error = err as { name?: string; errors?: { message?: string; path?: (string | number)[] }[]; message?: string };
    if (error.name === 'ZodError') {
      const details = error.errors || [];
      const firstMsg = details[0]?.message ? `${details[0].path?.join('.') ? details[0].path.join('.') + ': ' : ''}${details[0].message}` : 'Validation failed';
      return NextResponse.json({ error: `Validation failed: ${firstMsg}`, details }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [existing] = await db.select().from(courses).where(eq(courses.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && existing.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You cannot delete this course' }, { status: 403 });
    }

    await db.delete(courses).where(eq(courses.id, id));

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to delete course' }, { status: 500 });
  }
}
