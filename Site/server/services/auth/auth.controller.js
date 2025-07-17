import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;
const DEFAULT_PROFILE_IMAGE = "https://res.cloudinary.com/dnnmhrsja/image/upload/v1723456789/user_profiles/default_profile.jpg";


// Helper: get database
async function getDB() {

    if (!uri) throw new Error("CONNECTION_STRING is not defined");
    if (!dbName) throw new Error("DB_NAME is not defined");

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    return { db, client };
}

// Get All Users
export async function getAllUsers(req, res) {
    let client;
    try {
        console.log("🔄 Attempting to fetch all users...");
        const { db, client: c } = await getDB();
        client = c;

        const users = await db.collection("Users").find({}).toArray();
        users.forEach(user => delete user.password);

        console.log(`✅ Fetched ${users.length} users.`);
        res.status(200).json(users);

    } catch (error) {
        console.error("❌ Error fetching users:");
        console.error(error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (client) {
            console.log("🔚 Closing DB connection...");
            await client.close();
        }
    }
}

// Register New User
export async function register(req, res) {
    let client;
    try {
        let { username, email, password, profile_image } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        const { db, client: c } = await getDB();
        client = c;

        const existingUser = await db.collection("Users").findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            return res.status(400).json({ error: "Username or email already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        profile_image = profile_image || DEFAULT_PROFILE_IMAGE;

        const userDoc = {
            username,
            email,
            password: hashedPassword,
            profile_image
        };

        const result = await db.collection("Users").insertOne(userDoc);

        const isAdmin = username === "managerMay" || email === "managerMay";

        const token = jwt.sign(
            {
                _id: result.insertedId,
                username,
                profile_image,
                isAdmin
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                _id: result.insertedId,
                username,
                email,
                profile_image,
                isAdmin
            }
        });

    } catch (error) {
        console.error("❌ Register error:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        if (client) await client.close();
    }
}


// Login User
export async function login(req, res) {
    let client;
    try {
        const { username, email, password } = req.body;
        const { db, client: c } = await getDB();
        client = c;

        let user = null;
        if (username) {
            user = await db.collection("Users").findOne({ username });
        }
        if (!user && email) {
            user = await db.collection("Users").findOne({ email });
        }
        if (!user) {
            return res.status(401).json({ error: "Invalid username/email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username/email or password" });
        }

        const isAdmin = user.username === "managerMay" || user.email === "managerMay";

        const token = jwt.sign(
            {
                _id: user._id,
                username: user.username,
                profile_image: user.profile_image,
                isAdmin
            },
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
                profile_image: user.profile_image,
                isAdmin
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        if (client) await client.close();
    }
}


// Logout (stateless)
export async function logout(req, res) {
    res.status(200).json({ message: "Logged out successfully" });
}

// Remove User by _id (Mongo)
export async function removeUser(req, res) {
    let client;
    try {
        const { id } = req.params;
        const { db, client: c } = await getDB();
        client = c;

        const result = await db.collection("Users").deleteOne({ _id: new ObjectId(id) });
        if (!result.deletedCount) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    } finally {
        if (client) await client.close();
    }
    
}// Update current user details
export async function updateUser(req, res) {
  let client;
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not identified" });
    }

    const { db, client: c } = await getDB();
    client = c;

    const userId = req.user.id;

    // Build update fields from body
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.profile_image) updates.profile_image = req.body.profile_image;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const result = await db.collection("Users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: result.value._id,
      username: result.value.username,
      email: result.value.email,
      profile_image: result.value.profile_image
    });

  } catch (error) {
    console.error("❌ updateUser error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (client) await client.close();
  }
}



// Get Current User (from JWT token)
export async function getCurrentUser(req, res) {
    let client;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Unauthorized, no token provided" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token missing" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const { db, client: c } = await getDB();
        client = c;

        const user = await db.collection("Users").findOne({ _id: new ObjectId(decoded._id) });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isAdmin = user.username === "managerMay" || user.email === "managerMay";

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profile_image: user.profile_image,
            isAdmin
        });
    } catch (error) {
        console.error("❌ getCurrentUser error:", error);
        res.status(401).json({ message: "Unauthorized, invalid token" });
    } finally {
        if (client) await client.close();
    }
}
