import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Page Load', () => {
  const pages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Setup', path: '/setup' },
    { name: 'Store', path: '/store' },
    { name: 'Settings', path: '/settings' },
  ];

  for (const pageInfo of pages) {
    test(`Page "${pageInfo.name}" should load without crashing`, async ({ page }) => {
      // Catch console errors
      const errors: string[] = [];
      page.on('pageerror', (exception) => {
        errors.push(exception.message);
      });

      console.log(`Navigating to ${pageInfo.path}...`);
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

      // Check for common error indicators in Next.js
      const bodyText = await page.innerText('body');
      
      // We don't want to see "Application error: a client-side exception has occurred"
      expect(bodyText).not.toContain('Application error');
      expect(bodyText).not.toContain('Unhandled Runtime Error');
      
      // Check for console errors collected
      expect(errors).toHaveLength(0);

      // Verify the page has some content (not a blank screen)
      const content = await page.locator('body').innerHTML();
      expect(content.length).toBeGreaterThan(100);

      // Neo-Brutalist check: ensure we see some sharp borders or buttons
      // (This is a loose check but ensures the CSS loaded somewhat)
      const borderCheck = await page.locator('.border-black, .border-4').count();
      // Most pages should have at least some brutalist elements
      if (pageInfo.name !== 'Login' && pageInfo.name !== 'Setup') {
        expect(borderCheck).toBeGreaterThan(0);
      }
    });
  }
});
