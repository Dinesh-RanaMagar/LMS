import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import { createTeacher, deleteTeacher, getTeacherById, getTeachers, updateTeacher } from "../controller/teacherController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createTeacher);
router.get("/", getTeachers);
router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);

export default router;
