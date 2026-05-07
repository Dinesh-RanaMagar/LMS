import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} from "../controller/studentController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createStudent);
router.get("/", getStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;