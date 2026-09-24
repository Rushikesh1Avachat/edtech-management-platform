'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Plus, BookOpen, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { CourseData } from './CourseCard';
import type { GeneratedAssignment, GeneratedModule } from '@/lib/ai';
import { readJsonResponse } from '@/lib/client-response';

type CourseFormData = {
  title: string;
  description: string;
  categoryId: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  price: number;
  thumbnailUrl: string;
  modules?: GeneratedModule[];
  assignments?: GeneratedAssignment[];
};

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CourseData | null;
  categories: { id: string; name: string }[];
  onOpenAiGenerator?: () => void;
}

export default function CourseFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  categories,
  onOpenAiGenerator,
}: CourseFormModalProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    categoryId: '',
    level: 'BEGINNER',
    status: 'DRAFT',
    price: 0,
    thumbnailUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAutofillComplete, setAiAutofillComplete] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);

  // Curated thumbnail suggestions by topic
  const THUMBNAIL_SUGGESTIONS = [
    { label: 'Code / Web Dev', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80' },
    { label: 'AI / Machine Learning', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80' },
    { label: 'Database / Cloud', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80' },
    { label: 'Security / DevOps', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80' },
    { label: 'Data Science', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
    { label: 'Mobile / Apps', url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80' },
  ];

  const pickThumbnailForTopic = (topic: string) => {
    const normalized = topic.toLowerCase();
    const match = THUMBNAIL_SUGGESTIONS.find((suggestion) => {
      const label = suggestion.label.toLowerCase();
      return label
        .split(/[\s/]+/)
        .some((word) => word.length > 2 && normalized.includes(word));
    });

    return match?.url || THUMBNAIL_SUGGESTIONS[0]?.url || '';
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThumbnailError(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiAutofillComplete(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        categoryId: initialData.category?.id || '',
        level: initialData.level || 'BEGINNER',
        status: initialData.status || 'DRAFT',
        price: initialData.price || 0,
        thumbnailUrl: initialData.thumbnailUrl || '',
        modules: undefined,
        assignments: undefined,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        categoryId: categories[0]?.id || '',
        level: 'BEGINNER',
        status: 'DRAFT',
        price: 0,
        thumbnailUrl: '',
        modules: undefined,
        assignments: undefined,
      });
    }
  }, [initialData, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = initialData ? `/api/courses/${initialData.id}` : '/api/courses';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save course');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillWithAi = async (autoTrigger = false) => {
    if (autoTrigger) {
      setAiAutofillComplete(false);
    }
    setAiGenerating(true);
    setError('');

    try {
      const selectedCategory = categories.find((category) => category.id === formData.categoryId);
      const topic = formData.title.trim()
        || (selectedCategory ? `${selectedCategory.name} professional course` : 'Next.js 16 fullstack engineering');

      const res = await fetch('/api/ai/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          level: formData.level,
          numModules: 3,
        }),
      });

      const data = await readJsonResponse<{ error?: string; outline?: {
        courseTitle?: string;
        description?: string;
        level?: CourseFormData['level'];
        modules?: GeneratedModule[];
        assignments?: GeneratedAssignment[];
      } }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-generate course details');
      }

      const outline = data.outline;
      if (!outline) {
        throw new Error('Course generation returned no outline');
      }
      const cleanTitle = String(outline.courseTitle || topic).replace(/\*\*/g, '').trim();

      setThumbnailError(false);
      setFormData((current) => ({
        ...current,
        title: cleanTitle,
        description: outline.description || current.description,
        level: outline.level || current.level,
        status: current.status === 'DRAFT' ? 'PUBLISHED' : current.status,
        price: current.price === 0 ? 79 : current.price,
        thumbnailUrl: pickThumbnailForTopic(`${topic} ${cleanTitle}`),
        modules: outline.modules || [],
        assignments: outline.assignments || [],
      }));

      if (autoTrigger) {
        setAiAutofillComplete(true);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
      if (autoTrigger) {
        setAiAutofillComplete(false);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  // Auto-trigger AI generation when opening in "create new course" mode.
  useEffect(() => {
    if (isOpen && !initialData && !aiAutofillComplete && !aiGenerating) {
      const timer = setTimeout(() => {
        void handleAutofillWithAi(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialData ? 'Edit Course Details' : 'Create New Course'}
              </h2>
              <p className="text-xs text-gray-400">Specify details, curriculum level, and pricing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!initialData && (
          <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {aiGenerating ? 'AI is Generating Course Details...' : aiAutofillComplete ? 'Course Details Auto-Generated by Gemini' : 'Generate with Gemini AI'}
                </h4>
                <p className="text-xs text-gray-300">
                  {aiGenerating
                    ? 'Creating your course outline, description, and lesson modules...'
                    : aiAutofillComplete
                      ? `${formData.modules?.length || 0} modules and ${formData.assignments?.length || 0} assignments auto-filled.`
                      : 'Auto-generate course outline, description, and lesson modules.'}
                </p>
              </div>
            </div>
            {!aiGenerating && (
              <button
                type="button"
                onClick={() => {
                  if (aiAutofillComplete) {
                    setAiAutofillComplete(false);
                    void handleAutofillWithAi(true);
                  } else {
                    void handleAutofillWithAi();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {aiAutofillComplete ? 'Regenerate' : 'Auto-fill Form'}
              </button>
            )}
          </div>
        )}

        {!initialData && onOpenAiGenerator && (
          <button
            type="button"
            onClick={onOpenAiGenerator}
            className="mb-2 text-[10px] text-purple-400 hover:text-purple-300 hover:underline"
          >
            Need more control? Use the full AI Course Generator with custom topics
          </button>
        )}

        {!initialData && aiAutofillComplete && (formData.modules?.length || formData.assignments?.length) ? (
          <div className="my-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Gemini auto-filled {formData.modules?.length || 0} modules and {formData.assignments?.length || 0} starter assignments. They will be saved with this course.</span>
          </div>
        ) : null}

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Course Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Next.js 16 Enterprise Architecture"
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Course Description *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide an overview of key learnings and outcomes..."
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' })}
                className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Price (USD)</label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Publication Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' })}
                className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Thumbnail Image URL
            </label>
            <input
              type="text"
              value={formData.thumbnailUrl}
              onChange={(e) => {
                setThumbnailError(false);
                setFormData({ ...formData, thumbnailUrl: e.target.value });
              }}
              placeholder="https://images.unsplash.com/... (leave blank for auto-gradient)"
              className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            />

            {/* Quick-pick thumbnails */}
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 mb-1.5">Quick-pick by topic:</p>
              <div className="flex flex-wrap gap-1.5">
                {THUMBNAIL_SUGGESTIONS.map((s) => (
                  <button
                    key={s.url}
                    type="button"
                    onClick={() => {
                      setThumbnailError(false);
                      setFormData({ ...formData, thumbnailUrl: s.url });
                    }}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                      formData.thumbnailUrl === s.url
                        ? 'bg-blue-500/30 border-blue-500/50 text-blue-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                {formData.thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailError(false);
                      setFormData({ ...formData, thumbnailUrl: '' });
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg border bg-rose-900/30 border-rose-700/50 text-rose-300 hover:bg-rose-900/50"
                  >
                    Clear (use gradient)
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail preview */}
            <div className="mt-3">
              <p className="text-[10px] text-gray-500 mb-1.5">Preview:</p>
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
                {!thumbnailError && formData.thumbnailUrl ? (
                  <img
                    key={formData.thumbnailUrl}
                    src={formData.thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={() => setThumbnailError(true)}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    formData.thumbnailUrl && thumbnailError
                      ? 'bg-rose-950/30'
                      : 'bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-900'
                  }`}>
                    <div className="flex flex-col items-center gap-1 opacity-50">
                      <BookOpen className="w-8 h-8 text-white" />
                      <span className="text-[10px] text-white font-medium">
                        {formData.thumbnailUrl && thumbnailError ? '⚠ Image failed to load' : 'Auto-gradient placeholder'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg gradient-bg-hover shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update Course' : 'Save & Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
