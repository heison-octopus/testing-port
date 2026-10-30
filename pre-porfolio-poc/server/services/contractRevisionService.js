import { ContractRevisionRepository } from '../models/contractRevisionRepository.js';
import { audit } from './auditService.js';

const repo=new ContractRevisionRepository();
const fail=(message,status=400,field)=>Object.assign(new Error(message),{status,field});

export function resolveActivityPeriod(startsAt,endsAt,user,exceptionReason=''){
  if(!startsAt||!endsAt)throw fail('Start and end dates are required.',400,'starts_at');
  if(new Date(startsAt)>new Date(endsAt))throw fail('End date must be after the start date.',400,'ends_at');
  const resolution=repo.resolvePeriod(startsAt,endsAt);
  if(resolution.status==='resolved')return {...resolution,period_id:resolution.period.id,period_resolution_status:'resolved',period_exception_approved_by:null,period_exception_reason:null};
  if(resolution.status==='cross_period_exception'&&['staff','school_admin'].includes(user.role)&&String(exceptionReason).trim())return {...resolution,period_id:resolution.start_period.id,period_resolution_status:'cross_period_exception',period_exception_approved_by:user.id,period_exception_reason:String(exceptionReason).trim()};
  if(resolution.status==='cross_period_exception')throw fail('The activity crosses configured school periods. Split it or ask authorized staff to approve an exception.',409,'range');
  throw fail('No configured school period contains the full activity date range.',409,'range');
}

export function previewActivityPeriod(startsAt,endsAt,user){return resolveActivityPeriod(startsAt,endsAt,user);}
export function adminContract(){return {roleModel:repo.rolesAndAssignments(),periods:repo.periods(),rubrics:repo.rubrics()};}
export function proofList(studentIds,user){return repo.proofList(studentIds,user);}
export function registerProof(input){return repo.createProofItem(input);}
export function memorySettings(actorId){return repo.memorySettings(actorId);}
export function saveMemorySetting(input,user){
  if(!['class_teacher','activity_teacher','staff','school_admin'].includes(user.role))throw fail('Only authorized staff may configure an AI memory window.',403);
  if(!input.target_scope_id||!input.from_period_id||!input.to_period_id)throw fail('Target and period range are required.',400,'from_period_id');
  if(!['review','outlook','review_and_outlook','annual_review'].includes(input.output_mode))throw fail('Choose a valid review/outlook mode.',400,'output_mode');
  const result=repo.saveMemorySetting(input,user.id);audit(user.id,'ai.memory_setting.saved','review_outlook_memory_setting',result.id,null,result);return result;
}
