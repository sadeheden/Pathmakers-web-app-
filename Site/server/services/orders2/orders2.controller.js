// orders2.controller.js
import orders2DB from './orders2.db.js'; // ✅ ייבוא ה-instance המוכן

class Orders2Controller {
  static async createOrder(req, res) {
    try {
      console.log('📝 Creating new order for user:', req.user?.id);
      console.log('📦 Order data received:', req.body);

      const {
        cityName, citySlug, flightNumber, departure, destination,
        tripDate, returnDate, totalPrice, paymentMethod, status,
        bookingDate, summary, cityImage, departure_city_id, destination_city_id,
        flight_id, hotel_id, attractions, transportation
      } = req.body;

      if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || !totalPrice) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          required: ['cityName or departure_city_id', 'flightNumber or flight_id', 'tripDate', 'totalPrice'],
          received: Object.keys(req.body)
        });
      }

      if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication required' });
      if (isNaN(totalPrice) || totalPrice <= 0) return res.status(400).json({ success: false, message: 'Total price must be a positive number' });

      const tripDateObj = new Date(tripDate);
      if (isNaN(tripDateObj.getTime())) return res.status(400).json({ success: false, message: 'Invalid trip date format' });

   const orderData = {
  user_id: req.user.id,
  cityName: cityName?.trim() || null,
  citySlug: citySlug ? citySlug.trim() : cityName?.toLowerCase().replace(/\s+/g, '-') || null,
  flightNumber: flightNumber?.trim() || null,
  departure: departure?.trim() || null,
  destination: destination?.trim() || null,
  tripDate: tripDateObj,
  returnDate: returnDate ? new Date(returnDate) : null,
  total_price: Number(totalPrice),
  payment_method: paymentMethod || "Credit Card",
  status: status || "confirmed",
  booking_date: bookingDate ? new Date(bookingDate) : new Date(),
  summary: summary?.trim() || null,
  cityImage: cityImage?.trim() || null,
  departure_city_id: departure_city_id || null,
  destination_city_id: destination_city_id || null,
  flight_id: flight_id || null,
  hotel_id: hotel_id || null,
  transportation: transportation || null
};


      if (orderData.returnDate && orderData.returnDate <= orderData.tripDate) {
        return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
      }

      // ✅ שימוש ב-instance המיובא
      const savedOrder = await orders2DB.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: savedOrder,
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber || null
      });

    } catch (error) {
      console.error('❌ Error in createOrder controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getUserOrders(req, res) {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication required' });

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        status: req.query.status || null,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
      };

      const result = await orders2DB.getUserOrders(req.user.id, options);

      res.json({ success: true, message: `Found ${result.totalOrders} orders`, data: result });
    } catch (error) {
      console.error('❌ Error in getUserOrders controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

export default Orders2Controller;
