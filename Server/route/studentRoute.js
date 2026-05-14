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
  downloadStudentImportTemplate
} from "../controller/studentController.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/student-imports",
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("Only .xlsx and .xls Excel files are allowed"));
    }

    cb(null, true);
  }
});

router.use(isAdmin);

router.get("/import-template", downloadStudentImportTemplate);
router.post("/import-excel", upload.single("file"), importStudentsFromExcel);
router.post("/", createStudent);
router.get("/", getStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
