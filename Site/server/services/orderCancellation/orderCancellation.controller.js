// orderCancellation.controller.js - Enhanced with better error handling
import { ObjectId } from 'mongodb';
import {
  findOrderForCancellation,
  cancelOrderInDb,
  createCancellationRecord,
  getCancelledOrdersByUserId,
  checkOrderCancellationEligibility
} from './orderCancellation.db.js';

/**
 * ביטול הזמנה
 */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.user?._id;

    console.log("🔄 Cancel order request - orderId:", orderId, "userId:", userId);
    console.log("🔄 Full user object:", req.user);

    if (!userId) {
      console.log("❌ No userId found in request");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!orderId) {
      console.log("❌ No orderId provided");
      return res.status(400).json({ 
        success: false, 
        message: "Order ID is required" 
      });
    }

    if (!ObjectId.isValid(orderId)) {
      console.log("❌ Invalid orderId format:", orderId);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid order ID format" 
      });
    }

    // חיפוש ההזמנה
    console.log("🔍 Searching for order...");
    const orderResult = await findOrderForCancellation(orderId, userId);
    
    if (!orderResult) {
      console.log("❌ Order not found");
      return res.status(404).json({ 
        success: false, 
        message: "Order not found or you don't have permission" 
      });
    }

    const { order, collection: foundInCollection } = orderResult;
    console.log("✅ Order found in collection:", foundInCollection);

    // בדיקה אם ההזמנה כבר בוטלה
    if (order.status === 'cancelled' || order.cancelled === true) {
      console.log("❌ Order already cancelled");
      return res.status(400).json({ 
        success: false, 
        message: "Order is already cancelled" 
      });
    }

    // בדיקה אם הטיול כבר התחיל
    const tripStartDate = order.trip_start_date || order.trip_date || order.tripDate || order.startDate;
    if (tripStartDate && new Date(tripStartDate) <= new Date()) {
      console.log("❌ Trip already started");
      return res.status(400).json({ 
        success: false, 
        message: "Cannot cancel order - trip has already started" 
      });
    }

    // ביטול ההזמנה במסד הנתונים
    console.log("🔄 Updating order in database...");
    const updateResult = await cancelOrderInDb(orderId, foundInCollection);

    if (updateResult.modifiedCount === 0) {
      console.log("❌ Failed to update order");
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update order status" 
      });
    }

    // שמירת רשומת הביטול
    try {
      console.log("🔄 Creating cancellation record...");
      await createCancellationRecord(
        orderId, 
        userId, 
        order, 
        foundInCollection, 
        req.body.reason || 'User requested cancellation'
      );
    } catch (auditError) {
      console.error('Failed to create cancellation audit record:', auditError);
      // ממשיכים גם אם שמירת הרשומה נכשלה
    }

    console.log("✅ Order cancelled successfully:", orderId);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderId: orderId,
        cancelledAt: new Date().toISOString(),
        refundMessage: "Your refund will be processed within 3-5 business days"
      }
    });

  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error occurred while cancelling order",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * קבלת כל ההזמנות שבוטלו
 */
export const getCancelledOrders = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    console.log("🔍 Getting cancelled orders for user:", userId);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const cancelledOrders = await getCancelledOrdersByUserId(userId);

    res.status(200).json({
      success: true,
      data: {
        cancelled_orders: cancelledOrders,
        count: cancelledOrders.length
      }
    });

  } catch (error) {
    console.error('❌ Get cancelled orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error occurred while fetching cancelled orders",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * בדיקה אם ההזמנה ניתנת לביטול
 */
export const checkCancellationEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.user?._id;
    
    console.log("🔍 Checking cancellation eligibility - orderId:", orderId, "userId:", userId);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!orderId || !ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid order ID" 
      });
    }

    const eligibilityResult = await checkOrderCancellationEligibility(orderId, userId);

    if (!eligibilityResult) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        canCancel: eligibilityResult.canCancel,
        reason: eligibilityResult.reason,
        tripStartDate: eligibilityResult.tripStartDate,
        currentStatus: eligibilityResult.currentStatus
      }
    });

  } catch (error) {
    console.error('❌ Check cancellation eligibility error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error occurred while checking cancellation eligibility",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};