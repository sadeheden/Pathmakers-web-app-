import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, "../../data/orders.json");

// ✅ Load orders from JSON file
export const loadOrders = () => {
    if (fs.existsSync(FILE_PATH)) {
        try {
            const data = fs.readFileSync(FILE_PATH, "utf-8");
            return JSON.parse(data) || [];
        } catch (error) {
            console.error("⚠️ Error reading orders.json:", error);
            return [];
        }
    }
    return []; // Default to an empty array if no file exists
};

// ✅ Save orders to JSON file
export const saveOrders = (orders) => {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error("⚠️ Error saving orders.json:", error);
    }
};
