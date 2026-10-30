import { Router } from 'express';
import multer from 'multer';
import { controller } from '../controllers/api.js';

export const api = Router();
const importUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 4 * 1024 * 1024, fields: 10 } });

api.get('/session', controller.session);
api.get('/reference-data', controller.referenceData);
api.get('/staff', controller.staff);
api.get('/policy', controller.policyWorkspace);
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
