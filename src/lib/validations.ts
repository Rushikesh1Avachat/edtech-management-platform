import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']).default('STUDENT'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const courseModuleInputSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
  description: z.string().optional(),
  lessons: z.array(
    z.object({
      title: z.string().min(1, 'Lesson title is required'),
      content: z.string().optional().default(''),
      durationMinutes: z.coerce.number().int().min(1).default(15),
      isFree: z.boolean().default(false),
    })
  ).optional(),
});

export const courseAssignmentInputSchema = z.object({
  title: z.string().min(3, 'Assignment title is required'),
  instructions: z.string().min(10, 'Assignment instructions are required'),
  maxPoints: z.coerce.number().int().min(1).max(100).default(100),
  dueDate: z.string().optional(),
});

export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().optional().nullable(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater').default(0),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  modules: z.array(courseModuleInputSchema).optional(),
  assignments: z.array(courseAssignmentInputSchema).optional(),
});

export const moduleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, 'Module title must be at least 2 characters'),
  description: z.string().optional(),
  order: z.coerce.number().int().min(1).default(1),
});

export const lessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2, 'Lesson title is required'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  videoUrl: z.string().url().optional().or(z.literal('')),
  durationMinutes: z.coerce.number().int().min(1).default(15),
  order: z.coerce.number().int().min(1).default(1),
  isFree: z.boolean().default(false),
});

export const assignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(3, 'Assignment title is required'),
  instructions: z.string().min(10, 'Instructions are required'),
  maxPoints: z.coerce.number().int().min(1).default(100),
  dueDate: z.string().optional(),
});

export const submissionSchema = z.object({
  assignmentId: z.string().uuid(),
  content: z.string().min(10, 'Submission content must be at least 10 characters'),
});

export const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().min(0).max(100),
  aiFeedback: z.string().optional(),
});

export const generateCourseAiSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  numModules: z.coerce.number().int().min(1).max(6).default(3),
});

export const generateFeedbackAiSchema = z.object({
  assignmentTitle: z.string(),
  instructions: z.string(),
  submissionContent: z.string().min(5),
});

export const generateAssignmentAiSchema = z.object({
  courseId: z.string().uuid(),
});
