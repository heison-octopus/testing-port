import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.POC_DB || new URL('../../portfolio.sqlite', import.meta.url).pathname);
const now = () => new Date().toISOString();
const get = (sql, ...params) => db.prepare(sql).get(...params);
const all = (sql, ...params) => db.prepare(sql).all(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schools(id TEXT PRIMARY KEY,name TEXT NOT NULL,disabled INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),name TEXT NOT NULL,role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments(user_id TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,PRIMARY KEY(user_id,scope_type,scope_id));
CREATE TABLE IF NOT EXISTS features(school_id TEXT NOT NULL,feature TEXT NOT NULL,enabled INTEGER NOT NULL,PRIMARY KEY(school_id,feature));
CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL,form_version_id TEXT,labels TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants(activity_id TEXT NOT NULL,student_id TEXT NOT NULL,attendance TEXT NOT NULL DEFAULT 'pending',attendance_approval TEXT NOT NULL DEFAULT 'none',PRIMARY KEY(activity_id,student_id));
CREATE TABLE IF NOT EXISTS form_versions(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,name TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL,author_id TEXT NOT NULL,template_key TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS form_links(form_version_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY,form_version_id TEXT NOT NULL,block_audience TEXT NOT NULL,position INTEGER NOT NULL,prompt TEXT NOT NULL,input_type TEXT NOT NULL,source TEXT NOT NULL,meaning TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS responses(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,question_id TEXT NOT NULL,author_id TEXT NOT NULL,answer TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proof(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,response_id TEXT,kind TEXT NOT NULL,perspective TEXT NOT NULL,authorship TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalogues(id TEXT PRIMARY KEY,name TEXT NOT NULL,version TEXT NOT NULL,kind TEXT NOT NULL,assessment_capable INTEGER NOT NULL,status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS axes(id TEXT PRIMARY KEY,catalogue_id TEXT NOT NULL,name TEXT NOT NULL,position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS levels(axis_id TEXT NOT NULL,level INTEGER NOT NULL,condition TEXT NOT NULL,PRIMARY KEY(axis_id,level));
CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,axis_id TEXT NOT NULL,level INTEGER NOT NULL,proof_id TEXT NOT NULL,author_id TEXT NOT NULL,comment TEXT NOT NULL,confirmed INTEGER NOT NULL,decision TEXT NOT NULL,reason TEXT,decided_by TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS review_decisions(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,observation_id TEXT NOT NULL,decision TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calculation_policies(id TEXT PRIMARY KEY,version TEXT NOT NULL,processor_key TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL,manifest TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS activity_events(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS peer_assignments(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,subject_student_id TEXT NOT NULL,reviewer_student_id TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS peer_reviews(id TEXT PRIMARY KEY,assignment_id TEXT NOT NULL,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,subject_student_id TEXT NOT NULL,reviewer_student_id TEXT NOT NULL,raw_comment TEXT NOT NULL,rating INTEGER NOT NULL,status TEXT NOT NULL,moderated_by TEXT,moderation_note TEXT,sanitized_statement TEXT,created_at TEXT NOT NULL,reviewed_at TEXT);
CREATE TABLE IF NOT EXISTS learner_summaries(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,period TEXT NOT NULL,draft_text TEXT NOT NULL,status TEXT NOT NULL,source_tags TEXT NOT NULL,modified_by TEXT,approved_by TEXT,updated_at TEXT NOT NULL,UNIQUE(school_id,student_id,period));
CREATE TABLE IF NOT EXISTS media_items(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,uploaded_by TEXT NOT NULL,name TEXT NOT NULL,mime_type TEXT NOT NULL,asset_url TEXT,extracted_text TEXT NOT NULL,extraction_status TEXT NOT NULL,status TEXT NOT NULL,reviewer_id TEXT,proof_id TEXT,disabled_at TEXT,disabled_by TEXT,disabled_reason TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS portfolio_warnings(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,source_id TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS school_policies(school_id TEXT NOT NULL,policy_key TEXT NOT NULL,policy_value TEXT NOT NULL,updated_by TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(school_id,policy_key));
CREATE TABLE IF NOT EXISTS prompt_presets(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,name TEXT NOT NULL,focus TEXT NOT NULL,prompt TEXT NOT NULL,active INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS generation_attempts(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,period TEXT NOT NULL,report_key TEXT NOT NULL,preset_id TEXT NOT NULL,prompt TEXT NOT NULL,output TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,selected INTEGER NOT NULL DEFAULT 0);
`);

function addUser(id, name, role = 'student') {
  run('INSERT OR IGNORE INTO users VALUES(?,?,?,?)', id, 'school-1', name, role);
}

function addActivity({ id, title, description, labels, formId, question, participants = ['student-1'] }) {
  run('INSERT OR IGNORE INTO form_versions VALUES(?,?,?,?,?,?,?)', formId, 'school-1', `${title} reflection`, 1, 'published', 'teacher-1', 'reflection-v1');
  run('INSERT OR IGNORE INTO questions VALUES(?,?,?,?,?,?,?,?)', formId === 'form-1' ? 'q-1' : `${formId}-q1`, formId, 'student', 1, question, 'long_text', 'POC fictional scenario', 'Student reflection');
  run('INSERT OR IGNORE INTO form_links VALUES(?,?)', formId, id);
  run('INSERT OR IGNORE INTO activities VALUES(?,?,?,?,?,?,?)', id, 'school-1', title, description, 'published', formId, JSON.stringify(labels));
  for (const studentId of participants) run('INSERT OR IGNORE INTO participants VALUES(?,?,?,?)', id, studentId, 'attended', 'none');
  run('INSERT OR IGNORE INTO activity_events VALUES(?,?,?,?,?,?,?)', `event-${id}-published`, 'school-1', id, 'staff-1', 'published', 'Created directly by authorized staff for the fictional POC.', now());
  for (const userId of ['teacher-1', 'staff-1']) run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', userId, 'activity', id);
  run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'form_approve', id);
}

function addProof(id, activityId, kind, perspective, content, responseId = null) {
  run('INSERT OR IGNORE INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', id, 'school-1', activityId, 'student-1', responseId, kind, perspective, 'human_authored', content, 'accepted', now());
}

function addObservation(id, activityId, axisId, level, proofId, comment, decision = 'included') {
  run('INSERT OR IGNORE INTO observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, 'school-1', activityId, 'student-1', axisId, level, proofId, 'teacher-1', comment, 1, decision, decision === 'included' ? 'Evidence and context support this fictional POC observation.' : null, decision === 'included' ? 'staff-1' : null, now());
}

if (!get('SELECT id FROM schools WHERE id=?', 'school-1')) {
  db.exec('BEGIN');
  try {
    run('INSERT INTO schools VALUES(?,?,0)', 'school-1', 'BHSS demonstration');
    run('INSERT INTO schools VALUES(?,?,0)', 'school-2', 'Other school');
    for (const u of [
      ['student-1', 'school-1', 'Chan Mei', 'student'],
      ['student-2', 'school-1', 'Lee Ho', 'student'],
      ['teacher-1', 'school-1', 'Ms Chan', 'teacher'],
      ['staff-1', 'school-1', 'Mr Wong', 'staff'],
      ['admin-1', 'school-1', 'School administrator', 'admin'],
      ['other-1', 'school-2', 'Other school student', 'student'],
    ]) run('INSERT INTO users VALUES(?,?,?,?)', ...u);
    for (const f of ['activities', 'forms', 'assessment', 'portfolio', 'admin', 'media', 'prompts']) run('INSERT INTO features VALUES(?,?,1)', 'school-1', f);
    run('INSERT INTO catalogues VALUES(?,?,?,?,?,?)', 'vask-1', 'VASK', 'demo-1', 'labels', 0, 'active');
    run('INSERT INTO catalogues VALUES(?,?,?,?,?,?)', 'sb-1', 'Skills Builder', 'POC-demo-2', 'rubric', 1, 'sample');
    const axes = ['Listening', 'Speaking', 'Problem solving', 'Creativity', 'Adapting', 'Planning', 'Leadership', 'Teamwork'];
    for (let i = 0; i < axes.length; i += 1) {
      const axisId = `axis-${i + 1}`;
      run('INSERT INTO axes VALUES(?,?,?,?)', axisId, 'sb-1', axes[i], i + 1);
      for (let level = 1; level <= 16; level += 1) run('INSERT INTO levels VALUES(?,?,?)', axisId, level, `POC-only evidence condition for ${axes[i]} step ${level}. Replace with school-authorized rubric wording before real assessment.`);
    }
    run('INSERT INTO calculation_policies VALUES(?,?,?)', 'max-confirmed', '1', 'max-confirmed-v1');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Idempotent v2 fictional-data extension. It also upgrades databases created by the first POC.
for (const f of ['media', 'prompts']) run('INSERT OR IGNORE INTO features VALUES(?,?,1)', 'school-1', f);
run("UPDATE axes SET name='Adapting' WHERE id='axis-5'");
run("UPDATE axes SET name='Planning' WHERE id='axis-6'");
run("UPDATE catalogues SET version='POC-demo-2' WHERE id='sb-1'");
run("UPDATE levels SET condition=REPLACE(REPLACE(condition,'Staying positive','Adapting'),'Aiming high','Planning') WHERE axis_id IN ('axis-5','axis-6')");

addUser('student-1', 'Chan Mei');
addUser('student-2', 'Lee Ho');
for (let n = 1; n <= 10; n += 1) addUser(`peer-${n}`, `Peer reviewer ${String(n).padStart(2, '0')}`);
addUser('teacher-1', 'Ms Chan', 'teacher');
addUser('staff-1', 'Mr Wong', 'staff');
addUser('admin-1', 'School administrator', 'admin');

for (const a of [
  ['teacher-1', 'student', 'student-1'], ['teacher-1', 'student', 'student-2'],
  ['staff-1', 'student', 'student-1'], ['staff-1', 'student', 'student-2'],
  ['staff-1', 'review', 'student-1'], ['staff-1', 'review', 'student-2'],
  ['teacher-1', 'summary_review', 'student-1'],
]) run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', ...a);

addActivity({
  id: 'activity-1', formId: 'form-1', title: 'Community garden',
  description: 'Students work together to plan and maintain a garden.', labels: ['Responsibility', 'Collaboration'],
  question: 'What did you contribute and learn?', participants: ['student-1', 'student-2'],
});
addActivity({
  id: 'activity-piano', formId: 'form-piano', title: 'Inter-school piano competition',
  description: 'Mei practised for the recital, performed a prepared piece and responded calmly after a missed passage.', labels: ['Creativity', 'Discipline', 'Performance'],
  question: 'How did you prepare, respond to pressure and learn from the performance?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});
addActivity({
  id: 'activity-dialogue', formId: 'form-dialogue', title: 'Dialogue circle: fear of death',
  description: 'A facilitated discussion where students listened to different beliefs, asked careful questions and reflected on uncertainty.', labels: ['Listening', 'Empathy', 'Critical reflection'],
  question: 'What perspective did you hear, and how did it affect your own thinking?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});
addActivity({
  id: 'activity-future', formId: 'form-future', title: 'Future pathways conversation',
  description: 'Mei discussed university and work options with her class teacher, compared routes and identified positive next steps.', labels: ['Planning', 'Self-awareness', 'Career exploration'],
  question: 'What options are you considering and what is your next step?', participants: ['student-1'],
});
addActivity({
  id: 'activity-prefect', formId: 'form-prefect', title: 'Junior prefect duty coordination',
  description: 'Mei supported younger prefects but missed the duty timetable deadline, causing late notice for two shifts.', labels: ['Leadership', 'Planning', 'Responsibility'],
  question: 'What happened, what was the impact and what will you change next time?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});

addProof('proof-1', 'activity-1', 'teacher_observation', 'teacher', 'Worked with classmates to plan the garden.');
addProof('proof-piano', 'activity-piano', 'media_review', 'staff', 'Published recital image and teacher note confirm focused preparation, performance and recovery after a missed passage.');
addProof('proof-dialogue', 'activity-dialogue', 'teacher_observation', 'teacher', 'Asked careful follow-up questions and summarized two contrasting views without dismissing either speaker.');
addProof('proof-future', 'activity-future', 'teacher_observation', 'teacher', 'Compared university and employment routes and agreed three positive next actions with the class teacher.');
addProof('proof-prefect', 'activity-prefect', 'incident_record', 'teacher', 'Missed the timetable handover deadline; lower prefects received late notice for two duty shifts.');
addProof('proof-kindness', 'activity-prefect', 'teacher_observation', 'teacher', 'Teachers consistently reported that Mei checked on younger students, explained duties patiently and offered practical help.');

addObservation('obs-1', 'activity-1', 'axis-8', 4, 'proof-1', 'Chan Mei showed collaborative participation during group planning.');
addObservation('obs-piano-creativity', 'activity-piano', 'axis-4', 7, 'proof-piano', 'Chan Mei showed creative interpretation and purposeful refinement through her piano preparation and performance.');
addObservation('obs-piano-adapting', 'activity-piano', 'axis-5', 6, 'proof-piano', 'Chan Mei showed adapting by recovering calmly after a missed passage and completing the performance.');
addObservation('obs-dialogue-listening', 'activity-dialogue', 'axis-1', 8, 'proof-dialogue', 'Chan Mei showed attentive listening by accurately connecting and contrasting viewpoints in a sensitive discussion.');
addObservation('obs-dialogue-speaking', 'activity-dialogue', 'axis-2', 6, 'proof-dialogue', 'Chan Mei showed careful speaking by asking relevant questions and expressing uncertainty respectfully.');
addObservation('obs-future-planning', 'activity-future', 'axis-6', 7, 'proof-future', 'Chan Mei showed planning by comparing pathways and turning the discussion into specific next actions.');
addObservation('obs-prefect-growth', 'activity-prefect', 'axis-6', 4, 'proof-prefect', 'The missed timetable is retained as a growth record: follow-through and earlier communication need strengthening.');
addObservation('obs-kindness-teamwork', 'activity-prefect', 'axis-8', 7, 'proof-kindness', 'Chan Mei showed supportive teamwork through patient guidance and practical help for younger prefects.');

const peerComments = {
  'activity-piano': [
    'She encouraged us before the performance and stayed kind even when everyone was nervous.',
    'Her preparation was careful and she did not blame anyone after making a mistake.',
    'She listened to suggestions from the group and adjusted part of her practice plan.',
  ],
  'activity-dialogue': [
    'She made the discussion feel safe and did not laugh at views that were different from hers.',
    'Mei listened first, then asked a question that helped me explain what I meant.',
    'She was thoughtful and kind when the topic became emotional.',
  ],
  'activity-prefect': [
    'The timetable was late, but she apologized and helped every lower prefect reorganize the shifts.',
    'She missed the deadline but was patient when I asked what to do.',
    'She is really nice to younger prefects and checked that nobody was left alone.',
  ],
};

for (const activityId of Object.keys(peerComments)) {
  for (let n = 1; n <= 10; n += 1) {
    const reviewerId = `peer-${n}`;
    const assignmentId = `peer-assignment-${activityId}-${n}`;
    const reviewId = `peer-review-${activityId}-${n}`;
    const rawComment = peerComments[activityId][(n - 1) % 3];
    const pending = n === 10;
    const sanitized = activityId === 'activity-prefect'
      ? 'Chan Mei showed kindness and repair after a planning mistake by apologizing, reorganizing shifts and supporting younger prefects.'
      : activityId === 'activity-dialogue'
        ? 'Chan Mei showed respectful listening and empathy by making space for different views during a sensitive group discussion.'
        : 'Chan Mei showed supportive teamwork and composure while preparing for and participating in the piano competition.';
    run('INSERT OR IGNORE INTO peer_assignments VALUES(?,?,?,?,?,?)', assignmentId, 'school-1', activityId, 'student-1', reviewerId, 'completed');
    run('INSERT OR IGNORE INTO peer_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', reviewId, assignmentId, 'school-1', activityId, 'student-1', reviewerId, rawComment, 4 + (n % 2), pending ? 'pending' : 'approved', pending ? null : 'staff-1', pending ? null : 'Staff confirmed relevance, respectful language and identifiable source assignment.', pending ? null : sanitized, now(), pending ? null : now());
    if (!pending) addProof(`proof-${reviewId}`, activityId, 'peer_review', 'peer', sanitized, reviewId);
  }
}

run('INSERT OR IGNORE INTO learner_summaries VALUES(?,?,?,?,?,?,?,?,?,?)', 'summary-student-1-2026-t1', 'school-1', 'student-1', '2026–27 Term 1', 'Chan Mei is a thoughtful and supportive learner who listens carefully, adapts after setbacks and takes positive steps towards her future. Her piano performance, sensitive dialogue participation and university or work planning show growing confidence. The missed prefect timetable remains an important growth record: she repaired the impact kindly, and her next focus is earlier follow-through and communication.', 'approved', JSON.stringify(['activity-piano', 'activity-dialogue', 'activity-future', 'activity-prefect', 'teacher-observation', 'peer-review']), 'teacher-1', 'teacher-1', now());

run('INSERT OR IGNORE INTO media_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'media-piano', 'school-1', 'activity-piano', 'student-1', 'teacher-1', 'piano-competition-evidence.png', 'image/png', '/assets/piano-competition-fictional-evidence.png', 'Student performing at the school piano competition; teacher confirmed the activity and context.', 'complete', 'published', 'staff-1', 'proof-piano', null, null, null, now());
run('INSERT OR IGNORE INTO media_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'media-prefect-note', 'school-1', 'activity-prefect', 'student-1', 'teacher-1', 'prefect-duty-note.jpg', 'image/jpeg', null, 'Messy OCR sample: timetable not sent friday; lower prefect confused; Mei apologised and fixed shift list.', 'complete', 'awaiting_review', null, null, null, null, null, now());

for (const [key, value] of [
  ['portfolio_regeneration_role', 'admin'],
  ['privacy_adapter_status', 'not_configured'],
  ['media_withdrawal_recalculation', 'manual_warning_only'],
]) run('INSERT OR IGNORE INTO school_policies VALUES(?,?,?,?,?)', 'school-1', key, value, 'admin-1', now());

for (const preset of [
  ['preset-balanced', 'Balanced growth', 'balanced', 'Create a concise, evidence-backed learner profile balancing academic and non-academic development. Retain growth areas without using deficit language.'],
  ['preset-academic', 'Academic pathways', 'academic', 'Prioritize learning habits, academic choices and future study pathways while retaining source tags.'],
  ['preset-whole-person', 'Whole-person development', 'non-academic', 'Prioritize participation, relationships, resilience, leadership and creative development while retaining source tags.'],
]) run('INSERT OR IGNORE INTO prompt_presets VALUES(?,?,?,?,?,1)', preset[0], 'school-1', preset[1], preset[2], preset[3]);

run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'form_approve', 'activity-1');
run('INSERT OR IGNORE INTO form_links SELECT form_version_id,id FROM activities WHERE form_version_id IS NOT NULL');

if (!get("SELECT id FROM snapshots WHERE id='snapshot-fictional-profile'")) {
  const selectedObservations = all(`SELECT o.*,p.content proof_content,p.kind proof_kind,p.status proof_status,
    a.name axis_name,c.name catalogue_name,c.version catalogue_version,act.title activity_title
    FROM observations o JOIN proof p ON p.id=o.proof_id JOIN axes a ON a.id=o.axis_id
    JOIN catalogues c ON c.id=a.catalogue_id JOIN activities act ON act.id=o.activity_id
    WHERE o.id IN ('obs-piano-creativity','obs-piano-adapting','obs-dialogue-listening','obs-dialogue-speaking','obs-future-planning','obs-kindness-teamwork')`);
  const resultFor = (observationId) => {
    const observation = selectedObservations.find(item => item.id === observationId);
    return {
      axisId: observation.axis_id,
      axis: observation.axis_name,
      rubric: observation.catalogue_name,
      version: observation.catalogue_version,
      level: observation.level,
      observationIds: [observation.id],
      proofIds: [observation.proof_id],
      statement: observation.comment,
      sourceTags: [{ activity: observation.activity_title, type: observation.proof_kind.replaceAll('_', ' '), proofId: observation.proof_id }],
    };
  };
  const manifest = {
    period: '2026–27 Term 1',
    policy: { id: 'max-confirmed', version: '1', processor: 'max-confirmed-v1' },
    results: ['obs-dialogue-listening', 'obs-dialogue-speaking', 'obs-piano-creativity', 'obs-piano-adapting', 'obs-future-planning', 'obs-kindness-teamwork'].map(resultFor),
    summary: {
      text: get("SELECT draft_text FROM learner_summaries WHERE id='summary-student-1-2026-t1'").draft_text,
      sourceTags: ['Inter-school piano competition', 'Dialogue circle: fear of death', 'Future pathways conversation', 'Junior prefect duty coordination', 'teacher observation', 'peer review'],
      approvedBy: 'teacher-1',
    },
    observations: selectedObservations,
  };
  run("UPDATE snapshots SET status='superseded' WHERE school_id='school-1' AND student_id='student-1' AND status='published'");
  run('INSERT INTO snapshots VALUES(?,?,?,?,?,?,?)', 'snapshot-fictional-profile', 'school-1', 'student-1', 'staff-1', now(), 'published', JSON.stringify(manifest));
}

export { db, get, all, run };
