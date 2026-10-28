import { Router } from 'express';
import { controller } from '../controllers/api.js';

export const api = Router();

api.get('/session', controller.session);
api.get('/reference-data', controller.referenceData);
api.get('/staff', controller.staff);
api.get('/policy', controller.policyWorkspace);
api.post('/policy/preview', controller.previewPolicy);
api.post('/policy/overrides', controller.applyPolicy);

api.get('/activities', controller.activities);
api.post('/activities', controller.createActivity);
api.get('/activities/:id', controller.activity);
api.post('/activities/:id/revisions', controller.reviseActivity);
api.post('/activities/:id/change-requests', controller.requestActivityChange);
api.post('/activities/:id/submit', controller.submitActivity);

api.get('/approvals', controller.approvals);
api.post('/approvals/:id/decision', controller.decideApproval);

api.get('/portfolios', controller.portfolios);
api.get('/portfolios/:studentId', controller.portfolio);
api.post('/portfolios/:studentId/drafts', controller.createPortfolioDraft);
api.post('/portfolio-versions/:id/submit', controller.submitPortfolio);
api.post('/portfolio-versions/:id/review', controller.reviewPortfolio);
