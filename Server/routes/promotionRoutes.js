import express from 'express';
import {
  promoteStudent,
  getPromotionHistory,
  getAllPromotionHistory,
} from '../controllers/promotionController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/promote-student', isAdmin, promoteStudent);
router.get('/history', isAdmin, getAllPromotionHistory);
router.get('/history/:studentId', isAdmin, getPromotionHistory);

export default router;
