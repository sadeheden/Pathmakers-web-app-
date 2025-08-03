import { getUserCollection } from './auth.db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email/Username and password are required' });
  }

  try {
    const users = await getUserCollection();

    // 🔍 Try to find user by email OR username
    const user = await users.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() } // If email field contains a username
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, username: user.username }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
