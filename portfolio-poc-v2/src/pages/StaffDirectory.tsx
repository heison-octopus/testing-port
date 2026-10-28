import { useEffect, useState } from 'react';
import { FunnelSimple, ShieldCheck, Warning } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { ReferenceData, Staff } from '../../shared/types';
import { Field, Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

export function StaffDirectory({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [reference, setReference] = useState<ReferenceData | null>(null), [rows, setRows] = useState<Staff[]>([]);
  const [filters, setFilters] = useState({ search: '', positionId: '', roleId: '', capabilityId: '', departmentId: '', subjectId: '', groupId: '', approvalEligible: '' });
  async function load(next = filters) { try { setRows(await api.staff(new URLSearchParams(Object.entries(next).filter(([, value]) => value)))); } catch (error) { report(error); } }
  useEffect(() => { api.referenceData().then(setReference).catch(report); load(); }, []);
  function update(key: keyof typeof filters, value: string) { const next = { ...filters, [key]: value }; setFilters(next); load(next); }
  const select = (key: keyof typeof filters, label: string, values: { id: string; name: string }[]) => <Field label={label}><select value={filters[key]} onChange={event => update(key, event.target.value)}><option value="">{text('All', '全部')}</option>{values.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>;
  return <>
    <PageHeader kicker={text('IDENTITY · SCOPE · ELIGIBILITY', '身份 · 範圍 · 資格')} title={text('Staff directory', '教職員名錄')} description={text('Filter job positions and effective functional authority without treating them as the same concept.', '分開篩選職銜及實際生效的功能權限，避免把兩個概念混為一談。')} />
    <section className="filter-bar">
      <Field label={text('Name or identifier', '姓名或識別碼')}><input value={filters.search} onChange={event => update('search', event.target.value)} placeholder={text('Search staff', '搜尋教職員')} /></Field>
      {reference && select('positionId', text('Position', '職銜'), reference.positions.map(item => ({ id: item.position_id, name: isChinese ? item.name_zh : item.name_en })))}
      {reference && select('roleId', text('Functional role', '功能角色'), reference.roles.map(item => ({ id: item.role_id, name: isChinese ? item.name_zh : item.name_en })))}
      {reference && select('capabilityId', text('Capability', '功能權限'), reference.capabilities.map(item => ({ id: item.capability_id, name: isChinese ? item.name_zh || item.name_en : item.name_en })))}
      {reference && select('departmentId', text('Department', '部門'), reference.departments.map(item => ({ id: item.department_id, name: isChinese ? item.name_zh : item.name_en })))}
      {reference && select('subjectId', text('Subject', '科目'), reference.subjects.map(item => ({ id: item.subject_id, name: isChinese ? item.name_zh : item.name_en })))}
      {reference && select('groupId', text('Staff group', '教職員群組'), reference.groups.map(item => ({ id: item.staff_group_id, name: isChinese ? item.name_zh : item.name_en })))}
      <Field label={text('Approval eligibility', '批核資格')}><select value={filters.approvalEligible} onChange={event => update('approvalEligible', event.target.value)}><option value="">{text('All staff', '全部教職員')}</option><option value="true">{text('Eligible approvers', '合資格批核人')}</option></select></Field>
    </section>
    <div className="table-wrap"><table><thead><tr><th>{text('Staff member', '教職員')}</th><th>{text('Positions', '職銜')}</th><th>{text('Functional roles and scope', '功能角色及範圍')}</th><th>{text('Groups', '群組')}</th><th>{text('Effective controls', '生效控制')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td><b>{isChinese ? row.nameZh : row.name}</b><small>{isChinese ? row.name : row.nameZh} · {row.staffNumber}</small></td>
      <td>{row.positions.map(item => <span className="tag" key={item.position_id}>{isChinese ? item.name_zh : item.name_en}</span>)}</td>
      <td>{row.roles.map(item => <span className="tag role" key={item.role_id + item.scope_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.scope_type)}: {item.scope_id}</em></span>)}</td>
      <td>{row.groups.map(item => <span className="tag" key={item.staff_group_id}>{isChinese ? item.name_zh || item.name_en : item.name_en}</span>)}</td>
      <td>{row.explicitDenies.length ? row.explicitDenies.map(item => <span className="deny" key={item.capability_key}><Warning size={14} />{item.capability_key}<em>{item.reason}</em></span>) : <span className="allow"><ShieldCheck size={15} />{text('No explicit deny', '沒有明確拒絕')}</span>}</td>
    </tr>)}</tbody></table></div>
    {!rows.length && <Notice><FunnelSimple size={18} />{text('No staff match the current combined filters.', '沒有教職員符合目前的組合篩選條件。')}</Notice>}
  </>;
}
