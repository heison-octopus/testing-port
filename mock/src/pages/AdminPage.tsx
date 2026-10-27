import { useEffect, useState } from 'react';
import { Alert, Table, Tabs, Tag } from 'antd';
import { useOutletContext } from 'react-router-dom';
import { api, resource } from '../api/client';
import { Section } from '../components/Section';
import { StatusTag } from '../components/StatusTag';
import { l, type Lang } from '../i18n';

type ContractModel = {
  roleModel: { roles: any[]; assignments: any[] };
  periods: any[];
  rubrics: any[];
};

export function AdminPage() {
  const { lang } = useOutletContext<{ lang: Lang }>();
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [model, setModel] = useState<ContractModel | null>(null);
  const [error, setError] = useState('');

  const load = () => Promise.all([
    resource.list<any>('users'),
    resource.list<any>('sessions'),
    api<ContractModel>('/admin/contract-model'),
  ]).then(([nextUsers, nextSessions, nextModel]) => {
    setUsers(nextUsers);
    setSessions(nextSessions);
    setModel(nextModel);
  }).catch(nextError => setError(nextError.message));

  useEffect(() => { load(); }, []);

  const roleTab = model && <>
    <Table<any> rowKey="id" dataSource={model.roleModel.roles} columns={[
      { title: l(lang, '角色', 'Role'), render: (_, role) => <><b>{lang === 'zh' ? role.name_zh : role.name_en}</b><div className="table-secondary">{role.code} · {role.category}</div></> },
      { title: l(lang, '職責', 'Responsibility'), render: (_, role) => lang === 'zh' ? role.description_zh : role.description_en },
      { title: l(lang, '有效分派', 'Active assignments'), dataIndex: 'active_assignment_count', render: value => <b>{value}</b> },
      { title: l(lang, '狀態', 'Status'), dataIndex: 'status', render: value => <StatusTag status={value} /> },
    ]} />
    <h3>{l(lang, '使用者角色分派', 'User-role assignments')}</h3>
    <Table<any> rowKey="id" dataSource={model.roleModel.assignments} columns={[
      { title: l(lang, '使用者', 'User'), render: (_, assignment) => <><b>{assignment.display_name_zh}</b><div className="table-secondary">{assignment.username}</div></> },
      { title: l(lang, '角色', 'Role'), render: (_, assignment) => lang === 'zh' ? assignment.role_name_zh : assignment.role_name_en },
      { title: l(lang, '範圍', 'Scope'), render: (_, assignment) => <code>{assignment.scope_type}:{assignment.scope_id}</code> },
      { title: l(lang, '生效期', 'Effective'), render: (_, assignment) => `${assignment.effective_from} — ${assignment.effective_until || l(lang, '持續有效', 'ongoing')}` },
      { title: l(lang, '狀態', 'Status'), dataIndex: 'status', render: value => <StatusTag status={value} /> },
    ]} />
  </>;

  const periodTab = model && <>
    <Alert type="info" showIcon message={l(lang, '活動不會由職員手動選擇學段', 'Staff do not manually select an activity period')} description={l(lang, '伺服器根據活動開始及完結日期配對一個學段；跨學段會產生例外。', 'The server resolves one period from activity start/end dates; crossing a boundary creates an exception.')} />
    <Table<any> rowKey="id" dataSource={model.periods} columns={[
      { title: l(lang, '學年／學段', 'Year / period'), render: (_, period) => <><b>{period.academic_year} {period.label}</b><div className="table-secondary">{period.id}</div></> },
      { title: l(lang, '日期範圍', 'Date range'), render: (_, period) => `${period.starts_on} — ${period.ends_on}` },
      { title: l(lang, '活動數目', 'Activities'), dataIndex: 'activity_count', render: value => <b>{value}</b> },
      { title: l(lang, '狀態', 'Status'), dataIndex: 'status', render: value => <StatusTag status={value} /> },
    ]} />
  </>;

  const rubricTab = model && <>
    <Alert type="warning" showIcon message={l(lang, '只有完整評估定義才可輸出雷達圖', 'Only a complete assessment definition can feed a radar chart')} description={l(lang, '標籤能力與評估能力分開。評估 Rubric 必須有範疇、排序階段及具體條件。', 'Labelling and assessment are independent. An assessable rubric requires axes, ordered levels and concrete conditions.')} />
    <Table<any> rowKey="id" dataSource={model.rubrics} columns={[
      { title: l(lang, '目錄', 'Catalogue'), render: (_, rubric) => <><b>{rubric.name}</b><div className="table-secondary">{rubric.code} · {rubric.version}</div></> },
      { title: l(lang, '作標籤', 'Labelling'), dataIndex: 'labelling_capable', render: value => <Tag color={value ? 'blue' : undefined}>{value ? l(lang, '可以', 'Yes') : l(lang, '否', 'No')}</Tag> },
      { title: l(lang, '作評估', 'Assessment'), dataIndex: 'assessment_capable', render: value => <Tag color={value ? 'green' : undefined}>{value ? l(lang, '可以', 'Yes') : l(lang, '否', 'No')}</Tag> },
      { title: l(lang, '雷達圖', 'Radar'), dataIndex: 'radar_eligible', render: value => <Tag color={value ? 'green' : 'default'}>{value ? l(lang, '可用', 'Eligible') : l(lang, '不可用', 'Not eligible')}</Tag> },
      { title: l(lang, '定義數量', 'Definitions'), render: (_, rubric) => `${rubric.axis_count} axes · ${rubric.level_count} levels · ${rubric.condition_count} conditions` },
      { title: l(lang, '狀態', 'Status'), dataIndex: 'status', render: value => <StatusTag status={value} /> },
    ]} />
  </>;

  const accountTab = <Table<any> rowKey="id" dataSource={users} columns={[
    { title: l(lang, '帳戶', 'Account'), render: (_, user) => <><b>{user.display_name_zh}</b><div className="table-secondary">{user.username} · {user.id}</div></> },
    { title: l(lang, '主要登入角色', 'Primary login role'), dataIndex: 'role', render: value => <Tag>{value}</Tag> },
    { title: l(lang, '狀態', 'Status'), dataIndex: 'is_active', render: value => <Tag color={value ? 'green' : 'red'}>{value ? l(lang, '使用中', 'Active') : l(lang, '停用', 'Disabled')}</Tag> },
  ]} />;

  const sessionTab = <Table<any> rowKey="id" dataSource={sessions} columns={[
    { title: l(lang, '帳戶', 'Account'), render: (_, session) => <><b>{session.display_name_zh}</b><div className="table-secondary">{session.role}</div></> },
    { title: l(lang, '最近活動', 'Last activity'), dataIndex: 'last_seen_at', render: value => new Date(value).toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-GB') },
    { title: l(lang, '到期', 'Expires'), dataIndex: 'expires_at', render: value => new Date(value).toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-GB') },
    { title: 'Session ID', dataIndex: 'id', render: value => <code>{value}</code> },
  ]} />;

  return <div>
    <div className="page-title"><div><div className="eyebrow">LINKED SCHOOL ADMINISTRATION</div><h1>{l(lang, '系統管理', 'Administration')}</h1><p>{l(lang, '帳戶身份、有效角色、學段日期及 Rubric 能力分開管理；工作批核仍使用獨立分派。', 'Account identity, effective roles, period dates and rubric capability are managed separately. Workflow approval still uses explicit assignments.')}</p></div></div>
    {error && <Alert type="error" message={error} />}
    {model && <Section title={l(lang, '核心定義及有效分派', 'Core definitions and effective assignments')}><Tabs items={[
      { key: 'roles', label: l(lang, '角色定義', 'Role definitions'), children: roleTab },
      { key: 'periods', label: l(lang, '學年／學段', 'Years / periods'), children: periodTab },
      { key: 'rubrics', label: 'Rubrics', children: rubricTab },
      { key: 'accounts', label: l(lang, '帳戶', 'Accounts'), children: accountTab },
      { key: 'sessions', label: l(lang, '工作階段', 'Sessions'), children: sessionTab },
    ]} /></Section>}
  </div>;
}
