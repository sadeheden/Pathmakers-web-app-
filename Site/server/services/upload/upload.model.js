import { v2 as cloudinary } from 'cloudinary';
import { emptyDir } from 'fs-extra';
import path from 'path';
import { __dirname } from '../../globals.js';

function setCloud() {
    // מגדירים את הענן
    cloudinary.config({
        cloud_name: 'dnnmhrsja',
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
    });
}

async function emptyFolder() {
    // מוחקים את התמונה מהתיקייה
    await emptyDir(path.join(__dirname, 'files'));
}

export async function uploadToCloud(filePath) {
    setCloud();
    let result = await cloudinary.uploader.upload(filePath, { upload_preset: "shenkar2025" });
    await emptyFolder();
    return result;

}

