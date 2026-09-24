'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, User, LogOut, Shield, GraduationCap } from 'lucide-react';
import { readJsonResponse } from '@/lib/client-response';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
}

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => readJsonResponse<{ user?: AuthUser | null }>(res))
      .then((data) => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>;
      case 'INSTRUCTOR':
        return <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Instructor</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1"><User className="w-3 h-3" /> Student</span>;
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
                EduTrack <span className="gradient-text font-black">AI</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/courses"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/courses' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                Catalog
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!loading && user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2">
                  {getRoleBadge(user.role)}
                  <span className="text-sm font-medium text-gray-200">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-bg gradient-bg-hover shadow-md shadow-blue-500/20 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
