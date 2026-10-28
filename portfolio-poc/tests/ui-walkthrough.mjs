import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function role(label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: new RegExp(label) }).click();
  return page;
}

const student = await role('Chan Mei');
await student.getByRole('button', { name: 'Learner portfolio', exact: true }).click();
await student.getByText('Skills Builder overview').waitFor();
if (await student.locator('.skill-tile').count() !== 8) throw Error('Expected all eight Skills Builder axes');
if (await student.getByText('Audit IDs').count()) throw Error('Student response exposed internal audit detail');

const peer = await role('Peer reviewer 10');
await peer.getByRole('button', { name: 'Peer review', exact: true }).click();
await peer.getByText('My peer-review assignments').waitFor();
if (await peer.locator('.peer-card').count() !== 3) throw Error('Expected three assigned peer reviews');

const teacher = await role('Ms Chan');
await teacher.getByRole('button', { name: 'Evidence review', exact: true }).click();
await teacher.getByText('Class teacher summary review').waitFor();
await teacher.locator('.summary-editor').waitFor();
await teacher.getByRole('button', { name: 'Prompt studio', exact: true }).click();
await teacher.getByText('Prompt presets and generation history').waitFor();

const staff = await role('Mr Wong');
await staff.getByRole('button', { name: 'Peer review', exact: true }).click();
await staff.getByText('Review peer evidence').waitFor();
await staff.locator('.metric-strip').getByText('30', { exact: true }).waitFor();
await staff.getByRole('button', { name: 'Evidence review', exact: true }).click();
await staff.getByText('Evidence inclusion and publication').waitFor();

const admin = await role('School administrator');
await admin.getByRole('button', { name: 'School controls', exact: true }).click();
await admin.getByText('Controls, contracts and audit').waitFor();
await admin.getByText('global_identifier_replacement').waitFor();
if (await admin.getByRole('button', { name: 'Evidence review', exact: true }).count()) throw Error('Admin review navigation visible');

console.log('PASS: student portfolio, assigned peer review, class-teacher summary, staff moderation and administrator policy views');
await browser.close();
