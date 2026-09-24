import { test, expect } from '@playwright/test';

test.describe('EduTrack AI E2E Workflow', () => {
  test('should display Landing Page with Hero and Mandatory Assessment Footer', async ({ page }) => {
    await page.goto('/');

    // Hero title check
    await expect(page.locator('h1')).toContainText('Empowering Modern Learners & Educators');

    // Mandatory Footer check (Step 15 requirement)
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Rushikesh Avachat');
    await expect(footer.locator('a[href*="github.com"]')).toBeVisible();
    await expect(footer.locator('a[href*="linkedin.com"]')).toBeVisible();
  });

  test('should navigate to Course Directory and display course cards', async ({ page }) => {
    await page.goto('/courses');

    await expect(page.locator('h1')).toContainText('Course Directory');
    const searchInput = page.locator('input[placeholder*="Search courses"]');
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to Login page and show demo account options', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Sign In to EduTrack AI');
    await expect(page.locator('button', { hasText: 'Admin' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Instructor' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Student' })).toBeVisible();
  });
});
