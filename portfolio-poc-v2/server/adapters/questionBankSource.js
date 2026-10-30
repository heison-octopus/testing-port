import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultPath = resolve(here, '../../../Assessment/10份技能問卷整理總表.xlsx');
let cached;

const text = value => String(value ?? '').trim();
const sourcePath = () => process.env.POC_V2_QUESTION_BANK || defaultPath;

export async function loadQuestionBank() {
  const path = sourcePath();
  const info = await stat(path);
  if (cached?.path === path && cached?.modifiedAt === info.mtime.toISOString()) return cached;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sourceSha256 = createHash('sha256').update(await readFile(path)).digest('hex');
  const sheet = workbook.getWorksheet('問卷總表');
  if (!sheet) throw new Error('Question-bank source sheet 問卷總表 is unavailable');
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const promptZh = text(row.getCell(6).value);
    if (!promptZh) return;
    rows.push({
      question_id: `SUPPLIED-Q-${String(rowNumber - 1).padStart(3, '0')}`,
      source_workbook: '10份技能問卷整理總表.xlsx',
      source_sheet: sheet.name,
      source_row: rowNumber,
      source_construct_en: text(row.getCell(1).value),
      source_construct_zh: text(row.getCell(2).value),
      prompt_en: '',
      prompt_zh: promptZh,
      response_type: 'scale',
      scale_type: text(row.getCell(7).value),
      ability_code: '',
      ability_name_en: '',
      ability_name_zh: '',
      approval_status: 'source_supplied',
      disabled: false,
    });
  });
  cached = { path, modifiedAt: info.mtime.toISOString(), sourceSha256, rows };
  return cached;
}
