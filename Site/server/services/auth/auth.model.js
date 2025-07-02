import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// **Path to JSON database**
const FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// **Get All Users**
export const getUsers = async () => {
    try {
        const data = await readFile(FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {  // If file is missing, create it
            console.warn("⚠️ users.json file not found, creating a new one...");
            await saveUsers([]); // Create an empty users file
            return [];
        }
        console.error("❌ Error reading users file:", error);
        return [];
    }
};

// **Save Users to File**
export const saveUsers = async (users) => {
    try {
        await writeFile(FILE_PATH, JSON.stringify(users, null, 2));
        console.log("✅ Users saved successfully");
    } catch (error) {
        console.error("❌ Error saving users file:", error);
    }
};

// **Find User By Username or Email**
export const findUserByUsernameOrEmail = async (username, email) => {
    const users = await getUsers();
    return users.find(user => user.username === username || user.email === email);
};

// **Add User**
export const addUser = async (username, email, password, profileImage = null) => {
    const users = await getUsers();

    // Ensure no duplicate users
    if (await findUserByUsernameOrEmail(username, email)) {
        return false;
    }

    const newUser = {
        id: uuidv4(),
        username,
        email,
        password,  // Hashed password
        profileImage
    };

    users.push(newUser);
    await saveUsers(users);
    console.log("✅ New user added:", newUser);
    return newUser;
};
