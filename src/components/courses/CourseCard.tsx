'use client';

import Link from 'next/link';
import { Edit3, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { useState } from 'react';

export interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  price: number;
  thumbnailUrl?: string | null;
  instructor?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface CourseCardProps {
  course: CourseData;
  currentUserId?: string;
  currentUserRole?: string;
  onEdit?: (course: CourseData) => void;
  onDelete?: (id: string) => void;
}

// Gradient fallback backgrounds based on course level
const LEVEL_GRADIENTS: Record<string, string> = {
  ADVANCED: 'from-rose-900/80 via-purple-900/60 to-gray-900',
  INTERMEDIATE: 'from-amber-900/80 via-orange-900/60 to-gray-900',
  BEGINNER: 'from-emerald-900/80 via-teal-900/60 to-gray-900',
};

export default function CourseCard({
  course,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
}: CourseCardProps) {
  const [imgError, setImgError] = useState(false);
  const isOwner = currentUserRole === 'ADMIN' || (currentUserRole === 'INSTRUCTOR' && course.instructor?.id === currentUserId);
  const gradientClass = LEVEL_GRADIENTS[course.level] || LEVEL_GRADIENTS['BEGINNER'];

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ADVANCED':
        return <span className="bg-rose-500/20 text-rose-300 text-xs px-2.5 py-1 rounded-full border border-rose-500/30 font-medium">Advanced</span>;
      case 'INTERMEDIATE':
        return <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-500/30 font-medium">Intermediate</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium">Beginner</span>;
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group h-full border border-gray-800 hover:border-blue-500/30">
      <div className="relative h-48 w-full overflow-hidden bg-gray-900">
        {!imgError && course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
            <div className="flex flex-col items-center gap-2 opacity-40">
              <BookOpen className="w-10 h-10 text-white" />
              <span className="text-white text-xs font-medium tracking-wide uppercase">{course.level}</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {getLevelBadge(course.level)}
          {course.category && (
            <span className="bg-blue-900/60 text-blue-200 text-xs px-2.5 py-1 rounded-full backdrop-blur-md border border-blue-700/40">
              {course.category.name}
            </span>
          )}
        </div>

        {isOwner && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-950/80 backdrop-blur-md p-1.5 rounded-xl border border-gray-700">
            {onEdit && (
              <button
                onClick={() => onEdit(course)}
                className="p-1.5 text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                title="Edit Course"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(course.id)}
                className="p-1.5 text-gray-300 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors"
                title="Delete Course"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-blue-400 border border-gray-700">
              {course.instructor?.name?.charAt(0) || 'I'}
            </div>
            <span className="text-xs text-gray-300 font-medium truncate max-w-[120px]">
              {course.instructor?.name || 'Instructor'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white">
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </span>
            <Link
              href={`/courses/${course.id}`}
              className="p-2 rounded-xl gradient-bg text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
