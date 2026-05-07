import express from 'express';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(isAdmin, createStudent)
  .get(isAdmin, getStudents);

router.route('/:id')
  .get(isAdmin, getStudentById)
  .put(isAdmin, updateStudent)
  .delete(isAdmin, deleteStudent);

export default router;
