const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "userProfile.json");

// Read user data from JSON file
const getUserProfile = () => {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading user profile:", error);
        return null;
    }
};

// Write user data to JSON file
const saveUserProfile = (userData) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving user profile:", error);
    }
};

module.exports = { getUserProfile, saveUserProfile };
