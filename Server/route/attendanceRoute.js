import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import { deleteAttendance, getAttendance, saveAttendance } from "../controller/attendanceController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", saveAttendance);
router.get("/", getAttendance);
router.delete("/:id", deleteAttendance);

export default router;
