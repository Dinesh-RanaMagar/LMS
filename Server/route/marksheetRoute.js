import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
  createMarksheet,
  getMarksheets,
  getMarksheetById,
  getMarksheetsByStudent,
  getMarksheetsByExam,
  getMarksheetByStudentExam,
  updateMarksheet,
  deleteMarksheet
} from "../controller/marksheetController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createMarksheet);
router.get("/", getMarksheets);
router.get("/student/:studentId/exam/:examId", getMarksheetByStudentExam);
router.get("/student/:studentId", getMarksheetsByStudent);
router.get("/exam/:examId", getMarksheetsByExam);
router.get("/:id", getMarksheetById);
router.put("/:id", updateMarksheet);
router.delete("/:id", deleteMarksheet);

export default router;