export type ApiError = Error & { status?: number; field?: string };

const REQUEST_KEY='bhss.requestKey';

export function setRequestKey(value:string|null){
  if(value) sessionStorage.setItem(REQUEST_KEY,value); else sessionStorage.removeItem(REQUEST_KEY);
}

export async function api<T>(path:string, init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers);
  const key=sessionStorage.getItem(REQUEST_KEY);
  if(key) headers.set('X-Request-Key',key);
  if(init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const response=await fetch(`/api${path}`,{...init,headers,credentials:'same-origin'});
  const body=await response.json().catch(()=>({error:'Unexpected server response.'}));
  if(!response.ok){const error=new Error(body.error||'Request failed.') as ApiError;error.status=response.status;error.field=body.field;throw error;}
  return body as T;
}

export async function downloadApiFile(path:string, fallbackName:string){
  const headers=new Headers();const key=sessionStorage.getItem(REQUEST_KEY);if(key)headers.set('X-Request-Key',key);
  const response=await fetch(`/api${path}`,{headers,credentials:'same-origin'});
  if(!response.ok){const body=await response.json().catch(()=>({error:'Download failed.'}));throw new Error(body.error||'Download failed.');}
  const disposition=response.headers.get('content-disposition')||'';const matched=disposition.match(/filename="?([^";]+)"?/i);const name=matched?.[1]||fallbackName;
  const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

export const resource={
  list:<T>(name:string,params?:Record<string,string>)=>api<T[]>(`/${name}${params?`?${new URLSearchParams(params)}`:''}`),
  get:<T>(name:string,id:string)=>api<T>(`/${name}/${id}`),
  create:<T>(name:string,data:unknown)=>api<T>(`/${name}`,{method:'POST',body:JSON.stringify(data)}),
  update:<T>(name:string,id:string,data:unknown)=>api<T>(`/${name}/${id}`,{method:'PATCH',body:JSON.stringify(data)})
};

export async function signIn(username:string,password:string){
  const result=await api<{user:User;requestKey:string}>('/auth/login',{method:'POST',body:JSON.stringify({username,password})});
  setRequestKey(result.requestKey);return result;
}
export async function switchAccount(userId:string){
  const result=await api<{user:User;requestKey:string}>('/auth/switch',{method:'POST',body:JSON.stringify({userId})});
  setRequestKey(result.requestKey);return result;
}

export type Role='student'|'class_teacher'|'activity_teacher'|'staff'|'school_admin';
export interface User{id:string;username:string;display_name:string;display_name_zh:string;role:Role}
export interface Student{id:string;student_number:string;english_name:string;chinese_name:string;current_class?:Membership|null}
export interface Membership{id:string;student_id:string;academic_year_id:string;academic_year?:string;class_id:string;class_code?:string;grade_level:string;valid_from:string;valid_to:string|null;change_type:string;reason:string|null}
export interface Activity{id:string;title:string;title_zh:string;description:string;internal_context?:string;cover_style?:string;activity_type:string;starts_at:string;ends_at:string;upload_opens_at?:string|null;upload_closes_at?:string|null;period_id?:string|null;period_label?:string|null;academic_year?:string|null;period_resolution_status?:string;status:string;owner_user_id:string}
export interface Evidence{id:string;activity_id:string|null;student_id:string;student_number:string;uploader_name:string;kind:string;media_category:string;visibility_state:string;original_name:string;preview_url?:string;caption:string;is_disabled:number;disabled_reason:string|null;created_at:string;activity_title?:string}
export interface ProofItem{id:string;proof_type_code:string;proof_type_name_en:string;proof_type_name_zh:string;source_category:string;student_number:string|null;chinese_name:string|null;activity_title:string|null;perspective:string;summary:string;occurred_at:string;review_status:string;visibility_status:string;may_support_assessment:number;link_count:number}
export interface ImportRow{id:string;row_number:number;student_id_input:string;student_id:string|null;resolved_name:string|null;class_reference?:string;resolved_class?:string|null;q1?:number|null;q2?:number|null;q3?:number|null;q4?:number|null;q5?:number|null;teacher_feedback?:string;validation_status:string;validation_message:string|null}
export interface ImportBatch{id:string;status:string;original_name:string;valid:boolean;version?:number;rows:ImportRow[];submitted_at?:string|null}
export interface Decision{id:string;level:string;title:string;question:string;status:string;answer:string|null;source_ref:string}
