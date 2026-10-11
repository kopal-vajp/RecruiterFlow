import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('SauceDemo UI Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('valid login: standard user sees products', async ({ page }) => {
    await loginPage.login('standard_user');
    const title = page.getByTestId('title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Products');
  });

  test('locked-out user sees an error message', async ({ page }) => {
    await loginPage.login('locked_out_user');
    const errorMsg = page.getByTestId('error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('locked out');
  });

  test('add to cart updates the cart badge', async ({ page }) => {
    await loginPage.login('standard_user');
    
    // Add backpack to the cart
    await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
    
    const cartBadge = page.getByTestId('shopping-cart-badge');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText('1');

    // Bonus: Remove product and verify badge disappears
    await page.getByTestId('remove-sauce-labs-backpack').click();
    await expect(cartBadge).toBeHidden();
  });

  test('bonus: log out and return to login page', async ({ page }) => {
    await loginPage.login('standard_user');
    
    // Open the side menu and click logout
    await page.getByRole('button', { name: 'Open Menu' }).click();
    await page.getByTestId('logout-sidebar-link').click();
    
    // Verify we are back on the login page
    await expect(page.getByTestId('login-button')).toBeVisible();
  });
});
