import { getUsers, addUser, findUserByUsernameOrEmail, removeUserById } from './auth.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const DEFAULT_PROFILE_IMAGE = "https://res.cloudinary.com/YOUR_CLOUDINARY_NAME/image/upload/v1700000000/YOUR_DEFAULT_IMAGE.jpg";

// Get All Users
export async function getAllUsers(req, res) {
    try {
        const users = await getUsers();
        res.status(200).json(users); // you can also {users} if you prefer
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Register New User
export async function register(req, res) {
    try {
        let { username, email, password, profile_image } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        let existingUser = await findUserByUsernameOrEmail(username, email);
        if (existingUser) {
            return res.status(400).json({ error: "Username or email already taken" });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        profile_image = profile_image || DEFAULT_PROFILE_IMAGE;

        let newUser = await addUser(username, email, hashedPassword, profile_image);
        if (!newUser) {
            return res.status(400).json({ error: "User registration failed" });
        }

        // newUser._id is ObjectId, not string!
        const token = jwt.sign(
            { _id: newUser._id, username: newUser.username, profile_image: newUser.profile_image },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profile_image: newUser.profile_image
            },
            token
        });

    } catch (error) {
        console.error("❌ Register error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Login User
export async function login(req, res) {
    try {
        const { username, password } = req.body;
        let user = await findUserByUsernameOrEmail(username, null); // you may want to allow email too
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const token = jwt.sign(
            { _id: user._id, username: user.username, profile_image: user.profile_image },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get Current User (from JWT)
export async function getCurrentUser(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Unauthorized, no token provided" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token missing" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const users = await getUsers();
            // Look for _id, not id!
            const user = users.find(u => u._id?.toString() === decoded._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                profile_image: user.profile_image
            });

        } catch (error) {
            return res.status(401).json({ message: "Unauthorized, invalid token" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}

// Logout (optional, since JWT is stateless)
export async function logout(req, res) {
    res.status(200).json({ message: "Logged out successfully" });
}

// Remove User by _id (Mongo)
export async function removeUser(req, res) {
    try {
        const { id } = req.params;
        const result = await removeUserById(id);
        if (!result) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
