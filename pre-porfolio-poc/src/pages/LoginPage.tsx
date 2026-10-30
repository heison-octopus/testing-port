import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Segmented, Space, Spin, Tag } from 'antd';
import { Navigate } from 'react-router-dom';
import { api, type User } from '../api/client';
import type { Lang } from '../i18n';
import { useAuth } from '../state/AuthContext';

export function LoginPage({lang,setLang}:{lang:Lang;setLang:(l:Lang)=>void}){
  const {user,loading,login}=useAuth();const [users,setUsers]=useState<User[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [form]=Form.useForm();
  useEffect(()=>{api<User[]>('/demo-users').then(setUsers).catch(e=>setError(e.message));},[]);
  if(loading)return <div className="center-screen"><Spin/></div>;if(user)return <Navigate to="/" replace/>;
  const role:Record<string,string>={student:'學生',class_teacher:'班主任',activity_teacher:'活動老師',staff:'校務人員',school_admin:'系統管理員'};
  async function submit(values:{username:string;password:string}){setBusy(true);setError('');try{await login(values.username,values.password);}catch(e){setError((e as Error).message);}finally{setBusy(false)}}
  return <main className="login-page"><div className="login-language"><Segmented value={lang} onChange={v=>setLang(v as Lang)} options={[{label:'繁中',value:'zh'},{label:'EN',value:'en'}]}/></div><section className="login-intro"><div className="eyebrow">BHSS · LOCAL PROOF OF CONCEPT</div><h1>{lang==='zh'?'把活動、證明和成長連在一起':'Connect activities, evidence and growth'}</h1><p>{lang==='zh'?'記錄學術及非學術活動；所有影響技能步階的內容仍須由人員覆核。':'Record academic and non-academic activities, with human review before anything affects a skill step.'}</p><ul><li>VASK activity definition</li><li>Eight skills · 16 steps</li><li>Dated class and school-status history</li><li>Traceable evidence and AI input disclosure</li></ul></section><section className="login-panel"><h2>{lang==='zh'?'登入示範系統':'Sign in to the demo'}</h2><p>{lang==='zh'?'所有示範帳戶密碼均為 demo123。':'Every demo account uses password demo123.'}</p>{error&&<Alert type="error" showIcon message={error}/>}<Form form={form} layout="vertical" onFinish={submit} initialValues={{username:'student1',password:'demo123'}}><Form.Item name="username" label={lang==='zh'?'帳戶':'Account'} rules={[{required:true}]}><Input autoComplete="username"/></Form.Item><Form.Item name="password" label={lang==='zh'?'密碼':'Password'} rules={[{required:true}]}><Input.Password autoComplete="current-password"/></Form.Item><Button htmlType="submit" type="primary" size="large" block loading={busy}>{lang==='zh'?'登入':'Sign in'}</Button></Form><div className="demo-accounts"><b>{lang==='zh'?'示範角色':'Demo roles'}</b>{users.map(u=><button key={u.id} type="button" onClick={()=>form.setFieldsValue({username:u.username,password:'demo123'})}><span>{u.display_name_zh}</span><Tag>{role[u.role]}</Tag><code>{u.username}</code></button>)}</div></section></main>;
}
