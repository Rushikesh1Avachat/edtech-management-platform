import { describe, it, expect } from 'vitest';
import { calculateProgressPercent } from '@/lib/course-progress';

describe('course progress helpers', () => {
  it('returns 0 when there are no lessons', () => {
    expect(calculateProgressPercent(0, 0)).toBe(0);
  });

  it('calculates the correct completion percentage', () => {
    expect(calculateProgressPercent(2, 4)).toBe(50);
  });

  it('caps the progress at 100 percent', () => {
    expect(calculateProgressPercent(10, 4)).toBe(100);
  });
});
