import dotenv from 'dotenv';
dotenv.config();  // Load environment variables

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});
export async function uploadToCloudinary(req, res) {
    try {
        console.log("✅ Multer received file:", req.file);

        if (!req.file) {
            console.error("❌ No file received.");
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("📂 File Details:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        console.log("✅ Cloudinary Credentials:", {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_SECRET ? "Exists ✅" : "❌ MISSING"
        });

        // Upload to Cloudinary
        cloudinary.uploader.upload_stream(
            { folder: "user_profiles", resource_type: "auto" },
            (error, result) => {
                if (error) {
                    console.error("🚨 Cloudinary Upload Error:", error);
                    return res.status(500).json({ error: "Cloudinary upload failed", details: error.message });
                }

                if (!result || !result.secure_url) {
                    console.error("🚨 No secure_url received from Cloudinary", result);
                    return res.status(500).json({ error: "No secure_url received from Cloudinary" });
                }

                console.log("✅ Cloudinary Upload Success:", result);
                return res.status(200).json({ success: true, url: result.secure_url });
            }
        ).end(req.file.buffer);

    } catch (error) {
        console.error("🚨 Server Error:", error);
        return res.status(500).json({ error: "Failed to upload image", details: error.message });
    }
}

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional function for uploading default profile image
export async function uploadDefaultProfileImage(req, res) {
    const filePath = path.join(__dirname, "../client/src/assets/images/default_profile.jpg");

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Image file not found locally" });
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: "user_profiles",
            public_id: "default_profile",
            overwrite: true,
            resource_type: "image"
        });

        console.log("✅ Uploaded default_profile.jpg:", result.secure_url);
        return res.status(200).json({ success: true, url: result.secure_url });
    } catch (error) {
        console.error("🚨 Error uploading default image:", error);
        return res.status(500).json({ error: "Failed to upload default image", details: error.message });
    }
}
