import { test, expect } from "@playwright/test";

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.skip(
  !EMAIL || !PASSWORD,
  "Provide TEST_USER_EMAIL and TEST_USER_PASSWORD in env",
);

test("Mobile: открытие/закрытие шторки транзакции", async ({ page }) => {
  // Мобайл вьюпорт
  await page.setViewportSize({ width: 390, height: 844 });

  // Логин
  await page.goto("/en");
  await page.getByPlaceholder("Email").fill(EMAIL!);
  await page.getByPlaceholder("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Переход на транзакции
  await page.goto("/en/transactions");

  // Открываем через глобальный эвент (универсальный триггер)
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("transactions:add")),
  );

  // Проверяем, что шторка видна
  await expect(page.locator(".transaction-modal")).toBeVisible();

  // Закрываем шторку кнопкой Close
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".transaction-modal")).toHaveCount(0);
});

test("Mobile: вложенная шторка календаря", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/en");
  await page.getByPlaceholder("Email").fill(EMAIL!);
  await page.getByPlaceholder("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.goto("/en/transactions");
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("transactions:add")),
  );

  // Открыть календарь
  await page
    .getByRole("button", { name: /Pick a date|Choose date|Pick up the date/i })
    .click();

  // Заголовок вложенной шторки
  await expect(
    page.getByRole("heading", { name: /Choose date/i }),
  ).toBeVisible();

  // Закрыть вложенную шторку через "Cancel"
  await page.getByRole("button", { name: /Cancel/i }).click();

  // Родительская форма всё ещё открыта
  await expect(page.locator(".transaction-modal")).toBeVisible();
});
