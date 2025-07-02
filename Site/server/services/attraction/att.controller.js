// att.controller.js
import { getAttractionsByCity } from "./att.model.js";  // אם יש צורך בייבוא מהמודל

export const getAttractions = async (req, res) => {
  const city = req.params.city?.trim().toLowerCase(); // Ensure lowercase handling
  try {
    const attractions = await getAttractionsByCity(city);

    if (!attractions || attractions.length === 0) {
      return res.status(404).json({ error: `No attractions found for city: ${city}` });
    }

    res.status(200).json({ city, attractions });
  } catch (error) {
    console.error("Error fetching attractions:", error);
    res.status(500).json({ error: "Server error" });
  }
};


export { getAttractionsByCity };  // הוספת יצוא של הפונקציה
