import { useEffect, useState } from 'react';
import { AppstoreOutlined, AuditOutlined, BankOutlined, BulbOutlined, FileImageOutlined, FormOutlined, IdcardOutlined, LoadingOutlined, RobotOutlined, StarOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Segmented, Space, Spin } from 'antd';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, type User } from '../api/client';
import { l, t, type Lang } from '../i18n';
import { useAuth } from '../state/AuthContext';

const {Header,Sider,Content}=Layout;
export function AppShell({lang,setLang}:{lang:Lang;setLang:(l:Lang)=>void}){
  const {user,loading,logout,switchUser}=useAuth();const location=useLocation();const [demoUsers,setDemoUsers]=useState<User[]>([]);
  useEffect(()=>{api<User[]>('/demo-users').then(setDemoUsers).catch(()=>{});},[]);
  if(loading)return <div className="center-screen"><Spin size="large"/></div>;
  if(!user)return <Navigate to="/login" replace/>;
  const menu=[
    {key:'/',icon:<AppstoreOutlined/>,label:<Link to="/">{t(lang,'dashboard')}</Link>},
    {key:'/activities',icon:<AuditOutlined/>,label:<Link to="/activities">{t(lang,'activities')}</Link>},
    {key:'/students',icon:<TeamOutlined/>,label:<Link to="/students">{t(lang,'students')}</Link>},
    ...(['class_teacher','activity_teacher','staff','school_admin'].includes(user.role)?[{key:'/classes',icon:<BankOutlined/>,label:<Link to="/classes">{t(lang,'classes')}</Link>}]:[]),
    {key:'/questions',icon:<FormOutlined/>,label:<Link to="/questions">{t(lang,'questions')}</Link>},
    {key:'/evidence',icon:<FileImageOutlined/>,label:<Link to="/evidence">{t(lang,'evidence')}</Link>},
    ...(['class_teacher','activity_teacher','staff','school_admin'].includes(user.role)?[{key:'/processing',icon:<LoadingOutlined/>,label:<Link to="/processing">{l(lang,'媒體處理','Processing')}</Link>}]:[]),
    {key:'/learner-profile',icon:<IdcardOutlined/>,label:<Link to="/learner-profile">{l(lang,'學習者 Portfolio','Learner profile')}</Link>},
    {key:'/portfolio-curation',icon:<StarOutlined/>,label:<Link to="/portfolio-curation">{t(lang,'portfolio')}</Link>},
    {key:'/ai',icon:<RobotOutlined/>,label:<Link to="/ai">{t(lang,'ai')}</Link>},
    ...(['staff','school_admin'].includes(user.role)?[{key:'/decisions',icon:<BulbOutlined/>,label:<Link to="/decisions">{t(lang,'decisions')}</Link>}]:[]),
    ...(user.role==='school_admin'?[{key:'/admin',icon:<UserOutlined/>,label:<Link to="/admin">{t(lang,'admin')}</Link>}]:[])
  ];
  const roleName=(role:User['role'])=>t(lang,`role_${role}` as import('../i18n').CopyKey);
  const accountItems=demoUsers.map(u=>({key:u.id,label:<div><b>{u.display_name_zh}</b><div className="menu-secondary">{u.username} · {roleName(u.role)}</div></div>,onClick:()=>switchUser(u.id)}));
  return <Layout className="app-shell">
    <Sider width={240} theme="light" className="app-sider"><div className="brand-mark"><span>BHSS</span><strong>{t(lang,'brand')}</strong></div><Menu mode="inline" selectedKeys={[location.pathname]} items={menu}/><div className="sider-note">POC · local data<br/>No external AI call</div></Sider>
    <Layout>
      <Header className="app-header"><Segmented size="small" value={lang} onChange={v=>setLang(v as Lang)} options={[{label:'繁中',value:'zh'},{label:'EN',value:'en'}]}/><Space><Dropdown menu={{items:accountItems}} trigger={['click']}><Button type="text"><Avatar size="small">{user.display_name_zh.slice(0,1)}</Avatar><span className="account-name">{user.display_name_zh}</span><span className="role-label">{roleName(user.role)}</span></Button></Dropdown><Button onClick={logout}>{t(lang,'logout')}</Button></Space></Header>
      <Content className="app-content"><Outlet context={{lang}}/></Content>
    </Layout>
  </Layout>;
}
