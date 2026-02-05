import { test, expect } from '@playwright/test';

test.describe('メインページ（トップ）', () => {
    test('初期ロード時の表示が正しいこと', async ({ page }) => {
        // Navigate to the home page
        await page.goto('/');

        // Check key elements exist before screenshot
        await expect(page.locator('h1')).toContainText('運休AI');
        await expect(page.getByRole('button', { name: '路線を検索' })).toBeVisible();

        // Take snapshot
        await expect(page).toHaveScreenshot('home-page-initial.png');
    });

    test('検索フォームの操作フロー', async ({ page }) => {
        await page.goto('/');

        // Select date (today)
        const dateInput = page.locator('input[type="date"]');
        await expect(dateInput).toBeVisible();

        // Check elements for desktop layout
        if (!await page.locator('button.md\\:hidden').isVisible()) { // if not mobile menu
            await expect(page.locator('header')).toBeVisible();
        }

        // Take snapshot of search form area specifically
        const searchForm = page.locator('form').first();
        await expect(searchForm).toBeVisible();
        await expect(searchForm).toHaveScreenshot('search-form-default.png');
    });
});
