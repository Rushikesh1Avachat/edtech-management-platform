'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Loader2, Shield, GraduationCap, User, BookOpen } from 'lucide-react';
import { readJsonResponse } from '@/lib/client-response';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'password123' }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="glass-panel p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign In to EduTrack AI</h1>
          <p className="text-xs text-gray-400">Access your role-based EdTech dashboard.</p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
            ⚡ One-Click Demo Sign In:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@edutrack.com')}
              className="px-2 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('instructor@edutrack.com')}
              className="px-2 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Instructor
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('student@edutrack.com')}
              className="px-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <User className="w-3.5 h-3.5" /> Student
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-sm text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
