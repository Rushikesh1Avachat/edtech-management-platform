'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { readJsonResponse } from '@/lib/client-response';

interface PaymentStatusCardProps {
  courseId: string;
  sessionId?: string;
  paymentSuccess?: boolean;
  paymentCancelled?: boolean;
}

export default function PaymentStatusCard({
  courseId,
  sessionId,
  paymentSuccess,
  paymentCancelled,
}: PaymentStatusCardProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'cancelled' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (paymentCancelled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('cancelled');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('Payment cancelled. You can retry the checkout any time.');
      return;
    }

    if (!paymentSuccess || !sessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('Payment status is unavailable.');
      return;
    }

        const verifyPayment = async () => {
      try {
        const response = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
              body: JSON.stringify({ sessionId, courseId }),
        });

        const data = await readJsonResponse<{ error?: string; message?: string }>(response);

        if (!response.ok) {
          throw new Error(data.error || 'Payment verification failed.');
        }

        setStatus('success');
        setMessage(data.message || 'Payment successful! Your enrollment has been confirmed.');
        // Refresh to show enrolled state and created placeholders
        setTimeout(() => { window.location.href = `/courses/${courseId}`; }, 700);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Payment verification failed.');
      }
    };

    void verifyPayment();
  }, [courseId, paymentCancelled, paymentSuccess, sessionId]);

  if (!paymentSuccess && !paymentCancelled) {
    return null;
  }

  return (
    <div className="glass-panel border border-gray-800 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        {status === 'loading' && <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-400" />}
        {status === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />}
        {(status === 'cancelled' || status === 'error') && <XCircle className="mt-0.5 h-5 w-5 text-amber-400" />}

        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {status === 'loading' && 'Processing payment'}
            {status === 'success' && 'Payment successful'}
            {status === 'cancelled' && 'Payment cancelled'}
            {status === 'error' && 'Payment notice'}
          </p>
          <p className="text-sm text-gray-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
