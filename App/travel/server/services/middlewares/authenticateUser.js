// server/middlewares/authenticateUser.js
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);

  if (!secretKey) {
    console.error('JWT secret key is not defined! Please check your environment variables.');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  }

const token = await AsyncStorage.getItem('token');
console.log('🪪 Sending token:', token);


  try {
    const decoded = jwt.verify(token, secretKey);
    console.log('Decoded token payload:', decoded);
    req.user = decoded; // מצרף את המידע מהטוקן לבקשה
    next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}
