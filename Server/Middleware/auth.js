import jwt from "jsonwebtoken";
import Admin from "../model/adminModel.js";

export const isAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No authorization token provided" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
            return res.status(401).json({ success: false, message: "Admin not found" });
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired" });
        }
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};
