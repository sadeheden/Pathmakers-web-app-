const { getUserProfile, saveUserProfile } = require("./info.model");

// Get User Profile
const getUser = (req, res) => {
    const userProfile = getUserProfile();
    console.log("🔍 Fetching user profile from JSON:", userProfile); // ✅ Debugging
    if (!userProfile) {
        return res.status(404).json({ message: "User profile not found" });
    }
    res.json(userProfile);
};
const userProfile = getUserProfile();
if (!userProfile) {
    return res.status(404).json({ message: "User profile not found" });
}

// Update User Profile
const updateUser = (req, res) => {
    const updatedProfile = req.body;

    if (!updatedProfile.username || !updatedProfile.address || !updatedProfile.city || 
        !updatedProfile.country || !updatedProfile.phone || !updatedProfile.gender || 
        !updatedProfile.membership) {
        return res.status(400).json({ message: "All fields are required" });
    }

    saveUserProfile(updatedProfile);
    res.json(updatedProfile);
};

module.exports = { getUser, updateUser };
