// orders2.db.js
import { MongoClient, ObjectId } from 'mongodb';
import Order2Model from './orders2.model.js';

class Orders2DB {
  constructor(order2Model) {
    this.Order2 = order2Model;
  }

  async createOrder(orderData) {
    try {
      console.log('🔄 Creating new order in DB:', orderData);
      const savedOrder = await this.Order2.create(orderData);
      console.log('✅ Order created successfully with ID:', savedOrder._id);
      return savedOrder;
    } catch (error) {
      console.error('❌ Error creating order in DB:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }
// orders2.db.js
async findOverlappingOrder({ userId, destinationName, destinationCityId, tripDate, returnDate }) {
  try {
    const HEX24 = /^[0-9a-fA-F]{24}$/;
// inside findOverlappingOrder
if (!HEX24.test(String(userId))) {
  console.warn("findOverlappingOrder: BAD userId", userId);
  return null; // ← don't throw
}


    const name = (destinationName || "").trim();
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = name ? new RegExp(`^${escapeRegExp(name)}$`, "i") : null;
const newTripDate = new Date(tripDate);
let newReturnDate = returnDate ? new Date(returnDate) : null;

if (isNaN(newTripDate.getTime())) {
  console.warn("findOverlappingOrder: BAD tripDate", tripDate);
  return null;
}
if (!newReturnDate || isNaN(newReturnDate.getTime())) {
  newReturnDate = new Date(newTripDate);
  newReturnDate.setDate(newReturnDate.getDate() + 7);
}
if (newReturnDate <= newTripDate) {
  console.warn("findOverlappingOrder: RANGE_ERROR", { tripDate, returnDate });
  return null;
}

    const baseMatch = {
      user_id: new ObjectId(userId),
      status: { $nin: ["cancelled", "refunded", "rejected"] },
      tripDate: { $type: "date" }, // tripDate must be a Date
      // do NOT require returnDate type here; we’ll compute fallback
    };

    // Destination filter (optional)
    if (destinationCityId && HEX24.test(String(destinationCityId))) {
      baseMatch.destination_city_id = new ObjectId(destinationCityId);
    } else if (nameRegex) {
      baseMatch.$or = [
        { destination_city_name: nameRegex },
        { destination: nameRegex },
        { cityName: nameRegex },
      ];
    } else if (name) {
      baseMatch.$or = [
        { destination_city_name: name },
        { destination: name },
        { cityName: name },
      ];
    }

    // Overlap: start1 < end2 && start2 < end1
    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          _computedReturnDate: {
            $ifNull: [
              {
                $cond: [
                  { $eq: [{ $type: "$returnDate" }, "date"] },
                  "$returnDate",
                  null,
                ],
              },
              { $dateAdd: { startDate: "$tripDate", unit: "day", amount: 7 } },
            ],
          },
        },
      },
      {
        $match: {
          tripDate: { $lt: newReturnDate },
          _computedReturnDate: { $gt: newTripDate },
        },
      },
      { $limit: 1 },
    ];

    const conflicting = await this.Order2.collection.aggregate(pipeline).toArray();

    if (conflicting.length) {
      return conflicting[0];
    }
    return null;
  } catch (error) {
    console.error("❌ Error in findOverlappingOrder:", error);
    throw new Error(`Failed to check for overlapping orders: ${error.message}`);
  }
}

  async getUserOrders(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status = null, sortBy = 'createdAt', sortOrder = -1 } = options;
      const query = { user_id: new ObjectId(userId) };
      if (status) query.status = status;

      const orders = await this.Order2.collection
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const totalOrders = await this.Order2.collection.countDocuments(query);

      return {
        orders,
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('❌ Error fetching user orders:', error);
      throw new Error(`Failed to fetch user orders: ${error.message}`);
    }
  }

  // אפשר להוסיף פה שאר הפונקציות כמו getOrderById, updateOrderStatus וכו'
}

// ---- יצירת connection ל־MongoDB ----
const client = new MongoClient(process.env.CONNECTION_STRING);
await client.connect();
const db = client.db(process.env.DB_NAME || 'travel');

const order2Model = new Order2Model(db);
const orders2DB = new Orders2DB(order2Model);

export default orders2DB; // ✅ מייצא instance מוכן לשימוש
