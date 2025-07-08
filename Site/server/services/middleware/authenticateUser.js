import jwt from "jsonwebtoken";

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const secretKey = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    if (!secretKey) {
        return res.status(500).json({ message: "Server error: Missing JWT secret" });
    }

    try {
        const decoded = jwt.verify(token, secretKey);

        req.user = {
            id: decoded.id || decoded._id, // normalize to id
            username: decoded.username,
            email: decoded.email,
        };

        if (!req.user.id) {
            return res.status(401).json({ message: "Unauthorized: User not identified" });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default authenticateUser;
