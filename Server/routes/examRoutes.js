import express from 'express';
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} from '../controllers/examController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(isAdmin, createExam)
  .get(isAdmin, getExams);

router.route('/:id')
  .get(isAdmin, getExamById)
  .put(isAdmin, updateExam)
  .delete(isAdmin, deleteExam);

export default router;
