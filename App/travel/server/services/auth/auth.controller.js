import { getUserCollection } from './auth.db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function loginUser(req, res) {
  try {
    const { identifier, email, username, password } = req.body;
    
    // Accept identifier, email, or username from the request
    const searchValue = identifier || email || username;
    
    if (!searchValue || !password) {
      console.log('❌ Missing credentials:', { searchValue: !!searchValue, password: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing username/email or password' 
      });
    }

    const searchKey = searchValue.toLowerCase().trim();
    console.log('🔍 Login attempt for:', searchKey);

    const users = await getUserCollection();
    
    // Search for user by email, name, or username (case-insensitive)
    const user = await users.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${searchKey}$`, 'i') } },
        { name: { $regex: new RegExp(`^${searchKey}$`, 'i') } },
        { username: { $regex: new RegExp(`^${searchKey}$`, 'i') } }
      ]
    });

    if (!user) {
      console.log('❌ User not found for:', searchKey);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' // Don't reveal if user exists or not
      });
    }

    console.log('✅ User found:', user.email || user.name || user.username);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', searchKey);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check JWT_SECRET - temporary hardcoded fallback for testing
    const jwtSecret = process.env.JWT_SECRET || 'temp_secret_12345_remove_this_in_production';
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ Missing JWT_SECRET environment variable - using temporary secret');
      console.error('⚠️  This is insecure! Set JWT_SECRET properly!');
      console.error('📁 Current working directory:', process.cwd());
      console.error('🔍 All env vars:', Object.keys(process.env).filter(key => key.includes('JWT')));
    } else {
      console.log('✅ JWT_SECRET loaded successfully');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      jwtSecret, 
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', user.email || user.name || user.username);

    // Return success response
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || user.username,
        profile_image: user.profile_image || null,
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

// Debug endpoint to check users in database
export async function debugUsers(req, res) {
  try {
    const users = await getUserCollection();
    const allUsers = await users.find({}).limit(10).toArray();
    
    return res.json({
      success: true,
      totalUsers: await users.countDocuments(),
      users: allUsers.map(user => ({
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
        hasPassword: !!user.password,
        allFields: Object.keys(user)
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}