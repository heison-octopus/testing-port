import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Statistic, Table, Tag } from 'antd';
import { Link, useOutletContext } from 'react-router-dom';
import { api, type Activity } from '../api/client';
import { AiPanel, Section, Unresolved } from '../components/Section';
import { StatusTag } from '../components/StatusTag';
import { useAuth } from '../state/AuthContext';
import { l, type Lang } from '../i18n';

type Dashboard = {
  counts: { students: number; activities: number; openDecisions: number };
  activities: Activity[];
  recentAudit: Array<Record<string, string>>;
};

export function DashboardPage() {
  const { user } = useAuth();
  const { lang } = useOutletContext<{ lang: Lang }>();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/dashboard').then(setData).catch(error => setError(error.message));
  }, [user?.id]);

  if (error) return <Alert type="error" message={error} />;
  if (!data) return <Skeleton active />;

  const locale = lang === 'zh' ? 'zh-HK' : 'en-GB';

  return <div>
    <div className="page-title">
      <div>
        <div className="eyebrow">ROLE-AWARE OVERVIEW</div>
        <h1>{l(lang, `早晨，${user?.display_name_zh}`, `Welcome, ${user?.display_name}`)}</h1>
        <p>{l(lang, '你只會看到此帳戶獲授權的學生、活動和記錄。', 'This account only sees authorized students, activities and records.')}</p>
      </div>
      <Tag>{user?.role}</Tag>
    </div>
    <div className="stat-strip">
      <Statistic title={l(lang, '可查看學生', 'Visible students')} value={data.counts.students} />
      <Statistic title={l(lang, '可查看活動', 'Visible activities')} value={data.counts.activities} />
      <Statistic title={l(lang, '尚待確認事項', 'Open decisions')} value={data.counts.openDecisions} />
    </div>
    <Section title={l(lang, '近期活動', 'Recent activities')} description={l(lang, '班級及學段均按活動日期從有效紀錄擷取。', 'Class and school period are resolved from effective-dated records at the activity date.')}>
      <Table rowKey="id" size="small" pagination={false} dataSource={data.activities} columns={[
        { title: l(lang, '活動', 'Activity'), render: (_, activity) => <Link to={`/activities/${activity.id}`}><b>{lang === 'zh' ? activity.title_zh : activity.title}</b><div className="table-secondary">{activity.id} · {activity.activity_type}</div></Link> },
        { title: l(lang, '日期', 'Date'), dataIndex: 'starts_at', render: value => new Date(value).toLocaleDateString(locale) },
        { title: l(lang, '狀態', 'Status'), dataIndex: 'status', render: value => <StatusTag status={value} /> },
      ]} />
    </Section>
    <Unresolved title={l(lang, '正式發布權責仍須由校方確認', 'Final publication authority still requires school confirmation')}>
      <p>{l(lang, 'POC 已取消固定題目對應，改用題目能力、統一佐證清單及人工確認的 Rubric 觀察。現時預設按每個範疇採用最高已確認階段，但誰可正式發布結果仍須確認。', 'The POC replaces fixed question mappings with question abilities, a unified Proof List and human-confirmed rubric observations. It defaults to the highest confirmed level per axis, while final publication authority remains open.')}</p>
      {['staff', 'school_admin'].includes(user?.role || '') && <Button><Link to="/decisions">{l(lang, '查看待確認事項', 'Review open decisions')}</Link></Button>}
    </Unresolved>
    <AiPanel title={l(lang, 'AI 只會產生附來源的正面候選內容', 'AI only drafts positive source-linked candidates')}>
      <p>{l(lang, '老師先選擇回望／展望的記憶時段及資料類別，再預覽完整輸入；POC 不會連接外部 LLM。', 'The teacher chooses the review/outlook memory window and source classes, then inspects the exact payload. The POC does not connect to an external LLM.')}</p>
      <Button><Link to="/ai">{l(lang, '設定回望／展望', 'Configure review / outlook')}</Link></Button>
    </AiPanel>
    {data.recentAudit.length > 0 && <Section title={l(lang, '近期操作記錄', 'Recent audit activity')}>
      <Table size="small" pagination={false} rowKey="id" dataSource={data.recentAudit} columns={[
        { title: l(lang, '時間', 'Time'), dataIndex: 'created_at', render: value => new Date(value).toLocaleString(locale) },
        { title: l(lang, '操作人', 'Actor'), dataIndex: 'actor_name' },
        { title: l(lang, '動作', 'Action'), dataIndex: 'action' },
        { title: l(lang, '記錄', 'Record'), render: (_, record) => <code>{record.entity_type}:{record.entity_id}</code> },
      ]} />
    </Section>}
  </div>;
}
