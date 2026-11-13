import { parse } from 'csv-parse/sync';
import * as repository from '../repositories/inventory.js';
export const headers = ['id','stage','title','status'];
export const template = 'id,stage,title,status\r\nEXAMPLE-01,1,Synthetic identity test,planned\r\n';
export const stages = [ 'Inventory and alignment','Contracts, identity and school','Activity and attendance','Forms and responses','Rubrics and human review','Evidence and correction','Portfolio and publication','Extensions and release' ].map((name,id)=>({id,name,status:id===0?'in progress':'planned'}));
export const conflicts = [{id:'GV-01',status:'corrected',description:'Core specifies five rubric sheets; bilingual SRS-03 and SRS-13 were aligned.'},{id:'GV-02',status:'open',description:'Cross-catalogue rubric lineage needs adversarial verification.'},{id:'SEQUENCE',status:'open',description:'The original and definition-first plans use different stage numbers.'}];
export function preview(text) {
 if (Buffer.byteLength(text)>1048576) throw new Error('CSV exceeds 1 MiB');
 let rows; try { rows=parse(text,{bom:true,skip_empty_lines:true,relax_column_count:true}); } catch { throw new Error('Malformed CSV'); }
 if (!rows.length || JSON.stringify(rows[0])!==JSON.stringify(headers)) throw new Error('Expected headers: '+headers.join(','));
 if (rows.length===1 || rows.length>201) throw new Error('Provide 1–200 data rows');
 const existing=new Set(repository.list().map(x=>x.id)); const seen=new Set();
 const result=rows.slice(1).map((cells,i)=>{ const [id='',stage='',title='',status='']=cells.map(x=>x.trim()); const errors=[]; if(cells.length!==4) errors.push('Expected four columns'); if(!/^[A-Za-z0-9_-]{1,40}$/.test(id)) errors.push('Invalid id'); if(seen.has(id)||existing.has(id)) errors.push('Duplicate id'); seen.add(id); if(!/^[0-7]$/.test(stage)) errors.push('Stage must be 0–7'); if(!title||title.length>120) errors.push('Title required, maximum 120 characters'); if(!['planned','open','verified'].includes(status)) errors.push('Status must be planned, open or verified'); return {row:i+2,values:{id,stage:Number(stage),title,status},errors}; });
 return {valid:result.every(r=>!r.errors.length),rows:result};
}
export function commit(text){const result=preview(text);if(!result.valid)return result;repository.insert(result.rows.map(r=>r.values));return result;}
export const list=repository.list;
