import express from 'express';
import {
  createMarksheet,
  getMarksheets,
  getMarksheetById,
  getMarksheetByStudentAndExam,
  updateMarksheet,
  deleteMarksheet,
} from '../controllers/marksheetController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(isAdmin, createMarksheet)
  .get(isAdmin, getMarksheets);

router.route('/:id')
  .get(isAdmin, getMarksheetById)
  .put(isAdmin, updateMarksheet)
  .delete(isAdmin, deleteMarksheet);

router.get('/student/:studentId/exam/:examId', isAdmin, getMarksheetByStudentAndExam);

export default router;
