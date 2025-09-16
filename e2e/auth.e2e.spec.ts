import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Flujo de Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByTestId('login-email').fill('qa@example.com');
    await page.getByTestId('login-password').fill('Example123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: /hola/i })).toBeVisible();
  });

  test('error de credenciales muestra mensaje accesible', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByTestId('login-email').fill('wrong@example.com');
    await page.getByTestId('login-password').fill('badpass');
    await page.getByTestId('login-submit').click();
    await expect(page.getByRole('alert')).toContainText('credenciales');
  });
});
