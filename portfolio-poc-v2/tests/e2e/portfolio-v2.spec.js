import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';

async function signIn(page, name) {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.locator('.topbar')).toContainText(name);
}

async function signOut(page) {
  await page.getByRole('button', { name: /Switch account/ }).click();
  await expect(page.getByRole('heading', { name: /See the same data through a different scope/ })).toBeVisible();
}

test.describe.serial('Portfolio POC v2 implemented workflows', () => {
  test('language choice and server-driven role navigation remain isolated by account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '繁中' }).click();
    await expect(page.getByRole('heading', { name: '以不同權限範圍查看同一組資料' })).toBeVisible();
    await page.getByRole('button', { name: 'EN' }).click();

    const matrix = [
      ['System Administrator', ['Data operations','Staff directory','School controls','POC page catalogue'], ['Activities','Activity responses','Activity assessment','Approval queues','Portfolio review','Memorable activities','Portfolio editor','Published Portfolio','AI drafts','Model chatbox']],
      ['Lee Wai Man', ['Data operations','Staff directory','Activities','Approval queues','Portfolio review','Published Portfolio','AI drafts','Model chatbox'], ['Activity responses','Activity assessment','Memorable activities','Portfolio editor','School controls','POC page catalogue']],
      ['Chan Mei Ling', ['Data operations','Staff directory','Activities','Activity assessment','Approval queues','Portfolio review','Published Portfolio','AI drafts','Model chatbox'], ['Activity responses','Memorable activities','Portfolio editor','School controls','POC page catalogue']],
      ['Wong Kai Ho', ['Data operations','Activities','Activity assessment'], ['Activity responses','Staff directory','Approval queues','Portfolio review','Memorable activities','Portfolio editor','Published Portfolio','AI drafts','Model chatbox','School controls','POC page catalogue']],
      ['Alex Lam', ['Activities','Activity responses','Memorable activities','Portfolio editor','Published Portfolio'], ['Data operations','Activity assessment','Staff directory','Approval queues','Portfolio review','AI drafts','Model chatbox','School controls','POC page catalogue']],
    ];
    for (const [name, visible, hidden] of matrix) {
      await page.getByRole('button', { name: new RegExp(name) }).click();
      const navigation = page.locator('nav');
      for (const label of visible) await expect(navigation.getByRole('button', { name: label, exact: true })).toBeVisible();
      for (const label of hidden) await expect(navigation.getByRole('button', { name: label, exact: true })).toHaveCount(0);
      await signOut(page);
    }
  });

  test('staff directory applies combined server-side filters', async ({ page }) => {
    await signIn(page, 'Chan Mei Ling');
    await page.locator('nav').getByRole('button', { name: 'Staff directory' }).click();
    await expect(page.getByRole('heading', { name: 'Staff directory' })).toBeVisible();
    await page.getByLabel('Functional role').selectOption('ROLE-CLASS-TEACHER');
    await page.locator('.filter-bar select').nth(4).selectOption('SUB-ENG');
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Chan Mei Ling');
    await page.getByLabel('Name or identifier').fill('not-a-person');
    await expect(page.getByText('No staff match the current combined filters.')).toBeVisible();
  });

  test('assigned activity editor resolves and commits a CSV roster without deleting source history', async ({ page }) => {
    await signIn(page, 'Chan Mei Ling');
    await page.locator('nav').getByRole('button', { name: 'Data operations' }).click();
    await expect(page.getByRole('heading', { name: 'Data operations' })).toBeVisible();
    await page.getByLabel('Roster file').setInputFiles({
      name: 'browser-roster.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'source_record_key,student_identifier,student_name,group_code,planned_attendance_status',
        'BROWSER-S1001,S1001,Alex Chan,P1,assigned',
        'BROWSER-UNKNOWN,S1999,Chris Wong,P1,assigned',
      ].join('\n')),
    });
    await page.getByRole('button', { name: 'Parse and preview' }).click();
    await expect(page.locator('.import-detail-heading')).toContainText('needs resolution');
    const unknownRow = page.locator('.import-row-table article').filter({ hasText: 'BROWSER-UNKNOWN' });
    await unknownRow.getByRole('button', { name: 'Review' }).click();
    await page.getByLabel('Replacement value').fill('S1003');
    await page.getByLabel('Correction reason').fill('Matched against the same-school student register during browser QA.');
    await page.getByRole('button', { name: 'Append correction and revalidate' }).click();
    await expect(page.locator('.import-detail-heading')).toContainText('ready to commit');
    await page.getByRole('button', { name: 'Commit validated roster' }).click();
    await expect(page.locator('.import-detail-heading')).toContainText('committed');
    await expect(page.locator('.custody-panel')).toContainText('browser-roster.csv');
    await expect(page.locator('.custody-panel')).toContainText(/^[\s\S]*[a-f0-9]{64}[\s\S]*$/);
    await unknownRow.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText(/already linked to an activity assignment/)).toBeVisible();
    await page.getByLabel('Decision reason').fill('Source invalidated after commit; keep the row and mark its link for review.');
    await page.getByRole('button', { name: 'Exclude row' }).click();
    await expect(page.locator('.import-row-table article').filter({ hasText: 'BROWSER-UNKNOWN' })).toContainText('excluded');
  });

  test('admin activity catalogue round trip distinguishes no-change rows from lifecycle actions', async ({ page }) => {
    await signIn(page, 'System Administrator');
    await page.locator('nav').getByRole('button', { name: 'Data operations' }).click();
    await page.locator('.data-domain-grid').getByRole('button', { name: /Activity list/ }).click();
    await expect(page.getByRole('heading', { name: 'Export, edit and stage explicit changes' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export editable CSV' }).click();
    const download = await downloadPromise;
    const exported = await readFile(await download.path(), 'utf8');
    expect(exported).toContain('expected_revision_number');
    expect(exported).toContain('lifecycle_action');
    expect(exported).not.toContain('created_by_user_id');
    expect(exported).not.toContain('uploaded_by_user_id');

    const noChange = [
      'source_record_key,activity_id,expected_revision_number,current_operational_status,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_staff_number,requested_form_version_id,media_capture_expected,location,lifecycle_action,change_reason',
      'browser-policy:ACT-SPORT-001,ACT-SPORT-001,1,scheduled,Teamwork sports session,團隊合作運動,Observe teamwork and planning during group challenges,在小組挑戰觀察團隊協作及計劃,sports,,DEPT-STUDENT-DEV,2026-10-16T14:00:00+08:00,2026-10-16T16:00:00+08:00,T002,FV-CORE-001,1,School Hall,upsert,',
    ].join('\n');
    await page.getByLabel('Activity catalogue file').setInputFiles({ name: 'browser-activity-catalogue.csv', mimeType: 'text/csv', buffer: Buffer.from(noChange) });
    await page.getByRole('button', { name: 'Stage explicit catalogue changes' }).click();
    await expect(page.locator('.import-detail-heading')).toContainText('activity_catalogue');
    await expect(page.locator('.import-row-table article')).toContainText('no change');
    await expect(page.locator('.import-row-table article')).toContainText('commit will record a no-op link');
    await expect(page.getByText(/absent rows remain unchanged/)).toBeVisible();
    await page.getByRole('button', { name: 'Commit explicit activity actions' }).click();
    await expect(page.locator('.import-detail-heading')).toContainText('committed');
    await expect(page.getByRole('button', { name: 'Disable this import batch' })).toHaveCount(0);
  });

  test('student reflection, memorable activity and Portfolio editing are separate scoped pages', async ({ page }) => {
    await signIn(page, 'Alex Lam');
    await page.locator('nav').getByRole('button', { name: 'Activities', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Activities' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New activity' })).toHaveCount(0);

    await page.locator('nav').getByRole('button', { name: 'Activity responses' }).click();
    await page.locator('.response-task').filter({ hasText: 'Teamwork sports session' }).filter({ hasText: 'My reflection' }).click();
    await page.getByLabel('Choose the most memorable moment or the moment that best showed your values. What happened?').fill('I reorganised the team after our first plan failed.');
    await page.getByLabel('What did this moment help you understand about yourself?').fill('I learned that I can stay calm and ask for help.');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.locator('.response-heading')).toContainText('draft');
    await page.getByRole('button', { name: 'Submit response' }).click();
    await expect(page.getByText('This revision is locked after submission.')).toBeVisible();

    await page.locator('nav').getByRole('button', { name: 'Memorable activities' }).click();
    await page.locator('.eligible-activities').getByRole('button', { name: /Teamwork sports session/ }).click();
    await page.getByLabel('Why was this activity meaningful or memorable?').fill('I learned to reorganise a team after a setback.');
    await page.getByRole('button', { name: 'Save selection' }).click();
    await page.getByRole('button', { name: 'Submit selection' }).click();
    await expect(page.getByText('This selection is submitted and locked.')).toBeVisible();

    await page.locator('nav').getByRole('button', { name: 'Portfolio editor' }).click();
    await expect(page.getByText('Latest working version 2')).toBeVisible();
    await expect(page.locator('.working-version-panel')).toContainText('Pinned rubric · Skills Builder Universal Framework · UF2.0 · RUB-SB-UF2');
    await page.getByLabel('Self-introduction').fill('I am building a new audited Portfolio version.');
    await page.getByRole('button', { name: 'Save new working version' }).click();
    await expect(page.getByText('Latest working version 3')).toBeVisible();
    await expect(page.getByText('I learned to reorganise a team after a setback.').first()).toBeVisible();
    await page.getByRole('button', { name: 'Submit working version' }).click();
    await expect(page.locator('.working-version-panel')).toContainText('student submitted');

    await page.locator('nav').getByRole('button', { name: 'Published Portfolio' }).click();
    await expect(page.getByText('PSNAP-S1-P1-v1')).toBeVisible();
    await expect(page.locator('.portfolio-visual-sheet')).toContainText('Pinned rubric · Skills Builder Universal Framework · UF2.0 · RUB-SB-UF2');
    await expect(page.locator('.portfolio-detail')).not.toContainText('I am building a new audited Portfolio version.');
  });

  test('named teacher assessment reviews sources but does not auto-publish a skill step', async ({ page }) => {
    await signIn(page, 'Wong Kai Ho');
    await page.locator('nav').getByRole('button', { name: 'Activity assessment' }).click();
    await expect(page.getByRole('heading', { name: 'Activity assessment' })).toBeVisible();
    const selfCard = page.locator('.perspective-grid article').filter({ hasText: 'student self report' });
    await expect(selfCard).toContainText('I reorganised the team after our first plan failed.');
    await selfCard.getByPlaceholder('Decision reason').fill('The response is attributable and relevant to this activity.');
    await selfCard.getByRole('button', { name: 'Accept' }).click();
    await expect(selfCard).toContainText('approved');

    await page.getByLabel('Demonstrated strength and example').fill('Alex reorganised roles after the first plan failed.');
    await page.getByLabel('Next development area').fill('Explain the reason for each role change.');
    await page.getByLabel('Support strategy').fill('Use a short plan-check-adjust routine.');
    await page.getByLabel('Skill (optional)').selectOption('AX-SB-TEAMWORK');
    await page.getByLabel('Observed step 1–16').fill('7');
    await page.getByLabel('Consistency 1–6').fill('4');
    await page.getByLabel('Observation comment linked to the behaviour above').fill('The observed behaviour supports this teacher-confirmed candidate.');
    await page.getByRole('button', { name: 'Submit teacher assessment' }).click();
    await expect(page.locator('.observation-history')).toContainText('Teamwork');
    await expect(page.locator('.observation-history')).toContainText('not included');
  });

  test('a custom questionnaire stays in draft and gates activity submission until separate form approval', async ({ page }) => {
    await signIn(page, 'Chan Mei Ling');
    await page.locator('nav').getByRole('button', { name: 'Activities', exact: true }).click();
    await page.getByRole('button', { name: 'New activity' }).click();
    await page.getByLabel('Activity name (English)').fill('Browser-tested reflection lab');
    await page.getByLabel('Activity name (Chinese)').fill('瀏覽器測試反思工作坊');
    await page.getByLabel('Description (English)').fill('Initial browser-tested description.');
    await page.getByLabel('Description (Chinese)').fill('瀏覽器測試用的初始簡介。');
    await page.getByRole('button', { name: 'Review activity' }).click();
    await expect(page.getByRole('heading', { name: 'Check the activity package' })).toBeVisible();
    await page.getByRole('button', { name: 'Create activity draft' }).click();
    await expect(page.getByRole('heading', { name: 'Browser-tested reflection lab' })).toBeVisible();
    await expect(page.locator('.activity-detail-panel')).toContainText('FV-ACT-');
    await page.getByLabel('Proposed description').fill('Material successor description.');
    await page.getByLabel('Reason').fill('Keep the material change traceable.');
    await page.getByRole('button', { name: 'Create successor', exact: true }).click();
    await expect(page.locator('.activity-detail-panel')).toContainText('Revision 2');
    await expect(page.locator('.revision-compare')).toContainText('No approved revision yet.');
    await page.getByLabel('Named reviewer').selectOption('USR-ST-001');
    await page.getByLabel('Named publisher').selectOption('USR-ST-001');
    await page.getByRole('button', { name: 'Submit revision' }).click();
    await expect(page.getByText('Complete the activity package: participants, VASK, risk flags and one approved published form are required')).toBeVisible();
    await expect(page.locator('.activity-detail-panel')).toContainText('draft');
  });

  test('coordinator sees escalation work but cannot decide another reviewer assignment', async ({ page }) => {
    await signIn(page, 'Lee Wai Man');
    await page.locator('nav').getByRole('button', { name: 'Approval queues' }).click();
    const otherAssignment = page.locator('.approval-record').filter({ hasText: 'AREV-PRESS-001' });
    await expect(otherAssignment).toContainText('The named assignee must decide.');
    await expect(otherAssignment.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Escalation queue' })).toBeVisible();
    await expect(page.getByText('overdue', { exact: true }).first()).toBeVisible();
  });

  test('AI generation, candidate decisions and narrative edits persist after reload', async ({ page }) => {
    await signIn(page, 'Chan Mei Ling');
    await page.locator('nav').getByRole('button', { name: 'AI drafts' }).click();
    await expect(page.getByRole('heading', { name: 'AI drafts and provenance' })).toBeVisible();
    await page.getByRole('button', { name: /Candidates/ }).click();
    await expect(page.locator('.candidate-card')).toHaveCount(2);

    await page.getByLabel('Decision reason (required)').fill('The frozen sources support this candidate.');
    await page.locator('.candidate-card').first().getByRole('button', { name: 'Use draft' }).click();
    await expect(page.locator('.candidate-card').first()).toContainText('included');

    await page.getByRole('button', { name: 'Draft', exact: true }).click();
    await page.getByLabel('Teacher-edited text').fill('A browser-tested and audited teacher edit.');
    await page.getByLabel('Audited edit reason').fill('Clarify the supported learner narrative.');
    await page.getByRole('button', { name: 'Save reviewed edit' }).click();
    await page.getByRole('button', { name: 'Generate draft candidate' }).click();
    await expect(page.locator('.candidate-card')).toHaveCount(3);
    await page.reload();
    await page.locator('nav').getByRole('button', { name: 'AI drafts' }).click();
    await page.getByRole('button', { name: /Candidates/ }).click();
    await expect(page.locator('.candidate-card')).toHaveCount(3);
    await page.getByRole('button', { name: 'Draft', exact: true }).click();
    await expect(page.getByLabel('Teacher-edited text')).toHaveValue('A browser-tested and audited teacher edit.');
  });

  test('record links deep-link permitted staff and return unauthorized users to overview', async ({ page }) => {
    await page.goto('/activities/ACT-PRESS-001');
    await page.getByRole('button', { name: /Alex Lam/ }).click();
    await expect(page).toHaveURL(/\/\?lang=en$/);
    await expect(page.getByText('That activity is not available to this account.')).toBeVisible();
    await signOut(page);

    await page.goto('/portfolios/USR-S-002');
    await page.getByRole('button', { name: /Chan Mei Ling/ }).click();
    await expect(page).toHaveURL(/\/portfolios\/USR-S-002/);
    await expect(page.locator('.portfolio-detail').getByRole('heading', { name: 'Bella Ho' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Portfolio link' })).toBeVisible();
    await signOut(page);

    await page.goto('/portfolios/USR-S-002');
    await page.getByRole('button', { name: /Alex Lam/ }).click();
    await expect(page).toHaveURL(/\/\?lang=en$/);
    await expect(page.getByText('That published Portfolio is not available to this account.')).toBeVisible();

    await page.goto('/portfolio-editor/USR-S-002');
    await expect(page).toHaveURL(/\/\?lang=en$/);
    await expect(page.getByText('That Portfolio editor is not owned by this account.')).toBeVisible();
    await page.goto('/responses/AR-PEER-PRA-001');
    await expect(page).toHaveURL(/\/\?lang=en$/);
    await expect(page.getByText('That response task is not assigned to this account.')).toBeVisible();
  });

  test('direct v2 chatbox route streams metrics and retains browser-local history', async ({ page }) => {
    await page.goto('/chatbox');
    await page.getByRole('button', { name: /Chan Mei Ling/ }).click();
    await expect(page).toHaveURL(/\/chatbox/);
    await expect(page.getByRole('heading', { name: 'Model chatbox' })).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
    await page.getByRole('button', { name: 'Hide top bar' }).click();
    await expect(page.locator('.topbar')).toBeHidden();
    await page.getByRole('button', { name: 'Show top bar' }).click();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.getByLabel('Available model')).toHaveValue('fixture-model');
    await expect(page.getByText('32,768 tokens')).toBeVisible();
    await page.getByLabel('Message').fill('Say hello for the timing test.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Hello from fixture model.')).toBeVisible();
    await expect(page.locator('.chat-metrics')).toContainText('Wait to first token');
    await expect(page.locator('.chat-metrics')).toContainText('WPM after wait');
    await expect(page.getByText('16 tokens')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Hello from fixture model.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear local history' }).click();
    await expect(page.getByText('Start a local test conversation')).toBeVisible();

    await signOut(page);
    await page.goto('/chatbox');
    await page.getByRole('button', { name: /Alex Lam/ }).click();
    await expect(page).toHaveURL(/\/chatbox/);
    await expect(page.getByRole('heading', { name: 'Chatbox access is blocked' })).toBeVisible();
    await expect(page.locator('nav').getByRole('button', { name: 'Model chatbox' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out and switch account' }).click();
    await expect(page.getByRole('heading', { name: /See the same data through a different scope/ })).toBeVisible();
    await page.getByRole('button', { name: /Chan Mei Ling/ }).click();
    await expect(page.getByRole('heading', { name: 'Model chatbox' })).toBeVisible();
  });

  test('admin policy preview and explicit deny remove the protected activity for the teacher', async ({ page }) => {
    await signIn(page, 'System Administrator');
    await page.locator('nav').getByRole('button', { name: 'School controls' }).click();
    await page.getByLabel('Reason').fill('Browser-tested confidentiality override.');
    await page.getByRole('button', { name: 'Preview affected users' }).click();
    await expect(page.locator('.preview-list')).toContainText('allowed → denied');
    await page.getByRole('button', { name: 'Apply override' }).click();
    await expect(page.getByText('Browser-tested confidentiality override.')).toBeVisible();
    await signOut(page);

    await page.getByRole('button', { name: /Chan Mei Ling/ }).click();
    await page.locator('nav').getByRole('button', { name: 'Activities', exact: true }).click();
    await expect(page.getByText('ACT-PRESS-001')).toHaveCount(0);
  });

  test('SchoolAdmin catalogues and import contracts drive the teacher activity options', async ({ page }) => {
    await signIn(page, 'System Administrator');
    await page.locator('nav').getByRole('button', { name: 'Data operations' }).click();
    await expect(page.getByRole('button', { name: /Question bank/ })).toContainText('166 questions');
    await page.getByRole('button', { name: /Question bank/ }).click();
    await expect(page.getByRole('link', { name: /Download new-record template/ })).toHaveAttribute('href', '/templates/question-bank-new.csv');
    await expect(page.getByRole('button', { name: /Export all records for editing/ })).toBeVisible();

    await page.locator('.data-domain-grid').getByRole('button', { name: /Skill rubrics/ }).click();
    await expect(page.locator('.rubric-package-layout > aside > button')).toHaveCount(2);
    await expect(page.locator('.rubric-package-heading')).toContainText('definition_only');
    await expect(page.locator('.rubric-package-layout')).toContainText('8 skills · 128 steps');
    const rubricDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export all rubric records/ }).click();
    const rubricDownload = await rubricDownloadPromise;
    const rubricWorkbook = new ExcelJS.Workbook();
    await rubricWorkbook.xlsx.load(await readFile(await rubricDownload.path()));
    expect(rubricWorkbook.worksheets.map(sheet => sheet.name)).toEqual(['rubric_catalogues','rubric_groups','rubric_skills','rubric_steps']);
    expect(rubricWorkbook.getWorksheet('rubric_catalogues').rowCount).toBe(3);
    expect(rubricWorkbook.getWorksheet('rubric_steps').rowCount).toBe(129);

    await page.locator('nav').getByRole('button', { name: 'School controls' }).click();
    await expect(page.getByText('166 questions · 10 source constructs')).toBeVisible();
    await expect(page.locator('.school-catalogue-controls')).toContainText('RUB-SB-UF2 · definition only · 8 skills · 128 steps');
    await expect(page.locator('.school-catalogue-controls')).toContainText('Changes must be imported as a validated successor draft before activation.');
    await expect(page.getByLabel('School-active label set')).toHaveValue('RUB-VASK-2026');

    await signOut(page);
    await signIn(page, 'Chan Mei Ling');
    await page.locator('nav').getByRole('button', { name: 'Activities' }).click();
    await page.getByRole('button', { name: 'New activity' }).click();
    await expect(page.getByText('Default labelling · VASK v2026')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose VASK labels' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Build questionnaire' })).toBeVisible();
    await expect(page.getByText('8 suggested questions from 4 selected VASK labels')).toBeVisible();
    await expect(page.getByText(/Current skill rubric:/)).toHaveCount(0);

    await page.getByLabel('Activity name (English)').fill('E2E activity builder flow');
    await page.getByLabel('Activity name (Chinese)').fill('端對端活動建立流程');
    await page.getByLabel('Description (English)').fill('Verifies the complete activity and questionnaire draft workflow.');
    await page.getByLabel('Description (Chinese)').fill('驗證完整活動及問卷草稿流程。');
    await page.locator('.vask-group label').filter({ hasText: 'Integrity' }).getByRole('checkbox').check();
    await expect(page.getByText(/suggested questions from 5 selected VASK labels/)).toBeVisible();

    await page.getByRole('button', { name: 'Choose teacher groups' }).click();
    await page.locator('.selector-options label').filter({ hasText: 'Student Development Team' }).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByLabel('Question 1', { exact: true }).fill('Describe one observed example and identify its supporting evidence.');
    await page.getByLabel('Required 1', { exact: true }).selectOption('optional');
    await page.getByRole('button', { name: 'Write new question' }).click();
    const customQuestion = page.locator('.question-row').filter({ hasText: 'Custom' });
    await expect(customQuestion.getByRole('textbox')).toHaveValue('Write a new reflection question');
    await customQuestion.getByRole('button', { name: 'Remove question' }).click();
    await expect(customQuestion).toHaveCount(0);

    await page.getByRole('button', { name: 'Review activity' }).click();
    await expect(page.getByRole('heading', { name: 'Check the activity package' })).toBeVisible();
    await expect(page.getByText('1 classes · 2 teacher groups')).toBeVisible();
    await expect(page.getByText(/Questionnaire will be saved as a successor draft form/)).toBeVisible();
    await page.getByRole('button', { name: 'Create activity draft' }).click();
    await expect(page.getByRole('heading', { name: 'E2E activity builder flow' })).toBeVisible();
  });
});
