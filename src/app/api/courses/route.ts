import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, courses, users, categories, modules, lessons } from '@/db/schema';
import { courseSchema } from '@/lib/validations';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { seedDatabase } from '@/db/seed';
import { eq, ilike, or, and, count, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);
    const offset = (page - 1) * limit;
    const currentUser = await getCurrentUserFromRequest(req);

    // Auto-seed if database is empty to ensure immediate rich user demo experience
    const existingCoursesCount = await db.select({ value: count() }).from(courses);
    if ((existingCoursesCount[0]?.value || 0) === 0) {
      await seedDatabase();
    }

    const conditions = [];

    if (!currentUser || currentUser.role === 'STUDENT') {
      conditions.push(eq(courses.status, 'PUBLISHED'));
    } else if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      conditions.push(eq(courses.status, status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'));
    }
    if (currentUser?.role === 'INSTRUCTOR') {
      conditions.push(eq(courses.instructorId, currentUser.id));
    }

    if (search) {
      conditions.push(or(ilike(courses.title, `%${search}%`), ilike(courses.description, `%${search}%`)));
    }

    if (level && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
      conditions.push(eq(courses.level, level as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'));
    }

    if (categoryId) {
      conditions.push(eq(courses.categoryId, categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        level: courses.level,
        status: courses.status,
        price: courses.price,
        thumbnailUrl: courses.thumbnailUrl,
        createdAt: courses.createdAt,
        instructor: {
          id: users.id,
          name: users.name,
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
      .where(whereClause)
      .orderBy(desc(courses.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRes = await db.select({ value: count() }).from(courses).where(whereClause);
    const total = totalRes[0]?.value || 0;

    return NextResponse.json({
      courses: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Only Instructors and Admins can create courses' }, { status: 403 });
    }

    const body = await req.json();
    if (body.title && typeof body.title === 'string' && body.title.length > 250) {
      body.title = body.title.slice(0, 245).replace(/\s+\S*$/, '').trim() + '...';
    }

    const validated = courseSchema.parse(body);

    const slug = validated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);

    const newCourse = await db.transaction(async (tx) => {
      const [course] = await tx.insert(courses).values({
        title: validated.title,
        slug,
        description: validated.description,
        instructorId: user.id,
        categoryId: validated.categoryId || null,
        level: validated.level,
        status: validated.status,
        price: validated.price,
        thumbnailUrl: validated.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      }).returning();

      // Save AI-generated curriculum with the course so partial courses are never exposed.
      for (let mIdx = 0; mIdx < (validated.modules || []).length; mIdx++) {
        const modInput = validated.modules![mIdx];
        const [insertedModule] = await tx.insert(modules).values({
          courseId: course.id,
          title: modInput.title,
          description: modInput.description || '',
          order: mIdx + 1,
        }).returning();

        if (modInput.lessons && modInput.lessons.length > 0) {
          await tx.insert(lessons).values(
            modInput.lessons.map((lesInput, lIdx) => ({
              moduleId: insertedModule.id,
              title: lesInput.title,
              content: lesInput.content || `Overview and practical guide for ${lesInput.title}`,
              durationMinutes: lesInput.durationMinutes || 15,
              isFree: lesInput.isFree ?? (mIdx === 0 && lIdx === 0),
              order: lIdx + 1,
            }))
          );
        }
      }

      if (validated.assignments && validated.assignments.length > 0) {
        await tx.insert(assignments).values(
          validated.assignments.map((assignment) => ({
            courseId: course.id,
            title: assignment.title,
            instructions: assignment.instructions,
            maxPoints: assignment.maxPoints,
            dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
          }))
        );
      }

      return course;
    });

    revalidatePath('/dashboard');
    revalidatePath('/courses');
    revalidatePath('/api/courses');

    return NextResponse.json({ message: 'Course created successfully', course: newCourse }, { status: 201 });
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
