import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role: user.role || 'user',
  },
  secretKey,
  { expiresIn: '2h' }
);

res.json({
  success: true,
  token,
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
  },
});
