import { getCities } from "./cities.model.js";

export const getCitiesList = async (req, res) => {
    try {
        const cities = await getCities();
        if (!cities || cities.length === 0) {
            return res.status(404).json({ error: "No cities found" });
        }
        res.json(cities);
    } catch (error) {
        console.error("Error fetching cities:", error);
        res.status(500).json({ error: "Server error" });
    }
};