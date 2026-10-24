import { Router } from 'express';
import multer from 'multer';
import { requireRoles, requireSession } from '../middleware/session.js';
import * as c from '../controllers/apiController.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});
const sheetUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:4*1024*1024}});

router.get('/health',(req,res)=>res.json({ok:true,time:new Date().toISOString()}));
router.get('/demo-users',c.demoUsers);
router.post('/auth/login',c.signIn);
router.use(requireSession);
router.get('/auth/session',c.sessionInfo);
router.post('/auth/logout',c.signOut);
router.post('/auth/switch',c.switchAccount);
router.get('/dashboard',c.dashboard);

router.get('/activities',c.listActivities);
router.get('/activity-import/template/:format',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.downloadRosterTemplate);
router.post('/activity-imports',requireRoles('class_teacher','activity_teacher','staff','school_admin'),sheetUpload.single('file'),c.importRoster);
router.get('/activity-imports/:id',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.rosterImportDetail);
router.patch('/activity-imports/:id/rows/:rowId',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.editRosterImportRow);
router.get('/activities/:id',c.activityDetail);
router.post('/activities',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.createActivity);
router.patch('/activities/:id',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.updateActivity);
router.get('/activities/:id/questionnaire-template',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.downloadQuestionnaireTemplate);
router.post('/activities/:id/questionnaire-imports',requireRoles('class_teacher','activity_teacher','staff','school_admin'),sheetUpload.single('file'),c.importQuestionnaire);
router.get('/questionnaire-imports/:batchId',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.questionnaireImportDetail);
router.patch('/questionnaire-imports/:batchId/rows/:rowId',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.editQuestionnaireImportRow);
router.post('/questionnaire-imports/:batchId/submit',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.submitQuestionnaire);
router.get('/students',c.listStudents);
router.get('/students/:id',c.studentDetail);
router.post('/students',requireRoles('staff','school_admin'),c.createStudent);
router.post('/students/:id/memberships',requireRoles('staff','school_admin'),c.changeMembership);
router.post('/students/:id/school-status',requireRoles('staff','school_admin'),c.changeSchoolStatus);
router.get('/classes',c.listClasses);
router.post('/classes',requireRoles('staff','school_admin'),c.createClass);
router.get('/periods',c.periods);
router.post('/rollovers/preview',requireRoles('staff','school_admin'),c.rolloverPreview);
router.post('/rollovers/:id/apply',requireRoles('staff','school_admin'),c.rolloverApply);

router.get('/questions',c.listQuestions);
router.get('/decisions',requireRoles('staff','school_admin'),c.listDecisions);
router.patch('/decisions/:id',requireRoles('staff','school_admin'),c.updateDecision);
router.get('/evidence',c.listEvidence);
router.get('/evidence/sample/:format',c.sampleImage);
router.post('/evidence/upload',upload.single('file'),c.uploadEvidence);
router.post('/evidence/reflection',c.createReflection);
router.post('/evidence/:id/disable',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.disableEvidence);
router.post('/evidence/:id/publish',requireRoles('class_teacher','activity_teacher','staff','school_admin'),c.publishEvidence);
router.get('/memorable',c.memorableState);
router.post('/memorable/window',requireRoles('staff','school_admin'),c.setMemorableWindow);
router.post('/memorable/selection',requireRoles('student'),c.submitMemorableSelection);
router.get('/ai/drafts',c.listAi);
router.post('/ai/preview-input',c.aiInput);
router.post('/ai/drafts',c.aiDraft);
router.post('/feedback',requireRoles('class_teacher','activity_teacher','staff'),c.createFeedback);
router.patch('/feedback/:id',requireRoles('class_teacher','activity_teacher','staff'),c.updateFeedback);

router.get('/users',requireRoles('staff','school_admin'),c.listUsers);
router.post('/users',requireRoles('school_admin'),c.createDemoUser);
router.get('/sessions',requireRoles('school_admin'),c.listSessions);

export default router;
