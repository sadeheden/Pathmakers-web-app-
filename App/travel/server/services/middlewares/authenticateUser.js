import jwt from 'jsonwebtoken';

export async function loginUser(req, res) {
  const { identifier, password } = req.body;

  try {
    const db = await connectDB();
    const usersCol = db.collection('Users');

    const user = await usersCol.findOne({
      $or: [
        { email: identifier },
        { name: identifier } // assuming you're using `name` as username
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // ✅ FIXED: Create token with correct payload
   const token = jwt.sign(
  { id: user._id.toString() },  // ✅ use "id" consistently
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        profile_image: user.profile_image || null,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);

  if (!secretKey) {
    console.error('JWT secret key is not defined!');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  }

  const token = authHeader.split(' ')[1]; // ✅ Extract token properly

  try {
    const decoded = jwt.verify(token, secretKey); // ✅ Only verify, don't sign
    console.log('✅ Token verified. Payload:', decoded);

    req.user = decoded; // Attach payload (e.g., { id: '...' }) to req.user
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}