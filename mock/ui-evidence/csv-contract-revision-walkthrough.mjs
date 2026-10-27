/* Approved ui-fix-loop T2 walkthrough for the Oct 26 linked-data revision. */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:4173';
const output=resolve(process.env.OUTPUT_DIR||'ui-evidence/csv-contract-revision');
await mkdir(output,{recursive:true});

const browser=await chromium.launch({headless:true});

async function signedInPage(username){
  const context=await browser.newContext({viewport:{width:1512,height:1050}});
  const page=await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('帳戶').fill(username);
  await page.getByLabel('密碼').fill('demo123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${baseUrl}/`);
  return {context,page};
}

async function capture(page,issue,step){
  await page.screenshot({path:`${output}/${issue}-${step}.png`,fullPage:true});
}

try{
  const admin=await signedInPage('admin');
  await admin.page.goto(`${baseUrl}/admin`);
  await admin.page.getByRole('heading',{name:'系統管理'}).waitFor();
  await admin.page.getByText('使用者角色分派').waitFor();
  await capture(admin.page,1,1);

  await admin.page.getByRole('tab',{name:'學年／學段'}).click();
  await admin.page.getByText('活動不會由職員手動選擇學段').waitFor();
  await capture(admin.page,2,1);

  await admin.page.getByRole('tab',{name:'Rubrics'}).click();
  await admin.page.getByText('只有完整評估定義才可輸出雷達圖').waitFor();
  await capture(admin.page,4,1);
  await admin.context.close();

  const activityTeacher=await signedInPage('activityteacher');
  await activityTeacher.page.goto(`${baseUrl}/questions`);
  await activityTeacher.page.getByRole('heading',{name:'題庫與題目能力'}).waitFor();
  await activityTeacher.page.getByText('Rubric 解讀發生在 Portfolio 處理階段').waitFor();
  await capture(activityTeacher.page,3,1);
  await activityTeacher.context.close();

  const staff=await signedInPage('staff');
  await staff.page.goto(`${baseUrl}/evidence`);
  await staff.page.getByRole('heading',{name:'佐證清單'}).waitFor();
  await staff.page.getByText('統一佐證索引').waitFor();
  await capture(staff.page,5,1);
  await staff.context.close();

  const student=await signedInPage('student1');
  await student.page.goto(`${baseUrl}/learner-profile`);
  await student.page.getByRole('heading',{name:'學習者 Portfolio'}).waitFor();
  await student.page.getByText(/MAX-CONFIRMED/).waitFor();
  await capture(student.page,6,1);
  await student.context.close();

  const teacher=await signedInPage('teacher');
  await teacher.page.goto(`${baseUrl}/ai`);
  await teacher.page.getByRole('heading',{name:'回望／展望 AI 草稿'}).waitFor();
  await teacher.page.getByRole('button',{name:'儲存設定並預覽完整輸入'}).click();
  const preview=teacher.page.getByText('完整輸入預覽');
  const errorAlert=teacher.page.locator('.ant-alert-error').first();
  await Promise.race([preview.waitFor(),errorAlert.waitFor()]);
  if(await errorAlert.isVisible())throw new Error(`AI preview failed: ${await errorAlert.innerText()}`);
  await teacher.page.getByText('positive-only candidates').waitFor();
  await capture(teacher.page,7,1);
  await teacher.context.close();
} finally {
  await browser.close();
}
