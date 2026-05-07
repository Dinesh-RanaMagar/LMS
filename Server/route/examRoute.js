import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
    createExam,
    createBulkExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    updateStatus,
    lockExam,
    unlockExam,
    publishResult,
} from "../controller/examController.js";

const router = express.Router();
router.use(isAdmin);

// Standard CRUD
router.post("/",            createExam);
router.post("/create-bulk", createBulkExam);
router.get("/",             getExams);
router.get("/:id",          getExamById);
router.put("/:id",          updateExam);
router.delete("/:id",       deleteExam);

// Status management
router.patch("/:id/status", updateStatus);
router.post("/:id/lock",    lockExam);
router.post("/:id/unlock",  unlockExam);
router.post("/:id/publish-result", publishResult);

export default router;
