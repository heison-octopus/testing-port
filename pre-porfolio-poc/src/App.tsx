import { useState } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import type { Lang } from './i18n';
import { AuthProvider } from './state/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivityDetailPage } from './pages/ActivityDetailPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { ClassesPage } from './pages/ClassesPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { EvidencePage } from './pages/EvidencePage';
import { AiPage } from './pages/AiPage';
import { DecisionsPage } from './pages/DecisionsPage';
import { AdminPage } from './pages/AdminPage';
import { MemorableActivityPage } from './pages/MemorableActivityPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { LearnerProfilePage } from './pages/LearnerProfilePage';

export default function App(){const [lang,setLang]=useState<Lang>(()=>(localStorage.getItem('bhss.lang') as Lang)||'zh');const change=(v:Lang)=>{setLang(v);localStorage.setItem('bhss.lang',v);document.documentElement.lang=v==='zh'?'zh-Hant-HK':'en'};return <ConfigProvider theme={{token:{colorPrimary:'#c96f35',colorInfo:'#c96f35',colorBgLayout:'#ffffff',colorBgContainer:'#ffffff',borderRadius:6,fontFamily:"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'PingFang HK', sans-serif"},components:{Layout:{headerBg:'#ffffff',siderBg:'#ffffff'},Menu:{itemBg:'#ffffff',itemSelectedBg:'#fff3e8',itemSelectedColor:'#9d4b1c',itemBorderRadius:4},Button:{borderRadius:5},Table:{headerBg:'#ffffff',headerColor:'#4f4a46',rowHoverBg:'#fffaf6'},Drawer:{colorBgElevated:'#ffffff'}}}}><AntApp><AuthProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage lang={lang} setLang={change}/>}/><Route element={<AppShell lang={lang} setLang={change}/>}><Route index element={<DashboardPage/>}/><Route path="/activities" element={<ActivitiesPage/>}/><Route path="/activities/:id" element={<ActivityDetailPage/>}/><Route path="/students" element={<StudentsPage/>}/><Route path="/students/:id" element={<StudentDetailPage/>}/><Route path="/classes" element={<ClassesPage/>}/><Route path="/questions" element={<QuestionsPage/>}/><Route path="/evidence" element={<EvidencePage/>}/><Route path="/processing" element={<ProcessingPage/>}/><Route path="/learner-profile" element={<LearnerProfilePage/>}/><Route path="/portfolio-curation" element={<MemorableActivityPage/>}/><Route path="/ai" element={<AiPage/>}/><Route path="/decisions" element={<DecisionsPage/>}/><Route path="/admin" element={<AdminPage/>}/></Route></Routes></BrowserRouter></AuthProvider></AntApp></ConfigProvider>}
