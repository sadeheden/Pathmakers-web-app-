import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';
import City from './../cities/cities.model.js'; 
import Attraction from './../attraction/att.model.js';

// פונקציה לקבלת קולקציית ההזמנות (אופציונלי לשימוש חוזר)
export async function getOrdersCollection() {
  const db = await connectDB();
  return db.collection("orders");
}

// הוספת אטרקציה קיימת למערך אטרקציות בעיר (מנג'ר)
export const addExistingAttractionToCity = async (req, res) => {
  const { cityId, attractionId } = req.params;

  console.log("➡️ קיבלתי בקשה להוסיף אטרקציה לעיר");
  console.log("📌 cityId:", cityId);
  console.log("📌 attractionId:", attractionId);

  try {
    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }
    console.log("✅ עיר שנמצאה:", city?.name);

    const existingAttraction = await Attraction.findById(attractionId);
    if (!existingAttraction) {
      return res.status(404).json({ message: "Attraction not found" });
    }
    console.log("✅ אטרקציה שנמצאה:", existingAttraction?.name);

    // אם מערך האטרקציות לא קיים - אתחל אותו
    if (!Array.isArray(city.attractions)) {
      city.attractions = [];
    }

    // בדיקה אם האטרקציה כבר קיימת בעיר לפי שם
    const exists = city.attractions.some(a => a.name === existingAttraction.name);
    if (exists) {
      return res.status(400).json({ message: "Attraction already exists in the city" });
    }

    // הוספת האטרקציה למערך העיר
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

// הוספת אטרקציות חדשות (רשימה) לעיר
export const addNewAttractionsToCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { cityId } = req.params;
    const { attractions } = req.body;

    if (!cityId) {
      return res.status(400).json({ message: "Missing cityId" });
    }

    if (!attractions || !Array.isArray(attractions) || attractions.length === 0) {
      return res.status(400).json({ 
        message: "attractions must be a non-empty array" 
      });
    }

    const cityObjectId = new ObjectId(cityId);

    const city = await db.collection("cities").findOne({ _id: cityObjectId });
    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    // בדיקת תקינות ואימות האטרקציות
    const validAttractions = [];
    const errors = [];

    for (let i = 0; i < attractions.length; i++) {
      const attraction = attractions[i];
      
      if (!attraction.name || !attraction.openingHours || attraction.price === undefined) {
        errors.push(`Attraction ${i + 1}: Missing required fields`);
        continue;
      }

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

// הוספת אטרקציה קיימת למסמך אטרקציות (collection "attractions")
export const addExistingAttractionToAttractionsDoc = async (req, res) => {
  try {
    const db = await connectDB();
    const { docId, attractionId } = req.params;

    if (!docId || !attractionId) {
      return res.status(400).json({ message: "Missing docId or attractionId" });
    }

    const docObjectId = new ObjectId(docId);
    const attractionObjectId = new ObjectId(attractionId);

    const doc = await db.collection("attractions").findOne({ _id: docObjectId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const attraction = await db.collection("attractions").findOne({ _id: attractionObjectId });
    if (!attraction) return res.status(404).json({ message: "Attraction not found" });

    if (!Array.isArray(doc.attractions)) {
      await db.collection("attractions").updateOne(
        { _id: docObjectId },
        { $set: { attractions: [] } }
      );
      doc.attractions = [];
    }

    const exists = doc.attractions.some(a => a.name === attraction.name);
    if (exists) {
      return res.status(400).json({ message: "Attraction already exists in the array" });
    }

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

// הפונקציה הקיימת שלך לדשבורד עם סיכום הזמנות והכנסות לפי חודש
export const getManagerDashboardData = async (req, res) => {
  console.log("🔥 getManagerDashboardData called");
  try {
    const db = await connectDB();
    const ordersCollection = db.collection("orders");

    const startOfMonth = new Date("2025-07-01T00:00:00Z");
    const startOfNextMonth = new Date("2025-09-01T00:00:00Z");

    const revenueByMonthRaw = await ordersCollection.aggregate([
      { $match: { created_at: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } }, revenue: { $sum: "$total_price" } } },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", revenue: 1, _id: 0 } }
    ]).toArray();

    const monthLabels = ["חודש 1", "חודש 2", "חודש 3", "חודש 4"];
    const revenueByMonth = revenueByMonthRaw.map((item, index) => ({
      ...item,
      monthLabel: monthLabels[index] || null
    }));

    const totalOrders = await ordersCollection.countDocuments({ created_at: { $gte: startOfMonth, $lt: startOfNextMonth } });
    const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.revenue, 0);

    const topDestinations = await ordersCollection.aggregate([
      {
        $group: {
          _id: "$destination_city_id",
          trips: { $sum: 1 }
        }
      },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "city",
          localField: "_id",
          foreignField: "_id",
          as: "cityInfo"
        }
      },
      { $unwind: "$cityInfo" },
      { $project: { name: "$cityInfo.city", trips: 1, _id: 0 } }
    ]).toArray();

    console.log("totalOrders:", totalOrders);
    console.log("totalRevenue:", totalRevenue);
    console.log("topDestinations:", topDestinations);
    console.log("revenueByMonth:", revenueByMonth);

    res.json({
      totalOrders,
      totalRevenue,
      topDestinations,
      revenueByMonth,
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ message: "Dashboard failed", error: err.message });
  }
};

// Add new hotels into a city's hotels array (no duplicates by name)
export const addNewHotelsToCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { cityId } = req.params;
    const { hotels } = req.body;

    if (!cityId) return res.status(400).json({ message: "Missing cityId" });
    if (!Array.isArray(hotels) || hotels.length === 0)
      return res.status(400).json({ message: "hotels must be a non-empty array" });

    const cityObjectId = new ObjectId(cityId);
    const city = await db.collection("cities").findOne({ _id: cityObjectId });
    if (!city) return res.status(404).json({ message: "City not found" });

    const valid = [];
    const errors = [];
    for (let i = 0; i < hotels.length; i++) {
      const h = hotels[i];
      if (!h.name || h.price === undefined) {
        errors.push(`Hotel ${i + 1}: Missing name or price`);
        continue;
      }
      if (city.hotels?.some(ex => ex.name === h.name)) {
        errors.push(`Hotel ${i + 1}: "${h.name}" already exists in the city`);
        continue;
      }
      valid.push({
        name: String(h.name).trim(),
        price: parseFloat(h.price),
        stars: Number.isFinite(h.stars) ? h.stars : 3,
      });
    }

    if (errors.length) return res.status(400).json({ message: "Validation errors", errors });
    if (!valid.length) return res.status(400).json({ message: "No valid hotels to add" });

    const result = await db.collection("cities").updateOne(
      { _id: cityObjectId },
      { $push: { hotels: { $each: valid } } }
    );
    if (!result.modifiedCount) return res.status(500).json({ message: "Failed to add hotels" });

    const updatedCity = await db.collection("cities").findOne({ _id: cityObjectId });
    res.status(201).json({
      message: `✅ ${valid.length} hotels added to city successfully`,
      addedHotels: valid,
      city: updatedCity,
    });
  } catch (err) {
    console.error("Error adding new hotels to city:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add new flights into a city's flights array (no duplicates by name)
export const addNewFlightsToCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { cityId } = req.params;
    const { flights } = req.body;

    if (!cityId) return res.status(400).json({ message: "Missing cityId" });
    if (!Array.isArray(flights) || flights.length === 0)
      return res.status(400).json({ message: "flights must be a non-empty array" });

    const cityObjectId = new ObjectId(cityId);
    const city = await db.collection("cities").findOne({ _id: cityObjectId });
    if (!city) return res.status(404).json({ message: "City not found" });

    const valid = [];
    const errors = [];
    for (let i = 0; i < flights.length; i++) {
      const f = flights[i];
      if (!f.name || f.price === undefined || !f.duration) {
        errors.push(`Flight ${i + 1}: Missing name, price, or duration`);
        continue;
      }
      if (city.flights?.some(ex => ex.name === f.name)) {
        errors.push(`Flight ${i + 1}: "${f.name}" already exists in the city`);
        continue;
      }
      valid.push({
        name: String(f.name).trim(),
        price: parseFloat(f.price),
        duration: String(f.duration).trim(),
      });
    }

    if (errors.length) return res.status(400).json({ message: "Validation errors", errors });
    if (!valid.length) return res.status(400).json({ message: "No valid flights to add" });

    const result = await db.collection("cities").updateOne(
      { _id: cityObjectId },
      { $push: { flights: { $each: valid } } }
    );
    if (!result.modifiedCount) return res.status(500).json({ message: "Failed to add flights" });

    const updatedCity = await db.collection("cities").findOne({ _id: cityObjectId });
    res.status(201).json({
      message: `✅ ${valid.length} flights added to city successfully`,
      addedFlights: valid,
      city: updatedCity,
    });
  } catch (err) {
    console.error("Error adding new flights to city:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ⬇️ paste anywhere among the exports
export const upsertAttractionItemByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, attraction } = req.body;

    if (!city || !attraction?.name || !attraction?.openingHours || attraction?.price === undefined) {
      return res.status(400).json({ message: "city, name, openingHours, price are required" });
    }

    // prevent duplicate by name for same city
    const dup = await db.collection("attractions").findOne({
      city,
      "attractions.name": attraction.name
    });
    if (dup) return res.status(400).json({ message: "Attraction already exists for this city" });

    const result = await db.collection("attractions").findOneAndUpdate(
      { city: String(city).trim() },
      { $push: { attractions: {
        name: String(attraction.name).trim(),
        openingHours: String(attraction.openingHours).trim(),
        price: Number(attraction.price),
      }}},
      { upsert: true, returnDocument: "after" }
    );

    // result.value will look like your sample (city string + attractions array)
    res.status(201).json({ message: "✅ Attraction added", doc: result.value });
  } catch (e) {
    console.error(e); res.status(500).json({ message: "Internal error" });
  }
};

