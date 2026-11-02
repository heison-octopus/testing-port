import { dataOperationsRepository } from '../repositories/dataOperationsRepository.js';
import { rubricRepository } from '../repositories/rubricRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { loadQuestionBank } from '../adapters/questionBankSource.js';
import { fail, requireCapability } from './access.js';

const contracts = {
  users: ['external_user_id','user_type','student_number','staff_number','name_en','name_zh','email','status','disabled'],
  groups: ['group_code','group_type','name_en','name_zh','effective_from','effective_until','status','disabled'],
  teachers: ['external_user_id','staff_number','name_en','name_zh','position_code','staff_group_code','effective_from','status','disabled'],
  students: ['external_user_id','student_number','name_en','name_zh','class_code','guardian_consent_status','media_consent_scope','status','disabled'],
  roster: ['activity_id','student_identifier','student_name','group_code','planned_attendance_status','disabled'],
  questions: ['question_id','source_workbook','source_sheet','source_row','source_construct_en','source_construct_zh','prompt_en','prompt_zh','response_type','scale_type','ability_code','ability_name_en','ability_name_zh','approval_status','disabled'],
  labels: ['label_code','name_en','name_zh','description_en','description_zh','catalogue_code','catalogue_version','status','disabled'],
  media: ['activity_id','media_base_path','source_system','validation_mode','status','disabled'],
};
const fileNames = { users: 'users-all-records.csv', groups: 'groups-all-records.csv', teachers: 'teachers-all-records.csv', students: 'students-all-records.csv', roster: 'activity-assignments-all-records.csv', questions: 'question-bank-all-records.csv', labels: 'activity-labels-all-records.csv', media: 'media-paths-all-records.csv' };
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csvValue = (header, value) => header === 'disabled' ? ['1','true'].includes(String(value).toLowerCase()) ? 'true' : 'false' : value;
const csv = (headers, rows) => [headers.join(','), ...rows.map(row => headers.map(header => csvCell(csvValue(header, row[header]))).join(','))].join('\n');

async function rowsFor(domain, schoolId) {
  if (domain === 'questions') return (await loadQuestionBank()).rows;
  const query = dataOperationsRepository[domain];
  if (!query) fail(404, 'Data-operation export is unavailable', 'NOT_FOUND');
  return query.call(dataOperationsRepository, schoolId);
}

export const dataOperationsService = {
  async inventory(user) {
    requireCapability(user, 'import.export', { school_id: user.school_id });
    const questionBank = await loadQuestionBank();
    const activities = dataOperationsRepository.activities(user.school_id);
    const mediaPaths = dataOperationsRepository.media(user.school_id);
    return { activities, mediaPaths, counts: {
      catalogue: dataOperationsRepository.activityCount(user.school_id),
      users: dataOperationsRepository.users(user.school_id).length,
      groups: dataOperationsRepository.groups(user.school_id).length,
      teachers: dataOperationsRepository.teachers(user.school_id).length,
      students: dataOperationsRepository.students(user.school_id).length,
      roster: dataOperationsRepository.roster(user.school_id).length,
      questions: questionBank.rows.length,
      rubrics: rubricRepository.exportData().catalogues.length,
      labels: dataOperationsRepository.labels(user.school_id).length,
      media: mediaPaths.length,
    } };
  },
  async export(user, domain) {
    requireCapability(user, 'import.export', { school_id: user.school_id });
    const headers = contracts[domain];
    if (!headers) fail(404, 'Data-operation export is unavailable', 'NOT_FOUND');
    const rows = await rowsFor(domain, user.school_id);
    identityRepository.audit(user.school_id, user.user_id, `data_operation.${domain}.exported`, 'school', user.school_id, `${rows.length} rows`);
    return { domain, fileName: fileNames[domain], mimeType: 'text/csv;charset=utf-8', count: rows.length, content: csv(headers, rows) };
  },
};
