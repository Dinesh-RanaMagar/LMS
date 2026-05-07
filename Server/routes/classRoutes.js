import express from 'express';
import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} from '../controllers/classController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createClass)
  .get(getAllClasses);

router.route('/:id')
  .get(getClassById)
  .put(updateClass)
  .delete(deleteClass);

export default router;
