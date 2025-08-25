// support.controller.js 
import { connectDB } from '../auth/auth.db.js'; 

export const addSupportMessage = async (req, res) => { 
  try { 
    console.log('📨 Received support request:', req.body);
    
    const db = await connectDB(); 
    const { name, email, message } = req.body; 
 
    // 👈 שיפור validations
    if (!name?.trim()) {
      console.log('❌ Missing name field');
      return res.status(400).json({ message: "Name is required" }); 
    }
    
    if (!email?.trim()) {
      console.log('❌ Missing email field');
      return res.status(400).json({ message: "Email is required" }); 
    }
    
    if (!message?.trim()) {
      console.log('❌ Missing message field');
      return res.status(400).json({ message: "Message is required" }); 
    }

    // 👈 basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ message: "Invalid email format" }); 
    }

    const doc = { 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      message: message.trim(), 
      created_at: new Date(),
      status: 'new' // 👈 הוספתי status field
    }; 

    console.log('💾 Saving to database:', { ...doc, message: doc.message.substring(0, 50) + '...' });

    const result = await db.collection("support").insertOne(doc); 
    
    console.log('✅ Support message saved:', result.insertedId);

    res.status(201).json({ 
      success: true,
      message: "Support message saved successfully", 
      id: result.insertedId, 
    }); 
  } catch (err) { 
    console.error("❌ Error saving support message:", err); 
    
    // 👈 שיפור error handling
    if (err.name === 'MongoServerError') {
      return res.status(500).json({ message: "Database error" });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    }); 
  } 
}; 
 
// קבלת כל ההודעות (לדשבורד מנהל) 
export const getSupportMessages = async (req, res) => { 
  try { 
    console.log('📋 Fetching support messages...');
    
    const db = await connectDB(); 
    const messages = await db 
      .collection("support") 
      .find({}) 
      .sort({ created_at: -1 }) 
      .toArray(); 
 
    console.log(`✅ Found ${messages.length} support messages`);
    
    res.status(200).json({
      success: true,
      data: messages,
      count: messages.length
    }); 
  } catch (err) { 
    console.error("❌ Error fetching support messages:", err); 
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    }); 
  } 
};

// 👈 הוספתי פונקציה לעדכון סטטוס הודעה
export const updateSupportMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['new', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const db = await connectDB();
    const result = await db.collection("support").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status,
          updated_at: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    res.status(200).json({
      success: true,
      message: "Status updated successfully"
    });
  } catch (err) {
    console.error("❌ Error updating support message:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};