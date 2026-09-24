'use client';

import { useState, useEffect, useCallback } from 'react';
import CourseCard, { CourseData } from '@/components/courses/CourseCard';
import CourseFormModal from '@/components/courses/CourseFormModal';
import AiCourseGeneratorModal from '@/components/ai/AiCourseGeneratorModal';
import { readJsonResponse } from '@/lib/client-response';
import { BookOpen, Plus, Sparkles, FileText, Send, Loader2, ClipboardList, Wand2, Bot, Edit3, Trash2, X, CheckCircle2, Trophy } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug?: string;
}

interface Assignment {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  maxPoints: number;
  courseTitle: string;
  createdAt?: string;
}

interface AiLog {
  id: string;
  promptType: string;
  promptText: string;
  responseContent: string;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentName?: string;
  assignmentTitle?: string;
  content: string;
  grade?: number | null;
  aiFeedback?: string | null;
  submittedAt: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
}

interface DashboardAnalytics {
  courses: number;
  enrollments: number;
  completionRate: number;
  averageGrade: number;
  pendingSubmissions: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [coursesList, setCoursesList] = useState<CourseData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [studentCourseProgress, setStudentCourseProgress] = useState<Array<{ courseId: string; courseTitle: string; progress: number; completedLessons: number; totalLessons: number; completedAt?: string | null }>>([]);

  // Modals state
   const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Student submission form state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');

  // Instructor assignment form state
  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [assignmentMaxPoints, setAssignmentMaxPoints] = useState(100);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [generatingAssignmentFor, setGeneratingAssignmentFor] = useState('');
  const [editingAssignmentId, setEditingAssignmentId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meData = await readJsonResponse<{ user?: AuthUser | null }>(meRes);
      setUser(meData.user || null);

      const catRes = await fetch('/api/categories', { cache: 'no-store' });
      const catData = await readJsonResponse<{ categories?: Category[] }>(catRes);
      const availableCategories = Array.isArray(catData.categories)
        ? catData.categories.filter((category: Category) => category.id && category.name)
        : [];
      setCategories(availableCategories);

      const courseRes = await fetch('/api/courses?limit=50', { cache: 'no-store' });
      const courseData = await readJsonResponse<{ courses?: CourseData[] }>(courseRes);
      setCoursesList(courseData.courses || []);

      const assignRes = await fetch('/api/assignments', { cache: 'no-store' });
      const assignData = await readJsonResponse<{ assignments?: Assignment[] }>(assignRes);
      setAssignments(assignData.assignments || []);

      const subRes = await fetch('/api/submissions', { cache: 'no-store' });
      const subData = await readJsonResponse<{ submissions?: Submission[] }>(subRes);
      setSubmissions(subData.submissions || []);

      if (meData.user?.role === 'INSTRUCTOR' || meData.user?.role === 'ADMIN') {
        const aiLogRes = await fetch('/api/ai/logs', { cache: 'no-store' });
        const aiLogData = await readJsonResponse<{ logs?: AiLog[] }>(aiLogRes);
        setAiLogs(aiLogData.logs || []);
        const analyticsRes = await fetch('/api/dashboard/analytics', { cache: 'no-store' });
        const analyticsData = await readJsonResponse<DashboardAnalytics>(analyticsRes);
        setAnalytics(analyticsData);
      } else if (meData.user?.role === 'STUDENT') {
        const progressRes = await fetch('/api/student/progress', { cache: 'no-store' });
        const progressData = await readJsonResponse<{ courses?: Array<{ courseId: string; courseTitle: string; progress: number; completedLessons: number; totalLessons: number; completedAt?: string | null }> }>(progressRes);
        setStudentCourseProgress(progressData.courses || []);
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    void fetchData();
  }, [fetchData]);

   const handleDeleteCourse = async (id: string) => {
     if (!confirm('Are you sure you want to delete this course?')) return;
     try {
       const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
       if (res.ok) {
         showSuccess('Course deleted successfully.');
       }
     } catch (err) {
       console.error('Delete error:', err);
     }
   };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssignment(true);
    setAssignmentMessage('');

    try {
      const url = editingAssignmentId ? `/api/assignments?id=${editingAssignmentId}` : '/api/assignments';
      const res = await fetch(url, {
        method: editingAssignmentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: assignmentCourseId,
          title: assignmentTitle,
          instructions: assignmentInstructions,
          maxPoints: assignmentMaxPoints,
        }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Assignment save failed');

      setAssignmentMessage(editingAssignmentId ? 'Assignment updated successfully.' : 'Assignment created successfully.');
      resetAssignmentForm();
      fetchData();
    } catch (err: unknown) {
      setAssignmentMessage(`Error: ${(err as Error).message}`);
    } finally {
      setSavingAssignment(false);
    }
  };

