import { getDb } from './index';
import { users, categories, courses, modules, lessons, enrollments, assignments, submissions } from './schema';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const db = getDb();

  console.log('🌱 Seeding EduTrack database...');

  // Hash default demo password
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Categories
  const insertedCategories = await db.insert(categories).values([
    { name: 'Web Development', slug: 'web-development', description: 'Full-stack web applications, APIs, and modern frameworks', icon: 'Code' },
    { name: 'Data Science & AI', slug: 'data-science-ai', description: 'Machine learning, deep learning, and AI engineering', icon: 'Cpu' },
    { name: 'Cloud & DevOps', slug: 'cloud-devops', description: 'Docker, Kubernetes, AWS, CI/CD pipelines and infrastructure', icon: 'Cloud' },
    { name: 'Cybersecurity', slug: 'cybersecurity', description: 'Network security, ethical hacking, and secure coding practices', icon: 'ShieldCheck' },
    { name: 'AI', slug: 'ai', description: 'Artificial intelligence, generative AI, machine learning, and intelligent applications', icon: 'Sparkles' },
    { name: 'Mobile Apps', slug: 'mobile-apps', description: 'iOS, Android, Flutter, React Native, and cross-platform mobile development', icon: 'Smartphone' },
  ]).onConflictDoNothing().returning();

  const webDevCat = insertedCategories.find(c => c.slug === 'web-development') || insertedCategories[0];
  const aiCat = insertedCategories.find(c => c.slug === 'data-science-ai') || insertedCategories[1];

  // 2. Seed Users
  const insertedUsers = await db.insert(users).values([
    {
      name: 'Dr. Sarah Connor (Admin)',
      email: 'admin@edutrack.com',
      passwordHash: defaultPassword,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'Prof. Alex Rivera (Instructor)',
      email: 'instructor@edutrack.com',
      passwordHash: defaultPassword,
      role: 'INSTRUCTOR',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    },
    {
      name: 'Jordan Lee (Student)',
      email: 'student@edutrack.com',
      passwordHash: defaultPassword,
      role: 'STUDENT',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    },
  ]).onConflictDoNothing().returning();

  const instructorUser = insertedUsers.find(u => u.role === 'INSTRUCTOR') || insertedUsers[1];
  const studentUser = insertedUsers.find(u => u.role === 'STUDENT') || insertedUsers[2];

  if (!instructorUser || !studentUser) {
    console.log('Users already seeded or skipping details');
    return;
  }

  // 3. Seed Courses
  const insertedCourses = await db.insert(courses).values([
    {
      title: 'Next.js 16 & TypeScript Masterclass: Enterprise Fullstack Engineering',
      slug: 'nextjs-16-typescript-masterclass',
      description: 'Master server-side rendering, App Router, Drizzle ORM PostgreSQL integration, Zod schema validation, and deployment strategies for high-scale applications.',
      instructorId: instructorUser.id,
      categoryId: webDevCat?.id,
      level: 'ADVANCED',
      status: 'PUBLISHED',
      price: 99,
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Generative AI & LLM Systems Development with Node.js & Gemini',
      slug: 'generative-ai-llm-systems-node-gemini',
      description: 'Build production-grade AI agents, prompt pipelines, semantic search, dynamic UI streaming, and automated grading features using the Google Gemini SDK.',
      instructorId: instructorUser.id,
      categoryId: aiCat?.id,
      level: 'INTERMEDIATE',
      status: 'PUBLISHED',
      price: 89,
      thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Fullstack Security, RBAC & Cloud Deployment Strategies',
      slug: 'fullstack-security-rbac-cloud-deployment',
      description: 'Implement robust authentication with JWTs, fine-grained access control, input sanitization, CSRF prevention, and automated CI/CD deployment pipelines.',
      instructorId: instructorUser.id,
      categoryId: webDevCat?.id,
      level: 'BEGINNER',
      status: 'PUBLISHED',
      price: 49,
      thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    },
  ]).onConflictDoNothing().returning();

  const primaryCourse = insertedCourses[0];
  if (!primaryCourse) return;

  // 4. Seed Modules
  const insertedModules = await db.insert(modules).values([
    {
      courseId: primaryCourse.id,
      title: 'Module 1: Next.js 16 App Router & Server Components Architecture',
      description: 'Deep dive into asynchronous layouts, server components, and streaming.',
      order: 1,
    },
    {
      courseId: primaryCourse.id,
      title: 'Module 2: Relational Schema Design & Drizzle ORM with PostgreSQL',
      description: 'Database migrations, table relationships, indexing, and seed scripts.',
      order: 2,
    },
  ]).onConflictDoNothing().returning();

  const mod1 = insertedModules[0];
  if (mod1) {
    // 5. Seed Lessons
    await db.insert(lessons).values([
      {
        moduleId: mod1.id,
        title: 'Understanding Async Params & Dynamic Route Handlers in Next.js 16',
        content: 'Explores the async signatures required in Next.js 16 route handlers and server components.',
        durationMinutes: 20,
        order: 1,
        isFree: true,
      },
      {
        moduleId: mod1.id,
        title: 'Building Type-Safe API Contracts with Zod & Drizzle',
        content: 'How to sanitize incoming request bodies and map Drizzle schemas into type-safe forms.',
        durationMinutes: 25,
        order: 2,
        isFree: false,
      },
    ]);
  }

  // 6. Seed Assignments
  const insertedAssignments = await db.insert(assignments).values([
    {
      courseId: primaryCourse.id,
      title: 'Assignment 1: Build a Secure Next.js 16 Middleware & RBAC System',
      instructions: 'Create a custom JWT verification middleware that inspects request cookies and enforces role checks for /admin and /instructor dashboard paths.',
      maxPoints: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  ]).onConflictDoNothing().returning();

  // 7. Seed Student Enrollment & Submission
  await db.insert(enrollments).values([
    {
      studentId: studentUser.id,
      courseId: primaryCourse.id,
      progress: 45,
    },
  ]).onConflictDoNothing();

  const assignment1 = insertedAssignments[0];
  if (assignment1) {
    await db.insert(submissions).values([
      {
        assignmentId: assignment1.id,
        studentId: studentUser.id,
        content: 'Implemented Next.js 16 middleware using the Jose library to verify JWTs stored in HttpOnly cookies. Created custom role assertions for STUDENT, INSTRUCTOR, and ADMIN role paths.',
        grade: 92,
        aiFeedback: 'Excellent work! The token extraction from HTTP cookies is robust and standard jose error handling is applied correctly.',
        gradedAt: new Date(),
      },
    ]).onConflictDoNothing();
  }

  console.log('✅ EduTrack database seeding completed successfully!');
}

// Run directly if called via CLI. Guard `require` because Next.js route bundling
// can import this module in environments where CommonJS globals are unavailable.
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}
