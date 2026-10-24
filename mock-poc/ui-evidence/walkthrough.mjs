import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:4174';
const output=resolve(process.env.OUTPUT_DIR||'ui-evidence/screenshots');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});

async function loginContext(username){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('demo123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${baseUrl}/`);
  return {context,page};
}

async function capture(username,steps){
  const {context,page}=await loginContext(username);
  try{
    for(const step of steps){
      if(step.path) await page.goto(`${baseUrl}${step.path}`);
      if(step.click) await page.getByText(step.click,{exact:true}).click();
      if(step.action) await step.action(page);
      if(step.wait) await page.getByText(step.wait,{exact:false}).first().waitFor();
      await page.screenshot({path:`${output}/${step.issue}-${username}-${step.name}.png`,fullPage:true});
    }
  }finally{await context.close()}
}

await capture('student1',[
  {issue:1,name:'dashboard',path:'/',wait:'近期活動'},
  {issue:6,name:'activities',path:'/activities',wait:'活動記錄'},
  {issue:7,name:'evidence',path:'/evidence',action:async page=>{
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
    await page.locator('input[type="file"]').setInputFiles({name:'student-evidence.png',mimeType:'image/png',buffer:png});
    await page.getByRole('button',{name:/上載並建立預覽/}).click();
    await page.getByText('圖片已上載，伺服器已產生預覽版本').waitFor();
  },wait:'證明記錄'},
  {issue:4,name:'ai-disclosure',path:'/ai',action:async page=>{
    await page.getByRole('combobox').first().click();
    await page.locator('.ant-select-item-option').first().click();
    await page.getByRole('button',{name:/預覽將會送出的資料/}).click();
  },wait:'完整輸入預覽'}
]);
await capture('student2',[
  {issue:1,name:'english-toggle',path:'/',click:'EN',wait:'Recent activities'},
  {issue:3,name:'inline-validation',path:'/evidence',action:async page=>{
    await page.getByRole('button',{name:/Upload and create preview/}).click();
  },wait:'Choose a JPG or PNG image first.'}
]);
await capture('teacher',[{issue:6,name:'class-teacher-students',path:'/students',wait:'獲授權查看的學生'}]);
await capture('activityteacher',[{issue:6,name:'activity-teacher-detail',path:'/activities/ACT-001',wait:'老師評語及技能觀察'}]);
await capture('staff',[
  {issue:9,name:'student-history',path:'/students/STU-001',wait:'學籍及班級歷程'},
  {issue:10,name:'year-transition',path:'/classes',action:async page=>{
    await page.getByRole('button',{name:/轉學年/}).click();
    await page.getByRole('button',{name:/產生比較結果/}).click();
    await page.getByText('new_candidate').first().waitFor();
  },wait:'確認身份'},
  {issue:2,name:'questions',path:'/questions',wait:'對應及權重均未獲學校確認'}
]);
await capture('admin',[{issue:8,name:'admin-sessions',path:'/admin',wait:'安全及存取'}]);
await browser.close();
