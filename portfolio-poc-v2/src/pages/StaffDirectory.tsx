import { useEffect, useState } from 'react';
import { CaretLeft, CaretRight, FunnelSimple, ShieldCheck, Warning } from '@phosphor-icons/react';
import { api } from '../api/client';
import { ApiError } from '../api/transport';
import type { Paged, ReferenceData, Staff } from '../../shared/types';
import { Field, Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

export function StaffDirectory({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [result, setResult] = useState<Paged<Staff> | null>(null);
  const [filters, setFilters] = useState({ search: '', positionId: '', roleId: '', capabilityId: '', departmentId: '', subjectId: '', groupId: '', approvalEligible: '' });
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  useEffect(() => { api.referenceData().then(setReference).catch(report); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      params.set('page', String(page));
      params.set('limit', '20');
      setLoading(true);
      setLoadError('');
      void api.teacherDirectory(params, controller.signal).then(setResult).catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError(error instanceof ApiError && error.status === 403
          ? text('You are not permitted to search this staff scope.', '你沒有權限搜尋此教職員範圍。')
          : error instanceof Error ? error.message : text('Unable to load the staff directory.', '未能載入教職員名錄。'));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, page, text]);
  function update(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); setPage(1); }
  const select = (key: keyof typeof filters, label: string, values: { id: string; name: string }[]) => <Field label={label}><select value={filters[key]} onChange={event => update(key, event.target.value)}><option value="">{text('All', '全部')}</option>{values.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>;
  const rows = result?.items || [];
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
    {loading && <Notice>{text('Loading the latest matching staff page…', '正在載入最新的教職員搜尋結果…')}</Notice>}
    {loadError && <Notice tone="warning"><Warning size={18} />{loadError}</Notice>}
    <div className="table-wrap"><table><thead><tr><th>{text('Staff member', '教職員')}</th><th>{text('Positions', '職銜')}</th><th>{text('Functional roles and scope', '功能角色及範圍')}</th><th>{text('Groups', '群組')}</th><th>{text('Effective controls', '生效控制')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td><b>{isChinese ? row.nameZh : row.name}</b><small>{isChinese ? row.name : row.nameZh} · {row.staffNumber}</small></td>
      <td>{row.positions.map(item => <span className="tag" key={item.position_id}>{isChinese ? item.name_zh : item.name_en}</span>)}</td>
      <td>{row.roles.map(item => <span className="tag role" key={item.role_id + item.scope_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.scope_type)}: {item.scope_id}</em></span>)}</td>
      <td>{row.groups.map(item => <span className="tag" key={item.staff_group_id}>{isChinese ? item.name_zh || item.name_en : item.name_en}</span>)}</td>
      <td>{row.explicitDenies.length ? row.explicitDenies.map(item => <span className="deny" key={item.capability_key}><Warning size={14} />{item.capability_key}<em>{item.reason}</em></span>) : <span className="allow"><ShieldCheck size={15} />{text('No explicit deny', '沒有明確拒絕')}</span>}</td>
    </tr>)}</tbody></table></div>
    {!loading && !loadError && !rows.length && <Notice><FunnelSimple size={18} />{text('No staff match the current combined filters.', '沒有教職員符合目前的組合篩選條件。')}</Notice>}
    {result && result.totalPages > 0 && <nav className="pagination" aria-label={text('Staff result pages', '教職員搜尋結果分頁')}><span>{text(`${result.total} staff · page ${result.page} of ${result.totalPages}`, `共 ${result.total} 位教職員 · 第 ${result.page}／${result.totalPages} 頁`)}</span><div><button disabled={loading || result.page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><CaretLeft size={16} />{text('Previous', '上一頁')}</button><button disabled={loading || result.page >= result.totalPages} onClick={() => setPage(value => Math.min(result.totalPages, value + 1))}>{text('Next', '下一頁')}<CaretRight size={16} /></button></div></nav>}
  </>;
}
