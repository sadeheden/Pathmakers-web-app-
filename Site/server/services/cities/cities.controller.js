import { ObjectId } from 'mongodb';
import City from './cities.model.js';
import { updateCityAttractionsInDatabase } from './cities.db.js';

// שליפת כל הערים
export async function getCities(req, res) {
  try {
    const cities = await City.findAll();
    res.status(200).json(cities);
  } catch (error) {
    console.error("Error in getCities:", error);
    res.status(500).json({ error: 'Error fetching cities', details: error.message });
  }
}

// שליפת עיר לפי ID
export async function getCityById(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'City ID is required.' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid City ID.' });
  }

  try {
    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({ error: 'City not found.' });
    }
    return res.status(200).json(city);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while fetching the city.' });
  }
}

// עדכון אטרקציות בתוך עיר ספציפית
export async function updateCityAttractions(req, res) {
  const { id } = req.params;
  const { attractions } = req.body; // מערך אטרקציות חדש

  if (!id) {
    return res.status(400).json({ error: 'City ID is required.' });
  }
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid City ID.' });
  }
  if (!Array.isArray(attractions)) {
    return res.status(400).json({ error: 'Attractions must be an array.' });
  }

  try {
    const updatedCity = await updateCityAttractionsInDatabase(id, attractions);
    return res.status(200).json({ message: 'Attractions updated successfully', city: updatedCity });
  } catch (error) {
    console.error('Error updating attractions:', error);
    return res.status(500).json({ error: 'An error occurred while updating attractions.' });
  }
}

export async function getCityByName(req, res) {
  const cityName = req.params.cityName;
  if (!cityName) {
    return res.status(400).json({ error: 'City name is required.' });
  }

  try {
    const city = await City.findByName(cityName);
    if (!city) {
      return res.status(404).json({ error: `City '${cityName}' not found.` });
    }

    return res.status(200).json(city);
  } catch (error) {
    console.error('Error in getCityByName:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
// עדכון עיר
export async function updateCity(req, res) {
  const { id } = req.params;
  const { city } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'City ID is required.' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid City ID.' });
  }

  if (!city) {
    return res.status(400).json({ error: 'City name is required.' });
  }

  const updatedCity = new City(city);

  try {
    const result = await updatedCity.update(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while updating the city.' });
  }
}

// מחיקת עיר
export async function deleteCity(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'City ID is required.' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid City ID.' });
  }

  try {
    const result = await City.delete(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while deleting the city.' });
  }
}

// עדכון עיר - פונקציה מעודכנת
export async function updateCityData(req, res) {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ error: 'City ID is required.' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid City ID.' });
  }

  try {
    // עדכון העיר עם הנתונים החדשים
    const result = await City.updateById(id, updateData);
    
    if (!result) {
      return res.status(404).json({ error: 'City not found.' });
    }

    return res.status(200).json({ 
      message: 'City updated successfully', 
      city: result 
    });
  } catch (error) {
    console.error('Error updating city:', error);
    return res.status(500).json({ 
      error: 'An error occurred while updating the city.',
      details: error.message 
    });
  }
}

// הוספת עיר חדשה
export async function addCity(req, res) {
  const { city } = req.body;

  if (!city || city.trim() === '') {
    return res.status(400).json({ error: 'City name is required.' });
  }

  try {
    // בדיקה אם העיר כבר קיימת
    const existingCity = await City.findByName(city.trim());
    if (existingCity) {
      return res.status(409).json({ error: 'City already exists.' });
    }

    const newCity = new City({
      city: city.trim(),
      attractions: [],
      hotels: [],
      flights: []
    });

    const result = await newCity.save();
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error adding city:', error);
    return res.status(500).json({ error: 'An error occurred while adding the city.', details: error.message });
  }
}
