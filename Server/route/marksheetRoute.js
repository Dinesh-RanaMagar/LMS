import express from "express";
import multer from "multer";
import path from "path";
import { isAdmin } from "../Middleware/auth.js";
import {
  createMarksheet,
  getMarksheets,
  getMarksheetById,
  getMarksheetsByStudent,
  getMarksheetsByExam,
  getMarksheetByStudentExam,
  updateMarksheet,
  deleteMarksheet,
  previewMarksImport,
  importMarksFromExcel
} from "../controller/marksheetController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      return cb(new Error("Only .xlsx and .xls files are allowed"));
    }
    cb(null, true);
  },
});
const handleMarksUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ success: false, message: error.message });
    }
    next();
  });
};

router.use(isAdmin);

router.post("/import-preview", handleMarksUpload, previewMarksImport);
router.post("/import-excel", handleMarksUpload, importMarksFromExcel);
router.post("/", createMarksheet);
router.get("/", getMarksheets);
router.get("/student/:studentId/exam/:examId", getMarksheetByStudentExam);
router.get("/student/:studentId", getMarksheetsByStudent);
router.get("/exam/:examId", getMarksheetsByExam);
router.get("/:id", getMarksheetById);
router.put("/:id", updateMarksheet);
router.delete("/:id", deleteMarksheet);

export default router;