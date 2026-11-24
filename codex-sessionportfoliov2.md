# Codex conversation

## User

how many api is there inside of the v2, what are the api that is changing two tables at the same time and the record themselves does not join, and just duplication

## Assistant

I’ll trace the v2 API routes through their services and repositories, then identify writes that duplicate records across tables without a relationship between them.

## Activity

    $ ls -a
        rg -n 'v2' mock/server | head -80
        rg --files | rg '(route|repository|service)' | head -100
    .
    ..
    .DS_Store
    .git
    AGENTS.md
    Assessment
    BHSS-portfolio.json
    D3 bhss-portfolio-ppt
    Design ideas.docx
    Original hand-typedAspects
    README.md
    csv-schema-consolidation.evidence.json
    output
    playground
    portfolio-poc
    portfolio-poc-v2
    portfolio-poc-v3
    pre-porfolio-poc
    pre-porfolio-poc-2
    tmp
    ~$sign ideas.docx
    rg: mock/server: IO error for operation on mock/server: No such file or directory (os error 2)
    portfolio-poc-v2/server/services/authoringService.js
    portfolio-poc-v2/server/services/assessmentService.js
    portfolio-poc-v2/server/services/portfolioService.js
    portfolio-poc-v2/server/services/activityService.js
    portfolio-poc-v2/server/services/importService.js
    portfolio-poc-v2/server/services/mediaService.js
    portfolio-poc-v2/server/services/templatePolicyService.js
    portfolio-poc-v2/server/services/memorableService.js
    portfolio-poc-v2/server/services/access.js
    portfolio-poc-v2/server/services/rubricService.js
    portfolio-poc-v2/server/services/identityService.js
    portfolio-poc-v2/server/services/aiService.js
    portfolio-poc-v2/server/services/dataOperationsService.js
    portfolio-poc-v2/server/services/llmPlaygroundService.js
    portfolio-poc-v2/server/services/approvalService.js
    portfolio-poc-v2/server/routes/api.js
    portfolio-poc-v3/backend/services/inventory.js
    portfolio-poc-v3/backend/routes/api.js
    pre-porfolio-poc/server/services/platformV2Service.js
    pre-porfolio-poc/server/services/schoolService.js
    pre-porfolio-poc/server/services/importService.js
    pre-porfolio-poc/server/services/formDefinitionService.js
    pre-porfolio-poc/server/services/auditService.js
    pre-porfolio-poc/server/services/aiService.js
    pre-porfolio-poc/server/services/contractRevisionService.js
    pre-porfolio-poc/server/routes/api.js
    portfolio-poc/server/services/portfolio.js
    portfolio-poc/server/services/access.js
    pre-porfolio-poc/server/models/repository.js
    portfolio-poc/server/routes/api.js
    ✓ • 0ms

## Activity

    $ cat portfolio-poc-v2/server/routes/api.js
    import { Router } from 'express';
    import multer from 'multer';
    import { controller } from '../controllers/api.js';
    
    export const api = Router();
    const importUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 4 * 1024 * 1024, fields: 10 } });
    
    api.get('/session', controller.session);
    api.get('/reference-data', controller.referenceData);
    api.get('/staff', controller.staff);
    api.get('/directory/teachers', controller.teacherDirectory);
    api.get('/catalogue-labels', controller.catalogueLabels);
    api.get('/question-bank', controller.questionBank);
    api.get('/question-blocks', controller.questionBlocks);
    api.get('/policy', controller.policyWorkspace);
    api.get('/policy/templates', controller.templatePolicyWorkspace);
    api.post('/policy/preview', controller.previewPolicy);
    api.post('/policy/overrides', controller.applyPolicy);
    
    api.get('/imports', controller.imports);
    api.get('/imports/data-operations', controller.dataOperationsInventory);
    api.get('/imports/data-operations/:domain/export', controller.exportDataOperation);
    api.get('/imports/activity-catalogue/export', controller.exportActivityCatalogue);
    api.get('/imports/rubrics', controller.rubrics);
    api.get('/imports/rubrics/export', controller.exportRubrics);
    api.get('/imports/rubrics/template', controller.rubricTemplate);
    api.get('/imports/rubrics/:rubricId', controller.rubricPackage);
    api.post('/imports/rubrics/preview', importUpload.single('file'), controller.previewRubrics);
    api.post('/imports/rubrics/drafts/:draftId/commit', controller.commitRubricSuccessor);
    api.post('/imports/rubrics/:rubricId/activate', controller.activateRubric);
    api.post('/imports/activity-catalogue/files', importUpload.single('file'), controller.uploadActivityCatalogue);
    api.post('/imports/files', importUpload.single('file'), controller.uploadImport);
    api.post('/imports/connectors/:sourceSystemId/runs', controller.runImportConnector);
    api.get('/imports/:batchId', controller.importDetail);
    api.post('/imports/:batchId/records/:recordId/corrections', controller.correctImportRecord);
    api.post('/imports/:batchId/records/:recordId/decisions', controller.decideImportRecord);
    api.post('/imports/:batchId/commit', controller.commitImport);
    api.post('/imports/:batchId/disable', controller.disableImport);
    api.post('/source-systems/:sourceSystemId/disable', controller.disableSourceSystem);
    api.post('/source-systems/:sourceSystemId/enable', controller.enableSourceSystem);
    
    api.get('/activities', controller.activities);
    api.get('/activities/reference-data', controller.activityReferenceData);
    api.get('/activities/approval-candidates', controller.activityApprovalCandidates);
    api.post('/activities', controller.createActivity);
    api.get('/activities/:id', controller.activity);
    api.post('/activities/:id/revisions', controller.reviseActivity);
    api.post('/activities/:id/change-requests', controller.requestActivityChange);
    api.post('/activities/:id/change-requests/:requestId/decision', controller.resolveActivityChange);
    api.post('/activities/:id/withdraw', controller.withdrawActivity);
    api.post('/activities/:id/submit', controller.submitActivity);
    
    api.get('/media-assets', controller.mediaAssets);
    api.post('/media-assets', controller.createMediaAsset);
    api.get('/media-assets/:mediaAssetId', controller.mediaAsset);
    api.post('/media-assets/:mediaAssetId/extractions', controller.requestMediaExtraction);
    api.post('/media-assets/:mediaAssetId/disable', controller.disableMediaAsset);
    api.post('/media-extractions/:extractionId/review', controller.reviewMediaExtraction);
    
    api.get('/response-tasks', controller.responseTasks);
    api.get('/response-tasks/:recipientId', controller.responseTask);
    api.post('/response-tasks/:recipientId/draft', controller.saveResponseDraft);
    api.post('/response-tasks/:recipientId/submit', controller.submitResponse);
    api.get('/assessment-workspace', controller.assessmentWorkspace);
    api.get('/assessment-workspace/:activityId/:studentId', controller.assessmentDetail);
    api.post('/assessment-workspace/:activityId/peer-assignments', controller.assignPeerReview);
    api.post('/assessment-workspace/:activityId/:studentId', controller.submitTeacherAssessment);
    api.post('/assessment-submissions/:submissionId/review', controller.reviewAssessmentSubmission);
    
    api.get('/memorable-activities', controller.memorableActivities);
    api.post('/memorable-activities', controller.saveMemorableActivity);
    api.post('/memorable-activities/:selectionId/submit', controller.submitMemorableActivity);
    
    api.get('/approvals', controller.approvals);
    api.post('/approvals/:id/decision', controller.decideApproval);
    
    api.get('/portfolios', controller.portfolios);
    api.get('/portfolio-editor/:studentId', controller.portfolioEditor);
    api.get('/portfolio-view/:studentId', controller.portfolioView);
    api.get('/portfolios/:studentId', controller.portfolio);
    api.post('/portfolios/:studentId/drafts', controller.createPortfolioDraft);
    api.post('/portfolio-versions/:id/submit', controller.submitPortfolio);
    api.post('/portfolio-versions/:id/review', controller.reviewPortfolio);
    
    api.get('/ai-drafts', controller.aiDrafts);
    api.get('/ai-drafts/:manifestId', controller.aiDraft);
    api.post('/ai-drafts/:manifestId/generations', controller.generateAiDraft);
    api.post('/ai-draft-candidates/:candidateId/decisions', controller.decideAiCandidate);
    api.patch('/learner-narratives/:narrativeId/teacher-edit', controller.editLearnerNarrative);
    
    api.get('/llm-playground/status', controller.llmPlaygroundStatus);
    api.post('/llm-playground/chat', controller.streamLlmPlayground);
    ✓ • 0ms

## Activity

    $ rg -n 'INSERT INTO|UPDATE |DELETE FROM' portfolio-poc-v2/server/services
    ✗ (1) • 0ms

