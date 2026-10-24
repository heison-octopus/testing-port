import { Tag } from 'antd';

const zh:Record<string,string>={draft:'草稿',submitted:'已提交',review:'覆核中',published:'已發布',returned:'退回修改',archived:'已封存',active:'使用中',closed:'已結束',open:'尚待確認',recommended:'建議方案',confirmed:'已確認',deferred:'暫緩',pending_mapping_review:'待覆核對應',generated:'AI 草稿',edited:'已人工修改',approved:'已批核',rejected:'已拒絕'};
const en:Record<string,string>={draft:'Draft',submitted:'Submitted',review:'In review',published:'Published',returned:'Returned',archived:'Archived',active:'Active',closed:'Closed',open:'Not confirmed',recommended:'Recommended',confirmed:'Confirmed',deferred:'Deferred',pending_mapping_review:'Mapping review pending',generated:'AI draft',edited:'Human edited',approved:'Approved',rejected:'Rejected'};
export function StatusTag({status}:{status:string}){
  const color=status==='published'||status==='confirmed'||status==='approved'?'green':status==='returned'||status==='rejected'?'red':status==='open'||status.includes('pending')?'magenta':status==='generated'?'gold':'default';
  const labels=document.documentElement.lang==='en'?en:zh;
  return <Tag color={color}>{labels[status]||status}</Tag>;
}
