import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

const loginAs = async (page: any, email: string, password: string) => {
  await page.goto(`${baseURL}/login`);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/dashboard/);
};

test.describe('Acceso a planes y entitlements', () => {
  test('usuario sin plan ve upsell controlado', async ({ page }) => {
    await loginAs(page, 'noplan@example.com', 'Example123!');
    await page.goto(`${baseURL}/dashboard`);
    await expect(page.getByTestId('upsell-card')).toBeVisible();
    await expect(page.getByTestId('upsell-card')).toContainText('Plan Totum');
  });

  test('admin puede navegar a gestión de planes', async ({ page }) => {
    await loginAs(page, 'admin@example.com', 'Example123!');
    await page.goto(`${baseURL}/admin/plans`);
    await expect(page.getByRole('heading', { name: /gestión de planes/i })).toBeVisible();
  });
});
