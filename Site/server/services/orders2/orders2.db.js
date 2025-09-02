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
  try {
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const name = (destinationName || '').trim();
    const nameRegex = name ? new RegExp(`^${escapeRegExp(name)}$`, 'i') : null;

    // Convert dates to proper Date objects
    const newTripDate = new Date(tripDate);
    const newReturnDate = new Date(returnDate);

    // Validate dates
    if (isNaN(newTripDate.getTime()) || isNaN(newReturnDate.getTime())) {
      throw new Error('Invalid date format provided');
    }

    if (newReturnDate <= newTripDate) {
      throw new Error('Return date must be after trip date');
    }

    // Build query step by step
    const query = {
      user_id: new ObjectId(userId),
      status: { $nin: ['cancelled', 'refunded', 'rejected'] },
    };

    // Add destination matching - fix the conditional logic
    if (destinationCityId) {
      query.destination_city_id = new ObjectId(destinationCityId);
    } else if (nameRegex) {
      query.$or = [
        { destination_city_name: nameRegex },
        { destination: nameRegex },
        { cityName: nameRegex },
      ];
    } else if (name) {
      // Fallback: if we have a name but couldn't create regex, do exact match
      query.$or = [
        { destination_city_name: name },
        { destination: name },
        { cityName: name },
      ];
    }

    // Add date overlap conditions with existence checks
    // Two date ranges overlap if: start1 < end2 AND start2 < end1
    query.$and = [
      // Ensure dates exist and are valid
      { tripDate: { $exists: true, $type: 'date' } },
      { returnDate: { $exists: true, $type: 'date' } },
      // Check for overlap
      { tripDate: { $lt: newReturnDate } },     // existing starts before new ends
      { returnDate: { $gt: newTripDate } }      // existing ends after new starts
    ];

    console.log('🔍 MongoDB query for conflicts:', {
      userId,
      destinationName: name,
      destinationCityId,
      newTripDate: newTripDate.toISOString(),
      newReturnDate: newReturnDate.toISOString(),
      queryStructure: JSON.stringify(query, null, 2)
    });

    const conflictingOrder = await this.Order2.collection.findOne(query);
    
    if (conflictingOrder) {
      console.log('⚠️ Found conflicting order:', {
        orderId: conflictingOrder._id,
        orderNumber: conflictingOrder.orderNumber,
        destination: conflictingOrder.destination_city_name || conflictingOrder.destination || conflictingOrder.cityName,
        existingTripDate: conflictingOrder.tripDate?.toISOString(),
        existingReturnDate: conflictingOrder.returnDate?.toISOString(),
        status: conflictingOrder.status
      });
      
      // Return the order for debugging
      return conflictingOrder;
    } else {
      console.log('✅ No conflicting orders found');
      return null;
    }

  } catch (error) {
    console.error('❌ Error in findOverlappingOrder:', error);
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
