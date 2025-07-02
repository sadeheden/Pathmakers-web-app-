import fs from "fs/promises";

const FILE_PATH = "data/flights.json";

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
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

const writeJsonFile = async (filePath, data) => {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        throw new Error("Error writing to file");
    }
};

export const getFlightsByCity = async (city) => {
    const flights = await readJsonFile(FILE_PATH);
    return flights.filter(flight => flight.city.toLowerCase() === city.toLowerCase());
};
