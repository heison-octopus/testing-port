import { db, id, now } from '../db.js';
import { audit } from './auditService.js';

export function resolveClassAt(studentId, at) {
  return db.prepare(`
    SELECT scm.*, c.code class_code, c.grade_level class_grade, ay.label academic_year
    FROM student_class_memberships scm
    JOIN classes c ON c.id = scm.class_id
    JOIN academic_years ay ON ay.id = scm.academic_year_id
    WHERE scm.student_id = ? AND scm.valid_from <= ? AND (scm.valid_to IS NULL OR scm.valid_to >= ?)
    ORDER BY scm.valid_from DESC LIMIT 1
  `).get(studentId, at, at) ?? null;
}

export function studentTimeline(studentId) {
  const memberships = db.prepare(`SELECT scm.*, c.code class_code, ay.label academic_year, u.display_name_zh created_by_name
    FROM student_class_memberships scm JOIN classes c ON c.id=scm.class_id JOIN academic_years ay ON ay.id=scm.academic_year_id
    LEFT JOIN users u ON u.id=scm.created_by WHERE scm.student_id=? ORDER BY scm.valid_from DESC`).all(studentId);
  const statuses = db.prepare(`SELECT ssh.*,u.display_name_zh created_by_name FROM student_school_status_history ssh
    LEFT JOIN users u ON u.id=ssh.created_by WHERE ssh.student_id=? ORDER BY ssh.valid_from DESC`).all(studentId);
  return { memberships, statuses };
}

