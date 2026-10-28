import { useEffect, useState } from 'react';
import { Eye, ShieldChevron } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { ReferenceData } from '../../shared/types';
import { Field, Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

const initial = { targetType: 'group', targetId: 'GRP-ENG-TEACHERS', capabilityId: 'CAP-ACTIVITY-VIEW', effect: 'deny', scopeType: 'activity', scopeId: 'ACT-PRESS-001', reason: '' };

export function PolicyLab({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [reference, setReference] = useState<ReferenceData | null>(null), [overrides, setOverrides] = useState<any[]>([]), [form, setForm] = useState(initial), [preview, setPreview] = useState<{ userId: string; name: string; nameZh?: string; beforeAllowed: boolean; afterAllowed: boolean }[]>([]);
  async function load() { try { const data = await api.policy(); setReference(data.reference); setOverrides(data.overrides); } catch (error) { report(error); } }
  useEffect(() => { load(); }, []);
  async function runPreview() { try { setPreview(await api.previewPolicy(form)); } catch (error) { report(error); } }
  async function apply() { try { await api.applyPolicy(form); setForm({ ...form, reason: '' }); setPreview([]); await load(); } catch (error) { report(error); } }
  const targets = form.targetType === 'group' ? reference?.groups.map(item => ({ id: item.staff_group_id, name: isChinese ? item.name_zh : item.name_en })) || [] : [{ id: 'USR-T-001', name: isChinese ? '陳美玲' : 'Chan Mei Ling' },{ id: 'USR-T-002', name: isChinese ? '黃啟豪' : 'Wong Kai Ho' },{ id: 'USR-ST-001', name: isChinese ? '李慧敏' : 'Lee Wai Man' }];
  return <>
    <PageHeader kicker={text('SCHOOL POLICY · EXPLICIT DENY WINS', '校本政策 · 明確拒絕優先')} title={text('Capability policy lab', '功能權限政策測試')} description={text('Preview a scoped school-wide or individual change before writing the audited override.', '寫入可稽核的例外設定前，先預覽校本、群組或個別使用者範圍的影響。')} />
    <section className="policy-editor">
      <Field label={text('Target type', '目標類型')}><select value={form.targetType} onChange={event => setForm({ ...form, targetType: event.target.value, targetId: event.target.value === 'group' ? 'GRP-ENG-TEACHERS' : 'USR-T-001' })}><option value="group">{text('Staff group', '教職員群組')}</option><option value="user">{text('Individual user', '個別使用者')}</option></select></Field>
      <Field label={text('Target', '目標')}><select value={form.targetId} onChange={event => setForm({ ...form, targetId: event.target.value })}>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label={text('Capability', '功能權限')}><select value={form.capabilityId} onChange={event => setForm({ ...form, capabilityId: event.target.value })}>{reference?.capabilities.map(item => <option key={item.capability_id} value={item.capability_id}>{isChinese ? item.name_zh || item.name_en : item.name_en}</option>)}</select></Field>
      <Field label={text('Effect', '效果')}><select value={form.effect} onChange={event => setForm({ ...form, effect: event.target.value })}><option value="allow">{text('Allow', '允許')}</option><option value="deny">{text('Deny', '拒絕')}</option></select></Field>
      <Field label={text('Scope type', '範圍類型')}><select value={form.scopeType} onChange={event => setForm({ ...form, scopeType: event.target.value })}><option value="school">{text('School', '學校')}</option><option value="subject">{text('Subject', '科目')}</option><option value="department">{text('Department', '部門')}</option><option value="activity">{text('Activity', '活動')}</option><option value="group">{text('Group', '群組')}</option></select></Field>
      <Field label={text('Scope ID', '範圍 ID')}><input value={form.scopeId} onChange={event => setForm({ ...form, scopeId: event.target.value })} /></Field>
      <Field label={text('Reason', '原因')}><input value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} placeholder={text('Required before apply', '套用前必須填寫')} /></Field>
      <div className="form-actions"><button onClick={runPreview}><Eye size={17} />{text('Preview affected users', '預覽受影響使用者')}</button><button className="primary" disabled={!form.reason || !preview.length} onClick={apply}><ShieldChevron size={17} />{text('Apply override', '套用例外設定')}</button></div>
    </section>
    {preview.length > 0 && <div className="preview-list"><h3>{text('Preview', '預覽')}</h3>{preview.map(item => <div key={item.userId}><b>{isChinese ? item.nameZh || item.name : item.name}</b><span>{item.beforeAllowed ? text('allowed', '允許') : text('not allowed', '不允許')} → {item.afterAllowed ? text('allowed', '允許') : text('denied', '拒絕')}</span></div>)}</div>}
    <h2 className="section-title">{text('Active override history', '生效中的例外設定紀錄')}</h2>
    <div className="table-wrap"><table><thead><tr><th>{text('Target', '目標')}</th><th>{text('Capability', '功能權限')}</th><th>{text('Effect', '效果')}</th><th>{text('Scope', '範圍')}</th><th>{text('Reason', '原因')}</th></tr></thead><tbody>{overrides.map(item => <tr key={item.capability_policy_override_id}><td>{codeLabel(item.target_type)}: <span className="mono">{item.target_id}</span></td><td>{isChinese ? item.capability_name_zh || item.capability_name : item.capability_name}<small>{item.capability_key}</small></td><td><span className={item.effect === 'deny' ? 'deny-inline' : 'allow-inline'}>{codeLabel(item.effect)}</span></td><td>{codeLabel(item.scope_type)}: <span className="mono">{item.scope_id}</span></td><td>{item.reason}</td></tr>)}</tbody></table></div>
    <Notice tone="warning">{text('A position title never grants a capability. Applicable explicit denies take precedence over role and group allows.', '職銜本身不會授予功能權限；適用的明確拒絕會優先於角色及群組的允許設定。')}</Notice>
  </>;
}
