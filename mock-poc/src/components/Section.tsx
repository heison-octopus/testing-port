export function Section({title,description,children,className='' }:{title:string;description?:string;children:React.ReactNode;className?:string}){
  return <section className={`page-section ${className}`}><div className="section-heading"><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}</section>;
}
export function Unresolved({title,children}:{title:string;children:React.ReactNode}){const en=document.documentElement.lang==='en';return <div className="unresolved-section"><div className="context-label">{en?'NOT CONFIRMED · School decision required':'尚待學校確認 · NOT CONFIRMED'}</div><h3>{title}</h3>{children}</div>}
export function AiPanel({title='AI 輔助內容',children}:{title?:string;children:React.ReactNode}){const en=document.documentElement.lang==='en';return <div className="ai-section"><div className="context-label">{en?'AI ASSISTED · Human review required':'AI ASSISTED · 人工覆核後才可使用'}</div><h3>{title}</h3>{children}</div>}
