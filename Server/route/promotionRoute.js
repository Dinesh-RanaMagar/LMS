import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
  promoteStudent,
  getPromotionHistory,
  getAllPromotionHistory,
  getEligibleStudents,
  promoteStudents,
} from "../controller/promotionController.js";

const router = express.Router();
router.use(isAdmin);

router.get("/eligible", getEligibleStudents);
router.post("/promote", promoteStudents);
router.post("/promote-student", promoteStudent);
router.get("/history", getAllPromotionHistory);
router.get("/history/:studentId", getPromotionHistory);

export default router;
