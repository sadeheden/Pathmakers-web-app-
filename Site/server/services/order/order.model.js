import { ObjectId } from "mongodb";
import { findOrdersByUserIdFromDb, insertOrderToDb, findOrderByIdFromDb } from './order.db.js';

// Helper function to validate ObjectId
export function isValidObjectId(id) {
  return typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id);
}

// Helper function to convert to ObjectId if valid, otherwise return as string
function toObjectIdOrString(id) {
  if (!id) return null;
  if (isValidObjectId(id)) {
    return new ObjectId(id);
  }
  return id; // Return as string if not a valid ObjectId
}
const toOid = (v) =>
  typeof v === "string" && ObjectId.isValid(v) ? new ObjectId(v) : null;

export default class Order {
  constructor(data = {}) {
    // local helper to coerce anything (ISO string / millis / Date) into Date or null
// Robust date coercion: keep calendar day stable across timezones
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, Y, M, D] = m.map(Number);
    // store as UTC noon to avoid off-by-one in any timezone
    return new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};



    this._id = data._id || null;
    this.user_id = data.user_id || null;
    this.departure_city_id = data.departure_city_id || null;
    this.destination_city_id = data.destination_city_id || null;
    this.flight_id = data.flight_id || null;
    this.hotel_id = data.hotel_id || null;
    this.attractions = Array.isArray(data.attractions) ? data.attractions : [];
    this.transportation = data.transportation || null;
    this.payment_method = data.payment_method || null;
    this.total_price = data.total_price || 0;
    this.created_at = toDate(data.created_at) || new Date();
    
    // Denormalized name fields - NEW
    this.flight_name = data.flight_name || null;
    this.hotel_name = data.hotel_name || null;
    this.attraction_names = Array.isArray(data.attraction_names) ? data.attraction_names : [];
    this.departure_city_name = data.departure_city_name || null;
    this.destination_city_name = data.destination_city_name || null;

    // Trip dates (support several aliases), coerced to Date
    this.trip_start_date = toDate(data.trip_start_date || data.trip_date || data.tripDate || null);
    this.trip_end_date   = toDate(data.trip_end_date   || data.return_date || data.returnDate || null);
  }
  
  static async findByUserId(userId) {
    try {
      const orders = await findOrdersByUserIdFromDb(userId);
      return orders.map(orderData => new Order(orderData));
    } catch (error) {
      console.error("❌ Error finding orders by user ID:", error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    try {
      const orderData = await findOrderByIdFromDb(orderId);
      return orderData ? new Order(orderData) : null;
    } catch (error) {
      console.error("❌ Error finding order by ID:", error);
      throw error;
    }
  }

  static async findById(orderId) {
    return this.findByOrderId(orderId);
  }

  // Convert instance to plain object
  toObject() {
    return {
      _id: this._id,
      user_id: this.user_id,
      departure_city_id: this.departure_city_id,
      destination_city_id: this.destination_city_id,
      flight_id: this.flight_id,
      hotel_id: this.hotel_id,
      attractions: this.attractions,
      transportation: this.transportation,
      payment_method: this.payment_method,
      total_price: this.total_price,
      created_at: this.created_at,
      // Include denormalized fields
      flight_name: this.flight_name,
      hotel_name: this.hotel_name,
      attraction_names: this.attraction_names,
      departure_city_name: this.departure_city_name,
      destination_city_name: this.destination_city_name,
      trip_start_date: this.trip_start_date,
      trip_end_date: this.trip_end_date,
    };
  }

  async save() {
    // Validate required fields
    const errors = [];
    
    if (!this.user_id) {
      errors.push('user_id is required');
    }
    
    if (!this.departure_city_id) {
      errors.push('departure_city_id is required');
    }
    
    if (!this.destination_city_id) {
      errors.push('destination_city_id is required');
    }
    
    if (!this.flight_id) {
      errors.push('flight_id is required');
    }
    
    if (!this.hotel_id) {
      errors.push('hotel_id is required');
    }
    
    if (!this.payment_method) {
      errors.push('payment_method is required');
    }
    
    if (!this.total_price || this.total_price <= 0) {
      errors.push('total_price must be a positive number');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const orderDoc = {
      user_id: this.user_id,
      departure_city_id: this.departure_city_id,
      destination_city_id: this.destination_city_id,
      flight_id: this.flight_id,  // Store as string to preserve compound format
      hotel_id: this.hotel_id,    // Store as string to preserve compound format
      attractions: Array.isArray(this.attractions)
        ? this.attractions.map(toOid).filter(Boolean)
        : [],
      transportation: this.transportation,
      payment_method: this.payment_method,
      total_price: this.total_price,
      created_at: this.created_at,
      // Include denormalized fields
      flight_name: this.flight_name,
      hotel_name: this.hotel_name,
      attraction_names: this.attraction_names,
      departure_city_name: this.departure_city_name,
      destination_city_name: this.destination_city_name,
      trip_start_date: this.trip_start_date,
      trip_end_date: this.trip_end_date,
    };

    console.log(" Saving order to database:", orderDoc);

    try {
      const result = await insertOrderToDb(orderDoc);
      console.log("✅ Order saved successfully:", result._id);
      
      // Set the _id on this instance
      this._id = result._id;
      
      return result;
    } catch (error) {
      console.error("❌ Database save error:", error);
      throw new Error(`Failed to save order: ${error.message}`);
    }
  }
}
