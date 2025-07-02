import { ObjectId } from 'mongodb';
import City from './cities.model.js';
 
// Fetch all cities
export async function getCities(req, res) {
  try {
    const cities = await City.findAll();
    res.status(200).json(cities);
  } catch (error) {
    console.error("Error in getCities:", error);
    res.status(500).json({ error: 'Error fetching cities', details: error.message });
  }
}



// Fetch a city by ID
export async function getCityById(req, res) {
    let { id } = req.params;
 
    // Check if the ID is valid
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
 
 
// Add a new city
export async function addCity(req, res) {
    let { city } = req.body;
    console.log(city);
 
    // Check if the city name is provided
    if (!city) {
        return res.status(400).json({ error: 'City name is required.' });
    }
 
    // Create a new city object
    const newCity = new City(city);
 
    try {
        const result = await newCity.save();
        return res.status(201).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while adding the city.' });
    }
}
 
// Update an existing city
export async function updateCity(req, res) {
    let { id } = req.params;
    let { city } = req.body;
 
    // Check if the ID and city name are provided
    if (!id) {
        return res.status(400).json({ error: 'City ID is required.' });
    }
 
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid City ID.' });
    }
 
    if (!city) {
        return res.status(400).json({ error: 'City name is required.' });
    }
 
    // Create a new city object
    const updatedCity = new City(city);
 
    try {
        const result = await updatedCity.update(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while updating the city.' });
    }
}
 
// Delete a city
export async function deleteCity(req, res) {
    let { id } = req.params;
 
    // Check if the ID is valid
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
 