import { db, id, now } from '../db.js';

const parseDate = value => String(value || '').slice(0, 10);

export class ContractRevisionRepository {
  resolvePeriod(startsAt, endsAt) {
    const start=parseDate(startsAt);const end=parseDate(endsAt);
    const periods=db.prepare(`SELECT sp.*,ay.label academic_year FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id ORDER BY sp.starts_on`).all();
    const exact=periods.find(period=>start>=period.starts_on&&end<=period.ends_on);
    if(exact)return {status:'resolved',period:exact,start_period:exact,end_period:exact};
    const startPeriod=periods.find(period=>start>=period.starts_on&&start<=period.ends_on)??null;
    const endPeriod=periods.find(period=>end>=period.starts_on&&end<=period.ends_on)??null;
    return {status:startPeriod&&endPeriod&&startPeriod.id!==endPeriod.id?'cross_period_exception':'no_match',period:null,start_period:startPeriod,end_period:endPeriod};
  }

  rolesAndAssignments() {
    const roles=db.prepare(`SELECT rd.*,(SELECT COUNT(*) FROM user_role_assignments ura WHERE ura.role_id=rd.id AND ura.status='active') active_assignment_count FROM role_definitions rd ORDER BY rd.category,rd.code`).all();
    const assignments=db.prepare(`SELECT ura.*,u.username,u.display_name_zh,rd.code role_code,rd.name_en role_name_en,rd.name_zh role_name_zh FROM user_role_assignments ura JOIN users u ON u.id=ura.user_id JOIN role_definitions rd ON rd.id=ura.role_id ORDER BY u.username,rd.code`).all();
    return {roles,assignments};
  }

  periods() {
    return db.prepare(`SELECT sp.*,ay.label academic_year,(SELECT COUNT(*) FROM activities a WHERE a.period_id=sp.id) activity_count FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id ORDER BY sp.starts_on DESC`).all();
  }

  rubrics() {
    return db.prepare(`SELECT lc.*,(SELECT COUNT(*) FROM catalogue_labels cl WHERE cl.catalogue_id=lc.id) axis_count,(SELECT COUNT(*) FROM rubric_levels rl WHERE rl.rubric_catalogue_id=lc.id) level_count,(SELECT COUNT(*) FROM rubric_level_conditions rlc WHERE rlc.rubric_catalogue_id=lc.id) condition_count FROM label_catalogues lc ORDER BY lc.code`).all();
  }

  proofList(studentIds, user) {
    if(!studentIds.length)return [];
    const placeholders=studentIds.map(()=>'?').join(',');
    const visibility=user.role==='student'?" AND (pi.submitted_by=? OR pi.visibility_status IN ('student_visible','published_to_portfolio'))":'';
    return db.prepare(`SELECT pi.*,pt.code proof_type_code,pt.name_en proof_type_name_en,pt.name_zh proof_type_name_zh,pt.source_category,pt.may_support_assessment,s.student_number,s.chinese_name,a.title_zh activity_title,(SELECT COUNT(*) FROM proof_links pl WHERE pl.proof_item_id=pi.id AND pl.status='active') link_count FROM proof_items pi JOIN proof_type_definitions pt ON pt.id=pi.proof_type_id LEFT JOIN students s ON s.id=pi.student_id LEFT JOIN activities a ON a.id=pi.activity_id WHERE (pi.student_id IS NULL OR pi.student_id IN (${placeholders}))${visibility} ORDER BY pi.occurred_at DESC`).all(...studentIds,...(user.role==='student'?[user.id]:[]));
  }

  createProofItem(input) {
    const row={id:id('PRF'),proof_type_id:input.proof_type_id,student_id:input.student_id||null,activity_id:input.activity_id||null,source_entity_type:input.source_entity_type,source_entity_id:input.source_entity_id,perspective:input.perspective,summary:input.summary||'',occurred_at:input.occurred_at||now(),submitted_by:input.submitted_by||null,provenance_status:'source_linked',review_status:input.review_status||'unreviewed',visibility_status:input.visibility_status||'reviewers_only',created_at:now(),disabled_at:null};
    const keys=Object.keys(row);db.prepare(`INSERT OR IGNORE INTO proof_items(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));
    return db.prepare('SELECT * FROM proof_items WHERE source_entity_type=? AND source_entity_id=?').get(input.source_entity_type,input.source_entity_id);
  }

  saveMemorySetting(input, actorId) {
    const stamp=now();const promptProfile=input.prompt_profile||input.profile;const existing=input.id?db.prepare('SELECT * FROM review_outlook_memory_settings WHERE id=?').get(input.id):null;
    if(existing){db.prepare(`UPDATE review_outlook_memory_settings SET output_mode=?,from_period_id=?,to_period_id=?,include_activity_descriptions=?,include_activity_outcomes=?,include_accepted_proof_summaries=?,include_published_rubric_results=?,prompt_profile=?,status='active',updated_at=? WHERE id=?`).run(input.output_mode,input.from_period_id,input.to_period_id,input.include_activity_descriptions?1:0,input.include_activity_outcomes?1:0,input.include_accepted_proof_summaries?1:0,input.include_published_rubric_results?1:0,promptProfile,stamp,existing.id);return db.prepare('SELECT * FROM review_outlook_memory_settings WHERE id=?').get(existing.id);}
    const row={id:id('MEMSET'),owner_user_id:actorId,target_scope_type:input.target_scope_type||'student',target_scope_id:input.target_scope_id,output_mode:input.output_mode,from_period_id:input.from_period_id,to_period_id:input.to_period_id,include_activity_descriptions:input.include_activity_descriptions?1:0,include_activity_outcomes:input.include_activity_outcomes?1:0,include_accepted_proof_summaries:input.include_accepted_proof_summaries?1:0,include_published_rubric_results:input.include_published_rubric_results?1:0,prompt_profile:promptProfile,prompt_version:'review-outlook-v1',status:'active',created_at:stamp,updated_at:stamp};
    const keys=Object.keys(row);db.prepare(`INSERT INTO review_outlook_memory_settings(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));return row;
  }

  memorySettings(actorId) {
    return db.prepare(`SELECT rms.*,fp.label from_period_label,tp.label to_period_label FROM review_outlook_memory_settings rms JOIN school_periods fp ON fp.id=rms.from_period_id JOIN school_periods tp ON tp.id=rms.to_period_id WHERE rms.owner_user_id=? AND rms.status<>'retired' ORDER BY rms.updated_at DESC`).all(actorId);
  }
}
