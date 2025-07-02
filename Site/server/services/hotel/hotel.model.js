import fs from "fs/promises";

const FILE_PATH = "data/hotels.json";

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};
export const loadHotels = async () => {
    try {
        if (!(await fileExists(FILE_PATH))) {
            console.warn("⚠️ Hotels data file does not exist. Creating a new one.");
            await fs.writeFile(FILE_PATH, JSON.stringify([], null, 2)); // Create an empty file if missing
            return [];
        }

        const data = await fs.readFile(FILE_PATH, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Error reading hotels data:", error);
        return [];
    }
};


const readJsonFile = async (filePath) => {
    try {
        if (!(await fileExists(filePath))) {
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
            return [];
        }
        const data = await fs.readFile(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

export const getHotelsByCity = async (city) => {
    try {
        const hotelsData = await loadHotels(); // ✅ Now reading from JSON file

        if (!hotelsData || hotelsData.length === 0) {
            console.warn("⚠️ No hotel data found!");
            return [];
        }

        console.log("🔍 Searching for city:", city);

        // Ensure case-insensitive search
        const cityHotels = hotelsData.find(
            (cityData) => cityData.city.toLowerCase() === city.toLowerCase()
        );

        if (!cityHotels) {
            console.warn(`🚨 No hotels found for city: ${city}`);
            return [];
        }

        console.log(`✅ Found ${cityHotels.hotels.length} hotels for ${city}`);
        return cityHotels.hotels;
    } catch (error) {
        console.error("❌ Error fetching hotels:", error);
        return [];
    }
};



