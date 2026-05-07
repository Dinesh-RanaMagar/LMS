import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
} from "../controller/subjectController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createSubject);
router.get("/", getSubjects);
router.get("/:id", getSubjectById);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

export default router;
