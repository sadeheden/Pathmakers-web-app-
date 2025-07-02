import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../../data/userInfo.json");

// Load user info from JSON file
const getUserInfo = () => {
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    }
    return {};
};

// Save user info to JSON file
const saveUserInfo = (data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// GET User Info
router.get("/user", (req, res) => {
    try {
        const userInfo = getUserInfo();
        res.json(userInfo);
    } catch (error) {
        console.error("Error fetching user info:", error);
        res.status(500).json({ message: "Error fetching user data" });
    }
});

// UPDATE User Info (PUT)
router.put("/user", (req, res) => {
    try {
        const newUserData = req.body;

        // ✅ Load existing user data
        const existingUserData = getUserInfo();

        // ✅ Merge new values with existing user data (only update provided fields)
        const updatedUserData = { ...existingUserData, ...newUserData };

        // ✅ Save updated data
        saveUserInfo(updatedUserData);
        res.json(updatedUserData);
    } catch (error) {
        console.error("Error updating user info:", error);
        res.status(500).json({ message: "Error updating user data" });
    }
});

export default router;
