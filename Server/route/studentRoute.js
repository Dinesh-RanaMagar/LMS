import express from "express";
import multer from "multer";
import path from "path";
import { isAdmin } from "../Middleware/auth.js";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  previewStudentImport,
  importStudentsFromExcel,
  downloadStudentImportTemplate,
  getStudentEnrollmentHistory,
} from "../controller/studentController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      return cb(new Error("Only .xlsx, .xls, and .csv files are allowed"));
    }
    cb(null, true);
  },
});

const handleImportUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ success: false, message: error.message });
    }
    next();
  });
};

router.use(isAdmin);

router.get("/import-template",              downloadStudentImportTemplate);
router.post("/import-preview", handleImportUpload, previewStudentImport);
router.post("/import-excel", handleImportUpload, importStudentsFromExcel);
router.post("/",             createStudent);
router.get("/",              getStudents);
router.get("/:id",           getStudentById);
router.put("/:id",           updateStudent);
router.delete("/:id",        deleteStudent);
router.get("/:id/enrollments", getStudentEnrollmentHistory);

export default router;
