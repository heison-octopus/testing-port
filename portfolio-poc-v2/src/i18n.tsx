import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'zh-HK';

const labels: Record<string, { en: string; zh: string }> = {
  active: { en: 'active', zh: '生效' },
  approved: { en: 'approved', zh: '已批核' },
  approved_version_available: { en: 'approved version available', zh: '已有已批核版本' },
  assigned: { en: 'assigned', zh: '已分派' },
  awaiting_staff_approval: { en: 'awaiting staff approval', zh: '等待教職員批核' },
  changes_requested: { en: 'changes requested', zh: '已退回修改' },
  class_teacher_review: { en: 'class-teacher review', zh: '班主任覆核中' },
  draft: { en: 'draft', zh: '草稿' },
  in_review: { en: 'in review', zh: '覆核中' },
  included: { en: 'included', zh: '已包括' },
  ignored: { en: 'ignored', zh: '已略過' },
  no_approved_version: { en: 'no approved version', zh: '未有已批核版本' },
  open: { en: 'open', zh: '待處理' },
  pending: { en: 'pending', zh: '待處理' },
  pending_approval: { en: 'pending approval', zh: '等待批核' },
  pending_review: { en: 'pending review', zh: '等待覆核' },
  planned: { en: 'planned', zh: '已規劃' },
  published: { en: 'published', zh: '已發布' },
  rejected: { en: 'rejected', zh: '已拒絕' },
  returned: { en: 'returned', zh: '已退回修改' },
  scheduled: { en: 'scheduled', zh: '已排期' },
  staff_review: { en: 'staff review', zh: '教職員覆核中' },
  student_submitted: { en: 'student submitted', zh: '學生已提交' },
  unpublished: { en: 'unpublished', zh: '未發布' },
  unknown: { en: 'unknown', zh: '未知' },
  activity: { en: 'activity', zh: '活動' },
  portfolio: { en: 'Portfolio', zh: 'Portfolio' },
  portfolio_publication: { en: 'Portfolio publication', zh: 'Portfolio 發布' },
  portfolio_working_version: { en: 'Portfolio working version', zh: 'Portfolio 工作版本' },
  form_version: { en: 'form version', zh: '表格版本' },
  school: { en: 'school', zh: '學校' },
  subject: { en: 'subject', zh: '科目' },
  department: { en: 'department', zh: '部門' },
  group: { en: 'group', zh: '群組' },
  class: { en: 'class', zh: '班別' },
  student: { en: 'student', zh: '學生' },
  user: { en: 'individual user', zh: '個別使用者' },
  allow: { en: 'allow', zh: '允許' },
  deny: { en: 'deny', zh: '拒絕' },
  owner: { en: 'owner', zh: '負責人' },
  supporting_teacher: { en: 'supporting teacher', zh: '協作老師' },
  participant: { en: 'participant', zh: '參加者' },
  self_introduction: { en: 'self-introduction', zh: '自我介紹' },
  memorable_activity: { en: 'memorable activity', zh: '最難忘活動' },
  human_authored: { en: 'human-authored', zh: '由人員撰寫' },
  student_text: { en: 'student text', zh: '學生文字' },
  description_en: { en: 'English description', zh: '英文說明' },
  description_zh: { en: 'Chinese description', zh: '中文說明' },
  unassigned: { en: 'unassigned', zh: '未分派' },
  overdue: { en: 'overdue', zh: '逾期' },
  overdue_assignment: { en: 'overdue assignment', zh: '分派工作逾期' },
  unassigned_work: { en: 'unassigned work', zh: '未分派工作' },
};

type I18nValue = {
  language: Language;
  isChinese: boolean;
  setLanguage: (language: Language) => void;
  text: (english: string, chinese: string) => string;
  codeLabel: (value?: string | null) => string;
  formatDateTime: (value?: string | null) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function initialLanguage(): Language {
  const query = new URLSearchParams(window.location.search).get('lang');
  if (query === 'zh-HK' || query === 'en') return query;
  return localStorage.getItem('bhss-language') === 'zh-HK' ? 'zh-HK' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    localStorage.setItem('bhss-language', language);
    document.documentElement.lang = language === 'zh-HK' ? 'zh-Hant-HK' : 'en';
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.history.replaceState(null, '', url);
  }, [language]);
  const value = useMemo<I18nValue>(() => ({
    language,
    isChinese: language === 'zh-HK',
    setLanguage,
    text: (english, chinese) => language === 'zh-HK' ? chinese || english : english,
    codeLabel: value => {
      const code = value || 'unknown';
      const known = labels[code];
      return known ? language === 'zh-HK' ? known.zh : known.en : code.replaceAll('_', ' ');
    },
    formatDateTime: value => value ? new Intl.DateTimeFormat(language === 'zh-HK' ? 'zh-HK' : 'en-HK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(value)) : '—',
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();
  return <div className={compact ? 'language-toggle compact' : 'language-toggle'} role="group" aria-label="Language／語言">
    <button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
    <button type="button" className={language === 'zh-HK' ? 'active' : ''} aria-pressed={language === 'zh-HK'} onClick={() => setLanguage('zh-HK')}>繁中</button>
  </div>;
}
