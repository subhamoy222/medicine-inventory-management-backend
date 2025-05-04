import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const isAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized, token failed',
            error: 'No token provided'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded || (!decoded.email && !decoded.id)) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, invalid token',
                error: 'Invalid token payload'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized, token failed',
            error: error.message
        });
    }
};

// middlewares/authMiddleware.js
// import jwt from 'jsonwebtoken';

// export const isAuthenticated = (req, res, next) => {
//     const authHeader = req.headers.authorization;
//       console.log(authHeader)
//     if (!authHeader || !authHeader.startsWith('Bearer')) {
//         return res.status(401).json({ message: 'Not authorized, token failed' });
//     }

//     const token = authHeader.split(' ')[1]; // Extract token
//     console.log('Received Token:', token); // Log the token to verify

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token

//         if (!decoded || !decoded.email) {
//             return res.status(401).json({ message: 'Not authorized, invalid token' });
//         }

//         req.user = decoded; // Add user info (including email) to request
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
//     }
// };



// dotenv.config();

// const verifyToken = (req, res, next) => {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(403).json({ message: 'Not authorized, no token provided' });
//     }

//     const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//         if (err) {
//             return res.status(401).json({ message: 'Not authorized, invalid token' });
//         }

//         // Attach user info from token to the request object
//         req.user = decoded;
//         next();
//     });
// };

// export default verifyToken;

