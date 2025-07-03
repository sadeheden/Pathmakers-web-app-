import { ObjectId } from "mongodb";
import { connectDB } from "./auth.db.js"; // or db.js

// 1. Get All Users (hides passwords)
export async function getUsers() {
    const db = await connectDB();
    const users = await db.collection("Users").find({}).toArray();
    users.forEach(user => delete user.password); // Remove passwords!
    return users;
}

// 2. Find User by Username or Email
export async function findUserByUsernameOrEmail(username, email) {
    const db = await connectDB();
    return await db.collection("Users").findOne({
        $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
        ]
    });
}

// 3. Add User
export async function addUser(username, email, password, profile_image = null) {
    const db = await connectDB();
    // Check for duplicate
    const exists = await findUserByUsernameOrEmail(username, email);
    if (exists) return false;

    const newUser = {
        username,
        email,
        password, // Should already be hashed!
        profile_image
    };
    const result = await db.collection("Users").insertOne(newUser);
    newUser._id = result.insertedId;
    return newUser;
}

// 4. Get User By ID
export async function getUserById(id) {
    const db = await connectDB();
    return await db.collection("Users").findOne({ _id: new ObjectId(id) });
}

// 5. Remove User By ID
export async function removeUserById(id) {
    const db = await connectDB();
    const result = await db.collection("Users").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}
