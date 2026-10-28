import { useEffect, useState } from 'react';
import { FileArrowUp, FileText, Image, Prohibit, SealCheck } from '@phosphor-icons/react';
import { api, type Activity, type MediaItem, type Session, type Student } from '../api/client';
import { Notice, PageHeader, StatusPill } from '../components/Layout';

export function Media({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activityId, setActivityId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('new-evidence-photo.jpg');
  const [extracted, setExtracted] = useState<Record<string, string>>({});
  const load = () => api.media().then(setItems).catch(report);

  useEffect(() => {
    load();
    api.activities().then(data => { setActivities(data); setActivityId(data[0]?.id || ''); }).catch(report);
    if (session.role !== 'student') api.students().then(data => { setStudents(data); setStudentId(data[0]?.id || ''); }).catch(report);
  }, []);

  async function upload() {
    try { await api.createMedia({ activityId, studentId, name, mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }); await load(); } catch (error) { report(error); }
  }
  async function process(item: MediaItem, action: string) {
    try { await api.processMedia(item.id, action, extracted[item.id] || item.extracted_text); await load(); } catch (error) { report(error); }
  }
  async function disable(item: MediaItem) {
    try { await api.disableMedia(item.id, 'Source withdrawn in the POC to demonstrate the manual-warning policy.'); await load(); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="EVIDENCE MEDIA" title="Upload, extract, review, publish" description="Images and documents do not become proof until extraction and human confirmation are complete." />
    <div className="pipeline"><div><FileArrowUp size={22} /><b>1. Upload</b><span>Teacher, staff or student</span></div><div><FileText size={22} /><b>2. Extract</b><span>OCR / text queue</span></div><div><SealCheck size={22} /><b>3. Review</b><span>Human confirms context</span></div><div><Image size={22} /><b>4. Publish</b><span>Creates accepted proof</span></div></div>
    <Notice>Disabling a source creates a warning for the class teacher, student and staff. It does not silently recalculate the portfolio; the SchoolAdmin policy controls who may trigger regeneration.</Notice>
    <div className="upload-bar">
      <label>Activity<select value={activityId} onChange={event => setActivityId(event.target.value)}>{activities.map(activity => <option value={activity.id} key={activity.id}>{activity.title}</option>)}</select></label>
      {session.role !== 'student' && <label>Student<select value={studentId} onChange={event => setStudentId(event.target.value)}>{students.map(student => <option value={student.id} key={student.id}>{student.name}</option>)}</select></label>}
      <label>File name<input value={name} onChange={event => setName(event.target.value)} /></label>
      <button className="primary" onClick={upload}><FileArrowUp size={17} />Queue upload</button>
    </div>
    <div className="media-grid">{items.map(item => <article className="media-card" key={item.id}>
      {item.asset_url ? <img src={item.asset_url} alt="Fictional activity evidence" /> : <div className="file-placeholder"><FileText size={34} /><span>{item.mime_type}</span></div>}
      <div className="media-body"><div className="peer-card-head"><div><b>{item.name}</b><small>{item.activity_title} · {item.uploader_name}</small></div><StatusPill status={item.status} /></div>
        {item.status === 'processing' && session.role === 'staff' && <><label>Extraction result<textarea value={extracted[item.id] || ''} onChange={event => setExtracted({ ...extracted, [item.id]: event.target.value })} placeholder="OCR or transcription output..." /></label><button className="primary" onClick={() => process(item, 'extract')}>Complete extraction</button></>}
        {item.extracted_text && <div className="extraction"><small>EXTRACTED TEXT</small><p>{item.extracted_text}</p></div>}
        {item.status === 'awaiting_review' && session.role === 'staff' && <button className="primary" onClick={() => process(item, 'publish')}><SealCheck size={17} />Confirm and publish proof</button>}
        {item.status === 'published' && session.role === 'staff' && <button className="danger-button" onClick={() => disable(item)}><Prohibit size={17} />Soft-disable source</button>}
        {item.disabled_reason && <p className="warning-text">{item.disabled_reason}</p>}
      </div>
    </article>)}</div>
  </>;
}
