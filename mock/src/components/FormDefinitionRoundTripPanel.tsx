import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Select, Space, Steps, Table, Tag, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { api, downloadApiFile } from '../api/client';
import { platformV2Api, type FormAuthoringState, type FormDefinitionImport, type FormDefinitionRow, type FormVersion, type LabelCatalogue } from '../api/platformV2';
import { l, type Lang } from '../i18n';

export function FormDefinitionRoundTripPanel({activityId,lang,onChanged}:{activityId:string;lang:Lang;onChanged:()=>void}){
  const [state,setState]=useState<FormAuthoringState|null>(null);const [catalogues,setCatalogues]=useState<LabelCatalogue[]>([]);const [selected,setSelected]=useState<string[]>([]);const [batch,setBatch]=useState<FormDefinitionImport|null>(null);const [draft,setDraft]=useState<FormVersion|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [toast,holder]=message.useMessage();
  const load=()=>Promise.all([api<FormAuthoringState>(`/activities/${activityId}/form-authoring`),platformV2Api.catalogues()]).then(([next,cats])=>{setState(next);setCatalogues(cats);setSelected(next.selectedVask.map(item=>item.id));setDraft(next.versions.find(item=>item.status==='draft')??null)}).catch(e=>setError(e.message));
  useEffect(()=>{load()},[activityId]);
  const vaskCatalogue=useMemo(()=>catalogues.find(item=>item.code==='VASK'),[catalogues]);
  async function run(action:()=>Promise<void>,success:string){setBusy(true);setError('');try{await action();toast.success(success)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function saveVask(){await run(async()=>{await platformV2Api.replaceVask(activityId,selected);setBatch(null);await load();onChanged()},l(lang,'VASK 活動標籤已更新','VASK activity labels updated'))}
  async function upload(file:File){await run(async()=>{const body=new FormData();body.append('file',file);const result=await api<FormDefinitionImport>(`/activities/${activityId}/form-definition-imports`,{method:'POST',body});setBatch(result)},l(lang,'已上載；請先檢查驗證結果及變更預覽','Uploaded. Review validation and changes before creating a draft.'));return false;}
  async function commit(){if(!batch)return;await run(async()=>{const result=await api<FormVersion>(`/form-definition-imports/${batch.id}/commit`,{method:'POST'});setDraft(result);await load();onChanged()},l(lang,'已建立新的草稿版本；學生仍看不到','New draft version created; students still cannot see it'))}
  async function publish(){if(!draft)return;await run(async()=>{await api(`/activity-form-versions/${draft.id}/publish`,{method:'POST'});setDraft(null);setBatch(null);await load();onChanged()},l(lang,'表格版本已發布；指定的學生及同儕任務現可使用','Form version published to its assigned audiences'))}
  if(!state)return error?<Alert type="error" message={error}/>:null;
  const recommended=state.candidates.filter(item=>item.recommended);
  const published=state.versions.find(item=>item.status==='published');
  const step=batch?draft?4:3:published?1:0;
  const diffCounts=batch?.rows.reduce<Record<string,number>>((acc,row)=>({...acc,[row.change_type]:(acc[row.change_type]||0)+1}),{})??{};
  return <div className="form-definition-roundtrip">{holder}<Steps size="small" current={step} items={[
    {title:l(lang,'選擇 VASK','Choose VASK')},{title:l(lang,'下載定義表','Download definition')},{title:l(lang,'上載修訂','Import revision')},{title:l(lang,'驗證及比較','Validate & compare')},{title:l(lang,'建立及發布版本','Create & publish')}
  ]}/>
    <div className="roundtrip-stage">
      <div><div className="stage-number">1</div><div><h3>{l(lang,'選擇活動的 VASK 描述詞','Choose activity VASK descriptors')}</h3><p>{l(lang,'VASK 只描述活動及提供 Portfolio／LLM 背景，不會限制題目選擇或計算能力階段。','VASK describes the activity and provides Portfolio/LLM context. It neither filters questions nor calculates rubric levels.')}</p></div></div>
      <Space wrap align="start"><Select mode="multiple" value={selected} onChange={setSelected} className="vask-picker" maxTagCount="responsive" placeholder={l(lang,'選擇 VASK','Choose VASK')} options={(vaskCatalogue?.labels??[]).map(item=>({value:item.id,label:lang==='zh'?item.name_zh:item.name_en}))}/><Button loading={busy} onClick={saveVask}>{l(lang,'儲存並更新建議','Save and refresh')}</Button></Space>
      <div className="coverage-strip"><span>{l(lang,`已選 ${state.selectedVask.length} 個 VASK`,`Selected VASK: ${state.selectedVask.length}`)}</span><span>{l(lang,`題庫共 ${state.candidates.length} 條題目；每題保留自己的能力定義`,`Question bank: ${state.candidates.length}; each keeps its own ability`)}</span>{state.selectedVask.map(item=><Tag key={item.id}>{lang==='zh'?item.name_zh:item.name_en}</Tag>)}</div>
    </div>
    <div className="roundtrip-stage">
      <div><div className="stage-number">2</div><div><h3>{l(lang,'檢視題目能力，再下載表格定義 XLSX','Review question abilities and download the form-definition XLSX')}</h3><p>{l(lang,'橙色欄位可在 Excel 修改。題目、對象、次序、量表及題目本身的能力定義會一併匯出。','Orange input columns can be edited in Excel. Wording, audience, order, scale and each question’s own ability are exported together.')}</p></div></div>
      <Table size="small" pagination={false} rowKey="question_id" scroll={{x:900,y:280}} dataSource={state.candidates} columns={[
        {title:l(lang,'使用狀態','Use'),dataIndex:'recommended',width:110,render:()=> <Tag color="orange">{l(lang,'題庫候選','Question-bank candidate')}</Tag>},
        {title:l(lang,'題目','Question'),dataIndex:'question_text_zh',width:360},
        {title:l(lang,'作答對象','Audience'),dataIndex:'audience',width:110,render:value=><Tag>{value}</Tag>},
        {title:l(lang,'能力代碼','Ability code'),dataIndex:'ability_code',width:190,render:value=><code>{value}</code>},
        {title:l(lang,'題目能力','Question ability'),width:240,render:(_,row)=>lang==='zh'?row.ability_name_zh:row.ability_name_en}
      ]}/>
      <Button className="download-definition" icon={<DownloadOutlined/>} onClick={()=>downloadApiFile(`/activities/${activityId}/form-definition-template`,`${activityId}-form-definition.xlsx`)}>{l(lang,'下載表格定義 XLSX','Download form-definition XLSX')}</Button>
    </div>
    <div className="roundtrip-stage">
      <div><div className="stage-number">3</div><div><h3>{l(lang,'上載修訂後的表格定義','Upload the revised form definition')}</h3><p>{l(lang,`最多 ${state.limits.maximum_rows} 條題目；題目最多 ${state.limits.question_text.toLocaleString()} 字元；量表上下限須介乎 ${state.limits.scale_min} 至 ${state.limits.scale_max}。`,`Maximum ${state.limits.maximum_rows} rows; ${state.limits.question_text.toLocaleString()} characters per question; scale bounds ${state.limits.scale_min}–${state.limits.scale_max}.`)}</p></div></div>
      <Upload accept=".xlsx" showUploadList={false} beforeUpload={upload}><Button type="primary" loading={busy} icon={<UploadOutlined/>}>{l(lang,batch?'取代上載檔案':'上載修訂 XLSX',batch?'Replace uploaded file':'Upload revised XLSX')}</Button></Upload>
      {error&&<div className="field-error">{error}</div>}
    </div>
    {batch&&<div className="roundtrip-stage">
      <div><div className="stage-number">4</div><div><h3>{l(lang,'驗證結果及逐行變更','Validation and row-level changes')}</h3><p>{batch.original_name} · {l(lang,`包括 ${batch.included_count} 條題目`,`Includes ${batch.included_count} questions`)}</p></div></div>
      <div className="diff-strip">{Object.entries(diffCounts).map(([key,value])=><span key={key}><b>{value}</b> {key}</span>)}<Tag color={batch.valid?'green':'magenta'}>{batch.valid?l(lang,'驗證通過','Valid'):l(lang,'需要修正 XLSX','Fix XLSX')}</Tag></div>
      <Table size="small" pagination={false} rowKey="id" scroll={{x:1100,y:360}} dataSource={batch.rows} columns={[
        {title:l(lang,'變更','Change'),dataIndex:'change_type',fixed:'left',width:110,render:value=><Tag color={value==='modified'||value==='added'?'orange':value==='removed'?'magenta':undefined}>{value}</Tag>},
        {title:l(lang,'包括','Include'),dataIndex:'include_flag',width:80},
        {title:l(lang,'題目','Question'),dataIndex:'prompt_zh',width:360},
        {title:l(lang,'對象','Audience'),dataIndex:'audience',width:100},
        {title:l(lang,'次序','Order'),dataIndex:'display_order',width:80},
        {title:l(lang,'能力代碼','Ability code'),dataIndex:'ability_code',width:190},
        {title:l(lang,'題目能力','Question ability'),width:220,render:(_,row:FormDefinitionRow)=>lang==='zh'?row.ability_name_zh:row.ability_name_en},
        {title:l(lang,'驗證','Validation'),fixed:'right',width:190,render:(_,row:FormDefinitionRow)=>row.validation_status==='valid'?<Tag color="green">{l(lang,'有效','Valid')}</Tag>:<><Tag color="magenta">{l(lang,'無效','Invalid')}</Tag><div className="table-secondary">{row.validation_message}</div></>}
      ]}/>
      <div className="publish-strip"><div><b>{l(lang,'建立草稿不會改變學生畫面','Creating a draft does not change the student view')}</b><div className="table-secondary">{l(lang,'只有明確發布後，才會停用上一個已發布版本並顯示新版本。','Only explicit publication retires the prior published version and releases the new one.')}</div></div><Button type="primary" size="large" loading={busy} disabled={!batch.valid||batch.included_count<1||batch.status!=='staged'} onClick={commit}>{l(lang,'建立新草稿版本','Create new draft version')}</Button></div>
    </div>}
    {draft&&<div className="roundtrip-stage publish-stage"><div><div className="stage-number">5</div><div><h3>{l(lang,`草稿版本 ${draft.version} 已準備好`,`Draft version ${draft.version} is ready`)}</h3><p>{l(lang,`${draft.block_count} 個區塊，${draft.question_count} 條題目。發布前學生仍使用上一個版本。`,`${draft.block_count} blocks and ${draft.question_count} questions. Students remain on the previous version until publication.`)}</p></div></div><Button type="primary" size="large" loading={busy} onClick={publish}>{l(lang,'發布表格版本','Publish form version')}</Button></div>}
    <Alert className="inline-alert" type="info" showIcon message={l(lang,'題目能力不等於 Rubric 對應','A question ability is not a rubric mapping')} description={l(lang,'Portfolio 會引用題目、答案及相關佐證，再按當時選用的 Rubric 進行人工覆核解讀。系統沒有固定 Question → VASK／RC360／Skills Builder 對應。','The Portfolio cites the question, answer and linked proof, then interprets them against the selected rubric during human review. There is no fixed Question → VASK/RC360/Skills Builder mapping.')}/>
    {published&&<div className="version-line"><Tag color="green">{l(lang,`已發布 v${published.version}`,`Published v${published.version}`)}</Tag><span>{published.block_count} {l(lang,'個區塊','blocks')} · {published.question_count} {l(lang,'條題目','questions')}</span></div>}
  </div>;
}