  const resetAssignmentForm = () => {
    setEditingAssignmentId('');
    setAssignmentCourseId('');
    setAssignmentTitle('');
    setAssignmentInstructions('');
    setAssignmentMaxPoints(100);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentCourseId(assignment.courseId);
    setAssignmentTitle(assignment.title);
    setAssignmentInstructions(assignment.instructions);
    setAssignmentMaxPoints(assignment.maxPoints);
    setAssignmentMessage('');
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Delete this assignment and its submissions?')) return;
    setAssignmentMessage('');

    try {
      const res = await fetch(`/api/assignments?id=${assignmentId}`, { method: 'DELETE' });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Assignment delete failed');

      if (editingAssignmentId === assignmentId) resetAssignmentForm();
      setAssignmentMessage('Assignment deleted successfully.');
      fetchData();
    } catch (err: unknown) {
      setAssignmentMessage(`Error: ${(err as Error).message}`);
    }
  };

  const handleGenerateAssignment = async (courseId: string) => {
    setGeneratingAssignmentFor(courseId);
    setAssignmentMessage('');

    try {
      const res = await fetch('/api/ai/generate-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'AI assignment generation failed');

      setAssignmentMessage('Gemini generated and saved a new assignment.');
      fetchData();
    } catch (err: unknown) {
      setAssignmentMessage(`Error: ${(err as Error).message}`);
    } finally {
      setGeneratingAssignmentFor('');
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || !submissionContent) return;

    setSubmittingAssignment(true);
    setSubmissionMessage('');

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          content: submissionContent,
        }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmissionMessage('Assignment submitted successfully! AI Feedback generated below.');
      setSubmissionContent('');
      fetchData();
    } catch (err: unknown) {
      setSubmissionMessage(`Error: ${(err as Error).message}`);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Loading EduTrack Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
        <p className="text-gray-400">Please sign in to view your role dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Role: {user.role}
            </span>
            <span className="text-xs text-gray-400">• Logged in as {user.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Welcome back, {user.name}
          </h1>
        </div>

        {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN') && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/10"
            >
              <Sparkles className="w-4 h-4 text-purple-400" /> Generate with Gemini AI
            </button>
            <button
              onClick={() => {
                setEditingCourse(null);
                setIsCourseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white gradient-bg gradient-bg-hover shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Course
            </button>
          </div>
        )}
      </div>

      {/* Role-Specific Sections */}
      {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN') ? (
        /* Instructor & Admin View */
        <div className="space-y-8">
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                ['Courses', analytics.courses, 'text-blue-300'],
                ['Enrollments', analytics.enrollments, 'text-purple-300'],
                ['Completion', `${analytics.completionRate}%`, 'text-emerald-300'],
                ['Avg. Grade', `${analytics.averageGrade}/100`, 'text-amber-300'],
                ['Pending Review', analytics.pendingSubmissions, 'text-rose-300'],
              ].map(([label, value, color]) => (
                <div key={label} className="glass-panel rounded-2xl border border-gray-800 p-4">
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="mt-1 text-[11px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Manage Published & Draft Courses
              </h2>
              <span className="text-xs text-gray-400">{coursesList.length} Total Courses</span>
            </div>

            {coursesList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesList.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    currentUserId={user.id}
                    currentUserRole={user.role}
                    onEdit={(c) => {
                      setEditingCourse(c);
                      setIsCourseModalOpen(true);
                    }}
                    onDelete={handleDeleteCourse}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
                No courses created yet. Click &quot;Create New Course&quot; or &quot;Generate with Gemini AI&quot; above.
              </div>
            )}
          </div>

          {/* Submissions & AI Feedback Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-400" /> Create Assignment
                </h2>
                {editingAssignmentId && (
                  <button
                    type="button"
                    onClick={resetAssignmentForm}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white border border-gray-700 hover:bg-gray-800 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Edit
                  </button>
                )}
              </div>

              {assignmentMessage && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                  {assignmentMessage}
                </div>
              )}

              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Course *</label>
                  <select
                    required
                    value={assignmentCourseId}
                    onChange={(e) => setAssignmentCourseId(e.target.value)}
                    className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Course --</option>
                    {coursesList.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Assignment Title *</label>
                  <input
                    required
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g. Build and document a secure API"
                    className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Instructions *</label>
                  <textarea
                    required
                    rows={4}
                    value={assignmentInstructions}
                    onChange={(e) => setAssignmentInstructions(e.target.value)}
                    placeholder="Describe deliverables, rubric, and submission requirements..."
                    className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Points</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={assignmentMaxPoints}
                      onChange={(e) => setAssignmentMaxPoints(Number(e.target.value))}
                      className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingAssignment}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-blue-500/20 flex items-center gap-2"
                  >
                    {savingAssignment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {savingAssignment ? 'Saving...' : editingAssignmentId ? 'Update Assignment' : 'Add Assignment'}
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" /> Gemini Assignment Generator
              </h2>
              <div className="space-y-3 max-h-[27rem] overflow-y-auto pr-1">
                {coursesList.map((course) => (
                  <div key={course.id} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{course.title}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2">{course.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateAssignment(course.id)}
                      disabled={generatingAssignmentFor === course.id}
                      className="shrink-0 px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-2"
                    >
                      {generatingAssignmentFor === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-400" /> Course Assignments
            </h2>

            {assignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs text-blue-400 font-semibold">{assignment.courseTitle}</span>
                        <h3 className="text-sm font-bold text-white">{assignment.title}</h3>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold">
                          {assignment.maxPoints} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditAssignment(assignment)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-300 hover:bg-gray-800"
                          title="Edit assignment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-rose-300 hover:bg-gray-800"
                          title="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{assignment.instructions}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
                No assignments created yet.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> Student Submissions & AI Evaluation Queue
            </h2>

            {submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-400">{sub.assignmentTitle || 'Assignment'}</span>
                        <h4 className="text-sm font-semibold text-white">Student: {sub.studentName || 'Student'}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                        {sub.grade !== null && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold">
                            Score: {sub.grade}/100
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-300 bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                      <span className="font-semibold text-gray-400 block mb-1">Submission Content:</span>
                      {sub.content}
                    </div>

                    {sub.aiFeedback && (
                      <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-purple-300">
                          <Sparkles className="w-3.5 h-3.5" /> Automated Gemini AI Evaluation:
                        </div>
                        <p className="leading-relaxed">{sub.aiFeedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
                No student submissions received yet.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" /> AI Usage Logs
            </h2>

            {aiLogs.length > 0 ? (
              <div className="space-y-3">
                {aiLogs.map((log) => (
                  <div key={log.id} className="glass-panel p-4 rounded-2xl border border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-purple-300">{log.promptType.replace(/_/g, ' ')}</span>
                        <p className="text-xs text-gray-400">
                          {log.userName || log.userEmail || 'System'} • {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mt-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3 line-clamp-2">
                      {log.promptText}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
                No AI usage logged yet. Generate a course, assignment, or student evaluation to populate this audit trail.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Student View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" /> Submit Assignment for AI Tutoring & Grading
            </h2>

            <div className="glass-panel p-6 rounded-2xl border border-gray-800">
              {submissionMessage && (
                <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                  {submissionMessage}
                </div>
              )}

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Select Course Assignment *</label>
                  <select
                    required
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Assignment --</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.courseTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Your Solution / Code / Response *</label>
                  <textarea
                    required
                    rows={5}
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                    placeholder="Type or paste your submission answer here..."
                    className="w-full bg-gray-900 text-white text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingAssignment}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg shadow-lg shadow-blue-500/20 flex items-center gap-2"
                  >
                    {submittingAssignment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submittingAssignment ? 'Evaluating...' : 'Submit & Grade with AI'}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400" /> My Courses</h3>
              {studentCourseProgress.length > 0 ? (
                <div className="space-y-4">
                  {studentCourseProgress.map((course) => (
                    <div key={course.courseId} className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-white">{course.courseTitle}</h4>
                        <span className="text-xs text-emerald-300 font-semibold">{course.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${course.progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{course.completedLessons}/{course.totalLessons} lessons complete</span>
                        <span>{course.completedAt ? 'Completed' : 'In progress'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-sm text-gray-400">
                  You have not enrolled in any courses yet.
                </div>
              )}
            </div>

            {/* Student's Past Submissions */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-white">Your Past Submissions & AI Feedback</h3>
              {submissions.map((sub) => (
                <div key={sub.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{sub.assignmentTitle}</h4>
                    {sub.grade !== null && (
                      <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        Score: {sub.grade}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    {sub.content}
                  </p>
                  {sub.aiFeedback && (
                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                      <strong className="block text-purple-300 mb-1">🤖 AI Feedback:</strong>
                      {sub.aiFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> My Learning Progress</h2>
            <div className="space-y-4">
              {studentCourseProgress.length > 0 ? (
                studentCourseProgress.map((course) => (
                  <div key={course.courseId} className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-bold text-white">{course.courseTitle}</h4>
                      <span className="text-xs text-emerald-300 font-semibold">{course.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${course.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{course.completedLessons}/{course.totalLessons} lessons completed</span>
                      {course.completedAt ? <span>Completed</span> : <span>In progress</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-sm text-gray-400">
                  Enroll in a course to start tracking your lessons and progress.
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-white mt-6">Available Courses</h2>
            <div className="space-y-4">
              {coursesList.slice(0, 3).map((c) => (
                <div key={c.id} className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-2">
                  <h4 className="text-sm font-bold text-white">{c.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CourseFormModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSuccess={() => showSuccess('Course created and auto-filled with AI-generated curriculum. Updates reflected below.')}
        initialData={editingCourse}
        categories={categories}
        onOpenAiGenerator={() => setIsAiModalOpen(true)}
      />

      <AiCourseGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onCreatedSuccess={() => showSuccess('AI-generated course saved and published. Dashboard updated automatically.')}
        categories={categories}
      />
    </div>
  );
}
