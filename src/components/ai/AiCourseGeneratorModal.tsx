'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Loader2, CheckCircle2 } from 'lucide-react';
import { GeneratedCourseOutline } from '@/lib/ai';
import { readJsonResponse } from '@/lib/client-response';

interface AiCourseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatedSuccess: () => void;
  categories: { id: string; name: string }[];
}

const THUMBNAIL_POOL: { keywords: string[]; url: string }[] = [
  { keywords: ['ai', 'machine learning', 'deep learning', 'llm', 'gemini', 'gpt', 'neural', 'generative'], url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['react', 'next', 'javascript', 'typescript', 'frontend', 'web', 'html', 'css', 'vue', 'angular', 'node', 'fullstack'], url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['database', 'sql', 'postgres', 'mongodb', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'devops', 'infrastructure'], url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['security', 'auth', 'jwt', 'cybersecurity', 'encryption', 'hacking', 'penetration', 'rbac'], url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['data', 'analytics', 'visualization', 'pandas', 'python', 'statistics', 'science'], url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['mobile', 'ios', 'android', 'swift', 'flutter', 'react native', 'app'], url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['design', 'ui', 'ux', 'figma', 'product', 'prototype', 'wireframe'], url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80' },
  { keywords: ['blockchain', 'crypto', 'web3', 'smart contract', 'solidity', 'ethereum'], url: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=800&q=80' },
];

const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';

function pickThumbnailForTopic(topic: string, level: string): string {
  const combined = (topic + ' ' + level).toLowerCase();
  for (const entry of THUMBNAIL_POOL) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      return entry.url;
    }
  }
  return DEFAULT_THUMBNAIL;
}

export default function AiCourseGeneratorModal({
  isOpen,
  onClose,
  onCreatedSuccess,
  categories,
}: AiCourseGeneratorModalProps) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [numModules, setNumModules] = useState(3);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedCourseOutline | null>(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);
  const [autoSavePaused, setAutoSavePaused] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  const handleSaveGeneratedCourse = useCallback(async () => {
    if (!generatedOutline) return;
    setSaving(true);
    setError('');
    setAutoSavePaused(true);

    try {
      let title = (generatedOutline.courseTitle || 'AI Generated Course').replace(/\*\*/g, '').trim();
      if (title.length > 200) {
        title = title.slice(0, 195).replace(/\s+\S*$/, '').trim() + '...';
      }

      const topicText = `${topic} ${generatedOutline.courseTitle}`.toLowerCase();
      const categoryId = categories.find((category) => {
        const categoryText = category.name.toLowerCase();
        if (categoryText === 'ai') {
          return ['ai', 'machine learning', 'deep learning', 'llm', 'gemini', 'gpt', 'neural'].some((keyword) => topicText.includes(keyword));
        }
        if (categoryText === 'mobile apps') {
          return ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin'].some((keyword) => topicText.includes(keyword));
        }
        return topicText.includes(categoryText);
      })?.id || categories[0]?.id || null;
      const thumbnailUrl = pickThumbnailForTopic(topic, generatedOutline.level);

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: generatedOutline.description,
          level: generatedOutline.level,
          status: 'PUBLISHED',
          price: 79,
          categoryId,
          thumbnailUrl,
          modules: generatedOutline.modules,
          assignments: generatedOutline.assignments || [],
        }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save generated course');

      onCreatedSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [generatedOutline, categories, topic, onCreatedSuccess, onClose]);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoSaveCountdown(5);
    setAutoSavePaused(false);

    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setAutoSaveCountdown(0);
        setAutoSavePaused(true);
        void handleSaveGeneratedCourse();
      } else {
        setAutoSaveCountdown(count);
      }
    }, 1000);
  }, [handleSaveGeneratedCourse]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedOutline(null);
    setAutoSaveCountdown(0);
    setAutoSavePaused(false);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    try {
      const res = await fetch('/api/ai/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, numModules }),
      });

      const data = await readJsonResponse<{ error?: string; outline: GeneratedCourseOutline }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate course');
      }

      setGeneratedOutline(data.outline);
      startCountdown();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAutoSave = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoSavePaused(true);
    setAutoSaveCountdown(0);
  };

  const handleRegenerate = () => {
    setGeneratedOutline(null);
    setAutoSaveCountdown(0);
    setAutoSavePaused(false);
    setTopic('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 border border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Gemini AI Course & Curriculum Generator
              </h2>
              <p className="text-xs text-gray-400">Generate multi-module course syllabi in seconds.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {!generatedOutline ? (
          <form onSubmit={handleGenerate} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Target Topic or Subject *</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Distributed Systems & Microservices in Node.js"
                className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Target Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')}
                  className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Number of Modules</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={numModules}
                  onChange={(e) => setNumModules(Number(e.target.value))}
                  className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-purple-500/20 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating Outline...' : 'Generate Syllabus'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            {!autoSavePaused && autoSaveCountdown > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Auto-saving course in {autoSaveCountdown}s… Your curriculum will be published to the dashboard automatically.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAutoSave}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Cancel auto-save
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-gray-900/90 border border-gray-800 overflow-hidden">
              <div className="relative h-36 w-full bg-gray-900">
                {(() => {
                  const thumbUrl = pickThumbnailForTopic(topic, generatedOutline.level);
                  return (
                    <img
                      src={thumbUrl}
                      alt="Course thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  );
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="text-[10px] text-gray-300 bg-gray-950/70 px-2 py-0.5 rounded-full border border-gray-700">
                    🖼 AI-assigned thumbnail
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {generatedOutline.level}
                  </span>
                  <span className="text-xs text-gray-400">{generatedOutline.modules.length} Modules Generated</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{generatedOutline.courseTitle}</h3>
                <p className="text-sm text-gray-300 mt-1 leading-relaxed">{generatedOutline.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated Curriculum Modules:</h4>
              {generatedOutline.modules.map((mod, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
                  <h5 className="text-sm font-semibold text-blue-300">{mod.title}</h5>
                  <p className="text-xs text-gray-400 mt-0.5">{mod.description}</p>
                  <div className="mt-2 space-y-1">
                    {mod.lessons.map((les, lIdx) => (
                      <div key={lIdx} className="text-xs text-gray-300 flex items-center justify-between pl-3 border-l-2 border-blue-500/40 py-0.5">
                        <span>{les.title} ({les.durationMinutes} min)</span>
                        {les.isFree && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Free Preview</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {generatedOutline.assignments && generatedOutline.assignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated Starter Assignments:</h4>
                {generatedOutline.assignments.map((assignment, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <h5 className="text-sm font-semibold text-emerald-300">{assignment.title}</h5>
                      <span className="shrink-0 text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {assignment.maxPoints} pts
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{assignment.instructions}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-between items-center border-t border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ← Regenerate with different topic
                </button>
                {!autoSavePaused && (
                  <button
                    type="button"
                    onClick={() => {
                      if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                      }
                      setAutoSavePaused(true);
                      setAutoSaveCountdown(0);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    Skip auto-save
                  </button>
                )}
              </div>
              {saving ? (
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Publishing course…</span>
                </div>
              ) : autoSavePaused ? (
                <button
                  type="button"
                  onClick={handleSaveGeneratedCourse}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save & Publish Course
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveGeneratedCourse}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
