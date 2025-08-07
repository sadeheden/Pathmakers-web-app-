import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';
import City from './../cities/cities.model.js'; 
import Attraction from './../attraction/att.model.js';

export const addExistingAttractionToCity = async (req, res) => {
  const { cityId, attractionId } = req.params;

  console.log("➡️ קיבלתי בקשה להוסיף אטרקציה לעיר");
  console.log("📌 cityId:", cityId);
  console.log("📌 attractionId:", attractionId);

  try {
    const city = await City.findById(cityId);
    console.log("✅ עיר שנמצאה:", city?.name);

    const existingAttraction = await Attraction.findById(attractionId);
    console.log("✅ אטרקציה שנמצאה:", existingAttraction?.name);

    city.attractions.push({
      name: existingAttraction.name,
      price: existingAttraction.price,
      description: existingAttraction.description,
      openingHours: existingAttraction.openingHours,
      image: existingAttraction.image,
    });

    await city.save();
    console.log("✅ נשמרה העיר עם האטרקציה החדשה");

    res.status(200).json({
      message: '✅ האטרקציה נוספה בהצלחה למערך של העיר',
      cityId: city._id,
      attractionAdded: {
        name: existingAttraction.name,
        price: existingAttraction.price,
      },
    });
  } catch (error) {
    console.error('🔥 שגיאה:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
};
export const getManagerDashboardData = async (req, res) => {
  try {
    // Dummy or real data
    res.json({
      totalOrders: 42,
      totalRevenue: 12345.67,
      topDestinations: [
        { destination: "Paris", count: 10 },
        { destination: "New York", count: 8 },
      ],
      ordersByDate: [],
      revenueByDate: [],
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};

// **פונקציה חדשה** - הוספת אטרקציות חדשות ישירות למערך attractions בתוך מסמך העיר
export const addNewAttractionsToCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { cityId } = req.params;
    const { attractions } = req.body;

    // בדיקת נתונים חובה
    if (!cityId) {
      return res.status(400).json({ message: "Missing cityId" });
    }

    if (!attractions || !Array.isArray(attractions) || attractions.length === 0) {
      return res.status(400).json({ 
        message: "attractions must be a non-empty array" 
      });
    }

    const cityObjectId = new ObjectId(cityId);

    // בדיקה שהעיר קיימת
    const city = await db.collection("cities").findOne({ _id: cityObjectId });
    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    // בדיקת ותיקוף כל האטרקציות
    const validAttractions = [];
    const errors = [];

    for (let i = 0; i < attractions.length; i++) {
      const attraction = attractions[i];
      
      if (!attraction.name || !attraction.openingHours || attraction.price === undefined) {
        errors.push(`Attraction ${i + 1}: Missing required fields`);
        continue;
      }

      // בדיקה אם האטרקציה כבר קיימת במערך
      if (city.attractions && city.attractions.some(existing => existing.name === attraction.name)) {
        errors.push(`Attraction ${i + 1}: "${attraction.name}" already exists in the city`);
        continue;
      }

      validAttractions.push({
        name: attraction.name.trim(),
        openingHours: attraction.openingHours.trim(),
        price: parseFloat(attraction.price)
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: "Validation errors found",
        errors 
      });
    }

    if (validAttractions.length === 0) {
      return res.status(400).json({ message: "No valid attractions to add" });
    }

    // הוספת כל האטרקציות למערך attractions בתוך מסמך העיר
    const result = await db.collection("attractions").updateOne(
      { _id: cityObjectId },
      { $push: { attractions: { $each: validAttractions } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to add attractions to city" });
    }

    // החזרת העיר המעודכנת
    const updatedCity = await db.collection("cities").findOne({ _id: cityObjectId });

    res.status(201).json({
      message: `✅ ${validAttractions.length} attractions added to city successfully`,
      addedAttractions: validAttractions,
      city: updatedCity
    });

  } catch (err) {
    console.error("Error adding new attractions to city:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// הוספת אטרקציה קיימת למסמך אטרקציות (הקוד הקיים שלך)
export const addExistingAttractionToAttractionsDoc = async (req, res) => {
  try {
    const db = await connectDB();
    const { docId, attractionId } = req.params;

    if (!docId || !attractionId) {
      return res.status(400).json({ message: "Missing docId or attractionId" });
    }

    const docObjectId = new ObjectId(docId);
    const attractionObjectId = new ObjectId(attractionId);

    // מוצאים את המסמך שבו רוצים להוסיף את האטרקציה
    const doc = await db.collection("attractions").findOne({ _id: docObjectId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // מוצאים את האטרקציה הקיימת להוספה
    const attraction = await db.collection("attractions").findOne({ _id: attractionObjectId });
    if (!attraction) return res.status(404).json({ message: "Attraction not found" });

    // מוודאים שיש מערך attractions במסמך
    if (!Array.isArray(doc.attractions)) {
      await db.collection("attractions").updateOne(
        { _id: docObjectId },
        { $set: { attractions: [] } }
      );
      doc.attractions = [];
    }

    // בדיקה אם האטרקציה כבר קיימת
    const exists = doc.attractions.some(a => a.name === attraction.name);
    if (exists) {
      return res.status(400).json({ message: "Attraction already exists in the array" });
    }

    // הוספת האטרקציה למערך
    const updateResult = await db.collection("attractions").updateOne(
      { _id: docObjectId },
      { $push: { attractions: {
        name: attraction.name,
        openingHours: attraction.openingHours,
        price: attraction.price
      } } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to add attraction to document" });
    }

    const updatedDoc = await db.collection("attractions").findOne({ _id: docObjectId });

    res.status(200).json({
      message: "Attraction added successfully",
      document: updatedDoc
    });
   
  } catch (err) {
    console.error("Error adding existing attraction to document:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};