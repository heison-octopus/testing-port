import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base='http://127.0.0.1:4174';
const out=new URL('./screenshots-v2/',import.meta.url).pathname;
mkdirSync(out,{recursive:true});
const checks=[];

async function login(browser,username){
  const context=await browser.newContext({viewport:{width:1500,height:1050}});
  const page=await context.newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel('帳戶').fill(username);
  await page.getByLabel('密碼').fill('demo123');
  await page.getByRole('button',{name:/登\s*入/}).click();
  await page.waitForURL(`${base}/`);
  return {context,page};
}

async function capture(name,page,assertions){
  for(const label of assertions){await page.getByText(label,{exact:false}).first().waitFor();checks.push({name,label,status:'passed'});}
  await page.screenshot({path:`${out}${name}.png`,fullPage:true});
}

const browser=await chromium.launch({headless:true});
try{
  const activityTeacher=await login(browser,'activityteacher');
  await activityTeacher.page.goto(`${base}/activities/ACT-001`);
  await capture('01-activity-teacher-workspace',activityTeacher.page,['實際出席及職員確認','活動標籤及 Rubric 能力','表格區塊：老師、學生及同儕']);
  await activityTeacher.context.close();

  const staff=await login(browser,'staff');
  await staff.page.goto(`${base}/processing`);
  await capture('02-staff-processing',staff.page,['工作佇列','相片人物候選','語音、講者及 Rubric 佐證','正式私隱政策仍未確認']);
  await staff.page.goto(`${base}/learner-profile?student=STU-001`);
  await staff.page.locator('details.claim summary').nth(1).click();
  await staff.page.locator('details.claim[open] .citation').first().waitFor();
  checks.push({name:'03-staff-learner-profile-provenance',label:'expanded claim citation and provenance',status:'passed'});
  await capture('03-staff-learner-profile-provenance',staff.page,['技能概況','作為學習者的我','S1–S3 版本']);
  await staff.context.close();

  const student1=await login(browser,'student1');
  await student1.page.goto(`${base}/activities/ACT-001`);
  await capture('04-student-self-review',student1.page,['我的學生自評','老師已提交的問卷結果']);
  await student1.page.goto(`${base}/learner-profile`);
  await capture('05-student-learner-profile',student1.page,['學習者 Portfolio','自我介紹','我的興趣']);
  await student1.context.close();

  const student2=await login(browser,'student2');
  await student2.page.goto(`${base}/activities/ACT-001`);
  await capture('06-student-peer-assignment',student2.page,['獲分配的同儕互評','評核 S-001']);
  await student2.context.close();

  writeFileSync(`${out}verification.json`,JSON.stringify({verifiedAt:new Date().toISOString(),base,checks},null,2));
  console.log(`Verified ${checks.length} role-isolated UI assertions across activity, processing, self/peer review, and learner-profile views.`);
}finally{
  await browser.close();
}
