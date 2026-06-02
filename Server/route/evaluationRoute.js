import express from 'express';
import { isAdmin } from '../Middleware/auth.js';
import { compareEvaluation } from '../controller/evaluationController.js';

const router = express.Router();
router.use(isAdmin);
router.post('/compare', compareEvaluation);

export default router;
