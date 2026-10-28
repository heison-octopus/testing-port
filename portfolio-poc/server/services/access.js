import {repo} from '../repositories/store.js';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
export function fail(status,message){throw new HttpError(status,message)}
export function checkSchool(user,feature){const school=repo.get('SELECT * FROM schools WHERE id=?',user.school_id);if(!school||school.disabled)fail(403,'School unavailable');if(feature&&!repo.get('SELECT 1 FROM features WHERE school_id=? AND feature=? AND enabled=1',user.school_id,feature))fail(403,'FEATURE_NOT_AVAILABLE')}
export function scoped(user,type,id){return !!repo.get('SELECT 1 FROM assignments WHERE user_id=? AND scope_type=? AND scope_id=?',user.id,type,id)}
export function studentAccess(user,id){if(user.role==='student'&&user.id===id)return true;return ['teacher','staff'].includes(user.role)&&scoped(user,'student',id)}
export function activityAccess(user,id){if(user.role==='student')return !!repo.get('SELECT 1 FROM participants WHERE activity_id=? AND student_id=?',id,user.id);return ['teacher','staff'].includes(user.role)&&scoped(user,'activity',id)}
export function requireStudent(user,id){const student=repo.get('SELECT * FROM users WHERE id=? AND school_id=? AND role=?',id,user.school_id,'student');if(!student||!studentAccess(user,id))fail(404,'Record not found');return student}
export function requireActivity(user,id){const item=repo.get('SELECT * FROM activities WHERE id=? AND school_id=?',id,user.school_id);if(!item||!activityAccess(user,id))fail(404,'Record not found');return item}
export function role(user,...roles){if(!roles.includes(user.role))fail(403,'Action not permitted')}
