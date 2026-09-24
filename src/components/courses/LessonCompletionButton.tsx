'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { readJsonResponse } from '@/lib/client-response';

interface LessonCompletionButtonProps {
  lessonId: string;
  completed: boolean;
  status?: string; // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  onCompleted?: (progress: number) => void;
}

export default function LessonCompletionButton({
  lessonId,
  completed: initialCompleted,
  status: initialStatus = 'NOT_STARTED',
  onCompleted,
}: LessonCompletionButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();

  // Fetch current status on mount to ensure UI reflects DB state
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/status`);
        const data = await readJsonResponse<{ status?: string; completed?: boolean }>(res);
        if (!res.ok) return;
        if (!mounted) return;
        setStatus(data.status ?? 'NOT_STARTED');
        setCompleted(Boolean(data.completed));
      } catch (e) {
        // ignore
      }
    };
    void fetchStatus();
    return () => { mounted = false; };
  }, [lessonId]);

  const handleComplete = async () => {
    if ((completed || status === 'COMPLETED') || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, { method: 'POST' });
      const data = await readJsonResponse<{ error?: string; progress: number }>(response);
      if (!response.ok) throw new Error(data.error || 'Could not update lesson progress');
      setCompleted(true);
      setStatus('COMPLETED');
      onCompleted?.(data.progress);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update lesson progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={(completed || status === 'COMPLETED') || loading}
      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
        status === 'COMPLETED'
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : status === 'IN_PROGRESS'
          ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
          : 'bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25'
      }`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === 'COMPLETED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'IN_PROGRESS' ? 'In progress' : 'Mark complete'}
    </button>
  );
}
