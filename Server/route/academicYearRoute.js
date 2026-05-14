import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  setActiveAcademicYear,
  deleteAcademicYear,
} from "../controller/academicYearController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createAcademicYear);
router.get("/", getAcademicYears);
router.get("/:id", getAcademicYearById);
router.put("/:id", updateAcademicYear);
router.put("/:id/set-active", setActiveAcademicYear);
router.delete("/:id", deleteAcademicYear);

export default router;
