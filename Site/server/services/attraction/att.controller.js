import { ObjectId } from 'mongodb';
import Attraction from './att.model.js';

// Get all attractions
export async function getAttractions(req, res) {
  try {
    const attractions = await Attraction.findAll();
    return res.status(200).json(attractions);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while fetching attractions.' });
  }
}
// att.controller.js
export async function getAttractionsByCity(req, res) {
  const city = req.params.city;
  try {
    // assuming Attraction.findByCity exists and does a case-insensitive search
    const attractions = await Attraction.findByCity(city);
    if (!attractions || !attractions.length) {
      return res.status(404).json({ error: `No attractions found for city: ${city}` });
    }
    res.status(200).json({ attractions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Get attraction by ID
export async function getAttractionById(req, res) {
  const { id } = req.params;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid or missing Attraction ID.' });
  }

  try {
    const attraction = await Attraction.findById(id);
    if (!attraction) {
      return res.status(404).json({ error: 'Attraction not found.' });
    }
    return res.status(200).json(attraction);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while fetching the attraction.' });
  }
}

// Add a new attraction
export async function addAttraction(req, res) {
  const { name, city, description } = req.body;

  if (!name || !city) {
    return res.status(400).json({ error: 'Attraction name and city are required.' });
  }

  const newAttraction = new Attraction({ name, city, description });

  try {
    const result = await newAttraction.save();
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while adding the attraction.' });
  }
}

// Update attraction
export async function updateAttraction(req, res) {
  const { id } = req.params;
  const { name, city, description } = req.body;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid or missing Attraction ID.' });
  }

  if (!name || !city) {
    return res.status(400).json({ error: 'Attraction name and city are required.' });
  }

  const updatedAttraction = new Attraction({ name, city, description });

  try {
    const result = await updatedAttraction.update(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while updating the attraction.' });
  }
}

// Delete attraction
export async function deleteAttraction(req, res) {
  const { id } = req.params;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid or missing Attraction ID.' });
  }

  try {
    const result = await Attraction.delete(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred while deleting the attraction.' });
  }
}
// NEW: fetch multiple city docs by ids and return all attraction names
export async function getAttractionNamesByCityDocIds(ids = []) {
  const db = await connectDB();
  const objectIds = ids.map(id => new ObjectId(String(id)));
  const docs = await db.collection(COLLECTION_NAME)
    .find({ _id: { $in: objectIds }, isDeleted: { $ne: true } })
    .project({ attractions: 1 })
    .toArray();

  const names = [];
  for (const d of docs) {
    const arr = Array.isArray(d?.attractions) ? d.attractions : [];
    for (const a of arr) {
      const n = a?.name || a?.title || a?.label;
      if (n) names.push(n);
    }
  }
  // de-dup while preserving order
  return Array.from(new Set(names));
}

// NEW: get a single name by doc id + index
export async function getAttractionNameByDocAndIndex(id, idx) {
  const db = await connectDB();
  const doc = await db.collection(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(String(id)), isDeleted: { $ne: true } }, { projection: { attractions: 1 }});
  const arr = Array.isArray(doc?.attractions) ? doc.attractions : [];
  const item = arr[idx];
  return item ? (item.name || item.title || item.label) : null;
}
