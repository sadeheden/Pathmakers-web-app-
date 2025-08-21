// orders2.db.js
import { MongoClient, ObjectId } from 'mongodb';
import Order2Model from './orders2.model.js';

class Orders2DB {
  constructor(order2Model) {
    this.Order2 = order2Model;
  }

  async createOrder(orderData) {
    try {
      // ✅ ensure timestamps are set once on insert
      const now = new Date();
      const payload = {
        ...orderData,
        createdAt: orderData.createdAt ?? now,   // do not overwrite if provided
        updatedAt: now,
        bookingDate: orderData.bookingDate ?? now
      };

      console.log('🔄 Creating new order in DB:', payload);
      const savedOrder = await this.Order2.create(payload);
      console.log('✅ Order created successfully with ID:', savedOrder._id);
      return savedOrder;
    } catch (error) {
      console.error('❌ Error creating order in DB:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async getUserOrders(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = null,
        sortBy = 'createdAt',
        sortOrder = -1, // -1 = desc (newest first), 1 = asc
      } = options;

      const query = { user_id: new ObjectId(userId) };
      if (status) query.status = status;

      // ✅ Use a stable sort key: createdAt || bookingDate || tripDate
      //    so we always get a consistent newest→oldest order even if some fields are missing.
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            sortKey: {
              $ifNull: [
                '$createdAt',
                { $ifNull: ['$bookingDate', '$tripDate'] }
              ]
            }
          }
        },
        { $sort: sortBy === 'createdAt' ? { sortKey: sortOrder } : { [sortBy]: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];

      const [orders, totalOrders] = await Promise.all([
        this.Order2.collection.aggregate(pipeline).toArray(),
        this.Order2.collection.countDocuments(query),
      ]);

      return {
        orders,
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1,
      };
    } catch (error) {
      console.error('❌ Error fetching user orders:', error);
      throw new Error(`Failed to fetch user orders: ${error.message}`);
    }
  }
}

// ---- Mongo connection (unchanged) ----
const client = new MongoClient(process.env.CONNECTION_STRING);
await client.connect();
const db = client.db(process.env.DB_NAME || 'travel');

const order2Model = new Order2Model(db);
const orders2DB = new Orders2DB(order2Model);

export default orders2DB;
