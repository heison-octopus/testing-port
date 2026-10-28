export type Role = 'student' | 'teacher' | 'staff' | 'admin';
export type Session = { id: string; name: string; role: Role; school: string; capabilities: Record<string, boolean> };
export type Participant = { id: string; name: string; attendance: string; attendance_approval: string };
export type Proof = { id: string; student_id: string; activity_id: string; kind: string; content: string; status: string };
export type ActivityEvent = { id: string; actor_name: string; action: string; detail: string; created_at: string };
export type AcademicYear = { id: string; code: string; name: string; start_date: string; end_date: string; status: string };
export type ReportingPeriod = { id: string; academic_year_id: string; code: string; name_en: string; name_zh: string; start_date: string; end_date: string; sequence: number; status: string };
export type AcademicContext = { school: { id: string; name: string; school_code: string; operating_mode: string }; academicYears: AcademicYear[]; reportingPeriods: ReportingPeriod[]; rule: string };
export type Activity = { id: string; school_id?: string; title: string; description: string; status: string; labels: string[]; starts_at?: string; ends_at?: string; reporting_period_id?: string; period_resolution_status?: string; reporting_period?: ReportingPeriod | null; event_count?: number; participants?: Participant[]; questions?: Question[]; proof?: Proof[]; events?: ActivityEvent[] };
export type Question = { id: string; prompt: string; input_type: string; ability_code?: string; ability_name?: string; source?: string; configuration?: { scale?: string[] | null; negativelyWorded?: boolean } };
export type Student = { id: string; name: string };
export type Observation = { id: string; student_id: string; activity_id: string; activity_title: string; axis_id: string; axis_name: string; level: number; proof_id: string; proof_content: string; proof_kind: string; proof_status: string; comment: string; decision: string; reason: string | null; confirmed: number };
export type Axis = { id: string; name: string; levels: { level: number; condition: string }[] };
export type Catalogue = { id: string; name: string; version: string; assessment_capable: number; status: string; axes: Axis[] };
export type SourceTag = { activity: string; type: string; proofId?: string };
export type PortfolioResult = { axis: string; rubric: string; version: string; level: number; statement: string; sourceTags: SourceTag[]; observationIds?: string[]; proofIds?: string[] };
export type Snapshot = { id: string; created_at: string; student?: Student; warnings?: { id: string; message: string }[]; privacy?: { filtered: boolean; adapter: string; externalAdapterStatus: string }; manifest: { period?: string; policy: { id: string; version: string }; summary?: { text: string; sourceTags: string[] }; results: PortfolioResult[]; observations?: Observation[] } };
export type PeerReview = { id: string; activity_id: string; activity_title: string; subject_name: string; reviewer_name?: string; raw_comment: string; rating: number; status: string; moderation_note?: string; sanitized_statement?: string };
export type MediaItem = { id: string; activity_id: string; activity_title: string; student_id: string; student_name: string; uploader_name: string; name: string; mime_type: string; asset_url?: string; extracted_text: string; extraction_status: string; status: string; proof_id?: string; disabled_reason?: string };
export type LearnerSummary = { id: string; period: string; draft_text: string; status: string; source_tags: string[] };
export type SummaryBundle = { summary: LearnerSummary | null; sources: { observations: Observation[]; peerReviews: PeerReview[]; sourceTags: string[] } };
export type PromptPreset = { id: string; name: string; focus: string; prompt: string };
export type GenerationAttempt = { id: string; period: string; report_key: string; preset_id: string; prompt: string; output: string; created_at: string; selected: number };
export type QuestionnaireSource = { id: string; name: string; version: string; source_type: string; source_file?: string; source_sheet?: string; status: string; description: string };
export type QuestionDefinition = { id: string; source_id: string; source_row: number; construct_en: string; construct_zh: string; subdomain: string; prompt_zh: string; input_type: string; scale_json?: string; is_negative: number; ability_code: string; ability_name_en: string; ability_name_zh: string; ability_description_en: string; status: string };
export type FormVersion = { id: string; name: string; version: number; status: string; activity_id: string | null; template_key: string; source_mode: string; review_status: string; publication_status: string; questions: Question[] };
export type FormImport = { id: string; activity_id: string; activity_title?: string; source_id: string; source_name?: string; file_name: string; status: string; summary_json: string; applied_form_version_id?: string };

let key = sessionStorage.getItem('poc-key') || '';

