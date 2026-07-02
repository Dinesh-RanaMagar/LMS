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
  importStudentsFromExcel,
  downloadStudentImportTemplate,
  getStudentEnrollmentHistory,
} from "../controller/studentController.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/student-imports",
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      return cb(new Error("Only .xlsx and .xls files are allowed"));
    }
    cb(null, true);
  },
});

router.use(isAdmin);

router.get("/import-template",              downloadStudentImportTemplate);
router.post("/import-excel", upload.single("file"), importStudentsFromExcel);
router.post("/",             createStudent);
router.get("/",              getStudents);
router.get("/:id",           getStudentById);
router.put("/:id",           updateStudent);
router.delete("/:id",        deleteStudent);
router.get("/:id/enrollments", getStudentEnrollmentHistory);

export default router;
