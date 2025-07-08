import express from 'express';
import {
    getAllUsers,
    register,
    login,
    logout,
    removeUser,
    getCurrentUser,
    updateUser // ⬅️ add this
} from './auth.controller.js';


import authenticateUser from "../middleware/authenticateUser.js"; // JWT auth middleware

const authRouter = express.Router();

// 🟢 Public endpoints
authRouter.post("/register", register);    // Register new user
authRouter.post("/login", login);          // Login user
authRouter.post("/logout", logout);        // (optional, stateless with JWT)
authRouter.get("/users", getAllUsers);     // List all users
authRouter.put("/user", authenticateUser, updateUser); 
// 🔒 Protected endpoint (requires JWT in header)
authRouter.get("/user", authenticateUser, getCurrentUser); // Get current user

// 🔒 Admin or user-only (optional: protect this route with another middleware if needed)
authRouter.delete("/users/:id", removeUser); // Remove user by ID

export default authRouter;
