import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { addDays, today } from "../../src/lib/time";
const run = `e2e-${Date.now()}`;
const customerEmail = `${run}-customer@example.com`;
const ownerEmail = `${run}-owner@example.com`;
const origin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000")
  .origin;
async function login(page: Page, email: string, callback = "/randevularim") {
  await page.goto(`/giris?callbackUrl=${encodeURIComponent(callback)}`);
  await page.getByText("Geliştirici girişi · yalnızca yerel ortam").click();
  await page.getByLabel("Adın", { exact: true }).fill("E2E Test Kullanıcı");
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Geliştirici olarak giriş yap" })
    .click();
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
}
test.afterAll(() => {
  execFileSync(process.execPath, [
    "--import",
    "tsx",
    "scripts/cleanup-e2e.ts",
    customerEmail,
    ownerEmail,
  ]);
});
test("desktop and mobile discovery, real map and filter state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /İyi bir kesim/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.goto("/kesfet");
  await page.getByLabel("Berber veya hizmet ara").fill("Moda");
  await expect(page.locator(".shop-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Harita", exact: true }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /İyi bir kesim/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("anonymous mutations and wrong-origin requests are denied", async ({
  request,
}) => {
  const anonymous = await request.post("/api/owner", {
    headers: { origin },
    data: {},
  });
  expect(anonymous.status()).toBe(401);
  const forgery = await request.post("/api/appointments", {
    headers: { origin: "https://invalid.example" },
    data: {},
  });
  expect(forgery.status()).toBe(403);
  expect((await request.post("/api/cron/notifications")).status()).toBe(401);
});
test("customer books, cannot book twice, cancels, favorites and mobile booking", async ({
  page,
}) => {
  await login(page, customerEmail);
  await page.goto("/berber/demo-moda-berber");
  await page.getByLabel("Randevu tarihi").fill(addDays(today(), 2));
  await page.locator(".slots button").first().click();
  await page.getByRole("button", { name: "Randevuyu onayla" }).click();
  await expect(page).toHaveURL(/randevularim\?created=1/);
  await expect(page.getByRole("status")).toContainText("Randevun oluşturuldu");
  await page.goto("/berber/demo-karakoy-tiras");
  await page.getByLabel("Randevu tarihi").fill(addDays(today(), 2));
  await page.locator(".slots button").first().click();
  await page.getByRole("button", { name: "Randevuyu onayla" }).click();
  await expect(page.locator(".booking-panel").getByRole("alert")).toContainText(
    "Günde yalnızca 1 aktif randevu",
  );
  await page.goto("/randevularim");
  await page.getByRole("button", { name: "Randevuyu iptal et" }).click();
  await page.getByLabel("İptal nedeni").fill("E2E kontrolü");
  await page.getByRole("button", { name: "Onayla", exact: true }).click();
  await expect(page.locator(".status")).toContainText("İptal edildi");
  await page.goto("/berber/demo-moda-berber");
  await page.getByRole("button", { name: "Favorilere ekle" }).click();
  await expect(
    page.getByRole("button", { name: "Favorilerden çıkar" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/booking-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("owner creates shop, services and staff; customer cannot mutate it", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, ownerEmail, "/panel/kurulum");
  await page.getByLabel("İşletme adı", { exact: true }).fill(`E2E ${run}`);
  await page.getByLabel("İletişim telefonu").fill("+90 555 000 00 00");
  await page
    .getByLabel("İşletmeni tanıt")
    .fill("Otomatik uçtan uca doğrulama işletmesi.");
  await page.getByRole("button", { name: "Konuma geç" }).click();
  await page.getByLabel("Şehir", { exact: true }).fill("İstanbul");
  await page.getByLabel("İlçe", { exact: true }).fill("Kadıköy");
  await page.getByLabel("Açık adres").fill("E2E test adresi 123");
  await page.getByRole("button", { name: "İşletmemi oluştur" }).click();
  await expect(page).toHaveURL(/tab=services/);
  const shopId = new URL(page.url()).searchParams.get("shop")!;
  await page.getByLabel("Hizmet adı").fill("E2E Saç kesimi");
  await page.getByLabel("Fiyat (₺)").fill("450");
  await page.getByRole("button", { name: "Hizmet ekle", exact: true }).click();
  await expect(page.locator(".resource-item summary")).toContainText(
    "E2E Saç kesimi",
  );
  await page.getByRole("link", { name: "Ustalar", exact: true }).click();
  await page.getByLabel("Ustanın adı soyadı").fill("E2E Usta");
  await page.getByRole("button", { name: "Usta ekle", exact: true }).click();
  await expect(page.locator(".resource-item>summary")).toContainText(
    "E2E Usta",
  );
  await page
    .getByRole("link", { name: "Randevu takvimi", exact: true })
    .click();
  await expect(
    page.locator(".agenda-head").filter({ hasText: "E2E Usta" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/panel-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/panel-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, customerEmail);
  const response = await other.request.post(`${origin}/api/owner/${shopId}`, {
    headers: { origin },
    data: { action: "staff", data: { name: "Injected", title: "Berber" } },
  });
  expect(response.status()).toBe(404);
  await other.close();
  expect(errors).toEqual([]);
});
