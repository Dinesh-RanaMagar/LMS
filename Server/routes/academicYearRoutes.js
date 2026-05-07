import express from 'express';
import {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear,
} from '../controllers/academicYearController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(isAdmin, createAcademicYear)
  .get(isAdmin, getAcademicYears);

router.route('/:id')
  .get(isAdmin, getAcademicYearById)
  .put(isAdmin, updateAcademicYear)
  .delete(isAdmin, deleteAcademicYear);

router.put('/:id/set-active', isAdmin, setActiveAcademicYear);

export default router;
