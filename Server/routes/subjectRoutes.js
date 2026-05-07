import express from 'express';
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(isAdmin, createSubject)
  .get(isAdmin, getSubjects);

router.route('/:id')
  .get(isAdmin, getSubjectById)
  .put(isAdmin, updateSubject)
  .delete(isAdmin, deleteSubject);

export default router;
