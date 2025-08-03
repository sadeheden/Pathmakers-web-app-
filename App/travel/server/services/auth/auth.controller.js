import { insertUser, findUserByEmail,getUserCollection  } from './auth.model.js';
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
export async function getAllUsers(req, res) {
  try {
    const usersCol = await getUserCollection();
    const users = await usersCol.find({}).toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }}
export async function registerUser(req, res) {
  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Insert new user into DB
    const user = await insertUser({ email, password, name });

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      secretKey,
      { expiresIn: '2h' }
    );

    // Respond with token + user info
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
}
export async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      secretKey,
      { expiresIn: '2h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
}
