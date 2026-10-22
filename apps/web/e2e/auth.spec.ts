import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3001);
const ADMIN_URL = `http://admin.localhost:${WEB_PORT}`;
const PASSWORD = 'correct-horse-9';
const stamp = Date.now();
const uniqueEmail = (tag: string) => `e2e-${tag}-${stamp}@example.com`;

test.describe('locale routing', () => {
  test('/ redirects to /az', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/az$/);
    await expect(page.getByRole('link', { name: 'Qeydiyyat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daxil ol' })).toBeVisible();
  });

  test('/fr is a 404, not a 500', async ({ page }) => {
    const res = await page.goto('/fr');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('404')).toBeVisible();
  });

  test('/fr/login is a 404, not a 500', async ({ page }) => {
    const res = await page.goto('/fr/login');
    expect(res?.status()).toBe(404);
  });

  test('/en shows English copy and the switch persists in the URL', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
    await page.locator('.lang').getByRole('link', { name: 'AZ' }).click();
    await expect(page).toHaveURL(/\/az$/);
    await expect(page.getByRole('link', { name: 'Qeydiyyat' })).toBeVisible();
  });
});

test.describe('user cabinet', () => {
  test('register, cabinet shows email, logout, login page', async ({ page }) => {
    const email = uniqueEmail('reg');
    await page.goto('/az/register');
    await page.getByLabel('E-poçt').fill(email);
    await page.getByLabel('Şifrə').fill(PASSWORD);
    await page.getByRole('button', { name: 'Hesab yarat' }).click();
    await expect(page).toHaveURL(/\/az\/cabinet$/);
    await expect(page.getByTestId('user-email')).toHaveText(email);

    await page.getByRole('button', { name: 'Çıxış' }).click();
    await expect(page).toHaveURL(/\/az\/login$/);

    // Cookie is gone: cabinet bounces back to login.
    await page.goto('/az/cabinet');
    await expect(page).toHaveURL(/\/az\/login$/);
  });

  test('duplicate email shows an error', async ({ page, request }) => {
    const email = uniqueEmail('dup');
    const first = await request.post('/api/auth/register', { data: { email, password: PASSWORD } });
    expect(first.status()).toBe(201);
    await page.goto('/en/register');
    await page.getByLabel('Email').fill(email.toUpperCase());
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('p.error')).toHaveText('This email is already in use.');
  });

  test('login with an existing user', async ({ page, request }) => {
    const email = uniqueEmail('login');
    await request.post('/api/auth/register', { data: { email, password: PASSWORD } });
    await page.goto('/az/login');
    await page.getByLabel('E-poçt').fill(email);
    await page.getByLabel('Şifrə').fill(PASSWORD);
    await page.getByRole('button', { name: 'Daxil ol' }).click();
    await expect(page).toHaveURL(/\/az\/cabinet$/);
  });

  test('cabinet without a session redirects to login', async ({ page }) => {
    await page.goto('/en/cabinet');
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});

test.describe('admin area is unreachable on the web host', () => {
  for (const p of ['/admin', '/admin/', '/admin/anything', '/ADMIN']) {
    test(`localhost ${p} is 404 and shows no admin UI`, async ({ page }) => {
      const res = await page.goto(p);
      expect(res?.status()).toBe(404);
      await expect(page.getByText('Admin panel')).toHaveCount(0);
      await expect(page.getByText('Admin giriş')).toHaveCount(0);
    });
  }

  test('/az/admin is 404', async ({ page }) => {
    const res = await page.goto('/az/admin');
    expect(res?.status()).toBe(404);
  });
});

test.describe('admin area (admin host)', () => {
  test('unauthenticated shows admin login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/`);
    await expect(page.getByRole('heading', { name: 'Admin giriş' })).toBeVisible();
  });

  test('normal user sees İcazə yoxdur', async ({ page, request }) => {
    const email = uniqueEmail('plain');
    const reg = await request.post('/api/auth/register', { data: { email, password: PASSWORD } });
    expect(reg.status()).toBe(201);
    await page.goto(`${ADMIN_URL}/`);
    await page.getByLabel('E-poçt').fill(email);
    await page.getByLabel('Şifrə').fill(PASSWORD);
    await page.getByRole('button', { name: 'Daxil ol' }).click();
    await expect(page.getByRole('heading', { name: 'İcazə yoxdur' })).toBeVisible();
    await expect(page.getByText('Admin panel')).toHaveCount(0);
  });

  test('admin sees Admin panel', async ({ page }) => {
    const email = uniqueEmail('admin');
    execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'api', 'create-admin', '--email', email, '--password', PASSWORD],
      { cwd: path.resolve(__dirname, '../../..'), stdio: 'pipe' },
    );
    await page.goto(`${ADMIN_URL}/`);
    await page.getByLabel('E-poçt').fill(email);
    await page.getByLabel('Şifrə').fill(PASSWORD);
    await page.getByRole('button', { name: 'Daxil ol' }).click();
    await expect(page.getByText('Admin panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: /İstifadəçilər/ })).toBeVisible();
  });

  test('locale-prefixed paths are not served on the admin host', async ({ page }) => {
    const res = await page.goto(`${ADMIN_URL}/az`);
    expect(res?.status()).toBe(404);
  });
});
