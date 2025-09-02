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
  async findOverlappingOrder({ userId, destinationName, destinationCityId, tripDate, returnDate }) {
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const name = (destinationName || '').trim();
    const nameRegex = name ? new RegExp(`^${escapeRegExp(name)}$`, 'i') : null;

    const query = {
      user_id: new ObjectId(userId),
      status: { $ne: 'cancelled' },                 // ignore cancelled
      ...(destinationCityId
        ? { destination_city_id: destinationCityId }
        : nameRegex
          ? {
              $or: [
                { destination_city_name: nameRegex },
                { destination: nameRegex },
                { cityName: nameRegex },
              ],
            }
          : {}),
      // overlap: existing.tripDate <= newReturn AND existing.returnDate >= newTrip
      tripDate: { $lte: new Date(returnDate) },
      returnDate: { $gte: new Date(tripDate) },
    };

    return await this.Order2.collection.findOne(query);
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
