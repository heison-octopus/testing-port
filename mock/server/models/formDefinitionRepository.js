import { db, id, now } from '../db.js';

const parse = value => { try { return JSON.parse(value); } catch { return []; } };

export class FormDefinitionRepository {
  activity(activityId) {
    return db.prepare('SELECT * FROM activities WHERE id=?').get(activityId) ?? null;
  }

  selectedVask(activityId) {
    return db.prepare(`
      SELECT cl.id,cl.code,cl.name_en,cl.name_zh
      FROM activity_labels al
      JOIN catalogue_labels cl ON cl.id=al.label_id
      JOIN label_catalogues lc ON lc.id=cl.catalogue_id
      WHERE al.activity_id=? AND lc.code='VASK' AND al.label_role='descriptor'
      ORDER BY cl.display_order
    `).all(activityId);
  }

  questionBank() {
    const rows=db.prepare(`
      SELECT q.* FROM questions q
      WHERE q.source_question_id IS NULL AND q.source_workbook='10份技能問卷整理總表.xlsx'
      ORDER BY q.source_row,q.id
    `).all();
    return rows.map(row=>({...row,labels_json:parse(row.labels_json)}));
  }

  versions(activityId) {
    return db.prepare(`
      SELECT afv.*,
        (SELECT COUNT(*) FROM question_blocks qb WHERE qb.form_version_id=afv.id) block_count,
        (SELECT COUNT(*) FROM activity_questions aq JOIN question_blocks qb ON qb.id=aq.question_block_id WHERE qb.form_version_id=afv.id) question_count
      FROM activity_form_versions afv WHERE afv.activity_id=? ORDER BY afv.version DESC
    `).all(activityId).map(row=>({...row,selected_vask_json:parse(row.selected_vask_json)}));
  }