export const upsertHotelItemByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, hotel } = req.body;

    if (!city || !hotel?.name || hotel?.price === undefined) {
      return res.status(400).json({ message: "city, name, price are required" });
    }

    const dup = await db.collection("hotels").findOne({
      city,
      "hotels.name": hotel.name
    });
    if (dup) return res.status(400).json({ message: "Hotel already exists for this city" });

    const result = await db.collection("hotels").findOneAndUpdate(
      { city: String(city).trim() },
      { $push: { hotels: {
        name: String(hotel.name).trim(),
        price: Number(hotel.price),
      }}},
      { upsert: true, returnDocument: "after" }
    );

    res.status(201).json({ message: "✅ Hotel added", doc: result.value });
  } catch (e) {
    console.error(e); res.status(500).json({ message: "Internal error" });
  }
};

export const upsertFlightItemByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, airline } = req.body; // array name is "airlines" in the doc

    if (!city || !airline?.name || airline?.price === undefined || !airline?.duration) {
      return res.status(400).json({ message: "city, name, price, duration are required" });
    }

    const dup = await db.collection("flights").findOne({
      city,
      "airlines.name": airline.name
    });
    if (dup) return res.status(400).json({ message: "Airline already exists for this city" });

    const result = await db.collection("flights").findOneAndUpdate(
      { city: String(city).trim() },
      { $push: { airlines: {
        name: String(airline.name).trim(),
        price: Number(airline.price),
        duration: String(airline.duration).trim(),
      }}},
      { upsert: true, returnDocument: "after" }
    );

    res.status(201).json({ message: "✅ Flight added", doc: result.value });
  } catch (e) {
    console.error(e); res.status(500).json({ message: "Internal error" });
  }
};

