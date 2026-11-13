import { Router } from 'express';
import multer from 'multer';
import * as c from '../controllers/api.js';
const router=Router();const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:1048576}});
router.get('/catalogue',c.catalogue);router.get('/records',c.records);router.get('/template.csv',c.template);router.post('/preview',upload.single('file'),c.processCsv(false));router.post('/commit',upload.single('file'),c.processCsv(true));
export default router;
