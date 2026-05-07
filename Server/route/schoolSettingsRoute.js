import express from "express";
import { isAdmin } from "../Middleware/auth.js";
import { getSchoolSettings, updateSchoolSettings } from "../controller/schoolSettingsController.js";

const router = express.Router();
router.use(isAdmin);

router.get("/", getSchoolSettings);
router.put("/", updateSchoolSettings);

export default router;
