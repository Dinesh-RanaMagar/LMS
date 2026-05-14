import express from "express";
import { registerAdmin, loginAdmin, getAdminProfile, logoutAdmin } from "../controller/adminController.js";
import { isAdmin } from "../Middleware/auth.js";

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/profile", isAdmin, getAdminProfile);
router.post("/logout", isAdmin, logoutAdmin);

export default router;