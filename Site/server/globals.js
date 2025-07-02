import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

//העלאת קבצים מקומיים ולהעלאת תמונות לשירות Cloudinary.


// יצירת השרת Express
const server = express();
server.use(express.json());  // מאפשר קריאת JSON בבקשות

// הגדרת משתני Global (__filename, __dirname) בסביבה מודרנית (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// יצירת הגדרות עבור שמירת קבצים
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'files/')); // שימוש ב-__dirname כדי לקבוע נתיב יחסי
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// הגדרת העלאת קבצים עם Multer
const upload = multer({ storage });

// הגדרת פונקציה גלובלית להעלאת קבצים ל-Cloudinary
global.uploadImageToCloudinary = async function (imagePath) {
    try {
        let result = await cloudinary.uploader.upload(imagePath);
        console.log('Upload Success:', result.secure_url);
    }
    catch (err) {
        console.error('Upload failed:', err);
    }
};

// הגדרת השרת להעלאת קובץ עם multer ו-Cloudinary
server.post('/upload', upload.single('image'), async (req, res) => {
    try {
        // העלאת הקובץ ל-Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path);
        res.json({ url: result.secure_url }); // החזרת URL המאובטח של התמונה
    } catch (error) {
        res.status(500).send(error.message); // שליחת שגיאה במידה ויש בעיה בהעלאה
    }
});

export { __filename, __dirname, storage, upload };
