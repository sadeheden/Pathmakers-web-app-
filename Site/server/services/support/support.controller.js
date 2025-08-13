import { connectDB } from '../auth/auth.db.js';
import { ObjectId } from 'mongodb';

// קבלת כל הפניות
export const getAllSupportRequests = async (req, res) => {
  try {
    const db = await connectDB();
    const supportCollection = db.collection('support');
    const requests = await supportCollection.find({}).toArray();
    res.json(requests);
  } catch (error) {
    console.error('❌ Error getting support requests:', error);
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
};

// הוספת פנייה חדשה
export const createSupportRequest = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    const db = await connectDB();
    const supportCollection = db.collection('support');

    const result = await supportCollection.insertOne({
      name,
      email,
      message,
      status: 'pending', // ברירת מחדל
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Support request created', id: result.insertedId });
  } catch (error) {
    console.error('❌ Error creating support request:', error);
    res.status(500).json({ error: 'Failed to create support request' });
  }
};

// עדכון סטטוס פנייה
export const updateSupportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = await connectDB();
    const supportCollection = db.collection('support');

    const result = await supportCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Support request not found' });
    }

    res.json({ message: 'Support status updated' });
  } catch (error) {
    console.error('❌ Error updating support status:', error);
    res.status(500).json({ error: 'Failed to update support status' });
  }
};