// Add multiple hotels at once (no duplicates)
export const upsertHotelsByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, hotels } = req.body;

    if (!city || !Array.isArray(hotels) || hotels.length === 0) {
      return res.status(400).json({ message: "city and non-empty hotels array are required" });
    }

    const valid = [];
    const errors = [];

    for (let i = 0; i < hotels.length; i++) {
      const h = hotels[i];
      if (!h.name || h.price === undefined) {
        errors.push(`Hotel ${i + 1}: Missing name or price`);
        continue;
      }

      const dup = await db.collection("hotels").findOne({
        city,
        "hotels.name": h.name
      });
      if (dup) {
        errors.push(`Hotel ${i + 1}: "${h.name}" already exists`);
        continue;
      }

      valid.push({
        name: String(h.name).trim(),
        price: Number(h.price),
      });
    }

    if (valid.length === 0) {
      return res.status(400).json({ message: "No valid hotels to add", errors });
    }

    const result = await db.collection("hotels").updateOne(
      { city: String(city).trim() },
      { $push: { hotels: { $each: valid } } },
      { upsert: true }
    );

    const updatedDoc = await db.collection("hotels").findOne({ city: String(city).trim() });

    res.status(201).json({
      message: `✅ ${valid.length} hotels added`,
      addedHotels: valid,
      errors,
      doc: updatedDoc
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal error" });
  }
};

