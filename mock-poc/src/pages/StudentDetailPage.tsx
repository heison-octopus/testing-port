import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Divider, Form, Input, Select, Table, Timeline, message } from 'antd';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { api, resource, type Activity, type Membership, type Student } from '../api/client';
import { AiPanel, Section } from '../components/Section';
import { StatusTag } from '../components/StatusTag';
import { useAuth } from '../state/AuthContext';
import { l, type Lang } from '../i18n';

type Detail={student:Student;timeline:{memberships:Membership[];statuses:any[]};activities:(Activity&{class_at_activity:Membership|null})[];aiDrafts:any[]};

export function StudentDetailPage(){
  const {id}=useParams();const {user}=useAuth();const {lang}=useOutletContext<{lang:Lang}>();
  const [data,setData]=useState<Detail|null>(null);const [classes,setClasses]=useState<any[]>([]);const [periods,setPeriods]=useState<any>({academicYears:[],periods:[]});const [error,setError]=useState('');const [toast,holder]=message.useMessage();
  const load=()=>Promise.all([api<Detail>(`/students/${id}`),resource.list<any>('classes'),api<any>('/periods')]).then(([d,c,p])=>{setData(d);setClasses(c);setPeriods(p)}).catch(e=>setError(e.message));
  useEffect(()=>{load()},[id,user?.id]);
  if(error)return <Alert type="error" message={error}/>;if(!data)return null;
  const canManage=['staff','school_admin'].includes(user?.role||'');
  async function move(v:any){try{await api(`/students/${id}/memberships`,{method:'POST',body:JSON.stringify(v)});toast.success(l(lang,'已新增班級歷程，舊記錄的完結日已保留','Class history added; the old record keeps its end date'));load()}catch(e){setError((e as Error).message)}}
  async function schoolStatus(v:any){try{await api(`/students/${id}/school-status`,{method:'POST',body:JSON.stringify(v)});toast.success(l(lang,'已新增在校狀態歷程','School-status history added'));load()}catch(e){setError((e as Error).message)}}
  return <div>{holder}
    <div className="page-title"><div><div className="eyebrow">{data.student.id}</div><h1>{data.student.chinese_name} · {data.student.student_number}</h1><p>{data.student.english_name} · {l(lang,'活動記錄只保留學生 ID，班別會按活動日期回查。','Activities retain only the student ID; class is resolved at the activity date.')}</p></div></div>
    <Section title={l(lang,'學籍及班級歷程','Enrolment and class history')}>
      <Timeline items={data.timeline.memberships.map(m=>({color:m.valid_to?'gray':'green',children:<div><b>{m.academic_year} · {m.class_code} · {m.grade_level}</b><div>{m.valid_from} — {m.valid_to||l(lang,'現在','present')} · {m.change_type}</div>{m.reason&&<div className="table-secondary">{m.reason}</div>}</div>}))}/>
      {canManage&&<><Divider/><h3>{l(lang,'新增班級變動','Add class change')}</h3><Form layout="inline" onFinish={move}>
        <Form.Item name="academicYearId" rules={[{required:true}]}><Select placeholder={l(lang,'學年','Year')} style={{width:130}} options={periods.academicYears.map((a:any)=>({value:a.id,label:a.label}))}/></Form.Item>
        <Form.Item name="periodId"><Select allowClear placeholder={l(lang,'學段','Period')} style={{width:100}} options={periods.periods.map((p:any)=>({value:p.id,label:p.label}))}/></Form.Item>
        <Form.Item name="classId" rules={[{required:true}]}><Select placeholder={l(lang,'班別','Class')} style={{width:140}} options={classes.map(c=>({value:c.id,label:`${c.academic_year} ${c.code}`}))}/></Form.Item>
        <Form.Item name="gradeLevel" rules={[{required:true}]}><Input placeholder={l(lang,'級別 S2','Grade S2')} style={{width:100}}/></Form.Item>
        <Form.Item name="validFrom" rules={[{required:true}]}><Input type="date"/></Form.Item>
        <Form.Item name="changeType" initialValue="class_move"><Select style={{width:140}} options={['class_move','retained','regraded','returned','promoted'].map(v=>({value:v,label:v}))}/></Form.Item>
        <Form.Item name="reason"><Input placeholder={l(lang,'原因','Reason')}/></Form.Item><Button htmlType="submit" type="primary">{l(lang,'記錄變動','Record change')}</Button>
      </Form></>}
    </Section>
    <Section title={l(lang,'在校狀態','School status')}>
      <Timeline items={data.timeline.statuses.map(s=>({color:s.valid_to?'gray':'blue',children:<div><b>{s.status}</b> · {s.valid_from} — {s.valid_to||l(lang,'現在','present')}<div className="table-secondary">{s.reason}</div></div>}))}/>
      {canManage&&<><Divider/><h3>{l(lang,'新增在校狀態','Add school status')}</h3><Form layout="inline" onFinish={schoolStatus}>
        <Form.Item name="status" rules={[{required:true}]}><Select placeholder={l(lang,'狀態','Status')} style={{width:150}} options={['active','leave','withdrawn','returned','graduated'].map(v=>({value:v,label:v}))}/></Form.Item>
        <Form.Item name="validFrom" rules={[{required:true}]}><Input type="date"/></Form.Item><Form.Item name="reason"><Input placeholder={l(lang,'原因','Reason')}/></Form.Item><Button htmlType="submit" type="primary">{l(lang,'記錄狀態','Record status')}</Button>
      </Form></>}
    </Section>
    <Section title={l(lang,'活動及活動當日班別','Activities and class on the activity date')}><Table rowKey="id" dataSource={data.activities} columns={[
      {title:l(lang,'活動','Activity'),render:(_,a)=><Link to={`/activities/${a.id}`}><b>{lang==='zh'?a.title_zh:a.title}</b><div className="table-secondary">{new Date(a.starts_at).toLocaleDateString(lang==='zh'?'zh-HK':'en-GB')}</div></Link>},
      {title:l(lang,'當日班別','Class that day'),render:(_,a)=>a.class_at_activity?`${a.class_at_activity.class_code} · ${a.class_at_activity.grade_level}`:l(lang,'沒有有效記錄','No valid record')},
      {title:l(lang,'狀態','Status'),dataIndex:'status',render:v=><StatusTag status={v}/>} ]}/></Section>
    {data.aiDrafts.map(d=><AiPanel key={d.id} title={`${l(lang,'AI 草稿','AI draft')} · ${d.prompt_profile}`}><p>{d.output_text}</p><Descriptions size="small" column={2} items={[
      {key:'model',label:l(lang,'處理方式','Processing'),children:d.model_label},{key:'version',label:'Prompt version',children:d.prompt_version},{key:'source',label:l(lang,'資料來源帳戶','Source account'),children:d.source_user_id},{key:'time',label:l(lang,'產生時間','Generated'),children:new Date(d.created_at).toLocaleString(lang==='zh'?'zh-HK':'en-GB')},{key:'state',label:l(lang,'人工狀態','Human state'),children:d.review_state},{key:'payload',label:l(lang,'實際輸入','Exact input'),span:2,children:<pre className="json-view">{JSON.stringify(d.input_payload_json,null,2)}</pre>} ]}/></AiPanel>)}
  </div>
}
