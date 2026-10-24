export type Lang='zh'|'en';
const copy={
  zh:{brand:'BHSS 成長歷程',dashboard:'概覽',activities:'活動',students:'學生',classes:'班級及學年',questions:'題庫與對應',evidence:'媒體庫',portfolio:'Portfolio 整理',ai:'AI 草稿',decisions:'待確認事項',admin:'系統管理',logout:'登出',switch:'切換示範帳戶',source:'資料來源',open:'尚待確認',role_student:'學生',role_class_teacher:'班主任',role_activity_teacher:'活動老師',role_staff:'校務人員',role_school_admin:'系統管理員'},
  en:{brand:'BHSS Growth Portfolio',dashboard:'Overview',activities:'Activities',students:'Students',classes:'Classes & years',questions:'Questions & mappings',evidence:'Media library',portfolio:'Portfolio curation',ai:'AI drafts',decisions:'Open decisions',admin:'Administration',logout:'Log out',switch:'Switch demo account',source:'Source',open:'Not confirmed',role_student:'Student',role_class_teacher:'Class Teacher',role_activity_teacher:'Activity Teacher',role_staff:'Staff',role_school_admin:'School Admin'}
} as const;
export type CopyKey=keyof typeof copy.zh;
export const t=(lang:Lang,key:CopyKey)=>copy[lang][key];
export const l=(lang:Lang,zh:string,en:string)=>lang==='zh'?zh:en;
