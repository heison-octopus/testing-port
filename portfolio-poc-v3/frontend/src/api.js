let key='';
async function request(path,options={}) { const response=await fetch('/api'+path,{...options,headers:{...(options.headers||{}),...(key?{'x-request-key':key}:{})}}); const body=await response.json().catch(()=>({})); if(!response.ok) throw Object.assign(new Error(body.error||'Validation failed'),{body,status:response.status}); return {body,status:response.status}; }
export async function login(account,password){key='';const result=await request('/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account,password})});key=result.body.key;return result;}
export async function restore(){const result=await request('/session');key=result.body.key;return result;}
export async function logout(){await request('/session',{method:'DELETE'});key='';}
export const catalogue=()=>request('/catalogue');export const records=()=>request('/records');
export function upload(action,file){const form=new FormData();form.append('file',file);return request('/'+action,{method:'POST',body:form});}
export async function download(){const response=await fetch('/api/template.csv',{headers:{'x-request-key':key}});if(!response.ok)throw new Error('Template access denied');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='stage-inventory-template.csv';a.click();URL.revokeObjectURL(url);}
