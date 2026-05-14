import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} from "../controller/classController.js";

const router = express.Router();
router.use(isAdmin);

router.post("/", createClass);
router.get("/", getAllClasses);
router.get("/:id", getClassById);
router.put("/:id", updateClass);
router.delete("/:id", deleteClass);

export default router;
