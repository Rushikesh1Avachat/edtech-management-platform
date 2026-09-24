import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { enrollments, courses, lessons, modules, lessonProgress, lessonCompletions } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getStripeSecretKey } from '@/lib/stripe';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const stripeConfig = getStripeSecretKey();
    if (stripeConfig.error) {
      return NextResponse.json({ error: stripeConfig.error }, { status: 503 });
    }

    const stripe = new Stripe(stripeConfig.key);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    // Verify the session belongs to this user
    const courseId = session.metadata?.courseId;
    const studentId = session.metadata?.studentId;

    if (!courseId || studentId !== user.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    // Verify course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check for existing enrollment (idempotent)
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)));

    if (existingEnrollment) {
      // Already enrolled — just return success (idempotent behavior)
      return NextResponse.json({
        message: 'Already enrolled',
        enrollment: existingEnrollment,
        alreadyEnrolled: true,
      });
    }

    // Create the enrollment record with PAID status
    const [newEnrollment] = await db
      .insert(enrollments)
      .values({
        studentId: user.id,
        courseId,
        progress: 0,
        paymentStatus: 'PAID',
        stripeSessionId: sessionId,
      })
      .onConflictDoNothing()
      .returning();

    const lessonRows = await db
      .select({ lessonId: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(eq(modules.courseId, courseId));

    if (lessonRows.length > 0) {
      await db.insert(lessonProgress)
        .values(lessonRows.map((row) => ({
          studentId: user.id,
          lessonId: row.lessonId,
          status: 'NOT_STARTED',
          updatedAt: new Date(),
        })))
        .onConflictDoNothing();

      // Create placeholder completion rows with null completedAt
      try {
        await db.insert(lessonCompletions)
          .values(lessonRows.map((row) => ({ studentId: user.id, lessonId: row.lessonId, completedAt: null })))
          .onConflictDoNothing();
      } catch (e) {
        console.warn('lessonCompletions insert warning (verify):', e);
      }
    }

    if (!newEnrollment) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)));
      return NextResponse.json({ message: 'Already enrolled', enrollment, alreadyEnrolled: true });
    }

    return NextResponse.json({
      message: 'Payment verified and enrollment created!',
      enrollment: newEnrollment,
    }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Stripe verify error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
