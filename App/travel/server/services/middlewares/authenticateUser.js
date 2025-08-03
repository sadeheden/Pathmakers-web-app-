// server/middlewares/authenticateUser.js
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded; // attach decoded payload to req
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}
