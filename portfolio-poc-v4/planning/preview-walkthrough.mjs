/*
```mermaid
flowchart LR
  Driver --> Steps --> Screenshot --> Evidence
```
Replace the steps with the approved walkthrough.
Use selectors supported by both drivers.
Record the visible account and role in the evidence record.
*/
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const steps = [
  { issue: 1, step: 1, action: 'goto', value: '/bhss-mvp/v4-staged-implementation.html' },
  { issue: 1, step: 2, action: 'click', selector: '#tab-1' },
  { issue: 1, step: 3, action: 'click', selector: '#tab-6' },
  { issue: 1, step: 4, action: 'click', selector: '#tab-1' },
];

async function replay(page, baseUrl, output, plan) {
  for (const step of plan) {
    if (step.action === 'goto') await page.goto(new URL(step.value, baseUrl).href);
    else if (step.action === 'click') { await page.evaluate(selector => document.querySelector(selector).scrollIntoView({block:'center'}), step.selector); await page.click(step.selector); }
    else if (step.action === 'fill') await page.fill(step.selector, step.value);
    else if (step.action === 'wait') await page.waitForSelector(step.selector);
    else throw new Error(`Use a supported action: ${step.action}`);
    console.log(await page.evaluate(() => ({title:document.title, selected:document.querySelector('[role=tab][aria-selected=true]').textContent, approvalDisabled:document.querySelector('[data-action=approved]').disabled, tables:document.querySelectorAll('#schema tbody tr').length})));
    // Ego screenshot transport times out in this session. Capture DOM replay evidence explicitly.
    const fs = await import('node:fs/promises');
    await fs.writeFile(`${output}/${step.issue}-${step.step}.txt`, await page.snapshot({scope:'full_page'}));
  }
}

try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Use: BASE_URL=<url> node walkthrough.template.mjs --driver ego-browser|playwright');
    console.log('Set OUTPUT_DIR to select the screenshot directory.');
    console.log('Set STORAGE_STATE to use a Playwright account file.');
    console.log('Replace steps with goto, click, fill, or wait actions.');
    console.log('Save each screenshot as <issue>-<step>.png.');
  } else {
    if (args.length !== 2 || args[0] !== '--driver' || !['ego-browser', 'playwright'].includes(args[1])) {
      throw new Error('Select --driver ego-browser or --driver playwright.');
    }
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) throw new Error('Set BASE_URL before replay.');
    if (!['http:', 'https:'].includes(new URL(baseUrl).protocol)) throw new Error('Use an HTTP or HTTPS BASE_URL.');
    const output = resolve(process.env.OUTPUT_DIR ?? 'walkthrough-screenshots');
    await mkdir(output, { recursive: true });
    if (args[1] === 'ego-browser') {
      const source = `const task = await taskSpace(15);
const page = task.page("p1");
console.log({ taskSpaceId: task.spaceId, page: page.label });
await (${replay.toString()})(page, ${JSON.stringify(baseUrl)}, ${JSON.stringify(output)}, ${JSON.stringify(steps)});`;
      await new Promise((done, reject) => {
        const child = spawn('ego-browser', ['nodejs', '-e', source], { stdio: 'inherit' });
        child.once('error', error => reject(new Error(`Start ego-browser: ${error.message}`)));
        child.once('exit', code => code === 0 ? done() : reject(new Error(`Replay failed: ego-browser exit ${code}`)));
      });
    } else {
      let chromium;
      try { ({ chromium } = await import('playwright')); }
      catch { throw new Error('Install Playwright locally: npm install --save-dev playwright'); }
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext(process.env.STORAGE_STATE ? { storageState: process.env.STORAGE_STATE } : {});
        const page = await context.newPage();
        await replay(page, baseUrl, output, steps);
      } finally { await browser.close(); }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
