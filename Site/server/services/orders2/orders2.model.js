import { ObjectId } from 'mongodb';

export default class Order2Model {
  constructor(db) {
    this.collection = db.collection('orders');
  }

  async create(orderData) {
    if (!orderData.orderNumber) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      orderData.orderNumber = `ORD-${timestamp.slice(-6)}${random}`;
    }

    orderData.bookingDate = orderData.bookingDate || new Date();
    orderData.createdAt = new Date();
    orderData.updatedAt = new Date();
    orderData.bookingDate = orderData.bookingDate || new Date();

    const result = await this.collection.insertOne(orderData);
    return await this.collection.findOne({ _id: result.insertedId });
  }

  async getUserOrders(userId, options = {}) {
    const { page = 1, limit = 10, status = null, sortBy = 'createdAt', sortOrder = -1 } = options;

    const query = { user_id: userId };
    if (status) query.status = status;

    const totalOrders = await this.collection.countDocuments(query);
    const orders = await this.collection
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return { totalOrders, orders };
  }
}
