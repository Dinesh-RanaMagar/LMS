import Admin from "../model/adminModel.js";
import jwt from "jsonwebtoken";

// REGISTER (only once during setup)
export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        // Check if admin already exists
        const adminCount = await Admin.countDocuments();
        if (adminCount > 0) {
            return res.status(403).json({ success: false, message: "Admin account already exists. Contact superadmin for access." });
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // Create admin
        const admin = await Admin.create({ name, email, password });

        res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// LOGIN
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Find admin with password field
        const admin = await Admin.findOne({ email }).select("+password");
        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Compare password
        const isPasswordMatch = await admin.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || "7d" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ADMIN PROFILE
export const getAdminProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            admin: req.admin
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// LOGOUT (frontend handles this by removing token)
export const logoutAdmin = async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};