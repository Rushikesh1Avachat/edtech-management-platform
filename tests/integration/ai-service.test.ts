import { describe, it, expect } from 'vitest';
import { generateCourseOutline, generateAssignmentFeedback } from '@/lib/ai';

describe('AI Service Integration Tests', () => {
  it('should generate structured course outline with modules', async () => {
    const outline = await generateCourseOutline('GraphQL API Architecture', 'INTERMEDIATE', 2);

    expect(outline).toBeDefined();
    expect(outline.courseTitle).toContain('GraphQL API Architecture');
    expect(outline.modules.length).toBe(2);
    expect(outline.modules[0].lessons.length).toBeGreaterThan(0);
  });

  it('should generate automated submission feedback and grade', async () => {
    const feedback = await generateAssignmentFeedback(
      'Next.js 16 Middleware Setup',
      'Implement custom JWT verification in middleware.',
      'Created custom middleware verifying HttpOnly token cookie with Jose library.'
    );

    expect(feedback).toBeDefined();
    expect(feedback.suggestedGrade).toBeGreaterThanOrEqual(70);
    expect(feedback.feedbackText.length).toBeGreaterThan(10);
  });
});
