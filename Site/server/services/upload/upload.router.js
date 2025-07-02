import express from "express";
import multer from "multer";
import { uploadToCloudinary } from "./upload.controller.js";

const router = express.Router();

// ✅ Use memory storage (No need to save files locally)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/single", upload.single("file"), uploadToCloudinary);

export default router;
