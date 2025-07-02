import { getFlightsByCity } from "./flights.model.js";

export const getFlights = async (req, res) => {
    try {
        const { city } = req.params;
        const flights = await getFlightsByCity(city);

        if (!flights.length) {
            return res.status(404).json({ error: `No flights found for city: ${city}` });
        }

        res.json(flights);
    } catch (error) {
        console.error("Error fetching flights:", error);
        res.status(500).json({ error: "Server error" });
    }
};
