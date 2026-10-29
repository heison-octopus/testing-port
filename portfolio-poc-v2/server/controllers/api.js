import { identityService } from '../services/identityService.js';
import { activityService } from '../services/activityService.js';
import { approvalService } from '../services/approvalService.js';
import { portfolioService } from '../services/portfolioService.js';
import { aiService } from '../services/aiService.js';
import { llmPlaygroundService } from '../services/llmPlaygroundService.js';
import { assessmentService } from '../services/assessmentService.js';
import { memorableService } from '../services/memorableService.js';
import { importService } from '../services/importService.js';
import { openAiCompatibleChat } from '../adapters/openAiCompatibleChat.js';

const response = (status, work) => async (req, res, next) => { try { res.status(status).json(await work(req)); } catch (error) { next(error); } };
const ok = work => response(200, work);
const created = work => response(201, work);

export const controller = {
  session: ok(req => identityService.session(req.user)),
  referenceData: ok(req => identityService.referenceData(req.user)),
  staff: ok(req => identityService.directory(req.user, req.query)),
  policyWorkspace: ok(req => identityService.policyWorkspace(req.user)),
  previewPolicy: ok(req => identityService.previewPolicy(req.user, req.body)),
  applyPolicy: created(req => identityService.applyPolicy(req.user, req.body)),
  imports: ok(req => importService.workspace(req.user)),
  exportActivityCatalogue: ok(req => importService.exportActivityCatalogue(req.user)),
  uploadActivityCatalogue: created(req => importService.uploadActivityCatalogue(req.user, req.file)),
  importDetail: ok(req => importService.detail(req.user, req.params.batchId)),
  uploadImport: created(req => importService.upload(req.user, req.file, req.body)),
  runImportConnector: created(req => importService.runConnector(req.user, req.params.sourceSystemId, req.body)),
  correctImportRecord: ok(req => importService.correct(req.user, req.params.batchId, req.params.recordId, req.body)),
  decideImportRecord: ok(req => importService.decide(req.user, req.params.batchId, req.params.recordId, req.body)),
  commitImport: ok(req => importService.commit(req.user, req.params.batchId, req.body)),
  disableImport: ok(req => importService.disableBatch(req.user, req.params.batchId, req.body)),
  disableSourceSystem: ok(req => importService.setSourceStatus(req.user, req.params.sourceSystemId, 'disabled', req.body)),
  enableSourceSystem: ok(req => importService.setSourceStatus(req.user, req.params.sourceSystemId, 'active', req.body)),
  activities: ok(req => activityService.list(req.user)),
  activityReferenceData: ok(req => activityService.referenceData(req.user)),
  activityApprovalCandidates: ok(req => activityService.approvalCandidates(req.user)),
  activity: ok(req => activityService.one(req.user, req.params.id)),
  createActivity: created(req => activityService.create(req.user, req.body)),
  reviseActivity: created(req => activityService.revise(req.user, req.params.id, req.body)),
  requestActivityChange: created(req => activityService.requestChange(req.user, req.params.id, req.body)),
  resolveActivityChange: ok(req => activityService.resolveChangeRequest(req.user, req.params.id, req.params.requestId, req.body)),
  withdrawActivity: ok(req => activityService.withdraw(req.user, req.params.id, req.body)),
  submitActivity: created(req => activityService.submit(req.user, req.params.id, req.body)),
  responseTasks: ok(req => assessmentService.responseTasks(req.user)),
  responseTask: ok(req => assessmentService.responseTask(req.user, req.params.recipientId)),
  saveResponseDraft: ok(req => assessmentService.saveResponseDraft(req.user, req.params.recipientId, req.body)),
  submitResponse: ok(req => assessmentService.submitResponse(req.user, req.params.recipientId)),
  assessmentWorkspace: ok(req => assessmentService.workspace(req.user)),
  assessmentDetail: ok(req => assessmentService.detail(req.user, req.params.activityId, req.params.studentId)),
  submitTeacherAssessment: created(req => assessmentService.submitTeacherAssessment(req.user, req.params.activityId, req.params.studentId, req.body)),
  assignPeerReview: created(req => assessmentService.assignPeer(req.user, req.params.activityId, req.body)),
  reviewAssessmentSubmission: ok(req => assessmentService.reviewSubmission(req.user, req.params.submissionId, req.body)),
  memorableActivities: ok(req => memorableService.workspace(req.user, req.query.periodId)),
  saveMemorableActivity: created(req => memorableService.save(req.user, req.body)),
  submitMemorableActivity: ok(req => memorableService.submit(req.user, req.params.selectionId)),
  approvals: ok(req => approvalService.workspace(req.user)),
  decideApproval: ok(req => approvalService.decide(req.user, req.params.id, req.body)),
  portfolios: ok(req => portfolioService.list(req.user, req.query.periodId)),
  portfolioEditor: ok(req => portfolioService.editor(req.user, req.params.studentId, req.query.periodId)),
  portfolioView: ok(req => portfolioService.view(req.user, req.params.studentId, req.query.periodId)),
  portfolio: ok(req => portfolioService.detail(req.user, req.params.studentId, req.query.periodId)),
  createPortfolioDraft: created(req => portfolioService.createDraft(req.user, { ...req.body, studentId: req.params.studentId })),
  submitPortfolio: ok(req => portfolioService.submit(req.user, req.params.id)),
  reviewPortfolio: ok(req => portfolioService.review(req.user, req.params.id, req.body)),
  aiDrafts: ok(req => aiService.list(req.user)),
  aiDraft: ok(req => aiService.detail(req.user, req.params.manifestId)),
  generateAiDraft: created(req => aiService.generate(req.user, req.params.manifestId)),
  decideAiCandidate: created(req => aiService.decide(req.user, req.params.candidateId, req.body)),
  editLearnerNarrative: ok(req => aiService.editNarrative(req.user, req.params.narrativeId, req.body)),
  llmPlaygroundStatus: ok(req => llmPlaygroundService.status(req.user)),
  async streamLlmPlayground(req, res, next) {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      const { response: upstream, model } = await llmPlaygroundService.openChat(req.user, req.body, abort.signal);
      res.status(200);
      res.setHeader('content-type', 'text/event-stream; charset=utf-8');
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('connection', 'keep-alive');
      res.flushHeaders();
      const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send('meta', { model: model.id, contextWindow: model.contextWindow });
      let usage = null;
      await openAiCompatibleChat.consume(upstream, { onDelta: text => send('delta', { text }), onUsage: value => { usage = value; } });
      send('done', { usage });
      res.end();
    } catch (error) {
      if (!res.headersSent) next(error);
      else { res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Streaming failed', code: error.code || 'UPSTREAM_UNAVAILABLE' })}\n\n`); res.end(); }
    }
  },
};
