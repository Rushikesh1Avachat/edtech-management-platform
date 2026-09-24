import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeWebhookSecret } from '@/lib/stripe';
import { db } from '@/db';
import { courses, enrollments, lessons, modules, lessonProgress, lessonCompletions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const webhookConfig = getStripeWebhookSecret();
  if (webhookConfig.error) {
    return NextResponse.json({ error: webhookConfig.error }, { status: 503 });
  }

  try {
    const rawBody = await request.text();
    const event = Stripe.webhooks.constructEvent(rawBody, signature, webhookConfig.secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const courseId = session.metadata?.courseId;
      const studentId = session.metadata?.studentId;

      if (session.payment_status === 'paid' && courseId && studentId) {
        const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId));
        if (!course) {
          return NextResponse.json({ error: 'Course in Stripe metadata was not found' }, { status: 404 });
        }

        const [existingEnrollment] = await db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)));

        if (!existingEnrollment) {
          await db.insert(enrollments).values({
            studentId,
            courseId,
            progress: 0,
            paymentStatus: 'PAID',
            stripeSessionId: session.id,
          });
        }

        const lessonRows = await db
          .select({ lessonId: lessons.id })
          .from(lessons)
          .innerJoin(modules, eq(modules.id, lessons.moduleId))
          .where(eq(modules.courseId, courseId));

        if (lessonRows.length > 0) {
          await db.insert(lessonProgress)
            .values(lessonRows.map((row) => ({
              studentId,
              lessonId: row.lessonId,
              status: 'NOT_STARTED',
              updatedAt: new Date(),
            })))
            .onConflictDoNothing();
        
          try {
            await db.insert(lessonCompletions)
              .values(lessonRows.map((row) => ({ studentId, lessonId: row.lessonId, completedAt: null })))
              .onConflictDoNothing();
          } catch (e) {
            console.warn('lessonCompletions insert warning (webhook):', e);
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook payload';
    console.error('Stripe webhook error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
