import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';
import City from './../cities/cities.model.js'; 
import Attraction from './../attraction/att.model.js';

export async function getOrdersCollection() {
  const db = await connectDB();
  return db.collection("orders"); // 👈 your actual orders collection
}
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
    const db = await connectDB();
    const ordersCollection = db.collection("orders");

    const startOfMonth = new Date("2025-08-01T00:00:00Z");
    const startOfNextMonth = new Date("2025-09-01T00:00:00Z");

    const revenueByDate = await ordersCollection.aggregate([
      { $match: { created_at: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, revenue: { $sum: "$total_price" } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", revenue: 1, _id: 0 } }
    ]).toArray();

    const totalOrders = await ordersCollection.countDocuments({ created_at: { $gte: startOfMonth, $lt: startOfNextMonth } });

    const totalRevenue = revenueByDate.reduce((sum, item) => sum + item.revenue, 0);

    const topDestinations = await ordersCollection.aggregate([
      { $group: { _id: "$destination_city_id", trips: { $sum: 1 } } },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "cities",
          localField: "_id",
          foreignField: "_id",
          as: "cityInfo"
        }
      },
      { $unwind: "$cityInfo" },
      { $project: { name: "$cityInfo.city", trips: 1, _id: 0 } }
    ]).toArray();

    res.json({
      totalOrders,
      totalRevenue,
      topDestinations,
      revenueByDate,
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ message: "Dashboard failed", error: err.message });
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
export const addNewAttractionsToCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { cityId } = req.params;
    const { attractions } = req.body;

    // Validate inputs
    if (!cityId) {
      return res.status(400).json({ message: "Missing cityId" });
    }

    if (!attractions || !Array.isArray(attractions) || attractions.length === 0) {
      return res.status(400).json({ 
        message: "attractions must be a non-empty array" 
      });
    }

    const cityObjectId = new ObjectId(cityId);

    // Find the city
    const city = await db.collection("cities").findOne({ _id: cityObjectId });
    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    // Validate and sanitize attractions
    const validAttractions = [];
    const errors = [];

    for (let i = 0; i < attractions.length; i++) {
      const attraction = attractions[i];
      
      if (!attraction.name || !attraction.openingHours || attraction.price === undefined) {
        errors.push(`Attraction ${i + 1}: Missing required fields`);
        continue;
      }

      // Check for duplicates
      if (city.attractions?.some(existing => existing.name === attraction.name)) {
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

    // Add attractions to city
    const result = await db.collection("cities").updateOne(
      { _id: cityObjectId },
      { $push: { attractions: { $each: validAttractions } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to add attractions to city" });
    }

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
