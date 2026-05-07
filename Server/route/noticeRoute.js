import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import { createNotice, deleteNotice, getNotices, updateNotice } from "../controller/noticeController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createNotice);
router.get("/", getNotices);
router.put("/:id", updateNotice);
router.delete("/:id", deleteNotice);

export default router;
