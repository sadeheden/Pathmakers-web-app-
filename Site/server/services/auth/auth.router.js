import express from 'express';
import { getAllUsers, register, login, logout, removeUser, getCurrentUser } from './auth.controller.js';
import authenticateUser from "../middleware/authenticateUser.js"; // ✅ Ensure correct path

const authRouter = express.Router(); // ✅ Correct import and initialization

// Define routes
authRouter.get("/users", getAllUsers);
authRouter.post("/register", register);
authRouter.post("/login", login);  
authRouter.post("/logout", logout);
authRouter.delete("/users/:id", removeUser);
authRouter.get("/user", authenticateUser, getCurrentUser); // ✅ Protect this route

export default authRouter; // ✅ Use ES Module export