// Add multiple flights at once (no duplicates)
export const upsertFlightsByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, flights } = req.body;

    if (!city || !Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ message: "city and non-empty flights array are required" });
    }

    const valid = [];
    const errors = [];

    for (let i = 0; i < flights.length; i++) {
      const f = flights[i];
      if (!f.name || f.price === undefined || !f.duration) {
        errors.push(`Flight ${i + 1}: Missing name, price, or duration`);
        continue;
      }

      const dup = await db.collection("flights").findOne({
        city,
        "airlines.name": f.name
      });
      if (dup) {
        errors.push(`Flight ${i + 1}: "${f.name}" already exists`);
        continue;
      }

      valid.push({
        name: String(f.name).trim(),
        price: Number(f.price),
        duration: String(f.duration).trim(),
      });
    }

    if (valid.length === 0) {
      return res.status(400).json({ message: "No valid flights to add", errors });
    }

    const result = await db.collection("flights").updateOne(
      { city: String(city).trim() },
      { $push: { airlines: { $each: valid } } },
      { upsert: true }
    );

    const updatedDoc = await db.collection("flights").findOne({ city: String(city).trim() });

    res.status(201).json({
      message: `✅ ${valid.length} flights added`,
      addedFlights: valid,
      errors,
      doc: updatedDoc
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal error" });
  }
};

// manager.controller.js
export const upsertAttractionsByCity = async (req, res) => {
  try {
    const db = await connectDB();
    const { city, attractions } = req.body;

    if (!city || !Array.isArray(attractions) || attractions.length === 0) {
      return res.status(400).json({ message: "city and non-empty attractions array are required" });
    }

    const valid = [];
    const errors = [];

    for (let i = 0; i < attractions.length; i++) {
      const a = attractions[i];
      if (!a.name || !a.openingHours || a.price === undefined) {
        errors.push(`Attraction ${i + 1}: Missing name, openingHours or price`);
        continue;
      }

      const dup = await db.collection("attractions").findOne({
        city,
        "attractions.name": a.name
      });
      if (dup) {
        errors.push(`Attraction ${i + 1}: "${a.name}" already exists`);
        continue;
      }

      valid.push({
        name: String(a.name).trim(),
        openingHours: String(a.openingHours).trim(),
        price: Number(a.price)
      });
    }

    if (valid.length === 0) {
      return res.status(400).json({ message: "No valid attractions to add", errors });
    }

    const result = await db.collection("attractions").updateOne(
      { city: String(city).trim() },
      { $push: { attractions: { $each: valid } } },
      { upsert: true }
    );

    const updatedDoc = await db.collection("attractions").findOne({ city: String(city).trim() });

    res.status(201).json({
      message: `✅ ${valid.length} attractions added`,
      addedAttractions: valid,
      errors,
      doc: updatedDoc
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal error" });
  }
};
