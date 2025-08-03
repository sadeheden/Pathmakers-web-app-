import { findUserByEmail } from  './auth.model.js';;
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export async function loginUser(req, res) {
  const { email, password } = req.body;
  console.log('🔔 Login attempt:', { email });

  if (!secretKey) {
    console.error('❌ JWT secret key is not set!');
    return res.status(500).json({
      success: false,
      message: 'Server misconfiguration: missing JWT secret key',
    });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('🔍 User found:', { id: user._id, email: user.email });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    console.log('✅ Password matched, generating token');

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.username,
      },
      secretKey,
      { expiresIn: '2h' }
    );

    console.log('🎟 Token generated successfully');

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.username,
        profile_image: user.profile_image || null,
      },
    });
  } catch (error) {
    console.error('🔥 Login error stack:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.stack || error.message || error,
    });
  }
}
