import { chromium } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5174';
const evidence = '/Users/useroctopus-tech.com/.agents/ui-fix-canvas/bhss-mvp';
const browser = await chromium.launch({ headless: true });

async function signIn(page, name) {
  await page.goto(`${baseURL}/?lang=en`);
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.locator('.topbar').getByText(name, { exact: true }).waitFor();
}

const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const admin = await adminContext.newPage();
await signIn(admin, 'System Administrator');
await admin.locator('nav').getByRole('button', { name: 'Data operations' }).click();
await admin.locator('.data-domain-grid').getByRole('button', { name: /Skill rubrics/ }).click();
await admin.locator('.rubric-package-heading').getByText('definition_only').waitFor();
if (await admin.locator('.rubric-package-layout > aside > button').count() !== 2) throw new Error('Expected two real rubric catalogues');
await admin.screenshot({ path: `${evidence}/rubric-versioning-live-admin.png`, fullPage: true });
await admin.locator('nav').getByRole('button', { name: 'School controls' }).click();
await admin.getByText('RUB-SB-UF2 · definition only · 8 skills · 128 steps').waitFor();
await admin.screenshot({ path: `${evidence}/rubric-versioning-live-policy.png`, fullPage: true });

const studentContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const student = await studentContext.newPage();
await signIn(student, 'Alex Lam');
await student.locator('nav').getByRole('button', { name: 'Portfolio editor' }).click();
await student.locator('.working-version-panel').getByText(/Pinned rubric.*RUB-SB-UF2/).waitFor();
await student.screenshot({ path: `${evidence}/rubric-versioning-live-editor.png`, fullPage: true });
await student.locator('nav').getByRole('button', { name: 'Published Portfolio' }).click();
await student.locator('.portfolio-visual-sheet').getByText(/Pinned rubric.*RUB-SB-UF2/).waitFor();
await student.screenshot({ path: `${evidence}/rubric-versioning-live-published.png`, fullPage: true });

const reviewerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const reviewer = await reviewerContext.newPage();
await signIn(reviewer, 'Lee Wai Man');
await reviewer.locator('nav').getByRole('button', { name: 'Portfolio review' }).click();
await reviewer.locator('.portfolio-detail').getByText(/Pinned rubric.*RUB-SB-UF2/).first().waitFor();
await reviewer.screenshot({ path: `${evidence}/rubric-versioning-live-review.png`, fullPage: true });

console.log(JSON.stringify({
  admin: { catalogues: 2, active: 'RUB-SB-UF2', skills: 8, steps: 128 },
  student: { editorPinned: true, publishedPinned: true },
  reviewer: { reviewPinned: true },
  screenshots: ['rubric-versioning-live-admin.png','rubric-versioning-live-policy.png','rubric-versioning-live-editor.png','rubric-versioning-live-published.png','rubric-versioning-live-review.png'],
}, null, 2));

await browser.close();
