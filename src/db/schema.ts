import { pgTable, text, timestamp, integer, boolean, pgEnum, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['ADMIN', 'INSTRUCTOR', 'STUDENT']);
export const courseLevelEnum = pgEnum('course_level', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const courseStatusEnum = pgEnum('course_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('STUDENT').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories Table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Courses Table
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  instructorId: uuid('instructor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  level: courseLevelEnum('level').default('BEGINNER').notNull(),
  status: courseStatusEnum('status').default('DRAFT').notNull(),
  price: integer('price').default(0).notNull(), // in USD
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Modules Table
export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Lessons Table
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  videoUrl: text('video_url'),
  durationMinutes: integer('duration_minutes').default(15).notNull(),
  order: integer('order').default(1).notNull(),
  isFree: boolean('is_free').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Enrollments Table
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  progress: integer('progress').default(0).notNull(), // percentage 0-100
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  // Stripe payment tracking
  paymentStatus: text('payment_status').default('FREE').notNull(), // 'FREE' | 'PENDING' | 'PAID'
  stripeSessionId: text('stripe_session_id'),
}, (table) => ({
  studentCourseUnique: uniqueIndex('enrollments_student_course_unique').on(table.studentId, table.courseId),
}));

// Stores durable lesson completion state for each enrolled student.
export const lessonCompletions = pgTable('lesson_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  // Allow null initially so we can create a placeholder record at enrollment time
  // and set `completedAt` when the student actually completes the lesson.
  completedAt: timestamp('completed_at'),
}, (table) => ({
  studentLessonUnique: uniqueIndex('lesson_completions_student_lesson_unique').on(table.studentId, table.lessonId),
}));

// Tracks per-lesson progress for each student (created at enrollment time).
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('NOT_STARTED').notNull(), // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  lastViewedAt: timestamp('last_viewed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  studentLessonProgressUnique: uniqueIndex('lesson_progress_student_lesson_unique').on(table.studentId, table.lessonId),
}));

// Assignments Table
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  instructions: text('instructions').notNull(),
  maxPoints: integer('max_points').default(100).notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Submissions Table
export const submissions = pgTable('submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').references(() => assignments.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  grade: integer('grade'),
  aiFeedback: text('ai_feedback'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  gradedAt: timestamp('graded_at'),
});

// AI Usage Logs Table
export const aiLogs = pgTable('ai_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  promptType: text('prompt_type').notNull(), // e.g., 'COURSE_OUTLINE', 'ASSIGNMENT_FEEDBACK'
  promptText: text('prompt_text').notNull(),
  responseContent: text('response_content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relations Definitions
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  lessonCompletions: many(lessonCompletions),
  lessonProgress: many(lessonProgress),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
  }),
  modules: many(modules),
  enrollments: many(enrollments),
  assignments: many(assignments),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
}));

export const lessonCompletionsRelations = relations(lessonCompletions, ({ one }) => ({
  student: one(users, {
    fields: [lessonCompletions.studentId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonCompletions.lessonId],
    references: [lessons.id],
  }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(users, {
    fields: [lessonProgress.studentId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
}));
