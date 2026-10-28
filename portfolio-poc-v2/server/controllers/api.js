import { identityService } from '../services/identityService.js';
import { activityService } from '../services/activityService.js';
import { approvalService } from '../services/approvalService.js';
import { portfolioService } from '../services/portfolioService.js';

const ok = work => (req, res, next) => { try { res.json(work(req)); } catch (error) { next(error); } };
const created = work => (req, res, next) => { try { res.status(201).json(work(req)); } catch (error) { next(error); } };

export const controller = {
  session: ok(req => identityService.session(req.user)),
  referenceData: ok(req => identityService.referenceData(req.user)),
  staff: ok(req => identityService.directory(req.user, req.query)),
  policyWorkspace: ok(req => identityService.policyWorkspace(req.user)),
  previewPolicy: ok(req => identityService.previewPolicy(req.user, req.body)),
  applyPolicy: created(req => identityService.applyPolicy(req.user, req.body)),
  activities: ok(req => activityService.list(req.user)),
  activity: ok(req => activityService.one(req.user, req.params.id)),
  createActivity: created(req => activityService.create(req.user, req.body)),
  reviseActivity: created(req => activityService.revise(req.user, req.params.id, req.body)),
  requestActivityChange: created(req => activityService.requestChange(req.user, req.params.id, req.body)),
  submitActivity: created(req => activityService.submit(req.user, req.params.id, req.body)),
  approvals: ok(req => approvalService.workspace(req.user)),
  decideApproval: ok(req => approvalService.decide(req.user, req.params.id, req.body)),
  portfolios: ok(req => portfolioService.list(req.user, req.query.periodId)),
  portfolio: ok(req => portfolioService.detail(req.user, req.params.studentId, req.query.periodId)),
  createPortfolioDraft: created(req => portfolioService.createDraft(req.user, { ...req.body, studentId: req.params.studentId })),
  submitPortfolio: ok(req => portfolioService.submit(req.user, req.params.id)),
  reviewPortfolio: ok(req => portfolioService.review(req.user, req.params.id, req.body)),
};
