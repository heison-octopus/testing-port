import { test, expect } from '@playwright/test';
async function signIn(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/login');
  await page.waitForTimeout(750);
  await page.getByLabel('Email or in-school ID', {
    exact: true
  }).fill(email);
  await page.getByLabel('Password', {
    exact: true
  }).fill('demo-stage1');
  await page.getByRole('button', {
    name: 'Sign in',
    exact: true
  }).click();
  await expect(page.getByRole('heading', {
    name: 'Your workspace'
  })).toBeVisible();
  return {
    context,
    page
  };
}
test('Admin assigns class, teacher sees scope, admin ends assignment and inspects snapshots', async ({
  browser
}) => {
  const admin = await signIn(browser, 'admin@a.demo');
  const teacher = await signIn(browser, 'teacher@a.demo');
  await admin.page.getByRole('link', {
    name: 'People & assignments'
  }).click();
  await admin.page.getByRole('button', {
    name: 'Assignments for A teacher'
  }).click();
  await admin.page.getByLabel('Reason', {
    exact: true
  }).last().fill('Browser class assignment');
  await admin.page.getByRole('button', {
    name: 'Save assignment'
  }).click();
  await expect(admin.page.getByRole('status')).toHaveText('Assignment saved');
  await teacher.page.reload();
  await expect(teacher.page.getByRole('cell', {
    name: 'a-class',
    exact: true
  })).toBeVisible();
  const row = admin.page.getByRole('row').filter({
    has: admin.page.getByRole('cell', {
      name: 'a-class',
      exact: true
    })
  });
  await row.getByRole('textbox').fill('Browser end class');
  await row.getByRole('button', {
    name: 'End assignment'
  }).click();
  await expect(admin.page.getByRole('status')).toContainText('Assignment ended');
  await teacher.page.reload();
  await expect(teacher.page.getByRole('cell', {
    name: 'a-class',
    exact: true
  })).toHaveCount(0);
  await admin.page.getByRole('link', {
    name: 'Audit history'
  }).click();
  const old = admin.page.getByRole('row').filter({
    has: admin.page.getByRole('cell', {
      name: 'Browser class assignment',
      exact: true
    })
  }).first();
  await old.getByRole('button', {
    name: 'Inspect snapshot'
  }).click();
  await expect(admin.page.getByRole('heading', {
    name: 'Snapshot · Browser class assignment'
  })).toBeVisible();
  await expect(admin.page.locator('dd').filter({
    hasText: /^active$/
  })).toBeVisible();
  await admin.page.screenshot({
    path: 'test-results/admin-audit.png',
    fullPage: true
  });
  await teacher.page.screenshot({
    path: 'test-results/teacher-workspace.png',
    fullPage: true
  });
  await admin.context.close();
  await teacher.context.close();
});
test('student own identity and direct admin route denied, denied fixture and other school isolated', async ({
  browser
}) => {
  for (const email of ['student@a.demo', 'denied@a.demo', 'admin@b.demo']) {
    const {
      context,
      page
    } = await signIn(browser, email);
    if (email.startsWith('student')) {
      await expect(page.getByRole('heading', {
        name: 'A student'
      })).toBeVisible();
      await page.goto('/admin/people');
      await expect(page.getByRole('heading', {
        name: 'Access denied'
      })).toBeVisible();
    } else if (email.startsWith('denied')) {
      await expect(page.getByRole('alert')).toContainText('Permission required');
    } else {
      await page.getByRole('link', {
        name: 'People & assignments'
      }).click();
      await expect(page.getByRole('cell', {
        name: 'B teacher',
        exact: true
      })).toBeVisible();
      await expect(page.getByRole('cell', {
        name: 'A teacher',
        exact: true
      })).toHaveCount(0);
      const response = await page.request.get('/api/people/a-teacher');
      expect(response.status()).toBe(404);
    }
    await page.screenshot({
      path: `test-results/${email.split('@')[0]}-${email.includes('@b') ? 'b' : 'a'}.png`,
      fullPage: true
    });
    await context.close();
  }
});
test('Admin creates a person, labelled role and class; mobile layout remains usable', async ({
  browser
}) => {
  const {
    context,
    page
  } = await signIn(browser, 'admin@a.demo');
  const tag = Date.now().toString();
  await page.getByRole('link', {
    name: 'Academic structure'
  }).click();
  await page.getByLabel('Code', {
    exact: true
  }).fill('class-' + tag);
  await page.getByLabel('Name', {
    exact: true
  }).fill('Class ' + tag);
  await page.getByLabel('Parent academic year').selectOption('a-year');
  await page.getByLabel('Reason', {
    exact: true
  }).fill('Browser new class');
  await page.getByRole('button', {
    name: 'Save structure item'
  }).click();
  await expect(page.getByRole('cell', {
    name: 'Class ' + tag,
    exact: true
  })).toBeVisible();
  await page.getByRole('link', {
    name: 'Roles',
    exact: true
  }).click();
  await page.getByLabel('Code', {
    exact: true
  }).fill('role-' + tag);
  await page.getByLabel('English label').fill('Reviewer ' + tag);
  await page.getByLabel('Chinese label').fill('覆核員');
  await page.getByLabel('Permission profile').selectOption('teacher');
  await page.getByLabel('Reason', {
    exact: true
  }).fill('Browser role label');
  await page.getByRole('button', {
    name: 'Save role'
  }).click();
  await expect(page.getByRole('cell', {
    name: new RegExp('Reviewer ' + tag)
  })).toBeVisible();
  await page.getByRole('link', {
    name: 'People & assignments'
  }).click();
  await page.getByText('Add person', {
    exact: true
  }).click();
  await page.getByLabel('In-school ID').fill('student-' + tag);
  await page.getByLabel('Display name').fill('New student ' + tag);
  await page.getByLabel('Email', {
    exact: true
  }).fill(tag + '@fixture.demo');
  await page.locator('select[name="user_kind"]').selectOption('student');
  await page.getByLabel('Initial password').fill('test-password-long');
  await page.getByLabel('Reason', {
    exact: true
  }).fill('Browser new person');
  await page.getByRole('button', {
    name: 'Create person'
  }).click();
  await expect(page.getByRole('cell', {
    name: 'New student ' + tag,
    exact: true
  })).toBeVisible();
  await page.setViewportSize({
    width: 390,
    height: 844
  });
  await page.screenshot({
    path: 'test-results/mobile-people.png',
    fullPage: true
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
test('Admin activity wizard and batch assignment validation are reviewable', async ({ browser }) => {
  const { context, page } = await signIn(browser, 'admin@a.demo');
  await page.getByRole('link', { name: 'Activities', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Activities', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create activity', exact: true })).toBeVisible();
  await page.getByLabel('Activity title').fill('Browser service activity');
  await page.getByLabel('Description').fill('Attendance and feedback activity.');
  await page.getByLabel('Reporting period').selectOption({ index: 1 });
  await page.screenshot({ path: 'test-results/activity-input.png', fullPage: true });
  await page.getByRole('button', { name: 'Continue to stages' }).click();
  await expect(page.getByRole('heading', { name: 'Activity stages', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Assignments & imports' }).click();
  await expect(page.getByRole('heading', { name: 'Assignments and imports', exact: true })).toBeVisible();
  await page.getByLabel('Class transfer / period update CSV').fill('user_id,new_class,class_number,effective_period\na-student,11D,11D,term');
  await page.getByRole('button', { name: 'Validate current file', exact: true }).nth(1).click();
  await expect(page.getByText(/Valid rows:/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirm .* changes/ })).toBeDisabled();
  await page.screenshot({ path: 'test-results/batch-assignment-validation.png', fullPage: true });
  await context.close();
});
