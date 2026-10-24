import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base='http://127.0.0.1:4174';
const out=new URL('./screenshots/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');

async function login(browser,username){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await page.goto(`${base}/login`);await page.getByLabel('帳戶').fill(username);await page.getByLabel('密碼').fill('demo123');await page.getByRole('button',{name:/登\s*入/}).click();await page.waitForURL(`${base}/`);return {context,page};
}

const browser=await chromium.launch({headless:true});
try{
  const teacher=await login(browser,'activityteacher');
  await teacher.page.goto(`${base}/activities`);await teacher.page.getByRole('button',{name:'新增活動'}).click();
  await teacher.page.locator('input[type=file]').setInputFiles({name:'verification-roster.csv',mimeType:'text/csv',buffer:Buffer.from('student_id,student_name_reference,class_reference,note\r\nS-001,Alex Chan,2B,\r\nS-020,Unknown,2B,')});
  await teacher.page.getByText('需要修正',{exact:true}).waitFor();const rosterInputs=teacher.page.getByRole('textbox',{name:/Student ID row/});await rosterInputs.nth(1).fill('S-002');await rosterInputs.nth(1).blur();await teacher.page.getByText('全部配對成功',{exact:true}).waitFor();await teacher.page.waitForTimeout(500);await teacher.page.screenshot({path:`${out}teacher-roster-import.png`,fullPage:true});
  await teacher.page.goto(`${base}/activities/ACT-001`);await teacher.page.getByText('老師問卷 XLSX',{exact:true}).waitFor();await teacher.page.screenshot({path:`${out}teacher-questionnaire-xlsx.png`,fullPage:true});
  await teacher.context.close();

  const classTeacher=await login(browser,'teacher');await classTeacher.page.goto(`${base}/activities/ACT-001`);await classTeacher.page.getByText('老師問卷 XLSX',{exact:true}).waitFor();await classTeacher.page.screenshot({path:`${out}class-teacher-questionnaire.png`,fullPage:true});await classTeacher.context.close();

  const student=await login(browser,'student1');
  await student.page.goto(`${base}/activities/ACT-001`);await student.page.getByText('老師已提交的問卷結果',{exact:true}).waitFor();await student.page.getByText('4/6',{exact:true}).first().waitFor();await student.page.screenshot({path:`${out}student-submitted-questionnaire.png`,fullPage:true});
  await student.page.goto(`${base}/evidence`);await student.page.getByText('媒體庫',{exact:true}).first().waitFor();await student.page.locator('input[type=file]').setInputFiles({name:'student-dummy-certificate.png',mimeType:'image/png',buffer:png});await student.page.getByLabel('說明').fill('Student dummy certificate for role verification');await student.page.getByRole('button',{name:'上載並建立預覽'}).click();await student.page.getByRole('tabpanel',{name:'我的證書'}).getByText('student-dummy-certificate.png',{exact:true}).first().waitFor();await student.page.screenshot({path:`${out}student-media-library.png`,fullPage:true});
  await student.page.goto(`${base}/portfolio-curation`);await student.page.getByText('我的選擇',{exact:true}).waitFor();await student.page.screenshot({path:`${out}student-memorable-activity.png`,fullPage:true});await student.context.close();

  const staff=await login(browser,'staff');await staff.page.goto(`${base}/portfolio-curation`);await staff.page.getByText('校務人員控制',{exact:true}).waitFor();await staff.page.screenshot({path:`${out}staff-memorable-window.png`,fullPage:true});await staff.context.close();
  const admin=await login(browser,'admin');await admin.page.goto(`${base}/portfolio-curation`);await admin.page.getByText('校務人員控制',{exact:true}).waitFor();await admin.page.screenshot({path:`${out}school-admin-memorable-window.png`,fullPage:true});await admin.context.close();
  console.log('Verified student, class teacher, activity teacher, staff and School Admin in isolated browser contexts.');
}finally{await browser.close();}
