import { describe, it, expect } from 'vitest';
import { registerSchema, courseSchema, generateCourseAiSchema } from '@/lib/validations';

describe('Zod Validation Schemas', () => {
  it('should validate correct user registration payload', () => {
    const validData = {
      name: 'Jane Doe',
      email: 'jane@edutrack.com',
      password: 'securepassword123',
      role: 'INSTRUCTOR',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email in registration', () => {
    const invalidData = {
      name: 'Jane Doe',
      email: 'not-an-email',
      password: '123',
      role: 'STUDENT',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate course creation schema', () => {
    const validCourse = {
      title: 'Next.js 16 Architecture Masterclass',
      description: 'Comprehensive guide to building production-ready apps with App Router.',
      level: 'ADVANCED',
      status: 'PUBLISHED',
      price: 99,
    };

    const result = courseSchema.safeParse(validCourse);
    expect(result.success).toBe(true);
  });

  it('should validate AI course prompt schema', () => {
    const validAiPrompt = {
      topic: 'Kubernetes & Docker Microservices',
      level: 'INTERMEDIATE',
      numModules: 4,
    };

    const result = generateCourseAiSchema.safeParse(validAiPrompt);
    expect(result.success).toBe(true);
  });
});
