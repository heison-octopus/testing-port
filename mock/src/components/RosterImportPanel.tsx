import { useState } from 'react';
import { Alert, Button, Input, Space, Table, Tag, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { api, downloadApiFile, type ImportBatch, type ImportRow } from '../api/client';
import { l, type Lang } from '../i18n';

export function RosterImportPanel({lang,value,onChange}:{lang:Lang;value:ImportBatch|null;onChange:(batch:ImportBatch|null)=>void}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [toast,holder]=message.useMessage();
  async function upload(file:File){setBusy(true);setError('');const body=new FormData();body.append('file',file);try{const batch=await api<ImportBatch>('/activity-imports',{method:'POST',body});onChange(batch);toast.success(l(lang,'名單已讀取，請核對學生姓名','Roster loaded. Check the matched names.'));}catch(e){setError((e as Error).message)}finally{setBusy(false)}return false;}
  async function edit(row:ImportRow,next:string){if(next.trim()===row.student_id_input)return;setBusy(true);setError('');try{onChange(await api<ImportBatch>(`/activity-imports/${value?.id}/rows/${row.id}`,{method:'PATCH',body:JSON.stringify({student_id_input:next.trim()})}));}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <div className="import-panel">{holder}<div className="form-divider">{l(lang,'以試算表加入學生','Add participants by spreadsheet')}</div><p className="table-secondary">{l(lang,'student_id 是唯一核對欄位；姓名及班別只供老師在建立活動前確認。','student_id is authoritative; name and class are shown for confirmation before the activity is created.')}</p><Space wrap>
    <Button icon={<DownloadOutlined/>} onClick={()=>downloadApiFile('/activity-import/template/xlsx','bhss-activity-roster-template.xlsx')}>{l(lang,'下載 XLSX 範本','Download XLSX template')}</Button>
    <Button icon={<DownloadOutlined/>} onClick={()=>downloadApiFile('/activity-import/template/csv','bhss-activity-roster-template.csv')}>{l(lang,'下載 CSV 範本','Download CSV template')}</Button>
    <Upload accept=".xlsx,.csv" showUploadList={false} beforeUpload={upload}><Button type="primary" loading={busy} icon={<UploadOutlined/>}>{l(lang,'上載名單','Upload roster')}</Button></Upload>
  </Space>{error&&<div className="field-error">{error}</div>}{value&&<><div className="import-summary"><b>{value.original_name}</b><Tag color={value.valid?'green':'magenta'}>{value.valid?l(lang,'全部配對成功','All rows matched'):l(lang,'需要修正','Correction required')}</Tag></div><Table size="small" pagination={false} rowKey="id" dataSource={value.rows} columns={[
    {title:l(lang,'列','Row'),dataIndex:'row_number',width:60},
    {title:'Student ID',render:(_,row)=><Input aria-label={`Student ID row ${row.row_number}`} defaultValue={row.student_id_input} status={row.validation_status==='valid'?'': 'error'} onBlur={event=>edit(row,event.target.value)}/>},
    {title:l(lang,'姓名預覽','Name preview'),render:(_,row)=><>{row.resolved_name||'—'}<div className="table-secondary">{row.resolved_class||'—'}</div></>},
    {title:l(lang,'結果','Result'),render:(_,row)=>row.validation_status==='valid'?<Tag color="green">{l(lang,'已配對','Matched')}</Tag>:<><Tag color="magenta">{l(lang,'未配對','Unresolved')}</Tag><div className="table-secondary">{row.validation_message}</div></>}
  ]}/>{!value.valid&&<Alert className="inline-alert" type="warning" showIcon message={l(lang,'請修正所有 Student ID；建立活動按鈕會保持停用。','Correct every Student ID before the activity can be created.')}/>}</>}</div>;
}
