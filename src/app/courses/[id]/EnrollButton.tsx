'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import PaymentGatewayCard from '@/components/payments/PaymentGatewayCard';
import { readJsonResponse } from '@/lib/client-response';

interface EnrollButtonProps {
  courseId: string;
  coursePrice: number;
  courseTitle: string;
  isEnrolled: boolean;
  isLoggedIn: boolean;
}

export default function EnrollButton({
  courseId,
  coursePrice,
  courseTitle,
  isEnrolled: initialEnrolled,
  isLoggedIn,
}: EnrollButtonProps) {
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }

    setLoading(true);

    try {
      if (coursePrice > 0) {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseId }),
        });

        const data = await readJsonResponse<{ error?: string; url?: string }>(res);

        if (!res.ok) {
          throw new Error(data.error || 'Unable to create Stripe checkout.');
        }

        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }

      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
      });
      if (res.ok) {
        setEnrolled(true);
        router.refresh();
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert(err instanceof Error ? err.message : 'Enrollment failed.');
    } finally {
      setLoading(false);
    }
  };

  if (enrolled) {
    return (
      <div className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-semibold flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Enrolled in Course
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coursePrice > 0 && <PaymentGatewayCard price={coursePrice} courseTitle={courseTitle} />}
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-white gradient-bg gradient-bg-hover shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-70"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Redirecting to Stripe...' : isLoggedIn ? (coursePrice > 0 ? 'Pay with Stripe' : 'Enroll Now') : 'Sign in to Enroll'}
      </button>
    </div>
  );
}
