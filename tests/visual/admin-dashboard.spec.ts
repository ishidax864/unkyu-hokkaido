import { test, expect } from '@playwright/test';

test.describe('Admin Crawler Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // In a real environment, we would need to be logged in as admin
        // For this test, we navigate to the page and check the structure
        await page.goto('/admin/crawler');
    });

    test('should display the dashboard title', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Crawler & Accuracy Monitoring' })).toBeVisible();
    });

    test('should show core metric cards', async ({ page }) => {
        await expect(page.getByText('Mean Accuracy')).toBeVisible();
        await expect(page.getByText('Accuracy Lift')).toBeVisible();
        await expect(page.getByText('Data Points')).toBeVisible();
    });

    test('should have a refresh button', async ({ page }) => {
        const refreshBtn = page.getByRole('button', { name: 'Refresh' });
        await expect(refreshBtn).toBeVisible();
        await expect(refreshBtn).toHaveClass(/bg-slate-800/); // Corrected style check
    });

    test('should display the crawler status section', async ({ page }) => {
        await expect(page.getByText('JR Crawler Health Status')).toBeVisible();
    });
});
