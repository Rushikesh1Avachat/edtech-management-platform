'use client';

import { CreditCard, ShieldCheck } from 'lucide-react';

interface PaymentGatewayCardProps {
  price: number;
  courseTitle: string;
}

export default function PaymentGatewayCard({ price, courseTitle }: PaymentGatewayCardProps) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-left">
      <div className="mb-3 flex items-center gap-2 text-blue-300">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Stripe Test Mode</span>
      </div>

      <div className="space-y-2 text-sm text-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Course</span>
          <span className="font-medium text-white">{courseTitle}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total</span>
          <span className="text-lg font-bold text-white">${price}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/70 p-2 text-xs text-gray-300">
        <CreditCard className="h-4 w-4 text-emerald-400" />
        <span>Test card: 4242 4242 4242 4242</span>
      </div>
    </div>
  );
}