export function recordSchoolStatus({studentId,status,validFrom,reason,actor}){
  const current=db.prepare(`SELECT * FROM student_school_status_history WHERE student_id=? AND valid_to IS NULL ORDER BY valid_from DESC LIMIT 1`).get(studentId);
  const end=new Date(`${validFrom}T00:00:00Z`);end.setUTCDate(end.getUTCDate()-1);
  if(current) db.prepare('UPDATE student_school_status_history SET valid_to=? WHERE id=?').run(end.toISOString().slice(0,10),current.id);
  const row={id:id('SSH'),student_id:studentId,status,valid_from:validFrom,valid_to:null,reason:reason||null,created_by:actor,created_at:now()};
  const keys=Object.keys(row);db.prepare(`INSERT INTO student_school_status_history(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
  audit(actor,'student.school_status.changed','student_school_status_history',row.id,current,row);
  return row;
}

function closeOpenMembership(studentId, beforeDate) {
  const open = db.prepare(`SELECT * FROM student_class_memberships WHERE student_id=? AND valid_to IS NULL ORDER BY valid_from DESC LIMIT 1`).get(studentId);
  if (!open) return null;
  const end = new Date(`${beforeDate}T00:00:00Z`); end.setUTCDate(end.getUTCDate()-1);
  db.prepare('UPDATE student_class_memberships SET valid_to=? WHERE id=?').run(end.toISOString().slice(0,10), open.id);
  return open;
}

export function moveStudent({ studentId, academicYearId, periodId, classId, gradeLevel, validFrom, changeType, reason, actor }) {
  const previous = closeOpenMembership(studentId, validFrom);
  const row = { id:id('MEM'), student_id:studentId, academic_year_id:academicYearId, period_id:periodId || null, class_id:classId,
    grade_level:gradeLevel, valid_from:validFrom, valid_to:null, change_type:changeType, reason:reason || null,
    supersedes_membership_id:previous?.id ?? null, created_by:actor, created_at:now() };
  const keys=Object.keys(row);
  db.prepare(`INSERT INTO student_class_memberships(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
  audit(actor,'student.membership.changed','student_class_membership',row.id,previous,row);
  return row;
}

export function previewRollover({ fromAcademicYearId, toAcademicYearId, roster, actor }) {
  const comparison = roster.map(entry => {
    const byNumber = db.prepare('SELECT * FROM students WHERE student_number=?').get(entry.student_number);
    if (!byNumber) return { ...entry, outcome:'new_candidate', requires_identity_confirmation:true };
    const current = db.prepare(`SELECT scm.*,c.code class_code FROM student_class_memberships scm JOIN classes c ON c.id=scm.class_id
      WHERE scm.student_id=? AND scm.academic_year_id=? ORDER BY scm.valid_from DESC LIMIT 1`).get(byNumber.id,fromAcademicYearId);
    let outcome='unchanged';
    if (!current) outcome='returning';
    else if (current.grade_level === entry.grade_level && current.class_code !== entry.class_code) outcome='class_move';
    else if (current.grade_level === entry.grade_level) outcome='retained';
    else outcome='promoted_or_regraded';
    return { ...entry, student_id:byNumber.id, from_class:current?.class_code ?? null, from_grade:current?.grade_level ?? null, outcome, requires_identity_confirmation:false };
  });
  const incomingNumbers = new Set(roster.map(r=>r.student_number));
  const current = db.prepare(`SELECT s.id student_id,s.student_number,s.english_name,s.chinese_name,c.code class_code,scm.grade_level
    FROM student_class_memberships scm JOIN students s ON s.id=scm.student_id JOIN classes c ON c.id=scm.class_id
    WHERE scm.academic_year_id=? AND scm.valid_to IS NULL`).all(fromAcademicYearId);
  current.filter(row=>!incomingNumbers.has(row.student_number)).forEach(row=>comparison.push({...row,outcome:'outgoing_or_missing',requires_identity_confirmation:true}));
  const batch={id:id('ROL'),from_academic_year_id:fromAcademicYearId,to_academic_year_id:toAcademicYearId,status:'preview',comparison_json:JSON.stringify(comparison),created_by:actor,created_at:now(),applied_at:null};
  const keys=Object.keys(batch); db.prepare(`INSERT INTO rollover_batches(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>batch[k]));
  audit(actor,'rollover.previewed','rollover_batch',batch.id,null,{comparison});
  return {...batch,comparison};
}

export function applyRollover(batchId, confirmations, actor) {
  const batch=db.prepare('SELECT * FROM rollover_batches WHERE id=?').get(batchId);
  if(!batch || batch.status!=='preview') throw Object.assign(new Error('Rollover preview not found or already applied.'),{status:409});
  const rows=JSON.parse(batch.comparison_json);
  const tx=db.transaction(()=>{
    for(const row of rows){
      if(row.outcome==='new_candidate'){
        if(!confirmations?.[row.student_number]?.is_new_student) continue;
        const studentId=id('STU');
        db.prepare(`INSERT INTO students(id,user_id,student_number,english_name,chinese_name,date_of_birth,created_at) VALUES(?,?,?,?,?,?,?)`)
          .run(studentId,null,row.student_number,row.english_name,row.chinese_name,row.date_of_birth||null,now());
        db.prepare(`INSERT INTO student_school_status_history(id,student_id,status,valid_from,reason,created_by,created_at) VALUES(?,?,?,?,?,?,?)`)
          .run(id('SSH'),studentId,'active',row.valid_from,'Confirmed as a new student during rollover',actor,now());
        row.student_id=studentId;
      }
      if(['new_candidate','returning','class_move','retained','promoted_or_regraded'].includes(row.outcome) && row.student_id){
        const cls=db.prepare('SELECT * FROM classes WHERE academic_year_id=? AND code=?').get(batch.to_academic_year_id,row.class_code);
        if(!cls) continue;
        moveStudent({studentId:row.student_id,academicYearId:batch.to_academic_year_id,periodId:null,classId:cls.id,gradeLevel:row.grade_level,validFrom:row.valid_from,changeType:row.outcome==='retained'?'retained':row.outcome==='class_move'?'class_move':row.outcome==='returning'?'returned':'promoted',reason:'Applied from reviewed year-transition batch',actor});
      }
    }
    db.prepare('UPDATE rollover_batches SET status=?, applied_at=? WHERE id=?').run('applied',now(),batchId);
  }); tx();
  audit(actor,'rollover.applied','rollover_batch',batchId,null,{confirmations});
  return db.prepare('SELECT * FROM rollover_batches WHERE id=?').get(batchId);
}

export function activityParticipants(activityId) {
  const activity=db.prepare('SELECT * FROM activities WHERE id=?').get(activityId);
  if(!activity) return [];
  return db.prepare(`SELECT ap.*,s.student_number,s.english_name,s.chinese_name FROM activity_participants ap JOIN students s ON s.id=ap.student_id WHERE ap.activity_id=?`).all(activityId)
    .map(p=>({...p,class_at_activity:resolveClassAt(p.student_id,activity.starts_at.slice(0,10))}));
}
