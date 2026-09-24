import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { courses, enrollments } from '@/db/schema';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getAppUrl, getStripeSecretKey } from '@/lib/stripe';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to enroll' }, { status: 401 });
    }

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Fetch course details
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if already enrolled
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)));

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 409 });
    }

    // If course is free, this route shouldn't be called — handle gracefully
    if (course.price === 0) {
      return NextResponse.json({ error: 'This course is free. Use the direct enroll endpoint.' }, { status: 400 });
    }

    // Validate Stripe key is configured
    const stripeConfig = getStripeSecretKey();
    if (stripeConfig.error) {
      return NextResponse.json({
        error: stripeConfig.error,
        stripeNotConfigured: true,
      }, { status: 503 });
    }

    const stripe = new Stripe(stripeConfig.key);
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description.slice(0, 255),
              images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
              metadata: { courseId: course.id },
            },
            unit_amount: course.price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: user.email,
      metadata: {
        courseId: course.id,
        studentId: user.id,
        studentEmail: user.email,
      },
      success_url: `${appUrl}/courses/${courseId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/courses/${courseId}?payment_cancelled=true`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
