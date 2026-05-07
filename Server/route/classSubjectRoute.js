import express from 'express';
import { isAdmin } from '../Middleware/auth.js';
import {
  getClassSubjectAssignments,
  createOrUpdateClassSubjects,
} from '../controller/classSubjectController.js';

const router = express.Router();
router.use(isAdmin);

router.get('/', getClassSubjectAssignments);
router.post('/create-or-update', createOrUpdateClassSubjects);

export default router;
