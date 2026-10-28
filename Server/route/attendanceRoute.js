import express from "express";
import multer from "multer";
import path from "path";
import { isAdmin } from "../Middleware/auth.js";
import {
  deleteAttendance,
  downloadAttendanceTemplate,
  getAttendance,
  getAttendanceSummary,
  importAttendanceFromExcel,
  saveAttendance,
  saveAttendanceSummary,
} from "../controller/attendanceController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".xlsx", ".xls"].includes(extension)) {
      return callback(new Error("Only .xlsx and .xls files are allowed."));
    }
    return callback(null, true);
  },
});
const handleAttendanceUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ success: false, message: error.message });
    }
    return next();
  });
};

router.use(isAdmin);

router.post("/", saveAttendance);
router.get("/", getAttendance);
router.get("/summary/template", downloadAttendanceTemplate);
router.get("/summary", getAttendanceSummary);
router.post("/summary", saveAttendanceSummary);
router.post("/summary/import-excel", handleAttendanceUpload, importAttendanceFromExcel);
router.delete("/:id", deleteAttendance);

export default router;
