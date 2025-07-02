import fs from "fs/promises";

const FILE_PATH = "data/cities.json";

// פונקציה לבדוק אם הקובץ קיים
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        console.error(`File not found: ${filePath}`, error);
        return false;
    }
};

// פונקציה לקרוא את הקובץ JSON
const readJsonFile = async (filePath) => {
    try {
        if (!(await fileExists(filePath))) {
            console.log(`File does not exist. Creating new file at ${filePath}`);
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
            return [];
        }
        const data = await fs.readFile(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading JSON file:", error);
        return [];
    }
};

// פונקציה לקבלת הערים מתוך הקובץ
export const getCities = async () => {
    return await readJsonFile(FILE_PATH);
};