async function call<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Request-Key': key, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  async signIn(userId: string) {
    const data = await call<{ key: string }>('/demo/session', { method: 'POST', body: JSON.stringify({ userId }) });
    key = data.key;
    sessionStorage.setItem('poc-key', key);
  },
  async signOut() { await call('/logout', { method: 'POST' }); key = ''; sessionStorage.removeItem('poc-key'); },
  session: () => call<Session>('/session'),
  academicContext: () => call<AcademicContext>('/academic-context'),
  activities: () => call<Activity[]>('/activities'),
  activity: (id: string) => call<Activity>(`/activities/${id}`),
  createActivity: (data: { title: string; description: string; labels: string[]; startsAt: string; endsAt: string; reflectionMode: 'manual' | 'question_bank'; question?: string; questionIds?: string[] }) => call<{ id: string; status: string; periodResolutionStatus: string; reportingPeriod: ReportingPeriod | null }>('/activities', { method: 'POST', body: JSON.stringify(data) }),
  transitionActivity: (id: string, action: string, reason = '') => call(`/activities/${id}/transition`, { method: 'POST', body: JSON.stringify({ action, reason }) }),
  students: () => call<Student[]>('/students'),
  forms: () => call<{ templates: Record<string, { label: string; audience: string; input: string }>; forms: FormVersion[]; sources: QuestionnaireSource[]; questionLibrary: QuestionDefinition[]; imports: FormImport[] }>('/forms'),
  draftForm: (activityId: string, templateKey: string, prompt: string) => call('/forms', { method: 'POST', body: JSON.stringify({ activityId, templateKey, prompt }) }),
  publishForm: (id: string) => call(`/forms/${id}/publish`, { method: 'POST' }),
  stageFormImport: (activityId: string, sourceId: string, questionIds: string[]) => call<{ id: string; status: string; summary: { total: number; valid: number; errors: number; added: number; modified: number; unchanged: number } }>('/form-imports/stage', { method: 'POST', body: JSON.stringify({ activityId, sourceId, fileName: 'form-definition-selection.xlsx', rows: questionIds.map((questionId, index) => ({ questionId, audience: 'student', position: index + 1, required: true })) }) }),
  applyFormImport: (id: string) => call<{ id: string; version: number; questionCount: number }>(`/form-imports/${id}/apply`, { method: 'POST' }),
  catalogues: () => call<Catalogue[]>('/catalogues'),
  attendance: (id: string, student: string, attendance: string) => call(`/activities/${id}/attendance/${student}`, { method: 'POST', body: JSON.stringify({ attendance }) }),
  approveAttendance: (id: string, student: string) => call(`/activities/${id}/attendance/${student}/approve`, { method: 'POST' }),
  response: (id: string, questionId: string, answer: string) => call(`/activities/${id}/responses`, { method: 'POST', body: JSON.stringify({ questionId, answer }) }),
  peerReviews: () => call<PeerReview[]>('/peer-reviews'),
  updatePeerReview: (id: string, comment: string, rating: number) => call(`/peer-reviews/${id}`, { method: 'POST', body: JSON.stringify({ comment, rating }) }),
  moderatePeerReview: (id: string, decision: string, note: string) => call(`/peer-reviews/${id}/moderate`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
  observe: (data: unknown) => call('/observations', { method: 'POST', body: JSON.stringify(data) }),
  review: (id: string) => call<Observation[]>(`/reviews/${id}`),
  decision: (id: string, decision: string, reason: string) => call(`/observations/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
  summary: (id: string) => call<SummaryBundle>(`/summaries/${id}`),
  saveSummary: (id: string, text: string, action: string) => call(`/summaries/${id}`, { method: 'POST', body: JSON.stringify({ text, action }) }),
  media: () => call<MediaItem[]>('/media'),
  createMedia: (data: { activityId: string; studentId?: string; name: string; mimeType: string }) => call<{ id: string }>('/media', { method: 'POST', body: JSON.stringify(data) }),
  processMedia: (id: string, action: string, extractedText = '') => call(`/media/${id}/process`, { method: 'POST', body: JSON.stringify({ action, extractedText }) }),
  disableMedia: (id: string, reason: string) => call(`/media/${id}/disable`, { method: 'POST', body: JSON.stringify({ reason }) }),
  resolveWarning: (id: string, decision: string) => call(`/portfolio-warnings/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  publish: (id: string) => call(`/portfolios/${id}/publish`, { method: 'POST' }),
  portfolio: (id: string) => call<Snapshot | null>(`/portfolios/${id}`),
  prompts: (id: string) => call<{ presets: PromptPreset[]; attempts: GenerationAttempt[]; unit: { period: string; reportKey: string } }>(`/prompts/${id}`),
  generate: (id: string, presetId: string, prompt: string) => call<{ id: string; output: string }>(`/prompts/${id}/generate`, { method: 'POST', body: JSON.stringify({ presetId, prompt }) }),
  selectAttempt: (id: string) => call(`/generation-attempts/${id}/select`, { method: 'POST' }),
  privacyContract: () => call<{ status: string; mode: string; request: unknown; response: unknown; note: string }>('/privacy/contract'),
  updatePolicy: (key: string, value: string) => call('/admin/policy', { method: 'POST', body: JSON.stringify({ key, value }) }),
  createAcademicYear: (data: { code: string; name: string; startDate: string; endDate: string; status: string }) => call('/admin/academic-years', { method: 'POST', body: JSON.stringify(data) }),
  createReportingPeriod: (data: { academicYearId: string; code: string; nameEn: string; nameZh: string; startDate: string; endDate: string; sequence: number; status: string }) => call('/admin/reporting-periods', { method: 'POST', body: JSON.stringify(data) }),
  updateReportingPeriodStatus: (id: string, status: string) => call(`/admin/reporting-periods/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  admin: () => call<{ school: AcademicContext['school']; academicYears: AcademicYear[]; reportingPeriods: ReportingPeriod[]; users: (Student & { role: string })[]; assignments: { user_id: string; scope_type: string; scope_id: string }[]; features: { feature: string; enabled: number }[]; policies: { policy_key: string; policy_value: string }[]; audit: { actor_id: string; action: string; target: string; created_at: string }[]; counts: { peerReviews: number; pendingPeerReviews: number; media: number; generations: number } }>('/admin'),
};