  createImport(batch, rows) {
    const insertBatch=db.prepare(`INSERT INTO form_definition_imports
      (id,activity_id,uploaded_by,original_name,status,base_version,selected_vask_json,created_at,committed_at)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insertRow=db.prepare(`INSERT INTO form_definition_import_rows
      (id,batch_id,row_number,include_flag,source_question_id,question_version,section_code,section_title_zh,section_title_en,audience,display_order,prompt_zh,prompt_en,scale_type,scale_min,scale_max,required,ability_code,ability_name_en,ability_name_zh,teacher_note,validation_status,validation_message,change_type,original_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(()=>{
      insertBatch.run(batch.id,batch.activity_id,batch.uploaded_by,batch.original_name,batch.status,batch.base_version,batch.selected_vask_json,batch.created_at,batch.committed_at);
      for(const row of rows) insertRow.run(row.id,batch.id,row.row_number,row.include_flag,row.source_question_id,row.question_version,row.section_code,row.section_title_zh,row.section_title_en,row.audience,row.display_order,row.prompt_zh,row.prompt_en,row.scale_type,row.scale_min,row.scale_max,row.required,row.ability_code,row.ability_name_en,row.ability_name_zh,row.teacher_note,row.validation_status,row.validation_message,row.change_type,row.original_json);
    })();
    return this.importDetail(batch.id);
  }

  importDetail(batchId) {
    const batch=db.prepare('SELECT * FROM form_definition_imports WHERE id=?').get(batchId);
    if(!batch)return null;
    const rows=db.prepare('SELECT * FROM form_definition_import_rows WHERE batch_id=? ORDER BY row_number').all(batchId);
    return {...batch,selected_vask_json:parse(batch.selected_vask_json),rows,valid:rows.length>0&&rows.every(row=>row.validation_status==='valid'),included_count:rows.filter(row=>row.include_flag==='yes').length};
  }

  commitImport(batchId, actorId) {
    const batch=this.importDetail(batchId);
    if(!batch)return null;
    const version=db.prepare('SELECT COALESCE(MAX(version),0)+1 next FROM activity_form_versions WHERE activity_id=?').get(batch.activity_id).next;
    const formVersionId=id('AFV');
    const timestamp=now();
    const included=batch.rows.filter(row=>row.include_flag==='yes');
    const sectionKeys=[];
    for(const row of included){const key=`${row.audience}|${row.section_code}|${row.section_title_zh}|${row.section_title_en}`;if(!sectionKeys.includes(key))sectionKeys.push(key);}
    const insertBlock=db.prepare(`INSERT INTO question_blocks (id,activity_id,title_en,title_zh,audience,sort_order,version,status,created_by,created_at,form_version_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insertQuestion=db.prepare(`INSERT INTO questions (id,source_workbook,source_sheet,source_row,source_construct_en,source_construct_zh,subdomain,prompt_zh,prompt_en,scale_type,labels_json,ability_code,ability_name_en,ability_name_zh,ability_description_en,ability_description_zh,is_negative,respondent_scope,approval_status,question_version,source_question_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insertActivityQuestion=db.prepare('INSERT INTO activity_questions (id,activity_id,question_id,sort_order,required,question_block_id) VALUES (?,?,?,?,?,?)');
    db.transaction(()=>{
      db.prepare("UPDATE activity_form_versions SET status='retired' WHERE activity_id=? AND status='draft'").run(batch.activity_id);
      db.prepare(`INSERT INTO activity_form_versions (id,activity_id,version,status,source_import_id,selected_vask_json,created_by,created_at,published_at) VALUES (?,?,?,?,?,?,?,?,NULL)`).run(formVersionId,batch.activity_id,version,'draft',batch.id,JSON.stringify(batch.selected_vask_json),actorId,timestamp);
      const blockIds=new Map();
      sectionKeys.forEach((key,index)=>{
        const [audience,sectionCode,titleZh,titleEn]=key.split('|');const blockId=id('QB');blockIds.set(key,blockId);
        insertBlock.run(blockId,batch.activity_id,titleEn,titleZh,audience,index+1,version,'draft',actorId,timestamp,formVersionId);
      });
      for(const row of included){
        const source=row.source_question_id?db.prepare('SELECT * FROM questions WHERE id=?').get(row.source_question_id):null;
        const questionId=id('Q');
        insertQuestion.run(questionId,source?.source_workbook??'Teacher form-definition XLSX',source?.source_sheet??'Imported definition',source?.source_row??row.row_number,source?.source_construct_en??'Teacher-authored',source?.source_construct_zh??'老師新增',source?.subdomain??row.section_code,row.prompt_zh,row.prompt_en??'',row.scale_type,JSON.stringify(Array.from({length:row.scale_max-row.scale_min+1},(_,i)=>String(row.scale_min+i))),row.ability_code,row.ability_name_en,row.ability_name_zh,source?.ability_description_en??'',source?.ability_description_zh??'',source?.is_negative??0,row.audience,'approved_for_context',row.question_version,row.source_question_id);
        const key=`${row.audience}|${row.section_code}|${row.section_title_zh}|${row.section_title_en}`;
        insertActivityQuestion.run(id('AQ'),batch.activity_id,questionId,row.display_order,row.required,blockIds.get(key));
      }
      db.prepare("UPDATE form_definition_imports SET status='committed',committed_at=? WHERE id=?").run(timestamp,batch.id);
    })();
    return this.versions(batch.activity_id).find(item=>item.id===formVersionId);
  }

  publishVersion(versionId) {
    const version=db.prepare('SELECT * FROM activity_form_versions WHERE id=?').get(versionId);
    if(!version)return null;
    const timestamp=now();
    db.transaction(()=>{
      db.prepare("UPDATE question_blocks SET status='retired' WHERE activity_id=? AND status='published'").run(version.activity_id);
      db.prepare("UPDATE activity_form_versions SET status='retired' WHERE activity_id=? AND status='published'").run(version.activity_id);
      db.prepare("UPDATE question_blocks SET status='published' WHERE form_version_id=?").run(version.id);
      db.prepare("UPDATE activity_form_versions SET status='published',published_at=? WHERE id=?").run(timestamp,version.id);
    })();
    return this.versions(version.activity_id).find(item=>item.id===versionId);
  }
}