## Activity

    $ ls portfolio-poc-v2/server
        cat portfolio-poc-v2/server/services/assessmentService.js | head -100
        rg -n 'router|app.use|api\.' portfolio-poc-v2/server
        rg -n 'INSERT INTO|UPDATE |DELETE FROM' portfolio-poc-v2/server -i | head -100
    adapters
    controllers
    index.js
    repositories
    routes
    services
    import { randomUUID } from 'node:crypto';
    import { assessmentRepository } from '../repositories/assessmentRepository.js';
    import { activityRepository } from '../repositories/activityRepository.js';
    import { identityRepository } from '../repositories/identityRepository.js';
    import { capabilityDecision, fail, requireCapability, sessionProfile } from './access.js';
    
    function assessmentResource(activity) {
      return {
        school_id: activity.school_id,
        activity_id: activity.activity_id,
        group_id: activity.group_id,
        subject_id: activity.subject_id,
        department_id: activity.department_id,
        programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null,
      };
    }
    
    function requireAssignedAssessor(user, activityId) {
      const activity = assessmentRepository.activity(activityId);
      if (!activity || activity.school_id !== user.school_id) fail(404, 'Assessment activity not found');
      const person = activityRepository.person(activityId, user.user_id);
      if (!person || person.person_type !== 'staff') fail(404, 'Assessment activity not found');
      const decision = requireCapability(user, 'assessment.submit', assessmentResource(activity));
      return { activity, person, decision };
    }
    
    function requireOwnTask(user, recipientId) {
      const task = assessmentRepository.recipient(recipientId);
      if (!task || user.user_type !== 'student' || task.respondent_user_id !== user.user_id) fail(404, 'Response task not found');
      if (task.perspective === 'peer_observation' && !['assigned','submitted','approved','changes_requested'].includes(task.peer_assignment_status)) fail(404, 'Response task not found');
      return task;
    }
    
    function normalizedAnswers(task, input) {
      const supplied = input?.answers && typeof input.answers === 'object' ? input.answers : {};
      return task.questions.map(question => ({
        id: `QR-DEMO-${randomUUID()}`,
        itemKey: question.item_key,
        promptEn: question.prompt_en,
        promptZh: question.prompt_zh,
        value: String(supplied[question.item_key] ?? '').trim(),
      })).filter(answer => answer.value);
    }
    
    export const assessmentService = {
      responseTasks(user) {
        if (user.user_type !== 'student') fail(403, 'Only students have a self and peer response task list');
        return assessmentRepository.tasksForUser(user.user_id);
      },
      responseTask(user, recipientId) {
        return requireOwnTask(user, recipientId);
      },
      saveResponseDraft(user, recipientId, input) {
        const task = requireOwnTask(user, recipientId);
        const latest = task.latestSubmission;
        if (latest && !['draft','changes_requested'].includes(latest.content_status)) fail(400, 'A submitted response is locked. It must be returned before a successor can be edited.');
        const createSubmission = !latest || latest.content_status === 'changes_requested';
        const revisionNumber = latest ? latest.revision_number + (createSubmission ? 1 : 0) : 1;
        const submissionId = createSubmission ? `SUB-DEMO-${randomUUID()}` : latest.assessment_submission_id;
        const savedAt = new Date().toISOString();
        assessmentRepository.saveDraft({
          createSubmission,
          submissionId,
          recipientId,
          revisionNumber,
          supersedesId: createSubmission ? latest?.assessment_submission_id || null : latest?.supersedes_submission_id || null,
          perspective: task.perspective,
          answers: normalizedAnswers(task, input),
          savedAt,
        });
        identityRepository.audit(user.school_id, user.user_id, 'assessment.response.draft_saved', 'assessment_submission', submissionId);
        return assessmentRepository.recipient(recipientId);
      },
      submitResponse(user, recipientId) {
        const task = requireOwnTask(user, recipientId);
        const latest = task.latestSubmission;
        if (!latest || latest.content_status !== 'draft') fail(400, 'Save a draft before submitting');
        const responseMap = new Map(latest.responses.map(item => [item.item_key, item.text_value?.trim()]));
        const missing = task.questions.filter(question => question.required && !responseMap.get(question.item_key));
        if (missing.length) fail(400, 'Complete every required response before submitting', 'REQUIRED_RESPONSES_MISSING', { itemKeys: missing.map(item => item.item_key) });
        const submittedAt = new Date().toISOString();
        assessmentRepository.submit(recipientId, latest.assessment_submission_id, submittedAt);
        identityRepository.audit(user.school_id, user.user_id, 'assessment.response.submitted', 'assessment_submission', latest.assessment_submission_id);
        return assessmentRepository.recipient(recipientId);
      },
      workspace(user) {
        if (!sessionProfile(user).pageAccess.assessments) fail(403, 'Assessment workspace access is not assigned');
        const activities = assessmentRepository.assessmentActivities(user.user_id).filter(activity => capabilityDecision(user, 'assessment.submit', assessmentResource({ ...activity, school_id: user.school_id })).allowed);
        return activities.map(activity => ({ ...activity, participants: assessmentRepository.activityParticipants(activity.activity_id) }));
      },
      detail(user, activityId, studentId) {
        requireAssignedAssessor(user, activityId);
        const participant = activityRepository.person(activityId, studentId);
        if (!participant || participant.relationship_type !== 'participant') fail(404, 'Student assessment record not found');
        const detail = assessmentRepository.assessmentDetail(activityId, studentId);
        if (!detail) fail(404, 'Student assessment record not found');
        return detail;
      },
      reviewSubmission(user, submissionId, input) {
        const context = assessmentRepository.submissionContext(submissionId);
    portfolio-poc-v2/server/routes/api.js:3:import { controller } from '../controllers/api.js';
    portfolio-poc-v2/server/routes/api.js:8:api.get('/session', controller.session);
    portfolio-poc-v2/server/routes/api.js:9:api.get('/reference-data', controller.referenceData);
    portfolio-poc-v2/server/routes/api.js:10:api.get('/staff', controller.staff);
    portfolio-poc-v2/server/routes/api.js:11:api.get('/directory/teachers', controller.teacherDirectory);
    portfolio-poc-v2/server/routes/api.js:12:api.get('/catalogue-labels', controller.catalogueLabels);
    portfolio-poc-v2/server/routes/api.js:13:api.get('/question-bank', controller.questionBank);
    portfolio-poc-v2/server/routes/api.js:14:api.get('/question-blocks', controller.questionBlocks);
    portfolio-poc-v2/server/routes/api.js:15:api.get('/policy', controller.policyWorkspace);
    portfolio-poc-v2/server/routes/api.js:16:api.get('/policy/templates', controller.templatePolicyWorkspace);
    portfolio-poc-v2/server/routes/api.js:17:api.post('/policy/preview', controller.previewPolicy);
    portfolio-poc-v2/server/routes/api.js:18:api.post('/policy/overrides', controller.applyPolicy);
    portfolio-poc-v2/server/routes/api.js:20:api.get('/imports', controller.imports);
    portfolio-poc-v2/server/routes/api.js:21:api.get('/imports/data-operations', controller.dataOperationsInventory);
    portfolio-poc-v2/server/routes/api.js:22:api.get('/imports/data-operations/:domain/export', controller.exportDataOperation);
    portfolio-poc-v2/server/routes/api.js:23:api.get('/imports/activity-catalogue/export', controller.exportActivityCatalogue);
    portfolio-poc-v2/server/routes/api.js:24:api.get('/imports/rubrics', controller.rubrics);
    portfolio-poc-v2/server/routes/api.js:25:api.get('/imports/rubrics/export', controller.exportRubrics);
    portfolio-poc-v2/server/routes/api.js:26:api.get('/imports/rubrics/template', controller.rubricTemplate);
    portfolio-poc-v2/server/routes/api.js:27:api.get('/imports/rubrics/:rubricId', controller.rubricPackage);
    portfolio-poc-v2/server/routes/api.js:28:api.post('/imports/rubrics/preview', importUpload.single('file'), controller.previewRubrics);
    portfolio-poc-v2/server/routes/api.js:29:api.post('/imports/rubrics/drafts/:draftId/commit', controller.commitRubricSuccessor);
    portfolio-poc-v2/server/routes/api.js:30:api.post('/imports/rubrics/:rubricId/activate', controller.activateRubric);
    portfolio-poc-v2/server/routes/api.js:31:api.post('/imports/activity-catalogue/files', importUpload.single('file'), controller.uploadActivityCatalogue);
    portfolio-poc-v2/server/routes/api.js:32:api.post('/imports/files', importUpload.single('file'), controller.uploadImport);
    portfolio-poc-v2/server/routes/api.js:33:api.post('/imports/connectors/:sourceSystemId/runs', controller.runImportConnector);
    portfolio-poc-v2/server/routes/api.js:34:api.get('/imports/:batchId', controller.importDetail);
    portfolio-poc-v2/server/routes/api.js:35:api.post('/imports/:batchId/records/:recordId/corrections', controller.correctImportRecord);
    portfolio-poc-v2/server/routes/api.js:36:api.post('/imports/:batchId/records/:recordId/decisions', controller.decideImportRecord);
    portfolio-poc-v2/server/routes/api.js:37:api.post('/imports/:batchId/commit', controller.commitImport);
    portfolio-poc-v2/server/routes/api.js:38:api.post('/imports/:batchId/disable', controller.disableImport);
    portfolio-poc-v2/server/routes/api.js:39:api.post('/source-systems/:sourceSystemId/disable', controller.disableSourceSystem);
    portfolio-poc-v2/server/routes/api.js:40:api.post('/source-systems/:sourceSystemId/enable', controller.enableSourceSystem);
    portfolio-poc-v2/server/routes/api.js:42:api.get('/activities', controller.activities);
    portfolio-poc-v2/server/routes/api.js:43:api.get('/activities/reference-data', controller.activityReferenceData);
    portfolio-poc-v2/server/routes/api.js:44:api.get('/activities/approval-candidates', controller.activityApprovalCandidates);
    portfolio-poc-v2/server/routes/api.js:45:api.post('/activities', controller.createActivity);
    portfolio-poc-v2/server/routes/api.js:46:api.get('/activities/:id', controller.activity);
    portfolio-poc-v2/server/routes/api.js:47:api.post('/activities/:id/revisions', controller.reviseActivity);
    portfolio-poc-v2/server/routes/api.js:48:api.post('/activities/:id/change-requests', controller.requestActivityChange);
    portfolio-poc-v2/server/routes/api.js:49:api.post('/activities/:id/change-requests/:requestId/decision', controller.resolveActivityChange);
    portfolio-poc-v2/server/routes/api.js:50:api.post('/activities/:id/withdraw', controller.withdrawActivity);
    portfolio-poc-v2/server/routes/api.js:51:api.post('/activities/:id/submit', controller.submitActivity);
    portfolio-poc-v2/server/routes/api.js:53:api.get('/media-assets', controller.mediaAssets);
    portfolio-poc-v2/server/routes/api.js:54:api.post('/media-assets', controller.createMediaAsset);
    portfolio-poc-v2/server/routes/api.js:55:api.get('/media-assets/:mediaAssetId', controller.mediaAsset);
    portfolio-poc-v2/server/routes/api.js:56:api.post('/media-assets/:mediaAssetId/extractions', controller.requestMediaExtraction);
    portfolio-poc-v2/server/routes/api.js:57:api.post('/media-assets/:mediaAssetId/disable', controller.disableMediaAsset);
    portfolio-poc-v2/server/routes/api.js:58:api.post('/media-extractions/:extractionId/review', controller.reviewMediaExtraction);
    portfolio-poc-v2/server/routes/api.js:60:api.get('/response-tasks', controller.responseTasks);
    portfolio-poc-v2/server/routes/api.js:61:api.get('/response-tasks/:recipientId', controller.responseTask);
    portfolio-poc-v2/server/routes/api.js:62:api.post('/response-tasks/:recipientId/draft', controller.saveResponseDraft);
    portfolio-poc-v2/server/routes/api.js:63:api.post('/response-tasks/:recipientId/submit', controller.submitResponse);
    portfolio-poc-v2/server/routes/api.js:64:api.get('/assessment-workspace', controller.assessmentWorkspace);
    portfolio-poc-v2/server/routes/api.js:65:api.get('/assessment-workspace/:activityId/:studentId', controller.assessmentDetail);
    portfolio-poc-v2/server/routes/api.js:66:api.post('/assessment-workspace/:activityId/peer-assignments', controller.assignPeerReview);
    portfolio-poc-v2/server/routes/api.js:67:api.post('/assessment-workspace/:activityId/:studentId', controller.submitTeacherAssessment);
    portfolio-poc-v2/server/routes/api.js:68:api.post('/assessment-submissions/:submissionId/review', controller.reviewAssessmentSubmission);
    portfolio-poc-v2/server/routes/api.js:70:api.get('/memorable-activities', controller.memorableActivities);
    portfolio-poc-v2/server/routes/api.js:71:api.post('/memorable-activities', controller.saveMemorableActivity);
    portfolio-poc-v2/server/routes/api.js:72:api.post('/memorable-activities/:selectionId/submit', controller.submitMemorableActivity);
    portfolio-poc-v2/server/routes/api.js:74:api.get('/approvals', controller.approvals);
    portfolio-poc-v2/server/routes/api.js:75:api.post('/approvals/:id/decision', controller.decideApproval);
    portfolio-poc-v2/server/routes/api.js:77:api.get('/portfolios', controller.portfolios);
    portfolio-poc-v2/server/routes/api.js:78:api.get('/portfolio-editor/:studentId', controller.portfolioEditor);
    portfolio-poc-v2/server/routes/api.js:79:api.get('/portfolio-view/:studentId', controller.portfolioView);
    portfolio-poc-v2/server/routes/api.js:80:api.get('/portfolios/:studentId', controller.portfolio);
    portfolio-poc-v2/server/routes/api.js:81:api.post('/portfolios/:studentId/drafts', controller.createPortfolioDraft);
    portfolio-poc-v2/server/routes/api.js:82:api.post('/portfolio-versions/:id/submit', controller.submitPortfolio);
    portfolio-poc-v2/server/routes/api.js:83:api.post('/portfolio-versions/:id/review', controller.reviewPortfolio);
    portfolio-poc-v2/server/routes/api.js:85:api.get('/ai-drafts', controller.aiDrafts);
    portfolio-poc-v2/server/routes/api.js:86:api.get('/ai-drafts/:manifestId', controller.aiDraft);
    portfolio-poc-v2/server/routes/api.js:87:api.post('/ai-drafts/:manifestId/generations', controller.generateAiDraft);
    portfolio-poc-v2/server/routes/api.js:88:api.post('/ai-draft-candidates/:candidateId/decisions', controller.decideAiCandidate);
    portfolio-poc-v2/server/routes/api.js:89:api.patch('/learner-narratives/:narrativeId/teacher-edit', controller.editLearnerNarrative);
    portfolio-poc-v2/server/routes/api.js:91:api.get('/llm-playground/status', controller.llmPlaygroundStatus);
    portfolio-poc-v2/server/routes/api.js:92:api.post('/llm-playground/chat', controller.streamLlmPlayground);
    portfolio-poc-v2/server/index.js:6:import { api } from './routes/api.js';
    portfolio-poc-v2/server/index.js:12:app.use(express.json({ limit: '96kb' }));
    portfolio-poc-v2/server/index.js:27:app.use('/api/v2', (req, _res, next) => {
    portfolio-poc-v2/server/index.js:44:app.use('/api/v2', api);
    portfolio-poc-v2/server/index.js:45:app.use('/api/v2', (_req, res) => res.status(404).json({ error: 'API route not found', code: 'NOT_FOUND' }));
    portfolio-poc-v2/server/index.js:46:app.use((error, _req, res, _next) => {
    portfolio-poc-v2/server/repositories/rubricRepository.js:59:      sql.run(`INSERT INTO import_batches(import_batch_id,school_id,source_system_id,import_contract_version_id,target_entity_type,ingress_channel,original_file_name,content_type,content_sha256,uploaded_by_user_id,requested_by_user_id,received_at,parsed_at,validated_at,processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, 'SRC-RUBRIC-UPLOAD', 'ICV-RUBRIC-PACKAGE-1', 'rubric_catalogue', 'manual_xlsx', record.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', record.sha256, record.actorId, record.actorId, record.at, record.at, record.at, record.status, 'rubric-xlsx', '1.0', 1, record.status === 'ready' ? 1 : 0, 0, record.errors.length ? 1 : 0, 0, 0, record.actorId, record.at);
    portfolio-poc-v2/server/repositories/rubricRepository.js:60:      sql.run(`INSERT INTO import_records(import_record_id,import_batch_id,row_number,source_record_key,original_payload_json,normalized_payload_json,payload_sha256,identity_status,validation_status,validation_errors_json,validation_warnings_json,resolved_user_id,current_decision,current_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `${record.id}-PACKAGE`, record.id, 1, record.fileName, JSON.stringify({ fileName: record.fileName, sha256: record.sha256 }), JSON.stringify(record.workbook), record.sha256, 'not_applicable', record.status === 'ready' ? 'valid' : 'invalid', JSON.stringify(record.errors), '[]', null, 'included', record.status === 'ready' ? 'ready' : 'needs_resolution', record.at, record.at);
    portfolio-poc-v2/server/repositories/rubricRepository.js:61:      sql.run(`INSERT INTO import_batch_events(import_batch_event_id,import_batch_id,from_status,to_status,event_code,actor_user_id,reason,details_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`, `${record.id}-STAGED`, record.id, null, record.status, 'rubric.import.staged', record.actorId, record.errors.length ? 'Validation failed' : 'Ready to create successor draft', JSON.stringify({ fileName: record.fileName }), record.at);
    portfolio-poc-v2/server/repositories/rubricRepository.js:76:      sql.run(`INSERT INTO rubric_catalogues(rubric_catalogue_id,code,name_en,name_zh,version,labelling_capable,assessment_capable,radar_eligible,level_order_type,definition_completeness,source_reference,status,notes,selection_mode,score_out_of,supersedes_rubric_catalogue_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, c.rubric_catalogue_id, c.code, c.name_en, c.name_zh, c.version, c.labelling_capable, c.assessment_capable, c.radar_eligible, c.level_order_type, c.definition_completeness, c.source_reference, 'draft', c.notes, c.selection_mode, c.score_out_of, record.sourceId);
    portfolio-poc-v2/server/repositories/rubricRepository.js:77:      for (const group of record.groups) sql.run(`INSERT INTO rubric_groups(rubric_group_id,rubric_catalogue_id,group_code,name_en,name_zh,display_order,status,disabled) VALUES(?,?,?,?,?,?,?,?)`, group.rubric_group_id, c.rubric_catalogue_id, group.group_code, group.name_en, group.name_zh, group.display_order, group.status, group.disabled);
    portfolio-poc-v2/server/repositories/rubricRepository.js:78:      for (const skill of record.skills) sql.run(`INSERT INTO rubric_axes(axis_id,rubric_catalogue_id,axis_code,name_en,name_zh,axis_kind,display_order,status,notes,rubric_group_id) VALUES(?,?,?,?,?,?,?,?,?,?)`, skill.axis_id, c.rubric_catalogue_id, skill.axis_code, skill.name_en, skill.name_zh, skill.axis_kind, skill.display_order, skill.status, skill.notes, skill.rubric_group_id);
    portfolio-poc-v2/server/repositories/rubricRepository.js:79:      for (const level of record.levels) sql.run(`INSERT INTO rubric_levels(level_id,rubric_catalogue_id,level_code,level_order,numeric_value,name_en,name_zh,is_prerequisite_chain,status) VALUES(?,?,?,?,?,?,?,?,?)`, level.level_id, c.rubric_catalogue_id, level.level_code, level.level_order, level.numeric_value, level.name_en, level.name_zh, level.is_prerequisite_chain, level.status || 'active');
    portfolio-poc-v2/server/repositories/rubricRepository.js:80:      for (const step of record.steps) sql.run(`INSERT INTO rubric_step_definitions(step_definition_id,rubric_catalogue_id,rubric_group_id,axis_id,level_id,step_number,step_name_en,step_name_zh,definition_en,definition_zh,score_min,score_max,score_out_of,source_reference,status,disabled) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, step.step_definition_id, c.rubric_catalogue_id, step.rubric_group_id, step.axis_id, step.level_id, step.step_number, step.step_name_en, step.step_name_zh, step.definition_en, step.definition_zh, step.score_min, step.score_max, step.score_out_of, step.source_reference, step.status, step.disabled);
    portfolio-poc-v2/server/repositories/rubricRepository.js:82:      sql.run(`INSERT INTO import_record_links(import_record_link_id,import_record_id,entity_type,entity_id,entity_version_id,commit_action,reconciliation_status,committed_by_user_id,committed_at,notes) VALUES(?,?,?,?,?,?,?,?,?,?)`, `${importRecordId}-LINK`, importRecordId, 'rubric_catalogue', c.rubric_catalogue_id, c.rubric_catalogue_id, 'successor_created', 'current', record.actorId || c.activated_by_user_id || null, record.at, `Successor of ${record.sourceId}`);
    portfolio-poc-v2/server/repositories/rubricRepository.js:83:      sql.run(`UPDATE import_records SET current_status='committed',updated_at=? WHERE import_record_id=?`, record.at, importRecordId);
    portfolio-poc-v2/server/repositories/rubricRepository.js:84:      sql.run(`UPDATE import_batches SET processing_status='committed',committed_at=?,committed_by_user_id=COALESCE(?,uploaded_by_user_id),committed_rows=1,updated_at=? WHERE import_batch_id=?`, record.at, record.actorId || null, record.at, record.draftId);
    portfolio-poc-v2/server/repositories/rubricRepository.js:89:      sql.run(`UPDATE school_rubric_assignments SET status='superseded',effective_until=? WHERE school_id=? AND purpose='assessment_rubric' AND scope_type=? AND scope_id=? AND status='active'`, record.effectiveFrom, record.schoolId, record.scopeType, record.scopeId);
    portfolio-poc-v2/server/repositories/rubricRepository.js:90:      sql.run(`INSERT INTO school_rubric_assignments(school_rubric_assignment_id,school_id,purpose,rubric_catalogue_id,scope_type,scope_id,effective_from,effective_until,status,assigned_by_user_id,assigned_at,reason) VALUES(?,?,'assessment_rubric',?,?,?,?,?,'active',?,?,?)`, record.id, record.schoolId, record.rubricCatalogueId, record.scopeType, record.scopeId, record.effectiveFrom, record.effectiveUntil, record.actorId, record.assignedAt, record.reason);
    portfolio-poc-v2/server/repositories/rubricRepository.js:91:      sql.run(`UPDATE rubric_catalogues SET status='active',activated_by_user_id=?,activated_at=? WHERE rubric_catalogue_id=?`, record.actorId, record.assignedAt, record.rubricCatalogueId);
    portfolio-poc-v2/server/repositories/seed.js:111:  sql.run(`UPDATE rubric_catalogues AS catalogue SET definition_source_id=(SELECT source.definition_source_id FROM definition_sources source WHERE source.school_id='BHSS' AND source.source_reference=catalogue.source_reference AND source.status='active' ORDER BY source.uploaded_at DESC LIMIT 1) WHERE catalogue.definition_source_id IS NULL`);
    portfolio-poc-v2/server/repositories/seed.js:192:  sql.run(`UPDATE definition_sources SET content_sha256=? WHERE definition_source_id='DS-QUESTION-BANK-SUPPLIED'`, questionBank.sourceSha256);
    portfolio-poc-v2/server/repositories/seed.js:213:  sql.run(`UPDATE source_systems SET source_purpose='media_and_data_import',connector_type='approved_json_api',status='active',import_status='active',endpoint_env_key='TIME_INFINITY_ROSTER_BASE_URL',authentication_profile_ref='TIME_INFINITY_API_KEY',updated_by_user_id='USR-ADM-001',updated_at=? WHERE source_system_id='SRC-TIME-INFINITY'`, seededAt);
    portfolio-poc-v2/server/repositories/seed.js:248:      sql.run('INSERT INTO schools(school_id,name_en,name_zh,status) VALUES(?,?,?,?)', 'BHSS', 'BHSS demonstration school', 'BHSS 示範學校', 'active');
    portfolio-poc-v2/server/repositories/seed.js:253:        sql.run('INSERT INTO student_class_memberships VALUES(?,?,?,?,?,?,?,?)', `SCM-${studentId}`, studentId, 'BHSS', 'S1A-2026-27', '2026-27-P1', '2026-09-01', '2027-08-31', 'active');
    portfolio-poc-v2/server/repositories/seed.js:255:      sql.run('INSERT INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_user_id,published_at,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', 'PSNAP-S1-P1-v1', 'BHSS', 'USR-S-001', '2026-27-P1', 'PWV-S1-001', 1, 'published', 'USR-ST-001', '2026-12-20T15:00:00+08:00', 'RUB-SB-UF2', 'PTPLV-NEUTRAL-CORE-1', 'a48c14c78e608ec84498177501a4a94f7ef6dfe43f667c810c0a1cf96048215c');
    portfolio-poc-v2/server/repositories/seed.js:292:    for (const [groupId, axisId] of axisGroups) sql.run('UPDATE rubric_axes SET rubric_group_id=? WHERE axis_id=?', groupId, axisId);
    portfolio-poc-v2/server/repositories/seed.js:293:    sql.run(`UPDATE activities SET resolved_period_id=(
    portfolio-poc-v2/server/repositories/seed.js:362:    sql.run(`UPDATE portfolio_working_versions SET rubric_catalogue_id='RUB-SB-UF2' WHERE rubric_catalogue_id IS NULL`);
    portfolio-poc-v2/server/repositories/seed.js:363:    sql.run(`UPDATE portfolio_snapshots SET rubric_catalogue_id='RUB-SB-UF2' WHERE rubric_catalogue_id IS NULL`);
    portfolio-poc-v2/server/repositories/activityRepository.js:136:        sql.run(`INSERT INTO form_versions(form_template_id,form_version_id,name_en,name_zh,version_number,supersedes_form_version_id,review_status,publication_status,visibility_scope,is_system_default,respondent_roles,notes)
    portfolio-poc-v2/server/repositories/activityRepository.js:139:        sql.run(`INSERT INTO question_blocks(question_block_id,school_id,block_code,name_en,name_zh,latest_version_id,current_published_version_id,operational_status,created_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, blockId, activity.schoolId, `${formDraft.templateId}:student_reflection`, `${formDraft.nameEn}: Student Reflection`, `${formDraft.nameZh}：學生反思`, blockVersionId, null, 'active', revision.ownerId, activity.createdAt, activity.createdAt);
    portfolio-poc-v2/server/repositories/activityRepository.js:140:        sql.run(`INSERT INTO question_block_versions(question_block_version_id,question_block_id,version_number,name_en,name_zh,respondent_role_code,review_status,publication_status,created_by_user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, blockVersionId, blockId, 1, `${formDraft.nameEn}: Student Reflection`, `${formDraft.nameZh}：學生反思`, 'ROLE-STUDENT', 'draft', 'unpublished', revision.ownerId, activity.createdAt);
    portfolio-poc-v2/server/repositories/activityRepository.js:141:        sql.run(`INSERT INTO form_version_blocks VALUES(?,?,?)`, formDraft.id, blockVersionId, 1);
    portfolio-poc-v2/server/repositories/activityRepository.js:142:        for (const [index, question] of formDraft.questions.entries()) sql.run(`INSERT INTO question_block_items(question_block_item_id,question_block_version_id,display_order,item_key,source_question_block_item_id,question_id,question_version_id,required,item_type,prompt_en,prompt_zh,respondent_role_code,answer_scale,ability_code,ability_name_en,ability_name_zh,proof_intent) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `${blockVersionId}-ITEM-${index + 1}`, blockVersionId, index + 1, question.itemKey, question.sourceQuestionBlockItemId || null, question.questionId || null, question.questionVersionId || null, question.required ? 1 : 0, 'free_text', question.promptEn, question.promptZh, 'ROLE-STUDENT', 'text', question.abilityCode || null, question.abilityNameEn || null, question.abilityNameZh || null, 'Teacher-curated question; accepted response becomes proof and requires later rubric-time interpretation');
    portfolio-poc-v2/server/repositories/activityRepository.js:144:      sql.run(`INSERT INTO activities(activity_id,school_id,group_id,created_by_user_id,latest_revision_id,current_approved_revision_id,operational_status,resolved_period_id,period_resolution_status,period_resolved_at,created_at,updated_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:146:      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
    portfolio-poc-v2/server/repositories/activityRepository.js:148:      sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,role_assignment_id,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:150:      for (const participant of participants) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,planned_attendance_status,attendance_approval_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:152:      for (const staff of supportingStaff) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,group_code,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:154:      for (const label of labelAssignments) sql.run(`INSERT INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, label.id, activity.id, revision.id, label.catalogueId, label.axisId, label.catalogueVersion, label.labelRole, 'teacher_selected', label.rationale || 'Activity intention selected at creation', 'pending_review', owner.userId, activity.createdAt, 'active');
    portfolio-poc-v2/server/repositories/activityRepository.js:155:      for (const flag of riskFlags) sql.run(`INSERT INTO activity_revision_risk_flags VALUES(?,?)`, revision.id, flag);
    portfolio-poc-v2/server/repositories/activityRepository.js:160:      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
    portfolio-poc-v2/server/repositories/activityRepository.js:162:      sql.run(`INSERT INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) SELECT ('ALA-' || ? || '-' || axis_id || '-' || label_role),activity_id,?,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,'pending_review',?,?,status FROM activity_label_assignments WHERE activity_revision_id=? AND status='active'`, revision.id, revision.id, revision.createdBy, updatedAt, revision.supersedesId);
    portfolio-poc-v2/server/repositories/activityRepository.js:163:      sql.run(`INSERT INTO activity_revision_risk_flags SELECT ?,flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=?`, revision.id, revision.supersedesId);
    portfolio-poc-v2/server/repositories/activityRepository.js:164:      sql.run('UPDATE activities SET latest_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revision.id, 'draft', updatedAt, revision.activityId);
    portfolio-poc-v2/server/repositories/activityRepository.js:168:    sql.run(`INSERT INTO activity_change_requests(activity_change_request_id,school_id,activity_id,base_revision_id,requested_by_user_id,target_owner_user_id,field_key,current_value,proposed_value,reason,status,requested_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:173:    sql.run(`UPDATE activity_change_requests SET status=?,resolved_by_user_id=?,resolution_note=?,resulting_revision_id=?,resolved_at=? WHERE activity_change_request_id=? AND status='open'`, status, actorId, note, resultingRevisionId || null, resolvedAt, requestId);
    portfolio-poc-v2/server/repositories/activityRepository.js:176:    sql.run(`UPDATE activity_revisions SET approval_status='pending_review',submitted_at=?,requested_publisher_user_id=? WHERE activity_revision_id=?`, submittedAt, publisherId, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:180:      sql.run(`UPDATE activity_revisions SET approval_status='withdrawn' WHERE activity_revision_id=? AND approval_status='pending_review'`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:181:      sql.run(`UPDATE approval_assignments SET status='withdrawn' WHERE target_version_id=? AND status IN ('assigned','in_review')`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:183:      if (revision) sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, withdrawnAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:188:    sql.run('UPDATE activity_revisions SET approval_status=?,approved_by_user_id=?,approved_at=? WHERE activity_revision_id=?', status, outcome === 'approved' ? actorId : null, outcome === 'approved' ? decidedAt : null, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:192:      sql.run(`UPDATE activity_label_assignments SET approval_state='approved' WHERE activity_revision_id=?`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:193:      sql.run('UPDATE activities SET current_approved_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revisionId, 'approved', decidedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:194:    } else sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, decidedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:200:      sql.run(`UPDATE activity_revisions SET publication_status='published' WHERE activity_revision_id=? AND approval_status='approved'`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:201:      sql.run(`UPDATE activities SET operational_status='scheduled',updated_at=? WHERE activity_id=?`, publishedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/identityRepository.js:112:    sql.run(`INSERT INTO capability_policy_overrides(capability_policy_override_id,school_id,target_type,target_id,capability_id,effect,scope_type,scope_id,effective_from,effective_until,reason,configured_by_user_id,configured_at,status)
    portfolio-poc-v2/server/repositories/identityRepository.js:117:    sql.run('INSERT INTO audit_events(school_id,actor_user_id,action_code,entity_type,entity_id,reason,occurred_at) VALUES(?,?,?,?,?,?,?)', schoolId, actorId, action, entityType, entityId, reason, new Date().toISOString());
    portfolio-poc-v2/server/repositories/aiRepository.js:33:    sql.run(`INSERT INTO ai_draft_candidates(candidate_id,manifest_id,provider,model,prompt_version,generated_text_en,generated_text_zh,source_refs_json,review_status,created_by_user_id,created_at)
    portfolio-poc-v2/server/repositories/aiRepository.js:39:      sql.run(`INSERT INTO ai_candidate_decisions(decision_id,candidate_id,outcome,reason,decided_by_user_id,decided_at) VALUES(?,?,?,?,?,?)`, record.id, record.candidateId, record.outcome, record.reason, record.actorId, record.decidedAt);
    portfolio-poc-v2/server/repositories/aiRepository.js:40:      sql.run('UPDATE ai_draft_candidates SET review_status=? WHERE candidate_id=?', record.outcome, record.candidateId);
    portfolio-poc-v2/server/repositories/aiRepository.js:50:    sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review'
    portfolio-poc-v2/server/repositories/mediaRepository.js:60:      sql.run(`INSERT INTO media_assets(media_asset_id,school_id,owner_user_id,uploaded_by_user_id,uploaded_at,title,original_file_name,media_type,mime_type,source_system_id,external_media_reference_id,storage_reference,checksum_sha256,consent_status,visibility,moderation_status,processing_status,captured_at,retention_review_date,operational_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.ownerId, record.actorId, record.createdAt, record.title, record.originalFileName, record.mediaType, record.mimeType, record.mediaSourceId, record.externalReferenceId, record.storageReference, record.checksum, record.consentStatus, record.visibility, 'pending', 'registered', record.capturedAt, record.retentionReviewDate, 'active', record.createdAt);
    portfolio-poc-v2/server/repositories/mediaRepository.js:61:      sql.run(`INSERT INTO activity_media VALUES(?,?,?,?,?,?,?)`, record.activityMediaId, record.activityId, record.id, record.relationshipType, record.actorId, record.createdAt, 'active');
    portfolio-poc-v2/server/repositories/mediaRepository.js:62:      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, record.lifecycleId, record.schoolId, 'media_asset', record.id, 'created', null, 'active', record.reason, record.actorId, record.createdAt);
    portfolio-poc-v2/server/repositories/mediaRepository.js:66:    sql.run(`INSERT INTO media_extractions(media_extraction_id,media_asset_id,extraction_type,provider_key,provider_version,processing_status,requested_by_user_id,requested_at,review_status,supersedes_media_extraction_id) VALUES(?,?,?,?,?,?,?,?,?,?)`, record.id, record.mediaAssetId, record.extractionType, record.providerKey, record.providerVersion, 'queued', record.actorId, record.createdAt, 'not_ready', record.supersedesId);
    portfolio-poc-v2/server/repositories/mediaRepository.js:70:    sql.run(`UPDATE media_extractions SET review_status=?,reviewed_by_user_id=?,reviewed_at=?,review_reason=?,corrected_content_text=? WHERE media_extraction_id=?`, input.outcome, actorId, reviewedAt, input.reason, input.correctedContentText || null, extractionId);
    portfolio-poc-v2/server/repositories/mediaRepository.js:75:      sql.run(`UPDATE media_assets SET operational_status='disabled',disabled_reason=?,disabled_by_user_id=?,disabled_at=?,updated_by_user_id=?,updated_at=? WHERE media_asset_id=?`, reason, actorId, disabledAt, actorId, disabledAt, mediaAssetId);
    portfolio-poc-v2/server/repositories/mediaRepository.js:76:      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, `MLE-${randomUUID()}`, asset.school_id, 'media_asset', mediaAssetId, 'disabled', asset.operational_status || null, 'disabled', reason, actorId, disabledAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:67:        sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, record.perspective, 'draft', 'not_processed', 'unpublished', null, null, null, null, record.savedAt, record.savedAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:69:        sql.run(`UPDATE assessment_submissions SET updated_at=? WHERE assessment_submission_id=?`, record.savedAt, record.submissionId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:72:        sql.run(`INSERT INTO question_responses(question_response_id,assessment_submission_id,item_key,prompt_en,prompt_zh,text_value,raw_numeric_value,authorship_origin,created_at,updated_at)
    portfolio-poc-v2/server/repositories/assessmentRepository.js:74:          ON CONFLICT(assessment_submission_id,item_key) DO UPDATE SET text_value=excluded.text_value,updated_at=excluded.updated_at`,
    portfolio-poc-v2/server/repositories/assessmentRepository.js:77:      sql.run(`UPDATE assignment_recipients SET status='draft' WHERE assignment_recipient_id=?`, record.recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:82:      sql.run(`UPDATE assessment_submissions SET content_status='submitted',processing_status='pending_review',submitted_at=?,updated_at=? WHERE assessment_submission_id=? AND content_status='draft'`, submittedAt, submittedAt, submissionId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:83:      sql.run(`UPDATE assignment_recipients SET status='submitted' WHERE assignment_recipient_id=?`, recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:92:      sql.run(`UPDATE assessment_submissions SET content_status=?,processing_status=?,reviewed_by_user_id=?,reviewed_at=?,review_reason=?,updated_at=? WHERE assessment_submission_id=?`,
    portfolio-poc-v2/server/repositories/assessmentRepository.js:94:      sql.run(`UPDATE assignment_recipients SET status=? WHERE assignment_recipient_id=?`, outcome, recipientRow.assignment_recipient_id);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:179:    sql.run(`INSERT INTO assignment_recipients(assignment_recipient_id,assessment_assignment_id,respondent_user_id,subject_user_id,reviewer_user_id,perspective,status,created_at,assigned_by_user_id,assigner_role_assignment_id,due_at,moderation_required,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.recipientId, record.assignmentId, record.reviewerId, record.subjectId, record.actorId, 'peer_observation', 'not_submitted', record.createdAt, record.actorId, record.roleAssignmentId, record.dueAt, 1, record.notes);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:183:      sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, 'teacher_observation', 'approved', 'accepted', 'unpublished', record.createdAt, record.actorId, record.createdAt, record.reviewReason, record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:184:      for (const answer of record.answers) sql.run(`INSERT INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, answer.id, record.submissionId, answer.itemKey, answer.promptEn, answer.promptZh, answer.value, null, 'human_authored', record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:185:      sql.run(`UPDATE assignment_recipients SET status='approved' WHERE assignment_recipient_id=?`, record.recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:186:      sql.run(`INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.feedbackId, record.activityId, record.studentId, record.actorId, record.submissionId, 'teacher_assessment', record.overallComment, record.createdAt, 'teacher_observation', 'confirmed', 'unpublished', record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:190:        sql.run(`INSERT INTO proof_links(proof_link_id,proof_item_id,target_entity_type,target_entity_id,support_role,linked_by_user_id,linked_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)`, `PL-${evidence.id}-FDB`, proofItemId, 'feedback', record.feedbackId, evidence.type, record.actorId, record.createdAt, 'active', evidence.text);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:194:        sql.run(`INSERT INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, observation.id, record.feedbackId, observation.axisId, observation.step, observation.consistency, observation.comment, observation.nextStep, 'confirmed', 1, 0, null, null, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:195:        for (const evidence of record.evidence) sql.run(`INSERT INTO proof_links(proof_link_id,proof_item_id,target_entity_type,target_entity_id,support_role,linked_by_user_id,linked_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)`, `PL-${evidence.id}-${observation.id}`, evidence.proofItemId || `PRF-${evidence.id}`, 'framework_observation', observation.id, 'supports_condition', record.actorId, record.createdAt, 'active', evidence.text);
    portfolio-poc-v2/server/repositories/memorableRepository.js:29:      sql.run(`UPDATE proud_moment_selections SET selection_reason=?,selected_label_codes=?,submission_status='draft',publication_status='unpublished' WHERE selection_id=?`, record.reason, record.labelCodes, existing.selection_id);
    portfolio-poc-v2/server/repositories/memorableRepository.js:32:    sql.run(`INSERT INTO proud_moment_selections VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.studentId, record.academicYear, record.periodId, 'activity', record.activityId, null, record.reason, record.labelCodes, 'draft', 'unpublished', null, null, 0, 'Student-authored curation; no automatic rubric effect.');
    portfolio-poc-v2/server/repositories/memorableRepository.js:35:  submit(selectionId) { sql.run(`UPDATE proud_moment_selections SET submission_status='submitted' WHERE selection_id=? AND submission_status='draft'`, selectionId); },
    portfolio-poc-v2/server/repositories/portfolioRepository.js:31:      sql.run('UPDATE portfolio_working_versions SET is_student_latest=0 WHERE student_user_id=? AND period_id=?', record.studentId, record.periodId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:32:      sql.run(`INSERT INTO portfolio_working_versions(portfolio_working_version_id,school_id,student_user_id,period_id,version_number,supersedes_version_id,status,created_by_user_id,created_at,is_student_latest,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256)
    portfolio-poc-v2/server/repositories/portfolioRepository.js:34:      for (const item of record.items) sql.run(`INSERT INTO portfolio_version_items(portfolio_version_item_id,portfolio_working_version_id,section_key,source_type,source_id,student_selected,class_teacher_decision,display_order,authorship_origin,student_text)
    portfolio-poc-v2/server/repositories/portfolioRepository.js:38:  submit(versionId, submittedAt) { sql.run(`UPDATE portfolio_working_versions SET status='student_submitted',student_submitted_at=? WHERE portfolio_working_version_id=?`, submittedAt, versionId); },
    portfolio-poc-v2/server/repositories/portfolioRepository.js:41:      for (const decision of record.decisions) sql.run('UPDATE portfolio_version_items SET class_teacher_decision=?,decision_reason=?,decided_by_user_id=?,decided_at=? WHERE portfolio_version_item_id=? AND portfolio_working_version_id=?', decision.decision, decision.reason, record.actorId, record.reviewedAt, decision.itemId, record.versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:42:      if (record.narrativeId && record.narrativeText) sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review' WHERE learner_narrative_version_id=?`, record.narrativeText, record.actorId, record.narrativeReason, record.narrativeId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:43:      sql.run(`UPDATE portfolio_working_versions SET status='staff_review',class_teacher_user_id=?,class_teacher_reviewed_at=? WHERE portfolio_working_version_id=?`, record.actorId, record.reviewedAt, record.versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:46:  approve(versionId, actorId, approvedAt) { sql.run(`UPDATE portfolio_working_versions SET status='approved',approved_by_user_id=?,approved_at=? WHERE portfolio_working_version_id=?`, actorId, approvedAt, versionId); },
    portfolio-poc-v2/server/repositories/portfolioRepository.js:52:      sql.run(`UPDATE portfolio_working_versions SET status='published',published_snapshot_id=? WHERE portfolio_working_version_id=?`, snapshotId, versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:53:      if (version.narrative) sql.run(`UPDATE learner_narrative_versions SET final_approved_text=COALESCE(teacher_edited_text,generated_text),approval_status='approved',approved_by_user_id=?,approved_at=? WHERE learner_narrative_version_id=?`, actorId, publishedAt, version.narrative.learner_narrative_version_id);
    portfolio-poc-v2/server/repositories/importRepository.js:68:      sql.run(`INSERT INTO import_batches(import_batch_id,external_batch_key,school_id,source_system_id,import_contract_version_id,target_entity_type,target_entity_id,source_parent_key,ingress_channel,source_relative_path,original_file_name,content_type,content_sha256,source_uploaded_at,uploaded_by_user_id,requested_by_user_id,service_actor_id,received_at,parsed_at,validated_at,processing_status,declared_processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,supersedes_import_batch_id,updated_by_user_id,updated_at)
    portfolio-poc-v2/server/repositories/importRepository.js:71:      for (const record of records) sql.run(`INSERT INTO import_records(import_record_id,import_batch_id,row_number,source_record_key,original_payload_json,normalized_payload_json,payload_sha256,identity_status,validation_status,validation_errors_json,validation_warnings_json,resolved_user_id,current_decision,current_status,supersedes_import_record_id,created_at,updated_at)
    portfolio-poc-v2/server/repositories/importRepository.js:73:      sql.run(`INSERT INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, event.id, batch.id, null, batch.status, event.code, event.actorId || null, event.reason, JSON.stringify(event.details || {}), event.at);
    portfolio-poc-v2/server/repositories/importRepository.js:82:      sql.run(`INSERT INTO import_record_corrections VALUES(?,?,?,?,?,?,?,?,?,?)`, correction.id, record.importRecordId, correction.fieldName, correction.beforeValue, correction.afterValue, correction.originalStudentId, correction.resolvedStudentId, correction.reason, correction.actorId, correction.at);
    portfolio-poc-v2/server/repositories/importRepository.js:83:      sql.run(`UPDATE import_records SET normalized_payload_json=?,payload_sha256=?,identity_status=?,validation_status=?,validation_errors_json=?,validation_warnings_json=?,resolved_user_id=?,current_status=?,updated_at=? WHERE import_record_id=?`, JSON.stringify(record.normalizedPayload), record.hash, record.identityStatus, record.validationStatus, JSON.stringify(record.errors), JSON.stringify(record.warnings), record.resolvedUserId || null, record.validationStatus === 'valid' ? 'ready' : 'needs_resolution', correction.at, record.importRecordId);
    ✓ • 0ms

## Activity

    $ rg -c '^api\.(get|post|patch|put|delete)' portfolio-poc-v2/server/routes/api.js
        rg '^api\.' portfolio-poc-v2/server/routes/api.js | awk -F. '{print $2}' | cut -d'(' -f1 | sort | uniq -c
        rg -n 'feedback|question_responses|proof_items' portfolio-poc-v2/server/repositories/assessmentRepository.js | tail -20
    76
      37 get
       1 patch
      38 post
    24:  return { ...row, responses: sql.all('SELECT * FROM question_responses WHERE assessment_submission_id=? ORDER BY item_key', submissionId) };
    72:        sql.run(`INSERT INTO question_responses(question_response_id,assessment_submission_id,item_key,prompt_en,prompt_zh,text_value,raw_numeric_value,authorship_origin,created_at,updated_at)
    96:        const answers = sql.all('SELECT * FROM question_responses WHERE assessment_submission_id=?', submissionId);
    99:          sql.run(`INSERT OR IGNORE INTO proof_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofId, 'PT-RESPONSE', recipientRow.subject_user_id, recipientRow.activity_id, 'question_response', answer.question_response_id, recipientRow.perspective, answer.text_value || 'Accepted response', reviewedAt, recipientRow.respondent_user_id, 'source_linked', 'accepted', 'reviewers_only', reviewedAt, null);
    159:      FROM feedback f LEFT JOIN framework_observations o ON o.feedback_id=f.feedback_id
    184:      for (const answer of record.answers) sql.run(`INSERT INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, answer.id, record.submissionId, answer.itemKey, answer.promptEn, answer.promptZh, answer.value, null, 'human_authored', record.createdAt, record.createdAt);
    186:      sql.run(`INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.feedbackId, record.activityId, record.studentId, record.actorId, record.submissionId, 'teacher_assessment', record.overallComment, record.createdAt, 'teacher_observation', 'confirmed', 'unpublished', record.createdAt, record.createdAt);
    189:        sql.run(`INSERT OR IGNORE INTO proof_items(proof_item_id,proof_type_id,student_id,activity_id,source_entity_type,source_entity_id,perspective,summary,occurred_at,submitted_by_user_id,provenance_status,review_status,visibility_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofItemId, evidence.type, record.studentId, record.activityId, evidence.submissionId ? 'assessment_submission' : 'feedback', evidence.submissionId || record.feedbackId, 'teacher_observation', evidence.text, record.createdAt, record.actorId, 'source_linked', 'accepted', 'reviewers_only', record.createdAt);
    190:        sql.run(`INSERT INTO proof_links(proof_link_id,proof_item_id,target_entity_type,target_entity_id,support_role,linked_by_user_id,linked_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)`, `PL-${evidence.id}-FDB`, proofItemId, 'feedback', record.feedbackId, evidence.type, record.actorId, record.createdAt, 'active', evidence.text);
    194:        sql.run(`INSERT INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, observation.id, record.feedbackId, observation.axisId, observation.step, observation.consistency, observation.comment, observation.nextStep, 'confirmed', 1, 0, null, null, record.createdAt);
    ✓ • 0ms

## Assistant

Assuming you mean **`portfolio-poc-v2`**, it defines **76 API endpoints** under `/api/v2`: 37 GET, 38 POST and 1 PATCH. That counts method-and-path combinations; some POST endpoints preview or run operations rather than saving records. See the [route list](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/routes/api.js:8).

I found several APIs that write to multiple tables, but I **cannot yet confirm a complete list of unrelated duplicate records**. Writing to two tables alone does not establish duplication: the tables may hold a parent and child, an audit event, a source record and proof, or a version snapshot.

The clearest cases I checked are connected:

- `POST /response-tasks/:recipientId/draft` writes `assessment_submissions`, `question_responses`, and the recipient status. Responses reference the submission. [Repository](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/assessmentRepository.js:67)
- `POST /assessment-submissions/:submissionId/review` can create `proof_items` from accepted answers. Each proof item records the source question-response ID; its summary repeats the answer text, so this is a **linked copy**, though it may still need a synchronization policy. [Repository](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/assessmentRepository.js:92)
- `POST /assessment-workspace/:activityId/:studentId` writes submissions, responses, feedback, proof and observations. The implementation records submission, feedback and proof links between them. [Repository](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/assessmentRepository.js:183)
- `POST /media-assets` writes a media asset, an activity-media link and a lifecycle event. The link contains the media asset ID. [Repository](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/mediaRepository.js:60)

The endpoint count is complete for the route file. The duplication finding is **preliminary**: determining whether any API creates unlinked duplicates requires tracing all write paths and comparing their fields and schema relationships.

## User

confirm first and give me a clear tabled result

## Assistant

I’ll check the write paths and their stored links against the schema, then give you a table distinguishing confirmed duplication from related multi-table writes.

## Activity

    $ rg -n 'INSERT INTO|INSERT OR IGNORE INTO|UPDATE ' portfolio-poc-v2/server/repositories/assessmentRepository.js portfolio-poc-v2/server/repositories/activityRepository.js portfolio-poc-v2/server/repositories/aiRepository.js portfolio-poc-v2/server/repositories/portfolioRepository.js
    portfolio-poc-v2/server/repositories/aiRepository.js:33:    sql.run(`INSERT INTO ai_draft_candidates(candidate_id,manifest_id,provider,model,prompt_version,generated_text_en,generated_text_zh,source_refs_json,review_status,created_by_user_id,created_at)
    portfolio-poc-v2/server/repositories/aiRepository.js:39:      sql.run(`INSERT INTO ai_candidate_decisions(decision_id,candidate_id,outcome,reason,decided_by_user_id,decided_at) VALUES(?,?,?,?,?,?)`, record.id, record.candidateId, record.outcome, record.reason, record.actorId, record.decidedAt);
    portfolio-poc-v2/server/repositories/aiRepository.js:40:      sql.run('UPDATE ai_draft_candidates SET review_status=? WHERE candidate_id=?', record.outcome, record.candidateId);
    portfolio-poc-v2/server/repositories/aiRepository.js:50:    sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review'
    portfolio-poc-v2/server/repositories/portfolioRepository.js:31:      sql.run('UPDATE portfolio_working_versions SET is_student_latest=0 WHERE student_user_id=? AND period_id=?', record.studentId, record.periodId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:32:      sql.run(`INSERT INTO portfolio_working_versions(portfolio_working_version_id,school_id,student_user_id,period_id,version_number,supersedes_version_id,status,created_by_user_id,created_at,is_student_latest,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256)
    portfolio-poc-v2/server/repositories/portfolioRepository.js:34:      for (const item of record.items) sql.run(`INSERT INTO portfolio_version_items(portfolio_version_item_id,portfolio_working_version_id,section_key,source_type,source_id,student_selected,class_teacher_decision,display_order,authorship_origin,student_text)
    portfolio-poc-v2/server/repositories/portfolioRepository.js:38:  submit(versionId, submittedAt) { sql.run(`UPDATE portfolio_working_versions SET status='student_submitted',student_submitted_at=? WHERE portfolio_working_version_id=?`, submittedAt, versionId); },
    portfolio-poc-v2/server/repositories/portfolioRepository.js:41:      for (const decision of record.decisions) sql.run('UPDATE portfolio_version_items SET class_teacher_decision=?,decision_reason=?,decided_by_user_id=?,decided_at=? WHERE portfolio_version_item_id=? AND portfolio_working_version_id=?', decision.decision, decision.reason, record.actorId, record.reviewedAt, decision.itemId, record.versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:42:      if (record.narrativeId && record.narrativeText) sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review' WHERE learner_narrative_version_id=?`, record.narrativeText, record.actorId, record.narrativeReason, record.narrativeId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:43:      sql.run(`UPDATE portfolio_working_versions SET status='staff_review',class_teacher_user_id=?,class_teacher_reviewed_at=? WHERE portfolio_working_version_id=?`, record.actorId, record.reviewedAt, record.versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:46:  approve(versionId, actorId, approvedAt) { sql.run(`UPDATE portfolio_working_versions SET status='approved',approved_by_user_id=?,approved_at=? WHERE portfolio_working_version_id=?`, actorId, approvedAt, versionId); },
    portfolio-poc-v2/server/repositories/portfolioRepository.js:51:      sql.run(`INSERT OR IGNORE INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_user_id,published_at,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, snapshotId, version.school_id, version.student_user_id, version.period_id, versionId, version.version_number, 'published', actorId, publishedAt, version.rubric_catalogue_id, version.portfolio_template_version_id, version.template_manifest_sha256);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:52:      sql.run(`UPDATE portfolio_working_versions SET status='published',published_snapshot_id=? WHERE portfolio_working_version_id=?`, snapshotId, versionId);
    portfolio-poc-v2/server/repositories/portfolioRepository.js:53:      if (version.narrative) sql.run(`UPDATE learner_narrative_versions SET final_approved_text=COALESCE(teacher_edited_text,generated_text),approval_status='approved',approved_by_user_id=?,approved_at=? WHERE learner_narrative_version_id=?`, actorId, publishedAt, version.narrative.learner_narrative_version_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:136:        sql.run(`INSERT INTO form_versions(form_template_id,form_version_id,name_en,name_zh,version_number,supersedes_form_version_id,review_status,publication_status,visibility_scope,is_system_default,respondent_roles,notes)
    portfolio-poc-v2/server/repositories/activityRepository.js:139:        sql.run(`INSERT INTO question_blocks(question_block_id,school_id,block_code,name_en,name_zh,latest_version_id,current_published_version_id,operational_status,created_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, blockId, activity.schoolId, `${formDraft.templateId}:student_reflection`, `${formDraft.nameEn}: Student Reflection`, `${formDraft.nameZh}：學生反思`, blockVersionId, null, 'active', revision.ownerId, activity.createdAt, activity.createdAt);
    portfolio-poc-v2/server/repositories/activityRepository.js:140:        sql.run(`INSERT INTO question_block_versions(question_block_version_id,question_block_id,version_number,name_en,name_zh,respondent_role_code,review_status,publication_status,created_by_user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, blockVersionId, blockId, 1, `${formDraft.nameEn}: Student Reflection`, `${formDraft.nameZh}：學生反思`, 'ROLE-STUDENT', 'draft', 'unpublished', revision.ownerId, activity.createdAt);
    portfolio-poc-v2/server/repositories/activityRepository.js:141:        sql.run(`INSERT INTO form_version_blocks VALUES(?,?,?)`, formDraft.id, blockVersionId, 1);
    portfolio-poc-v2/server/repositories/activityRepository.js:142:        for (const [index, question] of formDraft.questions.entries()) sql.run(`INSERT INTO question_block_items(question_block_item_id,question_block_version_id,display_order,item_key,source_question_block_item_id,question_id,question_version_id,required,item_type,prompt_en,prompt_zh,respondent_role_code,answer_scale,ability_code,ability_name_en,ability_name_zh,proof_intent) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `${blockVersionId}-ITEM-${index + 1}`, blockVersionId, index + 1, question.itemKey, question.sourceQuestionBlockItemId || null, question.questionId || null, question.questionVersionId || null, question.required ? 1 : 0, 'free_text', question.promptEn, question.promptZh, 'ROLE-STUDENT', 'text', question.abilityCode || null, question.abilityNameEn || null, question.abilityNameZh || null, 'Teacher-curated question; accepted response becomes proof and requires later rubric-time interpretation');
    portfolio-poc-v2/server/repositories/activityRepository.js:144:      sql.run(`INSERT INTO activities(activity_id,school_id,group_id,created_by_user_id,latest_revision_id,current_approved_revision_id,operational_status,resolved_period_id,period_resolution_status,period_resolved_at,created_at,updated_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:146:      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
    portfolio-poc-v2/server/repositories/activityRepository.js:148:      sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,role_assignment_id,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:150:      for (const participant of participants) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,planned_attendance_status,attendance_approval_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:152:      for (const staff of supportingStaff) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,group_code,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:154:      for (const label of labelAssignments) sql.run(`INSERT INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, label.id, activity.id, revision.id, label.catalogueId, label.axisId, label.catalogueVersion, label.labelRole, 'teacher_selected', label.rationale || 'Activity intention selected at creation', 'pending_review', owner.userId, activity.createdAt, 'active');
    portfolio-poc-v2/server/repositories/activityRepository.js:155:      for (const flag of riskFlags) sql.run(`INSERT INTO activity_revision_risk_flags VALUES(?,?)`, revision.id, flag);
    portfolio-poc-v2/server/repositories/activityRepository.js:160:      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
    portfolio-poc-v2/server/repositories/activityRepository.js:162:      sql.run(`INSERT INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) SELECT ('ALA-' || ? || '-' || axis_id || '-' || label_role),activity_id,?,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,'pending_review',?,?,status FROM activity_label_assignments WHERE activity_revision_id=? AND status='active'`, revision.id, revision.id, revision.createdBy, updatedAt, revision.supersedesId);
    portfolio-poc-v2/server/repositories/activityRepository.js:163:      sql.run(`INSERT INTO activity_revision_risk_flags SELECT ?,flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=?`, revision.id, revision.supersedesId);
    portfolio-poc-v2/server/repositories/activityRepository.js:164:      sql.run('UPDATE activities SET latest_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revision.id, 'draft', updatedAt, revision.activityId);
    portfolio-poc-v2/server/repositories/activityRepository.js:168:    sql.run(`INSERT INTO activity_change_requests(activity_change_request_id,school_id,activity_id,base_revision_id,requested_by_user_id,target_owner_user_id,field_key,current_value,proposed_value,reason,status,requested_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:173:    sql.run(`UPDATE activity_change_requests SET status=?,resolved_by_user_id=?,resolution_note=?,resulting_revision_id=?,resolved_at=? WHERE activity_change_request_id=? AND status='open'`, status, actorId, note, resultingRevisionId || null, resolvedAt, requestId);
    portfolio-poc-v2/server/repositories/activityRepository.js:176:    sql.run(`UPDATE activity_revisions SET approval_status='pending_review',submitted_at=?,requested_publisher_user_id=? WHERE activity_revision_id=?`, submittedAt, publisherId, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:180:      sql.run(`UPDATE activity_revisions SET approval_status='withdrawn' WHERE activity_revision_id=? AND approval_status='pending_review'`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:181:      sql.run(`UPDATE approval_assignments SET status='withdrawn' WHERE target_version_id=? AND status IN ('assigned','in_review')`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:183:      if (revision) sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, withdrawnAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:188:    sql.run('UPDATE activity_revisions SET approval_status=?,approved_by_user_id=?,approved_at=? WHERE activity_revision_id=?', status, outcome === 'approved' ? actorId : null, outcome === 'approved' ? decidedAt : null, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:192:      sql.run(`UPDATE activity_label_assignments SET approval_state='approved' WHERE activity_revision_id=?`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:193:      sql.run('UPDATE activities SET current_approved_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revisionId, 'approved', decidedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:194:    } else sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, decidedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/activityRepository.js:200:      sql.run(`UPDATE activity_revisions SET publication_status='published' WHERE activity_revision_id=? AND approval_status='approved'`, revisionId);
    portfolio-poc-v2/server/repositories/activityRepository.js:201:      sql.run(`UPDATE activities SET operational_status='scheduled',updated_at=? WHERE activity_id=?`, publishedAt, revision.activity_id);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:67:        sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, record.perspective, 'draft', 'not_processed', 'unpublished', null, null, null, null, record.savedAt, record.savedAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:69:        sql.run(`UPDATE assessment_submissions SET updated_at=? WHERE assessment_submission_id=?`, record.savedAt, record.submissionId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:72:        sql.run(`INSERT INTO question_responses(question_response_id,assessment_submission_id,item_key,prompt_en,prompt_zh,text_value,raw_numeric_value,authorship_origin,created_at,updated_at)
    portfolio-poc-v2/server/repositories/assessmentRepository.js:74:          ON CONFLICT(assessment_submission_id,item_key) DO UPDATE SET text_value=excluded.text_value,updated_at=excluded.updated_at`,
    portfolio-poc-v2/server/repositories/assessmentRepository.js:77:      sql.run(`UPDATE assignment_recipients SET status='draft' WHERE assignment_recipient_id=?`, record.recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:82:      sql.run(`UPDATE assessment_submissions SET content_status='submitted',processing_status='pending_review',submitted_at=?,updated_at=? WHERE assessment_submission_id=? AND content_status='draft'`, submittedAt, submittedAt, submissionId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:83:      sql.run(`UPDATE assignment_recipients SET status='submitted' WHERE assignment_recipient_id=?`, recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:92:      sql.run(`UPDATE assessment_submissions SET content_status=?,processing_status=?,reviewed_by_user_id=?,reviewed_at=?,review_reason=?,updated_at=? WHERE assessment_submission_id=?`,
    portfolio-poc-v2/server/repositories/assessmentRepository.js:94:      sql.run(`UPDATE assignment_recipients SET status=? WHERE assignment_recipient_id=?`, outcome, recipientRow.assignment_recipient_id);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:99:          sql.run(`INSERT OR IGNORE INTO proof_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofId, 'PT-RESPONSE', recipientRow.subject_user_id, recipientRow.activity_id, 'question_response', answer.question_response_id, recipientRow.perspective, answer.text_value || 'Accepted response', reviewedAt, recipientRow.respondent_user_id, 'source_linked', 'accepted', 'reviewers_only', reviewedAt, null);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:142:      sql.run(`INSERT OR IGNORE INTO assessment_assignments VALUES(?,?,?,?,?,?,?,?,?,?)`, assignmentId, activityId, activity.form_version_id, actorId, createdAt, activity.end_at || createdAt, due, 'scheduled', 'passed', 'Created when the approved activity revision was published.');
    portfolio-poc-v2/server/repositories/assessmentRepository.js:144:        sql.run(`INSERT OR IGNORE INTO assignment_recipients(assignment_recipient_id,assessment_assignment_id,respondent_user_id,subject_user_id,reviewer_user_id,perspective,status,created_at,assigned_by_user_id,due_at,moderation_required,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, `AR-SELF-${activityId}-${participant.user_id}`, assignmentId, participant.user_id, participant.user_id, owner?.user_id || actorId, 'student_self_report', 'not_submitted', createdAt, actorId, due, 0, 'Student self-report assignment created with the published activity form.');
    portfolio-poc-v2/server/repositories/assessmentRepository.js:145:        if (owner) sql.run(`INSERT OR IGNORE INTO assignment_recipients(assignment_recipient_id,assessment_assignment_id,respondent_user_id,subject_user_id,reviewer_user_id,perspective,status,created_at,assigned_by_user_id,due_at,moderation_required,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, `AR-TEACH-${activityId}-${participant.user_id}`, assignmentId, owner.user_id, participant.user_id, owner.user_id, 'teacher_observation', 'not_submitted', createdAt, actorId, due, 0, 'Teacher observation assignment created with the published activity form.');
    portfolio-poc-v2/server/repositories/assessmentRepository.js:179:    sql.run(`INSERT INTO assignment_recipients(assignment_recipient_id,assessment_assignment_id,respondent_user_id,subject_user_id,reviewer_user_id,perspective,status,created_at,assigned_by_user_id,assigner_role_assignment_id,due_at,moderation_required,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.recipientId, record.assignmentId, record.reviewerId, record.subjectId, record.actorId, 'peer_observation', 'not_submitted', record.createdAt, record.actorId, record.roleAssignmentId, record.dueAt, 1, record.notes);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:183:      sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, 'teacher_observation', 'approved', 'accepted', 'unpublished', record.createdAt, record.actorId, record.createdAt, record.reviewReason, record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:184:      for (const answer of record.answers) sql.run(`INSERT INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, answer.id, record.submissionId, answer.itemKey, answer.promptEn, answer.promptZh, answer.value, null, 'human_authored', record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:185:      sql.run(`UPDATE assignment_recipients SET status='approved' WHERE assignment_recipient_id=?`, record.recipientId);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:186:      sql.run(`INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.feedbackId, record.activityId, record.studentId, record.actorId, record.submissionId, 'teacher_assessment', record.overallComment, record.createdAt, 'teacher_observation', 'confirmed', 'unpublished', record.createdAt, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:189:        sql.run(`INSERT OR IGNORE INTO proof_items(proof_item_id,proof_type_id,student_id,activity_id,source_entity_type,source_entity_id,perspective,summary,occurred_at,submitted_by_user_id,provenance_status,review_status,visibility_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofItemId, evidence.type, record.studentId, record.activityId, evidence.submissionId ? 'assessment_submission' : 'feedback', evidence.submissionId || record.feedbackId, 'teacher_observation', evidence.text, record.createdAt, record.actorId, 'source_linked', 'accepted', 'reviewers_only', record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:190:        sql.run(`INSERT INTO proof_links(proof_link_id,proof_item_id,target_entity_type,target_entity_id,support_role,linked_by_user_id,linked_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)`, `PL-${evidence.id}-FDB`, proofItemId, 'feedback', record.feedbackId, evidence.type, record.actorId, record.createdAt, 'active', evidence.text);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:194:        sql.run(`INSERT INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, observation.id, record.feedbackId, observation.axisId, observation.step, observation.consistency, observation.comment, observation.nextStep, 'confirmed', 1, 0, null, null, record.createdAt);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:195:        for (const evidence of record.evidence) sql.run(`INSERT INTO proof_links(proof_link_id,proof_item_id,target_entity_type,target_entity_id,support_role,linked_by_user_id,linked_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)`, `PL-${evidence.id}-${observation.id}`, evidence.proofItemId || `PRF-${evidence.id}`, 'framework_observation', observation.id, 'supports_condition', record.actorId, record.createdAt, 'active', evidence.text);
    ✓ • 0ms

## Assistant

The confirmed API count for `portfolio-poc-v2` is **76 endpoints** under `/api/v2`.

| Method | Endpoints |
|---|---:|
| GET | 37 |
| POST | 38 |
| PATCH | 1 |
| **Total** | **76** |

Source: [v2 API routes](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/routes/api.js:8).

For your duplication question, **I have not confirmed an API that writes the same record to two unrelated tables**. I checked the following concrete cases; each has an identifiable relationship, although some values are copied or statuses repeated.

| API | Tables written | Relationship or repeated data | Result |
|---|---|---|---|
| `POST /response-tasks/:recipientId/draft` | `assessment_submissions`, `question_responses`, `assignment_recipients` | Responses carry `assessment_submission_id`; the submission belongs to a recipient. | Related records |
| `POST /response-tasks/:recipientId/submit` | `assessment_submissions`, `assignment_recipients` | Both statuses change; the submission is associated with the recipient. | Related records with repeated lifecycle state |
| `POST /assessment-submissions/:submissionId/review` | `assessment_submissions`, `assignment_recipients`, `proof_items` | An accepted answer’s text is copied into the proof summary, and the proof stores the source question-response ID. | **Linked copy of text** |
| `POST /assessment-workspace/:activityId/:studentId` | `assessment_submissions`, `question_responses`, `assignment_recipients`, `feedback`, `proof_items`, `proof_links`, `framework_observations` | Submission, feedback and proof identifiers connect the records. Evidence text is also stored in proof summaries and link notes. | **Related records with repeated text** |
| `POST /media-assets` | `media_assets`, `activity_media`, `entity_lifecycle_events` | `activity_media` stores the media asset ID; the lifecycle event identifies the asset. | Related records |
| `POST /activities/:id/revisions` | `activity_revisions`, `activity_label_assignments`, `activity_revision_risk_flags`, `activities` | Labels and risk flags are copied to a successor revision; the new revision refers to its predecessor. | **Versioned copies**, linked through the revisions |
| `POST /portfolios/:studentId/drafts` | `portfolio_working_versions`, `portfolio_version_items` | Items carry the working-version ID. | Related records |

The assessment writes are in [assessmentRepository.js](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/assessmentRepository.js:67); the version-copy logic is in [activityRepository.js](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/activityRepository.js:159).

**Limit:** this table confirms the relationships in the listed paths; it is not yet an exhaustive audit of all 39 POST/PATCH endpoints. Therefore, I cannot honestly conclude that unrelated duplication is absent across all of v2.

## User

so how many tables are not used at all, like in your saying, related but the update is not duplicated. 84 tables are way too many

## Assistant

I’ll compare the v2 schema with the actual server queries and separate unused tables from tables that are used only for seed data or audit/history.

## Activity

    $ rg -n 'CREATE TABLE|sqlite|schema' portfolio-poc-v2/server portfolio-poc-v2 -g '*.sql' -g '*.js' | head -60
        ls portfolio-poc-v2
    portfolio-poc-v2/scripts/reset-database.js:6:const defaultDatabase = resolve(here, '../playground-v2.sqlite');
    portfolio-poc-v2/scripts/reset-database.js:9:if (!/\.(?:sqlite|db)$/i.test(databasePath)) throw new Error(`Refusing to reset a path without a .sqlite or .db extension: ${databasePath}`);
    portfolio-poc-v2/scripts/create-empty-database.js:4:const output = resolve(process.argv[2] || 'playground-v2-empty.sqlite');
    portfolio-poc-v2/scripts/create-empty-database.js:8:  console.error('Choose another path, or remove that exact schema-only database after confirming it is no longer needed.');
    portfolio-poc-v2/scripts/create-empty-database.js:16:const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
    portfolio-poc-v2/scripts/create-empty-database.js:33:console.log(`Created schema-only SQLite database: ${output}`);
    portfolio-poc-v2/tests/e2e/start-fixture.js:9:const database = join(temporary, 'e2e.sqlite');
    portfolio-poc-v2/tests/e2e/start-fixture.js:51:launch(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
    portfolio-poc-v2/server/repositories/seed.js:222:    const contractId = `ICV-SEED-${slug(item.record_type)}-${slug(item.schema_version)}`;
    portfolio-poc-v2/server/repositories/seed.js:225:    sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, contractId, item.record_type, item.schema_version, item.record_type, JSON.stringify(['csv']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    portfolio-poc-v2/tests/contracts.test.js:7:import { DatabaseSync } from 'node:sqlite';
    portfolio-poc-v2/tests/contracts.test.js:28:    assert(!/node:sqlite|server\/repositories|\bDatabaseSync\b/.test(source), relative(root, path));
    portfolio-poc-v2/tests/contracts.test.js:34:  const violations = serverFiles.filter(path => !relative(root, path).startsWith('server/repositories/')).filter(path => /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b|node:sqlite/.test(readFileSync(path, 'utf8')));
    portfolio-poc-v2/tests/contracts.test.js:59:test('schema-only database creates the clean schema without demo domain rows', () => {
    portfolio-poc-v2/tests/contracts.test.js:60:  const directory = mkdtempSync(join(tmpdir(), 'bhss-v2-schema-'));
    portfolio-poc-v2/tests/contracts.test.js:61:  const database = join(directory, 'empty.sqlite');
    portfolio-poc-v2/tests/contracts.test.js:63:    const result = spawnSync(process.execPath, ['--experimental-sqlite', join(root, 'scripts/create-empty-database.js'), database], { encoding: 'utf8' });
    portfolio-poc-v2/tests/contracts.test.js:67:    assert.equal(sql.prepare(`SELECT COUNT(*) count FROM sqlite_master WHERE type='table' AND name='schema_migrations'`).get().count, 0);
    portfolio-poc-v2/tests/contracts.test.js:68:    const tableNames = new Set(sql.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all().map(row => row.name));
    portfolio-poc-v2/server/repositories/database.js:1:import { DatabaseSync } from 'node:sqlite';
    portfolio-poc-v2/server/repositories/database.js:4:import { schema, schemaVersion } from './schema.js';
    portfolio-poc-v2/server/repositories/database.js:9:const defaultDatabase = resolve(here, '../../playground-v2.sqlite');
    portfolio-poc-v2/server/repositories/database.js:14:const applicationTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
    portfolio-poc-v2/server/repositories/database.js:16:  db.exec(schema);
    portfolio-poc-v2/server/repositories/database.js:21:  const retired = ['schema_migrations','activity_vask_items','form_items','peer_review_assignments','media_source_definitions'];
    portfolio-poc-v2/server/repositories/database.js:23:    throw new Error(`Database does not match ${schemaVersion}. This POC has no migration path; run "npm run db:reset" to rebuild it.`);
    portfolio-poc-v2/server/repositories/seed.js:222:    const contractId = `ICV-SEED-${slug(item.record_type)}-${slug(item.schema_version)}`;
    portfolio-poc-v2/server/repositories/seed.js:225:    sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, contractId, item.record_type, item.schema_version, item.record_type, JSON.stringify(['csv']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    portfolio-poc-v2/tests/api.test.js:13:const database = join(temporary, 'test.sqlite');
    portfolio-poc-v2/tests/api.test.js:53:  server = spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
    portfolio-poc-v2/server/repositories/database.js:1:import { DatabaseSync } from 'node:sqlite';
    portfolio-poc-v2/server/repositories/database.js:4:import { schema, schemaVersion } from './schema.js';
    portfolio-poc-v2/server/repositories/database.js:9:const defaultDatabase = resolve(here, '../../playground-v2.sqlite');
    portfolio-poc-v2/server/repositories/database.js:14:const applicationTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
    portfolio-poc-v2/server/repositories/database.js:16:  db.exec(schema);
    portfolio-poc-v2/server/repositories/database.js:21:  const retired = ['schema_migrations','activity_vask_items','form_items','peer_review_assignments','media_source_definitions'];
    portfolio-poc-v2/server/repositories/database.js:23:    throw new Error(`Database does not match ${schemaVersion}. This POC has no migration path; run "npm run db:reset" to rebuild it.`);
    portfolio-poc-v2/server/repositories/schema.js:1:export const schemaVersion = 'poc-v2-2026-11-02-template-foundation';
    portfolio-poc-v2/server/repositories/schema.js:3:export const schema = String.raw`
    portfolio-poc-v2/server/repositories/schema.js:4:CREATE TABLE academic_periods(
    portfolio-poc-v2/server/repositories/schema.js:21:CREATE TABLE activities(activity_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,external_activity_id TEXT,activity_template_id TEXT,group_id TEXT,created_by_user_id TEXT NOT NULL,latest_revision_id TEXT,current_approved_revision_id TEXT,operational_status TEXT NOT NULL,resolved_period_id TEXT,period_resolution_status TEXT,period_resolved_at TEXT,period_exception_approved_by TEXT,period_exception_reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL, disabled_previous_status TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT);
    portfolio-poc-v2/server/repositories/schema.js:23:CREATE TABLE activity_change_requests(activity_change_request_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,base_revision_id TEXT NOT NULL,requested_by_user_id TEXT NOT NULL,target_owner_user_id TEXT NOT NULL,field_key TEXT NOT NULL,current_value TEXT,proposed_value TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL,resolved_by_user_id TEXT,resolution_note TEXT,resulting_revision_id TEXT,requested_at TEXT NOT NULL,resolved_at TEXT);
    portfolio-poc-v2/server/repositories/schema.js:25:CREATE TABLE activity_dependency_impacts(
    portfolio-poc-v2/server/repositories/schema.js:39:CREATE TABLE activity_label_assignments(
    portfolio-poc-v2/server/repositories/schema.js:59:CREATE TABLE activity_media(
    portfolio-poc-v2/server/repositories/schema.js:70:CREATE TABLE activity_people(activity_person_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),user_id TEXT NOT NULL REFERENCES users(user_id),person_type TEXT NOT NULL,relationship_type TEXT NOT NULL,role_assignment_id TEXT,group_code TEXT,planned_attendance_status TEXT,actual_attendance_status TEXT,attendance_approval_status TEXT,can_edit INTEGER NOT NULL,can_view_raw_media INTEGER NOT NULL,can_submit_response INTEGER NOT NULL,effective_from TEXT,effective_until TEXT,assigned_by_user_id TEXT,assigned_at TEXT, status TEXT NOT NULL DEFAULT 'active', supersedes_activity_person_id TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT, updated_by_user_id TEXT, updated_at TEXT);
    portfolio-poc-v2/server/repositories/schema.js:72:CREATE TABLE activity_revision_risk_flags(
    portfolio-poc-v2/server/repositories/schema.js:78:CREATE TABLE activity_revisions(activity_revision_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),revision_number INTEGER NOT NULL,title_en TEXT NOT NULL,title_zh TEXT,description_en TEXT NOT NULL,description_zh TEXT,activity_type TEXT,subject_id TEXT,department_id TEXT,start_at TEXT,end_at TEXT,owner_user_id TEXT,requested_form_version_id TEXT,media_capture_expected INTEGER,location TEXT,approval_status TEXT NOT NULL,publication_status TEXT NOT NULL,material_change_reason TEXT,supersedes_revision_id TEXT,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,submitted_at TEXT,approved_by_user_id TEXT,approved_at TEXT, requested_publisher_user_id TEXT,UNIQUE(activity_id,revision_number));
    portfolio-poc-v2/server/repositories/schema.js:80:CREATE TABLE ai_candidate_decisions(
    portfolio-poc-v2/server/repositories/schema.js:89:CREATE TABLE ai_draft_candidates(
    portfolio-poc-v2/server/repositories/schema.js:103:CREATE TABLE ai_input_manifests(
    portfolio-poc-v2/server/repositories/schema.js:116:CREATE TABLE ai_manifest_sources(
    portfolio-poc-v2/server/repositories/schema.js:126:CREATE TABLE approval_assignments(approval_assignment_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),approval_policy_step_id TEXT NOT NULL REFERENCES approval_policy_steps(approval_policy_step_id),target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_version_id TEXT,assignee_user_id TEXT,assignee_role_assignment_id TEXT,assigned_by_user_id TEXT,status TEXT NOT NULL,assigned_at TEXT NOT NULL,accepted_at TEXT,due_at TEXT,delegated_from_assignment_id TEXT,delegation_effective_until TEXT);
    portfolio-poc-v2/server/repositories/schema.js:128:CREATE TABLE approval_decisions(approval_decision_id TEXT PRIMARY KEY,approval_assignment_id TEXT NOT NULL REFERENCES approval_assignments(approval_assignment_id),school_id TEXT NOT NULL,step_number INTEGER NOT NULL,outcome TEXT NOT NULL,reason TEXT NOT NULL,decided_by_user_id TEXT NOT NULL,used_capability_id TEXT NOT NULL,used_scope_type TEXT NOT NULL,used_scope_id TEXT NOT NULL,decided_at TEXT NOT NULL);
    portfolio-poc-v2/server/repositories/schema.js:130:CREATE TABLE approval_escalations(approval_escalation_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_assignment_id TEXT,target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_period_id TEXT,trigger_reason TEXT NOT NULL,queue_key TEXT NOT NULL,status TEXT NOT NULL,triggered_at TEXT NOT NULL,owned_by_user_id TEXT,resolved_at TEXT,resolution_note TEXT);
    portfolio-poc-v2/server/repositories/schema.js:132:CREATE TABLE approval_policy_steps(approval_policy_step_id TEXT PRIMARY KEY,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),step_number INTEGER NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,required_capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),assignee_strategy TEXT NOT NULL,required_decision_count INTEGER NOT NULL,reason_required INTEGER NOT NULL,status TEXT NOT NULL);
    portfolio-poc-v2/server/repositories/schema.js:134:CREATE TABLE approval_policy_versions(approval_policy_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,workflow_type TEXT NOT NULL,policy_version INTEGER NOT NULL,mode TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,allow_self_assignment INTEGER NOT NULL,allow_self_approval INTEGER NOT NULL,publication_separate INTEGER NOT NULL,max_human_steps INTEGER NOT NULL,default_queue_key TEXT,unassigned_escalation_minutes INTEGER,overdue_escalation_minutes INTEGER,status TEXT NOT NULL,effective_from TEXT,effective_until TEXT,configured_by_user_id TEXT,configured_at TEXT);
    portfolio-poc-v2/server/repositories/schema.js:136:CREATE TABLE assessment_assignments(
    portfolio-poc-v2/server/repositories/schema.js:149:CREATE TABLE assessment_submissions(
    portfolio-poc-v2/server/repositories/schema.js:167:CREATE TABLE assignment_recipients(
    ARCHITECTURE.md
    README.md
    design-qa-artifacts
    design-qa-option1-artifacts
    design-qa.md
    design-revamp-audit-artifacts
    dist
    import-ui-audit-artifacts
    import-ui-audit.md
    index.html
    live-flow-audit-artifacts
    live-flow-audit.md
    node_modules
    package-lock.json
    package.json
    planning
    playground-v2.sqlite
    playground-v2.sqlite-shm
    playground-v2.sqlite-wal
    playwright-report
    playwright.config.js
    public
    scripts
    server
    shared
    src
    srs-implementation-gap.md
    test-results
    tests
    tsconfig.json
    vite.config.js
    ✓ • 0ms

## Activity

    $ python3 - <<'PY'
        import re,pathlib
        p=pathlib.Path('portfolio-poc-v2/server/repositories'); s=(p/'schema.js').read_text(); tables=re.findall(r'CREATE TABLE\s+(\w+)',s,re.I)
        files=list(pathlib.Path('portfolio-poc-v2/server').rglob('*.js')); runtime=[x for x in files if x.name not in ('schema.js','seed.js','database.js')]; seed=(p/'seed.js').read_text();
        print('tables',len(tables))
        for kind, test in [('no_runtime',lambda t:not any(re.search(r'\b'+t+r'\b',f.read_text(),re.I) for f in runtime)),('no_any',lambda t:not any(re.search(r'\b'+t+r'\b',f.read_text(),re.I) for f in runtime) and not re.search(r'\b'+t+r'\b',seed,re.I))]:
         a=[t for t in tables if test(t)];print(kind,len(a),', '.join(a))
        PY
    tables 83
    no_runtime 3 department_subjects, role_capabilities, schools
    no_any 0
    ✓ • 0ms

## Activity

    $ rg -n '\b(department_subjects|role_capabilities|schools)\b' portfolio-poc-v2/server/repositories/seed.js
        rg -n 'CREATE (VIEW|TRIGGER)|department_subjects|role_capabilities|schools' portfolio-poc-v2/server/repositories/schema.js | tail -20
        python3 - <<'PY'
        import sqlite3
        c=sqlite3.connect('file:portfolio-poc-v2/playground-v2.sqlite?mode=ro',uri=True)
        t=c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'").fetchall();print('database tables',len(t));print('empty', [n for n, in t if c.execute('select count(*) from "'+n+'"').fetchone()[0]==0])
        PY
    34:  ['42_department_subjects.csv', 'department_subjects'],
    36:  ['44_role_capabilities.csv', 'role_capabilities'],
    144:  for (const row of grantRows) sql.run(`INSERT OR IGNORE INTO role_capabilities(role_capability_id,role_id,capability_id,effect,condition_key,status,configured_by_user_id,configured_at) VALUES(?,?,?,?,?,'active','USR-ADM-001',?)`, ...row, stamp);
    147:    FROM role_capabilities rc JOIN role_definition_versions rv ON rv.role_id=rc.role_id AND rv.lifecycle_status='active'`);
    246:  if (!sql.get('SELECT 1 FROM schools LIMIT 1')) {
    248:      sql.run('INSERT INTO schools(school_id,name_en,name_zh,status) VALUES(?,?,?,?)', 'BHSS', 'BHSS demonstration school', 'BHSS 示範學校', 'active');
    277:      ['44_role_capabilities.csv', 'role_capabilities'],
    302:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-CLASS-AI-REVIEW', 'ROLE-CLASS-TEACHER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'assigned_student_only', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    303:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-PORTAPP-AI-REVIEW', 'ROLE-PORTFOLIO-APPROVER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'named_or_school_scope', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    304:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-ACTAPP-PUBLISH', 'ROLE-ACTIVITY-APPROVER', 'CAP-ACTIVITY-PUBLISH', 'allow', 'named_assignment_required', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    191:        school_id TEXT REFERENCES schools(school_id),
    208:CREATE TABLE department_subjects(department_subject_id TEXT PRIMARY KEY,department_id TEXT NOT NULL,subject_id TEXT NOT NULL,school_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT,assigned_by_user_id TEXT,assigned_at TEXT);
    210:CREATE TABLE departments(department_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),department_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,parent_department_id TEXT,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);
    305:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    420:    school_id TEXT NOT NULL REFERENCES schools(school_id),
    475:        school_id TEXT REFERENCES schools(school_id),
    522:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    618:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    682:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    701:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    755:CREATE TABLE role_capabilities(role_capability_id TEXT PRIMARY KEY,role_id TEXT NOT NULL REFERENCES role_definitions(role_id),capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),effect TEXT NOT NULL,condition_key TEXT,status TEXT NOT NULL,configured_by_user_id TEXT,configured_at TEXT);
    839:        school_id TEXT NOT NULL REFERENCES schools(school_id),
    872:CREATE TABLE schools(school_id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,status TEXT NOT NULL);
    876:    school_id TEXT NOT NULL REFERENCES schools(school_id),
    907:CREATE TABLE staff_position_definitions(position_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),position_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,position_category TEXT,sort_order INTEGER,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);
    911:CREATE TABLE subjects(subject_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),subject_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);
    917:CREATE TABLE users(user_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),external_user_id TEXT,user_type TEXT NOT NULL,student_number TEXT,staff_number TEXT,name_en TEXT NOT NULL,name_zh TEXT,email TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL);
    921:  school_id TEXT NOT NULL REFERENCES schools(school_id),
    939:  school_id TEXT NOT NULL REFERENCES schools(school_id),
    database tables 83
    empty ['activity_dependency_impacts', 'ai_candidate_decisions', 'import_record_corrections', 'import_record_decisions', 'entity_lifecycle_events']
    ✓ • 0ms

## Assistant

I checked the v2 schema and server code. The current schema has **83 application tables**, not 84.

| Category | Count | Meaning |
|---|---:|---|
| No references outside schema, setup and seed code | **3** | Not directly queried or written by the API runtime code I searched |
| Referenced by runtime server code | **80** | Referenced somewhere in the server code; this does not prove a user can reach or needs every feature |
| Completely unused, including setup and seed | **0** | All 83 have at least a setup or seed reference |

The three candidates need different treatment:

| Table | What I found | Removal assessment |
|---|---|---|
| `department_subjects` | Loaded from seed CSV; no direct runtime reference found. | Strongest candidate for removal if department–subject mapping is not needed. |
| `role_capabilities` | Seeded and read during setup to populate versioned role capability data; no direct runtime reference found. | Candidate for consolidation, but setup must be changed first. |
| `schools` | Seeded, and other schema tables reference it through foreign keys. | **Not safe to call unused** merely because runtime code does not query it directly. |

The local database also has **5 empty tables**: `activity_dependency_impacts`, `ai_candidate_decisions`, `import_record_corrections`, `import_record_decisions`, and `entity_lifecycle_events`. Empty means no records currently exist in this database; it does not mean their workflows are unused or unnecessary.

Your concern about 83 tables is reasonable. This check identifies **one strong removal candidate and one setup-dependent consolidation candidate**, but it does not establish how many tables can safely be removed. That requires assessing which workflows the MVP actually needs, including version history, approvals and audit records. The schema is in [schema.js](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/schema.js:4), and the setup references are in [seed.js](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/seed.js:144).

## User

i need you to access how many table is actually safely merging, like the ones that has revisions or other weird things, usually we just need a table for log, and one for the actual record itself, a newer version would just be a new entry then looks for approval

## Assistant

I’ll assess the schema around your proposed pattern: one table holding actual records and their versions, plus a shared log. I’ll trace how the current revision and approval tables are used and distinguish safe consolidation candidates from changes that need a product decision.

## Activity

    $ python3 - <<'PY'
        import re,pathlib
        s=pathlib.Path('portfolio-poc-v2/server/repositories/schema.js').read_text()
        for n in re.findall(r'CREATE TABLE\s+(\w+)',s,re.I): print(n)
        PY
        cat portfolio-poc-v2/README.md | head -45
        rg -n 'revision|version|snapshot|approval|audit|lifecycle' portfolio-poc-v2/server/repositories/schema.js
    academic_periods
    activities
    activity_change_requests
    activity_dependency_impacts
    activity_label_assignments
    activity_media
    activity_people
    activity_revision_risk_flags
    activity_revisions
    ai_candidate_decisions
    ai_draft_candidates
    ai_input_manifests
    ai_manifest_sources
    approval_assignments
    approval_decisions
    approval_escalations
    approval_policy_steps
    approval_policy_versions
    assessment_assignments
    assessment_submissions
    assignment_recipients
    audit_events
    capability_definitions
    capability_policy_overrides
    definition_sources
    department_subjects
    departments
    external_media_references
    feedback
    form_version_blocks
    form_versions
    framework_observations
    import_batch_events
    import_batches
    import_contract_versions
    import_record_corrections
    import_record_decisions
    import_record_links
    import_records
    learner_narrative_versions
    media_assets
    media_extractions
    portfolio_templates
    portfolio_template_versions
    portfolio_template_sections
    school_portfolio_template_assignments
    portfolio_snapshots
    portfolio_version_items
    portfolio_working_versions
    proof_items
    proof_links
    proud_moment_selections
    proud_moment_windows
    published_rubric_results
    question_bank_versions
    question_block_items
    question_block_versions
    question_blocks
    question_definitions
    question_responses
    question_versions
    role_capabilities
    role_definitions
    role_definition_versions
    role_version_capabilities
    rubric_axes
    rubric_catalogues
    rubric_groups
    rubric_levels
    school_rubric_assignments
    rubric_step_definitions
    schools
    source_systems
    staff_group_memberships
    staff_groups
    staff_position_definitions
    student_class_memberships
    subjects
    user_position_assignments
    user_role_assignments
    users
    activity_source_bindings
    entity_lifecycle_events
    # BHSS Portfolio Playground v2
    
    Playground v2 is the schema-first proof of concept for the revised Core data relationships and CSV contract 3.0. It is deliberately separate from `portfolio-poc/` (Playground v1).
    
    The interface supports English and Hong Kong Traditional Chinese. Use the `EN／繁中` toggle on the account picker or top bar; the choice is retained locally and existing bilingual Core/CSV display fields are selected without translating authored student, teacher or audit content.
    
    ## What this stage demonstrates
    
    - stacked staff positions without treating job titles as permissions;
    - functional role assignments with school, subject, department, class, group and activity scope;
    - staff search by position, role, capability, subject, department, group and approval eligibility;
    - effective capability calculation from role grants plus school/group/user overrides, with applicable explicit deny taking precedence;
    - stable activity IDs with immutable material revisions and separate change requests;
    - complete activity packages with server-resolved reporting period, participants, VASK intention, risk flags and one exact approved/published form version;
    - one activity-roster ingestion contract shared by CSV, XLSX and an allow-listed Time Infinity JSON connector, with staged preview, row-level correction/exclusion, separate commit, and immutable source custody;
    - a separate activity-catalogue CSV/XLSX delta contract: editable export omits original author, absent rows mean no change, stale revisions conflict, material edits create successor drafts, and only explicit audited actions soft-disable or restore an activity;
    - approval eligibility separated from named approval assignments and immutable decisions;
    - activity approval and activity publication as separate named, reasoned decisions;
    - approval rows that identify the target/creator/revision and open the authorized activity record directly;
    - separate student activity-response tasks for self reflection and explicitly assigned peer review, with frozen submissions, moderation and successor revisions after changes are requested;
    - a named activity-assessment workspace that keeps student, peer and teacher records separate and allows proof-linked teacher observations without automatically publishing a 1–16 step;
    - memorable-activity selection as its own curation workflow, independent from assessment and Portfolio editing;
    - separate student Portfolio working editor, staff review workspace and read-only published visualization, so a newer draft cannot leak into the official view;
    - server-guarded record links at `/activities/:activityId`, `/imports/:batchId`, `/responses/:recipientId`, `/assessments/:activityId/:studentId`, `/portfolio-editor/:studentId`, `/portfolio-review/:studentId` and `/portfolios/:studentId`; unauthorized deep links return to the overview without exposing the record;
    - v1-aligned visual hierarchy and live activity/approval/Portfolio visualizations;
    - escalation queue records for unassigned or overdue work.
    
    The learner narrative and initial candidates are seeded demonstration content. Playground v2 can optionally call an OpenAI-compatible local LLM through the Node server. The browser never receives provider credentials or calls the provider directly.
    
    Authorized teacher/staff accounts can open the **AI drafts** workspace to inspect a frozen input manifest, generate parallel non-overwriting candidates when the optional provider is configured, persist human decisions, and retain separate generated/edited/final text states. AI output cannot accept proof, publish a Portfolio or change a rubric step.
    
    The same authorized accounts can open the v2-only model playground directly at <http://127.0.0.1:5174/chatbox>. It discovers the provider's current models rather than assuming `LOCAL_LLM_MODEL` exists, streams replies through the authenticated Node API, and shows the reported context window, approximate local-history size, provider token usage, time to first token, generation time, total response time and WPM after the initial wait. Chat history is capped at 100 messages and stored only in this browser's `localStorage`, separately for each demo identity; clearing browser storage or using **Clear local history** removes it.
    
    SchoolAdmin also has a bilingual **POC page catalogue** aligned to SRS-12, the External lean MVP proposal and the Internal system review. It labels each recommended role page as implemented, partial or recommended next so this focused v2 slice is not mistaken for the full P1 product.
    
    The live role-and-flow audit, including before/after screenshots and its evidence limits, is recorded in [`live-flow-audit.md`](./live-flow-audit.md).
    
    ## Run it
    
    From this directory:
    
    ```bash
    npm install
    npm run dev
    ```
    16:        portfolio_snapshot_due TEXT,
    21:CREATE TABLE activities(activity_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,external_activity_id TEXT,activity_template_id TEXT,group_id TEXT,created_by_user_id TEXT NOT NULL,latest_revision_id TEXT,current_approved_revision_id TEXT,operational_status TEXT NOT NULL,resolved_period_id TEXT,period_resolution_status TEXT,period_resolved_at TEXT,period_exception_approved_by TEXT,period_exception_reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL, disabled_previous_status TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT);
    23:CREATE TABLE activity_change_requests(activity_change_request_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,base_revision_id TEXT NOT NULL,requested_by_user_id TEXT NOT NULL,target_owner_user_id TEXT NOT NULL,field_key TEXT NOT NULL,current_value TEXT,proposed_value TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL,resolved_by_user_id TEXT,resolution_note TEXT,resulting_revision_id TEXT,requested_at TEXT NOT NULL,resolved_at TEXT);
    42:    activity_revision_id TEXT NOT NULL REFERENCES activity_revisions(activity_revision_id),
    45:    catalogue_version TEXT NOT NULL,
    49:    approval_state TEXT NOT NULL,
    56:    UNIQUE(activity_revision_id,axis_id,label_role)
    70:CREATE TABLE activity_people(activity_person_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),user_id TEXT NOT NULL REFERENCES users(user_id),person_type TEXT NOT NULL,relationship_type TEXT NOT NULL,role_assignment_id TEXT,group_code TEXT,planned_attendance_status TEXT,actual_attendance_status TEXT,attendance_approval_status TEXT,can_edit INTEGER NOT NULL,can_view_raw_media INTEGER NOT NULL,can_submit_response INTEGER NOT NULL,effective_from TEXT,effective_until TEXT,assigned_by_user_id TEXT,assigned_at TEXT, status TEXT NOT NULL DEFAULT 'active', supersedes_activity_person_id TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT, updated_by_user_id TEXT, updated_at TEXT);
    72:CREATE TABLE activity_revision_risk_flags(
    73:        activity_revision_id TEXT NOT NULL REFERENCES activity_revisions(activity_revision_id),
    75:        PRIMARY KEY(activity_revision_id,flag_code)
    78:CREATE TABLE activity_revisions(activity_revision_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),revision_number INTEGER NOT NULL,title_en TEXT NOT NULL,title_zh TEXT,description_en TEXT NOT NULL,description_zh TEXT,activity_type TEXT,subject_id TEXT,department_id TEXT,start_at TEXT,end_at TEXT,owner_user_id TEXT,requested_form_version_id TEXT,media_capture_expected INTEGER,location TEXT,approval_status TEXT NOT NULL,publication_status TEXT NOT NULL,material_change_reason TEXT,supersedes_revision_id TEXT,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,submitted_at TEXT,approved_by_user_id TEXT,approved_at TEXT, requested_publisher_user_id TEXT,UNIQUE(activity_id,revision_number));
    94:        prompt_version TEXT NOT NULL,
    110:        prompt_version TEXT NOT NULL,
    126:CREATE TABLE approval_assignments(approval_assignment_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),approval_policy_step_id TEXT NOT NULL REFERENCES approval_policy_steps(approval_policy_step_id),target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_version_id TEXT,assignee_user_id TEXT,assignee_role_assignment_id TEXT,assigned_by_user_id TEXT,status TEXT NOT NULL,assigned_at TEXT NOT NULL,accepted_at TEXT,due_at TEXT,delegated_from_assignment_id TEXT,delegation_effective_until TEXT);
    128:CREATE TABLE approval_decisions(approval_decision_id TEXT PRIMARY KEY,approval_assignment_id TEXT NOT NULL REFERENCES approval_assignments(approval_assignment_id),school_id TEXT NOT NULL,step_number INTEGER NOT NULL,outcome TEXT NOT NULL,reason TEXT NOT NULL,decided_by_user_id TEXT NOT NULL,used_capability_id TEXT NOT NULL,used_scope_type TEXT NOT NULL,used_scope_id TEXT NOT NULL,decided_at TEXT NOT NULL);
    130:CREATE TABLE approval_escalations(approval_escalation_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_assignment_id TEXT,target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_period_id TEXT,trigger_reason TEXT NOT NULL,queue_key TEXT NOT NULL,status TEXT NOT NULL,triggered_at TEXT NOT NULL,owned_by_user_id TEXT,resolved_at TEXT,resolution_note TEXT);
    132:CREATE TABLE approval_policy_steps(approval_policy_step_id TEXT PRIMARY KEY,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),step_number INTEGER NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,required_capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),assignee_strategy TEXT NOT NULL,required_decision_count INTEGER NOT NULL,reason_required INTEGER NOT NULL,status TEXT NOT NULL);
    134:CREATE TABLE approval_policy_versions(approval_policy_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,workflow_type TEXT NOT NULL,policy_version INTEGER NOT NULL,mode TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,allow_self_assignment INTEGER NOT NULL,allow_self_approval INTEGER NOT NULL,publication_separate INTEGER NOT NULL,max_human_steps INTEGER NOT NULL,default_queue_key TEXT,unassigned_escalation_minutes INTEGER,overdue_escalation_minutes INTEGER,status TEXT NOT NULL,effective_from TEXT,effective_until TEXT,configured_by_user_id TEXT,configured_at TEXT);
    139:        form_version_id TEXT NOT NULL REFERENCES form_versions(form_version_id),
    152:        revision_number INTEGER NOT NULL,
    164:        UNIQUE(assignment_recipient_id,revision_number)
    183:CREATE TABLE audit_events(audit_event_id INTEGER PRIMARY KEY AUTOINCREMENT,school_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,action_code TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,reason TEXT,occurred_at TEXT NOT NULL);
    196:        version TEXT NOT NULL,
    205:        UNIQUE(school_id,source_code,version)
    244:CREATE TABLE form_version_blocks(
    245:        form_version_id TEXT NOT NULL REFERENCES form_versions(form_version_id),
    246:        question_block_version_id TEXT NOT NULL REFERENCES question_block_versions(question_block_version_id),
    248:        PRIMARY KEY(form_version_id,question_block_version_id)
    251:CREATE TABLE form_versions(
    253:        form_version_id TEXT PRIMARY KEY,
    256:        version_number TEXT NOT NULL,
    257:        supersedes_form_version_id TEXT,
    307:        import_contract_version_id TEXT NOT NULL REFERENCES import_contract_versions(import_contract_version_id),
    329:        parser_version TEXT NOT NULL,
    344:CREATE TABLE import_contract_versions(
    345:        import_contract_version_id TEXT PRIMARY KEY,
    347:        version_number TEXT NOT NULL,
    356:        UNIQUE(contract_code,version_number)
    386:        entity_version_id TEXT,
    416:CREATE TABLE learner_narrative_versions(learner_narrative_version_id TEXT PRIMARY KEY,portfolio_working_version_id TEXT NOT NULL REFERENCES portfolio_working_versions(portfolio_working_version_id),narrative_kind TEXT NOT NULL,revision_number INTEGER NOT NULL,generated_text TEXT,teacher_edited_text TEXT,final_approved_text TEXT,prompt_version TEXT,source_manifest_id TEXT,edited_by_user_id TEXT,edit_reason TEXT,approval_status TEXT NOT NULL,approved_by_user_id TEXT,created_at TEXT NOT NULL,approved_at TEXT);
    452:        provider_version TEXT,
    487:CREATE TABLE portfolio_template_versions(
    488:        portfolio_template_version_id TEXT PRIMARY KEY,
    490:        version_number INTEGER NOT NULL,
    491:        lifecycle_status TEXT NOT NULL,
    493:        supersedes_template_version_id TEXT REFERENCES portfolio_template_versions(portfolio_template_version_id),
    498:        UNIQUE(portfolio_template_id,version_number)
    503:        portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
    517:        UNIQUE(portfolio_template_version_id,section_key)
    523:        portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
    534:CREATE TABLE portfolio_snapshots(portfolio_snapshot_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL,period_id TEXT NOT NULL,approved_portfolio_working_version_id TEXT NOT NULL,version_number INTEGER NOT NULL,publication_status TEXT NOT NULL,approved_by_user_id TEXT NOT NULL,published_at TEXT NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL);
    536:CREATE TABLE portfolio_version_items(portfolio_version_item_id TEXT PRIMARY KEY,portfolio_working_version_id TEXT NOT NULL REFERENCES portfolio_working_versions(portfolio_working_version_id),section_key TEXT NOT NULL,source_type TEXT NOT NULL,source_id TEXT,student_selected INTEGER NOT NULL,class_teacher_decision TEXT NOT NULL,display_order INTEGER NOT NULL,authorship_origin TEXT NOT NULL,student_text TEXT,decision_reason TEXT,decided_by_user_id TEXT,decided_at TEXT);
    538:CREATE TABLE portfolio_working_versions(portfolio_working_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL REFERENCES users(user_id),period_id TEXT NOT NULL,version_number INTEGER NOT NULL,supersedes_version_id TEXT,status TEXT NOT NULL,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,student_submitted_at TEXT,class_teacher_user_id TEXT,class_teacher_reviewed_at TEXT,approved_by_user_id TEXT,approved_at TEXT,published_snapshot_id TEXT,is_student_latest INTEGER NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL,UNIQUE(student_user_id,period_id,version_number));
    603:        rubric_version TEXT NOT NULL,
    616:CREATE TABLE question_bank_versions(
    617:        question_bank_version_id TEXT PRIMARY KEY,
    623:        version_number INTEGER NOT NULL,
    632:        UNIQUE(school_id,bank_code,version_number)
    637:    question_block_version_id TEXT NOT NULL REFERENCES question_block_versions(question_block_version_id),
    642:    question_version_id TEXT REFERENCES question_versions(question_version_id),
    653:    UNIQUE(question_block_version_id,display_order),
    654:    UNIQUE(question_block_version_id,item_key)
    657:CREATE TABLE question_block_versions(
    658:        question_block_version_id TEXT PRIMARY KEY,
    660:        version_number INTEGER NOT NULL,
    669:        supersedes_question_block_version_id TEXT,
    677:        UNIQUE(question_block_id,version_number)
    686:        latest_version_id TEXT,
    687:        current_published_version_id TEXT,
    723:CREATE TABLE question_versions(
    724:        question_version_id TEXT PRIMARY KEY,
    726:        question_bank_version_id TEXT NOT NULL REFERENCES question_bank_versions(question_bank_version_id),
    727:        version_number INTEGER NOT NULL,
    744:        approval_status TEXT NOT NULL,
    746:        supersedes_question_version_id TEXT,
    752:        UNIQUE(question_id,version_number)
    759:CREATE TABLE role_definition_versions(
    760:        role_definition_version_id TEXT PRIMARY KEY,
    762:        version_number INTEGER NOT NULL,
    763:        lifecycle_status TEXT NOT NULL,
    766:        supersedes_role_definition_version_id TEXT REFERENCES role_definition_versions(role_definition_version_id),
    771:        UNIQUE(role_id,version_number)
    774:CREATE TABLE role_version_capabilities(
    775:        role_version_capability_id TEXT PRIMARY KEY,
    776:        role_definition_version_id TEXT NOT NULL REFERENCES role_definition_versions(role_definition_version_id),
    783:        UNIQUE(role_definition_version_id,capability_id,effect,condition_key)
    803:        version TEXT NOT NULL,
    915:CREATE TABLE user_role_assignments(user_role_assignment_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(user_id),role_id TEXT NOT NULL REFERENCES role_definitions(role_id),role_definition_version_id TEXT NOT NULL REFERENCES role_definition_versions(role_definition_version_id),school_id TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,assigned_by_user_id TEXT,assigned_at TEXT,ended_reason TEXT);
    937:CREATE TABLE entity_lifecycle_events(
    938:  entity_lifecycle_event_id TEXT PRIMARY KEY,
    962:CREATE INDEX idx_approval_assignee ON approval_assignments(assignee_user_id,status);
    982:CREATE INDEX idx_portfolio_rubric ON portfolio_working_versions(rubric_catalogue_id,student_user_id,period_id);
    984:CREATE INDEX idx_portfolio_student ON portfolio_working_versions(student_user_id,period_id,version_number DESC);
    988:CREATE INDEX idx_portfolio_template_sections ON portfolio_template_sections(portfolio_template_version_id,parent_section_id,display_order);
    994:CREATE INDEX idx_question_block_versions_state ON question_block_versions(review_status,publication_status,respondent_role_code);
    998:CREATE INDEX idx_question_versions_search ON question_versions(question_bank_version_id,status,source_construct_en,ability_code);
    1006:CREATE INDEX idx_submissions_recipient ON assessment_submissions(assignment_recipient_id,revision_number DESC);
    1010:CREATE INDEX idx_role_version_capabilities ON role_version_capabilities(role_definition_version_id,status,capability_id);
    1016:CREATE INDEX idx_activity_labels_revision ON activity_label_assignments(activity_revision_id,status,axis_id);
    1022:CREATE INDEX idx_entity_lifecycle_target ON entity_lifecycle_events(entity_type,entity_id,occurred_at);
    1023:PRAGMA user_version=1;
    ✓ • 0ms

## Activity

    $ sed -n '460,540p;675,755p;755,785p;340,415p;930,955p' portfolio-poc-v2/server/repositories/schema.js
        rg -n 'portfolio_snapshots|activity_dependency_impacts|import_batch_events|entity_lifecycle_events|ai_candidate_decisions|approval_decisions' portfolio-poc-v2/server/repositories | cut -c1-240
            updated_by_user_id TEXT,
            updated_at TEXT NOT NULL
          );
    
    CREATE TABLE import_contract_versions(
            import_contract_version_id TEXT PRIMARY KEY,
            contract_code TEXT NOT NULL,
            version_number TEXT NOT NULL,
            target_entity_type TEXT NOT NULL,
            accepted_formats_json TEXT NOT NULL,
            status TEXT NOT NULL,
            created_by_user_id TEXT,
            created_at TEXT NOT NULL,
            disabled_reason TEXT,
            disabled_by_user_id TEXT,
            disabled_at TEXT,
            UNIQUE(contract_code,version_number)
          );
    
    CREATE TABLE import_record_corrections(
            import_record_correction_id TEXT PRIMARY KEY,
            import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
            field_name TEXT NOT NULL,
            before_value TEXT,
            after_value TEXT,
            original_student_id TEXT,
            resolved_student_id TEXT,
            correction_reason TEXT NOT NULL,
            corrected_by_user_id TEXT NOT NULL,
            corrected_at TEXT NOT NULL
          );
    
    CREATE TABLE import_record_decisions(
            import_record_decision_id TEXT PRIMARY KEY,
            import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
            decision TEXT NOT NULL,
            reason TEXT NOT NULL,
            decided_by_user_id TEXT NOT NULL,
            decided_at TEXT NOT NULL
          );
    
    CREATE TABLE import_record_links(
            import_record_link_id TEXT PRIMARY KEY,
            import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            entity_version_id TEXT,
            commit_action TEXT NOT NULL,
            reconciliation_status TEXT NOT NULL,
            committed_by_user_id TEXT,
            committed_at TEXT,
            notes TEXT
          );
    
    CREATE TABLE import_records(
            import_record_id TEXT PRIMARY KEY,
            import_batch_id TEXT NOT NULL REFERENCES import_batches(import_batch_id),
            row_number INTEGER NOT NULL,
            source_record_key TEXT NOT NULL,
            original_payload_json TEXT NOT NULL,
            normalized_payload_json TEXT NOT NULL,
            payload_sha256 TEXT NOT NULL,
            identity_status TEXT NOT NULL,
            validation_status TEXT NOT NULL,
            validation_errors_json TEXT NOT NULL,
            validation_warnings_json TEXT NOT NULL,
            resolved_user_id TEXT,
            current_decision TEXT NOT NULL,
            current_status TEXT NOT NULL,
            supersedes_import_record_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(import_batch_id,row_number),
            UNIQUE(import_batch_id,source_record_key)
          );
    
            confidence REAL,
            review_status TEXT NOT NULL,
            reviewed_by_user_id TEXT,
            reviewed_at TEXT,
            review_reason TEXT,
            corrected_content_text TEXT,
            supersedes_media_extraction_id TEXT,
            disabled_reason TEXT,
            disabled_by_user_id TEXT,
            disabled_at TEXT
          );
    
    CREATE TABLE portfolio_templates(
            portfolio_template_id TEXT PRIMARY KEY,
            owner_scope_type TEXT NOT NULL CHECK(owner_scope_type IN ('system','school')),
            school_id TEXT REFERENCES schools(school_id),
            template_code TEXT NOT NULL,
            name_en TEXT NOT NULL,
            name_zh TEXT NOT NULL,
            description_en TEXT,
            description_zh TEXT,
            status TEXT NOT NULL,
            created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
            created_at TEXT NOT NULL,
            UNIQUE(school_id,template_code)
          );
    
    CREATE TABLE portfolio_template_versions(
            portfolio_template_version_id TEXT PRIMARY KEY,
            portfolio_template_id TEXT NOT NULL REFERENCES portfolio_templates(portfolio_template_id),
            version_number INTEGER NOT NULL,
            lifecycle_status TEXT NOT NULL,
            manifest_sha256 TEXT NOT NULL,
            supersedes_template_version_id TEXT REFERENCES portfolio_template_versions(portfolio_template_version_id),
            created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
            created_at TEXT NOT NULL,
            published_by_user_id TEXT REFERENCES users(user_id),
            published_at TEXT,
            UNIQUE(portfolio_template_id,version_number)
          );
    
    CREATE TABLE portfolio_template_sections(
            portfolio_template_section_id TEXT PRIMARY KEY,
            portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
            section_key TEXT NOT NULL,
            title_en TEXT NOT NULL,
            title_zh TEXT NOT NULL,
            content_type TEXT NOT NULL,
            source_type TEXT NOT NULL,
            display_order INTEGER NOT NULL,
            parent_section_id TEXT REFERENCES portfolio_template_sections(portfolio_template_section_id),
            layout_region TEXT NOT NULL,
            visual_variant TEXT NOT NULL,
            presentation_mode TEXT NOT NULL CHECK(presentation_mode IN ('inline','disclosure','link_button')),
            default_expanded INTEGER NOT NULL,
            visible INTEGER NOT NULL,
            status TEXT NOT NULL,
            UNIQUE(portfolio_template_version_id,section_key)
          );
    
    CREATE TABLE school_portfolio_template_assignments(
            school_portfolio_template_assignment_id TEXT PRIMARY KEY,
            school_id TEXT NOT NULL REFERENCES schools(school_id),
            portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
            scope_type TEXT NOT NULL CHECK(scope_type IN ('school','grade','programme')),
            scope_id TEXT NOT NULL,
            effective_from TEXT NOT NULL,
            effective_until TEXT,
            status TEXT NOT NULL,
            assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
            assigned_at TEXT NOT NULL,
            reason TEXT NOT NULL
          );
    
    CREATE TABLE portfolio_snapshots(portfolio_snapshot_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL,period_id TEXT NOT NULL,approved_portfolio_working_version_id TEXT NOT NULL,version_number INTEGER NOT NULL,publication_status TEXT NOT NULL,approved_by_user_id TEXT NOT NULL,published_at TEXT NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL);
    
    CREATE TABLE portfolio_version_items(portfolio_version_item_id TEXT PRIMARY KEY,portfolio_working_version_id TEXT NOT NULL REFERENCES portfolio_working_versions(portfolio_working_version_id),section_key TEXT NOT NULL,source_type TEXT NOT NULL,source_id TEXT,student_selected INTEGER NOT NULL,class_teacher_decision TEXT NOT NULL,display_order INTEGER NOT NULL,authorship_origin TEXT NOT NULL,student_text TEXT,decision_reason TEXT,decided_by_user_id TEXT,decided_at TEXT);
    
    CREATE TABLE portfolio_working_versions(portfolio_working_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL REFERENCES users(user_id),period_id TEXT NOT NULL,version_number INTEGER NOT NULL,supersedes_version_id TEXT,status TEXT NOT NULL,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,student_submitted_at TEXT,class_teacher_user_id TEXT,class_teacher_reviewed_at TEXT,approved_by_user_id TEXT,approved_at TEXT,published_snapshot_id TEXT,is_student_latest INTEGER NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL,UNIQUE(student_user_id,period_id,version_number));
    
    CREATE TABLE proof_items(
            published_by_user_id TEXT,
            published_at TEXT,
            UNIQUE(question_block_id,version_number)
          );
    
    CREATE TABLE question_blocks(
            question_block_id TEXT PRIMARY KEY,
            school_id TEXT NOT NULL REFERENCES schools(school_id),
            block_code TEXT NOT NULL,
            name_en TEXT NOT NULL,
            name_zh TEXT NOT NULL,
            latest_version_id TEXT,
            current_published_version_id TEXT,
            operational_status TEXT NOT NULL,
            created_by_user_id TEXT,
            created_at TEXT NOT NULL,
            updated_by_user_id TEXT,
            updated_at TEXT,
            disabled_reason TEXT,
            disabled_by_user_id TEXT,
            disabled_at TEXT,
            UNIQUE(school_id,block_code)
          );
    
    CREATE TABLE question_definitions(
            question_id TEXT PRIMARY KEY,
            school_id TEXT NOT NULL REFERENCES schools(school_id),
            stable_code TEXT NOT NULL,
            created_by_user_id TEXT,
            created_at TEXT NOT NULL,
            operational_status TEXT NOT NULL,
            UNIQUE(school_id,stable_code)
          );
    
    CREATE TABLE question_responses(
            question_response_id TEXT PRIMARY KEY,
            assessment_submission_id TEXT NOT NULL REFERENCES assessment_submissions(assessment_submission_id),
            item_key TEXT NOT NULL,
            prompt_en TEXT NOT NULL,
            prompt_zh TEXT NOT NULL,
            text_value TEXT,
            raw_numeric_value REAL,
            authorship_origin TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(assessment_submission_id,item_key)
          );
    
    CREATE TABLE question_versions(
            question_version_id TEXT PRIMARY KEY,
            question_id TEXT NOT NULL REFERENCES question_definitions(question_id),
            question_bank_version_id TEXT NOT NULL REFERENCES question_bank_versions(question_bank_version_id),
            version_number INTEGER NOT NULL,
            source_sheet TEXT,
            source_row INTEGER,
            source_construct_en TEXT,
            source_construct_zh TEXT,
            subdomain TEXT,
            prompt_en TEXT,
            prompt_zh TEXT NOT NULL,
            response_type TEXT NOT NULL,
            scale_type TEXT,
            scale_options_json TEXT,
            is_negative INTEGER NOT NULL DEFAULT 0,
            ability_code TEXT,
            ability_name_en TEXT,
            ability_name_zh TEXT,
            ability_description_en TEXT,
            ability_description_zh TEXT,
            approval_status TEXT NOT NULL,
            status TEXT NOT NULL,
            supersedes_question_version_id TEXT,
            created_by_user_id TEXT,
            created_at TEXT NOT NULL,
            disabled_reason TEXT,
            disabled_by_user_id TEXT,
            disabled_at TEXT,
            UNIQUE(question_id,version_number)
          );
    
    CREATE TABLE role_capabilities(role_capability_id TEXT PRIMARY KEY,role_id TEXT NOT NULL REFERENCES role_definitions(role_id),capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),effect TEXT NOT NULL,condition_key TEXT,status TEXT NOT NULL,configured_by_user_id TEXT,configured_at TEXT);
    CREATE TABLE role_capabilities(role_capability_id TEXT PRIMARY KEY,role_id TEXT NOT NULL REFERENCES role_definitions(role_id),capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),effect TEXT NOT NULL,condition_key TEXT,status TEXT NOT NULL,configured_by_user_id TEXT,configured_at TEXT);
    
    CREATE TABLE role_definitions(role_id TEXT PRIMARY KEY,role_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,role_category TEXT NOT NULL,assignable INTEGER NOT NULL,description_en TEXT,description_zh TEXT,status TEXT NOT NULL);
    
    CREATE TABLE role_definition_versions(
            role_definition_version_id TEXT PRIMARY KEY,
            role_id TEXT NOT NULL REFERENCES role_definitions(role_id),
            version_number INTEGER NOT NULL,
            lifecycle_status TEXT NOT NULL,
            effective_from TEXT NOT NULL,
            effective_until TEXT,
            supersedes_role_definition_version_id TEXT REFERENCES role_definition_versions(role_definition_version_id),
            created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
            created_at TEXT NOT NULL,
            activated_by_user_id TEXT REFERENCES users(user_id),
            activated_at TEXT,
            UNIQUE(role_id,version_number)
          );
    
    CREATE TABLE role_version_capabilities(
            role_version_capability_id TEXT PRIMARY KEY,
            role_definition_version_id TEXT NOT NULL REFERENCES role_definition_versions(role_definition_version_id),
            capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),
            effect TEXT NOT NULL CHECK(effect IN ('allow','deny')),
            condition_key TEXT,
            status TEXT NOT NULL,
            configured_by_user_id TEXT NOT NULL REFERENCES users(user_id),
            configured_at TEXT NOT NULL,
            UNIQUE(role_definition_version_id,capability_id,effect,condition_key)
          );
    
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_by_user_id TEXT,
      updated_at TEXT,
      UNIQUE(activity_id,source_system_id,base_reference)
    );
    
    CREATE TABLE entity_lifecycle_events(
      entity_lifecycle_event_id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(school_id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      actor_user_id TEXT NOT NULL REFERENCES users(user_id),
      source_entity_type TEXT,
      source_entity_id TEXT,
      occurred_at TEXT NOT NULL
    );
    
    CREATE INDEX idx_activity_dependency_impacts ON activity_dependency_impacts(activity_id,impact_status,dependency_type);
    
    CREATE INDEX idx_activity_media_activity ON activity_media(activity_id,status,media_asset_id);
    
    portfolio-poc-v2/server/repositories/rubricRepository.js:61:      sql.run(`INSERT INTO import_batch_events(import_batch_event_id,import_batch_id,from_status,to_status,event_code,actor_user_id,reason,details_json,occurred_at) VALUES(?,?,?,?,
    portfolio-poc-v2/server/repositories/seed.js:41:  ['49_approval_decisions.csv', 'approval_decisions'],
    portfolio-poc-v2/server/repositories/seed.js:241:    sql.run(`INSERT OR IGNORE INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, `${batchId}-EVENT`, batchId, null, committed ? 'committed' : 'catalogued', 'seed.provenance_registered', ite
    portfolio-poc-v2/server/repositories/seed.js:255:      sql.run('INSERT INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_us
    portfolio-poc-v2/server/repositories/seed.js:363:    sql.run(`UPDATE portfolio_snapshots SET rubric_catalogue_id='RUB-SB-UF2' WHERE rubric_catalogue_id IS NULL`);
    portfolio-poc-v2/server/repositories/schema.js:25:CREATE TABLE activity_dependency_impacts(
    portfolio-poc-v2/server/repositories/schema.js:80:CREATE TABLE ai_candidate_decisions(
    portfolio-poc-v2/server/repositories/schema.js:128:CREATE TABLE approval_decisions(approval_decision_id TEXT PRIMARY KEY,approval_assignment_id TEXT NOT NULL REFERENCES approval_assignments(approval_assignment_id),school_id TEXT NOT NULL,st
    portfolio-poc-v2/server/repositories/schema.js:290:CREATE TABLE import_batch_events(
    portfolio-poc-v2/server/repositories/schema.js:534:CREATE TABLE portfolio_snapshots(portfolio_snapshot_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL,period_id TEXT NOT NULL,approved_portfolio_working_version_id T
    portfolio-poc-v2/server/repositories/schema.js:937:CREATE TABLE entity_lifecycle_events(
    portfolio-poc-v2/server/repositories/schema.js:952:CREATE INDEX idx_activity_dependency_impacts ON activity_dependency_impacts(activity_id,impact_status,dependency_type);
    portfolio-poc-v2/server/repositories/schema.js:970:CREATE INDEX idx_import_events_batch ON import_batch_events(import_batch_id,occurred_at);
    portfolio-poc-v2/server/repositories/schema.js:1022:CREATE INDEX idx_entity_lifecycle_target ON entity_lifecycle_events(entity_type,entity_id,occurred_at);
    portfolio-poc-v2/server/repositories/database.js:20:  const required = ['activity_label_assignments','activity_source_bindings','entity_lifecycle_events','portfolio_template_versions','role_definition_versions','school_rubric_assignments','
    portfolio-poc-v2/server/repositories/mediaRepository.js:53:      lifecycleEvents: sql.all(`SELECT event.*,event.entity_lifecycle_event_id media_lifecycle_event_id,event.entity_id media_asset_id,actor.name_en actor_name,actor.name_zh actor_n
    portfolio-poc-v2/server/repositories/mediaRepository.js:62:      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,
    portfolio-poc-v2/server/repositories/mediaRepository.js:76:      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,
    portfolio-poc-v2/server/repositories/activityRepository.js:16:    LEFT JOIN approval_decisions d ON d.approval_assignment_id=a.approval_assignment_id
    portfolio-poc-v2/server/repositories/activityRepository.js:61:        FROM entity_lifecycle_events event JOIN users actor ON actor.user_id=event.actor_user_id
    portfolio-poc-v2/server/repositories/activityRepository.js:63:      dependencyImpacts: sql.all(`SELECT * FROM activity_dependency_impacts WHERE activity_id=? ORDER BY triggered_at DESC`, activityId),
    portfolio-poc-v2/server/repositories/portfolioRepository.js:20:    const snapshot = sql.get(`SELECT * FROM portfolio_snapshots WHERE student_user_id=? AND period_id=? AND publication_status='published' ORDER BY version_number DESC LIMIT 1`,
    portfolio-poc-v2/server/repositories/portfolioRepository.js:51:      sql.run(`INSERT OR IGNORE INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publicati
    portfolio-poc-v2/server/repositories/aiRepository.js:9:      FROM ai_candidate_decisions d JOIN users u ON u.user_id=d.decided_by_user_id
    portfolio-poc-v2/server/repositories/aiRepository.js:39:      sql.run(`INSERT INTO ai_candidate_decisions(decision_id,candidate_id,outcome,reason,decided_by_user_id,decided_at) VALUES(?,?,?,?,?,?)`, record.id, record.candidateId, record.out
    portfolio-poc-v2/server/repositories/approvalRepository.js:26:      LEFT JOIN approval_decisions d ON d.approval_assignment_id=a.approval_assignment_id
    portfolio-poc-v2/server/repositories/approvalRepository.js:43:      sql.run(`INSERT INTO approval_decisions(approval_decision_id,approval_assignment_id,school_id,step_number,outcome,reason,decided_by_user_id,used_capability_id,used_scope_ty
    portfolio-poc-v2/server/repositories/importRepository.js:60:      events: sql.all('SELECT * FROM import_batch_events WHERE import_batch_id=? ORDER BY occurred_at', batchId),
    portfolio-poc-v2/server/repositories/importRepository.js:73:      sql.run(`INSERT INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, event.id, batch.id, null, batch.status, event.code, event.actorId || null, event.reason, JSON.stringify(e
    portfolio-poc-v2/server/repositories/importRepository.js:111:    sql.run('INSERT INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)', event.id, event.batchId, event.fromStatus || null, event.toStatus, event.code, event.actorId || null, even
    portfolio-poc-v2/server/repositories/importRepository.js:157:    const addImpact = (activityId, recordId, type, id, status, impactReason) => sql.run(`INSERT INTO activity_dependency_impacts VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    portfolio-poc-v2/server/repositories/importRepository.js:189:          sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,source_entity_ty
    portfolio-poc-v2/server/repositories/importRepository.js:200:          sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,source_entity_ty
    ✓ • 0ms

## Assistant

Your proposed pattern can reduce the table count while retaining version history: **each version is a row in the main record table, with a stable group ID, version number, approval status and a link to the previous version**. Approval then applies to a specific row. A shared event log records who did what and why.

Based on the schema and the repository paths inspected, I recommend **11 table reductions as a practical first target**, bringing **83 tables to approximately 72**. This is an architectural assessment, not a claim that tables can be dropped from the existing database today: the queries, relationships, seed data and existing records must be migrated and tested.

| Current tables | Proposed consolidation | Reduction | Conditions for preserving behaviour |
|---|---|---:|---|
| `activities` + `activity_revisions` | One `activities` table, one row per version | 1 | Keep a stable activity group ID; distinguish latest draft from approved/published version; update roster, labels and links to point to the correct identity or version. |
| `question_definitions` + `question_versions` | One versioned `questions` table | 1 | Preserve stable question identity, exact referenced version, source and ability fields. |
| `question_blocks` + `question_block_versions` | One versioned `question_blocks` table | 1 | Form versions must continue to reference the exact block version. |
| `portfolio_templates` + `portfolio_template_versions` | One versioned `portfolio_templates` table | 1 | Keep school ownership, version-specific sections and the exact template used by a Portfolio. |
| `role_definitions` + `role_definition_versions` | One versioned `roles` table | 1 | Assignments must retain the exact role version and its capability grants; version changes must not silently alter past authority. |
| `portfolio_working_versions` + `portfolio_snapshots` | One versioned `portfolios` table | 1 | A published row must remain frozen and identifiable when a new draft exists. Preserve publication details and frozen inputs. |
| `audit_events` + `entity_lifecycle_events` + `import_batch_events` | One shared `event_log` | 2 | Extend the log to retain each event’s actor, reason, timestamps, status changes, source and import details. Update all history screens. |
| `import_record_corrections` + `import_record_decisions` + shared `event_log` | Store correction and decision history in the shared log | 2 | Retain field-level before/after values, identity resolution, decisions and reasons; keep original import payloads intact. |
| `role_capabilities` + `role_version_capabilities` | Keep the versioned grant table and seed it directly | 1 | Replace the setup process that currently derives versioned grants from `role_capabilities`. |

The proposed versioned-record structure is already partly present in v2: for example, `assessment_submissions` stores successive revisions in the same table. The activity split is therefore a particularly useful place to apply your approach consistently. See the [schema](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/schema.js:21) and [activity revision writes](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/activityRepository.js:159).

I would **not automatically merge every related table**. `approval_assignments` represents work assigned to a person, while `approval_decisions` records the decision; they can be simplified only if the desired approval workflow supports it. Likewise, `question_responses`, `proof_items`, and `proof_links` represent different things: an answer, accepted proof, and its use as evidence. Combining them risks losing provenance. The current architecture also requires a published result to remain traceable to the exact version and reviewer decision.

There is one additional possible reduction: `department_subjects` has no direct runtime reference in the server search and could be removed if that mapping is outside MVP scope, taking the target to **71 tables**. That is a scope decision rather than a merge.

These estimates preserve the current functional intent; they have not yet been validated with a migration or tests. No schema or application changes have been made.

## User

i find that the current database does not have upsert? what are other common databse ones? or the database command already have the upsert equavalant, which is cleaner

## Assistant

I’ll check which database v2 uses and how its repositories currently insert and update records, then compare the cleaner options for this project.

## Activity

    $ rg -n -i 'on conflict|insert or replace|insert or ignore|\bupsert\b|transaction|begin' portfolio-poc-v2/server/repositories | head -75
        cat portfolio-poc-v2/server/repositories/database.js | head -70
    portfolio-poc-v2/server/repositories/rubricRepository.js:56:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/rubricRepository.js:57:      sql.run(`INSERT OR IGNORE INTO source_systems(source_system_id,school_id,source_code,name_en,name_zh,source_purpose,connector_type,status,created_by_user_id,created_at,updated_by_user_id,updated_at) VALUES('SRC-RUBRIC-UPLOAD',?,'rubric_package_upload','Rubric package upload','Rubric 套件上載','rubric_import','manual_upload','active',?,?,?,?)`, record.schoolId, record.actorId, record.at, record.actorId, record.at);
    portfolio-poc-v2/server/repositories/rubricRepository.js:58:      sql.run(`INSERT OR IGNORE INTO import_contract_versions(import_contract_version_id,contract_code,version_number,target_entity_type,accepted_formats_json,status,created_by_user_id,created_at) VALUES('ICV-RUBRIC-PACKAGE-1','rubric_package','1.0','rubric_catalogue','["xlsx"]','active',?,?)`, record.actorId, record.at);
    portfolio-poc-v2/server/repositories/rubricRepository.js:74:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/rubricRepository.js:88:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/seed.js:77:  const statement = `INSERT OR IGNORE INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`;
    portfolio-poc-v2/server/repositories/seed.js:110:  for (const row of definitions) sql.run(`INSERT OR IGNORE INTO definition_sources(definition_source_id,school_id,source_kind,source_code,name_en,name_zh,version,source_reference,content_sha256,status,uploaded_by_user_id,uploaded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, ...row);
    portfolio-poc-v2/server/repositories/seed.js:122:  for (const row of capabilityRows) sql.run(`INSERT OR IGNORE INTO capability_definitions VALUES(?,?,?,?,?,?,?)`, ...row);
    portfolio-poc-v2/server/repositories/seed.js:144:  for (const row of grantRows) sql.run(`INSERT OR IGNORE INTO role_capabilities(role_capability_id,role_id,capability_id,effect,condition_key,status,configured_by_user_id,configured_at) VALUES(?,?,?,?,?,'active','USR-ADM-001',?)`, ...row, stamp);
    portfolio-poc-v2/server/repositories/seed.js:145:  sql.run(`INSERT OR IGNORE INTO role_version_capabilities(role_version_capability_id,role_definition_version_id,capability_id,effect,condition_key,status,configured_by_user_id,configured_at)
    portfolio-poc-v2/server/repositories/seed.js:161:    sql.run(`INSERT OR IGNORE INTO question_blocks(question_block_id,school_id,block_code,name_en,name_zh,latest_version_id,current_published_version_id,operational_status,created_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, blockId, 'BHSS', `${block.form_template_id}:${block.section_code}`, nameEn, nameZh, versionId, block.publication_status === 'published' ? versionId : null, 'active', block.approved_by_user_id || 'USR-ST-001', block.approved_at || stamp, stamp);
    portfolio-poc-v2/server/repositories/seed.js:162:    sql.run(`INSERT OR IGNORE INTO question_block_versions(question_block_version_id,question_block_id,version_number,name_en,name_zh,respondent_role_code,review_status,publication_status,created_by_user_id,created_at,approved_by_user_id,approved_at,published_by_user_id,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, versionId, blockId, 1, nameEn, nameZh, block.respondent_role_code, block.review_status, block.publication_status, block.approved_by_user_id || 'USR-ST-001', block.approved_at || stamp, block.approved_by_user_id, block.approved_at, block.published_by_user_id, block.published_at);
    portfolio-poc-v2/server/repositories/seed.js:163:    sql.run(`INSERT OR IGNORE INTO form_version_blocks VALUES(?,?,?)`, block.form_version_id, versionId, block.first_order);
    portfolio-poc-v2/server/repositories/seed.js:164:    block.items.forEach((item, index) => sql.run(`INSERT OR IGNORE INTO question_block_items(question_block_item_id,question_block_version_id,display_order,item_key,question_id,question_version_id,required,item_type,prompt_en,prompt_zh,respondent_role_code,answer_scale,ability_code,ability_name_en,ability_name_zh,proof_intent) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `${versionId}-ITEM-${index + 1}`, versionId, index + 1, item.item_key, item.question_id || null, null, valueFor('required', item.required), item.item_type, item.prompt_en, item.prompt_zh, item.respondent_role_code, item.answer_scale || null, item.ability_code || null, item.ability_name_en || null, item.ability_name_zh || null, item.proof_intent || null));
    portfolio-poc-v2/server/repositories/seed.js:172:    sql.run(`INSERT OR IGNORE INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, row.activity_rubric_label_id, row.activity_id, revision.latest_revision_id, row.rubric_catalogue_id, row.axis_id, catalogue.version, row.label_role, 'import_contract', row.notes || null, 'approved', row.assigned_by_user_id, row.assigned_at, row.status || 'active');
    portfolio-poc-v2/server/repositories/seed.js:176:  for (const row of sourceRows) sql.run(`INSERT OR IGNORE INTO source_systems(source_system_id,school_id,source_code,name_en,name_zh,source_purpose,connector_type,authentication_profile_ref,resolution_mode,allowed_reference_pattern,returns_metadata,returns_short_lived_url,returns_streamed_bytes,notes,status,media_status,created_by_user_id,created_at,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, canonicalMediaSourceId(row.media_source_id), row.school_id, row.source_code, row.name_en, row.name_zh, 'media', row.connector_type, row.authentication_profile_ref, row.resolution_mode, row.allowed_reference_pattern, valueFor('returns_metadata', row.returns_metadata), valueFor('returns_short_lived_url', row.returns_short_lived_url), valueFor('returns_streamed_bytes', row.returns_streamed_bytes), row.notes, 'active', row.status, 'USR-ADM-001', stamp, 'USR-ADM-001', stamp);
    portfolio-poc-v2/server/repositories/seed.js:178:  for (const row of externalRows) sql.run(`INSERT OR IGNORE INTO external_media_references(external_media_reference_id,source_system_id,opaque_reference,student_id,activity_id,proof_item_id,content_type_hint,captured_at,consent_status,last_resolution_status,last_resolved_at,availability_status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, row.external_media_reference_id, canonicalMediaSourceId(row.media_source_id), row.opaque_reference, row.student_id || null, row.activity_id || null, row.proof_item_id || null, row.content_type_hint || null, row.captured_at || null, row.consent_status, row.last_resolution_status || null, row.last_resolved_at || null, row.availability_status, row.notes || null);
    portfolio-poc-v2/server/repositories/seed.js:183:    sql.run(`INSERT OR IGNORE INTO media_assets(media_asset_id,school_id,owner_user_id,uploaded_by_user_id,uploaded_at,title,original_file_name,media_type,mime_type,source_system_id,external_media_reference_id,checksum_sha256,consent_status,visibility,moderation_status,processing_status,captured_at,retention_review_date,operational_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, row.media_id, 'BHSS', row.student_id || null, row.uploader_user_id, row.captured_at, row.original_filename, row.original_filename, row.media_type, mimeByType[row.media_type] || 'application/octet-stream', row.media_source_id ? canonicalMediaSourceId(row.media_source_id) : null, row.external_media_reference_id || null, row.checksum_sha256 || null, row.consent_status, row.access_scope, moderation, row.processing_status, row.captured_at, row.retention_review_date || null, 'active', row.captured_at);
    portfolio-poc-v2/server/repositories/seed.js:184:    sql.run(`INSERT OR IGNORE INTO activity_media VALUES(?,?,?,?,?,?,?)`, `AM-${row.activity_id}-${row.media_id}`, row.activity_id, row.media_id, 'activity_evidence', row.uploader_user_id, row.captured_at, 'active');
    portfolio-poc-v2/server/repositories/seed.js:185:    if (row.transcript_id) sql.run(`INSERT OR IGNORE INTO media_extractions(media_extraction_id,media_asset_id,extraction_type,provider_key,processing_status,requested_by_user_id,requested_at,processed_finished_at,review_status) VALUES(?,?,?,?,?,?,?,?,?)`, row.transcript_id, row.media_id, 'speech_transcription', 'imported_reference', 'succeeded', row.uploader_user_id, row.captured_at, row.captured_at, row.teacher_verified === 'true' ? 'accepted' : 'waiting_for_review');
    portfolio-poc-v2/server/repositories/seed.js:193:  sql.run(`INSERT OR IGNORE INTO question_bank_versions(question_bank_version_id,school_id,definition_source_id,bank_code,name_en,name_zh,version_number,status,created_by_user_id,created_at,activated_by_user_id,activated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, bankId, 'BHSS', 'DS-QUESTION-BANK-SUPPLIED', 'SUPPLIED-10-CONSTRUCTS', 'Supplied ten-construct question bank', '原始十項能力問卷題庫', 1, 'active', 'USR-ADM-001', stamp, 'USR-ADM-001', stamp);
    portfolio-poc-v2/server/repositories/seed.js:200:    sql.run(`INSERT OR IGNORE INTO question_definitions(question_id,school_id,stable_code,created_by_user_id,created_at,operational_status) VALUES(?,?,?,?,?,?)`, questionId, 'BHSS', questionId, 'USR-ADM-001', stamp, 'active');
    portfolio-poc-v2/server/repositories/seed.js:201:    sql.run(`INSERT OR IGNORE INTO question_versions(question_version_id,question_id,question_bank_version_id,version_number,source_sheet,source_row,source_construct_en,source_construct_zh,subdomain,prompt_en,prompt_zh,response_type,scale_type,scale_options_json,is_negative,ability_code,ability_name_en,ability_name_zh,ability_description_en,ability_description_zh,approval_status,status,created_by_user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, versionId, questionId, bankId, 1, row.source_sheet, row.source_row, row.source_construct_en, row.source_construct_zh, overlay?.subdomain || null, overlay?.prompt_en || row.prompt_en || null, row.prompt_zh, row.response_type, row.scale_type || overlay?.scale_type || null, overlay ? JSON.stringify([1,2,3,4,5,6].map(index => overlay[`score_${index}_label`]).filter(Boolean)) : null, overlay?.is_negative === 'true' ? 1 : 0, overlay?.ability_code || row.ability_code || null, overlay?.ability_name_en || row.ability_name_en || null, overlay?.ability_name_zh || row.ability_name_zh || null, overlay?.ability_description_en || null, overlay?.ability_description_zh || null, overlay?.approval_status || row.approval_status, 'active', 'USR-ADM-001', stamp);
    portfolio-poc-v2/server/repositories/seed.js:212:  for (const source of sources) sql.run(`INSERT OR IGNORE INTO source_systems(source_system_id,school_id,source_code,name_en,name_zh,connector_type,endpoint_env_key,authentication_profile_ref,status,import_status,created_by_user_id,created_at,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'active',?,?,?,?)`, source[0], 'BHSS', ...source.slice(1), 'active', 'USR-ADM-001', '2026-08-20T08:00:00+08:00', 'USR-ADM-001', seededAt);
    portfolio-poc-v2/server/repositories/seed.js:214:  sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'ICV-ACTIVITY-ROSTER-1', 'activity_roster', '1.0', 'activity_person', JSON.stringify(['csv','xlsx','connector_json']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    portfolio-poc-v2/server/repositories/seed.js:215:  sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'ICV-ACTIVITY-CATALOGUE-1', 'activity_catalogue', '1.0', 'activity_revision', JSON.stringify(['csv','xlsx']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    portfolio-poc-v2/server/repositories/seed.js:225:    sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, contractId, item.record_type, item.schema_version, item.record_type, JSON.stringify(['csv']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    portfolio-poc-v2/server/repositories/seed.js:227:      sql.run(`INSERT OR IGNORE INTO import_batches(import_batch_id,external_batch_key,school_id,source_system_id,import_contract_version_id,target_entity_type,target_entity_id,ingress_channel,source_relative_path,original_file_name,content_type,content_sha256,source_uploaded_at,uploaded_by_user_id,service_actor_id,received_at,parsed_at,validated_at,committed_at,committed_by_user_id,seeded_at,processing_status,declared_processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,updated_by_user_id,updated_at)
    portfolio-poc-v2/server/repositories/seed.js:238:      sql.run(`INSERT OR IGNORE INTO import_records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, recordId, batchId, index + 2, sourceKey, JSON.stringify(row), JSON.stringify(row), digest(JSON.stringify(row)), 'not_applicable', 'valid', '[]', '[]', null, 'included', committed ? 'committed' : 'catalogued', null, seededAt, seededAt);
    portfolio-poc-v2/server/repositories/seed.js:239:      if (committed) sql.run(`INSERT OR IGNORE INTO import_record_links VALUES(?,?,?,?,?,?,?,?,?,?)`, `${recordId}-LINK`, recordId, item.record_type, sourceKey, null, 'seeded', 'current', item.uploaded_by_user_id, seededAt, `Seeded from output/import-examples/${item.source_file}`);
    portfolio-poc-v2/server/repositories/seed.js:241:    sql.run(`INSERT OR IGNORE INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, `${batchId}-EVENT`, batchId, null, committed ? 'committed' : 'catalogued', 'seed.provenance_registered', item.uploaded_by_user_id, 'Registered from the CSV contract manifest without rewriting the original source rows.', JSON.stringify({ sourceRelativePath: `output/import-examples/${item.source_file}`, seededAt }), seededAt);
    portfolio-poc-v2/server/repositories/seed.js:247:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/seed.js:262:  sql.transaction(() => {
    portfolio-poc-v2/server/repositories/seed.js:301:    sql.run(`INSERT OR IGNORE INTO capability_definitions VALUES(?,?,?,?,?,?,?)`, 'CAP-AI-DRAFT-REVIEW', 'portfolio.ai_draft.review', 'Review AI Portfolio drafts', '覆核 AI Portfolio 草稿', 'portfolio', 1, 'active');
    portfolio-poc-v2/server/repositories/seed.js:302:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-CLASS-AI-REVIEW', 'ROLE-CLASS-TEACHER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'assigned_student_only', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:303:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-PORTAPP-AI-REVIEW', 'ROLE-PORTFOLIO-APPROVER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'named_or_school_scope', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:304:    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-ACTAPP-PUBLISH', 'ROLE-ACTIVITY-APPROVER', 'CAP-ACTIVITY-PUBLISH', 'allow', 'named_assignment_required', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:305:    sql.run(`INSERT OR IGNORE INTO approval_policy_versions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'APOL-ACTPUB-v1', 'BHSS', 'activity_publication', 1, 'single_reviewer', 'school', 'BHSS', 1, 1, 0, 1, 'activity_publication', 240, 1440, 'active', '2026-08-20', null, 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:306:    sql.run(`INSERT OR IGNORE INTO approval_policy_steps VALUES(?,?,?,?,?,?,?,?,?,?)`, 'ASTEP-ACTPUB-1', 'APOL-ACTPUB-v1', 1, 'Activity publication', '活動發布', 'CAP-ACTIVITY-PUBLISH', 'named_or_self_if_allowed', 1, 1, 'active');
    portfolio-poc-v2/server/repositories/seed.js:312:    for (const [revisionId, activityId, itemId] of activityVaskRows) sql.run(`INSERT OR IGNORE INTO activity_label_assignments(activity_label_assignment_id,activity_id,activity_revision_id,rubric_catalogue_id,axis_id,catalogue_version,label_role,source,rationale,approval_state,assigned_by_user_id,assigned_at,status) VALUES(?,?,?,?,?,'2026','descriptor','import_contract','Imported activity intention','approved','USR-ST-001','2026-10-29T09:00:00+08:00','active')`, `ALA-${revisionId}-${itemId}`, activityId, revisionId, 'RUB-VASK-2026', itemId);
    portfolio-poc-v2/server/repositories/seed.js:313:    for (const [revisionId, flag] of [['AREV-COMM-001','none'],['AREV-COMM-002','none'],['AREV-SELF-001','off_site'],['AREV-SELF-001','image_capture'],['AREV-SPORT-001','image_capture'],['AREV-PRESS-001','image_capture']]) sql.run(`INSERT OR IGNORE INTO activity_revision_risk_flags VALUES(?,?)`, revisionId, flag);
    portfolio-poc-v2/server/repositories/seed.js:314:    sql.run(`INSERT OR IGNORE INTO ai_input_manifests VALUES(?,?,?,?,?,?,?,?,?,?)`, 'MANIFEST-S1-P1', 'BHSS', 'USR-S-001', '2026-27-P1', '2026-27-P1', 'non_academic_personal_growth', 'learner-profile-v1', 'approved', 'USR-T-001', '2027-01-15T09:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:320:    for (const source of sources) sql.run(`INSERT OR IGNORE INTO ai_manifest_sources VALUES(?,?,?,?,?,?,?)`, source[0], 'MANIFEST-S1-P1', ...source.slice(1));
    portfolio-poc-v2/server/repositories/seed.js:321:    sql.run(`INSERT OR IGNORE INTO ai_draft_candidates VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'CANDIDATE-STUB-A', 'MANIFEST-S1-P1', 'local-contract-stub', 'not-connected', 'learner-profile-v1', 'Alex is a thoughtful learner who adapts after setbacks and supports classmates through practical action.', 'Alex 是一位處事周詳的學習者，遇到挫折後懂得調整，亦會以實際行動支持同學。', JSON.stringify(['ACT-COMM-001','PROOF-S1-TEAMWORK','OBS-S1-RESILIENCE']), 'pending_review', null, '2027-01-15T09:05:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:322:    sql.run(`INSERT OR IGNORE INTO ai_draft_candidates VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'CANDIDATE-STUB-B', 'MANIFEST-S1-P1', 'comparison-contract-stub', 'not-connected', 'learner-profile-v1-alt', 'Alex listens carefully, responds positively to feedback and is developing more consistent follow-through.', 'Alex 能細心聆聽，積極回應意見，並正逐步建立更穩定的跟進習慣。', JSON.stringify(['ACT-COMM-001','PROOF-S1-REFLECTION','OBS-S1-FOLLOW-UP']), 'pending_review', null, '2027-01-15T09:06:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:340:      sql.run(`INSERT OR IGNORE INTO assignment_recipients(assignment_recipient_id,assessment_assignment_id,respondent_user_id,subject_user_id,reviewer_user_id,perspective,status,created_at,assigned_by_user_id,assigner_role_assignment_id,due_at,moderation_required,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, recipientId, assignmentId, respondentId, subjectId, reviewerId, perspective, status, peer?.assigned_at || '2026-10-16T16:05:00+08:00', peer?.assigned_by_user_id || reviewerId || null, peer?.assigner_role_assignment_id || null, peer?.due_at || null, valueFor('moderation_required', peer?.moderation_required || 'false'), peer?.notes || null);
    portfolio-poc-v2/server/repositories/seed.js:343:    sql.run(`INSERT OR IGNORE INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'SUB-COMM-S1-v1', 'AR-SELF-COMM-S1', 1, null, 'student_self_report', 'approved', 'accepted', 'unpublished', '2026-09-18T10:52:00+08:00', 'USR-T-001', '2026-09-19T16:05:00+08:00', 'The source-linked reflection was checked by the assigned teacher.', '2026-09-18T10:45:00+08:00', '2026-09-19T16:05:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:348:    for (const [id,key,en,zh] of studentResponses) sql.run(`INSERT OR IGNORE INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, id, 'SUB-COMM-S1-v1', key, en, zh, en, null, 'human_authored', '2026-09-18T10:50:00+08:00', '2026-09-18T10:52:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:350:    sql.run(`INSERT OR IGNORE INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'SUB-TEACH-COMM-S1-v1', 'AR-TEACH-COMM-S1', 1, null, 'teacher_observation', 'approved', 'accepted', 'published_to_portfolio', '2026-09-19T16:00:00+08:00', 'USR-T-001', '2026-09-19T16:05:00+08:00', 'Teacher observation confirmed with a source-linked behaviour example.', '2026-09-19T15:55:00+08:00', '2026-09-19T16:05:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:356:    for (const [id,key,en,zh] of teacherResponses) sql.run(`INSERT OR IGNORE INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, id, 'SUB-TEACH-COMM-S1-v1', key, en, zh, en, null, 'human_authored', '2026-09-19T16:00:00+08:00', '2026-09-19T16:00:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:357:    sql.run(`INSERT OR IGNORE INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'FDB-001', 'ACT-COMM-001', 'USR-S-001', 'USR-T-001', 'SUB-TEACH-COMM-S1-v1', 'teacher_assessment', 'Listened and paraphrased a peer before responding.', '2026-09-19T16:00:00+08:00', 'teacher_observation', 'confirmed', 'published_to_portfolio', '2026-09-19T16:00:00+08:00', '2026-09-19T16:05:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:358:    sql.run(`INSERT OR IGNORE INTO proof_links VALUES(?,?,?,?,?,?,?,?,?)`, 'PL-FEEDBACK-001', 'PRF-FEEDBACK-001', 'feedback', 'FDB-001', 'behaviour_example', 'USR-T-001', '2026-09-19T16:00:00+08:00', 'active', 'Teacher-confirmed behaviour example.');
    portfolio-poc-v2/server/repositories/seed.js:359:    sql.run(`INSERT OR IGNORE INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'OBS-001', 'FDB-001', 'AX-SB-LISTEN', 5, 4, 'The student demonstrated attentive listening before responding.', 6, 'confirmed', 1, 1, 'USR-T-001', 'Included in the published P1 evidence set.', '2026-09-19T16:05:00+08:00');
    portfolio-poc-v2/server/repositories/seed.js:361:    sql.run(`INSERT OR IGNORE INTO proud_moment_windows VALUES(?,?,?,?,?,?,?)`, '2026-27-P1', 'BHSS', 'open', '2026-12-01T08:00:00+08:00', '2027-02-28T17:00:00+08:00', 24, 'USR-ST-001');
    portfolio-poc-v2/server/repositories/seed.js:368:      sql.run(`INSERT OR IGNORE INTO activity_source_bindings(activity_source_binding_id,school_id,activity_id,source_system_id,base_reference,validation_mode,status,created_by_user_id,created_at)
    portfolio-poc-v2/server/repositories/activityRepository.js:134:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/activityRepository.js:159:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/activityRepository.js:179:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/activityRepository.js:199:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/aiRepository.js:38:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/mediaRepository.js:59:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/mediaRepository.js:73:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/approvalRepository.js:42:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/database.js:31:  transaction(work) {
    portfolio-poc-v2/server/repositories/database.js:32:    db.exec('BEGIN');
    portfolio-poc-v2/server/repositories/database.js:50:  sql.transaction(() => seedQuestionBankDomain(sql, questionBank, csvDirectory));
    portfolio-poc-v2/server/repositories/portfolioRepository.js:30:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/portfolioRepository.js:40:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/portfolioRepository.js:50:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/portfolioRepository.js:51:      sql.run(`INSERT OR IGNORE INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_user_id,published_at,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, snapshotId, version.school_id, version.student_user_id, version.period_id, versionId, version.version_number, 'published', actorId, publishedAt, version.rubric_catalogue_id, version.portfolio_template_version_id, version.template_manifest_sha256);
    portfolio-poc-v2/server/repositories/assessmentRepository.js:65:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/assessmentRepository.js:74:          ON CONFLICT(assessment_submission_id,item_key) DO UPDATE SET text_value=excluded.text_value,updated_at=excluded.updated_at`,
    portfolio-poc-v2/server/repositories/assessmentRepository.js:81:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/assessmentRepository.js:91:    sql.transaction(() => {
    portfolio-poc-v2/server/repositories/assessmentRepository.js:99:          sql.run(`INSERT OR IGNORE INTO proof_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofId, 'PT-RESPONSE', recipientRow.subject_user_id, recipientRow.activity_id, 'question_response', answer.question_response_id, recipientRow.perspective, answer.text_value || 'Accepted response', reviewedAt, recipientRow.respondent_user_id, 'source_linked', 'accepted', 'reviewers_only', reviewedAt, null);
    import { DatabaseSync } from 'node:sqlite';
    import { dirname, resolve } from 'node:path';
    import { fileURLToPath } from 'node:url';
    import { schema, schemaVersion } from './schema.js';
    import { loadQuestionBank } from '../adapters/questionBankSource.js';
    import { seedFromContracts, seedQuestionBankDomain } from './seed.js';
    
    const here = dirname(fileURLToPath(import.meta.url));
    const defaultDatabase = resolve(here, '../../playground-v2.sqlite');
    export const db = new DatabaseSync(process.env.POC_V2_DB || defaultDatabase);
    
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
    
    const applicationTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
    if (!applicationTables.length) {
      db.exec(schema);
    } else {
      const userVersion = Number(db.prepare('PRAGMA user_version').get().user_version || 0);
      const names = new Set(applicationTables.map(row => row.name));
      const required = ['activity_label_assignments','activity_source_bindings','entity_lifecycle_events','portfolio_template_versions','role_definition_versions','school_rubric_assignments','source_systems'];
      const retired = ['schema_migrations','activity_vask_items','form_items','peer_review_assignments','media_source_definitions'];
      if (userVersion !== 1 || required.some(name => !names.has(name)) || retired.some(name => names.has(name))) {
        throw new Error(`Database does not match ${schemaVersion}. This POC has no migration path; run "npm run db:reset" to rebuild it.`);
      }
    }
    
    export const sql = {
      all(statement, ...params) { return db.prepare(statement).all(...params); },
      get(statement, ...params) { return db.prepare(statement).get(...params); },
      run(statement, ...params) { return db.prepare(statement).run(...params); },
      transaction(work) {
        db.exec('BEGIN');
        try {
          const value = work();
          db.exec('COMMIT');
          return value;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    };
    
    const seedMode = String(process.env.POC_V2_SEED_MODE || 'demo').toLowerCase();
    if (!['demo', 'none'].includes(seedMode)) throw new Error('POC_V2_SEED_MODE must be "demo" or "none"');
    if (seedMode === 'demo') {
      const csvDirectory = process.env.POC_V2_CSV_DIR || resolve(here, '../../../output/import-examples');
      seedFromContracts(sql, csvDirectory);
      const questionBank = await loadQuestionBank();
      sql.transaction(() => seedQuestionBankDomain(sql, questionBank, csvDirectory));
    }
    ✓ • 0ms

## Assistant

V2 uses **SQLite**, and SQLite already supports upsert. The code uses it when saving a draft question response:

```sql
INSERT INTO question_responses (...)
VALUES (...)
ON CONFLICT (assessment_submission_id, item_key)
DO UPDATE SET
  text_value = excluded.text_value,
  updated_at = excluded.updated_at;
```

If that submission already has a response for the same question, this updates it; otherwise, it inserts one. See [assessmentRepository.js](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/portfolio-poc-v2/server/repositories/assessmentRepository.js:72).

The project’s `sql` helper has `run`, `get`, `all` and `transaction`, but no separate `upsert()` method. That is fine: **upsert is expressed as SQL through `sql.run()`**, so it does not need its own database wrapper.

| Operation | Purpose | Useful in BHSS |
|---|---|---|
| `SELECT` | Read records | Retrieve activities, responses and portfolios |
| `INSERT` | Add a new record | Create a new activity version or approval decision |
| `UPDATE` | Change an existing record | Change a draft or mark an assignment submitted |
| `DELETE` | Remove a record | Limited cases; many BHSS records require history or soft disable |
| `INSERT … ON CONFLICT … DO UPDATE` | Insert, or update when a unique key already exists | Save a mutable draft response |
| `INSERT … ON CONFLICT … DO NOTHING` | Insert, or leave an existing matching record alone | Set up a known reference record |
| `BEGIN` / `COMMIT` / `ROLLBACK` | Make a group of changes succeed or fail together | Save a submission and its associated records together |

V2 also uses `INSERT OR IGNORE`, especially in seed data. This **does not update** an existing record. For new code, I would generally prefer `ON CONFLICT (specific_key) DO NOTHING` when a duplicate is expected: it makes the intended conflict explicit. I would avoid using `INSERT OR REPLACE` as an upsert shortcut, because SQLite’s replace behaviour can delete the conflicting row and insert another, with consequences for relationships and history.

For your versioning model, the clean rule is:

- **Editable draft:** use an upsert when there is a clear unique key and updating that draft is allowed.
- **Submitted, approved or published record:** insert a **new version row** for changes, then submit it for approval. An upsert that overwrites the approved row would lose the previous state.
- **Actions involving several records:** wrap the writes in a transaction. Upsert handles a conflict on a row; it does not replace the approval workflow, version history or audit log.

So the cleaner choice is to use SQLite’s existing `ON CONFLICT` syntax where the business rule is truly “create or update,” and ordinary `INSERT` when the rule is “create a new version.”

## User

so now, when compared to the newest functional flow, because we have a bigger say on how the things could be done - when compared to the SRS, and this document, with the entities, how many places that still remain how we should do the thing? BHSS internal system analyst functional flow nRetention.docx

let's say that the design, we will provide a lot later but mostly it will be provided by us

## Assistant

I’ll find the document and compare its entity and workflow instructions with the latest functional flow and SRS. I’ll count the places that prescribe implementation, distinguishing school requirements from design decisions your team can own.

## Activity

    $ rg --files | rg -i 'nretention|functional flow|srs|readme.md$' | head -100
    portfolio-poc-v2/srs-implementation-gap.md
    portfolio-poc-v2/README.md
    README.md
    portfolio-poc-v4/README.md
    output/BHSS internal system analyst functional flow period assessment.docx
    output/BHSS internal system analyst functional flow.docx
    output/BHSS internal system analyst functional flow nRetention.docx
    playground/README.md
    output/BHSS internal system analyst functional flow deadlines.docx
    output/BHSS internal system analyst functional flow assessment.docx
    output/BHSS internal system analyst functional flow media formats.docx
    output/Chinese/README.md
    portfolio-poc-v4/planning/README.md
    portfolio-poc-v4/planning/srs-rewrite-map.csv
    output/Chinese/SRS/SRS-10 AI輔助處理及來源記錄.md
    output/Chinese/SRS/SRS-06 任務提交及同儕互評.md
    output/Chinese/SRS/SRS-07 佐證媒體同意及校外成就.md
    output/Chinese/SRS/README.md
    output/Chinese/SRS/SRS-08 評估八項技能及十六階段.md
    output/Chinese/SRS/SRS-09 Portfolio Proud Moments及匯出.md
    output/Chinese/SRS/SRS-05 表格問題區塊及管治.md
    output/Chinese/SRS/SRS-00 產品範圍及需求索引.md
    output/Chinese/SRS/SRS-12 頁面目錄及角色可見範圍.md
    output/Chinese/SRS/SRS-01 身份工作階段及存取控制.md
    output/Chinese/SRS/SRS-03 資料來源匯入及數據質素.md
    output/Chinese/SRS/SRS-02 學校結構及學年時段.md
    output/Chinese/SRS/SRS-04 活動參加者及VASK.md
    output/Chinese/SRS/SRS-11 基礎設施保安及營運.md
    output/Chinese/SRS/SRS-13 範圍v2 Rubric處理及學習者Portfolio.md
    output/~$SS internal system analyst functional flow nRetention.docx
    output/BHSS internal system analyst functional flow reporting periods.docx
    output/BHSS internal system analyst functional flow exception cases.docx
    output/BHSS internal system analyst functional flow revised.docx
    output/BHSS internal system analyst functional flow table margins.docx
    output/BHSS internal system analyst functional flow media library.docx
    output/English/README.md
    portfolio-poc-v3/README.md
    output/import-examples/schema-review/nretention-validation.json
    output/import-examples/schema-review/nretention-flow-coverage.csv
    output/import-examples/schema-review/nretention-condensed-tables.csv
    output/import-examples/schema-review/nretention-source-manifest.json
    output/import-examples/schema-review/srs-fit-assessment.csv
    output/English/SRS/SRS-10 AI-assisted processing and provenance.md
    output/English/SRS/SRS-11 Infrastructure security and operations.md
    output/English/SRS/SRS-05 Forms question blocks and governance.md
    output/English/SRS/SRS-13 Scope v2 rubric processing and learner profile.md
    output/English/SRS/SRS-01 Identity sessions and access control.md
    output/English/SRS/SRS-08 Assessment eight skills and sixteen steps.md
    output/English/SRS/SRS-00 Product scope and requirements index.md
    output/English/SRS/SRS-06 Assignments submissions and peer review.md
    output/English/SRS/SRS-07 Evidence media consent and external achievements.md
    output/English/SRS/SRS-02 School structure and academic periods.md
    output/English/SRS/README.md
    output/English/SRS/SRS-04 Activities participants and VASK.md
    output/English/SRS/SRS-12 Page catalogue and role visibility.md
    output/English/SRS/SRS-03 Source systems imports and data quality.md
    output/English/SRS/SRS-09 Portfolio Proud Moments and exports.md
    pre-porfolio-poc/README.md
    output/import-examples/stage-1/README.md
    portfolio-poc/README.md
    ✓ • 0ms

## Activity

    $ ls -lt output/*functional*docx
        cat output/import-examples/schema-review/nretention-validation.json
        head -15 output/import-examples/schema-review/srs-fit-assessment.csv
        head -10 output/import-examples/schema-review/nretention-flow-coverage.csv
        cat output/English/SRS/README.md | head -70
        python3 - <<'PY'
        from docx import Document
        p='output/BHSS internal system analyst functional flow nRetention.docx'
        d=Document(p)
        print('PARAGRAPHS',len(d.paragraphs),'TABLES',len(d.tables))
        for x in d.paragraphs:
         if x.text.strip(): print(x.text)
        for i,t in enumerate(d.tables):
         print('\nTABLE',i+1,'ROWS',len(t.rows))
         for row in t.rows:
          print(' | '.join(c.text.replace('\n',' / ') for c in row.cells))
        PY
    -rw-r--r--@ 1 useroctopus-tech.com  staff      162 Nov 19 11:01 output/~$SS internal system analyst functional flow nRetention.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  2199862 Nov 18 18:21 output/BHSS internal system analyst functional flow nRetention.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  2209118 Nov 18 16:18 output/BHSS internal system analyst functional flow media formats.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1410951 Nov 18 11:13 output/BHSS internal system analyst functional flow.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1447292 Nov 17 17:41 output/BHSS internal system analyst functional flow table margins.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1446676 Nov 17 17:29 output/BHSS internal system analyst functional flow deadlines.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1442675 Nov 17 17:06 output/BHSS internal system analyst functional flow exception cases.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1432996 Nov 17 16:20 output/BHSS internal system analyst functional flow reporting periods.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1429037 Nov 17 16:08 output/BHSS internal system analyst functional flow period assessment.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1419469 Nov 17 15:32 output/BHSS internal system analyst functional flow revised.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1330296 Nov 17 12:53 output/BHSS internal system analyst functional flow media library.docx
    -rw-r--r--@ 1 useroctopus-tech.com  staff  1422415 Nov 17 12:52 output/BHSS internal system analyst functional flow assessment.docx
    {
      "status": "pass",
      "source_unchanged": true,
      "tables": 18,
      "functional_flow_groups": 25,
      "checks": [
        "Distinct table names and populated columns/merge/constraints/source fields",
        "All functional coverage table references resolve within the 18-table set",
        "All proposal download links resolve",
        "Original nRetention document hash unchanged"
      ],
      "scope": "Proposal only; no runtime or migration validation"
    }
    requirement_id,source_file,source_line,requirement_statement,source_status,source_phase,starter_verdict,initial_tables,required_extensions,assessment,verification_limit
    PRD-FR-001,output/English/SRS/SRS-00 Product scope and requirements index.md,43,"Every material record shall retain creator, source, timestamps, current lifecycle state and immutable historical references.",Confirmed working decision,P1,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-002,output/English/SRS/SRS-00 Product scope and requirements index.md,44,"Processing inclusion, content review and student visibility shall be independent states.",Confirmed working decision M-09/M-19,P0,STARTER_DATA_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Separate content_status, processing_status and visibility_status enum fields meet the storage distinction; do not replace them with one universal status.",Design assessment only; not runtime compliance evidence
    PRD-FR-003,output/English/SRS/SRS-00 Product scope and requirements index.md,45,"Missing, not collected, not applicable, excluded and zero shall not be treated as equivalent.",Confirmed for missing; remaining distinctions Policy TBD M-13,P1,POLICY_OPEN,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,Distinct missing/excluded/zero statuses can be stored directly; unresolved policy is not settled by reducing tables.,Design assessment only; not runtime compliance evidence
    PRD-FR-004,output/English/SRS/SRS-00 Product scope and requirements index.md,46,"A published output shall use a frozen, versioned snapshot rather than mutable live records.",Recommended architecture,P1,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-005,output/English/SRS/SRS-00 Product scope and requirements index.md,47,"Every page and API action shall enforce role, assignment scope, lifecycle state and, for raw media, consent/access grant.",Recommended architecture,P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-006,output/English/SRS/SRS-00 Product scope and requirements index.md,48,"Every numeric input shall display and enforce its minimum and maximum in UI, API and persistence validation.",Recommended architecture,P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-007,output/English/SRS/SRS-00 Product scope and requirements index.md,49,Unresolved requirements shall be displayed as `Policy TBD`; temporary caps shall remain configurable and separately labelled.,Confirmed documentation rule,P0,POLICY_OPEN,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,Distinct missing/excluded/zero statuses can be stored directly; unresolved policy is not settled by reducing tables.,Design assessment only; not runtime compliance evidence
    PRD-FR-008,output/English/SRS/SRS-00 Product scope and requirements index.md,50,"English and Chinese requirement sets shall share the same IDs, enums, limits and meanings.",Confirmed documentation rule,P0,NON_SCHEMA,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Bilingual IDs and meanings require documentation alignment, not another table.",Design assessment only; not runtime compliance evidence
    PRD-FR-009,output/English/SRS/SRS-00 Product scope and requirements index.md,51,"The current product shall use one documented core activity contract rather than arbitrary per-school schemas. School sanitation, platform validation, preview, and approval remain separate responsibilities.",Approved POC interpretation V2-A01,P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-010,output/English/SRS/SRS-00 Product scope and requirements index.md,52,"Descriptive labels and formal assessment records shall remain distinct, even when a label names a rubric axis.",Approved POC interpretation V2-B01,P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-011,output/English/SRS/SRS-00 Product scope and requirements index.md,53,"Model-assisted processing shall produce review candidates with provenance, never an automatically published identity, evidence claim, or skill step.",Approved POC interpretation V2-B05–B08,P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-012,output/English/SRS/SRS-00 Product scope and requirements index.md,54,"The Portfolio shall consolidate school, teacher, student and authorized-staff evidence so non-academic participation and demonstrated abilities remain visible and traceable.",Discussed on Meeting Oct 26 - kickstart,P1,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-013,output/English/SRS/SRS-00 Product scope and requirements index.md,55,Media may be resolved from school-approved external stores through server-side connectors; raw paths and storage credentials shall not be exposed to browser clients.,Partly addressed L-08; Discussed on Meeting Oct 26 - kickstart,P1,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    PRD-FR-014,output/English/SRS/SRS-00 Product scope and requirements index.md,56,"Every school-owned record shall be bound to a `school_id`, directly or through an enforced parent relation; identifiers from another school shall be rejected without disclosing the record.","Approved System Analyst architecture decision, 27 Oct 2026",P0,CONDITIONAL_FIT,activities; submissions; proof_items; audit_events,X02 X06 X10 X12 X13 X15,"Cross-cutting rules require frozen references, separate state dimensions, scoped services and source-linked outputs.",Design assessment only; not runtime compliance evidence
    id,functional_flow,source_blocks,tables,handling
    C01,School setup and low-volume definitions,B9; B60; B79–84,"schools, users, assignments, periods",Version-pin roles/policies/group identifiers in school settings; no per-action role table.
    C02,"Years, reporting periods and assessment points",B19–28; B298,"periods, portfolios, assessments",Typed period rows; freeze exact selected reporting-period IDs.
    C03,"Roster, staff responsibility and attendance",B68–71; B88.R5; B101–107,"assignments, activity_records, work_items, history_events",Separate assignment kinds and attendance fields; absent/unknown participant is reviewable work.
    C04,Activity revisions and concurrent edits,B32; B105; B142; B306.R5,"activity_records, work_items, history_events",Stable root; current-approved versus latest proposal; base-version conflict checks.
    C05,Multiple assessment stages and early end,B138–148,"activity_records, response_tasks, work_items, history_events",Stage parent validates; preserve stage/form snapshots and explicit future-stage treatment.
    C06,Deadline extensions and late work,B110–116; B139; B143,"activity_records, response_tasks, history_events",Conflict B139/B143 remains a policy choice. Current and at-submission comparisons remain reproducible.
    C07,Question definitions and form publication,B117–122; B88.R7–8,"questions, forms, work_items, history_events",Versioned school bank/block settings and immutable question/form expansions; definition and answer imports remain separate.
    C08,Peer invites and explicit reviewer/subject task,B98–99; B123–128; B304,"work_items, response_tasks, assignments",Code issue/redemption is traceable; explicit task exists before any peer response is accepted; expiry/eligibility open.
    C09,"Staged imports, correction and repeated source",B87–95; B129–137; B306,"work_items, history_events","Batch parent plus child row work items; immutable original input, expected version, resolved ID and explicit commit outcome."
    # BHSS Growth Portfolio — SRS index
    
    ## Purpose
    
    This directory contains the modular Software Requirements Specification for the BHSS Growth Portfolio. It converts the current architecture into testable requirements without treating unresolved school policy as confirmed.
    
    The matching Hong Kong Traditional Chinese edition is in [`../../Chinese/SRS/`](../../Chinese/SRS/). Requirement IDs, limits, states, and decision references are identical in both editions.
    
    ## Source precedence
    
    1. Original supplied documents are evidence and remain unchanged.
    2. [`../Core data relationships.md`](../Core%20data%20relationships.md) is the current architectural baseline.
    3. [`../Roles and permissions.md`](../Roles%20and%20permissions.md) defines the access model.
    4. [`../Discussion questions.md`](../Discussion%20questions.md) controls unresolved decisions.
    5. [`../Current findings and questions v2.md`](../Current%20findings%20and%20questions%20v2.md) isolates the latest meeting update by certainty level.
    6. The runnable `mock/` demonstrates possibilities; it is not the authority when it conflicts with the documents above.
    
    ## Requirement status labels
    
    | Label | Meaning |
    |---|---|
    | Source requirement | Directly supported by a supplied source. |
    | Confirmed working decision | Agreed for the current architecture, subject to formal client sign-off. |
    | Recommended architecture | A concrete implementation recommendation awaiting confirmation. |
    | Policy TBD | Business rule still requiring a named decision owner. |
    | Temporary safety cap | Configurable technical limit used until policy is confirmed. |
    
    ## Modules
    
    | File | Subject |
    |---|---|
    | [SRS-00](SRS-00%20Product%20scope%20and%20requirements%20index.md) | Scope, phases, shared rules, validation catalogue and traceability |
    | [SRS-01](SRS-01%20Identity%20sessions%20and%20access%20control.md) | Authentication, roles, scopes, permissions and audit |
    | [SRS-02](SRS-02%20School%20structure%20and%20academic%20periods.md) | School isolation, feature availability, students, membership history and rollover |
    | [SRS-03](SRS-03%20Source%20systems%20imports%20and%20data%20quality.md) | CSV/XLSX imports, matching, correction and reconciliation |
    | [SRS-04](SRS-04%20Activities%20participants%20and%20VASK.md) | Activities, staff, students, VASK and approval |
    | [SRS-05](SRS-05%20Forms%20question%20blocks%20and%20governance.md) | Forms, question-owned abilities, Proof List registration, versions and approval |
    | [SRS-06](SRS-06%20Assignments%20submissions%20and%20peer%20review.md) | Assignments, responses, review and peer allocation |
    | [SRS-07](SRS-07%20Evidence%20media%20consent%20and%20external%20achievements.md) | Uploads, consent, moderation, source-level exclusion and certificates |
    | [SRS-08](SRS-08%20Assessment%20eight%20skills%20and%20sixteen%20steps.md) | Source-type comparison, selected evidence and 1–16 steps |
    | [SRS-09](SRS-09%20Portfolio%20Proud%20Moments%20and%20exports.md) | Portfolio snapshots, source trace, withdrawal and external delivery |
    | [SRS-10](SRS-10%20AI-assisted%20processing%20and%20provenance.md) | Provider-neutral contracts, parallel AI candidates, provenance and human review |
    | [SRS-11](SRS-11%20Infrastructure%20security%20and%20operations.md) | Deployment, dependency cascades, storage, jobs, backup and monitoring |
    | [SRS-12](SRS-12%20Page%20catalogue%20and%20role%20visibility.md) | Pages, source-comparison controls, navigation and role-specific visibility |
    | [SRS-13](SRS-13%20Scope%20v2%20rubric%20processing%20and%20learner%20profile.md) | Core input, attendance, observable processing, manual correction and learner-profile provenance |
    
    ## Shared interpretation rule
    
    Where a policy is unresolved, the SRS states both `Policy TBD` and a separately labelled temporary technical cap. A temporary cap prevents accidental unbounded input; it does not answer the school-policy question.
    
    
    ## Alignment checkpoint 18 November 2026
    
    See the parent README alignment table. ACT-FR-026, SUB-FR-012–013 and ASM-FR-024–026 carry current internal direction; they do not assert implementation. Security and data-retention design is deferred for the current functional-definition phase. Media upload limits and peer-code assignment authority remain explicitly unresolved differences; existing temporary caps and assignment requirements are not silently replaced by DOCX examples.
    PARAGRAPHS 249 TABLES 29
    BHSS Portfolio System Functional Flow
    The platform records secondary students’ academic and non-academic learning across lessons, school activities and other experiences. It brings together participation, student reflection, teacher and peer feedback, and evidence such as photographs, recordings and student work. Authorised staff review the material and use it to prepare a continuing student Portfolio and assessment results.
    This internal guide explains the terminology, who may perform each action, the information entered, how the system processes it, and the outputs available to each recipient. The original design is the starting point; school policy and the questions listed at the end remain subject to confirmation.
    Working status: the invite-code and Excel workflows reflect the System Analyst’s current direction. The document describes the intended system and does not claim that every workflow is already implemented or approved by BHSS or JC.
    Current scope decision: detailed security design and data-retention policy will be dealt with in a later phase. This functional review focuses on features, responsible users, inputs, processing and outputs. Role responsibilities and permitted views remain part of the functional description; security mechanisms, retention periods and deletion arrangements below are future design considerations, not requirements to finalise in this phase. Status: not BHSS or JC approval.
    How to read this document
    Start with the journey below, then use the roles and input catalogue to identify the responsible person and information required. Processing explains review and assessment; Output explains what each recipient receives. The exception catalogue covers alternative paths. Confirmed architecture, System Analyst direction, proposed contracts and open school decisions are distinguished; prototype examples do not establish school policy.
    Input and processing flow
    Platform operations enables the school service. SchoolAdmin sets up school users, roles and periods; assigned staff prepare forms, labels and rubrics under their separate approval workflows.
    Teachers create or import an activity, assign participants and staff, and configure its default end-stage questionnaire. Authorised editors may add start/progress/custom assessment stages with their own published questionnaire versions and schedules.
    Confirm actual attendance against the planned roster.
    Collect student, teacher and peer responses, observations, feedback and permitted media.
    Register accepted material as Proof List items.
    Assign a rubric during review; an authorised reviewer includes or excludes evidence with reasons.
    Create or update the student Portfolio working version.
    Review, return, approve and publish the Portfolio or assessment snapshot.
    Show the published result or export it through the recipient’s permitted view.
    Terminology and system layout
    Academic years periods and reports
    Learning-experience types describe what a student does, such as a lesson, camp or club. Periods describe when that experience takes place. An assessment point is when progress is reviewed; a Portfolio reporting window is the set of periods included in an output.
    Example assessment timeline from the original design
    The supplied design image illustrates Form 1 in the 2026/27 school year. It shows activities accumulating throughout the year and three assessment points.
    How the timeline operates in the platform
    In the current stage, the default skill result is the highest eligible activity result in the chosen reporting window. If that window has none, an eligible previous-year result is shown as inherited; if there is no eligible prior result, the 50% position is a clearly labelled not-yet-assessed placeholder. It is not a confirmed skill level.
    Source: Design ideas.docx, the skills assessment timeline image (Form 1 example). Related open decisions: H-08 on school-year and period rules and the reporting-cadence questions in the meeting follow-up.
    Kinds of learning experience
    An activity is a recorded learning experience. One may be both academic and non-academic. An existing platform from BHSS “Time Infinity” contains school-hosted activities that took place outside.
    One activity instance records an actual occurrence, its date, participants and corresponding form. A material change creates a revision under the same activity identity. A reporting period groups records within a school year; dates determine the containing period.
    Kinds of evidence and media
    Activity media library
    The activity Media Library groups photos, recordings, transcripts and other permitted media linked to one activity. Users open it from the activity’s Media Library tab.
    The student view lists confirmed student-linked items permitted for student viewing. Assigned staff can also review permitted staff-only material; assessment eligibility is a separate setting.
    Evidence is anything accepted as relevant to a student’s experience or development, including media, comment or form response from assessor. The system retains the source, student, activity, author, perspective, date and review status where applicable.
    Original media, transcripts, extracts and published summaries have separate access permissions. The platform should support common formats: JPG, PNG, HEIC and WebP images; MP3, WAV and M4A audio; MP4 and MOV video; PDF, Word, Excel and PowerPoint documents; and TXT, SRT and VTT text or transcript files.
    Proposed configurable per-file limits, pending format and capacity confirmation: images 50 MB; audio 100 MB; video 2 GB; documents 100 MB; text or transcripts 20 MB. These are working defaults, not approved school policy or a statement of tested production support.
    Other terms used in the workflow
    A form is a versioned set of ordered sections and questions. A response is one person’s answer; a submission groups answers for a task. A reviewer is the person assigned to examine a specific item. An approver or publisher is an eligible person assigned to make the relevant workflow decision. The Proof List preserves accepted source-linked evidence. A rubric observation records what an assessor judged the evidence to support; a published snapshot freezes the final reviewed result.
    Labels and assessment rubrics
    Descriptive labels
    A descriptive label identifies what an activity or evidence item is about. Examples including:
    VASK (VASK清單.docx)
    Label allows searching, filtering and interpreting activities; a label contains no ordered assessment levels and does not award a skill result.
    Custom labelling is allowed if the activity requires extra labels outside of the VASK.
    Assessment rubrics
    An assessment rubric needs versioned axes, ordered levels, descriptions and concrete evidence conditions. Prove the Skills Builder eight-skill, 16-step path first. RC360 is a separate planned rubric whose official axes, levels and evidence rules still require confirmation; it is not yet an equivalent ready-to-use assessment contract.
    RC360 — planned, subject to the official rubric package.
    Skills Builder — initial assessment path, with the selected framework version preserved.
    The system initially proposes the highest supported activity level for the same rubric version and axis. An assigned teacher reviews the supporting evidence and confirms the result or selects another permitted method, as described in Assessment processing.
    Access control and role responsibilities
    Access control dictates read and write permissions for system records. Authorization is processed as follows:
    Authentication: The user logs in using their assigned identity.
    Evaluation: The server evaluates the user's assigned capabilities, scopes, the current record state, and any required consent or named approval assignments.
    Roles permissions and field visibility
    Media permissions are separate
    For each media item and relevant student, the system controls student visibility, authorised staff access and assessment eligibility separately. Hiding an item from the student does not automatically prevent an authorised teacher from reviewing it or an authorised assessment process from using it.
    SchoolAdmin configures policy of teacher groups / student access, but does not automatically gain content or raw-media access.
    Teacher and staff roles
    A person can hold more than one role and functional assignment. The examples below describe common responsibilities.
    A position is not permission. The server combines identity, effective functional role, capability, scope, explicit deny, lifecycle and workflow assignment. A named approval assignment is separate from role membership.
    Security design deferred to a later phase
    Deferred scope: the following security mechanisms are retained as future design considerations. Detailed security, privacy and technical architecture will be studied and confirmed in a later phase. Source: Design ideas.docx, “第二步：將資料導入 Local AI 系統”, which explicitly places data security, access management, privacy protection and technical architecture in the next phase. The five embedded design images focus on functional inputs, assessment and Portfolio outputs; they do not define security controls or a retention schedule.
    Server creates a revocable opaque session; browser receives an HttpOnly cookie and request-protection key.
    Each protected request reloads current access context and checks school, role, scope, feature availability and lifecycle.
    Logout, suspension and sensitive access changes revoke sessions.
    Developer or Postman test accounts may be scoped for testing, but it must still authenticate; there is no production tokenless bypass.
    User role and period administration
    User identity, position, functional role, scope and approval assignment are separate records.
    Role assignments pin a role-definition version, scope and effective dates.
    SchoolAdmin imports or maintains users with Excel templates.
    Suspension preserves history and audit records; hard deletion is not the normal user-removal action.
    Activity dates inside one period resolve automatically. Cross-period activities propose the ending period under configurable policy and require a valid staff selection where missing. The default P0 display remains undefined; see L-09.
    Input
    Input catalogue and example records
    The preferred user-facing exchange is an Excel template. Existing CSV examples demonstrate the underlying record shapes; they are not interchangeable upload files. Use the template for the intended operation. A media attachment is evidence, not a structured import merely because it is an Excel or Word file. Schools prepare data to the documented contract; no per-school schema-mapping engine is assumed.
    What an activity result means
    Use separate fields and records for attendance (attended/absent), completion or service hours, an award or placing, a questionnaire answer, a teacher observation and a published rubric level. These are different outcomes. Neither attendance, an award title nor a questionnaire score automatically awards one of the 16 Skills Builder steps.
    Worked examples from the existing dummy contracts
    Source and readiness: CSV and v2 schema that simulates the data inpu, provides operation-specific template examples. The v2 schema contains separate activity, participant, proof and Portfolio records; not every CSV is implemented as a live import or domain table. No current result table is simulated.
    Validation and corrections
    Users need to match stable source/student identifiers, verify dates and required values, and distinguish new, changed, invalid and unchanged rows. Do not guess an ambiguous identity. For academic marks, require the named grading scheme; for answers, distinguish missing, blank and not applicable. Preserve source and correction history. Ordinary activity imports are partial updates: an omitted activity is unchanged, while disable/restore is explicit.
    Who enters each input
    The school supplies the context and the people involved contribute different parts of the student record. The server checks the identity and scope of each contribution; the examples below do not grant automatic access.
    For peer review, system requires students to invite another student after the event using the activity code. The code identifies an activity; it is not permission to view the other student’s private Portfolio.
    Input is information entering the system through a person, an Excel workbook or an approved source. Each input is checked against the relevant school, identity, activity, form and reporting-period context before it becomes a usable record.
    Activities and attendance
    Create a draft with activity details, dates, staff, planned roster, VASK, activity labels, form version and media rules.
    Submit for the configured approval or publication path.
    Confirm actual attendance after the event.
    Material changes create a successor activity revision and follow the configured approval path. The one-calendar-month response due date below is not an activity-amendment cutoff.
    A planned participant marked absent creates a staff-approval exception.
    Withdraw or disable explicitly with an actor, reason and timestamp.
    Activity media library input
    Activity response due dates and overdue status
    Students and assigned teachers are expected to complete activity responses by the activity due time. The default is one calendar month after the activity ends. An authorised person may set a longer deadline for an activity or extend it after the original due date has passed. Exact authority, month-end calculation and time zone remain school-policy details.
    A due date marks when work becomes overdue; it does not automatically close the task. An assigned student or teacher may continue editing a draft or submit late unless a separate, configured closing, access or lifecycle rule prevents it. A submitted revision stays frozen until an authorised reviewer returns or reopens it; a later correction cannot silently change a published Portfolio.
    One extension is one auditable action. It records the activity, previous and new due time, actor, reason, recorded/effective time and any required approval. The original deadline and every later change remain in history. The current effective deadline follows the configured approval rules.
    The submission stores when it was submitted; it does not carry an authoritative permanent overdue flag. The system derives the status by comparing the submission time, or the current time for unfinished work, with the appropriate activity deadline history. A report can show both the deadline in force at submission and the current deadline after an extension, with the comparison basis identified.
    Example: an activity ends on 1 March and is originally due on 1 April. A student submits on 5 April. On 10 April, an authorised staff member extends the due date to 1 June. The submission is late against the deadline in force on 5 April, but on time against the current 1 June deadline. The extension does not erase the earlier deadline or the submission timestamp.
    The notification channel, cutoff inclusivity, calendar-month edge cases and any independent hard-close policy remain for confirmation.
    Forms questions and responses
    Form-definition Excel controls sections, question blocks & questions, order, audience, source, meaning and ability definition.
    Editing reusable questions or a published form creates a successor draft for review. Existing assignments keep their published form version until explicit publication and assignment decisions.
    Response-entry is a separate template containing recipients, activity, form and question keys.
    Accepted responses become Proof List items before rubric review.
    A question does not automatically map to VASK, Skills Builder or RC360.
    Peer review invitation
    After the activity reaches its peer-review point, the student opens the invite action.
    The student shares an activity invite code with another student.
    The peer signs in and enters the code.
    The peer response is labelled peer perspective and remains subject to teacher or authorised moderation.
    Peer feedback alone does not publish an official skill level.
    Excel import and export contracts
    Export an Excel template with stable IDs, required columns, allowed values and instructions.
    User fills the template without changing protected keys.
    Upload the workbook; server validates file type, columns, values, school scope, references and lifecycle state.
    Show a staged preview with new, changed, disabled, invalid and unchanged rows, users need to click Confirm to apply the changes.
    Authorised user corrects errors or excludes rows with reasons.
    Commit accepted rows with batch ID, actor, timestamp and source provenance.
    Multi-stage activity assessment
    An activity has one or more assessment/feedback stages. Default to one end-stage assessmen
    ... command output truncated for persistence ...
     activities, reflections, observations, feedback, selected evidence and published skill results.
    Evidence | Information that may help describe or review a student. | Includes responses, observations, feedback, media, certificates and external references.
    VASK | Values, Attitudes, Skills and Knowledge. | Labelling of activities, it does not give a level or score.
    Skills Builder | Assessment rubric 1: An eight-skill framework with 16 steps per skill, used by BHSS. | Provides one assessment structure for human-reviewed development levels.
    RC360 | Assessment rubric 2: A rubric provided by JC  | May provide another assessment structure after its official axes, levels and evidence rules are confirmed.
    Label or catalogue | A descriptive classification. | Groups or describes activity intent, evidence context or category; it is not an assessment result.
    Proof List | The normalized list of accepted evidence items. | Connects responses and proof to the question, activity, student, reviewer and later rubric review.
    Snapshot | A frozen published version. | Preserves the exact evidence, rubric version, decisions and source links used at publication.
    
    TABLE 7 ROWS 6
    Role | Main responsibilities | Typical access boundary
    Student | Join activities; complete reflections and self-evaluation; upload permitted evidence; complete assigned peer review; request corrections; view own published Portfolio. | Own records and assigned tasks only.
    Teacher | Create or edit assigned activities; confirm attendance; provide observations, comments and initial ratings; review assigned students; act as class teacher where assigned. | Assigned activities, students, classes or programmes.
    SuperTeacher or authorised staff | Review activities, forms, evidence and rubric observations; moderate identity issues; include or exclude proof; publish or withdraw when assigned. | Delegated review scope and named workflow assignments.
    SchoolAdmin | Manage users, roles, scopes, periods, policies, imports, versions, audit logs and feature configuration. | School-wide administration; raw media and assessment decisions remain separately controlled.
    Platform operations | Disable or re-enable schools and manage hosted feature availability. | Service metadata only; no automatic school-content access.
    
    TABLE 8 ROWS 4
    Control | Meaning | Example
    Student visibility | Whether the student may discover and open the item or a permitted derivative. | A photo is hidden from the student while an authorised teacher reviews it.
    Teacher or staff access | Which assigned people may view the original, transcript or other derivative. | An activity teacher can open a staff-only recording; unrelated staff cannot.
    Assessment eligibility | Whether the accepted item or approved extract may be considered in a rubric review or permitted assessment request. | A reviewer uses a permitted transcript extract even though the student cannot open the source recording.
    
    TABLE 9 ROWS 9
    Role or assignment | Typical action
    Subject teacher | Records learning and observations within the subjects, classes or activities assigned to them.
    Activity owner or creator | Creates the activity and its intended learning context; manages its assigned roster and permitted revisions; attendance, evidence or feedback.
    Supporting teacher or teaching assistant | Confirms attendance, contributes responses and observations, and manages evidence within explicit assignment. Editing activity content requires delegated permission; supporting assignment does not confer ownership, removal or approval authority.
    Assessor | Records a source-linked observation and proposed level within assigned student and rubric scope.
    Class teacher or mentoring teacher | Reviews assigned students’ Portfolio content and progress; may return work or submit a reviewed version for approval.
    SuperTeacher or authorised reviewer | Reviews assigned evidence, forms and observations; makes delegated include, exclude or approval decisions.
    SchoolAdmin | Maintains school users, role assignments, periods and policy; content approval requires a separate assignment.
    Platform operations administrator | Manages service-level school and feature availability without automatic access to student records.
    
    TABLE 10 ROWS 8
    Record or field | Student | Teacher / authorised staff | SchoolAdmin
    Identity and contact | Own permitted data; correction request. | View-only | Create, import, update, suspend, restore and archive.
    Activity  | Input reflection | Dates, description, participants, staff, labels, form and observations within scope. | Catalogue, policy, assignments and import rules.
    Teacher comments | View-only | Writes comments for assigned evidence or Portfolio review. | Audit
    Peer review | Completes assigned review; invites a peer after an event with the activity code. | Audit reviews | Configures policy and moderation rules.
    Rubric levels | View only | Proposes or confirms observations when assigned. | Manages versions and policy; no result authority merely from admin role.
    Portfolio | Edit own introduction and permitted media/activity selections; the Proud Moments selection limit remains open under V2-D11. | Reviews, returns, comments and submits assigned Portfolio version. | Configures template, visibility and publication policy.
    Media | Uploads certificates | Uploads activity media | Configures consent, retention and media access policy.
    
    TABLE 11 ROWS 12
    Input | Who and format | Basic content | What it produces
    School people and periods | SchoolAdmin or delegated importer; Excel or administration form | Student/staff identifier, name, class/group and effective period; school-year/period identifier and dates. Role and review assignments are separate. | Validated identities and dated memberships used by all later inputs.
    School academic results | School-authorised importer; proposed dedicated Excel contract | Student identifier, subject, exam/assessment, year/period, date, mark or grade, named grading scale, source record key. Exact columns remain proposed. | Subject attainment as supporting evidence; not a Skills Builder step.
    Activity catalogue | Activity owner or authorised importer; activity Excel template | Stable activity ID for updates; title, type, description, dates, owner, staff, labels and exact form version for each released assessment stage. Import operation and expected revision are required where applicable. | Activity draft or successor revision, followed by configured approval/publication.
    Participants and attendance | Importer supplies planned roster; assigned teacher/TA confirms actual attendance | Activity ID, student identifier, group and planned status. Record actual attendance separately, including absent or unexpected participants. | Matched participation records; absence or roster mismatch goes to staff review.
    External activity outcome | Authorised source/import operator; agreed Time Infinity export or connector | Source activity/record key, student/staff IDs, dates, participation, hours, role, achievement, reflection and evidence reference where supplied. | Source-linked participation and outcome evidence; no automatic rubric result.
    Form definition | Form author and named reviewer/publisher; separate definition workbook | Sections/blocks, ordered question IDs, wording, source, meaning, ability definition, audience and permitted answer type. | Reviewed successor form draft; students continue on their assigned published version.
    Answers and feedback | Student, assigned peer or teacher; response task or response-entry workbook | Recipient/task, respondent, subject student, activity, form version, question and answer. Preserve self/peer/teacher perspective and submission state. | Submitted responses; accepted material registers as source-linked proof.
    Media and student work | Assigned staff or permitted student; upload or controlled reference | File/reference, type, source, activity/student association, author/uploader and date. Proposed extensions and sizes are listed in Kinds of evidence and media. | Media item plus processing/review status; accepted text or identity links can support proof.
    External certificate | Student submits; assigned staff reviews | Student, title, issuer, achievement date, category, grade/difficulty, result type, certificate attachment, reflection/labels where used. | External-achievement proof; award grade is not a rubric level.
    Rubric observation | Assigned assessor/reviewer; assessment workspace | Student, activity, rubric/version, axis, supported level/condition, exact proof, observer, date and decision. | Human-confirmed observation eligible for later calculation; publication is separate.
    Portfolio contribution | Student and assigned class teacher; Portfolio working editor | Student introduction, selected activities/work and teacher comments; generated narrative retains sources and authorship. | Working version submitted for review, then an approved frozen snapshot.
    
    TABLE 12 ROWS 7
    Example | Interpretation | Record content
    Roster | Matches a student to an activity; it does not confirm actual attendance or award a level. | v2 activity-assignments-new.csv: ACT-EXAMPLE-001, S1999, Example Student, S1X-2026-27, planned, false.
    Time Infinity outcome | Preserve source key, dates, reflection and evidence reference. Review identity and evidence before assessment. | 11_time_infinity_activity_export.csv: TI-0001; Community service day; S1001; completed; 6.0 hours; participant; Helped coordinate materials.
    External certificate | Grade 8 describes the music qualification context. It is not Skills Builder step 8. | 16_student_external_achievements.csv: EA-001; USR-S-001; piano_grade_8; first_runner_up; MED-CERT-001.
    Confirmed observation | A confirmed Listening observation cites proof. It can contribute to a reviewed result; it is not itself the publication event. | 18_rubric_observations.csv: OBS-001; ACT-COMM-001; USR-S-001; RUB-SB-UF2 / UF2.0; AX-SB-LISTEN; LVL-SB-05; PRF-FEEDBACK-001.
    Missing observation | A response exists but no teacher-confirmed condition is selected. Missing remains missing, not zero. | The same file has OBS-002 on AX-SB-SPEAK with no level/condition and status missing.
    Academic result — proposed | Validate identity, period and grading scheme. Keep as supporting academic evidence. The dedicated import contract is still to be agreed. | Illustrative only: student S1999; subject ENG; 2026/27 P1; term assessment; mark 72; scale 0–100; source key EXAMPLE-ENG-001.
    
    TABLE 13 ROWS 9
    Input action | Who does it | What enters the system
    Set up school and users | SchoolAdmin or delegated administrator | School period, account, class, role and scope; Excel template where used.
    Configure activities | Activity owner, teacher or other authorised staff | Dates, description, roster, VASK, labels and one or more assessment stages, each with its own published form version.
    Record attendance | Activity owner or assigned TA | Actual attendance against the planned roster; an absence becomes an approval exception.
    Reflect and contribute | Student | Self-reflection, self-evaluation, permitted work, external certificates and selections.
    Invite a peer after the event | Student who is required to initiate peer review | The student shares the activity invite code; an eligible peer signs in, enters it and completes the assigned review.
    Observe and comment | Assigned teacher, teaching assistant or authorised staff; social worker where applicable | Observed behaviour, feedback, contextual evidence and permitted media.
    Enter peer feedback | The invited student, after an explicit assignment | A response identifies the reviewer, subject, activity, form version.
    Import or export workbook | SchoolAdmin or another user granted import/export capability | Versioned Excel template, staged rows, errors, corrections and approval decision.
    
    TABLE 14 ROWS 4
    Action | Who acts | System behaviour
    Upload or link media | Activity teacher or authorised staff; a student where upload permission permits. | Attach the item to the activity with source, creator, time, media type, consent and lifecycle metadata.
    Set visibility and permitted use | Authorised staff with the relevant policy capability. | Set student visibility, staff scope and assessment eligibility independently; record actor, time and reason where policy requires.
    Request media processing | Authorised staff or an approved configured job. | Queue permitted photo matching, speech transcription and speaker separation; preserve job status and provenance.
    
    TABLE 15 ROWS 9
    Excel | Typical use
    User and role workbook | Create or update identity, positions, role versions, scopes and effective dates.
    Activity workbook | Create or update activities, dates, staff, planned participants and labels.
    Label workbook | Allows customized activity labels to be reused outside of VASK
    Form-definition workbook | Create a successor form draft and review its staged question diff.
    Response-entry workbook | Enter assigned answers against stable activity, recipient, form and question keys.
    Rubric workbook | Define a versioned custom rubric or import an official rubric package.
    Export workbook | Provide school-scoped activity, evidence, assessment or audit records for review.
    Academic-result workbook — proposed | Import subject results as supporting evidence using student, assessment, period and grading-scheme keys. Dedicated contract and implementation remain to be confirmed.
    
    TABLE 16 ROWS 9
    Stage | Who acts | Processing and retained result
    Prepare activity evidence | Activity teachers | Activity description, dates, intended VASK labels, confirmed participation, relevant form answers, feedback and permitted proof for one student and one activity. Keep the source links and scope.
    Process images | Vision model suggests; assigned staff confirms | Locate student faces and retain candidate matches for human confirmation and permitted student photo display. Optional human captions and generic local-model scene descriptions remain separate. Generic descriptions do not establish behaviour or skill; label-assisted action identification is outside current scope.
    Process audio and speech (+ video audio extract) | Speech-to-text and speaker separation; assigned staff confirms | Produce a timed transcript, including SRT captions where available, and speaker segments. Map Speaker A or B to a student or role only as a candidate; an authorised person checks and corrects it.
    Build an activity assessment request | System | Freeze an input manifest for one student, one activity, a selected rubric version and axis. Include the activity description, accepted source-linked proof and question/answer context, plus rubric level descriptions and assessment conditions.
    Run assessment per activity | System invokes an LLM; reviewer interprets | Make a separate request for each eligible activity. The model proposes a level and explanation referencing only the supplied proof; save its evidence links, uncertainty, prompt, model and input version. A model output remains a suggestion.
    Compare activities | System creates an initial review suggestion | Group candidate results by the same student, rubric version and axis. Initially highlight the highest activity-level suggestion, while retaining every other activity result, explanation and supporting evidence.
    Review and decide | Assigned teacher or authorised assessment reviewer | Confirm, correct or reject each observation; select eligible activities and supporting proof; choose a specific activity or an available calculation method and provide a reason.
    Publish and correct | Named publisher under school policy | Record the confirmed method, result, selected observations, evidence, reviewer and explanation. Publish a snapshot; later changes create an audited successor or withdrawal.
    
    TABLE 17 ROWS 4
    Situation | Default displayed result | What the record must say
    At least one eligible activity | Highest eligible confirmed activity level across all selected periods. | Show the level, framework/version, selected periods, contributing activity and proof.
    No eligible result in the selected periods; an eligible previous-year result exists | Carry forward the last eligible prior-year published rating for the same rubric version and axis. | Clearly label the value Inherited from last year and show its source year, period and original decision.
    No eligible period result and no eligible prior-year rating | Show a 50% position on the dashboard as a visual placeholder. | Clearly show Skill not available yet or Not yet assessed. Do not store the placeholder as a confirmed level, observed step, zero or evidence.
    
    TABLE 18 ROWS 5
    Calculation | Selected confirmed levels | Displayed result
    Maximum (default for all eligible period activities) | 8, 6, 4 | 8
    Minimum (teacher-selected set) | 8, 6, 4 | 4
    Average (teacher-selected set) | 8, 6, 4 | 6
    Specific selected activity | Activity with confirmed level 6 | 6
    
    TABLE 19 ROWS 9
    Processing step | Who acts | Result
    Validate input | System validates; SchoolAdmin or delegated importer resolves errors. | Validates workbook contract, scope, source IDs, dates and period; stages exceptions for review.
    Confirm identity and attendance | Assigned teacher or authorised staff | Confirms the student, speaker or participation; resolves attendance exceptions according to policy.
    Extract and organise | System job or approved provider; authorised reviewer checks candidates | Produces transcript, extracted text or evidence suggestions with provenance; production AI policy remains open.
    Register proof | System registers an accepted source; authorised reviewer accepts or rejects evidence | Creates a Proof List item with source, perspective, authorship and links.
    Review rubric | Assigned assessor and authorised reviewer | Selects rubric version and axis, confirms observations, includes or excludes supporting proof with a reason.
    Review Portfolio | Student prepares their own content; assigned class teacher or reviewer checks it | Returns work or submits a reviewed Portfolio version for approval.
    Approve or publish | Named authorised approver or publisher under school policy | Records the decision and freezes the approved result; SchoolAdmin is not automatically the assessor.
    Correct or withdraw | Authorised reviewer, publisher or administrator | Flags affected outputs for review and records an audited withdrawal or successor.
    
    TABLE 20 ROWS 6
    Output | Who prepares or publishes it | Who can view it
    Student Portfolio working version | Student contributes; class teacher or assigned reviewer checks it. | The student and assigned staff, subject to state and scope.
    Published Portfolio or dashboard | Named authorised publisher releases an approved snapshot. | The student and authorised school staff; other recipients depend on the approved sharing policy.
    Skill level and teacher comment | Assigned assessor records evidence and comment; authorised reviewer and publisher confirm the result. | Student after publication and authorised staff within assigned scope.
    Excel export or evidence register | SchoolAdmin or other user with export capability. | Only authorised recipients of the school-scoped export.
    Operational exception and audit history | System records events; assigned staff resolve exceptions. | Administrators and reviewers only within their permitted scope.
    
    TABLE 21 ROWS 10
    Section | Behaviour and source | Proposed fields
    Student introduction | Student identity/photo and introduction; existing authorship/review rules remain. | student_id; display_name; profile_media_id; introduction_text
    Skills radar | Published results from either Skills Builder or a validated RC360 version. Use that rubric’s own axes; never relabel the reference image’s 3Cs as these results. | rubric_id/version; axis_id; published_result_id; level; assessment_state
    Me as a learner | AI initially suggests academic strengths, academic development needs, non-academic strengths, non-academic development needs, what to work on and motivation. Student may edit their own six fields before submission/review. | academic_strengths; academic_development_needs; nonacademic_strengths; nonacademic_development_needs; next_steps; motivation
    Building blocks | System selects relevant activities and supported foundational learning evidence. Categories and selection rules remain to be agreed. | activity_ids; activity_type; category_code; summary; source_refs
    Courses | System selects relevant course/learning activities and displays recorded activity types; no inferred formal course enrolment. | activity_ids; activity_type; course_title; summary; source_refs
    My achievements | System selects relevant supported activity achievements; participation alone does not imply an award. | activity_ids; activity_type; achievement_title; result_type; source_refs
    My interests | System proposes interests from relevant activities, with activity types and provenance. Frequency alone does not establish an interest; taxonomy and student confirmation remain open. | interest_code/label; activity_ids; activity_type; selection_reason; confirmation_state
    Personal project | Fetch eligible activities with activity_type = project. SBA, NLP and project-related competitions qualify only when explicitly classified as projects. Do not infer the meaning of NLP. | activity_id; activity_type=project; project_subtype; title; summary; media_refs
    My beautiful work | Display permitted student-associated media-library photos. Student may request an additional image from a teacher; the authorised activity teacher uploads/links it and confirms its student association before it becomes selectable. | media_asset_id; activity_id; student_id; caption; media_request_id; association_review_state
    
    TABLE 22 ROWS 7
    Situation | Responsible party | Handling and status
    A third school period exists | SchoolAdmin; assigned teacher | Working rule: configure P3 with its own dates. It is an additional date range, not the third assessment point; include it only when the reporting window selects it. H-08.
    Activity spans two periods | Activity owner; authorised reviewer | System Analyst direction, L-09: propose the period containing the end date under configurable policy. If selectedPeriod is missing, prompt authorised staff; offer a single-activity Excel export, correction and staged re-import. P0 is the default display but its meaning remains open.
    Activity date falls outside every period or inside overlapping periods | SchoolAdmin; activity owner | Proposed: block automatic resolution and flag configuration or date error; correct or decide an exception. Overlap policy remains open under H-08.
    Portfolio selects last summer, P1 and P2 | Teacher; system | Working rule: include eligible confirmed activity observations in all selected periods, even across school years; preserve the frozen window and default to maximum per axis.
    A late activity, corrected date or transferred student affects a published report | Teacher; authorised publisher | Working rule: preserve the issued snapshot; flag affected output for review and issue an authorised successor or withdrawal. H-08.
    A student leaves, returns, repeats a year or changes class | SchoolAdmin | Working interpretation: prevent overlapping class membership if the student repeats the same year. The system will stop the calculation of the left student. H-08.
    
    TABLE 23 ROWS 3
    Situation | Responsible party | Handling and status
    Teacher changes class, leaves, is suspended or an assignment expires | SchoolAdmin; approval coordinator | Proposed: After the due date, students and teachers can still make submission, just marked as overdue
    No eligible reviewer, reviewer declines, or deadline passes | Approval coordinator | Working rule: raise an escalation and let approved coordinator to assign to another teacher/reviewer.
    
    TABLE 24 ROWS 7
    Situation | Responsible party | Handling and status
    Planned student is absent | Assigned activity teacher; staff approver | Working rule: confirm actual attendance and create a staff approval exception. Do not invent an absence explanation form.
    Student attends but is missing from planned roster | Activity teacher; administrator if required | Proposed: verify identity and add or correct participation through an audited change; policy for approval and late joins is open.
    Duplicate activity or participant row | Importer; authorised reviewer | Proposed: detect duplicate stable keys and stage for correction; do not create duplicate participation or proof.
    Approved activity is edited, withdrawn or disabled | Activity owner; assigned approver | Working rule: retain stable activity identity and history; material edit uses successor review. Disable/withdraw does not hard-delete linked evidence.
    Teacher did not observe an external certificate | Student; assigned reviewer | Working rule: retain certificate and student reflection as evidence; do not invent a teacher observation or official step.
    An activity is academic and non-academic | School policy owner; activity author | Open M-08: decide multi-select versus primary category with tags. Do not infer assessment levels from either label.
    
    TABLE 25 ROWS 6
    Situation | Responsible party | Handling and status
    Published form is edited or a response uses an older version | Form author; assigned approver | Working rule: stage a successor draft and diff; students stay on their assigned published version until explicit publication.
    Submission is missing, late, blank or not applicable | Student; teacher; administrator | Working rule: missing response is an exception, not zero. Open M-13: define differences between missing, blank, not collected and not applicable.
    Peer declines, is absent, does not respond, or is ineligible | Student; teacher or peer-review coordinator | Open: set deadlines, reassignment and safeguards. Proposed: show the pending exception and avoid inventing feedback.
    Peer feedback is harmful, inappropriate or identifies protected information | Assigned teacher or moderator | Proposed: withhold from student display and assessment pending moderation, preserve audit record, and follow school safeguarding policy.
    Peer has not explicitly been assigned | System | Working rule: no peer response is accepted as an assigned review until the reviewer-to-subject assignment exists.
    
    TABLE 26 ROWS 6
    Situation | Responsible party | Handling and status
    Workbook has wrong template version, invalid columns or values | Importer; system | Working direction: validate and stage errors; no silent commit. Form definitions and response entry use different workbooks.
    Import attempts stale activity revision or concurrent edit | Importer; activity owner | Working rule: reject the conflicting expected revision, refresh the comparison and restage; do not silently overwrite.
    Explicit disable or restore appears in workbook | Importer; authorised reviewer | Working rule: validate authority and lifecycle, preview impacts and record an auditable decision. Missing rows do not perform either action.
    Valid and invalid rows are mixed, workbook repeats, or import is interrupted | Importer; administrator | Open: define partial-commit, idempotency and recovery policy. Until decided, stage and review outcomes without silent duplicate application.
    Upstream Time Infinity record changes or source is unavailable | School source owner; import operator | Proposed: report unavailable or changed source and preserve prior provenance; reconciliation frequency and authority remain open.
    
    TABLE 27 ROWS 7
    Situation | Responsible party | Handling and status
    Face match or speaker identity is uncertain or wrong | Teacher or authorised reviewer | Working rule: keep candidate unconfirmed; correct with audit. Invalidate the wrong association and flag dependent results for review.
    Transcript is incorrect, incomplete, multilingual or has no SRT | Assigned reviewer | Working rule: review and correct relevant text; SRT is optional timed text and does not prove speaker identity.
    Media is hidden from student but available to staff or assessment | Authorised reviewer; policy administrator | Working direction: evaluate student visibility, staff scope and assessment eligibility separately, with consent and purpose controls.
    Consent is withdrawn, media expires, or deletion is requested | Privacy/retention officer; reviewer | Working direction: restrict access, assess dependent proof and published results, then apply approved deletion or anonymisation policy. Exact retention is open.
    External media store or authorised link is unavailable | School IT; assigned staff | Working rule: show source as unavailable and retain historical reference; do not expose storage credentials or silently erase proof.
    Unsupported file, oversized upload or inaccessible media | Uploader; administrator | Proposed: reject or quarantine with actionable error; approved formats, sizes and scanning policy remain open.
    
    TABLE 28 ROWS 8
    Situation | Responsible party | Handling and status
    Model is unavailable, slow, returns invalid output or omits proof links | Operator; assigned reviewer | Proposed: record job failure and allow retry or manual review; never manufacture a score. Retry and capacity policy remain open.
    Several activities have different suggested or confirmed levels | Assigned teacher | Working direction: retain per-activity explanation and proof; initial AI maximum is a suggestion. Default result is maximum of eligible confirmed observations in the selected periods.
    Teacher chooses minimum, average or one selected activity | Assigned reviewer; publisher | Working direction: use selected eligible confirmed observations under a versioned policy, record rationale and approval. School authority and permitted methods remain open.
    Average is non-integer or a different rubric version is selected | Assessment policy owner | Open: define rounding, compatibility and whether the school permits the method. Do not silently combine unlike rubrics or round into an official step.
    A student has no evidence, missing observation or only peer feedback | Teacher; system | Working rule: missing is not zero; peer feedback alone is not a confirmed step. Apply the inherited-result/50% not-assessed display rules when eligible.
    Evidence, identity or consent supporting an official level is invalidated | Assigned reviewer; publisher | Working rule: flag dependent claims and outputs needs review/stale; withdraw or reissue through an audited successor rather than silently recalculate.
    Two model providers or repeated runs disagree | Assigned reviewer | Working rule: retain parallel suggestions independently with prompt, model and source versions; reviewer confirms, rejects or requests clarification.
    
    TABLE 29 ROWS 10
    Situation | Responsible party | Handling and status
    Student has no approved Portfolio version | Class teacher; reviewer | Working rule: show no approved version and place the student in the staff exception queue; do not publish the draft as official.
    Student edits introduction or Proud Moments after publication | Student; class teacher; publisher | Working rule: retain the published snapshot; edits remain in a working successor until reviewed and published.
    Dashboard shows inherited rating or 50% placeholder | System; assigned teacher | Working direction: identify inherited source year and decision; label 50% as not yet assessed and exclude it from averages and evidence.
    Teacher comment is unpublished or intended only for staff | Author; assigned reviewer | Working rule: do not show it in student or external output before the configured visibility and publication conditions.
    Selected media or evidence is unavailable to a recipient | Publisher; system | Proposed: exclude inaccessible content and avoid exposing hidden item details; provide only permitted references or a neutral unavailable state.
    A published report has incorrect evidence, identity or approval | Reviewer; publisher | Working rule: preserve historical output, withdraw or issue a reviewed successor, and record reason and affected source links.
    Student or guardian requests correction, access or deletion | School privacy officer; authorised staff | Open H-07: confirm authority, legal and retention handling. Working direction: record request, assess impact, restrict access and carry out authorised correction/deletion.
    Retention period expires or legal/operational hold applies | Retention officer; system | Open: establish schedule, hold, backup and external-provider deletion rules; do not invent a number of years.
    External recipient needs a Portfolio | Authorised school publisher | Working recommendation: controlled approved exports first; external account, consent and access policy require a separate decision. H-09.
    ✓ • 447ms

## Activity

    $ ls -lt output | head -45
        ls -lt output/import-examples/schema-review
        cat output/import-examples/schema-review/nretention-source-manifest.json
        head -12 output/import-examples/schema-review/nretention-condensed-tables.csv
        cat output/English/README.md | head -65
    total 34144
    -rw-r--r--@  1 useroctopus-tech.com  staff      162 Nov 19 11:01 ~$SS internal system analyst functional flow nRetention.docx
    drwxr-xr-x@ 70 useroctopus-tech.com  staff     2240 Nov 18 18:25 import-examples
    -rw-r--r--@  1 useroctopus-tech.com  staff  2199862 Nov 18 18:21 BHSS internal system analyst functional flow nRetention.docx
    drwxr-xr-x@  3 useroctopus-tech.com  staff       96 Nov 18 18:19 import-examples-v2
    -rw-r--r--@  1 useroctopus-tech.com  staff  2209118 Nov 18 16:18 BHSS internal system analyst functional flow media formats.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1410951 Nov 18 11:13 BHSS internal system analyst functional flow.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1447292 Nov 17 17:41 BHSS internal system analyst functional flow table margins.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1446676 Nov 17 17:29 BHSS internal system analyst functional flow deadlines.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1442675 Nov 17 17:06 BHSS internal system analyst functional flow exception cases.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1432996 Nov 17 16:20 BHSS internal system analyst functional flow reporting periods.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1429037 Nov 17 16:08 BHSS internal system analyst functional flow period assessment.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1419469 Nov 17 15:32 BHSS internal system analyst functional flow revised.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1330296 Nov 17 12:53 BHSS internal system analyst functional flow media library.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff  1422415 Nov 17 12:52 BHSS internal system analyst functional flow assessment.docx
    drwxr-xr-x@ 15 useroctopus-tech.com  staff      480 Nov 13 12:42 Chinese
    drwxr-xr-x@ 14 useroctopus-tech.com  staff      448 Nov 13 12:42 English
    -rw-r--r--@  1 useroctopus-tech.com  staff    44329 Nov  9 18:06 BHSS expected inputs and outputs.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff    12947 Nov  2 11:36 20261030 backend schema and API handover.md
    -rw-r--r--@  1 useroctopus-tech.com  staff    46340 Oct 27 16:29 BHSS meeting agreements and outstanding inputs 26 October 2026_modified.docx
    -rw-r--r--@  1 useroctopus-tech.com  staff    47528 Oct 27 16:18 BHSS Kickstart Meeting Summary and Items for ConfirmationModified.docx
    drwxr-xr-x@  6 useroctopus-tech.com  staff      192 Oct 22 22:20 D2 vask-skill-map
    -rw-r--r--@  1 useroctopus-tech.com  staff    36434 Oct 22 22:08 D3 activity-evidence-simulator.html
    -rw-r--r--@  1 useroctopus-tech.com  staff    15009 Oct 22 21:50 D3 activity-evidence-simulator-preview.html
    -rw-r--r--@  1 useroctopus-tech.com  staff    14738 Oct 22 13:49 portfolioDummyData.html
    -rw-r--r--@  1 useroctopus-tech.com  staff    31022 Oct 22 13:41 D2 evidence-growth-system-map.html
    drwxr-xr-x@  3 useroctopus-tech.com  staff       96 Oct 16 23:03 D1 bhss-skills-navigator
    total 984
    -rw-r--r--@ 1 useroctopus-tech.com  staff     436 Nov 18 17:58 relational-18-validation.json
    -rw-r--r--@ 1 useroctopus-tech.com  staff   21909 Nov 18 17:58 state-log-schema.html
    -rw-r--r--@ 1 useroctopus-tech.com  staff   24015 Nov 18 17:58 relational-18-schema.html
    -rw-r--r--@ 1 useroctopus-tech.com  staff   10962 Nov 18 17:58 relational-18-tables.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff   37917 Nov 18 17:39 nretention-condensed-schema.html
    -rw-r--r--@ 1 useroctopus-tech.com  staff    8090 Nov 18 17:39 state-log-schema-tables.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff     437 Nov 18 17:26 nretention-validation.json
    -rw-r--r--@ 1 useroctopus-tech.com  staff    1227 Nov 18 17:26 nretention-source-manifest.json
    -rw-r--r--@ 1 useroctopus-tech.com  staff    5869 Nov 18 17:26 nretention-flow-coverage.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff   14580 Nov 18 17:26 nretention-condensed-tables.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff     904 Nov 18 17:21 validation.json
    -rw-r--r--@ 1 useroctopus-tech.com  staff  129045 Nov 18 17:20 index.html
    -rw-r--r--@ 1 useroctopus-tech.com  staff    3762 Nov 18 17:20 source-manifest.json
    -rw-r--r--@ 1 useroctopus-tech.com  staff  181607 Nov 18 17:20 srs-fit-assessment.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff    4755 Nov 18 17:20 required-extensions.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff    5422 Nov 18 17:20 initial-simplified-tables.csv
    -rw-r--r--@ 1 useroctopus-tech.com  staff   13461 Nov 18 17:20 oldest-core-tables.csv
    {
      "source": "output/BHSS internal system analyst functional flow nRetention.docx",
      "sha256": "8f357f85ce348d758685e7afd12651629a268c8ad7814595255dc8b025bc4757",
      "authority": "Explicit user-selected proposal baseline; not promotion over Core for existing implementation",
      "status": "recommended condensed functional schema; not BHSS/JC approval",
      "table_count": 18,
      "coverage_groups": 25,
      "locator": "B<n> is the 1-based top-level OOXML body element; R<n> is the table row. These are not page numbers.",
      "open_conflicts": [
        {
          "source": "B139 vs B143",
          "issue": "All questionnaire deadlines same versus explicit distinct dates for added stages; preserve configurable stage deadlines."
        },
        {
          "source": "B314 vs user request",
          "issue": "Embedded authority note names media formats DOCX; user explicitly selected nRetention for this proposal."
        },
        {
          "source": "B300.R3",
          "issue": "Teacher expiry situation is paired with late-response text; do not treat expiry as permission to submit."
        }
      ],
      "superseding_direction": {
        "source": "B234",
        "meaning": "Students can edit their own six learner narrative fields; preserve human edit provenance."
      }
    }
    number,table,purpose,columns,absorbs,rule,source
    1,schools,School and small configuration definitions,school_id; name; status; is_disabled; settings_json; current_history_id; latest_history_id,Role definitions and capability lists; class/group/department/subject/position definitions; approval/calculation policies; source connector configuration; feature settings; Portfolio layout templates; proof types.,"Each nested definition has a stable code, explicit kind and content version. Pin the school history snapshot plus definition code/version. Configuration changes are reviewed and never silently alter existing assignments. Secret values stay outside this payload.",B9; B60; B70–84; B137; B191; B233
    2,users,Student and staff identities,user_id; school_id; external_id; display_name; email; user_kind; status; profile_media_id; created_at; updated_at,Student and staff identity headers; basic contact/profile fields.,"user_kind describes a person; it grants no permissions. Current class/title may be a projection from assignments, never a second authoritative history. Platform service identities do not imply school-content access.",B60; B68–84; B88.R2
    3,periods,"School years, periods and assessment points",period_id; school_id; period_kind; parent_year_id; code; name; start_at; end_at; closed_at; sequence; is_summer; assessment_at; status,Academic-year headers; reporting-period headers; assessment-schedule points.,period_kind = year | reporting_period | assessment_point. Reporting periods reference a year; an assessment point is not a period or P3. Report windows store explicit reporting-period IDs. Validate parent kind and date rules.,B19–28; B84; B179; B298
    4,assignments,"People linked to roles, groups and activities",assignment_id; school_id; assignment_kind; user_id; scope_type; scope_id; definition_code; definition_history_id; period_id; effective_from; effective_until; activity_id; relationship; planned_status; attendance_status; attendance_review_status; confirmed_by; confirmed_at; allow_keys_json; deny_keys_json; status,User roles; position/class/staff-group memberships; activity participants; activity staff; individual scoped permission overrides.,"Use separate typed rows, not one combined row per person. Role, position, class, participant and staff rows have kind-specific required/forbidden columns. A participant or position row never grants a capability. Keep planned roster and actual attendance distinct. School configuration codes resolve against the pinned snapshot.",B60; B68–84; B88.R5; B90; B101–107; B300–302
    5,activity_records,Activity roots and their assessment stages,record_id; school_id; record_kind; parent_activity_id; external_source_key; title; description; private_context; activity_type; owner_id; start_at; end_at; actual_end_at; period_id; selected_period_id; stage_type; stage_sequence; assessment_at; evidence_from/to; opens_at; due_at; closes_at; form_id; form_history_id; labels_json; respondent_groups_json; invite_code_ref; operational_status; publication_status; current_history_id; latest_history_id,Activities; activity stages; activity label assignments; small activity policy fields.,"record_kind = activity | stage. Stages point to a root activity, never another stage. root start/end and stage assessment/open/due times retain different columns. Stable activity ID is the root record_id; stage ID is its own record_id. Child stage snapshots and form snapshots remain pinned. Labels contain version keys and rationale.",B10; B32; B88.R4; B101–116; B138–148
    6,questions,Reusable question definition and provenance,question_id; school_id; source_instrument_code; source_version; source_file/sheet/row; construct; wording_en/zh; audience; answer_type; options_json; scale_min/max; negative_wording; ability_code/name/description; status; current_history_id; latest_history_id,Question bank rows; question abilities; scales/options; source-instrument metadata.,Pin exact question history in forms. Bank-level availability/source manifest can live in schools.settings_json with a stable bank/version key. Questions remain independent of VASK and rubric scores. No question-per-skill mapping table.,B88.R7; B117–122; B137.R5
    7,forms,Questionnaire definition and ordered content,form_id; school_id; title_en/zh; form_kind; sections_json; review_status; publication_status; valid_from/to; current_history_id; latest_history_id,"Form roots, separate version headers, sections, blocks and form-item join tables.","sections_json contains stable section/block/item keys, order, audience, required flag and exact question history IDs. Shared block definitions can be nested versioned school definitions; forms freeze their exact expansion. A definition upload is still separate from a response upload.",B42; B88.R7–8; B117–122; B139–144
    8,catalogues,VASK/custom labels and rubric headers,catalogue_id; school_id_or_system_scope; code; name_en/zh; version; labelling_capable; assessment_capable; axes_json; levels_json; labels_json; groups_json; selection_mode; source_reference; status; current_history_id; latest_history_id,Rubric definitions; groups; axes; common levels; descriptive label catalogues.,One row per catalogue family with immutable history. Few families does not impose a three-row limit. Axes/level/label/group objects have stable keys and ordered values. School settings independently pin activity_labelling and assessment_rubric. RC360 remains unavailable until validated.,B43–54; B137.R4/R7; B203–208; B287
    9,rubric_steps,Queryable axis and step descriptors,step_id; catalogue_id; catalogue_history_id; axis_code; level_code; step_number; step_name_en/zh; descriptor_en/zh; conditions_json; score_min/max/out_of; source_reference; status,Canonical 59 descriptors plus 27 evidence-condition children; 26 level order is in catalogue.levels_json.,"Immutable rows per exact catalogue snapshot, axis and level; unique on that triple. 128 Skills Builder rows remain 128 rows, not 128 tables. conditions_json holds stable condition IDs, text, evidence rules and sources. New catalogue activation pins the complete step set.",B51; B165.R5; B203–208
    10,response_tasks,Assigned respondent task and answers,task_id; school_id; activity_id; stage_id; stage_history_id; form_id; form_history_id; respondent_id; subject_id; perspective; assigned_by; opens_at; due_at; closes_at; answers_json; content_status; processing_status; visibility_status; submitted_at; current_history_id; latest_history_id,Form assignments; recipients; submissions; question-response rows; peer-response assignment.,"One row per respondent/subject/stage task. answers_json is keyed by form item and pinned question, with typed values and missing state. Submitted attempts are immutable history snapshots. Peer code acceptance creates an explicit respondent/subject task; the code alone grants no access. Derived overdue is not an authoritative stored flag.",B88.R8; B98–99; B110–128; B139–144; B304
    11,media_assets,One source file/reference and its derivatives,media_id; school_id; parent_media_id; title; human_caption; caption_author_id; caption_at; media_type; mime_type; size; hash; private_storage_ref; external_source_code; external_reference; source_version; owner_id; uploader_id; captured_at; uploaded_at; student_visibility_default; staff_scope_json; assessment_eligible_default; consent_status; moderation_status; processing_status; disabled_at/by/reason; current_history_id; latest_history_id,"Media source headers, external reference rows, derivative assets and caption metadata.",A derivative is another media row linked to its source. A photo linked to several students stays one asset. Per-student/use decisions live in record_links. Human captions never receive automatic scene-description text. Private references are not browser payloads.,B33–40; B63–66; B108–109; B149–154; B166–172; B223–226
    # English document index
    
    This folder contains the current English architecture, planning, and stakeholder documents. Original evidence and shared prototypes remain outside this folder so they are not mistaken for translated or approved requirements.
    
    | Document | Purpose | Chinese counterpart |
    | --- | --- | --- |
    | `Core data relationships.md` | Sole authoritative domain relationship model: operations, entities, cardinality, lifecycle, evidence, approval and publication | `../Chinese/核心資料關係.md` |
    | `Discussion questions.md` | Authoritative high-, mid-, and low-level decision checklist with answer fields | `../Chinese/討論問題.md` |
    | `Current findings and questions v2.md` | Latest meeting findings, approved interpretations, product proposals, and unresolved dependencies | `../Chinese/最新發現及問題 v2.md` |
    | `Roles and permissions.md` | Role responsibilities, access boundaries, and approval authority | `../Chinese/角色及權限.md` |
    | `Presentation agenda.md` | Inputs, process, outputs, open decisions, and presentation sequence | `../Chinese/簡報議程.md` |
    | `Aspects updated.md` | Non-authoritative before/after entity and field explanation; Core governs any difference | `../Chinese/資料欄位修訂.md` |
    | `Internal system review and manday estimate.md` | Internal scope analysis and delivery estimate | `../Chinese/內部系統檢視及人日估算.md` |
    | `External lean MVP proposal.md` | Stakeholder-facing recommended MVP | `../Chinese/對外精簡MVP方案.md` |
    | `Playground v2 coverage against original proposal.md` | Traceable comparison of the current v2 POC against `Design ideas.docx`, separating demonstrated, partial, dummy-contract and uncovered capabilities | `../Chinese/Playground v2 對原始構想的覆蓋評估.md` |
    | `BHSS discovery findings and client clarification questions.docx` | Client discovery and clarification document | `../Chinese/BHSS探索結果及客戶確認問題.docx` |
    | [`SRS/`](SRS/) | Modular, testable software requirements including access control, field limits, infrastructure and page visibility | [`../Chinese/SRS/`](../Chinese/SRS/) |
    
    ## Shared sources and demonstrations
    
    - `../../Design ideas.docx` and `../../Assessment/` contain original supplied evidence.
    - `../Questions.docx` is a mixed-language discovery source and remains unchanged.
    - `../import-examples/` contains shared CSV contracts.
    - `../../D3 bhss-portfolio-ppt/` contains the bilingual presentation and interactive POC.
    - `../../playground/` is the bilingual local stage selector. It keeps `../../portfolio-poc/` as Playground v1 and launches the Core/CSV 3.0 implementation in `../../portfolio-poc-v2/` as Playground v2, with separate APIs and SQLite databases. Playground v2 provides an English／Traditional Chinese toggle, a dummy source-linked AI review surface without execution routes, and an SRS-12 page-coverage catalogue.
    
    When the language versions differ, resolve the difference against the original evidence and record the confirmed decision in both architecture sets.
    
    The linked-data revision tagged `Discussed on Meeting Oct 26 - kickstart` is now reflected across both editions: date-resolved school periods, effective role assignments, question-owned abilities, interchangeable rubric capability, a typed Evidence / Proof List, `MAX-CONFIRMED` progression, positive-only AI candidates, and frozen review/outlook memory inputs.
    
    The System Analyst architecture decision approved on 27 October 2026 is also synchronized: immutable `SchoolId` isolation, `schools.is_disabled`, deny-by-default per-school feature availability, provider-neutral `ExtractionProvider` / `PortfolioGenerator` contracts in P1, production provider implementations in P2, and visualization from an approved frozen snapshot only. This is an internal architecture decision, not a BHSS or JC policy approval.
    
    The 28 October 2026 System Analyst architecture decisions are synchronized as internal product decisions, not BHSS/JC approvals: job title is separated from stackable functional role/capability and assignment scope; department, subject and teacher group are first-class scopes; explicit deny wins; teacher search/filter is required; each workflow uses a lean configurable approval mode with escalation; activities keep a stable ID across approved revisions; and official Portfolio views resolve the latest approved working version while retaining newer drafts.
    
    ## Documentation alignment checked 18 November 2026
    
    This is a topic-level alignment record, not a new product version or proof of implementation. Historical comparison uses Git HEAD `70e251a` (13 Nov 2026) versus current working files; it does not establish the date every working edit was authored. Internal decisions are not BHSS/JC approvals. Original source documents remain unchanged.
    
    | Topic | Current position |
    |---|---|
    | Document authority | Use Core for domain rules, the question register for decision status and SRS for testable requirements. The media formats DOCX is the current single functional overview. Other flow DOCXs remain historical working copies; filename or modification time alone does not confer authority. |
    | Overdue responses | Older committed baseline had generic due times and late-response handling. Current Core and SRS-04/06 add the one-month default, audited post-expiry extensions and historical/current lateness. ACT-FR-026; SUB-FR-012–013; L-04/M-12 remain partly open. |
    | Activity amendments | Already detailed in older Core/SRS: stable identity, revisions, reapproval and change requests (H-19; ACT-FR-012–016; M-27 imports). The former DOCX one-month amendment phrase is removed; it was not an approved edit cutoff. |
    | Activity periods | Current L-09/SCH-FR-008–009 supersede split-or-approve: single-period automatic resolution; cross-period end-period proposal and valid staff selection where missing. P0 meaning remains open. |
    | Period assessment | 17 Nov internal direction is in Core/M-21; SRS-08 now aligned via ASM-FR-024–026. Includes selected periods, permitted versioned calculation choices, inherited rating and 50% not-assessed display. School authority, rounding and inheritance eligibility remain open. |
    | School result inputs | SRS-03/ASM-FR-008 already allow academic results as supporting evidence. The DOCX now adds proposed fields/examples; these do not establish a dedicated v2 import or approved column contract. L-06 remains open. |
    | Media formats and sizes | Unresolved difference: DOCX proposed 50 MB images / 2 GB video and broader extensions; SRS-07 retains 8 MiB images / 500 MiB video temporary caps. Do not silently activate either as approved production policy. L-02 must select and align the final contract. |
    | Peer invitation | DOCX student-initiated activity code is internal direction; SRS-06 SUB-FR-005 currently requires teacher/TA assignment. Keep explicit reviewer-to-subject assignment. Who authorises code-generated assignments, expiry and eligibility must be resolved before implementation. |
    | Security and retention | Deferred for this functional-definition phase by System Analyst direction on 18 Nov. Existing security/retention SRS detail remains a later-phase design reference; role responsibilities and visibility remain in the functional flow. This is not BHSS/JC approval or removal of implemented controls. |
    
    ### Additional scope revision 18 November 2026
    
    M-28 supersedes the one-questionnaire-per-activity rule: one published questionnaire per assessment stage, with a default end stage and optional start/progress/custom stages. M-29 specifies face-region correction, including unknown/guest handling. Core, SRS-04/05/06/07 and the functional DOCX describe intended behaviour; v2 schema, APIs, UI and CSV contracts have not been migrated. BHSS test-data requests are in the discussion register and DOCX.
    
    Latest M-28 clarification: the owner may request early end; only effectively ended/completed activities enter period assessment. Ongoing activities retain stage feedback but are excluded from period results. This supersedes interim-stage inclusion while the parent activity is ongoing. See Core “Activity completion and early end”.
    
    Batch two, 18 Nov: photo matching/delivery is distinct from optional human captions and unconfirmed generic local-vision descriptions. Label-assisted action identification is excluded from current scope. Ignore teachers/unknown people for student matching. See Core and the updated immediate BHSS checklist in the discussion register and functional DOCX.
    ✓ • 0ms

## Activity

    $ python3 - <<'PY'
        import csv,collections
        p='output/import-examples/schema-review/srs-fit-assessment.csv'
        r=list(csv.DictReader(open(p)));print('requirements',len(r));print('statuses',collections.Counter(x['source_status'] for x in r).most_common(22));print('verdict',collections.Counter(x['starter_verdict'] for x in r));print('unique',len(set(x['requirement_id'] for x in r)))
        PY
        cat output/import-examples/schema-review/relational-18-validation.json
        head -8 output/import-examples/schema-review/relational-18-tables.csv
        rg -n -i 'entit|data model|database|table|sql|schema|implementation|shall use|shall store|xlsx|workbook' 'output/English/SRS' | wc -l
    requirements 309
    statuses [('Approved System Analyst architecture decision, 27 Oct 2026', 57), ('Approved System Analyst architecture decision, 28 Oct 2026', 45), ('Recommended architecture', 33), ('Confirmed architecture', 24), ('Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval', 22), ('Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval', 17), ('Confirmed working model', 9), ('Partly addressed L-08; Discussed on Meeting Oct 26 - kickstart', 5), ('Approved System Analyst architecture decision, 28 Oct 2026; not BHSS/JC approval', 5), ('Confirmed Oct 26 revision', 5), ('Confirmed System Analyst direction; not BHSS/JC approval', 5), ('Source-aligned', 4), ('System Analyst direction; synchronized 18 Nov 2026; not BHSS/JC approval', 4), ('System Analyst direction, 18 Nov 2026; not BHSS/JC approval', 4), ('Repository standard', 4), ('Confirmed design convention', 4), ('POC-aligned recommendation', 3), ('System Analyst direction; synchronized 18 Nov 2026; not BHSS/JC approval; M-21, 17 Nov 2026', 3), ('Confirmed documentation rule', 2), ('System Analyst direction; not BHSS/JC approval', 2), ('Confirmed M-11', 2), ('Confirmed POC direction', 2)]
    verdict Counter({'CONDITIONAL_FIT': 179, 'EXTENSION_REQUIRED': 57, 'NON_SCHEMA': 40, 'POLICY_OPEN': 17, 'SERVICE_REQUIRED': 11, 'STARTER_DATA_FIT': 5})
    unique 309
    {
      "result": "pass",
      "checks": [
        "18 unique functional table names",
        "All rows contain purpose, columns and constraints",
        "No JSON operational column in proposed inventory",
        "Rubric, permission and workflow definition placement specified",
        "Questionnaire content, answers, recognition and Portfolio items remain relational"
      ],
      "scope": "Static proposal validation; not implementation or migration evidence"
    }
    number,table,purpose,key_columns,constraints
    01,schools,School/service state and active configuration selections,school_id; code; name; status; disabled_by/at/reason; active_rubric_key/version; active_label_key/version; portfolio_template_key/version; workflow_policy_key/version,Small definitions and policy defaults are versioned backend modules. School selection and service state remain stored.
    02,users,Student and staff identity,user_id; school_id; source_id; display_name; email; user_kind; profile_media_id; status; created_at; updated_at,No role or current-class column is the authority for historical access/membership.
    03,roles,Explicit role names and backend permission profiles,role_id; school_id; code; name_en; name_zh; permission_profile_key/version; status,Role labels live here. Default action rules resolve from a retained backend profile version; changing a label does not change access.
    04,assignments,"Dated roles, class/group memberships, activity people and scoped exceptions",assignment_id; assignment_kind; user_id; role_id; school_definition_id; activity_id; period_id; scope_type/id; action_key; effect; assigned_by; assigned_at; effective_from/until; deassigned_by/at; planned_status; actual_attendance; attendance_reviewer_id/status; relationship; status,"One row per real assignment. Kind-specific checks distinguish role membership, class/position/group, participant/staff and role/user capability overrides. Named response/Portfolio reviewer stays on its own submission."
    05,school_definitions,"Classes, subjects, years, periods, groups, departments, positions and custom labels",definition_id; school_id; kind; code; name_en/zh; parent_definition_id; year_definition_id; start_at; end_at; close_at; sequence; is_summer; status,"Rows are explicit definitions, not JSON. Parent/type checks distinguish a class, subject and reporting period; a year may contain many periods. Many-to-many subject/department relations use record_links. Backend fixed vocabulary may be referenced by stable key/version."
    06,activities,Activities and their response stages,activity_record_id; school_id; kind; parent_activity_id; title; description; private_context; owner_id; source_key; activity_type; period_id; start_at; end_at; actual_end_at; assessment_at; evidence_from/to; opens_at; due_at; closes_at; questionnaire_definition_id; reviewer_id; review_status; operational_status; published_status; row_version; approved_event_id,"kind=activity|stage. Stage is a child row, not a separate table. Root completion and stage response eligibility remain distinct. Labels and participants use relationships/assignments, not arrays."
    07,questionnaire_definitions,"Questionnaire, block, question, reusable scale, option and ordered placements",definition_id; school_id; definition_key; version; kind; parent_definition_id; source_definition_id; default_section_code; display_order; title_en/zh; question_text_en/zh; answer_type; scale_definition_id; option_key; option_label_en/zh; option_value; minimum; maximum; negative_wording; ability_code/name/description; source_instrument/version/reference; audience; required; review_status; publication_status; status,A typed relational tree with explicit placement rows. Published content is immutable; editing it creates successor definition rows in this same table. A status transition alone never creates a duplicate definition. Reuse references exact released IDs. No questions/sections/options JSON.
         213
    ✓ • 0ms

## Assistant

The documents still contain **many instructions about how the system should work**, but they do not all need to dictate how your team designs or builds it. The important distinction is between a **functional outcome** the school needs and an **implementation choice** that your team can propose.

I cannot give a defensible exact count of remaining prescriptive places yet. The existing comparison lists **309 SRS requirement records**, but it assesses their fit with a proposed schema; it does not classify each one as “school decides” or “your team designs.” Counting keyword matches would overstate the answer.

| What I checked | Finding | What it means for your design authority |
|---|---|---|
| Functional-flow DOCX | Specifies actors, actions, inputs, processing, outputs and many detailed workflows. It labels parts as System Analyst direction, proposals or open decisions. | It is a functional baseline and internal direction; its design details are not automatically BHSS or JC approvals. |
| English SRS | Existing assessment indexes **309 requirement records** across the SRS. They mix source requirements, internal decisions, recommended architecture and open policy. | The 309 are **not** 309 externally mandated design constraints. Each needs classification before it can be counted as prescriptive. |
| Entity proposals | There are existing **18-table proposals**, including a relational variant. | These are proposals, not a proven migration or a requirement that your database use exactly 18 tables. |
| Document precedence | The repository index currently names the **media formats DOCX** as the functional overview; `nRetention` is the document you selected and is newer by modification time. | I used `nRetention` for this comparison, but its filename/date alone does not formally replace the indexed baseline. |

The existing assessment is available in [SRS fit assessment](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/output/import-examples/schema-review/srs-fit-assessment.csv), and the [18-table relational proposal](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/output/import-examples/schema-review/relational-18-tables.csv) is explicitly a static design proposal.

| Area | The documents currently say | Who should normally decide |
|---|---|---|
| Activity and form versions | A published version remains available while a successor is reviewed. | **Shared:** school confirms the approval outcome; your team chooses tables and version implementation. |
| Database entities | Define records such as activities, submissions, proof, approvals and portfolios. | **Your team:** table boundaries, joins, indexes, upserts and log structure, provided required history and relationships work. |
| Approval | Assigned people review and approve specific work; role membership alone is not assignment. | **School/product decision:** authority and workflow. **Your team:** technical mechanism. |
| Imports | Validate, preview, resolve errors and obtain approval before committing where required. | **Shared:** agree the control and user experience; your team designs contracts and processing. |
| Assessment | Evidence is reviewed against the chosen rubric; AI suggestions do not become official results automatically. | **School/product decision:** assessment rules and authority. **Your team:** implementation and presentation proposals. |
| Portfolio | Published output preserves the evidence and decision used; later corrections do not silently rewrite it. | **Shared:** school confirms correction and publication expectations; your team selects the storage and snapshot design. |
| Screen layout and visual design | The SRS and flow contain page, section and field suggestions. | **Mainly your team**, subject to the agreed information, accessibility, role visibility and school feedback. |
| Security and retention | Detailed design is explicitly deferred in the selected flow. | **Your team proposes later**, with school decisions where policy, access, retention or consent requires them. |

Some functional details are still quite prescriptive even if they are marked internal direction—for example, workbook workflows, stage schedules, default maximum assessment, inherited results and the 50% not-assessed display. These are **product behaviour choices**, not database requirements, and should be reviewed individually with their status and decision owner. There are also recorded unresolved differences on media limits and peer-invitation authority; neither version should be treated as settled merely because it appears in a document. See the [18 November alignment checkpoint](/Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/output/English/README.md).

My recommendation is to reclassify the SRS into **school outcome**, **school policy to confirm**, **your team’s proposed functional design**, and **your team’s technical design**. That would produce the exact count you are asking for and make clear which “shall” statements are genuine constraints versus proposals your team can change. The current 309-record index is a useful starting inventory, but it needs a fresh review against the selected flow before that count is reliable.

## User

inside of the document, did it write that - approval can be teacher (role), students can import certificates, activity self evaluationm peer review, then teachers can add activity, or as a assistant teacher. and teachers can upload images or media (activity owner and/or other assigned teachers). superadmin can add all the users, all user group, define what role can have what capability. one class can have mumultiple class teacher, and that the role, let's sat class 1a student, can end earlier than the school period ends can switch to another class. does the docx show that

## Assistant

I’ll check the selected DOCX directly for each point, including whether it states the rule explicitly or only implies it.

## Activity

    $ python3 - <<'PY'
        from docx import Document
        p='output/BHSS internal system analyst functional flow nRetention.docx'; d=Document(p)
        keys=['certificate','class teacher','class membership','transfer','capabilit','approval','assistant teacher','supporting teacher','media','peer review','self-evaluation','self evaluation','roles','class 1','classroom']
        for i,p in enumerate(d.paragraphs):
         t=p.text.strip()
         if t and any(k in t.lower() for k in keys): print('P',i, t)
        for i,table in enumerate(d.tables,1):
         for j,row in enumerate(table.rows,1):
          t=' | '.join(c.text.replace('\n',' / ') for c in row.cells)
          if any(k in t.lower() for k in keys):print('T',i,'R',j,t)
        PY
    P 4 Current scope decision: detailed security design and data-retention policy will be dealt with in a later phase. This functional review focuses on features, responsible users, inputs, processing and outputs. Role responsibilities and permitted views remain part of the functional description; security mechanisms, retention periods and deletion arrangements below are future design considerations, not requirements to finalise in this phase. Status: not BHSS or JC approval.
    P 6 Start with the journey below, then use the roles and input catalogue to identify the responsible person and information required. Processing explains review and assessment; Output explains what each recipient receives. The exception catalogue covers alternative paths. Confirmed architecture, System Analyst direction, proposed contracts and open school decisions are distinguished; prototype examples do not establish school policy.
    P 8 Platform operations enables the school service. SchoolAdmin sets up school users, roles and periods; assigned staff prepare forms, labels and rubrics under their separate approval workflows.
    P 11 Collect student, teacher and peer responses, observations, feedback and permitted media.
    P 28 Kinds of evidence and media
    P 29 Activity media library
    P 30 The activity Media Library groups photos, recordings, transcripts and other permitted media linked to one activity. Users open it from the activity’s Media Library tab.
    P 32 Evidence is anything accepted as relevant to a student’s experience or development, including media, comment or form response from assessor. The system retains the source, student, activity, author, perspective, date and review status where applicable.
    P 33 Original media, transcripts, extracts and published summaries have separate access permissions. The platform should support common formats: JPG, PNG, HEIC and WebP images; MP3, WAV and M4A audio; MP4 and MOV video; PDF, Word, Excel and PowerPoint documents; and TXT, SRT and VTT text or transcript files.
    P 51 Evaluation: The server evaluates the user's assigned capabilities, scopes, the current record state, and any required consent or named approval assignments.
    P 54 Roles permissions and field visibility
    P 55 Media permissions are separate
    P 56 For each media item and relevant student, the system controls student visibility, authorised staff access and assessment eligibility separately. Hiding an item from the student does not automatically prevent an authorised teacher from reviewing it or an authorised assessment process from using it.
    P 57 SchoolAdmin configures policy of teacher groups / student access, but does not automatically gain content or raw-media access.
    P 58 Teacher and staff roles
    P 60 A position is not permission. The server combines identity, effective functional role, capability, scope, explicit deny, lifecycle and workflow assignment. A named approval assignment is separate from role membership.
    P 69 User identity, position, functional role, scope and approval assignment are separate records.
    P 76 The preferred user-facing exchange is an Excel template. Existing CSV examples demonstrate the underlying record shapes; they are not interchangeable upload files. Use the template for the intended operation. A media attachment is evidence, not a structured import merely because it is an Excel or Word file. Schools prepare data to the documented contract; no per-school schema-mapping engine is assumed.
    P 85 For peer review, system requires students to invite another student after the event using the activity code. The code identifies an activity; it is not permission to view the other student’s private Portfolio.
    P 88 Create a draft with activity details, dates, staff, planned roster, VASK, activity labels, form version and media rules.
    P 89 Submit for the configured approval or publication path.
    P 91 Material changes create a successor activity revision and follow the configured approval path. The one-calendar-month response due date below is not an activity-amendment cutoff.
    P 92 A planned participant marked absent creates a staff-approval exception.
    P 94 Activity media library input
    P 98 One extension is one auditable action. It records the activity, previous and new due time, actor, reason, recorded/effective time and any required approval. The original deadline and every later change remain in history. The current effective deadline follows the configured approval rules.
    P 108 Peer review invitation
    P 124 Activity → assessment stages → stage revisions → form assignments → recipients → submissions → answers/proof. Stage records have a stage ID, activity ID, name/type, sequence, review/reporting period, assessment date, evidence-window start/end, opening/due/optional closing times, questionnaire version, respondent groups and named review assignments. Stage revisions preserve their author, reason, approval, publication and superseded revision. Assignments, submissions, proof and observations retain stage identity and exact stage/form revision context. These are conceptual model additions; database migrations and API/UI implementation remain outstanding.
    P 126 Adding or replacing a stage/questionnaire after activity approval is a governed activity amendment: the owner/authorised editor proposes a successor activity/stage revision and submits it for the configured approval. Teachers (including TA) without editing authority request the change. Draft or unapproved questionnaires cannot be assigned to respondents; questionnaire approval/publication remains independent. Existing stage assignments, responses and published results keep their original versions. A stage with submitted work cannot be relabelled, overwritten or deleted to represent a new assessment; cancel/retire future work with reason, or create a successor stage/assignment with explicit recipients. The last approved configuration remains effective until the successor is approved and released.
    P 130 The activity owner may request an early end. Record the proposed actual end date, reason, requester and time, and apply the configured activity amendment/approval workflow. Only an effective completed/ended state qualifies the activity for period assessment; a pending early-end request is not completion. If the owner does not end the activity and it remains ongoing, exclude it from that period’s assessment input and calculation. Show “ongoing — not included” rather than zero; retain its history, media, stage responses and feedback.
    P 135 A supplied photo description is desirable but optional. Keep the media title and add a human-supplied caption/description with its source/author, recorded time and revision history. Link the photo to its activity ID and known capture date/time. Distinguish photo-specific context from the activity description and intended VASK labels. A caption states what its author supplied; it does not independently verify the action or identify every person in the image. Missing captions must remain missing and do not block student-photo matching.
    P 140 Correct the individual face region, not a shared label or the whole photo. A media asset has zero or more detected/manual face regions; each region has a stable ID, source-image/version reference, bounding box in normalised coordinates and detection provenance. Identity candidates and human decisions are separate, versioned records. Reprocessing must not silently move or replace a previously confirmed region/identity link.
    P 142 The editor supports adding a missed face region and adjusting the selected box, with a reason; the original image remains unchanged. A student can request correction but cannot reassign another person. Teacher title or ownership alone does not replace the required review assignment/capability. Duplicate faces, multiple regions for one student, occlusion and unidentifiable people are valid review cases. A non-rostered student requires roster/identity resolution rather than silent enrolment. Store prior/new association, actor, time and reason; corrections are local to that region and never globally rename a person or update other photos automatically.
    P 145 Assessment processing from media to a published level
    P 149 Media input and identity review
    P 150 How media reaches a student library
    P 151 The system can analyse an eligible activity photo and suggest which enrolled students appear in it. Each face match is a candidate until an authorised person confirms it or resolves uncertainty. The confirmed association links the existing media item to the student; it does not create a separate uncontrolled copy or reveal other students’ material.
    P 152 For an eligible recording, transcription produces time-stamped text and optionally SRT captions. Speaker separation may suggest speaker segments and candidate identities or roles. An authorised person checks the transcript and confirms or corrects any student association. A transcript is offered to a student only when the relevant transcript, identity and visibility checks permit it; access to the transcript and original recording can differ.
    P 153 If a student association is corrected, consent is withdrawn or a media item is disabled, the system removes access as required and marks dependent proof and published results for review. It preserves the audit trail and issues a successor or withdrawal instead of silently changing a published assessment.
    P 154 Photographs can provide activity evidence and face-match candidates. Audio can be transcribed and divided into time-stamped speaker segments; SRT is a caption format containing text and timestamps, not proof of a speaker’s identity or role. Where speaker or student roles are inferred, they remain candidate labels until a person with appropriate knowledge confirms them. Uncertain or unconsented material is not silently assigned to a student.
    P 157 Activity description and context; the chosen rubric version, axis, levels and conditions; the student’s accepted responses and proof; confirmed teacher or peer observations; and reviewed extracts of permitted media.
    P 169 The system stores the reporting periods, eligible set, included and excluded observations, activity-level explanations and proof, method and policy version, calculated value, reviewer, reason, approval, timestamps and inherited source where relevant. If the teacher changes a published result, the system records an audited successor; it does not erase the original result.
    P 170 The teacher sees each activity’s suggested level, explanation and supporting proof, together with the initial highest suggestion. The initial highlight is a review aid; the published result is created only after the assigned reviewer confirms the relevant observations and the configured approval step is complete.
    P 176 Evidence media and identity review
    P 178 Media may be previewed, transcribed or matched only through observable jobs that return candidates.
    P 180 Disabling media is a soft action with reason, actor and timestamp.
    P 186 Default to the highest eligible, included and human-confirmed activity result in the selected periods. An assigned teacher may choose a permitted selected-activity result, maximum, minimum or average under versioned policy, with a reason and the configured approval.
    P 190 Activity Media Library tab
    P 191 Student view: from an assigned activity, the student opens Media Library and sees only items linked to them and permitted for student access. The list can contain confirmed photos, permitted recordings, transcript text or SRT captions. The student can request correction of a mistaken identity or association.
    P 192 Teacher or authorised staff view: within the activity scope, permitted staff can review all media they are authorised to access, including items hidden from students. The view shows processing and identity-review status, source, transcript availability, student visibility and assessment eligibility. Permission checks are repeated when the original or derivative is opened.
    P 196 Output is the information made available to an authorised recipient. A published Portfolio or assessment snapshot records the exact source material and decisions used; access to a summary does not automatically grant access to its original media.
    P 198 System Analyst direction, 18 November 2026; not BHSS/JC approval. The supplied Rethinking Assessment image is a structural reference, not the final page specification. The new profile differs from that example and the existing POC. No academic-grades panel is specified in this revision. Academic strengths/development needs refer to supported learning evidence; do not invent grades or assume a grade import exists.
    P 202 The additional-image request stores requester/student, target teacher/activity, requested image or description, status, handler, reason, timestamps and resulting media association. It is a request, not automatic access. Teacher linkage does not bypass the existing media-visibility and identity-confirmation checks. Photo availability supports curation, not action identification or a skill claim. The request/editor workflow is intended behaviour, not implemented code.
    P 206 Teacher or class teacher reviews inclusion, comments and controlled narrative fields.
    P 213 It is not approval to copy the source platform’s branding, exact layout, radar treatment or page sequence.
    P 219 The named approver handles the activity decision. After the event, the teacher confirms actual attendance. Students and assigned peers answer their own tasks; staff contribute observations and media.
    P 220 Accepted answers and reviewed media become source-linked proof. Transcription or AI assessment produces candidates. The assigned reviewer confirms the relevant identity, evidence and rubric observations.
    P 222 The student prepares Portfolio content; the class teacher reviews it; the named approver/publisher releases a frozen version. Students see the permitted published output. A later correction returns affected records for review and creates a successor or withdrawal rather than rewriting the issued result.
    P 228 Status key: Working rule = recorded architecture or the owner’s current product direction; Proposed = a safe implementation interpretation for discussion; Open = the school or product owner must decide the rule. None is presented as BHSS or JC approval unless separately recorded.
    P 230 People, roles and access
    P 232 Forms, submissions and peer review
    P 234 Media, consent and identity
    P 238 These images are retained from Design ideas.docx as internal discussion references. They illustrate possible direction and are not final UI specifications or policy approval.
    T 3 R 4 Student, peer and assigned staff | Contribute reflections, feedback, observations and permitted media as activities take place.
    T 3 R 5 Assigned assessor or reviewer | At the assessment point, review the chosen reporting window, confirm the relevant activity observations, and apply the configured calculation and approval rules.
    T 4 R 2 Formal lesson or school-based curriculum | Subject lessons, classroom tasks, projects and student work.
    T 4 R 6 Exchange or external experience | An overseas exchange or a student’s activity outside school; a student certificate is recorded as an external achievement, not automatically as a school activity.
    T 5 R 2 Text and form responses | Student reflection, self-evaluation, peer feedback, teacher observation and teacher comment. Each retains its author and perspective.
    T 5 R 3 Photograph or image | Activity photo, scanned document or certificate. Identity and consent may need review before use.
    T 5 R 4 Audio or video | Group discussion recording, interview or activity video. For speech processing, extract the video audio track; preserve the original video and its media type. Transcript and speaker identities remain candidates until reviewed.
    T 5 R 6 External achievement | Certificate or award entered by a student; it may become proof but does not automatically create an official rubric level.
    T 5 R 7 External media reference | A link or controlled reference to a school-approved store. The server checks access, consent and source availability when it is opened.
    T 6 R 3 Evidence | Information that may help describe or review a student. | Includes responses, observations, feedback, media, certificates and external references.
    T 7 R 2 Student | Join activities; complete reflections and self-evaluation; upload permitted evidence; complete assigned peer review; request corrections; view own published Portfolio. | Own records and assigned tasks only.
    T 7 R 3 Teacher | Create or edit assigned activities; confirm attendance; provide observations, comments and initial ratings; review assigned students; act as class teacher where assigned. | Assigned activities, students, classes or programmes.
    T 7 R 5 SchoolAdmin | Manage users, roles, scopes, periods, policies, imports, versions, audit logs and feature configuration. | School-wide administration; raw media and assessment decisions remain separately controlled.
    T 9 R 4 Supporting teacher or teaching assistant | Confirms attendance, contributes responses and observations, and manages evidence within explicit assignment. Editing activity content requires delegated permission; supporting assignment does not confer ownership, removal or approval authority.
    T 9 R 6 Class teacher or mentoring teacher | Reviews assigned students’ Portfolio content and progress; may return work or submit a reviewed version for approval.
    T 9 R 7 SuperTeacher or authorised reviewer | Reviews assigned evidence, forms and observations; makes delegated include, exclude or approval decisions.
    T 9 R 8 SchoolAdmin | Maintains school users, role assignments, periods and policy; content approval requires a separate assignment.
    T 10 R 5 Peer review | Completes assigned review; invites a peer after an event with the activity code. | Audit reviews | Configures policy and moderation rules.
    T 10 R 7 Portfolio | Edit own introduction and permitted media/activity selections; the Proud Moments selection limit remains open under V2-D11. | Reviews, returns, comments and submits assigned Portfolio version. | Configures template, visibility and publication policy.
    T 10 R 8 Media | Uploads certificates | Uploads activity media | Configures consent, retention and media access policy.
    T 11 R 4 Activity catalogue | Activity owner or authorised importer; activity Excel template | Stable activity ID for updates; title, type, description, dates, owner, staff, labels and exact form version for each released assessment stage. Import operation and expected revision are required where applicable. | Activity draft or successor revision, followed by configured approval/publication.
    T 11 R 9 Media and student work | Assigned staff or permitted student; upload or controlled reference | File/reference, type, source, activity/student association, author/uploader and date. Proposed extensions and sizes are listed in Kinds of evidence and media. | Media item plus processing/review status; accepted text or identity links can support proof.
    T 11 R 10 External certificate | Student submits; assigned staff reviews | Student, title, issuer, achievement date, category, grade/difficulty, result type, certificate attachment, reflection/labels where used. | External-achievement proof; award grade is not a rubric level.
    T 11 R 12 Portfolio contribution | Student and assigned class teacher; Portfolio working editor | Student introduction, selected activities/work and teacher comments; generated narrative retains sources and authorship. | Working version submitted for review, then an approved frozen snapshot.
    T 12 R 4 External certificate | Grade 8 describes the music qualification context. It is not Skills Builder step 8. | 16_student_external_achievements.csv: EA-001; USR-S-001; piano_grade_8; first_runner_up; MED-CERT-001.
    T 13 R 4 Record attendance | Activity owner or assigned TA | Actual attendance against the planned roster; an absence becomes an approval exception.
    T 13 R 5 Reflect and contribute | Student | Self-reflection, self-evaluation, permitted work, external certificates and selections.
    T 13 R 6 Invite a peer after the event | Student who is required to initiate peer review | The student shares the activity invite code; an eligible peer signs in, enters it and completes the assigned review.
    T 13 R 7 Observe and comment | Assigned teacher, teaching assistant or authorised staff; social worker where applicable | Observed behaviour, feedback, contextual evidence and permitted media.
    T 13 R 9 Import or export workbook | SchoolAdmin or another user granted import/export capability | Versioned Excel template, staged rows, errors, corrections and approval decision.
    T 14 R 2 Upload or link media | Activity teacher or authorised staff; a student where upload permission permits. | Attach the item to the activity with source, creator, time, media type, consent and lifecycle metadata.
    T 14 R 3 Set visibility and permitted use | Authorised staff with the relevant policy capability. | Set student visibility, staff scope and assessment eligibility independently; record actor, time and reason where policy requires.
    T 14 R 4 Request media processing | Authorised staff or an approved configured job. | Queue permitted photo matching, speech transcription and speaker separation; preserve job status and provenance.
    T 19 R 7 Review Portfolio | Student prepares their own content; assigned class teacher or reviewer checks it | Returns work or submits a reviewed Portfolio version for approval.
    T 20 R 2 Student Portfolio working version | Student contributes; class teacher or assigned reviewer checks it. | The student and assigned staff, subject to state and scope.
    T 20 R 5 Excel export or evidence register | SchoolAdmin or other user with export capability. | Only authorised recipients of the school-scoped export.
    T 21 R 2 Student introduction | Student identity/photo and introduction; existing authorship/review rules remain. | student_id; display_name; profile_media_id; introduction_text
    T 21 R 9 Personal project | Fetch eligible activities with activity_type = project. SBA, NLP and project-related competitions qualify only when explicitly classified as projects. Do not infer the meaning of NLP. | activity_id; activity_type=project; project_subtype; title; summary; media_refs
    T 21 R 10 My beautiful work | Display permitted student-associated media-library photos. Student may request an additional image from a teacher; the authorised activity teacher uploads/links it and confirms its student association before it becomes selectable. | media_asset_id; activity_id; student_id; caption; media_request_id; association_review_state
    T 22 R 6 A late activity, corrected date or transferred student affects a published report | Teacher; authorised publisher | Working rule: preserve the issued snapshot; flag affected output for review and issue an authorised successor or withdrawal. H-08.
    T 22 R 7 A student leaves, returns, repeats a year or changes class | SchoolAdmin | Working interpretation: prevent overlapping class membership if the student repeats the same year. The system will stop the calculation of the left student. H-08.
    T 23 R 2 Teacher changes class, leaves, is suspended or an assignment expires | SchoolAdmin; approval coordinator | Proposed: After the due date, students and teachers can still make submission, just marked as overdue
    T 23 R 3 No eligible reviewer, reviewer declines, or deadline passes | Approval coordinator | Working rule: raise an escalation and let approved coordinator to assign to another teacher/reviewer.
    T 24 R 2 Planned student is absent | Assigned activity teacher; staff approver | Working rule: confirm actual attendance and create a staff approval exception. Do not invent an absence explanation form.
    T 24 R 3 Student attends but is missing from planned roster | Activity teacher; administrator if required | Proposed: verify identity and add or correct participation through an audited change; policy for approval and late joins is open.
    T 24 R 6 Teacher did not observe an external certificate | Student; assigned reviewer | Working rule: retain certificate and student reflection as evidence; do not invent a teacher observation or official step.
    T 27 R 4 Media is hidden from student but available to staff or assessment | Authorised reviewer; policy administrator | Working direction: evaluate student visibility, staff scope and assessment eligibility separately, with consent and purpose controls.
    T 27 R 5 Consent is withdrawn, media expires, or deletion is requested | Privacy/retention officer; reviewer | Working direction: restrict access, assess dependent proof and published results, then apply approved deletion or anonymisation policy. Exact retention is open.
    T 27 R 6 External media store or authorised link is unavailable | School IT; assigned staff | Working rule: show source as unavailable and retain historical reference; do not expose storage credentials or silently erase proof.
    T 27 R 7 Unsupported file, oversized upload or inaccessible media | Uploader; administrator | Proposed: reject or quarantine with actionable error; approved formats, sizes and scanning policy remain open.
    T 28 R 4 Teacher chooses minimum, average or one selected activity | Assigned reviewer; publisher | Working direction: use selected eligible confirmed observations under a versioned policy, record rationale and approval. School authority and permitted methods remain open.
    T 29 R 2 Student has no approved Portfolio version | Class teacher; reviewer | Working rule: show no approved version and place the student in the staff exception queue; do not publish the draft as official.
    T 29 R 3 Student edits introduction or Proud Moments after publication | Student; class teacher; publisher | Working rule: retain the published snapshot; edits remain in a working successor until reviewed and published.
    T 29 R 6 Selected media or evidence is unavailable to a recipient | Publisher; system | Proposed: exclude inaccessible content and avoid exposing hidden item details; provide only permitted references or a neutral unavailable state.
    T 29 R 7 A published report has incorrect evidence, identity or approval | Reviewer; publisher | Working rule: preserve historical output, withdraw or issue a reviewed successor, and record reason and affected source links.
    ✓ • 0ms

## Assistant

The [nRetention functional-flow document](</Users/useroctopus-tech.com/Documents/GitHub/BHSS-MVP/output/BHSS internal system analyst functional flow nRetention.docx>) covers most of these points, but **it does not explicitly state multiple class teachers per class or an early end date for a student’s class membership**.

| Your point | In the DOCX? | What it says |
|---|---|---|
| A teacher can be an approver | **Yes, with a condition** | A teacher or authorised reviewer can make delegated approval decisions when assigned. The teacher role alone does not automatically grant approval authority. The exact authority remains subject to policy. |
| Students can upload certificates | **Yes** | Students submit certificates as external achievements; assigned staff review them. A certificate may become proof but does not automatically create a skill level. The document says *upload/submit*, not necessarily a structured Excel import. |
| Students complete activity self-evaluation | **Yes** | Student reflection and self-evaluation are listed as activity inputs. |
| Students do peer review | **Yes** | The flow describes a student inviting a peer using an activity code and the peer completing an assigned review. The code itself does not grant access to another student’s private Portfolio. Who authorises the resulting assignment remains unresolved in the SRS alignment record. |
| Teachers can create activities | **Yes** | Teachers can create or edit assigned activities. |
| Teachers can act as assistant/supporting teachers | **Yes** | A supporting teacher or teaching assistant can confirm attendance, contribute observations and manage evidence within their assignment. Editing activity content requires delegated permission. |
| Activity owner and other assigned teachers can upload media | **Mostly yes** | It says an activity teacher or authorised staff can upload or link activity media, and supporting teachers manage evidence within explicit assignment. It would be clearer to name the **owner and assigned supporting teachers with upload permission** explicitly. |
| SuperAdmin can add all users and user groups | **Partly** | The DOCX names **SchoolAdmin**, who manages school users, roles, scopes and policy. It also refers to teacher groups. It does not clearly state that a “SuperAdmin” creates **all user groups**, or define SuperAdmin as a separate role. |
| Admin can define which capabilities each role has | **Partly** | SchoolAdmin manages roles and policy, and the document explains roles, capabilities and scopes. It does not clearly state the full administrative action: creating a role and configuring its capability list. |
| One class can have multiple class teachers | **Not explicit** | Class teachers are mentioned as assigned reviewers, but I did not find a rule saying a class can have more than one. |
| A student’s class membership can end before the school period | **Not explicit** | It recognises students changing class and refers to membership overlap, but does not clearly define an independent membership start/end date. |
| A student can switch from Class 1A to another class | **Yes, at a high level** | “Changes class” is listed as an exception, but the document does not fully specify effective dates, the previous membership’s end, the new membership’s start, or how history is viewed. |

For the last two points, a clearer functional statement would be:

> A student’s class assignment has its own effective start and end dates, independent of the school reporting period. When a student changes class, an authorised administrator ends the previous assignment and creates the new one with effective dates. The system preserves both assignments as history and checks for overlapping memberships according to school policy.

And for class teachers:

> A class may have more than one assigned class teacher. Each assignment has its own effective dates and scope.

Those are **proposed clarifications based on your instruction**, not claims of BHSS or JC approval.

## User

oh then, for the superadmin, in this case, should be just admin -> schooladmin -> other roles like superteacher/staff

## Assistant

Yes. A clear hierarchy would be:

| Role | Scope | Main responsibility |
|---|---|---|
| **Admin** | Platform-wide | Create and manage schools, enable or disable a school’s service, and assign its SchoolAdmin. |
| **SchoolAdmin** | One school | Manage that school’s users, groups, roles, capabilities, class assignments, periods and policies. |
| **Other school roles** | Assigned school and scope | SuperTeacher, Teacher, supporting teacher/staff, Student and any other school-defined roles carry out their assigned functions. |

This is an **administrative hierarchy**, not automatic access to every record below it. For example, SchoolAdmin can configure users and roles, but only becomes an assessment reviewer or approver when given the relevant capability and assignment. Likewise, platform Admin does not automatically need access to student Portfolios or raw media.

A person can hold more than one school role. For example, a Teacher can also be a class teacher for 1A and an assigned approver for a particular workflow. A class can have multiple class teachers, each with an effective assignment period.

I would use **Admin** for the platform role and **SchoolAdmin** for the school role consistently, with no separate “SuperAdmin” unless a distinct responsibility emerges. This is your proposed product direction; it is not yet recorded as BHSS or JC approval.
