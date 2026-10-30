import { chromium } from 'playwright';
import writeExcelFile from 'write-excel-file/node';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base='http://127.0.0.1:4174';
const evidenceDir=resolve('ui-evidence/form-definition-roundtrip');
await mkdir(evidenceDir,{recursive:true});
const uploadPath=resolve(evidenceDir,'revised-form-definition.xlsx');
const headers=['include','question_id','question_version','section_code','section_title_zh','section_title_en','audience','display_order','question_text_zh','question_text_en','scale_type','scale_min','scale_max','required','ability_code','ability_name_en','ability_name_zh','teacher_note'];
const rows=[headers,
  ['yes','Q-COL-016',2,'student_self_review','學生自評','Student self-review','student',1,'我會運用隊友的回饋，改進小組工作。','','frequency_effect',1,6,'yes','collaborative_feedback','Using collaborative feedback','運用協作回饋','UI verification: adjusted wording'],
  ['yes','',1,'student_self_review','學生自評','Student self-review','student',2,'這次活動中，哪一次改變最能反映你的合作方法？','','frequency_effect',1,6,'yes','collaboration_reflection','Collaboration reflection','協作反思','UI verification: activity-specific question'],
  ['yes','Q-CREA-003',1,'teacher_observation','老師觀察','Teacher observation','teacher',1,'學生能否提出新的解難方法？','','frequency_effect',1,6,'yes','idea_generation','Idea generation','構思新方法','UI verification: teacher response question']
];
const workbook=await writeExcelFile([{data:rows,sheet:'Form definition'}]).toBuffer();
await writeFile(uploadPath,workbook);

async function login(page,username){
  await page.goto(`${base}/login`);
  await page.getByLabel('帳戶').fill(username);
  await page.getByLabel('密碼').fill('demo123');
  await page.locator('button[type=submit]').click();
  await page.waitForURL(`${base}/`);
}

const browser=await chromium.launch({headless:true});
const teacherContext=await browser.newContext({viewport:{width:1512,height:1050}});
const teacher=await teacherContext.newPage();
await login(teacher,'activityteacher');
await teacher.goto(`${base}/activities/ACT-001`);
await teacher.getByText('題目能力不等於 Rubric 對應').waitFor();
await teacher.screenshot({path:resolve(evidenceDir,'01-teacher-authoring.png'),fullPage:true});

const uploadButton=teacher.getByRole('button',{name:'上載修訂 XLSX'});
await uploadButton.locator('xpath=..').locator('input[type=file]').setInputFiles(uploadPath);
await teacher.getByText('驗證結果及逐行變更').waitFor();
await teacher.getByText('modified',{exact:true}).first().waitFor();
await teacher.getByText('added',{exact:true}).first().waitFor();
await teacher.screenshot({path:resolve(evidenceDir,'02-import-diff.png'),fullPage:true});
await teacher.getByRole('button',{name:'建立新草稿版本'}).click();
await teacher.getByText(/草稿版本 \d+ 已準備好/).waitFor();

const studentContext=await browser.newContext({viewport:{width:1280,height:900}});
const student=await studentContext.newPage();
await login(student,'student1');
await student.goto(`${base}/activities/ACT-001`);
if(await student.getByText('這次活動中，哪一次改變最能反映你的合作方法？').count()) throw new Error('Draft question became visible before publication.');

await teacher.getByRole('button',{name:'發布表格版本'}).click();
await teacher.getByText(/已發布 v\d+/).waitFor();
await student.reload();
await student.getByText('這次活動中，哪一次改變最能反映你的合作方法？').first().waitFor();
await student.screenshot({path:resolve(evidenceDir,'03-student-published-form.png'),fullPage:true});

await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify({
  verified_at:new Date().toISOString(),
  teacher_authoring:true,
  staged_diff:true,
  draft_hidden_from_student:true,
  published_visible_to_student:true,
  response_entry_contract_separate:await teacher.getByText('學生回應輸入 XLSX').count()>0
},null,2));
await teacherContext.close();await studentContext.close();await browser.close();
