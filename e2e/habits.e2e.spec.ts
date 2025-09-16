import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

const login = async (page: any) => {
  await page.goto(`${baseURL}/login`);
  await page.getByTestId('login-email').fill('habits@example.com');
  await page.getByTestId('login-password').fill('Example123!');
  await page.getByTestId('login-submit').click();
};

test.describe('Seguimiento de hábitos', () => {
  test('registrar hábitos incrementa puntos diarios', async ({ page }) => {
    await login(page);
    await page.goto(`${baseURL}/dashboard`);
    await page.getByTestId('habit-training').check();
    await page.getByTestId('habit-meditation').check();
    await expect(page.getByTestId('daily-points')).toContainText('2');
  });

  test('registro de pasos rechaza valores inválidos', async ({ page }) => {
    await login(page);
    await page.goto(`${baseURL}/dashboard`);
    await page.getByTestId('steps-input').fill('99999');
    await page.getByTestId('steps-submit').click();
    await expect(page.getByRole('alert')).toContainText('50k');
  });
});
