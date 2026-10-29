import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '../..');
const source = join(root, 'Assessment/UF2.0 Cantonese Framework.pdf');
const target = join(root, 'output/import-examples/59_rubric_step_definitions.csv');
const work = mkdtempSync(join(tmpdir(), 'bhss-uf2-'));
const textPath = join(work, 'uf2.txt');
execFileSync('pdftotext', ['-layout', source, textPath]);
const lines = readFileSync(textPath, 'utf8').split(/\r?\n/);

const axes = {
  '聆聽': ['AX-SB-LISTEN', 'GRP-SB-COMMUNICATION'],
  '說話': ['AX-SB-SPEAK', 'GRP-SB-COMMUNICATION'],
  '解難': ['AX-SB-PROBLEM', 'GRP-SB-CREATIVE-PROBLEM'],
  '創意': ['AX-SB-CREATIVITY', 'GRP-SB-CREATIVE-PROBLEM'],
  '適應力': ['AX-SB-POSITIVE', 'GRP-SB-SELF-MANAGEMENT'],
  '計劃能力': ['AX-SB-AIMING', 'GRP-SB-SELF-MANAGEMENT'],
  '領導力': ['AX-SB-LEADERSHIP', 'GRP-SB-COLLABORATION'],
  '團隊協作': ['AX-SB-TEAMWORK', 'GRP-SB-COLLABORATION'],
};
const stages = ['第一','第二','第三','第四','第五','第六','第七','第八','第九','第十','第十一','第十二','第十三','第十四','第十五','第十六'];
const rows = [];
let current = null;
for (let index = 0; index < lines.length; index += 1) {
  const header = lines[index].match(/技能建構通用框架 2\.0:\s*([^/]+?)\s*\//);
  if (header) current = header[1].trim();
  const stageIndex = stages.findIndex(stage => lines[index].trim() === `${stage}階段`);
  if (!current || stageIndex < 0 || !axes[current]) continue;
  let stepName = '';
  for (let cursor = index - 1; cursor >= 0 && !stepName; cursor -= 1) stepName = lines[cursor].trim();
  let definition = '';
  for (let cursor = index + 1; cursor < lines.length && !definition; cursor += 1) {
    const value = lines[cursor].trim();
    if (value && !/^\d+$/.test(value)) definition = value;
  }
  if (!stepName || !definition) throw new Error(`Could not read ${current} step ${stageIndex + 1}`);
  const [axisId, groupId] = axes[current];
  rows.push({
    step_definition_id: `STEP-${axisId.replace('AX-SB-', '')}-${String(stageIndex + 1).padStart(2, '0')}`,
    rubric_catalogue_id: 'RUB-SB-UF2',
    rubric_group_id: groupId,
    axis_id: axisId,
    level_id: `LVL-SB-${String(stageIndex + 1).padStart(2, '0')}`,
    step_number: stageIndex + 1,
    step_name_en: '',
    step_name_zh: stepName,
    definition_en: '',
    definition_zh: definition,
    score_min: '', score_max: '', score_out_of: '',
    source_reference: `Assessment/UF2.0 Cantonese Framework.pdf#page=${Object.keys(axes).indexOf(current) + 1}`,
    status: 'active', disabled: 'false',
  });
}
if (rows.length !== 128) throw new Error(`Expected 128 step definitions, found ${rows.length}`);
const headers = Object.keys(rows[0]);
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
writeFileSync(target, `${headers.map(quote).join(',')}\n${rows.map(row => headers.map(key => quote(row[key])).join(',')).join('\n')}\n`);
console.log(`Wrote ${rows.length} source-linked step definitions to ${target}`);
